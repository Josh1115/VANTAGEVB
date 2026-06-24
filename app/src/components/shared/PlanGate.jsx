import { usePlan } from '../../hooks/usePlan';
import { UpgradePrompt } from './UpgradePrompt';

// requires: 'active'|'core' (any non-inactive plan), 'paid' (purchased), 'master'
export function PlanGate({ feature, requires = 'active', children }) {
  const { has } = usePlan();
  if (has(requires)) return children;
  return <UpgradePrompt feature={feature} />;
}
