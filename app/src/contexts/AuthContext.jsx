import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Dexie from 'dexie';
import { supabase } from '../utils/supabase';
import { saveToCloud, restoreFromCloud } from '../stats/backup';
import { resolvePlanFromProfile } from '../utils/planLimits';
import { PENDING_PLAN_KEY, startPlanCheckout } from '../utils/checkout';
import { router } from '../router';
import { db } from '../db/schema';
import { backfillLiberoSwapPositions } from '../db/liberoBackfill';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../utils/storage';

// Wipe all user-specific localStorage settings so one account's data can't
// bleed into the next account that opens the app on the same device.
function clearUserSettings() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    // Tool-page drafts (PracticeGame/ServeTracker/ServeReceive) and per-match
    // scout flags use dynamic keys outside STORAGE_KEYS — sweep them too.
    Object.keys(localStorage)
      .filter(key => key.startsWith('vbstat_draft_') || key.startsWith('vbstat_scout_'))
      .forEach(key => localStorage.removeItem(key));
  } catch { /* best-effort clear */ }
}

// Read the Supabase session straight out of localStorage, bypassing
// supabase-js's own getSession()/getUser(). On iOS Safari those calls run an
// internal validity check that can wrongly decide a perfectly good session is
// invalid, delete it from storage, and broadcast a false SIGNED_OUT — which
// logs the coach out and reloads the app. Reading the raw value ourselves
// can't trigger that check.
function readStoredSession() {
  try {
    const host = new URL(import.meta.env.VITE_SUPABASE_URL).hostname;
    const key = `sb-${host.split('.')[0]}-auth-token`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.access_token && parsed?.refresh_token && parsed?.user) return parsed;
  } catch { /* malformed/missing — treat as no session */ }
  return null;
}

const AUTH_CONTEXT_DEFAULT = {
  session: null,
  profile: null,
  loading: true,
  recoveryMode: false,
  clearRecoveryMode: () => {},
  signOut: async () => {},
  refreshProfile: () => {},
};

const AuthContext = createContext(AUTH_CONTEXT_DEFAULT);

const USER_ID_KEY  = 'vbstat_user_id';
const MIGRATED_KEY = 'vbstat_shared_migrated';

const MIGRATION_TABLES = [
  'organizations', 'teams', 'seasons', 'players', 'opponents',
  'matches', 'sets', 'lineups', 'substitutions', 'rallies', 'contacts',
  'saved_lineups', 'opp_tendencies', 'timeouts', 'historical_records',
  'season_history', 'tourney_entries', 'player_commits', 'auto_backups',
  'accolade_types', 'accolade_winners', 'practice_sessions',
];

// One-time migration: copy data from the old shared VBAPPv2 DB into the
// user's personal DB. Runs at most once per device (flag in localStorage).
async function migrateSharedDb() {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return;

    const sharedDb = new Dexie('VBAPPv2');
    await sharedDb.open();

    const sharedTeamCount = await sharedDb.table('teams').count().catch(() => 0);
    if (sharedTeamCount === 0) {
      sharedDb.close();
      localStorage.setItem(MIGRATED_KEY, '1');
      return;
    }

    // Only migrate if the user's personal DB is still empty
    const myTeamCount = await db.teams.count();
    if (myTeamCount > 0) {
      sharedDb.close();
      localStorage.setItem(MIGRATED_KEY, '1');
      return;
    }

    for (const tableName of MIGRATION_TABLES) {
      try {
        const rows = await sharedDb.table(tableName).toArray();
        if (rows.length) await db.table(tableName).bulkAdd(rows);
      } catch {
        // Table may not exist in older schema versions — skip
      }
    }

    sharedDb.close();
    localStorage.setItem(MIGRATED_KEY, '1');
  } catch {
    // Migration failure is non-fatal — app still works
  }
}

export function AuthProvider({ children }) {
  const [session,      setSession]      = useState(undefined);
  const [profile,      setProfile]      = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const reloading = useRef(false);

  function switchToUser(uid) {
    if (reloading.current) return;
    reloading.current = true;
    clearUserSettings();
    try { localStorage.setItem(USER_ID_KEY, uid); } catch { /* best-effort */ }
    window.location.reload();
  }

  function clearUser() {
    if (reloading.current) return;
    reloading.current = true;
    clearUserSettings();
    try { localStorage.removeItem(USER_ID_KEY); } catch { /* best-effort */ }
    window.location.reload();
  }

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);

    // Seed localStorage from profile on first login — only if the key is empty
    if (data) {
      if (!getStorageItem(STORAGE_KEYS.COACH_NAME) && data.coach_name)
        setStorageItem(STORAGE_KEYS.COACH_NAME, data.coach_name);
      if (!getStorageItem(STORAGE_KEYS.PROGRAM_NAME) && data.school_name)
        setStorageItem(STORAGE_KEYS.PROGRAM_NAME, data.school_name);
    }
  }

  // A visitor may have picked a plan before signing up (see LoginPage). Once a
  // real session exists, honor that intent by starting checkout immediately —
  // this redirects away from the app entirely on success, so nothing else needs
  // to run after it.
  async function maybeStartPendingCheckout(session) {
    const planKey = localStorage.getItem(PENDING_PLAN_KEY);
    if (!planKey) return;
    localStorage.removeItem(PENDING_PLAN_KEY);
    try {
      await startPlanCheckout(session, planKey);
    } catch {
      // Surface the failure instead of dropping it silently — the visitor picked
      // a plan before creating an account, so losing that signal here means they'd
      // land in the app on Trial with no explanation of what happened to it.
      router.navigate('/upgrade?checkout_failed=1');
    }
  }

  async function autoSync(session) {
    // Guard: if the open DB doesn't belong to this session user, the page is
    // mid-reload after an account switch. Abort to prevent saving one user's
    // local data under a different user's cloud backup.
    if (db.name !== `VBAPPv2_${session.user.id}`) return;
    try {
      const teamCount = await db.teams.count();
      if (teamCount === 0) {
        // Auto-restore must respect the same plan limits as the manual "Restore
        // from Cloud" button — otherwise an oversized/stale cloud backup can
        // silently reappear on any device where local data is empty.
        const { data: prof } = await supabase
          .from('profiles')
          .select('plan, plan_expires_at')
          .eq('id', session.user.id)
          .single();
        const { teamsAllowed, matchLimit } = resolvePlanFromProfile(prof);
        await restoreFromCloud(supabase, { session, teamsAllowed, matchLimit });
      } else {
        await saveToCloud(supabase, session);
      }
    } catch {
      // Sync failures are silent — app still works offline
    }
  }

  useEffect(() => {
    // On load: verify the open DB matches the session user.
    // If not, store the correct user ID and reload so schema.js opens the right DB.
    const initialSession = readStoredSession();

    // Deferred (not called synchronously in the effect body) to match how
    // this always ran before — previously inside a getSession() .then().
    Promise.resolve().then(() => {
      const initialUid = initialSession ? localStorage.getItem(USER_ID_KEY) : null;

      if (initialSession && initialUid !== initialSession.user?.id) {
        switchToUser(initialSession.user.id);
      } else if (initialSession) {
        setSession(initialSession);
        fetchProfile(initialSession.user.id);
        maybeStartPendingCheckout(initialSession);
        Promise.all([migrateSharedDb(), backfillLiberoSwapPositions()]).then(() => autoSync(initialSession));
      } else {
        setSession(null);
      }
    });

    // supabase-js always fires one callback immediately after subscribing
    // (INITIAL_SESSION, or SIGNED_OUT if the bug above tripped). We've
    // already established the real state above from raw storage, so ignore
    // that one leading callback whenever we know a session actually exists —
    // every callback after it is trusted normally.
    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(session ?? null);
        setRecoveryMode(true);
        return;
      }

      if (!settled) {
        settled = true;
        if (initialSession) return;
      }

      if (session) {
        const stored = localStorage.getItem(USER_ID_KEY);
        if (stored !== session.user.id) {
          switchToUser(session.user.id);
          return;
        }
      }

      setSession(session ?? null);

      if (session) {
        fetchProfile(session.user.id);
        maybeStartPendingCheckout(session);
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          Promise.all([migrateSharedDb(), backfillLiberoSwapPositions()]).then(() => autoSync(session));
        }
      } else {
        setProfile(null);
        // Only reload on explicit sign-out — not on session expiry
        if (event === 'SIGNED_OUT') clearUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  function refreshProfile() {
    if (session) fetchProfile(session.user.id);
  }

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      loading: session === undefined,
      recoveryMode,
      clearRecoveryMode: () => setRecoveryMode(false),
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
