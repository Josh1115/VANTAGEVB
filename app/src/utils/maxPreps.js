// MaxPreps Team ID lives on each team (synced), since Varsity and JV have
// different MaxPreps IDs. Older installs kept one ID in this device's
// localStorage — it still counts for the dashboard's default team only.
import { STORAGE_KEYS, getStorageItem, getIntStorage } from './storage';

export function legacyMaxPrepsId() {
  return String(getStorageItem(STORAGE_KEYS.MAXPREPS_TEAM_ID, '') ?? '').trim();
}

export function getMaxPrepsTeamId(team) {
  const own = String(team?.maxpreps_team_id ?? '').trim();
  if (own) return own;
  if (team && team.id === getIntStorage(STORAGE_KEYS.DEFAULT_TEAM_ID, null)) return legacyMaxPrepsId();
  return '';
}

// Plain-English reasons MaxPreps would reject the file; [] when it looks fine.
export function maxPrepsProblems(teamId, playerIds, playerNames, playerJerseys) {
  const problems = [];
  if (!teamId) problems.push('No MaxPreps Team ID is saved for this team (Settings → Data).');
  const noJersey = playerIds
    .filter((id) => String(playerJerseys[id] ?? '').trim() === '')
    .map((id) => playerNames[id] ?? 'Unknown player');
  if (noJersey.length) problems.push(`Missing jersey number: ${noJersey.join(', ')}. Add numbers on the team roster.`);
  return problems;
}

export const teamDisplayLabel = (t) =>
  [t?.name, t?.gender === 'F' ? 'Girls' : t?.gender === 'M' ? 'Boys' : null].filter(Boolean).join(' ');
