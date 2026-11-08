-- Plan time changes done in one database step (used only by stripe-webhook).
--
-- Before this, the webhook read plan_expires_at, did the math in code, then
-- wrote it back. Two payments (or a payment and a refund) landing at the same
-- moment both read the same starting date, so one of them was lost. Each
-- function below is a single UPDATE: Postgres locks the row, so a second
-- change for the same account waits and then builds on the first.
--
-- 6 months matches PLAN_MONTHS in supabase/functions/stripe-webhook/planExpiry.ts.

-- A purchase: 6 months on top of paid time still left (time left on a trial,
-- an expired plan, or no plan starts from now).
CREATE OR REPLACE FUNCTION add_plan_time(p_user_id uuid, p_plan text, p_customer_id text)
RETURNS timestamptz LANGUAGE sql SECURITY INVOKER AS $$
  UPDATE profiles
  SET plan = p_plan,
      stripe_customer_id = p_customer_id,
      plan_expires_at = CASE
        WHEN plan IN ('1_team','2_teams','3_teams','4_teams','5plus_teams')
             AND plan_expires_at > now()
          THEN plan_expires_at
        ELSE now()
      END + interval '6 months',
      updated_at = now()
  WHERE id = p_user_id
  RETURNING plan_expires_at;
$$;

-- A full refund or chargeback: that payment's 6 months come off. If no time is
-- left, the plan is switched off.
CREATE OR REPLACE FUNCTION remove_plan_time(p_customer_id text)
RETURNS TABLE (id uuid, plan text, plan_expires_at timestamptz)
LANGUAGE sql SECURITY INVOKER AS $$
  UPDATE profiles AS p
  SET plan = CASE
        WHEN p.plan_expires_at - interval '6 months' > now() THEN p.plan
        ELSE 'inactive'
      END,
      plan_expires_at = CASE
        WHEN p.plan_expires_at - interval '6 months' > now() THEN p.plan_expires_at - interval '6 months'
        ELSE NULL
      END,
      updated_at = now()
  WHERE p.stripe_customer_id = p_customer_id
  RETURNING p.id, p.plan, p.plan_expires_at;
$$;

-- A chargeback the seller won: the 6 months come back. An active paid plan
-- keeps its tier and gets 6 months added onto its end date; a plan that was
-- switched off (or has run out) gets p_plan for 6 months from now.
CREATE OR REPLACE FUNCTION restore_plan_time(p_customer_id text, p_plan text)
RETURNS TABLE (id uuid, plan text, plan_expires_at timestamptz)
LANGUAGE sql SECURITY INVOKER AS $$
  UPDATE profiles AS p
  SET plan = CASE
        WHEN p.plan IN ('1_team','2_teams','3_teams','4_teams','5plus_teams')
             AND p.plan_expires_at > now()
          THEN p.plan
        ELSE p_plan
      END,
      plan_expires_at = CASE
        WHEN p.plan IN ('1_team','2_teams','3_teams','4_teams','5plus_teams')
             AND p.plan_expires_at > now()
          THEN p.plan_expires_at
        ELSE now()
      END + interval '6 months',
      updated_at = now()
  WHERE p.stripe_customer_id = p_customer_id
  RETURNING p.id, p.plan, p.plan_expires_at;
$$;

-- Webhook (service role) only — never the app or coaches.
REVOKE ALL ON FUNCTION add_plan_time(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION remove_plan_time(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION restore_plan_time(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION add_plan_time(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION remove_plan_time(text) TO service_role;
GRANT EXECUTE ON FUNCTION restore_plan_time(text, text) TO service_role;
