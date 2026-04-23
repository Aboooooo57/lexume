from __future__ import annotations

import json
import pathlib

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from api import session as sess
from main import DEFAULT_ELEVENLABS_MODEL, DEFAULT_GEMINI_MODEL

BASE_DIR = pathlib.Path(__file__).parent.parent.parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

router = APIRouter()

GEMINI_MODELS = [
    ("gemini-2.5-flash",       "Gemini 2.5 Flash — best price/performance ✦ default"),
    ("gemini-2.5-pro",         "Gemini 2.5 Pro — most capable"),
    ("gemini-2.5-flash-lite",  "Gemini 2.5 Flash Lite — fastest & cheapest"),
]
ELEVEN_MODELS = [
    ("eleven_multilingual_v2", "Multilingual v2 — high quality ✦ default"),
    ("eleven_v3",              "Eleven v3 — most expressive"),
    ("eleven_turbo_v2_5",      "Turbo v2.5 — low latency"),
    ("eleven_flash_v2_5",      "Flash v2.5 — ultra-fast"),
]


@router.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "index.html", {
        "gemini_models": GEMINI_MODELS,
        "eleven_models": ELEVEN_MODELS,
        "default_gemini": DEFAULT_GEMINI_MODEL,
        "default_eleven": DEFAULT_ELEVENLABS_MODEL,
    })


@router.get("/result/{session_id}", response_class=HTMLResponse)
async def result(request: Request, session_id: str) -> HTMLResponse:
    session = sess.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")

    has_timings = bool(session.get("word_timings"))
    return templates.TemplateResponse(request, "result.html", {
        "session_id": session_id,
        "paragraphs": session.get("paragraphs", []),
        "extracted": session.get("extracted", ""),
        "word_timings_json": json.dumps(session.get("word_timings", [])),
        "md_source_json": json.dumps(session.get("extracted", "")),
        "has_timings": has_timings,
        "has_audio": bool(session.get("audio_bytes")),
    })
@router.get("/api/session/{session_id}")
async def get_session_json(session_id: str) -> dict:
    session = sess.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")
    
    return {
        "session_id": session_id,
        "paragraphs": session.get("paragraphs", []),
        "extracted": session.get("extracted", ""),
        "word_timings": session.get("word_timings", []),
        "has_audio": bool(session.get("audio_bytes")),
        "has_original_file": bool(session.get("original_bytes")),
        "original_filename": session.get("original_filename"),
    }

@router.get("/file/{session_id}")
async def get_original_file(session_id: str):
    session = sess.get(session_id)
    if not session or not session.get("original_bytes"):
        raise HTTPException(404, "File not found.")
    
    from fastapi.responses import Response
    return Response(
        content=session["original_bytes"],
        media_type="application/pdf" if session["original_filename"].lower().endswith(".pdf") else "application/octet-stream",
        headers={"Content-Disposition": f"inline; filename={session['original_filename']}"}
    )
