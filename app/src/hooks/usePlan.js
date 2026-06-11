import { useAuth } from '../contexts/AuthContext';

// Number of teams allowed per plan
export const PLAN_TEAMS = {
  inactive:      0,
  '1_team':      1,
  '2_teams':     2,
  '3_teams':     3,
  '4_teams':     4,
  '5plus_teams': 99,
  master:        99,
};

export const PLAN_PRICES = {
  '1_team':      '$79.99',
  '2_teams':     '$139.99',
  '3_teams':     '$189.99',
  '4_teams':     '$229.99',
  '5plus_teams': '$259.99',
};

export const PLAN_LABELS = {
  '1_team':      '1 Team',
  '2_teams':     '2 Teams',
  '3_teams':     '3 Teams',
  '4_teams':     '4 Teams',
  '5plus_teams': '5+ Teams',
};

export const SEASON_MATCH_LIMIT = 50;

export function usePlan() {
  const { profile } = useAuth();
  const plan = profile?.plan ?? 'inactive';
  const isMaster = plan === 'master';
  const isActive = plan !== 'inactive';
  const teamsAllowed = PLAN_TEAMS[plan] ?? 0;

  function has() {
    return isActive;
  }

  return { plan, isActive, isMaster, teamsAllowed, has };
}
