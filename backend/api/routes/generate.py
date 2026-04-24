from __future__ import annotations

import os
import asyncio

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from api import config
from api.auth import get_current_user_id

from api import session as sess
from api.models import GenerateRequest, GenerateResponse, WordTiming
from api.utils import (
    generate_with_timestamps,
)

router = APIRouter()


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest, user_id: str = Depends(get_current_user_id)) -> GenerateResponse:
    session = await sess.get(req.session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")

    extracted: str = session["extracted"]
    resolved_key = req.eleven_key.strip() or config.ELEVENLABS_API_KEY
    resolved_vid  = req.voice_id.strip() or config.ELEVENLABS_VOICE_ID

    if not resolved_key:
        raise HTTPException(400, "ElevenLabs API key is required.")

    voice_settings = {
        "stability": req.stability,
        "similarity_boost": req.similarity_boost,
        "speed": req.speed,
        "style": req.style,
        "use_speaker_boost": True,
    }

    try:
        audio_bytes, word_timings = await generate_with_timestamps(
            text=extracted,
            voice_settings=voice_settings,
            elevenlabs_model=req.eleven_model,
            voice_id=resolved_vid,
            api_key=resolved_key,
        )
    except Exception as exc:
        raise HTTPException(500, f"ElevenLabs error: {exc}") from exc

    await sess.update(req.session_id, {"audio_bytes": audio_bytes, "word_timings": word_timings})

    return GenerateResponse(
        session_id=req.session_id,
        word_timings=[WordTiming(**w) for w in word_timings],
    )



