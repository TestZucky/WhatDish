"""Curated pronunciation dictionary.

Per the TDD's pronunciation priority order, verified entries are consulted
before any AI generation. Keyed by a normalized dish name.
"""
from __future__ import annotations


def normalize(name: str) -> str:
    return " ".join(name.strip().lower().split())


# name -> (source_language, english_phonetic, hindi_phonetic, description)
_CURATED: dict[str, tuple[str, str, str, str]] = {
    "bruschetta": (
        "Italian",
        "Broo-SKET-ta",
        "ब्रू-स्केट-टा",
        "Grilled bread rubbed with garlic, topped with fresh tomatoes and basil.",
    ),
    "bouillabaisse": (
        "French",
        "BOO-yuh-BAYS",
        "बू-या-बेज़",
        "Classic Provençal fish stew with saffron, herbs and rich seafood broth.",
    ),
    "gnocchi": (
        "Italian",
        "NYOK-ee",
        "न्योक-ई",
        "Soft Italian potato dumplings.",
    ),
    "gnocchi al pesto": (
        "Italian",
        "NYOK-ee al PES-toh",
        "न्योक-ई अल पेस्-तो",
        "Pillowy potato dumplings tossed in fresh basil pesto and pine nuts.",
    ),
    "coq au vin": (
        "French",
        "KOK oh VAN",
        "कोक ओ वाँ",
        "Slow-braised chicken in Burgundy wine with mushrooms and pearl onions.",
    ),
    "creme brulee": (
        "French",
        "krem broo-LAY",
        "क्रेम ब्रू-ले",
        "Silky vanilla custard beneath a caramelized sugar crust.",
    ),
    "crème brûlée": (
        "French",
        "krem broo-LAY",
        "क्रेम ब्रू-ले",
        "Silky vanilla custard beneath a caramelized sugar crust.",
    ),
    "paella": (
        "Spanish",
        "pah-AY-yah",
        "पा-एल-या",
        "Saffron-kissed Spanish rice with meat, seafood and vegetables.",
    ),
    "paella valenciana": (
        "Spanish",
        "pah-AY-yah val-en-THEE-ah-nah",
        "पा-एल-या वा-लेन-सी-आ-ना",
        "Saffron rice with rabbit, chicken and vegetables from Valencia.",
    ),
    "gyoza": (
        "Japanese",
        "gyoh-ZAH",
        "ग्यो-ज़ा",
        "Crispy pan-fried dumplings filled with pork and napa cabbage.",
    ),
    "croissant": (
        "French",
        "Kwah-SON",
        "क्वा-सों",
        "A buttery, flaky French pastry.",
    ),
    "charcuterie": (
        "French",
        "shar-KOO-tuh-ree",
        "शार-कू-टु-री",
        "An assortment of cured meats, often served with cheese.",
    ),
    "quinoa": (
        "Spanish",
        "KEEN-wah",
        "कीन-वा",
        "A protein-rich edible seed cooked like a grain.",
    ),
    "tiramisu": (
        "Italian",
        "tee-ruh-MEE-soo",
        "टी-रा-मी-सू",
        "Coffee-soaked Italian dessert layered with mascarpone.",
    ),
    "fettuccine": (
        "Italian",
        "fet-uh-CHEE-nee",
        "फ़ेट-उ-ची-नी",
        "Flat, thick ribbons of Italian pasta.",
    ),
}


def lookup(name: str) -> tuple[str, str, str, str] | None:
    """Return (language, english, hindi, description) for a known dish."""
    return _CURATED.get(normalize(name))
