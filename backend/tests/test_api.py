import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import menu_ai, pronunciation, tts, turnstile

# A valid 1x1 PNG, reused wherever a route needs to pass the magic-byte check.
_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d4944415478da6360000002000001e221bc330000000049454e44ae426082"
)


@pytest.fixture
def client(monkeypatch):
    # Never hit a TTS provider (ElevenLabs/gTTS) or the LLM during API tests —
    # keep everything offline and deterministic regardless of local .env keys.
    monkeypatch.setattr(tts, "synthesize", lambda text: f"data:audio/mpeg;base64,FAKE:{text}")
    monkeypatch.setattr(menu_ai, "generate_json", lambda **kwargs: None)
    monkeypatch.setattr(pronunciation, "generate_json", lambda **kwargs: None)
    return TestClient(app)


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert "aiEnabled" in body
    assert "model" in body


def test_scan_without_image_returns_demo_menu(client):
    res = client.post("/api/menus/scan")
    assert res.status_code == 200
    menu = res.json()
    assert menu["dishCount"] == len(menu["dishes"]) == 7
    assert menu["restaurant"]["name"]
    # camelCase contract the frontend depends on
    assert {"restaurant", "dishCount", "dishes", "sections"} <= menu.keys()
    dish = menu["dishes"][0]
    assert {"id", "name", "english", "hindi", "cuisine", "description", "category", "price"} <= dish.keys()


def test_scan_accepts_image_upload(client):
    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
        "0000000d4944415478da6360000002000001e221bc330000000049454e44ae426082"
    )
    res = client.post("/api/menus/scan", files={"image": ("menu.png", png, "image/png")})
    assert res.status_code == 200
    assert res.json()["dishCount"] >= 1


def test_scan_rejects_non_image_upload(client):
    # Garbage bytes (not a real image) must be rejected before any model call.
    res = client.post(
        "/api/menus/scan",
        files={"image": ("evil.txt", b"not an image at all", "image/png")},
    )
    assert res.status_code == 415


def test_scan_rejects_oversized_upload(client, monkeypatch):
    from app.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "max_image_bytes", 8)
    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
        "0000000d4944415478da6360000002000001e221bc330000000049454e44ae426082"
    )
    res = client.post("/api/menus/scan", files={"image": ("big.png", png, "image/png")})
    assert res.status_code == 413


def test_scan_rejects_non_menu_image(client, monkeypatch):
    # A real image the guardrail flags as not-a-menu -> 422, no extraction.
    monkeypatch.setattr(
        menu_ai, "generate_json", lambda **kwargs: {"is_menu": False, "reason": "meme"}
    )
    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
        "0000000d4944415478da6360000002000001e221bc330000000049454e44ae426082"
    )
    res = client.post("/api/menus/scan", files={"image": ("meme.png", png, "image/png")})
    assert res.status_code == 422
    assert "menu" in res.json()["detail"].lower()


def test_scan_rejected_when_turnstile_fails(client, monkeypatch):
    # With Turnstile enabled and verification failing, the scan is blocked (403)
    # before any model work.
    monkeypatch.setattr(turnstile, "verify", lambda token, remote_ip: False)
    res = client.post("/api/menus/scan", files={"image": ("m.png", _PNG, "image/png")})
    assert res.status_code == 403

    res = client.post(
        "/api/menus/scan/stream", files={"image": ("m.png", _PNG, "image/png")}
    )
    assert res.status_code == 403


def test_scan_allowed_when_turnstile_disabled(client):
    # Default: Turnstile disabled (no secret) -> verify allows, scan proceeds.
    res = client.post("/api/menus/scan", files={"image": ("m.png", _PNG, "image/png")})
    assert res.status_code == 200


def test_scan_stream_emits_dishes_then_menu(client, monkeypatch):
    chunks = [
        '{"restaurant":{"name":"S","tagline":"","established":""},"sections":[{"title":"Mains","items":[',
        '{"name":"Ramen","price":"$1","recognized":true,"source_language":"Japanese",'
        '"english":"RAH-men","hindi":"रा","description":"x","category":"Mains"},',
        '{"name":"Udon","price":"$2","recognized":true,"source_language":"Japanese",'
        '"english":"OO-don","hindi":"उ","description":"y","category":"Mains"}',
        "]}]}",
    ]
    monkeypatch.setattr(menu_ai, "_extraction_deltas", lambda data_url: iter(chunks))

    res = client.post("/api/menus/scan/stream", files={"image": ("m.png", _PNG, "image/png")})
    assert res.status_code == 200

    events = [json.loads(line) for line in res.text.splitlines() if line.strip()]
    dishes = [e for e in events if e["type"] == "dish"]
    assert [e["name"] for e in dishes] == ["Ramen", "Udon"]

    menu_evt = next(e for e in events if e["type"] == "menu")
    assert menu_evt["menu"]["dishCount"] == 2
    assert menu_evt["menu"]["dishes"][0]["name"] == "Ramen"


def test_scan_stream_degrades_to_demo_on_error(client, monkeypatch):
    # If the streamed extraction blows up after the response has started, the
    # stream must still end with a valid menu event (demo fallback), not break.
    def boom(data_url):
        raise RuntimeError("stream exploded")

    monkeypatch.setattr(menu_ai, "_extraction_deltas", boom)
    res = client.post("/api/menus/scan/stream", files={"image": ("m.png", _PNG, "image/png")})
    assert res.status_code == 200
    events = [json.loads(line) for line in res.text.splitlines() if line.strip()]
    menu_evt = next(e for e in events if e["type"] == "menu")
    assert menu_evt["menu"]["dishCount"] == 7  # demo fallback


def test_scan_stream_rejects_non_menu(client, monkeypatch):
    # Guardrail (via generate_json) blocks -> 422 before any streaming starts.
    monkeypatch.setattr(
        menu_ai, "generate_json", lambda **kwargs: {"is_menu": False, "reason": "cat"}
    )
    res = client.post("/api/menus/scan/stream", files={"image": ("m.png", _PNG, "image/png")})
    assert res.status_code == 422


def test_pronunciation_curated(client):
    res = client.post("/api/pronunciations", json={"name": "Bruschetta"})
    assert res.status_code == 200
    body = res.json()
    assert body["english"] == "Broo-SKET-ta"
    assert body["hindi"]
    assert body["audioUrl"].startswith("data:audio/mpeg")


def test_pronunciation_empty_name_is_rejected(client):
    assert client.post("/api/pronunciations", json={"name": "   "}).status_code == 422


def test_dish_audio_success(client):
    # Scan first so the store has dishes, then fetch one dish's audio.
    menu = client.post("/api/menus/scan").json()
    dish_id = menu["dishes"][0]["id"]
    res = client.get(f"/api/dishes/{dish_id}/audio")
    assert res.status_code == 200
    assert res.json()["audioUrl"].startswith("data:audio/mpeg")


def test_dish_audio_unknown_id_returns_404(client):
    assert client.get("/api/dishes/99999999/audio").status_code == 404
