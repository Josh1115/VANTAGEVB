import { useAuth } from '../contexts/AuthContext';
import { PLAN_TEAMS, PLAN_PRICES, PLAN_LABELS, TRIAL_MATCH_LIMIT, PLAN_TIER, resolvePlanFromProfile } from '../utils/planLimits';

export { PLAN_TEAMS, PLAN_PRICES, PLAN_LABELS, TRIAL_MATCH_LIMIT, PLAN_TIER, resolvePlanFromProfile };

export function usePlan() {
  const { profile } = useAuth();
  const { plan, isActive, isMaster, teamsAllowed, matchLimit, isExpired, expiresAt } = resolvePlanFromProfile(profile);
  const tier = PLAN_TIER[plan] ?? 0;

  // Accepts a numeric tier (1/2/3) or a string alias:
  //   'active' | 'core' → 1 (any non-inactive plan, including trial)
  //   'paid'            → 2 (purchased plan)
  //   'master'          → 3
  const TIER_ALIAS = { active: 1, core: 1, paid: 2, master: 3 };
  function has(required = 1) {
    const t = typeof required === 'string' ? (TIER_ALIAS[required] ?? 1) : required;
    return tier >= t;
  }

  // Days until expiry — positive integer if expiring in future, null otherwise
  const daysUntilExpiry = (!isExpired && expiresAt)
    ? Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return { plan, isActive, isMaster, teamsAllowed, matchLimit, tier, has, expiresAt: isExpired ? null : expiresAt, daysUntilExpiry };
}
