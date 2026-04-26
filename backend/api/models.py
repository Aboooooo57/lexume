from __future__ import annotations

from pydantic import BaseModel, Field


# ── /extract ──────────────────────────────────────────────────────────────────

class ExtractResponse(BaseModel):
    session_id: str
    extracted: str
    paragraphs: list[str]

class PageResponse(BaseModel):
    session_id: str
    page_number: int
    title: str | None = None
    extracted: str
    paragraphs: list[str]
    word_timings: list[WordTiming]
    page_images: list[str] = []           # base64-encoded PNG strings
    audio_credits: float | None = None    # dynamic cost to generate audio for this page (None when audio already present)


# ── /generate ────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    session_id: str
    eleven_model: str = "eleven_multilingual_v2"
    voice_id: str = ""
    eleven_key: str = ""
    stability: float = Field(0.5,  ge=0, le=1)
    similarity_boost: float = Field(0.75, ge=0, le=1)
    speed: float = Field(1.0,  ge=0.5, le=2)
    style: float = Field(0.0,  ge=0, le=1)


class WordTiming(BaseModel):
    word: str
    start: float
    end: float


class GenerateResponse(BaseModel):
    session_id: str
    word_timings: list[WordTiming]


# ── /key-terms ────────────────────────────────────────────────────────────────

class KeyTermsResponse(BaseModel):
    terms: list[str]
