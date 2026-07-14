"""Runtime configuration, layered per environment (development / production).

The active environment comes from the ``APP_ENV`` process variable (default
``development``) — NOT from the dotenv files — so it can be set by the Makefile
or your deployment platform. Values are then layered, highest priority first:

    1. real process environment variables
    2. .env.<env>.local   (gitignored — per-env secrets / overrides)
    3. .env.local         (gitignored — secrets / overrides for all envs)
    4. .env.<env>         (committed   — non-secret per-env defaults)
    5. .env               (committed   — non-secret shared base, optional)

Everything has a sensible default so the service boots with zero setup, and
`development` deliberately defaults to very cheap models to keep API spend low
while iterating.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parents[1]

_ENV_ALIASES = {
    "dev": "development",
    "develop": "development",
    "development": "development",
    "prod": "production",
    "production": "production",
}


def _resolve_env() -> str:
    raw = (os.getenv("APP_ENV") or os.getenv("WHATDISH_ENV") or "development").strip().lower()
    return _ENV_ALIASES.get(raw, "development")


APP_ENV = _resolve_env()

# Layered load: the first value to land wins (override=False), so files are
# loaded highest-priority first. Anything already in the real environment beats
# every file. Missing files are silently skipped.
for _fname in (f".env.{APP_ENV}.local", ".env.local", f".env.{APP_ENV}", ".env"):
    load_dotenv(_BACKEND_DIR / _fname, override=False)

# Permissive localhost origins used as the dev default (Vite dev + preview).
_DEFAULT_DEV_ORIGINS = "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173"

_TRUTHY = {"1", "true", "yes", "on"}


def _float_env(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, "").strip() or default)
    except ValueError:
        return default


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, "").strip() or default)
    except ValueError:
        return default


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in _TRUTHY


class Settings:
    def __init__(self) -> None:
        self.app_env: str = APP_ENV
        is_prod = self.app_env == "production"

        self.openai_api_key: str = os.getenv("OPENAI_API_KEY", "").strip()
        # Vision model for extraction. Defaults to the cheap model for cost;
        # bump to gpt-4o via WHATDISH_MODEL if you need higher OCR accuracy.
        self.model: str = os.getenv("WHATDISH_MODEL", "").strip() or "gpt-4o-mini"
        # The guardrail is a throwaway classification — cheap in every env.
        self.guardrail_model: str = (
            os.getenv("WHATDISH_GUARDRAIL_MODEL", "").strip() or "gpt-4o-mini"
        )
        # Pronunciation enrichment is simple text generation — keep it on the
        # cheap model independently, even if the extraction model is bumped.
        self.enrich_model: str = (
            os.getenv("WHATDISH_ENRICH_MODEL", "").strip() or "gpt-4o-mini"
        )
        # Per-request OpenAI timeout (seconds). The SDK defaults to ~10 min; a
        # tighter bound stops a hung call from tying up a worker.
        self.openai_timeout: float = _float_env("WHATDISH_OPENAI_TIMEOUT", 60.0)
        # Cloudflare Turnstile secret. When set, scan endpoints require a valid
        # token (bot/abuse protection). Empty = disabled (dev, tests, local).
        self.turnstile_secret: str = os.getenv("TURNSTILE_SECRET_KEY", "").strip()
        # Reject uploads larger than this before any model call (bytes). 10 MB.
        self.max_image_bytes: int = _int_env("WHATDISH_MAX_IMAGE_BYTES", 10 * 1024 * 1024)
        # After a scan, synthesise audio for recognized dishes in the background
        # so the first tap is instant. Costs one TTS call per dish — disable to save.
        self.prewarm_audio: bool = _bool_env("WHATDISH_PREWARM_AUDIO", True)

        self.tts_lang: str = os.getenv("WHATDISH_TTS_LANG", "en").strip() or "en"
        # ElevenLabs (optional): if a key is set it's preferred over gTTS.
        self.elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "").strip()
        self.elevenlabs_voice_id: str = (
            os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM").strip()
            or "21m00Tcm4TlvDq8ikWAM"
        )
        self.elevenlabs_model: str = (
            os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2").strip()
            or "eleven_multilingual_v2"
        )
        # Voice settings — tuned for a warmer, less robotic read.
        self.elevenlabs_stability: float = _float_env("ELEVENLABS_STABILITY", 0.4)
        self.elevenlabs_similarity: float = _float_env("ELEVENLABS_SIMILARITY", 0.85)
        self.elevenlabs_style: float = _float_env("ELEVENLABS_STYLE", 0.35)

        # CORS: permissive localhost in dev; in prod it MUST be set explicitly
        # (an empty allow-list fails closed rather than trusting every origin).
        default_origins = "" if is_prod else _DEFAULT_DEV_ORIGINS
        self.cors_origins: list[str] = [
            origin.strip()
            for origin in os.getenv("WHATDISH_CORS_ORIGINS", default_origins).split(",")
            if origin.strip()
        ]

        # Observability & surface area differ by env.
        self.log_level: str = (
            os.getenv("WHATDISH_LOG_LEVEL", "").strip() or ("INFO" if is_prod else "DEBUG")
        ).upper()
        self.debug: bool = _bool_env("WHATDISH_DEBUG", not is_prod)
        # Interactive API docs (Swagger/ReDoc) — on in dev, off in prod by default.
        self.enable_docs: bool = _bool_env("WHATDISH_ENABLE_DOCS", not is_prod)

    @property
    def ai_enabled(self) -> bool:
        """True when an OpenAI key is configured."""
        return bool(self.openai_api_key)

    @property
    def turnstile_enabled(self) -> bool:
        return bool(self.turnstile_secret)

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    def warnings(self) -> list[str]:
        """Non-fatal config problems worth logging at startup (prod-focused)."""
        issues: list[str] = []
        if self.is_production:
            if not self.openai_api_key:
                issues.append(
                    "OPENAI_API_KEY is not set — the API will run in demo mode in production."
                )
            if not self.cors_origins:
                issues.append(
                    "WHATDISH_CORS_ORIGINS is empty — browser clients will be blocked by CORS."
                )
        return issues


@lru_cache
def get_settings() -> Settings:
    return Settings()
