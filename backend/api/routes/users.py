from fastapi import APIRouter, Depends, HTTPException, Header
from api.auth import get_current_user_id
from pydantic import BaseModel
from typing import Optional

from api import database, config

router = APIRouter(tags=["users"])

class UserPreferences(BaseModel):
    theme: Optional[str] = None
    fontSize: Optional[str] = None
    fontFamily: Optional[str] = None
    targetLanguage: Optional[str] = None
    translationEngine: Optional[str] = None
    googleDriveToken: Optional[str] = None
    generateAudio: Optional[bool] = None

@router.get("/me/preferences")
async def get_preferences(user_id: str = Depends(get_current_user_id)):
    data = await database.get_preferences(user_id)
    return {
        "theme": data.get("theme"),
        "fontSize": data.get("font_size"),
        "fontFamily": data.get("font_family"),
        "targetLanguage": data.get("target_language"),
        "translationEngine": data.get("translation_engine"),
        "hasDriveToken": bool(data.get("google_drive_token")),
        "generateAudio": bool(data.get("generate_audio", 0)),
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
    if prefs.translationEngine is not None:
        updates["translation_engine"] = prefs.translationEngine
    if prefs.googleDriveToken is not None:
        updates["google_drive_token"] = prefs.googleDriveToken
    if prefs.generateAudio is not None:
        updates["generate_audio"] = 1 if prefs.generateAudio else 0
    if updates:
        await database.update_preferences(user_id, updates)
    return {"status": "success"}


# ─── Credit endpoints ──────────────────────────────────────────────────────────

@router.get("/me/credits")
async def get_my_credits(user_id: str = Depends(get_current_user_id)):
    """Return the current credit balance and recent transaction history."""
    balance = await database.get_credits(user_id)
    history = await database.get_credit_history(user_id, limit=20)
    return {"balance": balance, "history": history}


class PurchaseRequest(BaseModel):
    package_id: int

@router.post("/me/credits/purchase")
async def purchase_credits(body: PurchaseRequest, user_id: str = Depends(get_current_user_id)):
    """
    Mock purchase endpoint. In production, this would be triggered by a 
    Stripe/PayPal webhook after successful payment verification.
    """
    packages = {
        1: {"credits": 50, "bonus": 0, "price": 5},
        2: {"credits": 250, "bonus": 50, "price": 20},
        3: {"credits": 1000, "bonus": 300, "price": 70},
    }
    
    pkg = packages.get(body.package_id)
    if not pkg:
        raise HTTPException(status_code=400, detail="Invalid package ID")
    
    total = pkg["credits"] + pkg["bonus"]
    reason = f"purchase_pkg_{body.package_id}"
    
    new_balance = await database.add_credits(user_id, float(total), reason=reason)
    return {"status": "success", "new_balance": new_balance}


class GrantCreditsRequest(BaseModel):
    amount: float
    reason: str = "admin_grant"


@router.post("/admin/users/{target_user_id}/credits")
async def admin_grant_credits(
    target_user_id: str,
    body: GrantCreditsRequest,
    x_admin_key: str = Header(..., alias="x-admin-key"),
    _user_id: str = Depends(get_current_user_id),
):
    """
    Admin-only: add credits to any user.
    Requires the X-Admin-Key header to match ADMIN_API_KEY from config / env.
    """
    if x_admin_key != config.ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    new_balance = await database.add_credits(target_user_id, body.amount, body.reason)
    return {"user_id": target_user_id, "granted": body.amount, "new_balance": new_balance}
