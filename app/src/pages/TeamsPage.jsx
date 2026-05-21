import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { useOrganizations, useTeams } from '../hooks/useTeamData';
import { useUiStore, selectShowToast } from '../store/uiStore';

import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LogoPickerModal } from '../components/team/LogoPickerModal';


const ORG_COLORS = [
  { id: 'red',    label: 'Red',    bg: '#dc2626', border: '#ef4444' },
  { id: 'orange', label: 'Orange', bg: '#ea580c', border: '#f97316' },
  { id: 'yellow', label: 'Yellow', bg: '#ca8a04', border: '#eab308' },
  { id: 'blue',   label: 'Blue',   bg: '#1d4ed8', border: '#3b82f6' },
  { id: 'purple', label: 'Purple', bg: '#7c3aed', border: '#a855f7' },
  { id: 'pink',   label: 'Pink',   bg: '#db2777', border: '#ec4899' },
  { id: 'white',  label: 'White',  bg: '#f8fafc', border: '#94a3b8' },
  { id: 'black',  label: 'Black',  bg: '#111827', border: '#374151' },
  { id: 'gray',   label: 'Gray',   bg: '#94a3b8', border: '#64748b' },
  { id: 'green',  label: 'Green',  bg: '#16a34a', border: '#22c55e' },
];

function OrgFormModal({ onClose, org }) {
  const [name, setName] = useState(org?.name ?? '');
  const [type, setType] = useState(org?.type ?? 'school');
  const [stateDivision, setStateDivision] = useState(org?.state_division ?? '');
  const [logoDataUrl, setLogoDataUrl] = useState(org?.logo_data_url ?? null);
  const [colors, setColors] = useState(Array.isArray(org?.colors) ? org.colors : []);
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const showToast = useUiStore(selectShowToast);

  function toggleColor(id) {
    setColors(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  const save = async () => {
    if (!name.trim()) return;
    try {
      const fields = { name: name.trim(), type, state_division: stateDivision.trim() || null, logo_data_url: logoDataUrl ?? null, colors };
      if (org) {
        await db.organizations.update(org.id, fields);
      } else {
        await db.organizations.add(fields);
      }
      onClose();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  };

  return (
    <>
      <Modal
        title={org ? 'Edit Organization' : 'New Organization'}
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden shrink-0"
              style={logoDataUrl ? { backgroundImage: 'repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%)', backgroundSize: '8px 8px' } : {}}
            >
              {logoDataUrl
                ? <img src={logoDataUrl} alt="logo" className="max-w-full max-h-full object-contain" />
                : <span className="text-2xl text-slate-500">🏫</span>
              }
            </div>
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="ghost" onClick={() => setShowLogoPicker(true)}>
                {logoDataUrl ? 'Change Logo' : 'Add Logo'}
              </Button>
              {logoDataUrl && (
                <button
                  type="button"
                  onClick={() => setLogoDataUrl(null)}
                  className="text-xs text-slate-500 hover:text-red-400 text-left"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lincoln High School"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Type</label>
            <select
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="school">School (High School)</option>
              <option value="college">College</option>
              <option value="club">Club</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              {type === 'college' ? 'Division' : 'State'}
              <span className="text-slate-600 text-xs ml-1">(used on state/tournament placement banners)</span>
            </label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={stateDivision}
              onChange={(e) => setStateDivision(e.target.value)}
              placeholder={type === 'college' ? 'NCAA D1' : 'Illinois'}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              School Colors <span className="text-slate-600 text-xs">(up to 3 — used on championship banners)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ORG_COLORS.map(c => {
                const selected = colors.includes(c.id);
                const order    = colors.indexOf(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleColor(c.id)}
                    className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg border transition-colors relative"
                    style={{
                      borderColor: selected ? 'var(--color-primary)' : c.border,
                      boxShadow:   selected ? '0 0 0 2px var(--color-primary)' : 'none',
                    }}
                  >
                    <span className="w-6 h-6 rounded-full block" style={{ background: c.bg, border: `1px solid ${c.border}` }} />
                    <span className="text-[11px] text-slate-400 leading-none">{c.label}</span>
                    {selected && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center leading-none">
                        {order + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {colors.length > 0 && (
              <button
                type="button"
                onClick={() => setColors([])}
                className="mt-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
              >Clear colors</button>
            )}
          </div>
        </div>
      </Modal>

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

const JERSEY_COLORS = [
  { id: 'black',  label: 'Black',  bg: '#111827', border: '#374151' },
  { id: 'white',  label: 'White',  bg: '#f8fafc', border: '#94a3b8' },
  { id: 'gray',   label: 'Gray',   bg: '#94a3b8', border: '#64748b' },
  { id: 'red',    label: 'Red',    bg: '#dc2626', border: '#ef4444' },
  { id: 'orange', label: 'Orange', bg: '#ea580c', border: '#f97316' },
  { id: 'yellow', label: 'Yellow', bg: '#ca8a04', border: '#eab308' },
  { id: 'green',  label: 'Green',  bg: '#16a34a', border: '#22c55e' },
  { id: 'blue',   label: 'Blue',   bg: '#1d4ed8', border: '#3b82f6' },
  { id: 'purple', label: 'Purple', bg: '#7c3aed', border: '#a855f7' },
  { id: 'pink',   label: 'Pink',   bg: '#db2777', border: '#ec4899' },
];

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

function TeamFormModal({ onClose, orgId, team }) {
  const [name, setName] = useState(team?.name ?? '');
  const [abbreviation, setAbbreviation] = useState(team?.abbreviation ?? '');
  const [level, setLevel] = useState(team?.level ?? 'varsity');
  const [gender, setGender] = useState(team?.gender ?? 'F');
  const [state, setState] = useState(team?.state ?? '');
  const [classification, setClassification] = useState(team?.classification ?? '');
  const [schoolYear, setSchoolYear] = useState(team?.school_year ?? '');
  const toArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);
  const [teamJerseyColors,   setTeamJerseyColors]   = useState(() => toArr(team?.team_jersey_color));
  const [liberoJerseyColors, setLiberoJerseyColors] = useState(() => toArr(team?.libero_jersey_color));
  const toggleTeamColor   = (id) => setTeamJerseyColors(  (prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleLiberoColor = (id) => setLiberoJerseyColors((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const showToast = useUiStore(selectShowToast);

  const save = async () => {
    if (!name.trim()) return;
    try {
      const fields = {
        name: name.trim(),
        abbreviation: abbreviation.trim().toUpperCase() || null,
        level,
        gender,
        state: state.trim() || null,
        classification: classification.trim().toUpperCase() || null,
        school_year: schoolYear.trim() || null,
        team_jersey_color:   teamJerseyColors,
        libero_jersey_color: liberoJerseyColors,
      };
      if (team) {
        await db.teams.update(team.id, fields);
      } else {
        await db.teams.add({ org_id: orgId, ...fields });
      }
      onClose();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  };

  return (
    <Modal
      title={team ? 'Edit Team' : 'New Team'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Team Name</label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Varsity Girls"
              autoFocus
            />
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
  const [orgModal,    setOrgModal]    = useState(null); // null | { org? }
  const [teamModal,   setTeamModal]   = useState(null); // null | { orgId, team? }
  const [deleteOrg,   setDeleteOrg]   = useState(null); // org object to delete
  const [deleteTeam,  setDeleteTeam]  = useState(null); // team object to delete
  const showToast = useUiStore(selectShowToast);

  const handleDeleteOrg = async () => {
    try {
      await db.teams.where('org_id').equals(deleteOrg.id).delete();
      await db.organizations.delete(deleteOrg.id);
      setDeleteOrg(null);
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteTeam = async () => {
    try {
      await db.teams.delete(deleteTeam.id);
      setDeleteTeam(null);
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Teams"
        action={<Button size="sm" onClick={() => setOrgModal({})}>+ Org</Button>}
      />

      <div className="p-4 md:p-6 space-y-4">
        {orgs?.length === 0 && (
          <EmptyState
            icon="🏫"
            title="No organizations yet"
            description="Add a school or club to get started"
            action={<Button onClick={() => setOrgModal({})}>Add Organization</Button>}
          />
        )}

        {orgs?.map((org) => (
          <OrgSection
            key={org.id}
            org={org}
            onEditOrg={() => setOrgModal({ org })}
            onDeleteOrg={() => setDeleteOrg(org)}
            onAddTeam={() => setTeamModal({ orgId: org.id })}
            onEditTeam={(team) => setTeamModal({ orgId: org.id, team })}
            onDeleteTeam={(team) => setDeleteTeam(team)}
            onSelectTeam={(teamId) => navigate(`/teams/${teamId}`)}
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
          onClose={() => setTeamModal(null)}
        />
      )}

      {deleteOrg && (
        <ConfirmDialog
          title="Delete Organization"
          message={`Delete "${deleteOrg.name}" and all its teams? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteOrg}
          onCancel={() => setDeleteOrg(null)}
        />
      )}

      {deleteTeam && (
        <ConfirmDialog
          title="Delete Team"
          message={`Delete "${deleteTeam.name}"? This cannot be undone.`}
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

// Trash icon
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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
        className="flex-1 px-4 py-3 flex items-center justify-between"
      >
        <div className="font-medium">{team.name}</div>
        <div className="flex items-center gap-2">
          <Badge color="gray">{LEVEL_LABELS[team.level] ?? team.level}</Badge>
          {team.classification && <Badge color="purple">{team.classification}</Badge>}
          <span className="text-slate-400">→</span>
        </div>
      </button>
      <button onClick={() => onEditTeam(team)} className="px-3 py-3 text-slate-500 hover:text-slate-300 transition-colors" title="Edit team">
        <IconEdit />
      </button>
      <button onClick={() => onDeleteTeam(team)} className="px-3 py-3 text-slate-600 hover:text-red-400 transition-colors" title="Delete team">
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

function OrgSection({ org, onEditOrg, onDeleteOrg, onAddTeam, onEditTeam, onDeleteTeam, onSelectTeam }) {
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
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {org.logo_data_url && (
            <div className="w-7 h-7 rounded overflow-hidden shrink-0 flex items-center justify-center"
              style={{ backgroundImage: 'repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%)', backgroundSize: '6px 6px' }}>
              <img src={org.logo_data_url} alt="" className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <span className="font-semibold">{org.name}</span>
          <Badge color={org.type === 'school' ? 'blue' : 'orange'}>{org.type}</Badge>
          <button onClick={onEditOrg} className="text-slate-500 hover:text-slate-300 transition-colors p-0.5" title="Edit organization">
            <IconEdit />
          </button>
          <button onClick={onDeleteOrg} className="text-slate-600 hover:text-red-400 transition-colors p-0.5" title="Delete organization">
            <IconTrash />
          </button>
        </div>
        <Button size="sm" variant="ghost" onClick={onAddTeam}>+ Team</Button>
      </div>

      {(teams ?? []).length === 0 ? (
        <p className="text-slate-500 text-sm px-4 py-3">No teams yet</p>
      ) : multiGender ? (
        genderGroups.map(({ gender, teams: gTeams }) => {
          const info = yearRangeInfo(gTeams.map((t) => t.id), yearsByTeam);
          return (
          <div key={gender ?? 'other'}>
            <div className="px-4 py-1.5 border-b border-slate-700/60 bg-slate-800/40 flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {GENDER_LABELS[gender] ?? 'Other'}
              </span>
              {info && <span className="text-[11px] text-slate-500 font-medium">{info.label}</span>}
              {info && <span className="text-[11px] text-slate-600">{info.count} {info.count === 1 ? 'season' : 'seasons'}</span>}
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
              {info && (
                <div className="px-4 py-1.5 border-b border-slate-700/60 bg-slate-800/40 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">{info.label}</span>
                  <span className="text-[11px] text-slate-600">{info.count} {info.count === 1 ? 'season' : 'seasons'}</span>
                </div>
              )}
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
