"""GET /api/dishes/{id}/audio — { audioUrl } for a scanned dish."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..schemas import AudioResult
from ..services import tts
from ..store import store

router = APIRouter(prefix="/api/dishes", tags=["dishes"])


@router.get("/{dish_id}/audio", response_model=AudioResult)
def get_audio(dish_id: int) -> AudioResult:
    record = store.get(dish_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Unknown dish")
    return AudioResult(audioUrl=tts.synthesize(record.tts_text))
