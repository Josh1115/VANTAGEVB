// Shared wording for the "Export … (CSV)" buttons on Records and History so
// coaches know the file covers only the team on screen (one gender for schools).
const GENDER_WORD = { F: 'Girls', M: 'Boys' };

export function exportTeamLabel(team, gender) {
  const genderWord = GENDER_WORD[gender] ?? '';
  const name = team?.name ?? '';
  return [
    genderWord && !name.toLowerCase().includes(genderWord.toLowerCase()) ? genderWord : '',
    name,
    team?.age_group && !name.includes(team.age_group) ? team.age_group : '',
  ].filter(Boolean).join(' ') || "this team's";
}

// noun: 'records' | 'history'
export function exportHint(gender, genderTeams, noun) {
  const other = gender === 'F' ? 'M' : 'F';
  if ((genderTeams?.[gender]?.length ?? 0) > 1) return 'Only this team. Pick another team above to export theirs.';
  if ((genderTeams?.[other]?.length ?? 0) > 0) return `Only ${GENDER_WORD[gender] ?? 'this team\'s'} ${noun}. Switch to ${GENDER_WORD[other]} to export theirs.`;
  return `Exports this team's ${noun}.`;
}

export function exportFilename(kind, orgName, teamName) {
  const safe = s => String(s ?? '').replace(/[\\/:*?"<>|]/g, '').trim();
  const today = new Date().toISOString().slice(0, 10);
  return `${[kind, safe(orgName), safe(teamName)].filter(Boolean).join(' - ')} - ${today}.csv`;
}
