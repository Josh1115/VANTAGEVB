import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { useUiStore } from '../../store/uiStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { supabase } from '../../utils/supabase';
import { STORAGE_KEYS, setStorageItem } from '../../utils/storage';
import { useTrimSetting } from '../../hooks/useSettingsStorage';
import { exportBackup, importBackup, restoreAutoBackup, saveToCloud, restoreFromCloud, syncWithCloud } from '../../stats/backup';
import { findDuplicatePlayerGroups, findDuplicateOpponentGroups, findDuplicateOrgGroups, findDuplicateTeamGroups } from '../../stats/dedupe';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { MergeBackupModal } from './MergeBackupModal';
import { DedupeModal } from './DedupeModal';

// `onStorageChange` tells the parent to re-poll the browser storage-quota
// estimate — the "Storage" bar it shows lives outside this tab (in the
// always-visible header), so it can't see these actions on its own.
export function DataManagementTab({ onStorageChange, autoOpenDedupe }) {
  const navigate = useNavigate();
  const showToast = useUiStore((s) => s.showToast);
  const { session } = useAuth();
  const { isActive, isMaster, teamsAllowed, matchLimit } = usePlan();
  const fileInputRef = useRef(null);

  const [maxPrepsId, saveMaxPrepsId] = useTrimSetting(STORAGE_KEYS.MAXPREPS_TEAM_ID);

  const [importing,           setImporting]           = useState(false);
  const [pendingFile,         setPendingFile]         = useState(null);
  const [confirmImport,       setConfirmImport]       = useState(false);
  const [confirmClear,        setConfirmClear]        = useState(false);
  const [showMerge,           setShowMerge]           = useState(false);
  const [showDedupe,          setShowDedupe]          = useState(!!autoOpenDedupe);
  const [restoringId,         setRestoringId]         = useState(null);
  const [confirmRestoreBackup, setConfirmRestoreBackup] = useState(null);
  const [cloudSaving,         setCloudSaving]         = useState(false);
  const [cloudRestoring,      setCloudRestoring]      = useState(false);
  const [lastCloudSave,       setLastCloudSave]       = useState(null);
  const [confirmCloudRestore, setConfirmCloudRestore] = useState(false);

  // Account-wide duplicate check (not scoped to one team) — was previously
  // surfaced as a dismissible banner on the Dashboard; moved here since it's
  // a data-hygiene detail, not something that needs to compete for attention
  // on the main screen. See stats/dedupe.js for why these duplicates happen
  // (renames/jersey-number edits made before the sync fix landed) and how
  // merging works.
  const dupeHealth = useLiveQuery(async () => {
    const [players, opponents, orgs, teams] = await Promise.all([
      findDuplicatePlayerGroups(),
      findDuplicateOpponentGroups(),
      findDuplicateOrgGroups(),
      findDuplicateTeamGroups(),
    ]);
    const total = players.length + opponents.length + orgs.length + teams.length;
    if (!total) return null;
    return { total, players: players.length, opponents: opponents.length, orgs: orgs.length, teams: teams.length };
  }, []);

  const autoBackups = useLiveQuery(
    () => db.auto_backups.orderBy('created_at').reverse().limit(5).toArray(),
    []
  );

  useEffect(() => {
    // Use the access token already in React state to avoid any supabase-js
    // getSession() / __loadSession() calls, which can fire SIGNED_OUT on iOS Safari
    // if the stored session is in an unexpected state.
    if (!session?.access_token) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/backups?select=created_at&user_id=eq.${encodeURIComponent(session.user.id)}&order=created_at.desc&limit=1`;
    fetch(url, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Accept: 'application/json',
      },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(rows => setLastCloudSave(Array.isArray(rows) && rows.length > 0 ? rows[0].created_at : null))
      .catch(() => {});
  }, [session]);

  async function handleExport() {
    try {
      await exportBackup();
      showToast('Backup exported', 'success');
      onStorageChange?.();
    } catch {
      showToast('Export failed', 'error');
    }
  }

  async function handleSaveToCloud() {
    setCloudSaving(true);
    try {
      await syncWithCloud(supabase, session, { teamsAllowed, matchLimit, isMaster });
      setLastCloudSave(new Date().toISOString());
      showToast('Saved to cloud', 'success');
      onStorageChange?.();
    } catch (e) {
      showToast(e.message ?? 'Cloud save failed', 'error');
    } finally {
      setCloudSaving(false);
    }
  }

  async function handleRestoreFromCloud() {
    setCloudRestoring(true);
    setConfirmCloudRestore(false);
    try {
      await restoreFromCloud(supabase, { matchLimit, teamsAllowed, session });
      showToast('Restored from cloud', 'success');
      window.location.reload();
    } catch (e) {
      showToast(e.message ?? 'Cloud restore failed', 'error');
    } finally {
      setCloudRestoring(false);
    }
  }

  function handleImportPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setConfirmImport(true);
    e.target.value = '';
  }

  async function handleRestoreAutoBackup(backup) {
    setRestoringId(backup.id);
    setConfirmRestoreBackup(null);
    try {
      await restoreAutoBackup(backup.id, { matchLimit, teamsAllowed });
      showToast('Backup restored', 'success');
      window.location.reload();
    } catch (e) {
      showToast(e.message ?? 'Restore failed', 'error');
    } finally {
      setRestoringId(null);
    }
  }

  async function handleImportConfirm() {
    if (!pendingFile) return;
    setConfirmImport(false);

    setImporting(true);
    try {
      await importBackup(pendingFile, { teamsAllowed, matchLimit });
      showToast('Backup imported successfully', 'success');
      window.location.reload();
    } catch (e) {
      showToast(e.message ?? 'Import failed', 'error');
      setImporting(false);
      setPendingFile(null);
    }
  }

  async function handleClearAll() {
    try {
      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) await table.clear();
      });
      setStorageItem(STORAGE_KEYS.DEFAULT_TEAM_ID, null);
      setStorageItem(STORAGE_KEYS.DEFAULT_SEASON_ID, null);
      // Push an empty backup to the cloud so autoSync doesn't restore the old
      // data on the next page load, and reset the server-side match counter.
      if (session) {
        await saveToCloud(supabase, session).catch(() => {});
        await supabase.from('profiles').update({ matches_created: 0 }).eq('id', session.user.id).catch(() => {});
      }
      showToast('All data cleared', 'info');
      window.location.reload();
    } catch {
      showToast('Failed to clear data. Please try again.', 'error');
    } finally {
      setConfirmClear(false);
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">MaxPreps Team ID</label>
        <div className="text-xs text-slate-400 mb-2">
          Required for MaxPreps .txt export. To find your ID: go to your team's MaxPreps page → Roster/Stats → Import Stats → the UUID in that page's URL is your Team ID.
        </div>
        <input
          type="text"
          value={maxPrepsId}
          onChange={(e) => saveMaxPrepsId(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-primary placeholder:text-slate-600"
        />
      </div>
      <Button className="w-full" variant="secondary" onClick={handleExport}>
        Export Full Backup (JSON)
      </Button>

      {!isActive ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-slate-300">Import Backup (JSON)</p>
          <p className="text-xs text-slate-500">Restoring a backup requires an active plan. <button onClick={() => navigate('/upgrade')} className="text-primary hover:text-orange-300 transition-colors font-semibold">Subscribe →</button></p>
        </div>
      ) : (
        <>
          <Button
            className="w-full"
            variant="secondary"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? 'Importing…' : 'Import Backup (JSON)'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportPick}
          />

          <Button
            className="w-full"
            variant="secondary"
            onClick={() => setShowMerge(true)}
          >
            Merge from Backup (JSON)
          </Button>

          <Button
            className="w-full"
            variant="secondary"
            onClick={() => setShowDedupe(true)}
          >
            Clean Up Duplicates
          </Button>
          {dupeHealth && (
            <p className="text-xs text-amber-500 -mt-2">
              🧹 Possible duplicates found:{' '}
              {[
                dupeHealth.players   > 0 && `${dupeHealth.players} player group${dupeHealth.players === 1 ? '' : 's'}`,
                dupeHealth.opponents > 0 && `${dupeHealth.opponents} opponent group${dupeHealth.opponents === 1 ? '' : 's'}`,
                dupeHealth.orgs      > 0 && `${dupeHealth.orgs} organization group${dupeHealth.orgs === 1 ? '' : 's'}`,
                dupeHealth.teams     > 0 && `${dupeHealth.teams} team group${dupeHealth.teams === 1 ? '' : 's'}`,
              ].filter(Boolean).join(', ')}
            </p>
          )}
        </>
      )}

      {autoBackups && autoBackups.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1.5">Auto-Saves</p>
          <div className="flex flex-col gap-1.5">
            {autoBackups.map((b) => {
              const isMatchEnd = b.label === 'match_end';
              let dateStr = '';
              try { dateStr = new Date(b.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { dateStr = '—'; }
              return (
                <div key={b.id} className="flex items-center justify-between bg-bg rounded-lg px-3 py-2 border border-slate-700">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${isMatchEnd ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'}`}>
                      {isMatchEnd ? 'MATCH END' : 'APP OPEN'}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate">{dateStr}</span>
                  </div>
                  <button
                    onClick={() => setConfirmRestoreBackup(b)}
                    disabled={restoringId === b.id}
                    className="text-xs font-semibold text-primary hover:text-orange-300 transition-colors disabled:opacity-50 shrink-0 ml-2"
                  >
                    {restoringId === b.id ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {session && (
        <div className="pt-1">
          <p className="text-sm font-medium mb-1.5">Cloud Backup</p>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="secondary"
              disabled={cloudSaving}
              onClick={handleSaveToCloud}
            >
              {cloudSaving ? 'Syncing…' : 'Sync Now'}
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              disabled={cloudRestoring || !lastCloudSave}
              onClick={() => setConfirmCloudRestore(true)}
            >
              {cloudRestoring ? 'Restoring…' : 'Restore from Cloud'}
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Pulls in matches from your other devices and pushes this one's up — use this if a match isn't showing up everywhere yet.
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {lastCloudSave
              ? `Last saved: ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(lastCloudSave))}`
              : 'No cloud backup yet'}
          </p>
        </div>
      )}

      <Button className="w-full" variant="danger" onClick={() => setConfirmClear(true)}>
        Clear All Data
      </Button>

      {confirmClear && (
        <ConfirmDialog
          title="Clear All Data"
          message="This will permanently delete all teams, players, matches, and stats. This cannot be undone."
          confirmLabel="Clear Everything"
          danger
          onConfirm={handleClearAll}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {confirmImport && (
        <ConfirmDialog
          title="Import Backup"
          message="This will REPLACE all existing data with the backup file. This cannot be undone. Export a backup first if you want to preserve current data."
          confirmLabel="Import & Replace"
          danger
          onConfirm={handleImportConfirm}
          onCancel={() => { setConfirmImport(false); setPendingFile(null); }}
        />
      )}

      {confirmCloudRestore && (
        <ConfirmDialog
          title="Restore from Cloud"
          message={`This will REPLACE all local data with your cloud backup${lastCloudSave && !isNaN(new Date(lastCloudSave)) ? ` from ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(lastCloudSave))}` : ''}. Any changes made since your last cloud save will be lost. Export a local backup first if you want to preserve current data.`}
          confirmLabel="Restore & Replace"
          danger
          onConfirm={handleRestoreFromCloud}
          onCancel={() => setConfirmCloudRestore(false)}
        />
      )}

      {confirmRestoreBackup && (
        <ConfirmDialog
          title="Restore Auto-Save"
          message={`This will REPLACE all current data with the auto-save from ${new Date(confirmRestoreBackup.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. Any data recorded since then will be lost. Export a backup first if needed.`}
          confirmLabel="Restore & Replace"
          danger
          onConfirm={() => handleRestoreAutoBackup(confirmRestoreBackup)}
          onCancel={() => setConfirmRestoreBackup(null)}
        />
      )}

      {showMerge && (
        <MergeBackupModal
          onClose={() => setShowMerge(false)}
          onSuccess={() => showToast('Merge complete', 'success')}
        />
      )}

      {showDedupe && (
        <DedupeModal onClose={() => setShowDedupe(false)} />
      )}
    </div>
  );
}
