"""Pronunciation enrichment for a single dish name.

Resolution order follows the TDD:
    1. Curated verified dictionary
    2. AI-generated (structured JSON)
    3. Heuristic fallback (say-it-as-written)
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

from . import dictionary
from .llm import generate_json

logger = logging.getLogger("whatdish.pronunciation")

# Enrichment fan-out: unknown names are split into chunks and enriched
# concurrently so wall-clock ≈ one chunk instead of the sum of all of them.
_ENRICH_CHUNK = 10
_ENRICH_WORKERS = 4

_PRON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "source_language": {"type": "string"},
        "english": {"type": "string"},
        "hindi": {"type": "string"},
    },
    "required": ["source_language", "english", "hindi"],
}

_SYSTEM = (
    "You are a pronunciation assistant for Indian restaurant customers. "
    "For a given dish name produce, as JSON: the likely source language/cuisine; "
    "an Indian-English sound breakdown using simple syllables with CAPITALISED "
    "stressed syllables and no IPA (e.g. 'Broo-SKET-ta'); and the same "
    "pronunciation transliterated into Hindi (Devanagari) script — transliterate "
    "the SOUND, do not translate the meaning. Keep the breakdowns short and readable."
)


@dataclass
class Pronunciation:
    source_language: str
    english: str
    hindi: str
    description: str


def _heuristic(name: str) -> Pronunciation:
    clean = name.strip()
    return Pronunciation(
        source_language="Unknown",
        english=f"{clean} (say it as written)",
        hindi=clean,
        description="",
    )


def enrich(name: str) -> Pronunciation:
    curated = dictionary.lookup(name)
    if curated:
        language, english, hindi, description = curated
        return Pronunciation(language, english, hindi, description)

    data = generate_json(
        content=[{"type": "text", "text": f"Dish name: {name}"}],
        schema=_PRON_SCHEMA,
        system=_SYSTEM,
        max_tokens=1000,
        schema_name="pronunciation",
        prompt_cache_key="whatdish-pronunciation",
    )
    if data:
        return Pronunciation(
            source_language=str(data.get("source_language") or "Unknown"),
            english=str(data.get("english") or name),
            hindi=str(data.get("hindi") or name),
            description=str(data.get("description") or ""),
        )

    return _heuristic(name)


_BATCH_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name": {"type": "string"},
                    "source_language": {"type": "string"},
                    "english": {"type": "string"},
                    "hindi": {"type": "string"},
                },
                "required": ["name", "source_language", "english", "hindi"],
            },
        }
    },
    "required": ["items"],
}

_BATCH_SYSTEM = (
    _SYSTEM + " You are given several dish names, one per line. Return one entry per "
    "name, echoing the exact name you were given."
)


def _enrich_chunk(names: list[str]) -> dict[str, Pronunciation]:
    listed = "\n".join(f"- {n}" for n in names)
    try:
        data = generate_json(
            content=[{"type": "text", "text": f"Dish names:\n{listed}"}],
            schema=_BATCH_SCHEMA,
            system=_BATCH_SYSTEM,
            max_tokens=1500,
            schema_name="pronunciations",
            prompt_cache_key="whatdish-pronunciation-batch",
        )
    except Exception:
        # Runs in a worker thread — never let one chunk fail the whole scan.
        logger.exception("Batch pronunciation enrichment failed; using heuristics")
        data = None
    out: dict[str, Pronunciation] = {}
    for item in (data or {}).get("items") or []:
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        out[name] = Pronunciation(
            source_language=str(item.get("source_language") or "Unknown"),
            english=str(item.get("english") or name),
            hindi=str(item.get("hindi") or name),
            description=str(item.get("description") or ""),
        )
    # Anything the model omitted or renamed falls back to say-it-as-written.
    for name in names:
        out.setdefault(name, _heuristic(name))
    return out


def enrich_many(names: list[str]) -> dict[str, Pronunciation]:
    """Resolve pronunciations for many dish names at once.

    Curated dictionary hits are instant (no LLM); the rest are enriched in
    concurrent batches so total latency stays close to a single call.
    """
    result: dict[str, Pronunciation] = {}
    unknown: list[str] = []
    seen: set[str] = set()

    for raw in names:
        name = raw.strip()
        if not name or name in seen:
            continue
        seen.add(name)
        curated = dictionary.lookup(name)
        if curated:
            language, english, hindi, description = curated
            result[name] = Pronunciation(language, english, hindi, description)
        else:
            unknown.append(name)

    if unknown:
        chunks = [unknown[i : i + _ENRICH_CHUNK] for i in range(0, len(unknown), _ENRICH_CHUNK)]
        with ThreadPoolExecutor(max_workers=min(_ENRICH_WORKERS, len(chunks))) as pool:
            for chunk_result in pool.map(_enrich_chunk, chunks):
                result.update(chunk_result)

    return result
