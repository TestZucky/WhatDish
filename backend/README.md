# WhatDish - Backend

FastAPI service that powers the WhatDish frontend: scan a menu photo and get every
dish back with an English and Hindi pronunciation, cuisine, price, and audio.

Built with FastAPI and Pydantic, using the OpenAI API for menu reading and
pronunciation, and gTTS or ElevenLabs for audio. The vision model is
`gpt-4o-mini` by default, configurable to `gpt-4o` for higher OCR accuracy.

## Endpoints

These match exactly what the frontend's `src/lib/api.ts` calls:

| Method and path | Body | Returns |
| --- | --- | --- |
| `POST /api/menus/scan` | multipart, field `image` | `RestaurantMenu` (JSON) |
| `POST /api/menus/scan/stream` | multipart, field `image` | NDJSON: `dish` events, then a final `menu` event |
| `POST /api/pronunciations` | `{ "name": "..." }` | `PronunciationResult` |
| `GET /api/dishes/:id/audio` | none | `{ "audioUrl": "..." }` |
| `GET /api/health` | none | status, env, model, aiEnabled |

Response shapes mirror the frontend's `src/types.ts` (camelCase field names).
Non-image and oversized uploads are rejected before any model call (415 / 413);
a real image that is not a menu is rejected by the guardrail (422).

## Run it

From the repository root:

```bash
make backend     # http://localhost:8000, development, reload
```

Or manually:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env.local    # optional; add your OPENAI_API_KEY here
APP_ENV=development uvicorn app.main:app --reload --port 8000
```

Point the frontend at it with `VITE_API_BASE_URL=http://localhost:8000` (this is
already the default in `frontend/.env.development`).

## Works with zero configuration

Every AI step degrades gracefully, so the whole flow works before you add a key:

- No `OPENAI_API_KEY`: `scan` returns a demo menu; `pronunciations` uses the
  curated dictionary, then a say-it-as-written heuristic.
- gTTS or ElevenLabs unavailable: `audioUrl` comes back empty and the frontend
  falls back to browser speech synthesis plus the written pronunciation.

Add a key to `backend/.env.local` to turn on real menu scanning and AI
pronunciation.

## How a scan works

The scan runs in two phases so the menu appears quickly, with cheap checks
gating the expensive vision call:

1. Validate the upload by magic bytes and size. Non-images and oversized files
   are rejected (415 / 413) before any model call.
2. Guardrail. A cheap model classifies a small downscaled thumbnail as menu or
   not. A confident "not a menu" is rejected (422). It fails open: if the
   classifier is unavailable, the request proceeds.
3. Structure extraction. A lean vision pass reads only the menu structure
   (restaurant, sections, item names, prices, categories). This keeps the output
   small and fast, and it streams so the client can show a live dish ticker.
4. Enrichment. Pronunciations are resolved dictionary-first (curated entries are
   instant and cost no tokens); unknown dishes are enriched via concurrent
   batched, text-only calls, with a heuristic fallback.
5. Assembly. Recognized dishes are registered in the in-memory store for the
   audio endpoint, and their audio is pre-warmed in the background so the first
   playback is instant.

Pronunciation resolution order is curated dictionary, then AI, then heuristic.
Audio is synthesised on demand and returned as a self-contained `data:` URL.

The streaming endpoint (`/api/menus/scan/stream`) emits one `dish` event per
recognized name and then a final `menu` event with the complete `RestaurantMenu`.
It always ends with a `menu` event: any failure degrades to the demo menu rather
than breaking a response that has already started.

## Configuration

The active environment comes from `APP_ENV` (`development` by default, or
`production`). Config is layered: real environment variables, then
`.env.<env>.local`, then `.env.local`, then the committed `.env.<env>`. Put
secrets in `.env.local`. See `.env.example` for every variable. Common ones:

| Variable | Purpose | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | enables real scanning and pronunciation | empty (demo mode) |
| `WHATDISH_MODEL` | vision model for extraction | `gpt-4o-mini` |
| `WHATDISH_GUARDRAIL_MODEL` | cheap model for the menu guardrail | `gpt-4o-mini` |
| `WHATDISH_ENRICH_MODEL` | model for pronunciation enrichment | `gpt-4o-mini` |
| `WHATDISH_OPENAI_TIMEOUT` | per-request OpenAI timeout, seconds | `60` |
| `WHATDISH_MAX_IMAGE_BYTES` | reject uploads larger than this | `10485760` (10 MB) |
| `WHATDISH_PREWARM_AUDIO` | pre-synthesize audio after a scan | `true` |
| `WHATDISH_CORS_ORIGINS` | allowed browser origins | localhost in dev, must be set in prod |
| `ELEVENLABS_API_KEY` | use ElevenLabs instead of gTTS | empty |

## Reliability

- Graceful demo fallback whenever a model is unavailable or a scan fails.
- The dish store and the TTS cache are in-memory and LRU-bounded, so a
  long-running process does not grow without limit.
- An explicit OpenAI timeout stops a hung upstream call from tying up a worker.
- A global exception handler logs unexpected errors and returns a consistent
  body. Logging level follows the environment (DEBUG in dev, INFO in prod).

Note: the store and cache are per-process. This is safe on a single instance;
running multiple workers or instances requires moving that state to an external
store such as Redis.

## Docker

The backend ships as a container image. Secrets and config are provided at
runtime, never baked into the image.

```bash
docker build -t whatdish-api backend
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=sk-... \
  -e WHATDISH_CORS_ORIGINS=https://your-frontend.example.com \
  whatdish-api
```

## Testing

```bash
make test        # from the repository root
```

The suite is fully offline: the LLM and TTS providers are stubbed, so it runs
deterministically without keys or network access.

## Layout

```
backend/
  Dockerfile               # production image
  app/
    main.py                # FastAPI app, CORS, lifespan, global error handler
    config.py              # environment-layered settings
    schemas.py             # response models mirroring the frontend types
    store.py               # ephemeral in-memory dish store (LRU-bounded)
    routers/               # menus (scan + stream), pronunciations, dishes
    services/
      menu_ai.py           # validate, guardrail, structure extraction, assembly
      pronunciation.py     # dictionary-first + parallel batched enrichment
      dictionary.py        # curated verified pronunciations
      llm.py               # OpenAI client, structured output and streaming
      tts.py               # gTTS or ElevenLabs -> data: URL (LRU cache)
  tests/                   # offline pytest suite
```
