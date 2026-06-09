import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';

const PLANS = [
  {
    key: 'core',
    label: 'CORE',
    price: '$49.99',
    period: 'per season',
    highlight: false,
    features: [
      'Full analytics suite',
      'Career records & history',
      'Practice tools',
      'Opponent scouting page',
      'Rotation optimizer',
      'Multi-format export (PDF, CSV, MaxPreps)',
      'Standard support',
    ],
  },
  {
    key: 'advantage',
    label: 'ADVANTAGE',
    price: '$89.99',
    period: 'per season',
    highlight: true,
    features: [
      'Everything in CORE',
      'Two levels (JV + Varsity)',
      'Up to 45 matches per team/level',
      'Priority customer support',
    ],
  },
  {
    key: 'topper',
    label: 'TOPPER',
    price: 'TBD',
    period: '',
    highlight: false,
    features: [
      'Everything in ADVANTAGE',
      'Up to 60 matches per team/level',
      'Coming soon — stay tuned',
    ],
  },
];

const PLAN_RANK = { baseline: 0, core: 1, advantage: 2, topper: 3 };

export function UpgradePage() {
  const { session, profile, refreshProfile } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentPlan = profile?.plan ?? 'baseline';
  const successPlan = searchParams.get('plan');
  const didSucceed  = searchParams.get('success') === '1';
  const didCancel   = searchParams.get('canceled') === '1';

  useEffect(() => {
    if (didSucceed && successPlan) {
      refreshProfile();
    }
  }, [didSucceed, successPlan]);

  async function handleUpgrade(planKey) {
    setError('');
    setLoadingPlan(planKey);
    try {
      const { data: { session: fresh } } = await supabase.auth.getSession();
      if (!fresh) throw new Error('Not signed in');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${fresh.access_token}`,
          },
          body: JSON.stringify({ plan: planKey }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Checkout failed');

      window.location.href = json.url;
    } catch (err) {
      setError(err.message);
      setLoadingPlan(null);
    }
  }

  return (
    <div className="pb-safe-bottom">
      <PageHeader title="Upgrade Plan" />

      <div className="p-4 max-w-lg mx-auto flex flex-col gap-6">

        {/* Success / cancel banners */}
        {didSucceed && successPlan && (
          <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl px-4 py-3 text-sm text-emerald-300 font-semibold text-center">
            You're now on {successPlan.toUpperCase()}. Enjoy the upgrade!
          </div>
        )}
        {didCancel && (
          <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-400 text-center">
            No problem — you can upgrade any time.
          </div>
        )}

        {/* Current plan badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Current plan:</span>
          <span className="text-sm font-bold text-primary uppercase">{currentPlan}</span>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Plan cards */}
        {PLANS.map((plan) => {
          const owned    = PLAN_RANK[currentPlan] >= PLAN_RANK[plan.key];
          const loading  = loadingPlan === plan.key;
          const disabled = loadingPlan !== null && !loading;
          const isTopper = plan.key === 'topper';

          return (
            <div
              key={plan.key}
              className={`rounded-xl border overflow-hidden ${
                plan.highlight
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-700 bg-surface'
              }`}
            >
              {plan.highlight && (
                <div className="bg-primary text-white text-[10px] font-black tracking-widest text-center py-1">
                  MOST POPULAR
                </div>
              )}
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-black text-white">{plan.label}</span>
                  <div className="text-right">
                    <span className="text-lg font-black text-white">{plan.price}</span>
                    {plan.period && (
                      <span className="text-xs text-slate-400 ml-1">{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="flex flex-col gap-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-emerald-400 mt-px leading-none">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {owned ? (
                  <div className="w-full rounded-xl bg-slate-700 py-3 text-sm font-bold text-slate-400 text-center">
                    Current Plan
                  </div>
                ) : isTopper ? (
                  <div className="w-full rounded-xl bg-slate-800 border border-slate-700 py-3 text-sm font-bold text-slate-500 text-center">
                    Coming Soon
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={disabled || loading}
                    className={`w-full rounded-xl py-3 text-sm font-black tracking-wide transition-all active:scale-[0.97] ${
                      plan.highlight
                        ? 'bg-primary text-white'
                        : 'bg-slate-700 text-white hover:bg-slate-600'
                    } disabled:opacity-50`}
                  >
                    {loading ? 'Redirecting…' : `Upgrade to ${plan.label}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <p className="text-xs text-slate-500 text-center pb-2">
          Payments are processed by Stripe. No card data touches our servers.
        </p>
      </div>
    </div>
  );
}
