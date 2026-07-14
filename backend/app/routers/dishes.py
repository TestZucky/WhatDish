"""GET /api/dishes/{id}/audio — { audioUrl } for a scanned dish."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..config import get_settings
from ..schemas import AudioResult
from ..services import tts
from ..services.rate_limit import RateLimiter
from ..store import store

router = APIRouter(prefix="/api/dishes", tags=["dishes"])

_audio_limiter = RateLimiter(
    get_settings().rate_limit_audio, get_settings().rate_limit_window
)


@router.get(
    "/{dish_id}/audio", response_model=AudioResult, dependencies=[Depends(_audio_limiter)]
)
def get_audio(dish_id: int) -> AudioResult:
    record = store.get(dish_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Unknown dish")
    return AudioResult(audioUrl=tts.synthesize(record.tts_text))
