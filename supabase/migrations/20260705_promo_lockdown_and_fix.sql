-- Two promo-code fixes found in the 2026-07-05 audit:
--
-- 1. LOOPHOLE: the "auth read promo_codes" policy let ANY authenticated user
--    SELECT the entire promo_codes table (codes, plans, expiries) via the REST
--    API and redeem the best one for a free plan. The app never reads the
--    table directly — redemption goes through redeem_promo_code(), which is
--    SECURITY DEFINER and reads it as the function owner — so client SELECT
--    is dropped entirely.
--
-- 2. BREAKAGE: redeem_promo_code() updates profiles.plan while the request
--    JWT is still 'authenticated', so the prevent_plan_tampering trigger has
--    rejected EVERY redemption since it was added on 2026-06-23. Fixed with a
--    transaction-local GUC: the RPC raises vbstat.allow_plan_write just
--    before its UPDATE and the trigger honors it. Clients cannot set GUCs
--    through PostgREST, so this is not reachable from the outside.

-- ── 1. Promo codes are no longer client-readable ──────────────────────────────

DROP POLICY IF EXISTS "auth read promo_codes" ON promo_codes;

-- ── 2. Tamper guard: allow writes flagged by our own SECURITY DEFINER RPCs ────

CREATE OR REPLACE FUNCTION prevent_plan_tampering()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Transaction-local flag set only inside redeem_promo_code(); resets
  -- automatically at transaction end and is unreachable via PostgREST.
  IF current_setting('vbstat.allow_plan_write', true) = '1' THEN
    RETURN NEW;
  END IF;

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

-- ── 3. redeem_promo_code raises the flag around its plan write ────────────────

CREATE OR REPLACE FUNCTION redeem_promo_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_promo   promo_codes%ROWTYPE;
  v_uses    int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  SELECT * INTO v_promo FROM promo_codes WHERE code = upper(trim(p_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_code');
  END IF;
  IF v_promo.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'code_expired');
  END IF;
  IF v_promo.max_uses IS NOT NULL THEN
    SELECT count(*) INTO v_uses FROM promo_redemptions WHERE code = v_promo.code;
    IF v_uses >= v_promo.max_uses THEN
      RETURN jsonb_build_object('error', 'code_exhausted');
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM promo_redemptions WHERE code = v_promo.code AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('error', 'already_redeemed');
  END IF;

  PERFORM set_config('vbstat.allow_plan_write', '1', true);
  UPDATE profiles
  SET plan = v_promo.plan,
      plan_expires_at = v_promo.expires_at,
      redeemed_promo = v_promo.code
  WHERE id = v_user_id;
  PERFORM set_config('vbstat.allow_plan_write', '', true);

  INSERT INTO promo_redemptions (code, user_id) VALUES (v_promo.code, v_user_id);
  RETURN jsonb_build_object('ok', true, 'plan', v_promo.plan, 'expires_at', v_promo.expires_at);
END;
$$;
