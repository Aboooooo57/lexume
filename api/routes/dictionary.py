from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException

from api import session as sess
from api.models import KeyTermsResponse
from main import DEFAULT_GEMINI_MODEL, fetch_word_definition, identify_key_terms

router = APIRouter()


@router.get("/dictionary/{word}")
async def dictionary(word: str) -> dict:
    """Server-side proxy for dictionaryapi.dev with no caching overhead."""
    entry = fetch_word_definition(word)
    if not entry:
        raise HTTPException(404, f"No entry found for '{word}'.")
    return entry


@router.get("/key-terms", response_model=KeyTermsResponse)
async def key_terms(
    session_id: str,
    paragraph_index: int,
    gemini_key: str = "",
    gemini_model: str = DEFAULT_GEMINI_MODEL,
    mock_gemini: bool = False,
) -> KeyTermsResponse:
    session = sess.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")

    paragraphs: list[str] = session.get("paragraphs", [])
    if paragraph_index < 0 or paragraph_index >= len(paragraphs):
        raise HTTPException(400, "paragraph_index out of range.")

    if mock_gemini:
        return KeyTermsResponse(terms=["asyncio", "concurrent", "multiprocessing", "lightweight", "yield"])

    resolved_key = gemini_key.strip() or os.environ.get("GEMINI_API_KEY", "")
    if not resolved_key:
        raise HTTPException(400, "Gemini API key is required.")

    try:
        terms = identify_key_terms(
            paragraphs[paragraph_index],
            gemini_model=gemini_model,
            api_key=resolved_key,
        )
    except Exception as exc:
        raise HTTPException(500, f"Gemini error: {exc}") from exc

    return KeyTermsResponse(terms=terms)
