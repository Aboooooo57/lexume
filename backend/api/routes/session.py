from fastapi import APIRouter, HTTPException, Depends
from api.auth import get_current_user_id
from api import database

router = APIRouter(tags=["session"])

from pydantic import BaseModel
from typing import Optional

class SessionUpdate(BaseModel):
    name: Optional[str] = None

@router.get("/session/{session_id}")
async def get_session_detail(session_id: str, user_id: str = Depends(get_current_user_id)):
    session = await database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Remove large bytes from detail view
    session.pop("audio_bytes", None)
    session.pop("original_bytes", None)
    
    return session

@router.patch("/session/{session_id}")
async def update_session_metadata(
    session_id: str, 
    update_data: SessionUpdate, 
    user_id: str = Depends(get_current_user_id)
):
    updates = {}
    if update_data.name is not None:
        updates["name"] = update_data.name
    
    if not updates:
        return {"status": "no changes"}
        
    success = await database.update_session(session_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="Session update failed")
    
    return {"status": "success"}
