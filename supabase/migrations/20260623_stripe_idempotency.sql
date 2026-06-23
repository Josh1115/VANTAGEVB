-- Prevents duplicate Stripe webhook processing.
-- The webhook inserts event_id before handling; a unique violation means
-- the event was already processed and can be safely skipped.

CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id     text        PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Service role only; no user should ever read or write this directly
REVOKE ALL ON processed_stripe_events FROM anon, authenticated;
