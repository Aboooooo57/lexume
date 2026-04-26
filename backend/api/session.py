from __future__ import annotations
from typing import Any, Optional
from api import database

async def create(data: dict[str, Any], user_id: Optional[str] = None) -> str:
    return await database.create_session(data, user_id=user_id)

async def get(sid: str) -> Optional[dict[str, Any]]:
    return await database.get_session(sid)

async def update(sid: str, data: dict[str, Any]) -> bool:
    return await database.update_session(sid, data)
