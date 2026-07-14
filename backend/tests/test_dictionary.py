from app.services import dictionary


def test_normalize_trims_lowercases_and_collapses_spaces():
    assert dictionary.normalize("  Coq   au  VIN ") == "coq au vin"


def test_lookup_known_dish_returns_all_fields():
    result = dictionary.lookup("Bruschetta")
    assert result is not None
    language, english, hindi, description = result
    assert language == "Italian"
    assert english == "Broo-SKET-ta"
    assert hindi  # non-empty Devanagari
    assert description


def test_lookup_is_case_and_space_insensitive():
    assert dictionary.lookup("  bruschetta  ") == dictionary.lookup("Bruschetta")


def test_lookup_unknown_dish_returns_none():
    assert dictionary.lookup("Definitely Not A Dish") is None
