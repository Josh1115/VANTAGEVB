-- Client-side crash reporting. Rows are written exclusively by the
-- log-error edge function (using the service role key), never directly
-- by the browser — the anon key is public, so letting it insert directly
-- would let anyone spam this table. No RLS policies means no anon/
-- authenticated access at all; service role bypasses RLS.

CREATE TABLE IF NOT EXISTS error_logs (
  id               bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message          text        NOT NULL,
  stack            text,
  component_stack  text,
  page_url         text,
  user_agent       text,
  kind             text        NOT NULL DEFAULT 'unknown',
  user_id          uuid,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Service role only; no user should ever read or write this directly
REVOKE ALL ON error_logs FROM anon, authenticated;
