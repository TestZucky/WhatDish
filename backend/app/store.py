"""In-memory store of scanned dishes.

The MVP has no database. We keep just enough per-dish state (keyed by the
numeric id the frontend uses) to satisfy `GET /api/dishes/{id}/audio` after a
scan. Ids increment for the lifetime of the process; scanning again keeps
appending. This is intentionally ephemeral, matching the TDD's
"images/results deleted automatically" privacy stance.
"""
from __future__ import annotations

import threading
from collections import OrderedDict
from dataclasses import dataclass

# Cap the store so a long-running process can't grow without bound. Old dishes
# are evicted LRU-style; their audio endpoint then 404s, which the frontend
# already tolerates. ~10k dishes is far more than any single session needs.
_MAX_ENTRIES = 10_000


@dataclass
class DishRecord:
    id: int
    name: str
    tts_text: str
    cuisine: str


class DishStore:
    def __init__(self, max_entries: int = _MAX_ENTRIES) -> None:
        self._lock = threading.Lock()
        self._next_id = 1
        self._by_id: OrderedDict[int, DishRecord] = OrderedDict()
        self._max_entries = max_entries

    def next_id(self) -> int:
        with self._lock:
            dish_id = self._next_id
            self._next_id += 1
            return dish_id

    def put(self, record: DishRecord) -> None:
        with self._lock:
            self._by_id[record.id] = record
            self._by_id.move_to_end(record.id)
            while len(self._by_id) > self._max_entries:
                self._by_id.popitem(last=False)  # evict least-recently-used

    def get(self, dish_id: int) -> DishRecord | None:
        with self._lock:
            record = self._by_id.get(dish_id)
            if record is not None:
                self._by_id.move_to_end(dish_id)  # mark recently used
            return record


store = DishStore()
