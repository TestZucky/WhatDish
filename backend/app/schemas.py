"""Response models — deliberately mirror the frontend's `src/types.ts`.

Field names are kept camelCase (`dishCount`, `audioUrl`) so the JSON the
backend emits is byte-compatible with what the React app already expects.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class Dish(BaseModel):
    id: int
    name: str
    english: str
    hindi: str
    cuisine: str
    description: str
    category: str
    price: str
    audioUrl: str | None = None


class MenuItem(BaseModel):
    name: str
    price: str
    dish: Dish | None = None


class MenuSection(BaseModel):
    title: str
    items: list[MenuItem]


class Restaurant(BaseModel):
    name: str
    tagline: str
    established: str | None = None


class RestaurantMenu(BaseModel):
    restaurant: Restaurant
    dishCount: int
    dishes: list[Dish]
    sections: list[MenuSection]


class PronunciationRequest(BaseModel):
    # Bound the length so a huge string can't amplify OpenAI token cost.
    name: str = Field(min_length=1, max_length=120)


class PronunciationResult(BaseModel):
    english: str
    hindi: str
    audioUrl: str | None = None


class AudioResult(BaseModel):
    audioUrl: str
