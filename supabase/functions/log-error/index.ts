import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://vantagevb.net', 'https://www.vantagevb.net', 'http://localhost:5173', 'http://localhost:4173'];

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
