"""Best-effort in-memory per-IP rate limiting.

Protects the OpenAI/TTS-backed endpoints from a single source hammering them
(cost/quota abuse and light DoS). It is per-process and best-effort against IP
spoofing or distributed attackers — the OpenAI spend cap remains the hard
financial backstop, and Turnstile (when enabled) stops bots regardless of IP.
"""
from __future__ import annotations

import threading
import time
from collections import OrderedDict, deque

from fastapi import HTTPException, Request

from ..config import get_settings

# Cap distinct IPs tracked so memory can't grow without bound.
_MAX_TRACKED_IPS = 10_000


def client_ip(request: Request) -> str:
    """Best-effort client IP. Not behind Cloudflare, so trust the first hop of
    X-Forwarded-For (or CF-Connecting-IP if a proxy sets it)."""
    fwd = request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """FastAPI dependency: at most `limit` requests per `window` seconds per IP.

    Attach with `dependencies=[Depends(instance)]`. A no-op when rate limiting is
    disabled or `limit <= 0`.
    """

    def __init__(self, limit: int, window: int) -> None:
        self.limit = limit
        self.window = window
        self._lock = threading.Lock()
        self._hits: "OrderedDict[str, deque[float]]" = OrderedDict()

    def __call__(self, request: Request) -> None:
        if not get_settings().rate_limit_enabled or self.limit <= 0:
            return
        ip = client_ip(request)
        now = time.monotonic()
        cutoff = now - self.window
        with self._lock:
            hits = self._hits.get(ip)
            if hits is None:
                hits = deque()
                self._hits[ip] = hits
            self._hits.move_to_end(ip)
            while hits and hits[0] < cutoff:
                hits.popleft()
            if len(hits) >= self.limit:
                retry = int(hits[0] + self.window - now) + 1
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests — please slow down.",
                    headers={"Retry-After": str(max(retry, 1))},
                )
            hits.append(now)
            while len(self._hits) > _MAX_TRACKED_IPS:
                self._hits.popitem(last=False)
