"""Menu scanning — `POST /api/menus/scan` (JSON) and `/scan/stream` (NDJSON)."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from ..config import get_settings
from ..schemas import RestaurantMenu
from ..services import menu_ai, tts, turnstile
from ..services.menu_ai import NotAMenuError
from ..services.rate_limit import RateLimiter

logger = logging.getLogger("whatdish.menus")

router = APIRouter(prefix="/api/menus", tags=["menus"])

# The Turnstile token field the widget adds to the multipart form.
_TURNSTILE_FIELD = "cf-turnstile-response"

# One shared limiter for both scan endpoints (same cost), keyed per IP.
_scan_limiter = RateLimiter(
    get_settings().rate_limit_scan, get_settings().rate_limit_window
)


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


@router.post("/scan", response_model=RestaurantMenu, dependencies=[Depends(_scan_limiter)])
async def scan(
    request: Request,
    image: UploadFile | None = File(default=None),
    cf_token: str | None = Form(default=None, alias=_TURNSTILE_FIELD),
) -> RestaurantMenu:
    """Scan a menu photo and return the full menu in one JSON response.

    Rate-limited per IP; Turnstile (if enabled) and non-image/oversized uploads
    are rejected before any OpenAI call; a non-menu image is rejected by the
    guardrail.
    """
    turnstile.guard(request, cf_token)
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


@router.post("/scan/stream", dependencies=[Depends(_scan_limiter)])
async def scan_stream(
    request: Request,
    image: UploadFile | None = File(default=None),
    cf_token: str | None = Form(default=None, alias=_TURNSTILE_FIELD),
) -> StreamingResponse:
    """Same scan, streamed as NDJSON so the client shows dishes as they arrive.

    Rate limit + Turnstile + validation + guardrail run first (429 / 403 / 415 /
    413 / 422); then each line is a JSON event, ending with `{"type":"menu",...}`.
    """
    turnstile.guard(request, cf_token)
    image_bytes, media_type = await _read_image(image)
    try:
        data_url = await run_in_threadpool(menu_ai.precheck, image_bytes, media_type)
    except NotAMenuError as exc:
        logger.info("Rejected non-menu upload (stream): %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return StreamingResponse(
        menu_ai.stream_menu(data_url), media_type="application/x-ndjson"
    )
