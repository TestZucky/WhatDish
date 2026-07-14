"""Thin wrapper around the OpenAI SDK.

Centralises client creation and a single structured-output helper used by both
the menu-vision and pronunciation services. All callers must tolerate `None`
(returned on any error) and fall back gracefully — the product is designed to
work without a key.

`content` uses the OpenAI chat "content parts" shape:
    text  -> {"type": "text", "text": "..."}
    image -> {"type": "image_url", "image_url": {"url": "data:...;base64,..."}}
"""
from __future__ import annotations

import json
import logging
from collections.abc import Iterator
from typing import Any

from ..config import get_settings

logger = logging.getLogger("whatdish.llm")

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    settings = get_settings()
    if not settings.ai_enabled:
        return None
    try:
        from openai import OpenAI

        _client = OpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_timeout,
            max_retries=2,
        )
        return _client
    except Exception:  # pragma: no cover - import/init failure
        logger.exception("Failed to initialise OpenAI client")
        return None


def generate_json(
    *,
    content: list[dict[str, Any]],
    schema: dict[str, Any],
    system: str | None = None,
    max_tokens: int = 8000,
    schema_name: str = "result",
    model: str | None = None,
    prompt_cache_key: str | None = None,
) -> dict[str, Any] | None:
    """Run one structured-output request and return the parsed JSON object.

    `content` is the user message content (text and/or image_url parts).
    `model` overrides the default extraction model (used by the cheap guardrail).
    `prompt_cache_key` routes repeat calls to the same prompt cache (the static
    system prefix is reused), lowering time-to-first-token and cost.
    Returns None if the model is unavailable, refuses, or can't be parsed.
    """
    client = _get_client()
    if client is None:
        return None

    settings = get_settings()
    messages: list[dict[str, Any]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": content})

    extra: dict[str, Any] = {}
    if prompt_cache_key:
        extra["prompt_cache_key"] = prompt_cache_key

    try:
        response = client.chat.completions.create(
            model=model or settings.model,
            max_tokens=max_tokens,
            messages=messages,
            response_format={
                "type": "json_schema",
                "json_schema": {"name": schema_name, "schema": schema, "strict": True},
            },
            **extra,
        )
    except Exception:
        logger.exception("OpenAI request failed")
        return None

    message = response.choices[0].message
    if getattr(message, "refusal", None):
        logger.warning("Model refused: %s", message.refusal)
        return None

    text = message.content or ""
    if not text.strip():
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Model returned non-JSON output: %s", text[:200])
        return None


def stream_json_deltas(
    *,
    content: list[dict[str, Any]],
    schema: dict[str, Any],
    system: str | None = None,
    max_tokens: int = 8000,
    schema_name: str = "result",
    model: str | None = None,
    prompt_cache_key: str | None = None,
) -> Iterator[str]:
    """Yield the incremental text deltas of one structured-output request.

    Callers accumulate the deltas into the full JSON string. Yields nothing if
    the client is unavailable or the request fails, so the caller can fall back.
    """
    client = _get_client()
    if client is None:
        return

    settings = get_settings()
    messages: list[dict[str, Any]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": content})

    extra: dict[str, Any] = {}
    if prompt_cache_key:
        extra["prompt_cache_key"] = prompt_cache_key

    try:
        stream = client.chat.completions.create(
            model=model or settings.model,
            max_tokens=max_tokens,
            messages=messages,
            response_format={
                "type": "json_schema",
                "json_schema": {"name": schema_name, "schema": schema, "strict": True},
            },
            stream=True,
            **extra,
        )
        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except Exception:
        logger.exception("OpenAI streaming request failed")
        return
