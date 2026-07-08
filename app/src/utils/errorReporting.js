// Fire-and-forget crash reporting to the log-error edge function, which
// records the crash in Supabase and pings a Discord webhook. Never throws —
// a broken error reporter shouldn't itself become a visible failure on top
// of whatever already went wrong.
export function reportError({ message, stack, componentStack, kind }) {
  try {
    let accessToken = null;
    try {
      const host = new URL(import.meta.env.VITE_SUPABASE_URL).hostname;
      const raw = localStorage.getItem(`sb-${host.split('.')[0]}-auth-token`);
      accessToken = raw ? JSON.parse(raw)?.access_token ?? null : null;
    } catch {
      // No token available — report anonymously without auth.
    }

    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        message: message ?? 'Unknown error',
        stack: stack ?? null,
        componentStack: componentStack ?? null,
        url: window.location.href,
        kind: kind ?? 'unknown',
      }),
    }).catch(() => {});
  } catch {
    // Reporting must never throw on top of the original error.
  }
}
