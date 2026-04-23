from __future__ import annotations

import os
import re
import tempfile

from fastapi import APIRouter, Form, HTTPException, UploadFile

from api import session as sess
from api.models import ExtractResponse
from main import (
    DEFAULT_GEMINI_MODEL,
    extract_text_from_gemini,
    get_pdf_page_count,
    parse_page_ranges,
)

MOCK_TEXT = (
    "# Chapter 3\n"
    "## Asyncio Walk-Through\n\n"
    "**Asyncio** provides another tool for **concurrent programming** in Python, that is more "
    "lightweight than *threads* or *multiprocessing*. In a very simple sense it does this by "
    "having an **event loop** execute a collection of tasks, with a key difference being that "
    "each task chooses when to yield control back to the event loop.\n\n"
    "—Philip Jones, *\"Understanding Asyncio\"*"
)

router = APIRouter()


def _split_paragraphs(text: str) -> list[str]:
    parts = re.split(r"\n{2,}", text)
    return [p.strip() for p in parts if p.strip()]


@router.post("/extract", response_model=ExtractResponse)
async def extract(
    # File upload (optional)
    file: UploadFile | None = None,
    # Pasted text (optional)
    text: str = Form(default=""),
    # PDF page selector, e.g. "1-3,5"
    pages: str = Form(default=""),
    # Gemini settings
    gemini_model: str = Form(default=DEFAULT_GEMINI_MODEL),
    gemini_key: str = Form(default=""),
    mock_gemini: bool = Form(default=False),
) -> ExtractResponse:
    if not file and not text.strip():
        raise HTTPException(400, "Provide either a file or text.")

    resolved_key = gemini_key.strip() or os.environ.get("GEMINI_API_KEY", "")
    if not mock_gemini and not resolved_key:
        raise HTTPException(400, "Gemini API key is required.")

    tmp_path: str | None = None
    page_indices: list[int] | None = None

    try:
        if mock_gemini:
            extracted = MOCK_TEXT
        elif text.strip():
            extracted = extract_text_from_gemini(
                input_path=None,
                inline_text=text.strip(),
                gemini_model=gemini_model,
                api_key=resolved_key,
            )
        else:
            suffix = "." + file.filename.rsplit(".", 1)[-1].lower()
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(await file.read())
                tmp_path = tmp.name

            if suffix == ".pdf" and pages.strip():
                total = get_pdf_page_count(tmp_path)
                page_indices = parse_page_ranges(pages.strip(), total)

            extracted = extract_text_from_gemini(
                input_path=tmp_path,
                inline_text=None,
                page_indices=page_indices,
                gemini_model=gemini_model,
                api_key=resolved_key,
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Gemini error: {exc}") from exc
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    paragraphs = _split_paragraphs(extracted)
    
    # Save original file if it was uploaded
    original_bytes = None
    original_filename = None
    if file:
        file.file.seek(0)
        original_bytes = await file.read()
        original_filename = file.filename

    sid = sess.create({
        "extracted": extracted, 
        "paragraphs": paragraphs,
        "audio_bytes": None, 
        "word_timings": [],
        "original_bytes": original_bytes,
        "original_filename": original_filename
    })
    return ExtractResponse(session_id=sid, extracted=extracted, paragraphs=paragraphs)
