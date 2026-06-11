import { usePlan } from '../../hooks/usePlan';
import { UpgradePrompt } from './UpgradePrompt';

export function PlanGate({ feature, children }) {
  const { has } = usePlan();
  if (has()) return children;
  return <UpgradePrompt feature={feature} />;
}
