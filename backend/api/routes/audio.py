from fastapi import APIRouter, Response, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from api.auth import get_current_user_id
from api import database
import io

router = APIRouter(tags=["audio"])


def _range_response(audio_bytes: bytes, request: Request) -> Response:
    """Return a proper ranged audio response supporting HTTP Range requests for seeking."""
    total = len(audio_bytes)
    range_header = request.headers.get("range")

    if range_header:
        try:
            unit, ranges = range_header.strip().split("=")
            start_str, end_str = ranges.split("-")
            start = int(start_str)
            end = int(end_str) if end_str else total - 1
        except Exception:
            raise HTTPException(status_code=416, detail="Invalid Range header")

        if start >= total or end >= total or start > end:
            return Response(
                status_code=416,
                headers={"Content-Range": f"bytes */{total}"},
            )

        chunk = audio_bytes[start : end + 1]
        return Response(
            content=chunk,
            status_code=206,
            media_type="audio/mpeg",
            headers={
                "Content-Range": f"bytes {start}-{end}/{total}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(len(chunk)),
            },
        )

    # Full response — still advertise range support so the browser knows it can seek
    return Response(
        content=audio_bytes,
        status_code=200,
        media_type="audio/mpeg",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(total),
        },
    )


@router.get("/audio/{session_id}")
async def get_session_audio(
    session_id: str,
    request: Request,
    user_id: str = Depends(get_current_user_id),
):
    audio_bytes = await database.get_session_audio_bytes(session_id)
    if not audio_bytes:
        raise HTTPException(status_code=404, detail="Audio not found")
    return _range_response(audio_bytes, request)


@router.get("/audio/{session_id}/page/{page_number}")
async def get_session_page_audio(
    session_id: str,
    page_number: int,
    request: Request,
    user_id: str = Depends(get_current_user_id),
):
    audio_bytes = await database.get_session_page_audio_bytes(session_id, page_number)
    if not audio_bytes:
        raise HTTPException(status_code=404, detail="Audio not found for this page")
    return _range_response(audio_bytes, request)
