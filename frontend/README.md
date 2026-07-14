# WhatDish - Frontend

Mobile-first web app that scans a restaurant menu and shows how each dish is
pronounced (English and Hindi), with cuisine, price, and playable audio.

Built with React 18, TypeScript, Vite, Tailwind CSS v4, and Motion.

## Getting started

From the repository root you can run `make frontend`. Or directly:

```bash
npm install
npm run dev         # http://localhost:5173
```

`npm run dev` uses `.env.development`, which already points at the local backend
(`VITE_API_BASE_URL=http://localhost:8000`).

Other scripts:

```bash
npm run build         # production build to dist/ (uses .env.production)
npm run preview       # preview the production build
npm run typecheck     # tsc --noEmit
npm run generate-icons  # regenerate the favicon and app icons from the SVG sources
```

## Backend integration

`src/lib/api.ts` is the single integration point. When `VITE_API_BASE_URL` is
empty it falls back to built-in mock data (`src/data/menu.ts`), so the whole UI
is usable with no backend running. To use mock data during development, set the
variable to empty in `.env.local`.

Config is selected by Vite mode: `.env.development` for `npm run dev`,
`.env.production` for `npm run build`. Both are committed (no secrets). Put local
overrides in `.env.local`, which is gitignored.

Functions the client calls:

| Function | Method and path | Returns |
| --- | --- | --- |
| `scanMenu(image, onProgress?)` | `POST /api/menus/scan/stream` | `RestaurantMenu` |
| `regeneratePronunciation(name)` | `POST /api/pronunciations` | `PronunciationResult` |
| `getPronunciationAudio(id)` | `GET /api/dishes/:id/audio` | `{ audioUrl }` |

`scanMenu` consumes the backend's NDJSON stream: `onProgress` fires as each dish
name arrives (driving the live counter on the processing screen), and the promise
resolves with the full menu once the stream completes. Shared response types live
in `src/types.ts`, so the backend mirrors them.

## Screens and flow

Landing, then Camera (or Upload) captures a photo, then Processing streams the
scan, then Menu shows the result. A bottom sheet opens on a dish to show its
pronunciations and play audio. The Error screen handles a failed or non-menu scan.

The app renders full-screen on mobile and inside a centered phone frame on larger
viewports (see `App.tsx`), so it stays usable on both.

## Structure

```
src/
  App.tsx                 # phone frame, responsive layout, screen router, bottom sheet
  main.tsx                # entry
  types.ts                # shared domain types (mirror these in the backend)
  context/AppContext.tsx  # app state and actions (navigation, dish sheet)
  lib/
    api.ts                # typed API client (mock fallback, NDJSON stream)
    constants.ts          # UI constants (cuisine colors, processing steps, waveform)
  data/menu.ts            # mock menu and dishes
  components/             # StatusBar, CuisineBadge, PulsingVolume, WaveformBars, DishSheet
  screens/                # Landing, Camera, Processing, Menu, Error (Edit exists but is unused)
  styles/                 # Tailwind entry, theme tokens, keyframe animations
```
