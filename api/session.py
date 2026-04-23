from __future__ import annotations

import time
import uuid
from typing import Any

# In-memory store: session_id → data dict
# Keys per session: extracted, paragraphs, audio_bytes, word_timings, created_at
_store: dict[str, dict[str, Any]] = {}

TTL = 3600  # seconds


def create(data: dict[str, Any]) -> str:
    sid = str(uuid.uuid4())
    _store[sid] = {**data, "created_at": time.time()}
    _evict()
    return sid


def get(sid: str) -> dict[str, Any] | None:
    return _store.get(sid)


def update(sid: str, data: dict[str, Any]) -> bool:
    if sid not in _store:
        return False
    _store[sid].update(data)
    return True


def _evict() -> None:
    cutoff = time.time() - TTL
    stale = [k for k, v in _store.items() if v.get("created_at", 0) < cutoff]
    for k in stale:
        del _store[k]
