from fastapi import APIRouter, Response, HTTPException, Depends
from api.auth import get_current_user_id
from api import database

router = APIRouter(tags=["audio"])

@router.get("/audio/{session_id}")
async def get_session_audio(session_id: str, user_id: str = Depends(get_current_user_id)):
    audio_bytes = await database.get_session_audio_bytes(session_id)
    if not audio_bytes:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    return Response(content=audio_bytes, media_type="audio/mpeg")

@router.get("/audio/{session_id}/page/{page_number}")
async def get_session_page_audio(session_id: str, page_number: int, user_id: str = Depends(get_current_user_id)):
    audio_bytes = await database.get_session_page_audio_bytes(session_id, page_number)
    if not audio_bytes:
        raise HTTPException(status_code=404, detail="Audio not found for this page")
    
    return Response(content=audio_bytes, media_type="audio/mpeg")

