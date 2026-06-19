import { useState } from 'react';
import { db } from '../../db/schema';
import { useUiStore, selectShowToast } from '../../store/uiStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function SeasonFormModal({ onClose, teamId, season, required = false }) {
  const [name, setName] = useState(season?.name ?? '');
  const [year, setYear] = useState(season?.year ?? new Date().getFullYear());
  const [classification, setClassification] = useState(season?.classification ?? '');
  const [classRank, setClassRank] = useState(season?.class_rank ?? '');
  const showToast = useUiStore(selectShowToast);

  const save = async () => {
    if (!name.trim()) return;
    try {
      const data = { name: name.trim(), year: Number(year), classification: classification.trim() || null, class_rank: classRank.trim() || null };
      if (season) {
        await db.seasons.update(season.id, data);
      } else {
        await db.seasons.add({ team_id: teamId, ...data });
      }
      onClose();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  };

  return (
    <Modal
      title={season ? 'Edit Season' : 'Add a Season'}
      onClose={required ? undefined : onClose}
      hideClose={required}
      footer={
        <>
          {!required && <Button variant="secondary" onClick={onClose}>Cancel</Button>}
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        {required && (
          <p className="text-sm text-slate-400">Every team needs a season to track matches. Create one now to get started.</p>
        )}
        <div>
          <label className="block text-sm text-slate-400 mb-1">Season Name</label>
          <input
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fall 2025"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Year</label>
          <input
            type="number"
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Class <span className="text-slate-500">(optional)</span></label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              placeholder="e.g. 4A"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Class Rank <span className="text-slate-500">(optional)</span></label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={classRank}
              onChange={(e) => setClassRank(e.target.value)}
              placeholder="e.g. 3"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
