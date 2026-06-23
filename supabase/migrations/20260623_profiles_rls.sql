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
