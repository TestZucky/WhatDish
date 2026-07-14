import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.config import get_settings
from app.services.rate_limit import RateLimiter


def _req(ip: str) -> Request:
    return Request(
        {
            "type": "http",
            "headers": [(b"x-forwarded-for", ip.encode())],
            "client": ("0.0.0.0", 0),
        }
    )


def test_limiter_blocks_over_limit_and_isolates_by_ip():
    rl = RateLimiter(limit=2, window=3600)
    a = _req("1.1.1.1")

    rl(a)
    rl(a)  # 2 allowed
    with pytest.raises(HTTPException) as exc:
        rl(a)  # 3rd blocked
    assert exc.value.status_code == 429

    # A different IP has its own budget.
    rl(_req("2.2.2.2"))  # must not raise


def test_limiter_is_noop_when_disabled(monkeypatch):
    monkeypatch.setattr(get_settings(), "rate_limit_enabled", False)
    rl = RateLimiter(limit=1, window=3600)
    r = _req("9.9.9.9")
    rl(r)
    rl(r)
    rl(r)  # never raises while disabled
