from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from api import session as sess
from api.models import GenerateRequest, GenerateResponse, WordTiming
from main import (
    DEFAULT_ELEVENLABS_MODEL,
    ELEVENLABS_VOICE_ID,
    generate_with_timestamps,
    stream_to_elevenlabs,
)

router = APIRouter()

_MOCK_AUDIO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "mock_audio.mp3")


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    session = sess.get(req.session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")

    extracted: str = session["extracted"]
    resolved_key = req.eleven_key.strip() or os.environ.get("ELEVENLABS_API_KEY", "")
    resolved_vid  = req.voice_id.strip() or os.environ.get("ELEVENLABS_VOICE_ID", ELEVENLABS_VOICE_ID)

    if not req.mock_eleven and not resolved_key:
        raise HTTPException(400, "ElevenLabs API key is required.")

    voice_settings = {
        "stability": req.stability,
        "similarity_boost": req.similarity_boost,
        "speed": req.speed,
        "style": req.style,
        "use_speaker_boost": True,
    }

    try:
        if req.mock_eleven:
            with open(_MOCK_AUDIO_PATH, "rb") as f:
                audio_bytes = f.read()
            word_timings: list[dict] = []
        else:
            audio_bytes, word_timings = generate_with_timestamps(
                text=extracted,
                voice_settings=voice_settings,
                elevenlabs_model=req.eleven_model,
                voice_id=resolved_vid,
                api_key=resolved_key,
            )
    except Exception as exc:
        raise HTTPException(500, f"ElevenLabs error: {exc}") from exc

    sess.update(req.session_id, {"audio_bytes": audio_bytes, "word_timings": word_timings})

    return GenerateResponse(
        session_id=req.session_id,
        word_timings=[WordTiming(**w) for w in word_timings],
    )


@router.get("/audio/{session_id}")
async def audio(session_id: str, download: bool = False) -> Response:
    session = sess.get(session_id)
    if not session or not session.get("audio_bytes"):
        raise HTTPException(404, "Audio not found.")

    headers = {}
    if download:
        headers["Content-Disposition"] = "attachment; filename=output.mp3"

    return Response(
        content=session["audio_bytes"],
        media_type="audio/mpeg",
        headers=headers,
    )
