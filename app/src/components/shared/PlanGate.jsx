import { usePlan } from '../../hooks/usePlan';
import { UpgradePrompt } from './UpgradePrompt';

export function PlanGate({ requires = 'core', feature, children }) {
  const { has } = usePlan();
  if (has(requires)) return children;
  return <UpgradePrompt requiredPlan={requires} feature={feature} />;
}
