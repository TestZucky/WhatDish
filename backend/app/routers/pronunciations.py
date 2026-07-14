"""POST /api/pronunciations — { name } -> PronunciationResult.

Used by the frontend's "edit dish" flow to regenerate pronunciation for a
corrected name, and by manual dish search.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..schemas import PronunciationRequest, PronunciationResult
from ..services import pronunciation, tts

router = APIRouter(prefix="/api/pronunciations", tags=["pronunciations"])


@router.post("", response_model=PronunciationResult)
def create(body: PronunciationRequest) -> PronunciationResult:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")

    result = pronunciation.enrich(name)
    return PronunciationResult(
        english=result.english,
        hindi=result.hindi,
        audioUrl=tts.synthesize(name) or None,
    )
