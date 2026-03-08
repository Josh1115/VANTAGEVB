import { db } from './schema';

export async function seedDevData() {
  const orgCount = await db.organizations.count();
  if (orgCount > 0) return; // already seeded

  const orgId = await db.organizations.add({
    name: 'Lincoln High School',
    type: 'school',
  });

  const teamId = await db.teams.add({
    org_id: orgId,
    name: 'Varsity Girls',
    gender: 'F',
    level: 'varsity',
  });

  await db.seasons.add({
    team_id: teamId,
    name: 'Fall 2025',
    year: 2025,
  });

  const players = [
    { name: 'Emma Johnson',    jersey_number: '1',  position: 'S',   is_active: true },
    { name: 'Mia Williams',    jersey_number: '5',  position: 'OH',  is_active: true },
    { name: 'Ava Brown',       jersey_number: '8',  position: 'OH',  is_active: true },
    { name: 'Sofia Davis',     jersey_number: '11', position: 'MB',  is_active: true },
    { name: 'Olivia Miller',   jersey_number: '14', position: 'MB',  is_active: true },
    { name: 'Isabella Wilson', jersey_number: '17', position: 'OPP', is_active: true },
    { name: 'Lily Anderson',   jersey_number: '3',  position: 'L',   is_active: true },
    { name: 'Grace Thomas',    jersey_number: '7',  position: 'DS',  is_active: true },
    { name: 'Chloe Jackson',   jersey_number: '10', position: 'DS',  is_active: true },
    { name: 'Zoe White',       jersey_number: '2',  position: 'OH',  is_active: true },
    { name: 'Nora Harris',     jersey_number: '6',  position: 'MB',  is_active: true },
    { name: 'Hannah Martin',   jersey_number: '9',  position: 'S',   is_active: true },
  ];

  await db.players.bulkAdd(players.map((p) => ({ ...p, team_id: teamId })));
}

// Backfill position for any seed player whose record is missing it
export async function patchSeedPositions() {
  const positionMap = {
    'Emma Johnson':    'S',
    'Mia Williams':    'OH',
    'Ava Brown':       'OH',
    'Sofia Davis':     'MB',
    'Olivia Miller':   'MB',
    'Isabella Wilson': 'OPP',
    'Lily Anderson':   'L',
    'Grace Thomas':    'DS',
    'Chloe Jackson':   'DS',
    'Zoe White':       'OH',
    'Nora Harris':     'MB',
    'Hannah Martin':   'S',
  };
  const all = await db.players.toArray();
  for (const player of all) {
    if (!player.position && positionMap[player.name]) {
      await db.players.update(player.id, { position: positionMap[player.name] });
    }
  }
}
