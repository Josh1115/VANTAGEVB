// Roster view grouping — used by the Team page roster switch (# / Position / Grade).

// [key, label, positions in group]
const POSITION_GROUPS = [
  ['S',   'Setters',          ['S']],
  ['OH',  'Outside Hitters',  ['OH']],
  ['OPP', 'Opp / Right Side', ['OPP', 'RS']],
  ['MB',  'Middle Blockers',  ['MB']],
  ['LDS', 'Libero / DS',      ['L', 'DS']],
];

const GRADE_GROUPS = [
  ['Senior',    'Seniors',    ['Senior']],
  ['Junior',    'Juniors',    ['Junior']],
  ['Sophomore', 'Sophomores', ['Sophomore']],
  ['Freshman',  'Freshmen',   ['Freshman']],
];

const byJersey = (a, b) => Number(a.jersey_number) - Number(b.jersey_number);

function bucket(players, field, groups, otherLabel) {
  const known = new Set(groups.flatMap(([, , vals]) => vals));
  const out = groups
    .map(([key, label, vals]) => ({ key, label, players: players.filter(p => vals.includes(p[field])).sort(byJersey) }))
    .filter(g => g.players.length > 0);
  const rest = players.filter(p => !known.has(p[field])).sort(byJersey);
  if (rest.length > 0) out.push({ key: 'other', label: otherLabel, players: rest });
  return out;
}

// Returns [{ key, label, players }]. 'number' mode returns one unlabeled group.
export function groupRoster(players, mode) {
  const list = players ?? [];
  if (mode === 'position') return bucket(list, 'position', POSITION_GROUPS, 'Other');
  if (mode === 'grade')    return bucket(list, 'year', GRADE_GROUPS, 'No Grade');
  return [{ key: 'all', label: null, players: [...list].sort(byJersey) }];
}
