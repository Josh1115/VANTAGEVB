-- Support-triggered "reset trial matches used" for a single account.
--
-- The app keeps a local, monotonic "trial matches ever created" tally per
-- device (app/src/utils/trialMatchCount.js) so deleting a match — online or
-- offline — never wins the slot back. That tally deliberately ignores a LOWER
-- server matches_created value, so lowering matches_created alone does not
-- unblock a device that already counted higher.
--
-- match_count_reset_at is the signal that a drop is intentional. To reset an
-- account (service role / admin only):
--
--   PATCH /rest/v1/profiles?id=eq.<uid>
--   { "matches_created": 0, "match_count_reset_at": "<now, ISO 8601>" }
--
-- The next time each of that account's devices loads its profile, it sees a
-- stamp newer than the last one it applied and snaps its local tally down to
-- the server's matches_created. Applied once per device per stamp.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS match_count_reset_at timestamptz;

-- Keep the tamper guard in step: an authenticated client must not be able to
-- forge a reset stamp (paired with the existing block on lowering
-- matches_created, this keeps the whole reset path service-role only).
CREATE OR REPLACE FUNCTION prevent_plan_tampering()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'Unauthorized: plan cannot be modified by the client';
    END IF;
    IF NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at THEN
      RAISE EXCEPTION 'Unauthorized: plan_expires_at cannot be modified by the client';
    END IF;
    IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
      RAISE EXCEPTION 'Unauthorized: stripe_customer_id cannot be modified by the client';
    END IF;
    IF COALESCE(NEW.matches_created, 0) < COALESCE(OLD.matches_created, 0) THEN
      RAISE EXCEPTION 'Unauthorized: matches_created cannot be lowered by the client';
    END IF;
    IF NEW.match_count_reset_at IS DISTINCT FROM OLD.match_count_reset_at THEN
      RAISE EXCEPTION 'Unauthorized: match_count_reset_at cannot be modified by the client';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
