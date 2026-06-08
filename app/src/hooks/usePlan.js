import { useAuth } from '../contexts/AuthContext';

export const PLAN_RANK = { baseline: 0, core: 1, advantage: 2, topper: 3 };

export function usePlan() {
  const { profile } = useAuth();
  const plan = profile?.plan ?? 'baseline';

  function has(requiredPlan) {
    return (PLAN_RANK[plan] ?? 0) >= (PLAN_RANK[requiredPlan] ?? 0);
  }

  return { plan, has };
}
