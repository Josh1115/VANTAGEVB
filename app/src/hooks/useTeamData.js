import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';

export function useOrganizations() {
  return useLiveQuery(() => db.organizations.orderBy('name').toArray(), []);
}

export function useTeams(orgId) {
  return useLiveQuery(
    () => orgId != null
      ? db.teams.where('org_id').equals(orgId).toArray()
      : db.teams.orderBy('name').toArray(),
    [orgId]
  );
}

export function useTeam(teamId) {
  return useLiveQuery(
    () => teamId != null ? db.teams.get(teamId) : undefined,
    [teamId]
  );
}

// Returns ALL players for a team; filtering active/inactive done in component with useMemo
export function usePlayers(teamId) {
  return useLiveQuery(
    () => teamId != null
      ? db.players.where('team_id').equals(teamId).toArray()
      : [],
    [teamId]
  );
}

export function useSeasons(teamId) {
  return useLiveQuery(
    async () => {
      if (teamId == null) return [];
      const rows = await db.seasons.where('team_id').equals(teamId).sortBy('year');
      return rows.reverse();
    },
    [teamId]
  );
}

