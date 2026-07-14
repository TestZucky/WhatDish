# Pre-deploy manual test checklist

Run through this before shipping WhatDish to production. It assumes a real
`OPENAI_API_KEY` is configured unless a step says otherwise. Replace
`API` with your backend base URL and `WEB` with your frontend URL.

## 0. Production config (do these first)

- [ ] OpenAI and ElevenLabs keys have been rotated (the originals were exposed) and set via the platform secret manager, not committed.
- [ ] `APP_ENV=production` is set on the backend.
- [ ] `WHATDISH_CORS_ORIGINS` is set to the real frontend origin(s), not the placeholder.
- [ ] Frontend `VITE_API_BASE_URL` points at the real backend, and the frontend was rebuilt after setting it.
- [ ] No `.env*` files are in the Docker image (`.dockerignore` excludes them) and none are committed.
- [ ] Rate limiting is in place, or the risk of an unthrottled OpenAI-backed endpoint is explicitly accepted.
- [ ] Running a single instance and single worker (in-memory store/cache), or state has been moved to Redis if scaling.

## 1. Health and smoke

- [ ] `GET API/api/health` returns 200 with `env: "production"`, the expected `model`, and `aiEnabled: true`.
- [ ] `GET API/docs` returns 404 (docs disabled in prod).
- [ ] `GET API/openapi.json` returns 404.
- [ ] Backend startup log shows the env/model line and no "CORS is empty" warning.

## 2. Menu scan, happy path

- [ ] Upload or scan a clear real menu photo; a menu is returned.
- [ ] The processing screen shows a live dish counter ticking up (streaming works).
- [ ] Recognized dishes show both English and Hindi pronunciations.
- [ ] Prices and section titles match the photo.
- [ ] Tapping a dish opens the bottom sheet with its pronunciations.
- [ ] Pressing play produces audio; if the provider is down it still speaks via the browser.
- [ ] The first audio tap on a dish is fast (background pre-warm).
- [ ] Scan a large, multi-section menu; all sections appear and the app stays responsive.

## 3. Guardrail and upload validation

- [ ] Upload a non-menu image (a selfie or meme): rejected with a "not a menu" message (HTTP 422), and no full extraction ran.
- [ ] Upload a non-image file (for example a `.txt` renamed to `.png`): rejected (HTTP 415).
- [ ] Upload an oversized image (> 10 MB): rejected (HTTP 413).
- [ ] Guardrail rejections appear in the logs (abuse signal).

## 4. Graceful degradation

- [ ] With no `OPENAI_API_KEY` (in a staging run): scanning still returns the demo menu and the flow completes.
- [ ] With TTS unavailable: `audioUrl` is empty and playback falls back to browser speech plus the written pronunciation.
- [ ] A scan that fails mid-stream still ends with a valid menu (demo fallback), not a broken connection.

## 5. Other endpoints

- [ ] `POST API/api/pronunciations` with a curated dish (for example `{"name":"Bruschetta"}`) returns the expected pronunciation and an `audioUrl`.
- [ ] `POST API/api/pronunciations` with an empty or whitespace name returns 422.
- [ ] `GET API/api/dishes/{id}/audio` for a just-scanned dish returns an `audioUrl` data URL.
- [ ] `GET API/api/dishes/999999/audio` (unknown id) returns 404.

## 6. Frontend UX

- [ ] Landing page: "Scan Menu" and "Upload Photo" both work; there is no search box; trust badges render.
- [ ] Camera permission is requested; if denied, the upload path still works.
- [ ] Dish bottom sheet: no mic button, no Replay/Edit/Share buttons; play control, both pronunciations, and description (only when present) render.
- [ ] Menu shows only the image view (no image/list toggle).
- [ ] Error screen: "Take New Photo" and "Go to Home" work.
- [ ] The browser tab shows the WhatDish favicon.

## 7. Responsive layout

- [ ] Mobile width (about 390 px): the app fills the screen, no horizontal scroll.
- [ ] Desktop width, short viewport (for example 1440 x 800): the phone frame is centered and fully visible; the notch and rounded corners are not clipped.
- [ ] Tablet width: centered phone frame renders correctly.

## 8. Cross-browser and device

- [ ] iOS Safari: full flow works, including audio playback on a user tap.
- [ ] Android Chrome: full flow works.
- [ ] Desktop Chrome, Firefox, and Safari: full flow works.

## 9. Performance and stability

- [ ] A typical scan completes in an acceptable time.
- [ ] Repeated scans over a session do not grow memory without bound (LRU caches).
- [ ] A slow or hung upstream call times out rather than hanging indefinitely (OpenAI timeout).

## 10. Deploy and infrastructure

- [ ] The Docker image builds and runs; the container healthcheck passes.
- [ ] The container runs as a non-root user.
- [ ] CI is green on the release commit.
- [ ] Logs are visible in the production environment.
- [ ] HTTPS is terminated in front of the backend.
- [ ] A rollback path exists (pin and keep the previous image tag).

## 11. Security

- [ ] Secrets do not appear in logs, in the Docker image, or in the client bundle.
- [ ] A request from an unlisted origin is blocked by CORS.
- [ ] An image that contains text like "ignore your instructions" is still judged only as menu or not-a-menu (prompt-injection resistance).
