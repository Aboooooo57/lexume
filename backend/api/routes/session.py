from fastapi import APIRouter, HTTPException, Depends
from api.auth import get_current_user_id
from api import database

router = APIRouter(tags=["session"])

@router.get("/session/{session_id}")
async def get_session_detail(session_id: str, user_id: str = Depends(get_current_user_id)):
    session = await database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Remove large bytes from detail view
    session.pop("audio_bytes", None)
    session.pop("original_bytes", None)
    
    return session
