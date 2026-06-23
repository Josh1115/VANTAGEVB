-- Migration: introduce 'trial' plan
-- Run this once in the Supabase SQL editor.
--
-- 1. Add 'trial' to the plan check constraint (if one exists).
--    If your profiles table has no check constraint on plan, this is a no-op — skip it.
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
--   CHECK (plan IN ('baseline', 'trial', 'core', 'advantage', 'topper'));

-- 2. Change the default plan for new sign-ups to 'trial'.
ALTER TABLE profiles ALTER COLUMN plan SET DEFAULT 'trial';

-- 3. (Optional) Migrate any NULL plan rows to 'trial'.
--    Existing 'baseline' rows are left untouched (grandfathered).
UPDATE profiles SET plan = 'trial' WHERE plan IS NULL;


-- ============================================================

-- Tracks visits to public-facing pages (login, signup landing, etc.).
-- Anon key can insert; only authenticated users can read.

create table page_views (
  id         bigint generated always as identity primary key,
  page       text        not null,
  visited_at timestamptz default now()
);

alter table page_views enable row level security;

create policy "page_views_anon_insert" on page_views
  for insert to anon with check (true);

create policy "page_views_auth_select" on page_views
  for select to authenticated using (true);


-- ============================================================

-- Lock down the profiles table so that authenticated clients (the app) cannot
-- change plan-related fields. Only the service role (Stripe webhook, admin)
-- is allowed to update plan and plan_expires_at.
--
-- How it works:
--   - Service role key → bypasses RLS entirely → can update plan freely ✓
--   - Authenticated user (app) → must pass RLS policies + trigger check
--   - Trigger fires on UPDATE and rejects any change to plan / plan_expires_at
--     when the caller is an authenticated user (not service role)

-- ── 1. Enable RLS ─────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ── 2. Drop old permissive policies if they exist ─────────────────────────────

DROP POLICY IF EXISTS "Allow individual read access"    ON profiles;
DROP POLICY IF EXISTS "Allow individual insert access"  ON profiles;
DROP POLICY IF EXISTS "Allow individual update access"  ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile."      ON profiles;
DROP POLICY IF EXISTS "Users can update own profile."            ON profiles;
DROP POLICY IF EXISTS "profiles_select_own"                      ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"                      ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"                      ON profiles;

-- ── 3. SELECT — users can read only their own row ─────────────────────────────

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- ── 4. INSERT — users can create their own row ────────────────────────────────
-- plan must be 'trial' or 'inactive'; 'master' / paid tiers are blocked.
-- The column DEFAULT is 'trial', so omitting plan from the insert is fine.

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND (plan IN ('trial', 'inactive') OR plan IS NULL)
  );

-- ── 5. UPDATE — users can update their own row ────────────────────────────────
-- The trigger below blocks changes to plan / plan_expires_at.

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── 6. Trigger: block plan tampering from authenticated clients ───────────────
-- auth.role() returns 'authenticated' for regular JWT users.
-- Service role calls have auth.role() = 'service_role' and bypass RLS,
-- but the trigger still fires — the role check lets service role through.

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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_plan_immutability ON profiles;

CREATE TRIGGER enforce_plan_immutability
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_plan_tampering();


-- ============================================================

-- Automatically create a profiles row whenever a new user signs up.
-- This fires at the database level the instant auth.users gets a new row,
-- so it works regardless of whether email confirmation is required.
-- The plan column defaults to 'trial' (set in add_trial_plan.sql).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- ============================================================

-- Lock down the backups table so coaches can only read and write their own data.
-- Without this, any authenticated user could query all coaches' backup payloads.

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- SELECT — can only read your own backup row
CREATE POLICY "backups_select_own" ON backups
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- INSERT — can only create a row for yourself
CREATE POLICY "backups_insert_own" ON backups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE — can only overwrite your own backup
CREATE POLICY "backups_update_own" ON backups
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE — can only delete your own backup
CREATE POLICY "backups_delete_own" ON backups
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ============================================================

-- Server-side trial match limit enforcement.
--
-- Adds a matches_created counter to profiles (incremented by the RPC below).
-- The client calls consume_match_slot() before creating a match in IndexedDB.
-- Because this runs inside Postgres with SECURITY DEFINER, no client-side
-- manipulation can affect the result.
--
-- Only trial users are blocked here. Paid plans are already paid for;
-- their 50/season cap remains a client-side courtesy limit.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matches_created integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION consume_match_slot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan    text;
  v_created integer;
  v_limit   integer := 5;
BEGIN
  SELECT plan, COALESCE(matches_created, 0)
  INTO v_plan, v_created
  FROM profiles WHERE id = auth.uid();

  -- No profile row yet (shouldn't happen, but be safe)
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;

  -- Master: unlimited
  IF v_plan = 'master' THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Inactive (expired or no plan): blocked
  IF v_plan = 'inactive' THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', 0, 'reason', 'inactive');
  END IF;

  -- Trial: enforce 5-match limit atomically
  IF v_plan = 'trial' THEN
    IF v_created >= v_limit THEN
      RETURN jsonb_build_object('allowed', false, 'used', v_created, 'limit', v_limit, 'reason', 'trial_limit');
    END IF;
    UPDATE profiles SET matches_created = matches_created + 1 WHERE id = auth.uid();
    RETURN jsonb_build_object('allowed', true, 'used', v_created + 1, 'limit', v_limit);
  END IF;

  -- Any active paid plan: allow
  RETURN jsonb_build_object('allowed', true);
END;
$$;


-- ============================================================

-- Prevents duplicate Stripe webhook processing.
-- The webhook inserts event_id before handling; a unique violation means
-- the event was already processed and can be safely skipped.

CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id     text        PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Service role only; no user should ever read or write this directly
REVOKE ALL ON processed_stripe_events FROM anon, authenticated;
