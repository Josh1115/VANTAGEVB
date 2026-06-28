import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { useOrganizations, useTeams } from '../hooks/useTeamData';
import { useUiStore, selectShowToast } from '../store/uiStore';
import { JERSEY_COLORS } from '../constants';

import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { usePlan } from '../hooks/usePlan';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LogoPickerModal } from '../components/team/LogoPickerModal';
import { SeasonFormModal } from '../components/team/SeasonFormModal';
import { Spinner } from '../components/ui/Spinner';


const ORG_COLORS = [
  { id: 'red',    label: 'Red',    bg: '#dc2626', border: '#ef4444' },
  { id: 'orange', label: 'Orange', bg: '#ea580c', border: '#e8530b' },
  { id: 'yellow', label: 'Yellow', bg: '#ca8a04', border: '#eab308' },
  { id: 'blue',   label: 'Blue',   bg: '#1d4ed8', border: '#3b82f6' },
  { id: 'purple', label: 'Purple', bg: '#7c3aed', border: '#a855f7' },
  { id: 'pink',   label: 'Pink',   bg: '#db2777', border: '#ec4899' },
  { id: 'white',  label: 'White',  bg: '#f8fafc', border: '#94a3b8' },
  { id: 'black',  label: 'Black',  bg: '#111827', border: '#374151' },
  { id: 'gray',   label: 'Gray',   bg: '#94a3b8', border: '#64748b' },
  { id: 'green',  label: 'Green',  bg: '#16a34a', border: '#22c55e' },
];

const ORG_TYPES = [
  { value: 'high_school', label: 'High School' },
  { value: 'college',     label: 'College'     },
  { value: 'club',        label: 'Club'        },
];
const COLLEGE_DIVISIONS = ['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'JC'];
const CLUB_ASSOCIATIONS = ['USAV', 'AAU'];

const inputCls = 'w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm';

function OrgFormModal({ onClose, org }) {
  const rawType = org?.type ?? 'high_school';
  const [type,        setType]        = useState(rawType === 'school' ? 'high_school' : rawType);
  const [name,        setName]        = useState(org?.name ?? '');
  const [state,       setState]       = useState(org?.state ?? org?.state_division ?? '');
  const [conference,  setConference]  = useState(org?.conference ?? '');
  const [division,    setDivision]    = useState(org?.division ?? '');
  const [association, setAssociation] = useState(org?.association ?? '');
  const [recordsScope, setRecordsScope] = useState(org?.records_scope ?? 'top_only');
  const [logoDataUrl, setLogoDataUrl] = useState(org?.logo_data_url ?? null);
  const [colors,      setColors]      = useState(Array.isArray(org?.colors) ? org.colors : []);
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [nameError,   setNameError]   = useState('');
  const [colorLimit,  setColorLimit]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const showToast = useUiStore(selectShowToast);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function toggleColor(id) {
    setColors(prev => {
      if (prev.includes(id)) { setColorLimit(false); return prev.filter(c => c !== id); }
      if (prev.length >= 3)  { setColorLimit(true);  return prev; }
      setColorLimit(false);
      return [...prev, id];
    });
  }

  const save = async () => {
    if (!name.trim()) { setNameError('Name is required.'); return; }
    setNameError('');
    setSaving(true);
    try {
      const fields = {
        name: name.trim(),
        type,
        state:       (type === 'high_school' || type === 'college') ? state.trim() || null : null,
        conference:  type === 'college' ? conference.trim() || null : null,
        division:    type === 'college' ? division || null : null,
        association:   type === 'club' ? association || null : null,
        records_scope: type === 'club' ? recordsScope : null,
        logo_data_url: logoDataUrl ?? null,
        colors,
      };
      if (org) {
        await db.organizations.update(org.id, fields);
        showToast('Organization updated', 'success');
      } else {
        await db.organizations.add(fields);
        showToast('Organization added', 'success');
      }
      onClose();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const PillBtn = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
        active ? 'bg-primary text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
      }`}
    >
      {children}
    </button>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-hidden bg-black/60 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-md space-y-3 max-h-[92dvh] overflow-y-auto">

          {/* header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">{org ? 'Edit Organization' : 'New Organization'}</h2>
            <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
          </div>

          {/* logo + name */}
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
              style={logoDataUrl ? { backgroundImage: 'repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%)', backgroundSize: '8px 8px' } : {}}
              onClick={() => setShowLogoPicker(true)}
            >
              {logoDataUrl
                ? <img src={logoDataUrl} alt="logo" className="max-w-full max-h-full object-contain" />
                : <span className="text-xl text-slate-500">🏫</span>
              }
            </div>
            <div className="flex-1">
              <input
                className={inputCls + (nameError ? ' border-red-500' : '')}
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(''); }}
                placeholder="Organization name"
                autoFocus
              />
              {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
            </div>
          </div>

          {/* type */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Type</label>
            <div className="flex gap-1.5 bg-slate-800 rounded-xl p-1">
              {ORG_TYPES.map(t => (
                <PillBtn key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
                  {t.label}
                </PillBtn>
              ))}
            </div>
          </div>

          {/* high school: state */}
          {type === 'high_school' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">State</label>
              <input className={inputCls} value={state} onChange={e => setState(e.target.value)} placeholder="Illinois" />
            </div>
          )}

          {/* college: state + conference in a row, then division pills */}
          {type === 'college' && (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">State</label>
                  <input className={inputCls} value={state} onChange={e => setState(e.target.value)} placeholder="Illinois" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Conference <span className="text-slate-600">(optional)</span></label>
                  <input className={inputCls} value={conference} onChange={e => setConference(e.target.value)} placeholder="Big Ten" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Division</label>
                <div className="flex gap-1.5 flex-wrap">
                  {COLLEGE_DIVISIONS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDivision(division === d ? '' : d)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        division === d ? 'bg-primary text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* club: association + records scope */}
          {type === 'club' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Association</label>
                <div className="flex gap-2">
                  {CLUB_ASSOCIATIONS.map(a => (
                    <PillBtn key={a} active={association === a} onClick={() => setAssociation(association === a ? '' : a)}>
                      {a}
                    </PillBtn>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Records Page</label>
                <div className="flex gap-1.5">
                  <PillBtn active={recordsScope === 'top_only'} onClick={() => setRecordsScope('top_only')}>18U only</PillBtn>
                  <PillBtn active={recordsScope === 'all_ages'} onClick={() => setRecordsScope('all_ages')}>All ages</PillBtn>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {recordsScope === 'top_only'
                    ? 'Records shows only your 18U teams'
                    : 'Records shows every age group on its own board'}
                </p>
              </div>
            </>
          )}

          {/* colors */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Colors <span className="text-slate-600">(up to 3, used on banners)</span>
              {colorLimit && <span className="text-xs text-amber-400 ml-2">Max 3 colors</span>}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ORG_COLORS.map(c => {
                const selected = colors.includes(c.id);
                const order    = colors.indexOf(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleColor(c.id)}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-colors relative"
                    style={{
                      borderColor: selected ? 'var(--color-primary)' : c.border,
                      boxShadow:   selected ? '0 0 0 2px var(--color-primary)' : 'none',
                    }}
                  >
                    <span className="w-5 h-5 rounded-full block" style={{ background: c.bg, border: `1px solid ${c.border}` }} />
                    <span className="text-[10px] text-slate-400 leading-none">{c.label}</span>
                    {selected && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary text-white text-[8px] font-black flex items-center justify-center leading-none">
                        {order + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {colors.length > 0 && (
              <button type="button" onClick={() => setColors([])} className="mt-1 text-xs text-slate-500 hover:text-red-400 transition-colors">
                Clear colors
              </button>
            )}
          </div>

          {/* footer */}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </div>

      {showLogoPicker && (
        <LogoPickerModal
          onSave={(dataUrl) => { setLogoDataUrl(dataUrl); setShowLogoPicker(false); }}
          onClose={() => setShowLogoPicker(false)}
        />
      )}
    </>
  );
}

const LEVEL_LABELS = {
  varsity:    'Varsity',
  jv:         'JV',
  jv2:        'JV2',
  soph:       'Sophomore',
  frosh_soph: 'Frosh/Soph',
  frosh:      'Freshman',
  club:       'Club',
};

// value = string[] of selected color ids; onChange(id) toggles that id in/out
function JerseyColorPicker({ label, value, onChange, colors }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => {
          const selected = value.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg border transition-colors"
              style={{
                borderColor: selected ? 'var(--color-primary)' : c.border,
                boxShadow:   selected ? '0 0 0 2px var(--color-primary)' : 'none',
              }}
            >
              <span className="w-6 h-6 rounded-full block" style={{ background: c.bg, border: `1px solid ${c.border}` }} />
              <span className="text-[11px] text-slate-400 leading-none">{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CLUB_AGE_GROUPS = ['14U', '15U', '16U', '17U', '18U', 'Open'];

function TeamFormModal({ onClose, orgId, team, orgType }) {
  const isClub = orgType === 'club';
  const [name, setName] = useState(team?.name ?? '');
  const [abbreviation, setAbbreviation] = useState(team?.abbreviation ?? '');
  const [level, setLevel] = useState(team?.level ?? 'varsity');
  const [ageGroup, setAgeGroup] = useState(team?.age_group ?? '18U');
  const [gender, setGender] = useState(team?.gender ?? 'F');
  const [state, setState] = useState(team?.state ?? '');
  const [classification, setClassification] = useState(team?.classification ?? '');
  const [schoolYear, setSchoolYear] = useState(team?.school_year ?? '');
  const toArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);
  const [teamJerseyColors,   setTeamJerseyColors]   = useState(() => toArr(team?.team_jersey_color));
  const [liberoJerseyColors, setLiberoJerseyColors] = useState(() => toArr(team?.libero_jersey_color));
  const toggleTeamColor   = (id) => setTeamJerseyColors(  (prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleLiberoColor = (id) => setLiberoJerseyColors((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const [nameError, setNameError] = useState('');
  const [saving,    setSaving]    = useState(false);
  const showToast = useUiStore(selectShowToast);
  const { teamsAllowed, isMaster } = usePlan();

  const save = async () => {
    if (!name.trim()) { setNameError('Name is required.'); return; }
    setNameError('');
    setSaving(true);
    try {
      // Fix 4: Re-check team limit at save time, not just at button-press time
      if (!team && !isMaster) {
        const currentCount = await db.teams.count();
        if (currentCount >= teamsAllowed) {
          showToast('Team limit reached — upgrade your plan to add more teams', 'error');
          setSaving(false);
          return;
        }
      }
      const fields = {
        name: name.trim(),
        abbreviation: abbreviation.trim().toUpperCase() || null,
        level: isClub ? null : level,
        age_group: isClub ? ageGroup : null,
        gender,
        state: state.trim() || null,
        classification: classification.trim().toUpperCase() || null,
        school_year: schoolYear.trim() || null,
        team_jersey_color:   teamJerseyColors,
        libero_jersey_color: liberoJerseyColors,
      };
      if (team) {
        await db.teams.update(team.id, fields);
        showToast('Team updated', 'success');
        onClose();
      } else {
        const newTeamId = await db.teams.add({ org_id: orgId, ...fields });
        showToast('Team added', 'success');
        onClose(newTeamId);
      }
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={team ? 'Edit Team' : 'New Team'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Team Name</label>
            <input
              className={`w-full bg-bg border rounded-lg px-3 py-2 text-white ${nameError ? 'border-red-500' : 'border-slate-600'}`}
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              placeholder="Varsity Girls"
              autoFocus
            />
            {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Abbr <span className="text-slate-500">(3 letters)</span></label>
            <input
              className="w-[72px] bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-center font-bold uppercase tracking-widest"
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="ABC"
              maxLength={3}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            {isClub ? (
              <>
                <label className="block text-sm text-slate-400 mb-1">Age Group</label>
                <select
                  className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                >
                  {CLUB_AGE_GROUPS.map(ag => <option key={ag} value={ag}>{ag}</option>)}
                </select>
              </>
            ) : (
              <>
                <label className="block text-sm text-slate-400 mb-1">Level</label>
                <select
                  className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="varsity">Varsity</option>
                  <option value="jv">JV</option>
                  <option value="jv2">JV2</option>
                  <option value="soph">Sophomore</option>
                  <option value="frosh_soph">Frosh/Soph</option>
                  <option value="frosh">Freshman</option>
                </select>
              </>
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Gender</label>
            <select
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="F">Girls</option>
              <option value="M">Boys</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">State <span className="text-slate-500">(opt)</span></label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="IL"
              maxLength={30}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Class <span className="text-slate-500">(opt)</span></label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white uppercase"
              value={classification}
              onChange={(e) => setClassification(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="2A"
              maxLength={6}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">School Year <span className="text-slate-500">(opt)</span></label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              placeholder="2025-26"
              maxLength={10}
            />
          </div>
        </div>

        <JerseyColorPicker
          label="Team Jersey Colors"
          value={teamJerseyColors}
          onChange={toggleTeamColor}
          colors={JERSEY_COLORS}
        />
        <JerseyColorPicker
          label="Libero Jersey Colors"
          value={liberoJerseyColors}
          onChange={toggleLiberoColor}
          colors={JERSEY_COLORS}
        />

      </div>
    </Modal>
  );
}

export function TeamsPage() {
  const navigate = useNavigate();
  const orgs = useOrganizations();
  const allTeams = useTeams();
  const { teamsAllowed, isMaster } = usePlan();
  const [orgModal,    setOrgModal]    = useState(null); // null | { org? }
  const [teamModal,   setTeamModal]   = useState(null); // null | { orgId, team? }
  const [deleteOrg,   setDeleteOrg]   = useState(null); // org object to delete
  const [deleteTeam,          setDeleteTeam]          = useState(null); // team object to delete
  const [pendingSeasonTeamId, setPendingSeasonTeamId] = useState(null); // new team id awaiting first season
  const showToast = useUiStore(selectShowToast);

  const atTeamLimit = !isMaster && (allTeams?.length ?? 0) >= (Number.isFinite(teamsAllowed) ? teamsAllowed : 0);

  const handleDeleteOrg = async () => {
    try {
      const orgTeams    = await db.teams.where('org_id').equals(deleteOrg.id).toArray();
      const teamIds     = orgTeams.map(t => t.id);
      const seasons     = teamIds.length ? await db.seasons.where('team_id').anyOf(teamIds).toArray() : [];
      const seasonIds   = seasons.map(s => s.id);
      const matches     = seasonIds.length ? await db.matches.where('season_id').anyOf(seasonIds).toArray() : [];
      const matchIds    = matches.map(m => m.id);
      const sets        = matchIds.length ? await db.sets.where('match_id').anyOf(matchIds).toArray() : [];
      const setIds      = sets.map(s => s.id);
      const accoTypes   = teamIds.length ? await db.accolade_types.where('team_id').anyOf(teamIds).toArray() : [];
      const accoTypeIds = accoTypes.map(a => a.id);

      await db.transaction('rw', db.tables, async () => {
        if (setIds.length) {
          await Promise.all([
            db.contacts.where('set_id').anyOf(setIds).delete(),
            db.rallies.where('set_id').anyOf(setIds).delete(),
            db.lineups.where('set_id').anyOf(setIds).delete(),
            db.substitutions.where('set_id').anyOf(setIds).delete(),
          ]);
          await db.sets.bulkDelete(setIds);
        }
        if (matchIds.length) {
          await db.opp_tendencies.where('match_id').anyOf(matchIds).delete();
          await db.timeouts.where('match_id').anyOf(matchIds).delete();
          await db.matches.bulkDelete(matchIds);
        }
        if (seasonIds.length) await db.seasons.bulkDelete(seasonIds);
        if (teamIds.length) {
          if (accoTypeIds.length) {
            await db.accolade_winners.where('type_id').anyOf(accoTypeIds).delete();
            await db.accolade_types.bulkDelete(accoTypeIds);
          }
          await Promise.all([
            db.players.where('team_id').anyOf(teamIds).delete(),
            db.saved_lineups.where('team_id').anyOf(teamIds).delete(),
            db.historical_records.where('team_id').anyOf(teamIds).delete(),
            db.season_history.where('team_id').anyOf(teamIds).delete(),
            db.tourney_entries.where('team_id').anyOf(teamIds).delete(),
            db.player_commits.where('team_id').anyOf(teamIds).delete(),
            db.practice_sessions.where('team_id').anyOf(teamIds).delete(),
            db.accolade_winners.where('team_id').anyOf(teamIds).delete(),
          ]);
          await db.teams.bulkDelete(teamIds);
        }
        await db.organizations.delete(deleteOrg.id);
      });
      setDeleteOrg(null);
    } catch (err) {
      setDeleteOrg(null);
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteTeam = async () => {
    try {
      const seasons     = await db.seasons.where('team_id').equals(deleteTeam.id).toArray();
      const seasonIds   = seasons.map(s => s.id);
      const matches     = seasonIds.length ? await db.matches.where('season_id').anyOf(seasonIds).toArray() : [];
      const matchIds    = matches.map(m => m.id);
      const sets        = matchIds.length ? await db.sets.where('match_id').anyOf(matchIds).toArray() : [];
      const setIds      = sets.map(s => s.id);
      const accoTypes   = await db.accolade_types.where('team_id').equals(deleteTeam.id).toArray();
      const accoTypeIds = accoTypes.map(a => a.id);

      await db.transaction('rw', db.tables, async () => {
        if (setIds.length) {
          await Promise.all([
            db.contacts.where('set_id').anyOf(setIds).delete(),
            db.rallies.where('set_id').anyOf(setIds).delete(),
            db.lineups.where('set_id').anyOf(setIds).delete(),
            db.substitutions.where('set_id').anyOf(setIds).delete(),
          ]);
          await db.sets.bulkDelete(setIds);
        }
        if (matchIds.length) {
          await db.opp_tendencies.where('match_id').anyOf(matchIds).delete();
          await db.timeouts.where('match_id').anyOf(matchIds).delete();
          await db.matches.bulkDelete(matchIds);
        }
        if (seasonIds.length) await db.seasons.bulkDelete(seasonIds);
        if (accoTypeIds.length) {
          await db.accolade_winners.where('type_id').anyOf(accoTypeIds).delete();
          await db.accolade_types.bulkDelete(accoTypeIds);
        }
        await Promise.all([
          db.players.where('team_id').equals(deleteTeam.id).delete(),
          db.saved_lineups.where('team_id').equals(deleteTeam.id).delete(),
          db.historical_records.where('team_id').equals(deleteTeam.id).delete(),
          db.season_history.where('team_id').equals(deleteTeam.id).delete(),
          db.tourney_entries.where('team_id').equals(deleteTeam.id).delete(),
          db.player_commits.where('team_id').equals(deleteTeam.id).delete(),
          db.practice_sessions.where('team_id').equals(deleteTeam.id).delete(),
          db.accolade_winners.where('team_id').equals(deleteTeam.id).delete(),
        ]);
        await db.teams.delete(deleteTeam.id);
      });
      setDeleteTeam(null);
    } catch (err) {
      setDeleteTeam(null);
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  return (
    <div>
      <header className="sticky top-0 z-20 bg-bg border-b border-slate-800 px-4 pb-3 pt-safe flex flex-col items-center gap-0.5">
        <div className="w-full flex items-center justify-end">
          <Button size="sm" onClick={() => setOrgModal({})}>+ Org</Button>
        </div>
        <img
          src="/logo.png"
          alt="VANTAGE"
          className="h-auto mx-auto"
          style={{ width: 'min(52vw, 260px)', transform: 'translateX(-3%)' }}
        />
        <span className="text-lg font-bold text-white tracking-wide">Teams</span>
      </header>

      <div className="p-4 md:p-6 space-y-4">
        {orgs === undefined && (
          <div className="flex justify-center py-8"><Spinner /></div>
        )}

        {orgs !== undefined && orgs.length === 0 && (
          <EmptyState
            icon="🏫"
            title="No organizations yet"
            description="Add a school or club to get started"
            action={<Button onClick={() => setOrgModal({})}>Add Organization</Button>}
          />
        )}

        {(orgs ?? []).map((org) => (
          <OrgSection
            key={org.id}
            org={org}
            onEditOrg={() => setOrgModal({ org })}
            onDeleteOrg={() => setDeleteOrg(org)}
            onAddTeam={atTeamLimit ? null : () => setTeamModal({ orgId: org.id })}
            onEditTeam={(team) => setTeamModal({ orgId: org.id, team })}
            onDeleteTeam={(team) => setDeleteTeam(team)}
            onSelectTeam={(teamId) => navigate(`/teams/${teamId}`)}
            onAllTimeRoster={(gender) => navigate(`/orgs/${org.id}/all-time-roster${gender ? `?gender=${gender}` : ''}`)}
          />
        ))}

      </div>

      {orgModal && (
        <OrgFormModal org={orgModal.org} onClose={() => setOrgModal(null)} />
      )}
      {teamModal && (
        <TeamFormModal
          orgId={teamModal.orgId}
          team={teamModal.team}
          orgType={(orgs ?? []).find(o => o.id === teamModal.orgId)?.type ?? null}
          onClose={(newTeamId) => {
            setTeamModal(null);
            if (newTeamId) setPendingSeasonTeamId(newTeamId);
          }}
        />
      )}
      {pendingSeasonTeamId && (
        <SeasonFormModal
          teamId={pendingSeasonTeamId}
          required
          onClose={() => setPendingSeasonTeamId(null)}
        />
      )}

      {deleteOrg && (
        <ConfirmDialog
          title="Delete Organization"
          message={`Delete "${deleteOrg.name}" and all its teams, players, seasons, matches, and stats? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteOrg}
          onCancel={() => setDeleteOrg(null)}
        />
      )}

      {deleteTeam && (
        <ConfirmDialog
          title="Delete Team"
          message={`Delete "${deleteTeam.name}"? All seasons, matches, players, and stats will be permanently erased. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteTeam}
          onCancel={() => setDeleteTeam(null)}
        />
      )}
    </div>
  );
}

// Pencil icon
function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

// Trash icon
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// V chevron logo rotated to point right — used as branded nav arrow
function VantageArrow() {
  return (
    <svg width="17" height="20" viewBox="0 0 17 20" aria-hidden="true">
      <polygon points="0,20 0,0 17,10" fill="#e8530b" />
      <polygon points="0,16.5 0,3.5 12,10" fill="#fef3ee" />
    </svg>
  );
}

const GENDER_ORDER = ['F', 'M', 'Mixed', null];
const GENDER_LABELS = { F: 'Girls', M: 'Boys', Mixed: 'Mixed' };

function TeamRow({ team, onSelectTeam, onEditTeam, onDeleteTeam }) {
  return (
    <div className="flex items-center hover:bg-slate-700 transition-colors">
      <button
        onClick={() => onSelectTeam(team.id)}
        className="flex-1 px-5 py-4 flex items-center justify-between"
      >
        <div className="font-semibold text-base">{team.name}</div>
        <div className="flex items-center gap-2.5">
          <Badge color="gray">VIEW</Badge>
          <VantageArrow />
        </div>
      </button>
      <button onClick={() => onEditTeam(team)} className="px-4 py-4 text-slate-500 hover:text-slate-300 transition-colors" title="Edit team">
        <IconEdit />
      </button>
      <button onClick={() => onDeleteTeam(team)} className="px-4 py-4 text-slate-600 hover:text-red-400 transition-colors" title="Delete team">
        <IconTrash />
      </button>
    </div>
  );
}

const parseYear = (y) => { const m = String(y ?? '').match(/\d{4}/); return m ? parseInt(m[0], 10) : null; };

function yearRangeInfo(teamIds, yearsByTeam) {
  if (!yearsByTeam) return null;
  const all = teamIds.flatMap((id) => yearsByTeam[id] ?? []);
  const unique = [...new Set(all)];
  if (!unique.length) return null;
  const min = Math.min(...unique);
  const max = Math.max(...unique);
  const label = min === max ? `(${min})` : `(${min}–${max})`;
  return { label, count: unique.length };
}

function OrgSection({ org, onEditOrg, onDeleteOrg, onAddTeam, onEditTeam, onDeleteTeam, onSelectTeam, onAllTimeRoster }) {
  const teams = useTeams(org.id);

  const yearsByTeam = useLiveQuery(async () => {
    if (!teams?.length) return {};
    const teamIds = teams.map((t) => t.id);
    const [tracked, history] = await Promise.all([
      db.seasons.where('team_id').anyOf(teamIds).toArray(),
      db.season_history.where('team_id').anyOf(teamIds).toArray(),
    ]);
    const map = Object.fromEntries(teamIds.map((id) => [id, []]));
    for (const s of [...tracked, ...history]) {
      const y = parseYear(s.year);
      if (y && map[s.team_id]) map[s.team_id].push(y);
    }
    return map;
  }, [teams]);

  const genderGroups = GENDER_ORDER
    .map((g) => ({ gender: g, teams: (teams ?? []).filter((t) => (t.gender ?? null) === g) }))
    .filter((g) => g.teams.length > 0);

  const multiGender = genderGroups.length > 1;

  return (
    <div className="bg-surface rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {org.logo_data_url && (
            <div className="w-9 h-9 rounded overflow-hidden shrink-0 flex items-center justify-center"
              style={{ backgroundImage: 'repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%)', backgroundSize: '6px 6px' }}>
              <img src={org.logo_data_url} alt="" className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <span className="font-bold text-base">{org.name}</span>
          <Badge color={org.type === 'college' ? 'orange' : org.type === 'club' ? 'green' : 'blue'}>
            {{ high_school: 'High School', college: 'College', club: 'Club', school: 'High School' }[org.type] ?? org.type}
          </Badge>
          <button onClick={onEditOrg} className="text-slate-500 hover:text-slate-300 transition-colors p-0.5" title="Edit organization">
            <IconEdit />
          </button>
          <button onClick={onDeleteOrg} className="text-slate-600 hover:text-red-400 transition-colors p-0.5" title="Delete organization">
            <IconTrash />
          </button>
        </div>
        <Button size="sm" variant="ghost" onClick={onAddTeam ?? undefined} disabled={!onAddTeam} title={!onAddTeam ? 'Team limit reached — upgrade your plan' : undefined}>+ Team</Button>
      </div>

      {(teams ?? []).length === 0 ? (
        <div className="px-5 py-2 pb-5">
          <EmptyState
            icon="👥"
            title="No teams yet"
            description="Add your first team to start tracking stats"
            action={
              onAddTeam
                ? <Button onClick={onAddTeam}>+ Add Team</Button>
                : <p className="text-xs text-slate-500">Upgrade your plan to add more teams</p>
            }
          />
        </div>
      ) : multiGender ? (
        genderGroups.map(({ gender, teams: gTeams }) => {
          const info = yearRangeInfo(gTeams.map((t) => t.id), yearsByTeam);
          return (
          <div key={gender ?? 'other'}>
            <div className="px-5 py-2 border-b border-slate-700/60 bg-slate-800/40 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {GENDER_LABELS[gender] ?? 'Other'}
              </span>
              {info && <span className="text-xs text-slate-500 font-medium">{info.label}</span>}
              {info && <span className="text-xs text-slate-600">{info.count} {info.count === 1 ? 'season' : 'seasons'}</span>}
              <button
                onClick={() => onAllTimeRoster(gender)}
                className="ml-auto text-[10px] font-bold text-primary hover:text-orange-300 transition-colors uppercase tracking-wide"
              >
                All Time Roster
              </button>
            </div>
            {gTeams.map((team) => (
              <TeamRow
                key={team.id}
                team={team}
                onSelectTeam={onSelectTeam}
                onEditTeam={onEditTeam}
                onDeleteTeam={onDeleteTeam}
              />
            ))}
          </div>
        ); })
      ) : (() => {
          const allTeamIds = (teams ?? []).map((t) => t.id);
          const info = yearRangeInfo(allTeamIds, yearsByTeam);
          return (
            <>
              <div className="px-5 py-2 border-b border-slate-700/60 bg-slate-800/40 flex items-center gap-2">
                {info && <span className="text-xs text-slate-500 font-medium">{info.label}</span>}
                {info && <span className="text-xs text-slate-600">{info.count} {info.count === 1 ? 'season' : 'seasons'}</span>}
                <button
                  onClick={() => onAllTimeRoster(null)}
                  className="ml-auto text-[10px] font-bold text-primary hover:text-orange-300 transition-colors uppercase tracking-wide"
                >
                  All Time Roster
                </button>
              </div>
              {(teams ?? []).map((team) => (
                <TeamRow
                  key={team.id}
                  team={team}
                  onSelectTeam={onSelectTeam}
                  onEditTeam={onEditTeam}
                  onDeleteTeam={onDeleteTeam}
                />
              ))}
            </>
          );
        })()
      }
    </div>
  );
}
