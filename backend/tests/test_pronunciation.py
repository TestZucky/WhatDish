from app.services import pronunciation


def test_curated_dish_uses_dictionary_without_calling_the_model(monkeypatch):
    # If the curated path is taken, the LLM must never be invoked.
    def boom(**kwargs):
        raise AssertionError("generate_json should not be called for curated dishes")

    monkeypatch.setattr(pronunciation, "generate_json", boom)

    result = pronunciation.enrich("Bruschetta")
    assert result.source_language == "Italian"
    assert result.english == "Broo-SKET-ta"
    assert result.hindi


def test_ai_path_used_when_not_in_dictionary(monkeypatch):
    monkeypatch.setattr(
        pronunciation,
        "generate_json",
        lambda **kwargs: {
            "source_language": "Thai",
            "english": "TOM yum",
            "hindi": "टॉम-यम",
            "description": "Spicy Thai soup.",
        },
    )
    result = pronunciation.enrich("Tom Yum")
    assert result.source_language == "Thai"
    assert result.english == "TOM yum"
    assert result.description == "Spicy Thai soup."


def test_heuristic_fallback_when_model_unavailable(monkeypatch):
    monkeypatch.setattr(pronunciation, "generate_json", lambda **kwargs: None)
    result = pronunciation.enrich("Zzyzx")
    assert result.source_language == "Unknown"
    assert "say it as written" in result.english
    assert result.hindi == "Zzyzx"
