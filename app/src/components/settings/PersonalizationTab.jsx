import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ACCENT_COLORS } from '../../constants';
import { STORAGE_KEYS } from '../../utils/storage';
import {
  useTrimSetting, useNullableIntSetting, useStrSetting,
  useSidelineMode, useAccentColor,
} from '../../hooks/useSettingsStorage';

export function PersonalizationTab() {
  const [programName,  saveProgramName] = useTrimSetting(STORAGE_KEYS.PROGRAM_NAME);
  const [coachName,    saveCoachName]   = useTrimSetting(STORAGE_KEYS.COACH_NAME);
  const [playoffOrg,   savePlayoffOrg]  = useTrimSetting(STORAGE_KEYS.PLAYOFF_ORG);
  const [winMessage,   saveWinMessage]  = useTrimSetting(STORAGE_KEYS.WIN_MESSAGE);
  const [defaultTeamId,   saveDefaultTeam]   = useNullableIntSetting(STORAGE_KEYS.DEFAULT_TEAM_ID);
  const [defaultSeasonId, saveDefaultSeason] = useNullableIntSetting(STORAGE_KEYS.DEFAULT_SEASON_ID);
  const [scoreDetail,  saveScoreDetail] = useStrSetting(STORAGE_KEYS.SCORE_DETAIL, 'sets');
  const [sidelineMode, saveSidelineMode] = useSidelineMode();
  const [accent,       saveAccent]       = useAccentColor();

  const [confirmResetPersonalization, setConfirmResetPersonalization] = useState(false);

  const teams = useLiveQuery(() => db.teams.orderBy('name').toArray(), []);
  const defaultTeamSeasons = useLiveQuery(
    () => defaultTeamId ? db.seasons.where('team_id').equals(defaultTeamId).sortBy('year') : Promise.resolve([]),
    [defaultTeamId]
  );

  return (
    <div className="p-4 space-y-5">

      {/* Program name */}
      <div>
        <label className="block text-sm font-medium mb-1">Program Name</label>
        <div className="text-xs text-slate-400 mb-2">
          Used in PDF report headers and export filenames (e.g. "Lincoln Wildcats").
        </div>
        <input
          type="text"
          value={programName}
          onChange={(e) => saveProgramName(e.target.value)}
          placeholder="ex: Lincoln Wildcats"
          maxLength={60}
          className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
        />
      </div>

      {/* Coach name */}
      <div>
        <label className="block text-sm font-medium mb-1">Coach Name</label>
        <div className="text-xs text-slate-400 mb-2">
          Appears on PDF reports and CSV exports.
        </div>
        <input
          type="text"
          value={coachName}
          onChange={(e) => saveCoachName(e.target.value)}
          placeholder="ex: Coach Johnson"
          maxLength={60}
          className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
        />
      </div>

      {/* Playoff organization label */}
      <div>
        <label className="block text-sm font-medium mb-1">Playoff Organization</label>
        <div className="text-xs text-slate-400 mb-2">
          Shown on playoff match bars and in match type dropdowns. Enter your governing body abbreviation — the app appends "Playoffs" automatically (e.g. "IHSA" → "IHSA Playoffs").
        </div>
        <input
          type="text"
          value={playoffOrg}
          onChange={(e) => savePlayoffOrg(e.target.value)}
          placeholder="IHSA"
          maxLength={20}
          className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
        />
        {playoffOrg.trim() && (
          <p className="text-xs text-slate-500 mt-1">Displays as: <span className="text-slate-300">{playoffOrg.trim()} Playoffs</span></p>
        )}
      </div>

      {/* Win message */}
      <div>
        <label className="block text-sm font-medium mb-1">Win Message</label>
        <div className="text-xs text-slate-400 mb-2">
          Shown on the confetti screen after winning a match. Leave blank to use team abbreviation + WIN MATCH.
        </div>
        <textarea
          rows={2}
          value={winMessage}
          onChange={(e) => saveWinMessage(e.target.value)}
          placeholder={'WILDCATS\nWIN MATCH'}
          maxLength={60}
          className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder:text-slate-600 resize-none"
        />
      </div>

      {/* Default team */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium">Default Team</label>
          <Link to="/help/default-team" className="text-[10px] text-slate-500 hover:text-slate-300 underline">
            what does this do?
          </Link>
        </div>
        <div className="text-xs text-slate-400 mb-2">Pre-selected in tool pages and session setup</div>
        <select
          value={defaultTeamId ?? ''}
          onChange={async (e) => {
            const newTeamId = Number(e.target.value) || null;
            saveDefaultTeam(newTeamId);
            // Immediately resolve to that team's most recent season rather
            // than leaving Default Season blank — a default should only
            // ever be unset when there's truly nothing to pick.
            const newTeamSeasons = newTeamId ? await db.seasons.where('team_id').equals(newTeamId).toArray() : [];
            const latest = newTeamSeasons.length
              ? newTeamSeasons.reduce((a, b) => (Number(b.year) > Number(a.year) ? b : a))
              : null;
            saveDefaultSeason(latest?.id ?? null);
          }}
          className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
        >
          {(teams ?? []).length === 0 && <option value="">No default</option>}
          {(teams ?? []).map((t) => {
            const genderLabel = t.gender === 'F' ? 'Girls' : t.gender === 'M' ? 'Boys' : t.gender === 'Mixed' ? 'Mixed' : null;
            return <option key={t.id} value={t.id}>{genderLabel ? `${genderLabel} - ${t.name}` : t.name}</option>;
          })}
        </select>
      </div>

      {/* Default season — only shown when a default team is set */}
      {defaultTeamId && (
        <div>
          <label className="block text-sm font-medium mb-1">Default Season</label>
          <div className="text-xs text-slate-400 mb-2">Pre-selected in Reports and tool pages for this team</div>
          <select
            value={defaultSeasonId ?? ''}
            onChange={(e) => saveDefaultSeason(Number(e.target.value) || null)}
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
          >
            {(defaultTeamSeasons ?? []).length === 0 && <option value="">No default</option>}
            {(defaultTeamSeasons ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name ?? s.year}</option>
            ))}
          </select>
        </div>
      )}

      {/* Match card score display */}
      <div>
        <div className="text-sm font-medium mb-0.5">Match Card Scores</div>
        <div className="text-xs text-slate-400 mb-2">How scores appear on match cards</div>
        <div className="flex gap-2">
          {[
            { val: 'sets',   label: 'Set Count',   example: '●●○' },
            { val: 'scores', label: 'Set Scores',  example: '25-18 · 25-22' },
          ].map(({ val, label, example }) => (
            <button
              key={val}
              onClick={() => saveScoreDetail(val)}
              className={`flex-1 py-2 px-2 rounded-lg text-sm font-semibold border transition-colors flex flex-col items-center gap-0.5 ${
                scoreDetail === val
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg text-slate-300 border-slate-600 hover:border-slate-400'
              }`}
            >
              <span>{label}</span>
              <span className={`text-[10px] font-normal font-mono ${scoreDetail === val ? 'text-orange-100/70' : 'text-slate-500'}`}>{example}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <div className="text-sm font-medium mb-1">Theme</div>
        <div className="flex gap-2">
          {[
            { val: false, label: 'Dark',  example: 'default'        },
            { val: true,  label: 'Light', example: 'full-sun mode'  },
          ].map(({ val, label, example }) => (
            <button
              key={label}
              onClick={() => saveSidelineMode(val)}
              className={`flex-1 py-2 px-2 rounded-lg text-sm font-semibold border transition-colors flex flex-col items-center gap-0.5 ${
                sidelineMode === val
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg text-slate-300 border-slate-600 hover:border-slate-400'
              }`}
            >
              <span>{label}</span>
              <span className={`text-[10px] font-normal ${sidelineMode === val ? 'text-orange-100/70' : 'text-slate-500'}`}>{example}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div>
        <div className="text-sm font-medium mb-1">Accent Color</div>
        <div className="text-xs text-slate-400 mb-3">Applied to buttons, badges, and highlights throughout the app</div>
        <div className="flex flex-wrap justify-center gap-3">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => saveAccent(c.id)}
              className="flex flex-col items-center gap-1.5"
              title={c.label}
            >
              <span
                className="w-9 h-9 rounded-full block transition-transform"
                style={{
                  background: c.hex,
                  boxShadow: accent === c.id ? `0 0 0 3px #000, 0 0 0 5px ${c.hex}` : 'none',
                  transform: accent === c.id ? 'scale(1.15)' : 'scale(1)',
                }}
              />
              <span className={`text-[10px] font-semibold ${accent === c.id ? 'text-white' : 'text-slate-500'}`}>
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reset personalization */}
      <button
        onClick={() => setConfirmResetPersonalization(true)}
        className="w-full rounded-lg border border-slate-600 bg-slate-800/40 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200 hover:border-slate-400 transition-colors"
      >
        Restore all personalized settings to default
      </button>

      {confirmResetPersonalization && (
        <ConfirmDialog
          title="Restore Defaults"
          message="This will reset your program name, coach name, accent color, theme, and all other personalization settings back to their defaults."
          confirmLabel="Restore Defaults"
          onConfirm={async () => {
            saveProgramName('');
            saveCoachName('');
            savePlayoffOrg('');
            saveWinMessage('');
            // Re-derive Default Team/Season (most recent team, its most recent
            // season) instead of clearing them outright — the app should only
            // ever have no default when there's truly no team/season to pick.
            const newestTeam = await db.teams.orderBy('id').last();
            if (newestTeam) {
              saveDefaultTeam(newestTeam.id);
              const teamSeasons = await db.seasons.where('team_id').equals(newestTeam.id).toArray();
              const latestSeason = teamSeasons.length
                ? teamSeasons.reduce((a, b) => (Number(b.year) > Number(a.year) ? b : a))
                : null;
              saveDefaultSeason(latestSeason?.id ?? null);
            } else {
              saveDefaultTeam(null);
              saveDefaultSeason(null);
            }
            saveScoreDetail('sets');
            saveSidelineMode(false);
            saveAccent('orange');
            setConfirmResetPersonalization(false);
          }}
          onCancel={() => setConfirmResetPersonalization(false)}
        />
      )}

    </div>
  );
}
