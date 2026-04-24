from __future__ import annotations

import os
import re
import tempfile
import asyncio
import json

from fastapi import APIRouter, Form, HTTPException, UploadFile, Depends
from google import genai
from api import config
from api.auth import get_current_user_id

from api import session as sess
from api.models import ExtractResponse
from api.utils import (
    get_pdf_page_count,
    parse_page_ranges,
    extract_pdf_pages,
)

router = APIRouter()

@router.post("/extract", response_model=ExtractResponse)
async def extract(
    file: UploadFile | None = None,
    text: str = Form(default=""),
    pages: str = Form(default=""),
    gemini_model: str = Form(default=config.DEFAULT_GEMINI_MODEL),
    gemini_key: str = Form(default=""),
    user_id: str = Depends(get_current_user_id),
) -> ExtractResponse:
    if not file and not text.strip():
        raise HTTPException(400, "Provide either a file or text.")

    total_pages = 1
    page_indices = None
    original_bytes = None
    original_filename = None
    tmp_path = None
    gemini_file_uri = None

    try:
        if file:
            suffix = "." + file.filename.rsplit(".", 1)[-1].lower()
            content = await file.read()
            original_bytes = content
            original_filename = file.filename
            
            def _write_tmp():
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                    tmp.write(content)
                    return tmp.name
            tmp_path = await asyncio.to_thread(_write_tmp)

            if suffix == ".pdf":
                total = await get_pdf_page_count(tmp_path)
                if pages.strip():
                    page_indices = parse_page_ranges(pages.strip(), total)
                    total_pages = len(page_indices)
                else:
                    page_indices = list(range(total))
                    total_pages = total
                
                # Upload the subset PDF to Gemini File API
                subset_pdf_path = await extract_pdf_pages(tmp_path, page_indices)
                try:
                    client = genai.Client(api_key=gemini_key or config.GEMINI_API_KEY)
                    uploaded_file = await client.aio.files.upload(file=subset_pdf_path)
                    gemini_file_uri = uploaded_file.uri
                finally:
                    await asyncio.to_thread(os.unlink, subset_pdf_path)

    except Exception as exc:
        raise HTTPException(500, f"File processing error: {exc}") from exc
    finally:
        if tmp_path:
            try:
                await asyncio.to_thread(os.unlink, tmp_path)
            except OSError:
                pass

    sid = await sess.create({
        "extracted": text.strip() if not file else "", 
        "paragraphs": [text.strip()] if not file and text.strip() else [],
        "audio_bytes": None, 
        "word_timings": [],
        "original_bytes": original_bytes,
        "original_filename": original_filename,
        "total_pages": total_pages,
        "selected_pages": json.dumps(page_indices) if page_indices else None,
        "gemini_file_uri": gemini_file_uri
    })
    
    return ExtractResponse(session_id=sid, extracted="", paragraphs=[])
