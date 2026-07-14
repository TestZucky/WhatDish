"""Menu scanning — `POST /api/menus/scan` (JSON) and `/scan/stream` (NDJSON)."""
from __future__ import annotations

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from ..config import get_settings
from ..schemas import RestaurantMenu
from ..services import menu_ai, tts
from ..services.menu_ai import NotAMenuError

logger = logging.getLogger("whatdish.menus")

router = APIRouter(prefix="/api/menus", tags=["menus"])


def _sniff_image_type(data: bytes) -> str | None:
    """Identify an image from its magic bytes, ignoring the client-supplied
    content-type (which is trivially spoofable). Returns the media type for a
    supported image, or None if the bytes aren't a recognised image at all."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


async def _read_image(image: UploadFile | None) -> tuple[bytes | None, str]:
    """Read + validate an upload before any model call: reject oversized (413)
    and non-image (415) payloads. Returns (bytes|None, media_type)."""
    if image is None:
        return None, "image/jpeg"

    image_bytes = await image.read()
    max_bytes = get_settings().max_image_bytes
    if len(image_bytes) > max_bytes:
        raise HTTPException(
            status_code=413, detail=f"Image too large (max {max_bytes // (1024 * 1024)} MB)."
        )
    sniffed = _sniff_image_type(image_bytes)
    if sniffed is None:
        raise HTTPException(
            status_code=415, detail="Upload must be a JPEG, PNG, GIF, or WebP image."
        )
    return image_bytes, sniffed


@router.post("/scan", response_model=RestaurantMenu)
async def scan(image: UploadFile | None = File(default=None)) -> RestaurantMenu:
    """Scan a menu photo and return the full menu in one JSON response.

    Non-image/oversized uploads are rejected before any OpenAI call, and a real
    image that isn't a menu is rejected by the guardrail (422).
    """
    image_bytes, media_type = await _read_image(image)
    try:
        # Blocking OpenAI calls run in a threadpool so this async route doesn't
        # stall the event loop for every other request.
        menu = await run_in_threadpool(menu_ai.scan_menu, image_bytes, media_type)
    except NotAMenuError as exc:
        logger.info("Rejected non-menu upload (scan): %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if get_settings().prewarm_audio:
        tts.prewarm([dish.name for dish in menu.dishes])
    return menu


@router.post("/scan/stream")
async def scan_stream(image: UploadFile | None = File(default=None)) -> StreamingResponse:
    """Same scan, streamed as NDJSON so the client shows dishes as they arrive.

    Validation + guardrail run first (so 415/413/422 still apply); then each line
    is a JSON event: `{"type":"dish",...}` per name, then `{"type":"menu",...}`.
    """
    image_bytes, media_type = await _read_image(image)
    try:
        data_url = await run_in_threadpool(menu_ai.precheck, image_bytes, media_type)
    except NotAMenuError as exc:
        logger.info("Rejected non-menu upload (stream): %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return StreamingResponse(
        menu_ai.stream_menu(data_url), media_type="application/x-ndjson"
    )
