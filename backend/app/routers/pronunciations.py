"""POST /api/pronunciations — { name } -> PronunciationResult.

Used by the frontend's "edit dish" flow to regenerate pronunciation for a
corrected name, and by manual dish search. Rate-limited and Turnstile-gated
(when enabled) since it triggers an OpenAI call for non-dictionary names.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from ..config import get_settings
from ..schemas import PronunciationRequest, PronunciationResult
from ..services import pronunciation, tts, turnstile
from ..services.rate_limit import RateLimiter

router = APIRouter(prefix="/api/pronunciations", tags=["pronunciations"])

_pronounce_limiter = RateLimiter(
    get_settings().rate_limit_pronounce, get_settings().rate_limit_window
)


@router.post("", response_model=PronunciationResult, dependencies=[Depends(_pronounce_limiter)])
def create(request: Request, body: PronunciationRequest) -> PronunciationResult:
    turnstile.guard(request, request.headers.get("cf-turnstile-response"))
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")

    result = pronunciation.enrich(name)
    return PronunciationResult(
        english=result.english,
        hindi=result.hindi,
        audioUrl=tts.synthesize(name) or None,
    )
