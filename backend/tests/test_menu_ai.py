import pytest

from app.services import menu_ai, pronunciation
from app.services.menu_ai import NotAMenuError
from app.services.pronunciation import Pronunciation

# Lean structure returned by the vision pass (no pronunciation fields).
STRUCTURE = {
    "restaurant": {"name": "Testaurant", "tagline": "Yum", "established": ""},
    "sections": [
        {
            "title": "Mains",
            "items": [
                {"name": "Ramen", "price": "$10", "recognized": True, "category": "Mains"},
                {"name": "Water", "price": "$0", "recognized": False, "category": "Mains"},
            ],
        }
    ],
}

ENRICHED = {"Ramen": Pronunciation("Japanese", "RAH-men", "रा-मेन", "Noodle soup.")}


def test_scan_without_image_returns_demo_menu():
    menu = menu_ai.scan_menu(None, "image/jpeg")
    assert menu.dishCount == len(menu.dishes) == 7
    assert menu.restaurant.name
    null_items = [i for s in menu.sections for i in s.items if i.dish is None]
    assert null_items


def test_scan_falls_back_to_demo_when_model_returns_nothing(monkeypatch):
    monkeypatch.setattr(menu_ai, "generate_json", lambda **kwargs: None)
    menu = menu_ai.scan_menu(b"fake-image-bytes", "image/png")
    assert menu.dishCount == 7  # demo


def test_scan_builds_menu_from_structure(monkeypatch):
    # generate_json serves both the guardrail (no is_menu -> passes) and the
    # structure pass; enrichment is stubbed to avoid any real LLM call.
    monkeypatch.setattr(menu_ai, "generate_json", lambda **kwargs: STRUCTURE)
    monkeypatch.setattr(pronunciation, "enrich_many", lambda names: ENRICHED)
    menu = menu_ai.scan_menu(b"fake-image-bytes", "image/png")

    assert menu.restaurant.name == "Testaurant"
    assert menu.restaurant.established is None  # empty string -> None
    assert menu.dishCount == 1

    dish = menu.dishes[0]
    assert dish.name == "Ramen"
    assert dish.english == "RAH-men"
    assert dish.cuisine == "Japanese"
    assert isinstance(dish.id, int)

    items = menu.sections[0].items
    assert len(items) == 2
    assert items[0].dish is not None
    assert items[1].dish is None


def test_build_menu_with_no_recognized_dishes_falls_back_to_demo():
    empty = {
        "restaurant": {"name": "X", "tagline": "", "established": ""},
        "sections": [
            {
                "title": "Drinks",
                "items": [{"name": "Water", "price": "$0", "recognized": False, "category": "Drinks"}],
            }
        ],
    }
    menu = menu_ai._build_menu(empty)
    assert menu.dishCount == 7  # demo fallback


def test_enrich_many_uses_dictionary_and_batches_unknowns(monkeypatch):
    # Known dish resolves from the curated dictionary (no LLM); the unknown one
    # comes from a batched AI call.
    def fake_batch(**kwargs):
        return {
            "items": [
                {
                    "name": "Zorptail",
                    "source_language": "Elvish",
                    "english": "ZORP-tail",
                    "hindi": "ज़ोर्प-टेल",
                    "description": "A mythical dish.",
                }
            ]
        }

    monkeypatch.setattr(pronunciation, "generate_json", fake_batch)
    result = pronunciation.enrich_many(["Bruschetta", "Zorptail"])
    assert result["Bruschetta"].english == "Broo-SKET-ta"  # dictionary
    assert result["Zorptail"].english == "ZORP-tail"  # AI batch


def test_enrich_many_falls_back_to_heuristic_when_ai_unavailable(monkeypatch):
    monkeypatch.setattr(pronunciation, "generate_json", lambda **kwargs: None)
    result = pronunciation.enrich_many(["Nonsensedish"])
    assert "Nonsensedish" in result
    assert "say it as written" in result["Nonsensedish"].english


def test_guardrail_blocks_non_menu_image(monkeypatch):
    monkeypatch.setattr(
        menu_ai, "generate_json", lambda **kwargs: {"is_menu": False, "reason": "a cat"}
    )
    with pytest.raises(NotAMenuError):
        menu_ai.scan_menu(b"fake-image-bytes", "image/png")


def test_guardrail_allows_menu_image(monkeypatch):
    calls = {"n": 0}

    def fake(**kwargs):
        calls["n"] += 1
        return {"is_menu": True, "reason": "menu"} if calls["n"] == 1 else STRUCTURE

    monkeypatch.setattr(menu_ai, "generate_json", fake)
    monkeypatch.setattr(pronunciation, "enrich_many", lambda names: ENRICHED)
    menu = menu_ai.scan_menu(b"fake-image-bytes", "image/png")
    assert menu.restaurant.name == "Testaurant"


def test_guardrail_fails_open_when_classifier_unavailable(monkeypatch):
    monkeypatch.setattr(menu_ai, "generate_json", lambda **kwargs: None)
    menu = menu_ai.scan_menu(b"fake-image-bytes", "image/png")
    assert menu.dishCount == 7  # demo fallback, no NotAMenuError


def test_recognized_dishes_are_registered_for_audio(monkeypatch):
    monkeypatch.setattr(menu_ai, "generate_json", lambda **kwargs: STRUCTURE)
    monkeypatch.setattr(pronunciation, "enrich_many", lambda names: ENRICHED)
    menu = menu_ai.scan_menu(b"img", "image/png")
    record = menu_ai.store.get(menu.dishes[0].id)
    assert record is not None
    assert record.tts_text == "Ramen"
