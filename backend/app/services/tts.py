"""Text-to-speech for pronunciation audio.

Synthesises an MP3 and returns it as a self-contained `data:` URL, so no static
file hosting or temporary storage is needed — the frontend can feed the string
straight into `new Audio(url)`.

Provider order (first that succeeds wins):
    1. ElevenLabs   — if ELEVENLABS_API_KEY is set (best quality, multilingual)
    2. gTTS         — free, needs network
    3. ""           — frontend falls back to browser speech synthesis

Best-effort throughout: any failure returns an empty string and the frontend
degrades gracefully (the TDD's audio-failure contract).
"""
from __future__ import annotations

import base64
import io
import logging
import threading
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor

import httpx

from ..config import get_settings

logger = logging.getLogger("whatdish.tts")

# LRU cache of text -> data: URL. Entries are large (base64 MP3), so bound it to
# avoid unbounded memory growth over a long-running process.
_CACHE_MAX = 512
_lock = threading.Lock()
_cache: "OrderedDict[str, str]" = OrderedDict()

# Reused across calls so each TTS request doesn't pay a fresh TLS handshake.
_http = httpx.Client(timeout=20.0)

# Small pool for background pre-warming (see prewarm) — bounds provider concurrency.
_prewarm_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="tts-prewarm")


def _data_url(audio_bytes: bytes) -> str:
    return "data:audio/mpeg;base64," + base64.standard_b64encode(audio_bytes).decode("ascii")


def _elevenlabs(text: str) -> str:
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        return ""
    try:
        resp = _http.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{settings.elevenlabs_voice_id}",
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "accept": "audio/mpeg",
                "content-type": "application/json",
            },
            json={
                "text": text,
                "model_id": settings.elevenlabs_model,
                "voice_settings": {
                    "stability": settings.elevenlabs_stability,
                    "similarity_boost": settings.elevenlabs_similarity,
                    "style": settings.elevenlabs_style,
                    "use_speaker_boost": True,
                },
            },
        )
        resp.raise_for_status()
        return _data_url(resp.content)
    except Exception:
        logger.warning("ElevenLabs TTS failed for %r", text, exc_info=True)
        return ""


def _gtts(text: str) -> str:
    try:
        from gtts import gTTS

        buffer = io.BytesIO()
        gTTS(text=text, lang=get_settings().tts_lang).write_to_fp(buffer)
        return _data_url(buffer.getvalue())
    except Exception:
        logger.warning("gTTS unavailable for %r", text, exc_info=True)
        return ""


def synthesize(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""

    with _lock:
        cached = _cache.get(text)
        if cached is not None:
            _cache.move_to_end(text)  # mark recently used
            return cached

    url = _elevenlabs(text) or _gtts(text)

    # Cache successes only: a transient provider/network failure must stay
    # retryable, not be memoised as a permanent empty result.
    if url:
        with _lock:
            _cache[text] = url
            _cache.move_to_end(text)
            while len(_cache) > _CACHE_MAX:
                _cache.popitem(last=False)  # evict least-recently-used
    return url


def prewarm(texts: list[str]) -> None:
    """Synthesise these texts in the background so a later request hits the cache.

    Fire-and-forget: skips anything already cached, and swallows a shutdown race
    on interpreter exit. Bounded by the pool's worker count.
    """
    for text in texts:
        text = (text or "").strip()
        if not text or text in _cache:
            continue
        try:
            _prewarm_pool.submit(synthesize, text)
        except RuntimeError:
            return  # pool already shut down
