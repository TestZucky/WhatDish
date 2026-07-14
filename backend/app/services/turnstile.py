"""Cloudflare Turnstile verification for the scan endpoints.

Gates the expensive OpenAI call behind a bot check. Disabled (allows everything)
when no secret is configured, so dev/local/tests work without Turnstile. When
enabled it fails CLOSED: a missing/invalid token or any verification error is
rejected, since the whole point is to protect the paid endpoint from abuse.
"""
from __future__ import annotations

import logging

import httpx

from ..config import get_settings

logger = logging.getLogger("whatdish.turnstile")

_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
_http = httpx.Client(timeout=10.0)


def verify(token: str | None, remote_ip: str | None) -> bool:
    """Return True if the request may proceed. Allows all when Turnstile is
    disabled; otherwise verifies the token with Cloudflare and fails closed."""
    settings = get_settings()
    if not settings.turnstile_enabled:
        return True
    if not token:
        return False

    payload = {"secret": settings.turnstile_secret, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        resp = _http.post(_VERIFY_URL, data=payload)
        resp.raise_for_status()
        result = resp.json()
    except Exception:
        logger.warning("Turnstile verification request failed", exc_info=True)
        return False

    if not result.get("success"):
        logger.info("Turnstile rejected a request: %s", result.get("error-codes"))
    return bool(result.get("success"))
