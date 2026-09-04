import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../db/schema';
import { useUiStore, selectShowToast } from '../../store/uiStore';
import { Button } from '../ui/Button';

// Lets a coach type in this season's state/national/class ranking. Stored on
// season_history (keyed by team + year), the same table HistoryPage reads —
// updates the existing entry in place instead of creating a duplicate.
export function RankEditModal({ seasonRecord, defaultTeamId, onClose }) {
  const showToast = useUiStore(selectShowToast);
  const [stateInput,    setStateInput]    = useState(seasonRecord?.stateRank    != null ? String(seasonRecord.stateRank)    : '');
  const [nationalInput, setNationalInput] = useState(seasonRecord?.nationalRank != null ? String(seasonRecord.nationalRank) : '');
  const [classInput,    setClassInput]    = useState(seasonRecord?.classRank ?? '');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSave() {
    if (!defaultTeamId || !seasonRecord?.seasonYear) return;
    setSaving(true);
    setError('');
    try {
      const yearStr = String(seasonRecord.seasonYear);
      const newStateRank    = stateInput    ? Number(stateInput)    : null;
      const newNationalRank = nationalInput ? Number(nationalInput) : null;
      const newClassRank    = classInput.trim() || null;

      // Same (team_id, year-or-name) lookup HistoryPage uses, so we update the
      // existing entry in place rather than creating a duplicate.
      const existing = await db.season_history
        .where('team_id').equals(defaultTeamId)
        .filter(h => String(h.year) === yearStr)
        .first();

      const prevRanks = {};
      if (existing) {
        if (newStateRank !== (existing.state_rank ?? null))
          prevRanks.prev_state_rank = existing.state_rank ?? null;
        if (newNationalRank !== (existing.national_rank ?? null))
          prevRanks.prev_national_rank = existing.national_rank ?? null;
        if (newClassRank !== (existing.class_rank ?? null))
          prevRanks.prev_class_rank = existing.class_rank ?? null;
      }

      const fields = {
        state_rank:    newStateRank,
        national_rank: newNationalRank,
        class_rank:    newClassRank,
        ...prevRanks,
      };

      if (existing) {
        await db.season_history.update(existing.id, fields);
      } else {
        await db.season_history.add({ team_id: defaultTeamId, year: yearStr, ...fields });
      }
      showToast('Rankings updated', 'success');
      onClose();
    } catch (e) {
      setError(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed z-50 w-[calc(100%-2rem)] max-w-sm max-h-[90dvh] overflow-y-auto bg-bg rounded-2xl p-6 space-y-4 shadow-2xl"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <h2 className="text-lg font-bold">Update Rankings</h2>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Class</label>
            <input
              type="text"
              value={classInput}
              onChange={(e) => setClassInput(e.target.value)}
              placeholder="ex: 1"
              className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-slate-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
              {seasonRecord?.teamState ?? 'State'}
            </label>
            <input
              type="number"
              min={1}
              value={stateInput}
              onChange={(e) => setStateInput(e.target.value)}
              placeholder="ex: 3"
              className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">National</label>
            <input
              type="number"
              min={1}
              value={nationalInput}
              onChange={(e) => setNationalInput(e.target.value)}
              placeholder="ex: 12"
              className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-slate-500"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
}
