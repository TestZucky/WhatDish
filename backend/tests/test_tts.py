from app.services import tts


def _clear_cache():
    tts._cache.clear()


def test_empty_text_returns_empty_string():
    assert tts.synthesize("   ") == ""


def test_elevenlabs_preferred_over_gtts(monkeypatch):
    _clear_cache()
    calls = {"gtts": 0}
    monkeypatch.setattr(tts, "_elevenlabs", lambda text: "data:audio/mpeg;base64,ELEVEN")

    def gtts(text):
        calls["gtts"] += 1
        return "data:audio/mpeg;base64,GTTS"

    monkeypatch.setattr(tts, "_gtts", gtts)

    assert tts.synthesize("Ramen") == "data:audio/mpeg;base64,ELEVEN"
    assert calls["gtts"] == 0  # gTTS not consulted when ElevenLabs succeeds


def test_falls_back_to_gtts_when_elevenlabs_unavailable(monkeypatch):
    _clear_cache()
    monkeypatch.setattr(tts, "_elevenlabs", lambda text: "")
    monkeypatch.setattr(tts, "_gtts", lambda text: "data:audio/mpeg;base64,GTTS")
    assert tts.synthesize("Ramen") == "data:audio/mpeg;base64,GTTS"


def test_result_is_cached(monkeypatch):
    _clear_cache()
    calls = {"n": 0}

    def gtts(text):
        calls["n"] += 1
        return "data:audio/mpeg;base64,CACHED"

    monkeypatch.setattr(tts, "_elevenlabs", lambda text: "")
    monkeypatch.setattr(tts, "_gtts", gtts)

    tts.synthesize("Gyoza")
    tts.synthesize("Gyoza")
    assert calls["n"] == 1  # second call served from cache


def test_cache_is_bounded(monkeypatch):
    _clear_cache()
    monkeypatch.setattr(tts, "_elevenlabs", lambda text: "")
    monkeypatch.setattr(tts, "_gtts", lambda text: f"data:audio/mpeg;base64,{text}")
    monkeypatch.setattr(tts, "_CACHE_MAX", 3)

    for i in range(5):
        tts.synthesize(f"dish-{i}")
    assert len(tts._cache) == 3  # bounded, not growing to 5
