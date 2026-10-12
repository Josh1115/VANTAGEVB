import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { buildBoardRows, buildRotationRows, buildSetRecap, BOARD_COLUMNS } from '../../stats/lineupBoard';
import { fmtHitting, fmtPassRating, fmtCount, fmtVER, fmtPlayerName } from '../../stats/formatters';

const FORMAT = {
  ver_raw: fmtVER,
  hit_pct: fmtHitting,
  si_pct:  (v) => (v == null ? '—' : Math.round(v * 100) + '%'),
  apr:     fmtPassRating,
  blk:     (v) => (v == null ? '—' : String(+v.toFixed(1))),
};

// Read-only between-sets stat board shown beside the lineup builder.
export function LineupStatsBoard({ matchId, setNumber, players }) {
  const [scope, setScope]     = useState('match');
  const [sortKey, setSortKey] = useState('k');
  const [mobileOpen, setMobileOpen] = useState(false);

  const contacts = useLiveQuery(
    () => matchId ? db.contacts.where('match_id').equals(matchId).toArray() : [],
    [matchId]
  );
  const sets = useLiveQuery(
    () => matchId ? db.sets.where('match_id').equals(matchId).toArray() : [],
    [matchId]
  );

  const { rows, leaders } = useMemo(
    () => buildBoardRows(contacts ?? [], sets ?? [], setNumber, scope),
    [contacts, sets, setNumber, scope]
  );

  const playerById = useMemo(
    () => Object.fromEntries((players ?? []).map((p) => [String(p.id), p])),
    [players]
  );

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity)),
    [rows, sortKey]
  );

  if (!setNumber || setNumber < 2) return null;

  return (
    <div className="bg-surface rounded-xl border border-slate-700">
      {/* Phone: tap to open/close. Wide screens: always open. */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-white">Player Stats This Match</span>
        <span className="text-slate-400 text-xs">{mobileOpen ? 'Hide ▲' : 'Show ▼'}</span>
      </button>
      <p className="hidden lg:block px-4 pt-3 text-sm font-semibold text-white">Player Stats This Match</p>

      <div className={`${mobileOpen ? 'block' : 'hidden'} lg:block px-3 pb-3 pt-2 space-y-2`}>
        <div className="flex gap-1 bg-bg rounded-lg p-1">
          {[['match', 'Whole match'], ['last', `Set ${setNumber - 1} only`]].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setScope(val)}
              className={`flex-1 text-xs font-semibold rounded-md py-1.5 transition-colors ${
                scope === val ? 'bg-primary text-white' : 'text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {sorted.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No stats recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-slate-400">
                  <th className="sticky left-0 bg-surface text-left font-semibold py-1.5 pr-2">Player</th>
                  {BOARD_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      title={col.title}
                      onClick={() => setSortKey(col.key)}
                      className={`px-1.5 py-1.5 font-semibold text-center cursor-pointer select-none whitespace-nowrap ${
                        sortKey === col.key ? 'text-primary' : ''
                      }`}
                    >
                      {col.label}{sortKey === col.key ? ' ▼' : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const p = playerById[r.playerId];
                  return (
                    <tr key={r.playerId} className="border-t border-slate-700/60">
                      <td className="sticky left-0 bg-surface py-1.5 pr-2 text-white whitespace-nowrap max-w-[7rem] truncate">
                        {p ? `#${p.jersey_number} ${fmtPlayerName(p.name, p.nickname, 'initial_last')}` : 'Unknown'}
                      </td>
                      {BOARD_COLUMNS.map((col) => {
                        const lead = leaders[col.key]?.includes(r.playerId);
                        const color = !lead ? 'text-slate-300'
                          : col.kind === 'bad' ? 'text-red-400 font-bold' : 'text-green-400 font-bold';
                        return (
                          <td key={col.key} className={`px-1.5 py-1.5 text-center ${color}`}>
                            {(FORMAT[col.key] ?? fmtCount)(r[col.key])}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-slate-500">
          <span className="text-green-400">Green</span> = leader · <span className="text-red-400">Red</span> = most errors · Tap a column to sort
        </p>
      </div>
    </div>
  );
}

const pct = (v) => (v == null ? '—' : Math.round(v * 100) + '%');

// Separate read-only box: how each of our 6 rotations has done so far.
export function LineupRotationBoard({ matchId, setNumber, players }) {
  const [scope, setScope] = useState('match');
  const [mobileOpen, setMobileOpen] = useState(false);

  const rallies = useLiveQuery(
    () => matchId ? db.sets.where('match_id').equals(matchId).primaryKeys().then((ids) => db.rallies.where('set_id').anyOf(ids).toArray()) : [],
    [matchId]
  );
  const sets = useLiveQuery(
    () => matchId ? db.sets.where('match_id').equals(matchId).toArray() : [],
    [matchId]
  );

  const { rows, best, worst } = useMemo(
    () => buildRotationRows(rallies ?? [], sets ?? [], setNumber, scope),
    [rallies, sets, setNumber, scope]
  );

  const playerById = useMemo(
    () => Object.fromEntries((players ?? []).map((p) => [String(p.id), p])),
    [players]
  );

  if (!setNumber || setNumber < 2) return null;
  const anyPlayed = rows.some((r) => r.total > 0);

  return (
    <div className="bg-surface rounded-xl border border-slate-700">
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-white">Rotation Effectiveness</span>
        <span className="text-slate-400 text-xs">{mobileOpen ? 'Hide ▲' : 'Show ▼'}</span>
      </button>
      <p className="hidden lg:block px-4 pt-3 text-sm font-semibold text-white">Rotation Effectiveness</p>

      <div className={`${mobileOpen ? 'block' : 'hidden'} lg:block px-3 pb-3 pt-2 space-y-2`}>
        <div className="flex gap-1 bg-bg rounded-lg p-1">
          {[['match', 'Whole match'], ['last', `Set ${setNumber - 1} only`]].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setScope(val)}
              className={`flex-1 text-xs font-semibold rounded-md py-1.5 transition-colors ${
                scope === val ? 'bg-primary text-white' : 'text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!anyPlayed ? (
          <p className="text-xs text-slate-400 text-center py-4">No rallies recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-slate-400">
                  <th className="sticky left-0 bg-surface text-left font-semibold py-1.5 pr-2">Rotation</th>
                  <th className="px-1.5 py-1.5 font-semibold text-center whitespace-nowrap" title="Points won–lost">W–L</th>
                  <th className="px-1.5 py-1.5 font-semibold text-center whitespace-nowrap" title="Points won %">Win%</th>
                  <th className="px-1.5 py-1.5 font-semibold text-center whitespace-nowrap" title="Sideout % (they served)">SO%</th>
                  <th className="px-1.5 py-1.5 font-semibold text-center whitespace-nowrap" title="Point-score % (we served)">PS%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = r.serverId ? playerById[r.serverId] : null;
                  const color = r.rot === best ? 'text-green-400 font-bold'
                    : r.rot === worst ? 'text-red-400 font-bold' : 'text-slate-300';
                  return (
                    <tr key={r.rot} className="border-t border-slate-700/60">
                      <td className="sticky left-0 bg-surface py-1.5 pr-2 text-white whitespace-nowrap max-w-[9rem] truncate">
                        Rot {r.rot}
                        {p && <span className="text-slate-400"> · #{p.jersey_number} {fmtPlayerName(p.name, p.nickname, 'initial_last')}</span>}
                      </td>
                      <td className={`px-1.5 py-1.5 text-center ${color}`}>{r.total ? `${r.won}–${r.lost}` : '—'}</td>
                      <td className={`px-1.5 py-1.5 text-center ${color}`}>{pct(r.win_pct)}</td>
                      <td className="px-1.5 py-1.5 text-center text-slate-300">{pct(r.so_pct)}</td>
                      <td className="px-1.5 py-1.5 text-center text-slate-300">{pct(r.bp_pct)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-slate-500">
          <span className="text-green-400">Green</span> = best rotation · <span className="text-red-400">Red</span> = worst ·
          SO% = won when they served · PS% = won when we served · name = who served
        </p>
      </div>
    </div>
  );
}

// Recap data for the set right before `setNumber`.
function usePrevSetRecap(matchId, setNumber) {
  const sets = useLiveQuery(
    () => matchId ? db.sets.where('match_id').equals(matchId).toArray() : [],
    [matchId]
  );
  const prevSet = (sets ?? []).find((x) => x.set_number === setNumber - 1) ?? null;
  const prevId = prevSet?.id ?? null;
  const contacts = useLiveQuery(
    () => prevId ? db.contacts.where('set_id').equals(prevId).toArray() : [],
    [prevId]
  );
  const rallies = useLiveQuery(
    () => prevId ? db.rallies.where('set_id').equals(prevId).toArray() : [],
    [prevId]
  );
  return useMemo(
    () => buildSetRecap(contacts ?? [], rallies ?? [], prevSet),
    [contacts, rallies, prevSet]
  );
}

// Thin banner above all boxes: how the last set ended.
export function LineupScoreLine({ matchId, setNumber }) {
  const recap = usePrevSetRecap(matchId, setNumber);
  if (!setNumber || setNumber < 2 || !recap) return null;
  const { us, them, won, firstServe, ourLead, oppLead } = recap.score;
  return (
    <div className={`rounded-xl border px-4 py-3 ${won ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-white">Set {setNumber - 1}</span>
        <span className={`text-lg font-bold tabular-nums ${won ? 'text-green-400' : 'text-red-400'}`}>
          {won ? 'WON' : 'LOST'} {us}–{them}
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {firstServe ? `${firstServe === 'us' ? 'We' : 'They'} served first · ` : ''}
        Our biggest lead: {ourLead} · Their biggest lead: {oppLead}
      </p>
    </div>
  );
}

function RecapRow({ label, value, tone }) {
  const color = tone === 'good' ? 'text-green-400' : tone === 'bad' ? 'text-red-400' : 'text-slate-300';
  return (
    <div className="flex justify-between gap-2 py-1 border-t border-slate-700/60 first:border-t-0">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

// Separate box: WHY the last set was won/lost.
export function LineupSetRecap({ matchId, setNumber, players }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const recap = usePrevSetRecap(matchId, setNumber);
  const playerById = useMemo(
    () => Object.fromEntries((players ?? []).map((p) => [String(p.id), p])),
    [players]
  );
  if (!setNumber || setNumber < 2) return null;
  const title = `Set ${setNumber - 1} Recap`;
  const name = (id) => { const p = id ? playerById[String(id)] : null; return p ? `#${p.jersey_number} ${fmtPlayerName(p.name, p.nickname, 'initial_last')}` : null; };

  return (
    <div className="bg-surface rounded-xl border border-slate-700">
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="text-slate-400 text-xs">{mobileOpen ? 'Hide ▲' : 'Show ▼'}</span>
      </button>
      <p className="hidden lg:block px-4 pt-3 text-sm font-semibold text-white">{title}</p>

      <div className={`${mobileOpen ? 'block' : 'hidden'} lg:block px-4 pb-3 pt-2 space-y-3 text-xs`}>
        {!recap ? (
          <p className="text-slate-400 text-center py-4">No rallies recorded yet.</p>
        ) : (() => {
          const { points: pt, runs, battle: b } = recap;
          const runText = (run, side) => {
            if (!run) return '—';
            const end = side === 'us' ? `${run.fromUs + run.len}–${run.fromThem}` : `${run.fromUs}–${run.fromThem + run.len}`;
            return `${run.len}–0 (${run.fromUs}–${run.fromThem} → ${end})`;
          };
          const pp = (v) => (v.n ? `${Math.round(v.pct * 100)}% (${v.n})` : '—');
          return (
            <>
              <div>
                <p className="text-slate-300 font-semibold mb-1">How points were scored</p>
                <RecapRow label="Earned" value={pt.weEarned} tone="good" />
                <RecapRow label="Free / Opp errors" value={pt.theyGave} />
                {pt.ourOther > 0 && <RecapRow label="Our other points (not tagged)" value={pt.ourOther} />}
                <RecapRow label="Opp earned" value={pt.theyEarned} />
                <RecapRow label="Given" value={pt.weGave} tone={pt.weGave > pt.theyGave ? 'bad' : undefined} />
              </div>

              <div>
                <p className="text-slate-300 font-semibold mb-1">Biggest runs</p>
                <RecapRow label="Our best run" value={runText(runs.us, 'us')} tone="good" />
                {name(runs.us?.server) && <RecapRow label="Serving for it" value={name(runs.us.server)} />}
                <RecapRow label="Their best run" value={runText(runs.them, 'them')} tone="bad" />
                {runs.them?.rotation && <RecapRow label="We were stuck in" value={`Rot ${runs.them.rotation}`} />}
              </div>

              <div>
                <p className="text-slate-300 font-semibold mb-1">Serve & pass battle</p>
                <RecapRow label="Ser Err – Opp Ser Err" value={`${b.ourSE} – ${b.theirSE}`} tone={b.ourSE > b.theirSE ? 'bad' : b.ourSE < b.theirSE ? 'good' : undefined} />
                <RecapRow label="Aces vs Opp" value={`${b.ourAces} – ${b.theirAces}`} tone={b.ourAces > b.theirAces ? 'good' : b.ourAces < b.theirAces ? 'bad' : undefined} />
                <RecapRow label="APR" value={fmtPassRating(b.passAvg)} />
                <RecapRow label="Win% on 3" value={pp(b.byPass.perfect)} />
                <RecapRow label="Win% on 2" value={pp(b.byPass.good)} />
                <RecapRow label="Win% on 1" value={pp(b.byPass.bad)} />
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
