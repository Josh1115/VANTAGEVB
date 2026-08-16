import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../db/schema';
import { getPlayoffLabel } from '../../utils/storage';
import { findOrCreateOpponent } from '../../stats/queries';
import { Button } from '../ui/Button';

// Edits a scheduled (not-yet-started) match's metadata — opponent, date,
// location, match type, etc. `match` is always an existing match row; matches
// themselves get created elsewhere (Add Match), this only ever updates one.
export function EditScheduledMatchModal({ match, onClose, onDeleteRequested }) {
  const playoffLabel = getPlayoffLabel();

  const [opp,          setOpp]          = useState(match.opponent_name ?? '');
  const [oppAbbr,      setOppAbbr]      = useState(match.opponent_abbr ?? '');
  const [date,         setDate]         = useState(match.date ? match.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [time,         setTime]         = useState(match.match_time ?? '');
  const [loc,          setLoc]          = useState(match.location ?? 'home');
  const [conf,         setConf]         = useState(match.conference ?? 'non-con');
  const [matchType,    setMatchType]    = useState(match.match_type ?? 'reg-season');
  const [tourneyName,  setTourneyName]  = useState(match.tournament_name ?? '');
  const [tourneyRound, setTourneyRound] = useState(match.tournament_round ?? 'pool');
  const [playoffRound, setPlayoffRound] = useState(match.playoff_round ?? '');
  const [oppRecord,    setOppRecord]    = useState(match.opponent_record ?? '');
  const [oppRank,      setOppRank]      = useState(match.opponent_maxpreps_rank != null ? String(match.opponent_maxpreps_rank) : '');
  const [oppSeed,      setOppSeed]      = useState(match.opponent_playoff_seed != null ? String(match.opponent_playoff_seed) : '');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSave() {
    if (!opp.trim()) return;
    setSaving(true);
    setError('');
    try {
      // Keep opponent_id in sync with the typed name — otherwise renaming the
      // opponent here only changes what's displayed and leaves opponent_id
      // pointing at the old opponent record.
      const oppRecordRow = await findOrCreateOpponent(opp);
      await db.matches.update(match.id, {
        opponent_id:   oppRecordRow.id,
        opponent_name: oppRecordRow.name,
        opponent_abbr:          oppAbbr.trim().toUpperCase() || null,
        opponent_record:        oppRecord.trim() || null,
        opponent_maxpreps_rank: oppRank !== '' ? parseInt(oppRank, 10) : null,
        date:          date ? new Date(date + 'T12:00:00').toISOString() : new Date().toISOString(),
        location:      loc,
        conference:    conf,
        match_type:       matchType,
        tournament_name:  matchType === 'tourney' ? tourneyName.trim() || null : null,
        tournament_round: matchType === 'tourney' ? tourneyRound : null,
        playoff_round:         matchType === 'ihsa-playoffs' ? playoffRound.trim() || null : null,
        opponent_playoff_seed: matchType === 'ihsa-playoffs' && oppSeed !== '' ? parseInt(oppSeed, 10) : null,
        match_time:       time || null,
      });
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed z-50 w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto bg-bg rounded-2xl p-6 space-y-4 shadow-2xl"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <h2 className="text-lg font-bold">Edit Scheduled Game</h2>

        {/* Opponent */}
        <div>
          <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Opponent</label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={opp}
              onChange={(e) => setOpp(e.target.value)}
              placeholder="Opponent team name"
              className="flex-1 bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
              autoFocus
            />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide leading-none">Abbr</span>
              <input
                type="text"
                value={oppAbbr}
                onChange={(e) => setOppAbbr(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="OPP"
                maxLength={3}
                className="w-[56px] bg-surface border border-slate-600 text-white rounded-lg px-2 py-2 text-sm text-center font-bold uppercase tracking-widest focus:outline-none focus:border-primary placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Opponent record + MaxPreps rank */}
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
              Record <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={oppRecord}
              onChange={(e) => setOppRecord(e.target.value)}
              placeholder="ex: 12-3"
              className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
              MaxPreps Rank <span className="normal-case font-normal">(opt)</span>
            </label>
            <input
              type="number"
              min={1}
              value={oppRank}
              onChange={(e) => setOppRank(e.target.value)}
              placeholder="ex: 42"
              className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Date + Time */}
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Start Time <span className="normal-case font-normal text-slate-500">(optional)</span></label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Location</label>
          <div className="flex gap-2">
            {['home', 'away', 'neutral'].map((l) => (
              <button
                key={l}
                onClick={() => setLoc(l)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                  ${loc === l
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-slate-300 border-slate-600 hover:border-slate-400'
                  }`}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Conference */}
        <div>
          <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Opponent Type</label>
          <div className="flex gap-2">
            {[['conference', 'Conference'], ['non-con', 'Non-Con']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setConf(val)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                  ${conf === val
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-slate-300 border-slate-600 hover:border-slate-400'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Match Type */}
        <div>
          <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Match Type</label>
          <div className="flex gap-2">
            {[['reg-season', 'Reg Season'], ['tourney', 'Tourney'], ['ihsa-playoffs', playoffLabel], ['exhibition', 'Exhibition']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setMatchType(val)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                  ${matchType === val
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-slate-300 border-slate-600 hover:border-slate-400'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tournament Name + Round */}
        {matchType === 'tourney' && (
          <>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
                Tournament Name <span className="text-slate-500 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={tourneyName}
                onChange={(e) => setTourneyName(e.target.value)}
                placeholder="ex: Holiday Classic, IHSA Sectional…"
                className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Round</label>
              <div className="flex gap-2">
                {[['pool', 'Pool Play'], ['bracket', 'Bracket / Playoffs']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setTourneyRound(val)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                      ${tourneyRound === val
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface text-slate-300 border-slate-600 hover:border-slate-400'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Playoff Round */}
        {matchType === 'ihsa-playoffs' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Playoff Round</label>
            <input
              type="text"
              value={playoffRound}
              onChange={(e) => setPlayoffRound(e.target.value)}
              placeholder="ex: Regional, Sectional, Super-Sectional, State…"
              className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-slate-500"
            />
          </div>
        )}

        {matchType === 'ihsa-playoffs' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Opponent Playoff Seed</label>
            <input
              type="number"
              min="1"
              value={oppSeed}
              onChange={(e) => setOppSeed(e.target.value)}
              placeholder="ex: 3"
              className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-slate-500"
            />
          </div>
        )}

        {/* Actions */}
        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!opp.trim() || saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save Game'}
          </Button>
        </div>
        <Button
          variant="danger"
          className="w-full"
          onClick={() => onDeleteRequested({ id: match.id, opponent_name: opp })}
        >
          Delete Match
        </Button>
      </div>
    </>,
    document.body
  );
}
