import type { RestaurantMenu } from '../types';
import { MOCK_MENU } from '../data/menu';
import { getTurnstileToken } from './turnstile';

/**
 * WhatDish API client.
 *
 * When `VITE_API_BASE_URL` is set the client talks to the real backend.
 * When it is empty (the default), every call resolves against built-in mock
 * data so the whole UI is usable with no backend running. Swapping to the real
 * backend is purely a matter of setting the env var — no component changes.
 *
 * Expected backend endpoints:
 *   POST /api/menus/scan         multipart "image" -> RestaurantMenu
 *   POST /api/menus/scan/stream  multipart "image" -> NDJSON (dish… then menu)
 *   POST /api/pronunciations     { name } -> PronunciationResult
 *   GET  /api/dishes/:id/audio   -> { audioUrl }
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
// Proxy mode: call a same-origin `/api` (Vite proxies it to the backend) instead
// of mock data. Used by `make tunnel` so one HTTPS URL serves app + API.
const USE_PROXY = import.meta.env.VITE_API_PROXY === 'true';
export const USE_MOCK = BASE_URL === '' && !USE_PROXY;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      // FastAPI errors use `detail`; keep `message`/`error` for other shapes.
      message = body?.message ?? body?.error ?? body?.detail ?? message;
    } catch {
      /* response was not JSON */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export interface PronunciationResult {
  english: string;
  hindi: string;
  audioUrl?: string;
}

/** Progress tick emitted as dishes stream in during a scan. */
export interface ScanProgress {
  count: number;
  name: string;
}

/**
 * Scan (or upload) a menu image and return the recognized menu.
 *
 * Streams from the backend so `onProgress` fires as each dish name arrives; the
 * promise resolves with the full menu once the stream completes. `image` is
 * optional so mock/demo flows run without a real photo.
 */
export async function scanMenu(
  image?: Blob,
  onProgress?: (p: ScanProgress) => void,
): Promise<RestaurantMenu> {
  if (USE_MOCK) {
    for (let i = 0; i < MOCK_MENU.dishes.length; i++) {
      await delay(160);
      onProgress?.({ count: i + 1, name: MOCK_MENU.dishes[i].name });
    }
    return MOCK_MENU;
  }

  const form = new FormData();
  if (image) form.append('image', image);
  // Attach a Turnstile token when Turnstile is configured (no-op otherwise).
  const turnstileToken = await getTurnstileToken();
  if (turnstileToken) form.append('cf-turnstile-response', turnstileToken);

  const res = await fetch(`${BASE_URL}/api/menus/scan/stream`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok || !res.body) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.message ?? body?.error ?? body?.detail ?? message;
    } catch {
      /* response was not JSON */
    }
    throw new ApiError(res.status, message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let menu: RestaurantMenu | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const evt = JSON.parse(line);
      if (evt.type === 'dish') {
        onProgress?.({ count: evt.count, name: evt.name });
      } else if (evt.type === 'menu') {
        menu = evt.menu as RestaurantMenu;
      }
    }
  }

  if (!menu) throw new ApiError(500, 'Scan returned no menu');
  return menu;
}

/** Regenerate pronunciations for a (possibly OCR-corrected) dish name. */
export async function regeneratePronunciation(
  name: string,
): Promise<PronunciationResult> {
  if (USE_MOCK) {
    await delay(1400);
    const match = MOCK_MENU.dishes.find(
      (d) => d.name.toLowerCase() === name.trim().toLowerCase(),
    );
    return {
      english: match?.english ?? `${name} (say it as written)`,
      hindi: match?.hindi ?? name,
    };
  }
  return request<PronunciationResult>('/api/pronunciations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

/** Resolve a playable audio URL for a dish's pronunciation. */
export async function getPronunciationAudio(dishId: number): Promise<string> {
  if (USE_MOCK) {
    await delay(200);
    return '';
  }
  const { audioUrl } = await request<{ audioUrl: string }>(
    `/api/dishes/${dishId}/audio`,
  );
  return audioUrl;
}
