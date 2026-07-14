/**
 * Cloudflare Turnstile token helper.
 *
 * Disabled unless VITE_TURNSTILE_SITE_KEY is set, so mock/dev/E2E runs work
 * without it. When enabled, `getTurnstileToken()` produces a fresh single-use
 * token (invisible widget, no UI) to send with the scan request.
 */
interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
export const TURNSTILE_ENABLED = Boolean(SITE_KEY);

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Resolve a fresh Turnstile token, or `undefined` when Turnstile is disabled.
 * Renders a throwaway invisible widget and cleans it up once it has a token.
 */
export async function getTurnstileToken(): Promise<string | undefined> {
  if (!SITE_KEY) return undefined;
  await loadScript();
  const turnstile = window.turnstile;
  if (!turnstile) return undefined;

  return new Promise<string>((resolve, reject) => {
    const container = document.createElement('div');
    container.style.cssText =
      'position:fixed;bottom:0;left:0;width:0;height:0;opacity:0;pointer-events:none;';
    document.body.appendChild(container);

    let widgetId = '';
    const cleanup = () => {
      try {
        if (widgetId) turnstile.remove(widgetId);
      } catch {
        /* ignore */
      }
      container.remove();
    };

    widgetId = turnstile.render(container, {
      sitekey: SITE_KEY,
      size: 'invisible',
      callback: (token: string) => {
        resolve(token);
        cleanup();
      },
      'error-callback': () => {
        reject(new Error('Turnstile challenge failed'));
        cleanup();
      },
      'timeout-callback': () => {
        reject(new Error('Turnstile timed out'));
        cleanup();
      },
    });
    // An invisible widget runs automatically on render; the callback delivers
    // the token. (No execute() — that would double-fire.)
  });
}
