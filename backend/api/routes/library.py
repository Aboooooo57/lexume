from fastapi import APIRouter, HTTPException, Depends, Query, Response, Request
from fastapi.responses import RedirectResponse
from api.auth import GoogleDriveAuth, get_current_user_id
from api import database
from api import encryption
import json
import base64
import urllib.parse
import httpx
from api import config

router = APIRouter(tags=["library"])

# Auth routes
@router.get("/auth-url")
async def get_drive_auth_url(response: Response, user_id: str = Depends(get_current_user_id)):
    """Returns the Google Drive authorization URL and sets context cookie."""
    url, state = GoogleDriveAuth.get_auth_url()
    print(f"DEBUG: Generating Drive Auth URL for user {user_id}. State: {state}")
    
    response.set_cookie(
        key="drive_auth_user",
        value=user_id,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=600
    )
    return {"url": url, "state": state}

@router.get("/callback")
async def drive_auth_callback(
    request: Request,
    code: str = Query(...), 
    state: str = Query(None), 
):
    """Handles the Google Drive OAuth2 callback and stores the encrypted token."""
    from api.auth import VALID_STATES, GoogleAuth
    
    user_id = request.cookies.get("drive_auth_user")
    if not user_id:
        token = request.cookies.get("access_token")
        if token:
            try: user_id = GoogleAuth.verify_access_token(token)
            except: pass
                
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication context lost.")

    code_verifier = VALID_STATES.pop(state, None)
    
    try:
        credentials = await GoogleDriveAuth.get_credentials(code, code_verifier)
        token_data = {
            "token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": credentials.scopes
        }
        
        encrypted_token = encryption.encrypt_token(json.dumps(token_data))
        await database.update_preferences(user_id, {"google_drive_token": encrypted_token})
        
        response = RedirectResponse(url="http://localhost:3000/dashboard?drive_success=true")
        response.delete_cookie("drive_auth_user")
        return response
    except Exception as e:
        print(f"DEBUG: Drive auth exchange error: {e}")
        raise HTTPException(status_code=400, detail="Failed to exchange Google code")

from pydantic import BaseModel
from typing import Optional, List

class BookmarkRequest(BaseModel):
    session_id: str
    text: str

class VocabularyRequest(BaseModel):
    session_id: str
    word: str
    definition: Optional[str] = None

async def refresh_drive_token(user_id: str, token_data: dict) -> str:
    """Uses the refresh token to get a new access token."""
    if not token_data.get("refresh_token"):
        raise HTTPException(status_code=401, detail="Session expired. Please reconnect Drive.")

    print(f"DEBUG: Refreshing token for user {user_id}...")
    try:
        import certifi
        async with httpx.AsyncClient(timeout=15.0, verify=certifi.where()) as client:
            resp = await client.post("https://oauth2.googleapis.com/token", data={
                "client_id": config.GOOGLE_CLIENT_ID,
                "client_secret": config.GOOGLE_CLIENT_SECRET,
                "refresh_token": token_data.get("refresh_token"),
                "grant_type": "refresh_token"
            })
    except httpx.RequestError as e:
        print(f"DEBUG: Network error during token refresh: {e}")
        raise HTTPException(status_code=503, detail="Could not reach Google servers. Check network.")

    if resp.status_code != 200:
        print(f"DEBUG: Refresh failed ({resp.status_code}): {resp.text}")
        await database.update_preferences(user_id, {"google_drive_token": None})
        raise HTTPException(status_code=401, detail="Drive session expired. Please reconnect.")

    new_data = resp.json()
    token_data["token"] = new_data["access_token"]
    await database.update_preferences(user_id, {
        "google_drive_token": encryption.encrypt_token(json.dumps(token_data))
    })
    print(f"DEBUG: Token refreshed successfully for user {user_id}")
    return token_data["token"]

@router.get("/drive/files")
async def list_drive_files(folder_id: str = "root", user_id: str = Depends(get_current_user_id)):
    """Lists Drive files, with automatic retry on token expiration."""
    prefs = await database.get_preferences(user_id)
    encrypted_token = prefs.get("google_drive_token")
    if not encrypted_token:
        raise HTTPException(status_code=401, detail="Drive not connected")

    try:
        token_data = json.loads(encryption.decrypt_token(encrypted_token))
    except:
        raise HTTPException(status_code=401, detail="Session corrupted.")

    access_token = token_data.get("token")
    
    import certifi
    q = f"('{folder_id}' in parents) and (mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.google-apps.folder') and trashed = false"
    url = f"https://www.googleapis.com/drive/v3/files?q={urllib.parse.quote(q)}&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=folder,name"

    try:
        async with httpx.AsyncClient(timeout=15.0, verify=certifi.where()) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})

            # If token is expired (401), refresh once and retry
            if resp.status_code == 401:
                access_token = await refresh_drive_token(user_id, token_data)
                resp = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})

            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Drive API error")

            return resp.json().get("files", [])
    except httpx.RequestError as e:
        print(f"DEBUG: Network error fetching Drive files: {e}")
        raise HTTPException(status_code=503, detail="Could not reach Google Drive. Check network.")

@router.get("/drive/fetch/{file_id}")
async def fetch_drive_file(file_id: str, user_id: str = Depends(get_current_user_id)):
    """Downloads a file, with automatic retry on token expiration."""
    prefs = await database.get_preferences(user_id)
    encrypted_token = prefs.get("google_drive_token")
    token_data = json.loads(encryption.decrypt_token(encrypted_token))
    access_token = token_data.get("token")

    import certifi
    try:
        async with httpx.AsyncClient(timeout=30.0, verify=certifi.where()) as client:
            # Get metadata
            meta_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?fields=name,mimeType"
            m_resp = await client.get(meta_url, headers={"Authorization": f"Bearer {access_token}"})

            if m_resp.status_code == 401:
                access_token = await refresh_drive_token(user_id, token_data)
                m_resp = await client.get(meta_url, headers={"Authorization": f"Bearer {access_token}"})

            if m_resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Metadata fetch failed")

            meta = m_resp.json()

            # Download content
            dl_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
            f_resp = await client.get(dl_url, headers={"Authorization": f"Bearer {access_token}"})

            if f_resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Download failed")

            return {
                "content_base64": base64.b64encode(f_resp.content).decode(),
                "filename": meta.get("name", "document"),
                "mimeType": meta.get("mimeType")
            }
    except httpx.RequestError as e:
        print(f"DEBUG: Network error fetching Drive file {file_id}: {e}")
        raise HTTPException(status_code=503, detail="Could not reach Google Drive. Check network.")

# Restore remaining library routes
@router.get("/sessions")
async def get_sessions(user_id: str = Depends(get_current_user_id)):
    return await database.get_all_sessions_summary()

@router.get("/sessions/{session_id}/bookmarks")
async def get_session_bookmarks(session_id: str, user_id: str = Depends(get_current_user_id)):
    bookmarks = await database.get_session_bookmarks(session_id)
    return bookmarks

@router.post("/bookmarks")
async def add_bookmark(req: BookmarkRequest, user_id: str = Depends(get_current_user_id)):
    bid = await database.add_bookmark(req.session_id, req.text)
    return {"id": bid}

@router.delete("/bookmarks")
async def remove_bookmark(req: BookmarkRequest, user_id: str = Depends(get_current_user_id)):
    await database.remove_bookmark(req.session_id, req.text)
    return {"status": "removed"}

@router.post("/vocabulary")
async def add_vocabulary(req: VocabularyRequest, user_id: str = Depends(get_current_user_id)):
    vid = await database.add_lookup(req.session_id, req.word, req.definition)
    return {"id": vid}

@router.delete("/session/{session_id}")
async def delete_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    success = await database.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "success"}
