from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Optional, Dict, Any
from api import database, config
from api.auth import get_current_user_id
from api.models import GenerateRequest, PageResponse
from api.utils import extract_text_from_gemini, generate_with_timestamps, extract_page_images
import asyncio
import os
import re

router = APIRouter(tags=["pages"])

def _split_paragraphs(text: str) -> list[str]:
    parts = re.split(r"\n{2,}", text)
    return [p.strip() for p in parts if p.strip()]


def _compute_gemini_usd(usage_out: list) -> float:
    """Sum USD cost from collected Gemini usage dicts."""
    total = 0.0
    for u in usage_out:
        inp = u.get("input_tokens", 0) or 0
        out = u.get("output_tokens", 0) or 0
        total += (
            inp * config.GEMINI_INPUT_PRICE_PER_M_TOKENS / 1_000_000
            + out * config.GEMINI_OUTPUT_PRICE_PER_M_TOKENS / 1_000_000
        )
    return total


def _compute_elevenlabs_usd(char_count: int) -> float:
    return (char_count / 1000) * config.ELEVENLABS_PRICE_PER_K_CHARS


@router.get("/session/{session_id}/page/{page_number}", response_model=PageResponse)
async def get_page(
    session_id: str,
    page_number: int,
    background_tasks: BackgroundTasks,
    gemini_key: Optional[str] = None,
    eleven_key: Optional[str] = None,
    generate_audio: bool = True,
    user_id: str = Depends(get_current_user_id)
) -> PageResponse:
    """
    Fetches a specific page of a session. If it hasn't been processed yet,
    it will extract text via Gemini and generate audio via ElevenLabs on the fly.
    Credits are checked upfront; the actual deduction (with real USD cost) runs
    as a background task after the response is returned to the client.
    """
    # 1. Cached page — free, skip credit check entirely
    page_data = await database.get_session_page(session_id, page_number)
    if page_data:
        return PageResponse(
            session_id=session_id,
            page_number=page_number,
            title=page_data.get("title"),
            extracted=page_data.get("extracted", ""),
            paragraphs=page_data.get("paragraphs", []),
            word_timings=page_data.get("word_timings", []),
            page_images=page_data.get("page_images", []),
        )

    # 2. Pre-flight credit check (balance only — deduction happens after API calls)
    credits_needed = config.CREDIT_COST_EXTRACTION
    if generate_audio:
        credits_needed += config.CREDIT_COST_AUDIO

    balance = await database.get_credits(user_id)
    if balance < credits_needed:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits: {balance:.1f} available, {credits_needed:.1f} required",
        )

    # 3. Fetch session
    session = await database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if page_number < 1 or page_number > session.get('total_pages', 1):
        raise HTTPException(status_code=400, detail="Invalid page number")

    original_bytes = session.get('original_bytes')
    selected_pages = session.get('selected_pages')

    # Map page_number (1-indexed) → PDF page index
    actual_page_idx = selected_pages[page_number - 1] if selected_pages else page_number - 1

    print(f"DEBUG: Session {session_id} Page {page_number} -> actual_page_idx: {actual_page_idx} (selected_pages: {selected_pages})")

    extracted_text = ""
    page_title = ""
    audio_bytes = b""
    word_timings = []
    page_images = []

    gemini_usage: list = []   # populated by _call_gemini_structured via _usage_out
    gemini_file_uri = session.get('gemini_file_uri')

    # 4a. Extract via pre-uploaded Gemini File URI
    if gemini_file_uri:
        try:
            result = await extract_text_from_gemini(
                input_path=None,
                inline_text=None,
                gemini_model=config.DEFAULT_GEMINI_MODEL,
                api_key=gemini_key or config.GEMINI_API_KEY,
                file_uri=gemini_file_uri,
                _usage_out=gemini_usage,
            )
            page_title = result.get("title", "Lesson Page").strip()
            extracted_text = result.get("text", "").strip()
        except Exception as e:
            print(f"ERROR: PDF extraction failed for session {session_id} page {page_number} via URI: {e}")
            if "429" in str(e):
                raise HTTPException(status_code=429, detail="Gemini Rate Limit exceeded. Please wait a moment.")
            import traceback; traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to process PDF page: {e}")

    # 4b. Extract via original PDF bytes (fallback)
    elif original_bytes:
        import tempfile
        suffix = "." + session.get('original_filename', 'doc.pdf').rsplit(".", 1)[-1].lower()
        tmp_path = None
        try:
            def _write_tmp():
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                    tmp.write(original_bytes)
                    return tmp.name
            tmp_path = await asyncio.to_thread(_write_tmp)

            result = await extract_text_from_gemini(
                input_path=tmp_path,
                inline_text=None,
                page_indices=[actual_page_idx],
                gemini_model=config.DEFAULT_GEMINI_MODEL,
                api_key=gemini_key or config.GEMINI_API_KEY,
                _usage_out=gemini_usage,
            )
            page_title = result.get("title", "Lesson Page").strip()
            extracted_text = result.get("text", "").strip()
        except Exception as e:
            print(f"ERROR: Fallback PDF extraction failed: {e}")
            if "429" in str(e):
                raise HTTPException(status_code=429, detail="Gemini Rate Limit exceeded.")
            raise HTTPException(status_code=500, detail="Failed to process PDF page")
        finally:
            if tmp_path:
                try: await asyncio.to_thread(os.unlink, tmp_path)
                except: pass

    # 4c. Text-only session
    else:
        if page_number == 1:
            extracted_text = session.get('extracted', '')
            page_title = "Lesson Overview"
        else:
            raise HTTPException(status_code=400, detail="Text sessions only have 1 page")

    # 5. Extract embedded images from PDF page
    if original_bytes:
        try:
            page_images = await extract_page_images(original_bytes, actual_page_idx)
            print(f"DEBUG: Extracted {len(page_images)} image(s) from page {page_number}")
        except Exception as e:
            print(f"WARN: Image extraction failed for page {page_number}: {e}")

    # 6. Split + optional audio generation
    elevenlabs_chars = 0
    if not extracted_text.strip():
        paragraphs = []
        page_title = "Empty Page"
    else:
        paragraphs = _split_paragraphs(extracted_text)
        if generate_audio:
            try:
                elevenlabs_chars = len(extracted_text)
                audio_bytes, word_timings = await generate_with_timestamps(
                    text=extracted_text,
                    voice_settings=None,
                    elevenlabs_model=config.DEFAULT_ELEVENLABS_MODEL,
                    voice_id=config.ELEVENLABS_VOICE_ID,
                    api_key=eleven_key or config.ELEVENLABS_API_KEY
                )
            except Exception as e:
                print(f"ERROR: Audio generation failed for session {session_id} page {page_number}: {str(e)}")
                import traceback; traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"Failed to generate audio: {str(e)}")

    # 7. Schedule credit deduction as background task (response returns immediately after)
    gemini_usd = _compute_gemini_usd(gemini_usage)
    elevenlabs_usd = _compute_elevenlabs_usd(elevenlabs_chars)
    total_usd = round(gemini_usd + elevenlabs_usd, 6)
    reason = "audio_generation" if generate_audio else "page_extraction"

    print(
        f"INFO: Page processed — Gemini tokens: {gemini_usage}, "
        f"ElevenLabs chars: {elevenlabs_chars}, "
        f"Real cost: ${total_usd:.5f} USD"
    )

    async def _deduct_in_background():
        try:
            await database.deduct_credits(
                user_id,
                credits_needed,
                reason=reason,
                session_id=session_id,
                usd_cost=total_usd,
            )
        except Exception as exc:
            # Log only — don't crash after the response has already been sent
            print(f"WARN: Background credit deduction failed for user {user_id}: {exc}")

    background_tasks.add_task(_deduct_in_background)

    # 8. Persist processed page
    await database.save_session_page(session_id, page_number, {
        "title": page_title,
        "extracted": extracted_text,
        "paragraphs": paragraphs,
        "audio_bytes": audio_bytes,
        "word_timings": word_timings,
        "page_images": page_images,
    })

    return PageResponse(
        session_id=session_id,
        page_number=page_number,
        title=page_title,
        extracted=extracted_text,
        paragraphs=paragraphs,
        word_timings=word_timings,
        page_images=page_images,
    )
