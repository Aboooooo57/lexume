from __future__ import annotations
import os
from api import config
from fastapi import APIRouter, HTTPException, Depends
from api.auth import get_current_user_id
from api import session as sess
from api import database
from api.models import KeyTermsResponse
from api.utils import fetch_word_definition, identify_key_terms, translate_text

router = APIRouter(tags=["dictionary"])

from pydantic import BaseModel

class TranslateRequest(BaseModel):
    text: str

@router.post("/dictionary/translate")
async def translate(req: TranslateRequest, user_id: str = Depends(get_current_user_id)) -> dict:
    prefs = await database.get_preferences(user_id)
    target_lang = prefs.get("target_language", "Persian")
    engine = prefs.get("translation_engine", "google")
    print(f"Translating using engine: {engine}")
    translation = await translate_text(req.text, target_lang, engine=engine)
    return {"translation": translation}

@router.get("/dictionary/{word}")
async def dictionary(word: str, user_id: str = Depends(get_current_user_id)) -> dict:
    entry = await fetch_word_definition(word)
    if not entry:
        raise HTTPException(404, f"No entry found for '{word}'.")
    return entry

@router.get("/key-terms", response_model=KeyTermsResponse)
async def key_terms(
    session_id: str,
    paragraph_index: int,
    gemini_key: str = "",
    gemini_model: str = config.DEFAULT_GEMINI_MODEL,
    mock_gemini: bool = False,
    user_id: str = Depends(get_current_user_id),
) -> KeyTermsResponse:
    session = await sess.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")

    paragraphs: list[str] = session.get("paragraphs", [])
    if paragraph_index < 0 or paragraph_index >= len(paragraphs):
        raise HTTPException(400, "paragraph_index out of range.")

    if mock_gemini:
        return KeyTermsResponse(terms=["asyncio", "concurrent", "multiprocessing", "lightweight", "yield"])

    resolved_key = gemini_key.strip() or config.GEMINI_API_KEY
    if not resolved_key:
        raise HTTPException(400, "Gemini API key is required.")

    try:
        terms = await identify_key_terms(
            paragraphs[paragraph_index],
            gemini_model=gemini_model,
            api_key=resolved_key,
        )
    except Exception as exc:
        raise HTTPException(500, f"Gemini error: {exc}") from exc

    return KeyTermsResponse(terms=terms)
