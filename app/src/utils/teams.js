// Teams eligible for program-wide pages (Records, History).
// Schools/colleges: varsity only — program history is a varsity concept.
// Clubs: teams have no level, so honor the org's records_scope instead —
// 'all_ages' includes every team; 'top_only' (default) includes 18U teams,
// falling back to all teams when none are tagged 18U so the page never
// dead-ends.
export function getEligibleTeams(org, orgTeams) {
  const teams = orgTeams ?? [];
  if (org?.type === 'club') {
    if (org.records_scope === 'all_ages') return teams;
    const top = teams.filter(t => t.age_group === '18U');
    return top.length > 0 ? top : teams;
  }
  return teams.filter(t => t.level === 'varsity');
}
