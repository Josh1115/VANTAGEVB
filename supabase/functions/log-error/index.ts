import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://vantagevb.net', 'https://www.vantagevb.net'];

// ── Rate limiting ─────────────────────────────────────────────────────────────
// This endpoint is necessarily unauthenticated (crashes happen on logged-out
// screens), which makes it spammable: garbage rows in error_logs and Discord
// pings that bury real alerts. In-memory counters don't work here — the edge
// runtime serves requests from fresh isolates, so state never accumulates.
// Instead, count recent error_logs rows in the DB (shared across all isolates)
// before accepting a report. Crashes are rare, so two head-count queries per
// report cost nothing; under a flood the counts trip and we skip the insert
// and the Discord ping entirely.
const WINDOW_MS = 60_000;
const MAX_PER_IP = 5;      // one client crash-looping
const MAX_GLOBAL = 30;     // everything, incl. spoofed/distributed IPs

async function rateLimited(supabase: ReturnType<typeof createClient>, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count: globalCount, error: gErr } = await supabase
    .from('error_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since);
  if (!gErr && (globalCount ?? 0) >= MAX_GLOBAL) return true;

  const { count: ipCount, error: iErr } = await supabase
    .from('error_logs')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', since);
  if (!iErr && (ipCount ?? 0) >= MAX_PER_IP) return true;

  return false;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Keeps a single crash report from blowing up the row (React stack traces in
// particular can run to tens of KB) or a Discord message (2000 char limit).
function truncate(s: unknown, max: number): string | null {
  if (typeof s !== 'string' || !s) return null;
  return s.length > max ? s.slice(0, max) + '…' : s;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    if (await rateLimited(supabase, ip)) {
      return new Response(JSON.stringify({ received: false, rate_limited: true }), {
        status: 429,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
  } catch { /* limit check is best-effort — never block a real crash report on it */ }

  // Best-effort telemetry: whatever happens, don't hand the caller (an app
  // that's already mid-crash) a failed fetch to worry about.
  try {
    const body = await req.json();
    const message         = truncate(body.message, 2000) ?? 'Unknown error';
    const stack            = truncate(body.stack, 8000);
    const componentStack   = truncate(body.componentStack, 4000);
    const pageUrl          = truncate(body.url, 500);
    const userAgent        = truncate(req.headers.get('user-agent'), 500);
    const kind              = truncate(body.kind, 50) ?? 'unknown';

    // Best-effort: attach the user if this request came in with a valid session.
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = data?.user?.id ?? null;
    }

    await supabase.from('error_logs').insert({
      message,
      stack,
      component_stack: componentStack,
      page_url: pageUrl,
      user_agent: userAgent,
      kind,
      user_id: userId,
      ip,
    });

    const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (webhookUrl) {
      const lines = [
        `**VANTAGE crash** (${kind})`,
        `\`${message}\``,
        pageUrl ? `page: ${pageUrl}` : null,
        userId ? `user: ${userId}` : 'user: (not signed in)',
      ].filter(Boolean);
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: lines.join('\n').slice(0, 2000) }),
      }).catch((err) => console.error('Discord webhook failed:', err));
    }
  } catch (err) {
    console.error('log-error: failed to record crash report:', err);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
});
