# Deploy: GCP Cloud Run (backend) + Cloudflare Pages (frontend)

Backend on Google Cloud Run (auto-scales, ~$0 at demo scale, fast cold starts)
and frontend on Cloudflare Pages (static, free). No custom domain needed.

At ~100 scans/day you stay inside Cloud Run's free tier (~$0). GCP has no hard
spend cap, so set a small budget alert (step 1) as a tripwire. Your OpenAI cost
is separate — on credits, $50-capped.

Prerequisites: a GCP account with billing enabled, `gcloud` CLI
(`brew install --cask google-cloud-sdk`), `npx`, and a Cloudflare account.

Chosen names (change consistently if taken):
- Frontend project: `whatdish`  ->  `https://whatdish.pages.dev`
- Backend service:  `whatdish-api` (Cloud Run assigns the URL on first deploy)

## 1. Backend -> Cloud Run

```bash
# One-time setup
gcloud auth login
gcloud config set project YOUR_PROJECT_ID          # create one at console.cloud.google.com
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# Deploy (builds backend/Dockerfile via Cloud Build; single instance; public).
# CORS is set to the predictable Pages URL now so no redeploy is needed later.
gcloud run deploy whatdish-api \
  --source backend \
  --region asia-south1 \
  --allow-unauthenticated \
  --max-instances 1 \
  --memory 512Mi \
  --set-env-vars "APP_ENV=production,WHATDISH_CORS_ORIGINS=https://whatdish.pages.dev,OPENAI_API_KEY=sk-YOUR-KEY"
```

- `--max-instances 1`: keep a single instance — the dish/audio store is in-memory.
- The first run may prompt to create an Artifact Registry repo; say yes.
- Grab `OPENAI_API_KEY` from `backend/.env.local`. (Optional: append
  `,ELEVENLABS_API_KEY=...`; omit to use free gTTS.)

It prints a **Service URL** like `https://whatdish-api-xxxxxxxx.asia-south1.run.app`.
Copy it — the frontend needs it. Verify:

```bash
curl https://whatdish-api-XXXXXXXX.asia-south1.run.app/api/health
# {"status":"ok","env":"production","aiEnabled":true,"model":"gpt-4o-mini"}
```

**Set a budget alert:** GCP Console -> Billing -> Budgets & alerts -> create a
$5 budget with alerts at 50/90/100%. (A tripwire; you won't hit it at demo scale.)

## 2. Frontend -> Cloudflare Pages

```bash
npx wrangler login
cd frontend

# Build pointing at the Cloud Run URL from step 1:
VITE_API_BASE_URL=https://whatdish-api-XXXXXXXX.asia-south1.run.app npm run build

npx wrangler pages deploy dist --project-name=whatdish
```

Live at `https://whatdish.pages.dev`. CORS already allows it (set in step 1).

## 3. Verify end to end

- Open `https://whatdish.pages.dev` on your phone (HTTPS -> camera works).
- Scan or upload a menu; confirm dishes + pronunciations + audio.

## Redeploying

- Backend: re-run the `gcloud run deploy ...` command from step 1.
- Frontend: rebuild with the same `VITE_API_BASE_URL` and re-run
  `npx wrangler pages deploy dist --project-name=whatdish`.

## Notes

- **Single instance only** for now (in-memory store). To scale to multiple
  instances later, move that state to a DB/Redis, then raise `--max-instances`.
- **Turnstile** is off until you set `VITE_TURNSTILE_SITE_KEY` (frontend build)
  and `TURNSTILE_SECRET_KEY` (a Cloud Run env var). See PRE_DEPLOY_CHECKLIST.md.
- **Cost:** Cloud Run ~$0 at demo scale (free tier); Pages free; OpenAI on
  credits, $50-capped.

## Card-free alternative (Render)

If you'd rather not put a card on GCP, `render.yaml` deploys the same image on
Render's free tier (no card): Render dashboard -> New -> Blueprint -> pick this
repo, enter `OPENAI_API_KEY`. Tradeoff: it sleeps after ~15 min idle, so the
first scan after a pause takes ~30-60s to wake.
