import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PLAN_PRICES, PLAN_LABELS, SEASON_MATCH_LIMIT } from '../hooks/usePlan';

const PLANS = [
  { key: '1_team',      teams: 1,  highlight: false },
  { key: '2_teams',     teams: 2,  highlight: true  },
  { key: '3_teams',     teams: 3,  highlight: false },
  { key: '4_teams',     teams: 4,  highlight: false },
  { key: '5plus_teams', teams: 99, highlight: false },
];

const ALL_FEATURES = [
  'Full live match stat entry',
  'Complete analytics & reports',
  'Career records & season history',
  'Opponent scouting & tracking',
  'Rotation optimizer',
  'Practice tools (serve tracker, serve receive, practice games)',
  'FamilyScope live sharing',
  'PDF, CSV & MaxPreps export',
  `${SEASON_MATCH_LIMIT} matches per team per season`,
];

export function UpgradePage() {
  const { profile, refreshProfile } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentPlan = profile?.plan ?? 'inactive';
  const successPlan = searchParams.get('plan');
  const didSucceed  = searchParams.get('success') === '1';
  const didCancel   = searchParams.get('canceled') === '1';

  // Fix 5: Poll until the webhook has landed and the plan matches, instead of
  // refreshing once immediately (webhook delivery can lag the redirect by 5-30s)
  useEffect(() => {
    if (!didSucceed || !successPlan) return;

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    async function checkPlan() {
      if (cancelled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', session.user.id)
        .single();
      if (data?.plan === successPlan || attempts >= MAX_ATTEMPTS) {
        if (!cancelled) refreshProfile();
      } else {
        attempts++;
        setTimeout(checkPlan, 2000);
      }
    }

    checkPlan();
    return () => { cancelled = true; };
  }, [didSucceed, successPlan]);

  async function handleUpgrade(planKey) {
    setError('');
    setLoadingPlan(planKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
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

  const currentLabel = PLAN_LABELS[currentPlan];

  return (
    <div className="pb-safe-bottom">
      <PageHeader title="Get VBSTAT" />

      <div className="p-4 max-w-lg mx-auto flex flex-col gap-5">

        {/* Success / cancel banners */}
        {didSucceed && successPlan && (
          <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl px-4 py-3 text-sm text-emerald-300 font-semibold text-center">
            You&rsquo;re all set on {PLAN_LABELS[successPlan] ?? successPlan}. Let&rsquo;s go!
          </div>
        )}
        {didCancel && (
          <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-400 text-center">
            No problem — you can subscribe any time.
          </div>
        )}

        {/* Current plan */}
        {currentLabel && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Current plan:</span>
            <span className="text-sm font-bold text-primary">{currentLabel} / season</span>
          </div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* What's included — shared across all plans */}
        <div className="bg-slate-800/60 rounded-xl p-4">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
            Everything included
          </div>
          <ul className="flex flex-col gap-1.5">
            {ALL_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-emerald-400 mt-px leading-none shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Plan cards — only differ by team count and price */}
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Choose your team count
        </div>

        {PLANS.map((plan) => {
          const owned   = currentPlan === plan.key;
          const loading = loadingPlan === plan.key;
          const disabled = loadingPlan !== null && !loading;
          const teamsLabel = plan.teams === 99 ? '5+ Teams' : `${plan.teams} Team${plan.teams > 1 ? 's' : ''}`;

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
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-black text-white">{teamsLabel}</div>
                  <div className="text-xs text-slate-400 mt-0.5">per season</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-black text-white">{PLAN_PRICES[plan.key]}</div>
                </div>
              </div>
              <div className="px-4 pb-4">
                {owned ? (
                  <div className="w-full rounded-xl bg-slate-700 py-2.5 text-sm font-bold text-slate-400 text-center">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={disabled || loading}
                    className={`w-full rounded-xl py-2.5 text-sm font-black tracking-wide transition-all active:scale-[0.97] disabled:opacity-50 ${
                      plan.highlight
                        ? 'bg-primary text-white'
                        : 'bg-slate-700 text-white hover:bg-slate-600'
                    }`}
                  >
                    {loading ? 'Redirecting…' : `Subscribe — ${PLAN_PRICES[plan.key]}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <p className="text-xs text-slate-500 text-center pb-2">
          One-time payment per season. Payments processed by Stripe — no card data touches our servers.
        </p>
      </div>
    </div>
  );
}
