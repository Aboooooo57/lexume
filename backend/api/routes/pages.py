from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any
from api import database
from api.auth import get_current_user_id
from api.models import GenerateRequest, PageResponse
from api.utils import extract_text_from_gemini, generate_with_timestamps
from api import config
import asyncio
import os
import re

router = APIRouter(tags=["pages"])

def _split_paragraphs(text: str) -> list[str]:
    parts = re.split(r"\n{2,}", text)
    return [p.strip() for p in parts if p.strip()]

@router.get("/session/{session_id}/page/{page_number}", response_model=PageResponse)
async def get_page(
    session_id: str, 
    page_number: int, 
    gemini_key: Optional[str] = None,
    eleven_key: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
) -> PageResponse:
    """
    Fetches a specific page of a session. If it hasn't been processed yet, 
    it will extract text via Gemini and generate audio via ElevenLabs on the fly.
    """
    # 1. Check if the page is already processed
    page_data = await database.get_session_page(session_id, page_number)
    if page_data:
        return PageResponse(
            session_id=session_id,
            page_number=page_number,
            title=page_data.get("title"),
            extracted=page_data.get("extracted", ""),
            paragraphs=page_data.get("paragraphs", []),
            word_timings=page_data.get("word_timings", [])
        )

    # 2. Fetch the session to get original PDF bytes
    session = await database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if page_number < 1 or page_number > session.get('total_pages', 1):
        raise HTTPException(status_code=400, detail="Invalid page number")

    original_bytes = session.get('original_bytes')
    selected_pages = session.get('selected_pages') # List of indices
    
    # Map page_number (1-indexed) to original PDF page index
    if selected_pages:
        # If user selected specific pages, page 1 is selected_pages[0]
        actual_page_idx = selected_pages[page_number - 1]
    else:
        # Otherwise, page 1 is index 0
        actual_page_idx = page_number - 1

    print(f"DEBUG: Session {session_id} Page {page_number} -> actual_page_idx: {actual_page_idx} (selected_pages: {selected_pages})")
    
    extracted_text = ""
    page_title = ""
    audio_bytes = b""
    word_timings = []
    
    gemini_file_uri = session.get('gemini_file_uri')

    if gemini_file_uri:
        try:
            result = await extract_text_from_gemini(
                input_path=None,
                inline_text=None,
                gemini_model=config.DEFAULT_GEMINI_MODEL,
                api_key=gemini_key or config.GEMINI_API_KEY,
                file_uri=gemini_file_uri,
            )
            page_title = result.get("title", "Lesson Page").strip()
            extracted_text = result.get("text", "").strip()
        except Exception as e:
            print(f"ERROR: PDF extraction failed for session {session_id} page {page_number} via URI: {e}")
            if "429" in str(e):
                raise HTTPException(status_code=429, detail="Gemini Rate Limit exceeded. Please wait a moment.")
            import traceback; traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to process PDF page: {e}")

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
    else:
        # It's a text-only session. Just return the whole text if page_number is 1
        if page_number == 1:
            extracted_text = session.get('extracted', '')
            page_title = "Lesson Overview"
        else:
            raise HTTPException(status_code=400, detail="Text sessions only have 1 page")

    if not extracted_text.strip():
        # Empty page
        paragraphs = []
        page_title = "Empty Page"
    else:
        paragraphs = _split_paragraphs(extracted_text)
        # Generate audio for the extracted text
        try:
            audio_bytes, word_timings = await generate_with_timestamps(
                text=extracted_text,
                voice_settings=None,
                elevenlabs_model=config.DEFAULT_ELEVENLABS_MODEL,
                voice_id=config.ELEVENLABS_VOICE_ID,
                api_key=eleven_key or config.ELEVENLABS_API_KEY
            )
        except Exception as e:
            print(f"ERROR: Audio generation failed for session {session_id} page {page_number}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to generate audio: {str(e)}")

    # 3. Save the newly processed page to the database
    new_page_data = {
        "title": page_title,
        "extracted": extracted_text,
        "paragraphs": paragraphs,
        "audio_bytes": audio_bytes,
        "word_timings": word_timings
    }
    
    await database.save_session_page(session_id, page_number, new_page_data)
    
    return PageResponse(
        session_id=session_id,
        page_number=page_number,
        title=page_title,
        extracted=extracted_text,
        paragraphs=paragraphs,
        word_timings=word_timings
    )
