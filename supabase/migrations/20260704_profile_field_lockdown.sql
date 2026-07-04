-- Close two tampering gaps in profiles + enforce plan expiry server-side.
--
-- Gap 1: prevent_plan_tampering() only guarded plan / plan_expires_at, leaving
--   matches_created (trial counter) and stripe_customer_id writable by any
--   authenticated client. A trial user could reset matches_created to 0 from
--   the browser console for unlimited free matches; stripe_customer_id could be
--   pointed at another customer, leaking their Stripe billing portal.
--   Fix: block stripe_customer_id changes outright, and block matches_created
--   DECREASES (increments must stay allowed — consume_match_slot() runs its
--   UPDATE while auth.role() is still 'authenticated', so a blanket block
--   would break the trial counter itself; an attacker raising their own
--   counter only hurts themselves).
--   Note: create-checkout previously wrote stripe_customer_id through the
--   user-scoped anon client; it now uses the service role for that write.
--
-- Gap 2: consume_match_slot() trusted the raw plan column, but expiry was only
--   applied client-side — the DB never flips an expired plan to 'inactive', so
--   the RPC kept allowing match creation forever after plan_expires_at passed.
--   Fix: treat any non-master plan with plan_expires_at in the past as inactive
--   (mirrors resolvePlanFromProfile in app/src/utils/planLimits.js).

-- ── 1. Extend the tamper guard ────────────────────────────────────────────────

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
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. Enforce plan expiry in consume_match_slot ──────────────────────────────

CREATE OR REPLACE FUNCTION consume_match_slot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan    text;
  v_expires timestamptz;
  v_created integer;
BEGIN
  SELECT plan, plan_expires_at INTO v_plan, v_expires
  FROM profiles WHERE id = auth.uid();

  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;

  IF v_plan = 'master' THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Expired plan = inactive, regardless of what the plan column still says.
  IF v_plan != 'inactive' AND v_expires IS NOT NULL AND v_expires < now() THEN
    v_plan := 'inactive';
  END IF;

  IF v_plan = 'inactive' THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', 0, 'reason', 'inactive');
  END IF;

  -- Paid plans: unconditionally allowed, no counter
  IF v_plan != 'trial' THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Trial: single atomic increment — only succeeds when under the limit.
  UPDATE profiles
  SET matches_created = matches_created + 1
  WHERE id = auth.uid()
    AND plan = 'trial'
    AND matches_created < 5
  RETURNING matches_created INTO v_created;

  IF v_created IS NULL THEN
    SELECT matches_created INTO v_created FROM profiles WHERE id = auth.uid();
    RETURN jsonb_build_object('allowed', false, 'used', v_created, 'limit', 5, 'reason', 'trial_limit');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', v_created, 'limit', 5);
END;
$$;
