from fastapi import APIRouter, HTTPException, Depends, Query, Response
from fastapi.responses import RedirectResponse
from api.auth import GoogleAuth, get_current_user_id
from api import database
from pydantic import BaseModel

router = APIRouter(tags=["auth"])

class AuthCallbackResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.get("/auth/google/url")
async def get_google_auth_url():
    """Returns the Google OAuth2 authorization URL and generated state."""
    url, state = GoogleAuth.get_login_url()
    return {"url": url, "state": state}

@router.get("/auth/google/callback")
async def google_auth_callback(code: str = Query(...), state: str = Query(None)):
    """Handles the Google OAuth2 callback and redirects to dashboard."""
    from api.auth import VALID_STATES
    
    if state not in VALID_STATES:
        raise HTTPException(status_code=403, detail="Invalid OAuth state (CSRF Protection)")
    
    code_verifier = VALID_STATES.pop(state, None)
    user_info = await GoogleAuth.verify_code(code, code_verifier)
    
    # Save user to database
    uid = await database.get_or_create_user(user_info)
    
    # Create internal JWT
    token = GoogleAuth.create_access_token(uid)
    
    # Redirect with cookie
    response = RedirectResponse(url="http://localhost:3000/dashboard")
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=24 * 3600,
        path="/"
    )
    return response

@router.post("/auth/logout")
async def logout(response: Response):
    """Clears the authentication cookie."""
    response.delete_cookie(key="access_token", path="/")
    return {"status": "ok"}

@router.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user_id)):
    """Returns the current user's information."""
    user = await database.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
