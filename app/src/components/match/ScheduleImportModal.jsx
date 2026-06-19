import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { db } from '../../db/schema';
import { MATCH_STATUS } from '../../constants';
import { useUiStore, selectShowToast } from '../../store/uiStore';
import { usePlan } from '../../hooks/usePlan';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const TEMPLATE_CSV = `Opponent,Date,Time,Location,Type,Tournament
Stevenson,2026-09-05,6:00 PM,away,reg-season,
Lake Forest,2026-09-09,5:30 PM,home,reg-season,
Barrington,2026-09-13,10:00 AM,neutral,tourney,Holiday Classic
Glenbrook South,2026-09-13,1:00 PM,neutral,tourney,Holiday Classic
`;

const LOCATION_MAP = {
  home: 'home', h: 'home',
  away: 'away', a: 'away',
  neutral: 'neutral', n: 'neutral',
};

const TYPE_MAP = {
  reg: 'reg-season', regular: 'reg-season', 'reg-season': 'reg-season', 'regular season': 'reg-season', 'regular-season': 'reg-season',
  tourney: 'tourney', tournament: 'tourney',
  playoffs: 'ihsa-playoffs', playoff: 'ihsa-playoffs', 'ihsa-playoffs': 'ihsa-playoffs',
  exhibition: 'exhibition', exhib: 'exhibition',
};

function normalizeHeader(raw) {
  const k = raw.toLowerCase().replace(/[\s_\-#.,()]/g, '');
  if (['opponent', 'team', 'vs', 'opp'].includes(k)) return 'opponent';
  if (['date'].includes(k)) return 'date';
  if (['time'].includes(k)) return 'time';
  if (['location', 'site', 'loc'].includes(k)) return 'location';
  if (['type', 'matchtype'].includes(k)) return 'type';
  if (['tournament', 'tournamentname', 'tourney'].includes(k)) return 'tournament';
  return k;
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'schedule-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function ScheduleImportModal({ seasonId, onClose }) {
  const [rows, setRows] = useState(null);
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const showToast = useUiStore(selectShowToast);
  const { isMaster, matchLimit } = usePlan();

  function handleFile(file) {
    if (!file) return;
    setParseError('');
    setRows(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result.trim();
      const firstLine = text.split('\n')[0] ?? '';
      const delimiter = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';

      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter,
        transformHeader: normalizeHeader,
        transform: (v) => (typeof v === 'string' ? v.trim() : v),
      });

      const parsed = result.data
        .map((row, i) => {
          const opp = (row.opponent ?? '').trim();
          if (!opp) return null;
          const rawLoc = (row.location ?? 'home').toLowerCase();
          const rawType = (row.type ?? 'reg-season').toLowerCase();
          const tournament = (row.tournament ?? '').trim() || null;
          const matchType = TYPE_MAP[rawType] ?? 'reg-season';
          return {
            _row: i + 2,
            opponent: opp,
            date: row.date || null,
            time: row.time || null,
            location: LOCATION_MAP[rawLoc] ?? 'home',
            match_type: matchType,
            tournament_name: matchType === 'tourney' ? tournament : null,
          };
        })
        .filter(Boolean);

      if (!parsed.length) {
        setParseError('No valid rows found. Make sure the CSV has an Opponent column.');
        return;
      }
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!rows?.length) return;
    setSaving(true);
    try {
      const [liveCount, season] = await Promise.all([
        db.matches.where('season_id').equals(seasonId).count(),
        db.seasons.get(seasonId),
      ]);
      let effectiveCount = Math.max(liveCount, season?.peak_match_count ?? 0);
      const slotsRemaining = isMaster ? Infinity : matchLimit - effectiveCount;

      if (!isMaster && slotsRemaining <= 0) {
        setParseError(`This season has reached its ${matchLimit}-match limit. No matches were imported.`);
        return;
      }

      let added = 0;
      let skipped = 0;
      for (const row of rows) {
        if (!isMaster && added >= slotsRemaining) {
          skipped++;
          continue;
        }
        const nameLower = row.opponent.toLowerCase();
        const allOpps = await db.opponents.toArray();
        let opp = allOpps.find(o => o.name.toLowerCase() === nameLower) ?? null;
        if (!opp) {
          const id = await db.opponents.add({ name: row.opponent });
          opp = { id, name: row.opponent };
        }
        const dateStr = row.date
          ? new Date(row.date + 'T12:00:00').toISOString()
          : new Date().toISOString();
        await db.matches.add({
          season_id:       seasonId,
          opponent_id:     opp.id,
          opponent_name:   opp.name,
          date:            dateStr,
          match_time:      row.time || null,
          location:        row.location,
          conference:      'non-con',
          match_type:      row.match_type,
          tournament_name: row.tournament_name,
          status:          MATCH_STATUS.SCHEDULED,
          pv_token:        crypto.randomUUID(),
        });
        added++;
        effectiveCount++;
        await db.seasons.update(seasonId, { peak_match_count: effectiveCount });
      }

      if (skipped > 0) {
        showToast(`${added} match${added !== 1 ? 'es' : ''} imported. ${skipped} skipped — season limit of ${matchLimit} reached.`, 'error');
      } else {
        showToast(`${added} match${added !== 1 ? 'es' : ''} added to schedule`, 'success');
      }
      onClose();
    } catch (err) {
      setParseError('Import failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Import Schedule from CSV"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {rows && (
            <Button onClick={handleImport} disabled={saving}>
              {saving ? 'Importing…' : `Import ${rows.length} match${rows.length !== 1 ? 'es' : ''}`}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400 space-y-2">
          <p className="font-semibold text-slate-300">Expected CSV columns:</p>
          <p><span className="text-white font-semibold">Opponent</span> (required) · Date (YYYY-MM-DD) · Time · Location (home/away/neutral) · Type (reg/tourney/playoffs) · Tournament</p>
          <button
            onClick={downloadTemplate}
            className="text-primary font-semibold hover:text-orange-300 transition-colors"
          >
            Download template →
          </button>
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />
          <Button variant="secondary" onClick={() => fileRef.current?.click()} className="w-full">
            Choose CSV File
          </Button>
        </div>

        {parseError && <p className="text-red-400 text-sm">{parseError}</p>}

        {rows && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-300">{rows.length} match{rows.length !== 1 ? 'es' : ''} ready to import:</p>
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-800 rounded px-3 py-1.5 gap-2">
                  <span className="font-semibold text-white truncate">{r.opponent}</span>
                  <span className="text-slate-500 shrink-0">
                    {r.date ?? 'no date'} · {r.location} · {r.match_type}
                    {r.tournament_name ? ` · ${r.tournament_name}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
