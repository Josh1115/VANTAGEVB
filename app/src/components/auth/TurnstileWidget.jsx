import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

// Supabase auth's CAPTCHA protection, once enabled server-side, applies to
// every public auth call (sign up, sign in, password reset) — not just
// signup. This flag lets each call site know whether it must attach a token.
export const CAPTCHA_REQUIRED = !!SITE_KEY;

let scriptPromise = null;
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// Renders a Cloudflare Turnstile challenge and reports the verification token
// via onToken. Renders nothing (and never blocks submission) when
// VITE_TURNSTILE_SITE_KEY isn't set, so auth flows keep working normally
// until CAPTCHA is actually configured on both ends.
export const TurnstileWidget = forwardRef(function TurnstileWidget({ onToken }, ref) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current != null) window.turnstile?.reset(widgetIdRef.current);
    },
  }));

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadTurnstileScript().then(() => {
      if (cancelled || !containerRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: onToken,
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      });
    });
    return () => {
      cancelled = true;
      if (widgetIdRef.current != null) window.turnstile?.remove(widgetIdRef.current);
    };
  }, [onToken]);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="flex justify-center" />;
});
