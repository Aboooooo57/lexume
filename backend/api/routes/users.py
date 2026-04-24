from fastapi import APIRouter, Depends
from api.auth import get_current_user_id
from pydantic import BaseModel
from typing import Optional

from api import database

router = APIRouter(tags=["users"])

class UserPreferences(BaseModel):
    theme: Optional[str] = None
    fontSize: Optional[str] = None
    fontFamily: Optional[str] = None
    targetLanguage: Optional[str] = None

@router.get("/me/preferences")
async def get_preferences(user_id: str = Depends(get_current_user_id)):
    data = await database.get_preferences(user_id)
    return {
        "theme": data.get("theme"),
        "fontSize": data.get("font_size"),
        "fontFamily": data.get("font_family"),
        "targetLanguage": data.get("target_language"),
    }

@router.put("/me/preferences")
async def update_preferences(prefs: UserPreferences, user_id: str = Depends(get_current_user_id)):
    updates = {}
    if prefs.theme is not None:
        updates["theme"] = prefs.theme
    if prefs.fontSize is not None:
        updates["font_size"] = prefs.fontSize
    if prefs.fontFamily is not None:
        updates["font_family"] = prefs.fontFamily
    if prefs.targetLanguage is not None:
        updates["target_language"] = prefs.targetLanguage
    if updates:
        await database.update_preferences(user_id, updates)
    return {"status": "success"}
