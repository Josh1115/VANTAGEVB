import { db } from '../db/schema';
import { computePlayerStats, computeTeamStats } from '../stats/engine';

export async function computeMatchSnapshot(matchId) {
  const match = await db.matches.get(matchId);
  if (!match) return null;

  const season = match.season_id ? await db.seasons.get(match.season_id) : null;
  const team   = season?.team_id ? await db.teams.get(season.team_id) : null;

  const contacts = await db.contacts.where('match_id').equals(matchId).toArray();
  const sets     = await db.sets.where('match_id').equals(matchId).toArray();
  const setsPlayed = Math.max(1, sets.filter(s => s.status === 'complete').length);

  const playerStats = computePlayerStats(contacts, setsPlayed);
  const teamStats   = computeTeamStats(contacts, setsPlayed);

  // Get players who appear in any lineup for this match
  const lineupRows = await db.lineups
    .where('set_id').anyOf(sets.map(s => s.id))
    .toArray();
  const playerIds = [...new Set(lineupRows.map(r => r.player_id))];
  const playerRecords = playerIds.length ? await db.players.bulkGet(playerIds) : [];

  const players = playerRecords.filter(Boolean).map(p => {
    const s = playerStats[p.id] ?? {};
    return {
      id:       p.id,
      name:     p.name,
      jersey:   p.jersey_number ?? '',
      position: p.position ?? '',
      stats: {
        kills:    s.k    ?? 0,
        killPct:  s.k_pct  ?? null,
        hitPct:   s.hit_pct ?? null,
        aces:     s.ace   ?? 0,
        acePct:   s.ace_pct ?? null,
        apr:      s.apr   ?? null,
        blocks:   (s.bs ?? 0) + (s.ba ?? 0),
        digs:     s.dig   ?? 0,
        assists:  s.ast   ?? 0,
        serves:   s.sa    ?? 0,
        serveErr: s.se    ?? 0,
        passes:   s.pa    ?? 0,
        sp:       s.sp    ?? 0,
        mp:       s.mp    ?? 0,
      },
    };
  });

  return {
    matchId,
    match: {
      id:          match.id,
      date:        match.date,
      opponent:    match.opponent_name ?? '',
      location:    match.location ?? '',
      status:      match.status,
      ourSetsWon:  match.our_sets_won ?? 0,
      oppSetsWon:  match.opp_sets_won ?? 0,
      format:      match.format,
    },
    ourTeam: { name: team?.name ?? '' },
    teamStats: {
      kills:   teamStats.k   ?? 0,
      aces:    teamStats.ace ?? 0,
      digs:    teamStats.dig ?? 0,
      blocks:  (teamStats.bs ?? 0) + (teamStats.ba ?? 0),
      assists: teamStats.ast ?? 0,
    },
    players,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Builds the full FamilyScope snapshot payload for a team.
 * Reads all active seasons, completed matches, players, and contacts from Dexie.
 * Returns the JSON payload suitable for publishing to pv_stats.
 */
export async function computeSnapshotPayload(teamId) {
  // Load team + active season
  const team = await db.teams.get(teamId);
  const seasons = await db.seasons.where('team_id').equals(teamId).toArray();
  const activeSeason = seasons.find(s => s.status === 'active') ?? seasons.at(-1);

  // Load players
  const allPlayers = await db.players.where('team_id').equals(teamId).filter(p => p.is_active).toArray();

  // Load completed matches for the active season
  let matches = [];
  let contacts = [];
  let setsPlayed = 1;

  if (activeSeason) {
    matches = await db.matches
      .where('season_id').equals(activeSeason.id)
      .filter(m => m.status === 'complete')
      .toArray();

    const matchIds = matches.map(m => m.id);
    if (matchIds.length) {
      contacts = await db.contacts.where('match_id').anyOf(matchIds).toArray();
      const sets = await db.sets.where('match_id').anyOf(matchIds).toArray();
      setsPlayed = Math.max(1, sets.filter(s => s.status === 'complete').length);
    }
  }

  // Compute per-player and team stats
  const playerStats = computePlayerStats(contacts, setsPlayed);
  const teamStats = computeTeamStats(contacts, setsPlayed);

  // Load opponents for match display
  const oppIds = [...new Set(matches.map(m => m.opponent_id).filter(Boolean))];
  const opps = oppIds.length ? await db.opponents.bulkGet(oppIds) : [];
  const oppMap = Object.fromEntries(opps.filter(Boolean).map(o => [o.id, o.name]));

  // Build season record
  const wins   = matches.filter(m => m.our_sets_won > m.opp_sets_won).length;
  const losses = matches.filter(m => m.our_sets_won < m.opp_sets_won).length;

  // Per-player summary rows
  const players = allPlayers.map(p => {
    const s = playerStats[p.id] ?? {};
    return {
      id:       p.id,
      name:     p.name,
      jersey:   p.jersey_number ?? '',
      position: p.position ?? '',
      stats: {
        kills:    s.k    ?? 0,
        killPct:  s.k_pct  ?? null,
        hitPct:   s.hit_pct ?? null,
        aces:     s.ace   ?? 0,
        acePct:   s.ace_pct ?? null,
        apr:      s.apr   ?? null,
        blocks:   (s.bs ?? 0) + (s.ba ?? 0),
        digs:     s.dig   ?? 0,
        assists:  s.ast   ?? 0,
        serves:   s.sa    ?? 0,
        serveErr: s.se    ?? 0,
        passes:   s.pa    ?? 0,
        sp:       s.sp    ?? 0,
        mp:       s.mp    ?? 0,
      },
    };
  });

  // Per-match rows
  const matchRows = matches.map(m => ({
    id:         m.id,
    date:       m.date,
    opponent:   oppMap[m.opponent_id] ?? 'Opponent',
    result:     m.our_sets_won > m.opp_sets_won ? 'W' : 'L',
    ourSets:    m.our_sets_won ?? 0,
    oppSets:    m.opp_sets_won ?? 0,
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    team: {
      id:         teamId,
      name:       team?.name ?? '',
      seasonYear: activeSeason?.year ?? new Date().getFullYear(),
      wins,
      losses,
    },
    teamStats: {
      kills:   teamStats.k   ?? 0,
      aces:    teamStats.ace ?? 0,
      digs:    teamStats.dig ?? 0,
      blocks:  (teamStats.bs ?? 0) + (teamStats.ba ?? 0),
      assists: teamStats.ast ?? 0,
    },
    players,
    matches: matchRows,
    updatedAt: new Date().toISOString(),
  };
}
