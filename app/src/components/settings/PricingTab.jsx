import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan, PLAN_PRICES, PLAN_LABELS } from '../../hooks/usePlan';
import { ALL_FEATURES } from '../../utils/planLimits';
import { startPlanCheckout } from '../../utils/checkout';
import { supabase } from '../../utils/supabase';
import { useUiStore } from '../../store/uiStore';

export function PricingTab() {
  const navigate = useNavigate();
  const showToast = useUiStore((s) => s.showToast);
  const { session, profile, refreshProfile } = useAuth();
  const { plan, isActive, isMaster, expiresAt, daysUntilExpiry, teamsAllowed } = usePlan();

  const [promoCode,    setPromoCode]    = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState(null);

  async function handleRedeemPromo() {
    const code = promoCode.trim();
    if (!code) return;
    setPromoLoading(true);
    try {
      const { data, error } = await supabase.rpc('redeem_promo_code', { p_code: code });
      if (error) throw error;
      if (data?.error) {
        const msgs = {
          invalid_code:     'That code is not valid.',
          code_expired:     'That code has expired.',
          code_exhausted:   'That code has already been fully redeemed.',
          already_redeemed: 'You have already redeemed this code.',
          not_authenticated:'You must be logged in to redeem a code.',
        };
        showToast(msgs[data.error] ?? 'Invalid code.', 'error');
      } else {
        setPromoCode('');
        refreshProfile();
        showToast('Code applied! Your plan is now active.', 'success');
      }
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setPromoLoading(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      window.location.href = json.url;
    } catch (e) {
      showToast(e.message ?? 'Could not open billing portal', 'error');
    } finally {
      setPortalLoading(false);
    }
  }

  async function handlePlanCheckout(planKey) {
    setCheckoutPlan(planKey);
    try {
      await startPlanCheckout(session, planKey);
    } catch (e) {
      showToast(e.message ?? 'Checkout failed', 'error');
      setCheckoutPlan(null);
    }
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <p className="text-sm text-slate-400 leading-relaxed text-center">
        Every account starts with a free 5-match trial with full platform access — 1 team, up to 5 matches, no import features. Plans below are one-time, per-season purchases — Vantage does not offer subscriptions.
      </p>
      {isMaster ? null : isActive ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 text-lg font-black">✓</span>
            <div>
              <div className="text-sm font-bold text-white">
                {teamsAllowed === 99 ? 'Unlimited Teams' : `${teamsAllowed} Team${teamsAllowed > 1 ? 's' : ''}`} / Season
              </div>
              <div className="text-xs text-slate-400">
                All features included · 50 matches/season
                {expiresAt && ` · Expires ${expiresAt.toLocaleDateString()}`}
              </div>
            </div>
          </div>
          {daysUntilExpiry != null && daysUntilExpiry <= 30 && (
            <div className="flex items-center justify-between gap-3 bg-amber-900/30 border border-amber-600/40 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-amber-400 shrink-0">⚠</span>
                <p className="text-xs text-amber-300 font-semibold">
                  {`Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                onClick={() => navigate('/upgrade')}
                className="text-xs font-bold text-primary hover:text-orange-300 transition-colors shrink-0"
              >
                Renew →
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {!!profile?.plan_expires_at && (
            <div className="flex items-center justify-between gap-3 bg-amber-900/30 border border-amber-600/40 rounded-xl px-3 py-2.5 mt-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-amber-400 shrink-0">⚠</span>
                <p className="text-xs text-amber-300 font-semibold">Your plan has expired</p>
              </div>
              <button
                onClick={() => navigate('/upgrade')}
                className="text-xs font-bold text-primary hover:text-orange-300 transition-colors shrink-0"
              >
                Renew →
              </button>
            </div>
          )}
        </>
      )}

      {/* Pricing table */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Options</p>
        <div className="rounded-xl overflow-hidden border border-slate-700 divide-y divide-slate-700">
          {isMaster && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-yellow-400/10">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-xs font-black">★</span>
                <span className="text-sm font-semibold text-yellow-300">Master Account</span>
                <span className="text-xs text-slate-500">· ∞ teams · ∞ matches/season</span>
              </div>
              <span className="text-sm font-bold text-yellow-400">Unlimited</span>
            </div>
          )}
          <div className={`flex items-center justify-between px-3 py-2.5 ${plan === 'trial' && !isMaster ? 'bg-primary/10' : 'bg-slate-800/40'}`}>
            <div className="flex items-center gap-2">
              {plan === 'trial' && !isMaster && <span className="text-primary text-xs font-black">✓</span>}
              <span className={`text-sm font-semibold ${plan === 'trial' && !isMaster ? 'text-primary' : 'text-slate-300'}`}>Trial</span>
              <span className="text-xs text-slate-500">- 1 Team max, 5 match max</span>
            </div>
            <span className={`text-sm font-bold ${plan === 'trial' && !isMaster ? 'text-primary' : 'text-slate-300'}`}>FREE</span>
          </div>
          {Object.entries(PLAN_LABELS).filter(([key]) => key !== 'trial').map(([key, label]) => {
            const isCurrent = plan === key && !isMaster;
            const isLoading = checkoutPlan === key;
            const clickDisabled = isMaster || isCurrent || (checkoutPlan !== null && !isLoading);
            return (
              <button
                key={key}
                type="button"
                onClick={() => handlePlanCheckout(key)}
                disabled={clickDisabled}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                  isCurrent ? 'bg-primary/10' : 'bg-slate-800/40 enabled:hover:bg-slate-700/60 enabled:active:bg-slate-700'
                } disabled:cursor-default`}
              >
                <div className="flex items-center gap-2">
                  {isCurrent && <span className="text-primary text-xs font-black">✓</span>}
                  <span className={`text-sm font-semibold ${isCurrent ? 'text-primary' : 'text-slate-300'}`}>{label}</span>
                  <span className="text-xs text-slate-500">- 50 matches per team, per 1 season</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-sm font-bold ${isCurrent ? 'text-primary' : 'text-slate-300'}`}>{PLAN_PRICES[key]}<span className="text-xs font-normal text-slate-500">/yr</span></span>
                  {isCurrent ? (
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Current</span>
                  ) : isLoading ? (
                    <span className="text-xs text-slate-500">Redirecting…</span>
                  ) : !isMaster ? (
                    <span className="text-slate-500">›</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
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
      </div>

      {!isMaster && (
        <button
          onClick={() => navigate('/upgrade')}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 text-white font-black text-sm transition-all duration-150"
        >
          {isActive ? 'Change Plan' : 'Subscribe'}
        </button>
      )}

      {profile?.stripe_customer_id && (
        <button
          onClick={handleManageBilling}
          disabled={portalLoading}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 active:scale-95 border border-slate-600/50 text-slate-300 hover:text-white font-semibold text-sm transition-all duration-150 disabled:opacity-50"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          {portalLoading ? 'Opening…' : 'Manage Billing'}
        </button>
      )}

      {session && !isMaster && (
        <div className="border-t border-slate-700 pt-3 mt-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Redeem Code</p>
          <p className="text-xs text-slate-400 mb-3">Have a promo code? Enter it below to activate your plan.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleRedeemPromo()}
              placeholder="ENTER CODE"
              className="flex-1 bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono tracking-widest uppercase placeholder:text-slate-600 focus:outline-none focus:border-primary"
              maxLength={32}
            />
            <button
              onClick={handleRedeemPromo}
              disabled={promoLoading || !promoCode.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
            >
              {promoLoading ? '…' : 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
