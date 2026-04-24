from fastapi import APIRouter, HTTPException, Depends
from api.auth import get_current_user_id
from pydantic import BaseModel
from typing import List, Dict, Any

from api import database

router = APIRouter()

class BookmarkRequest(BaseModel):
    session_id: str
    text: str

class LookupRequest(BaseModel):
    session_id: str
    word: str

@router.get("/sessions")
async def get_library_sessions(user_id: str = Depends(get_current_user_id)):
    return await database.get_all_sessions_summary()

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    success = await database.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "ok"}

@router.post("/bookmarks")
async def create_bookmark(req: BookmarkRequest):
    if not await database.get_session(req.session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    await database.add_bookmark(req.session_id, req.text)
    return {"status": "ok"}

@router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: int):
    await database.delete_bookmark(bookmark_id)
    return {"status": "ok"}

@router.post("/vocabulary")
async def create_lookup(req: LookupRequest):
    if not await database.get_session(req.session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    await database.add_lookup(req.session_id, req.word)
    return {"status": "ok"}
