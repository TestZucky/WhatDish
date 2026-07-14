from app.store import DishRecord, DishStore


def test_next_id_increments():
    store = DishStore()
    assert store.next_id() == 1
    assert store.next_id() == 2
    assert store.next_id() == 3


def test_put_and_get_roundtrip():
    store = DishStore()
    dish_id = store.next_id()
    record = DishRecord(id=dish_id, name="Gyoza", tts_text="Gyoza", cuisine="Japanese")
    store.put(record)
    fetched = store.get(dish_id)
    assert fetched is not None
    assert fetched.name == "Gyoza"
    assert fetched.cuisine == "Japanese"


def test_get_unknown_id_returns_none():
    store = DishStore()
    assert store.get(999) is None


def test_store_is_bounded_and_evicts_lru():
    store = DishStore(max_entries=3)
    ids = []
    for _ in range(5):
        dish_id = store.next_id()
        store.put(DishRecord(id=dish_id, name="d", tts_text="d", cuisine="x"))
        ids.append(dish_id)
    # Only the 3 most recent survive; the two oldest were evicted.
    assert [i for i in ids if store.get(i)] == ids[-3:]
    assert store.get(ids[0]) is None


def test_get_marks_recently_used():
    store = DishStore(max_entries=2)
    a, b, c = store.next_id(), store.next_id(), store.next_id()
    store.put(DishRecord(id=a, name="a", tts_text="a", cuisine="x"))
    store.put(DishRecord(id=b, name="b", tts_text="b", cuisine="x"))
    store.get(a)  # touch 'a' so 'b' becomes least-recently-used
    store.put(DishRecord(id=c, name="c", tts_text="c", cuisine="x"))
    assert store.get(a) is not None  # kept — recently used
    assert store.get(b) is None  # evicted
    assert store.get(c) is not None
