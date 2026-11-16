import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

// Delete-one-season confirm. Names the exact season and makes the coach type its
// year before Delete unlocks, so the wrong season can't be deleted by a stray tap.
export function DeleteSeasonDialog({ season, teamName, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('');
  const matchCount = useLiveQuery(
    () => db.matches.where('season_id').equals(season.id).count(),
    [season.id]
  );
  const year = String(season.year ?? '');
  const ok = typed.trim() === year;

  return (
    <Modal
      title="Delete Season?"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" disabled={!ok} onClick={onConfirm}>Delete {year} Season</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-red-800/60 bg-red-900/20 px-3 py-2.5">
          <div className="text-sm font-bold text-white">{season.name ?? year}</div>
          <div className="text-xs text-slate-300">
            {teamName ?? 'Team'} · {year}
            {matchCount != null && ` · ${matchCount} match${matchCount !== 1 ? 'es' : ''}`}
          </div>
        </div>
        <p className="text-sm text-slate-300">
          This season and all of its matches and stats are permanently erased. The team and its other seasons stay.
          {season.new_season_changes && ' Grade changes and roster moves from Start New Season will be undone.'}
        </p>
        <label className="block text-xs text-slate-400">
          Type <span className="font-bold text-white">{year}</span> to confirm
          <input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white"
          />
        </label>
      </div>
    </Modal>
  );
}
