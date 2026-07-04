-- Support DB-backed rate limiting in the log-error edge function.
-- In-memory limiting proved useless there: the edge runtime serves requests
-- from fresh isolates, so per-isolate counters never accumulate. Instead the
-- function now counts recent error_logs rows (globally and per caller IP)
-- before accepting a report, which requires storing the caller IP and being
-- able to filter recent rows cheaply.

ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS ip text;

CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON error_logs (created_at);
CREATE INDEX IF NOT EXISTS error_logs_ip_created_at_idx ON error_logs (ip, created_at);
