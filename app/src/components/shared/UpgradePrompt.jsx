import { useNavigate } from 'react-router-dom';

const PLAN_LABEL = { core: 'CORE', advantage: 'ADVANTAGE', topper: 'TOPPER' };

export function UpgradePrompt({ requiredPlan = 'core', feature }) {
  const navigate = useNavigate();
  const label = PLAN_LABEL[requiredPlan] ?? requiredPlan.toUpperCase();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-6">
      <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className="text-slate-400">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-black text-white tracking-wide">
          {label} Plan Required
        </h2>
        <p className="text-sm text-slate-400 max-w-xs">
          {feature
            ? `${feature} is available on the ${label} plan and above.`
            : `This feature is available on the ${label} plan and above.`}
        </p>
      </div>

      <button
        onClick={() => navigate('/upgrade')}
        className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-black tracking-wide active:scale-[0.97] transition-transform"
      >
        Upgrade to {label}
      </button>

      <p className="text-xs text-slate-600">
        Payments processed by Stripe — no card data touches our servers.
      </p>
    </div>
  );
}
