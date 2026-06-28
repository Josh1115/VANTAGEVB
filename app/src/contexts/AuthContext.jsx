import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Dexie from 'dexie';
import { supabase } from '../utils/supabase';
import { saveToCloud, restoreFromCloud } from '../stats/backup';
import { db } from '../db/schema';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../utils/storage';

const AuthContext = createContext(null);

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
    try { localStorage.setItem(USER_ID_KEY, uid); } catch {}
    window.location.reload();
  }

  function clearUser() {
    if (reloading.current) return;
    reloading.current = true;
    try { localStorage.removeItem(USER_ID_KEY); } catch {}
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

  async function autoSync(session) {
    try {
      const teamCount = await db.teams.count();
      if (teamCount === 0) {
        await restoreFromCloud(supabase, { session });
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
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          const stored = localStorage.getItem(USER_ID_KEY);
          if (stored !== session.user.id) {
            switchToUser(session.user.id);
            return;
          }
          setSession(session);
          fetchProfile(session.user.id);
        } else {
          setSession(null);
        }
      })
      .catch(() => setSession(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(session ?? null);
        setRecoveryMode(true);
        return;
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
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          migrateSharedDb().then(() => autoSync(session));
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
