import { useEffect, useRef, useState } from 'react';
import { VantageLogo } from '../ui/VantageLogo';
import { NetDivider } from '../ui/NetDivider';
import { supabase, trackPageView } from '../../utils/supabase';
import { router } from '../../router';

function friendlyAuthError(msg) {
  if (!msg) return 'Something went wrong. Please try again.';
  // Never expose raw JWTs or Bearer tokens to the user
  if (/^Bearer/i.test(msg) || /^ey[A-Za-z0-9_-]{10,}\.ey/.test(msg)) {
    return 'Authentication service error. Please try again or contact vantagevb@gmail.com.';
  }
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password.';
  if (/email not confirmed/i.test(msg))        return 'Please confirm your email before logging in.';
  if (/too many requests/i.test(msg))          return 'Too many attempts. Please wait a moment and try again.';
  if (/network/i.test(msg) || /fetch/i.test(msg)) return 'Network error. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}

export function LoginPage({ onSignup }) {
  const [phase,      setPhase]      = useState(0);
  const [showForm,   setShowForm]   = useState(false);
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [forgotSent,   setForgotSent]   = useState(false);
  const [pricingOpen,  setPricingOpen]  = useState(true);
  const passRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = 'Vantage: Immediate Impact Analytics';
    trackPageView('login');
  }, []);

  useEffect(() => {
    if (showForm) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [showForm]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(p => Math.max(p, 1)), 80);
    const t2 = setTimeout(() => setPhase(p => Math.max(p, 2)), 80 + 1350);
    const t3 = setTimeout(() => setPhase(p => Math.max(p, 3)), 80 + 1350 + 400);
    const t4 = setTimeout(() => setPhase(p => Math.max(p, 4)), 80 + 1350 + 800);
    const t5 = setTimeout(() => setPhase(p => Math.max(p, 5)), 80 + 1350 + 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  async function handleLogin() {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      setError(friendlyAuthError(error.message));
      setLoading(false);
    } else {
      router.navigate('/', { replace: true });
    }
  }

  async function handleForgot() {
    if (!email.trim()) { setError('Enter your email above first.'); return; }
    setError('');
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    setForgotSent(true);
  }

  const inp = 'w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 px-5 py-4 text-lg text-white placeholder-slate-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div
      className="min-h-screen bg-slate-950 flex flex-col items-center px-8 animate-fade-in"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 3.5rem)' }}
    >
      <div className="flex flex-col items-center w-full max-w-sm flex-1">

        {/* Brandmark */}
        <div className="flex flex-col items-center gap-5 w-full">
          {/* Mobile: fill container width to avoid viewport clipping */}
          <div
            className="md:hidden w-full"
            style={{ opacity: phase >= 1 ? 1 : 0, transition: 'opacity 1.3s ease' }}
          >
            <VantageLogo
              animated={phase >= 2}
              svgStyle={{ width: '100%', height: 'auto' }}
            />
          </div>
          {/* Desktop: scale 2x — wide enough that overflow doesn't clip */}
          <div
            className="hidden md:block"
            style={{
              opacity: phase >= 1 ? 1 : 0,
              transition: 'opacity 1.3s ease',
              transform: 'scale(2)',
              transformOrigin: 'top center',
              marginBottom: '5.5rem',
            }}
          >
            <VantageLogo animated={phase >= 2} />
          </div>
          <p className="text-2xl font-semibold tracking-[0.25em] text-slate-400 flex flex-col items-center gap-1 md:flex-row md:gap-3">
            {['IMMEDIATE', 'IMPACT', 'ANALYTICS'].map((word, i) => (
              <span
                key={word}
                style={{ opacity: phase >= i + 2 ? 1 : 0, transition: 'opacity 0.6s ease' }}
              >
                {word}
              </span>
            ))}
          </p>
          {/* Buttons */}
          <div
            className="w-full flex flex-col gap-4 mt-6"
            style={{ opacity: phase >= 2 ? 1 : 0, transition: 'opacity 0.8s ease' }}
          >
          {!showForm ? (
            <>
              <button
                onClick={() => setShowForm(true)}
                className="relative overflow-hidden w-full rounded-2xl bg-primary py-3 text-[18.4px] leading-none font-black text-white tracking-wide active:scale-[0.97] transition-transform btn-shimmer"
              >
                LOG IN
              </button>
              <button
                onClick={onSignup}
                className="w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 py-3 text-[18.4px] leading-none font-black tracking-wide active:scale-[0.97] transition-transform"
                style={{ color: '#f97316', WebkitTextStroke: '1.5px rgba(255,255,255,0.6)', paintOrder: 'stroke fill' }}
              >
                SIGN UP
              </button>
              {/* ── Pricing ── */}
              <div className="w-full rounded-2xl border border-slate-700 overflow-hidden">
                <button
                  onClick={() => setPricingOpen(o => !o)}
                  className="w-full relative overflow-hidden flex items-center justify-center px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors btn-shimmer"
                >
                  <span className="text-sm font-bold text-white tracking-wide">VIEW PRICING PLANS</span>
                  <svg
                    className="w-4 h-4 text-slate-400 transition-transform duration-300 absolute right-4"
                    style={{ transform: pricingOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {pricingOpen && (
                  <div className="px-4 pb-4 pt-3 bg-slate-900/60 space-y-2">
                    {/* Trial */}
                    <div className="rounded-xl border border-slate-700 px-3 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">Trial</p>
                        <p className="text-xs text-slate-400">1 team · 5 matches</p>
                      </div>
                      <span className="text-sm font-black" style={{ color: '#f97316' }}>FREE</span>
                    </div>
                    {[
                      { label: '1 Team',   price: '$79.99',  desc: '1 team · 50 matches/season' },
                      { label: '2 Teams',  price: '$139.99', desc: '2 teams · 50 matches/season each' },
                      { label: '3 Teams',  price: '$189.99', desc: '3 teams · 50 matches/season each' },
                      { label: '4 Teams',  price: '$229.99', desc: '4 teams · 50 matches/season each' },
                      { label: '5+ Teams', price: '$259.99', desc: 'Unlimited teams · 50 matches/season each' },
                    ].map(({ label, price, desc }) => (
                      <div key={label} className="rounded-xl border border-slate-700 px-3 py-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">{label}</p>
                          <p className="text-xs text-slate-400">{desc}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-black" style={{ color: '#f97316' }}>{price}</p>
                          <p className="text-[10px] text-slate-500">/year</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 text-center -mt-2">
                Ready to purchase?{' '}
                <a href="mailto:vantagevb@gmail.com" className="underline text-slate-400 hover:text-slate-300 transition-colors">vantagevb@gmail.com</a>
              </p>

              <p className="text-center text-sm rounded-xl px-4 py-2" style={{ color: '#fbbf24', border: '1px solid rgba(249,115,22,0.5)', background: 'rgba(249,115,22,0.1)' }}>
                Experiencing technical difficulties?{' '}
                <a href="mailto:vantagevb@gmail.com" className="underline font-bold">vantagevb@gmail.com</a>
              </p>
              <div className="w-full">
                <NetDivider className="mt-2" />
              </div>
              <h2
                className="text-[36.8px] font-black uppercase leading-none tracking-[0.15em] text-center"
                style={{ color: '#ffffff' }}
              >
                ELEVATE TO YOUR VANTAGE
              </h2>
              <img src="/icons/logo_vec2.png" alt="Vantage logo" className="mx-auto mt-4" style={{ width: '40%' }} />

              {/* ── Feature Card: Live Stat View ── */}
              <div className="w-full mt-6">
                <p
                  className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white"
                >
                  VANTAGE POINT <span className="font-normal normal-case tracking-normal">— Live Stat Phase</span>
                </p>
                <img src="/screenshots/vantagepoint.png" alt="Vantage Point live stat tracking" className="w-full rounded-xl" />

                <p className="text-sm text-slate-400 mt-3">
                  Vantage Point (VP) allows you to seamlessly track every aspect on the court. Tag each kill, ace, block, and dig with more detail than ever. As data is logged, Vantage provides you Immediate Impact Analytics to make the most informed coaching decisions.
                </p>
              </div>
              {/* ── Feature Card: Oppo Scoring Bar ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  OPPONENT SCORING BAR
                </p>
                <img loading="lazy" src="/screenshots/OppoBar.png" alt="Opponent Scoring Bar" className="rounded-xl mx-auto block" style={{ width: '20%' }} />

                <p className="text-sm text-slate-400 mt-3">
                  Track how your opponent scores. How does your opponent score their points? The Opponent Scoring Bar vertically integrates to the right side of the screen, allowing the user to define if an opponent won the point by Kill, Serving Error, Attacking Error, Ball Handling Error, Net/Under Violation, or Rotation Overlapping Violation. Additionally, the app intuitively awards the opponent an ACE when the home team obtains a 0 rating in serve receive. Now coaches can see how their roster 'Earns', 'Gives', and are awarded 'Free' points from opponent errors.
                </p>
              </div>

              {/* ── Feature Card: Earned vs Free vs Given ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  EARNED vs FREE vs GIVEN
                </p>
                <img loading="lazy" src="/screenshots/Earned vs Free vs Given.png" alt="Earned vs Free vs Given" className="w-full rounded-xl" />

                <p className="text-sm text-slate-400 mt-3">
                  Every point your team scores falls into one of three categories. Points your team Earns through kills and aces. Points Given away through your own errors. And Free points — gifts from opponent mistakes. Vantage breaks down every point so you know exactly how your team is winning and where they're leaving points on the court.
                </p>
              </div>

              {/* ── Feature Card: Run Bar Indicator ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  RUN BAR INDICATOR
                </p>
                <img loading="lazy" src="/screenshots/RunBar.png" alt="Run Bar Indicator" className="w-full rounded-xl" />

                <p className="text-sm text-slate-400 mt-3">
                  See momentum shift in real time. The Run Bar Indicator tracks every point of the set visually — color-coded by team — so you can instantly spot scoring runs, identify which rotations are leaking points, and know when to call a timeout before a run gets out of hand.
                </p>
              </div>

              {/* ── Feature Card: HUD Stats — Team + Player ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  LIVE TEAM & PLAYER STATS IN HUD
                </p>
                <p className="text-sm text-slate-400 mb-3">
                  Keep your finger on the pulse of every player and the team as a whole — without breaking your tracking rhythm. Stay in the play and get a sense of how the team and your players are performing!
                </p>
                <img loading="lazy" src="/screenshots/Live Team Stats.png" alt="Live team stats HUD" className="w-full rounded-xl" />
                <p className="text-sm text-slate-400 mt-3 mb-3">
                  The live team stats are neatly kept on the Run Bar so the user can always have a sense of how the entire line is performing.
                </p>
                <img loading="lazy" src="/screenshots/Live Player Stats.png" alt="Live player stats HUD" className="w-full rounded-xl" />
                <p className="text-sm text-slate-400 mt-3">
                  Additionally, Vantage Point provides all players' stats on the court so you can make substitutions and in-game adjustments backed by real numbers, not gut feel.
                </p>
              </div>

              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  SET WIN PROBABILITY
                </p>
                <img loading="lazy" src="/screenshots/Win Prob.png" alt="Set Win Probability" className="w-full rounded-xl" />

                <p className="text-sm text-slate-400 mt-3">
                  After every rally, Vantage recalculates your team's probability of winning the set — powered by your historical serve receive win percentage, serve point win percentage, and live score differential. Watch the needle move in real time and know exactly when momentum is on your side.
                </p>
              </div>

              {/* ── Feature Card: Serve Stat Detail ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  SERVE STAT DETAIL
                </p>
                <div className="flex flex-col gap-2">
                  <img loading="lazy" src="/screenshots/Serve Type.png" alt="Serve type selection" className="w-full rounded-xl" />
                  <img loading="lazy" src="/screenshots/Serve Error.png" alt="Serve error classification" className="w-full rounded-xl" />
                </div>

                <p className="text-sm text-slate-400 mt-3">
                  Every serve tells a story. Before logging a serve, Vantage prompts you to tag it as a Float or Top — and if it's an error, one more tap specifies whether it went out of bounds, hit the net, or was a foot fault. Over time, these details reveal which serve type earns your team the most aces and exactly where errors are coming from.
                </p>
              </div>

              {/* ── Feature Card: Serve Placement Map ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  SERVE PLACEMENT MAP
                </p>
                <img loading="lazy" src="/screenshots/Service Grid.png" alt="Serve Placement Map" className="w-full rounded-xl" />

                <p className="text-sm text-slate-400 mt-3">
                  After tagging a serve, tap anywhere on the court grid to mark exactly where it landed. Over time, the placement map reveals which zones a player targets most, where they're finding aces, and — critically — which zones of the opponent's court are receiving the ball poorly. Use it to expose weaknesses and put your best servers in position to attack them.
                </p>
              </div>

              {/* ── Feature Card: IS/OOS & Free Ball/Transition by Rotation ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  IN / OUT OF SYSTEM BY ROTATION
                </p>
                <img loading="lazy" src="/screenshots/In vs Out of System.png" alt="In vs Out of System by Rotation" className="w-full rounded-xl" />

                <p className="text-sm text-slate-400 mt-3">
                  Not all opportunities are equal. Vantage breaks down kill percentage by system state — In System when the pass is clean, Out of System when your team is scrambling, and separately tracks Free Ball and Transition kill rates — for every rotation. See which rotations hold up under pressure and which collapse when the pass breaks down, so you can build smarter lineups and target practice exactly where it counts.
                </p>
              </div>

              {/* ── Feature Card: Attack Detail — Kill Type & Errors ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  ATTACK DETAIL — KILL TYPE &amp; ERRORS
                </p>
                <div className="flex flex-col gap-2">
                  <img loading="lazy" src="/screenshots/Kill Details.png" alt="Kill type detail" className="w-full rounded-xl" />
                  <img loading="lazy" src="/screenshots/Attack Error.png" alt="Attack error classification" className="w-full rounded-xl" />
                </div>

                <p className="text-sm text-slate-400 mt-3">
                  Every kill and every error gets tagged. When a player puts the ball away, Vantage lets you log exactly how — a pure swing, a tool off the block, a tip or roll shot, a back row attack, or a touch kill. On the error side, tag whether it went out of bounds, hit the net, got blocked, or was a blocked and recovered attempt. Over a season, this reveals each hitter's tendencies and shows coaches exactly where efficiency is being left on the court.
                </p>
              </div>
              {/* ── Feature Card: VER ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  VANTAGE EFFICIENCY RATING (VER)
                </p>
                <img loading="lazy" src="/screenshots/VER.png" alt="Vantage Efficiency Rating" className="w-full rounded-xl" />

                <p className="text-sm text-slate-400 mt-3">
                  VER is Vantage's composite efficiency metric — a single number that captures how much a player contributes per set played. Kills, aces, blocks, digs, assists, and passing all earn points. Errors cost them. The result is position-adjusted so liberos and defensive specialists can be evaluated fairly alongside attackers. Track VER across a season to identify your most valuable contributors and spot efficiency trends before they show up in the box score.
                </p>
              </div>
              {/* ── Feature Card: Detailed Timeout Screen ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  DETAILED TIMEOUT SCREEN
                </p>
                <svg viewBox="0 0 440 254" className="w-full rounded-xl" style={{ background: '#0f172a' }}>

                  {/* Label strip */}
                  <rect x="0" y="0" width="440" height="12" fill="#1e293b" />
                  <rect x="0" y="0" width="3" height="12" fill="#f97316" />
                  <text x="10" y="9" fill="#64748b" fontSize="6" fontWeight="700" letterSpacing="0.8">VANTAGE POINT · LIVE TIMEOUT SCREEN</text>
                  <rect x="378" y="2" width="54" height="8" rx="2" fill="#f9731620" />
                  <text x="405" y="8.5" fill="#f97316" fontSize="5.5" fontWeight="800" textAnchor="middle">LANDSCAPE</text>

                  {/* Panel divider */}
                  <rect x="286" y="12" width="1.5" height="242" fill="#334155" />

                  {/* ── LEFT PANEL ── */}

                  {/* Header */}
                  <rect x="0" y="12" width="286" height="20" fill="#1e293b" />
                  <text x="8" y="25" fill="#f1f5f9" fontSize="8.5" fontWeight="900">TIMEOUT · SET 2</text>
                  <rect x="148" y="15" width="42" height="14" rx="3" fill="#334155" />
                  <text x="169" y="25" fill="#cbd5e1" fontSize="5.5" fontWeight="700" textAnchor="middle">✏ Whiteboard</text>
                  <rect x="194" y="15" width="34" height="14" rx="3" fill="#f97316" />
                  <text x="211" y="25" fill="#fff" fontSize="6" fontWeight="800" textAnchor="middle">SET 2</text>
                  <rect x="231" y="15" width="34" height="14" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
                  <text x="248" y="25" fill="#64748b" fontSize="6" fontWeight="700" textAnchor="middle">MATCH</text>

                  {/* Team stats strip */}
                  <rect x="0" y="32" width="286" height="24" fill="#0b1120" />
                  <text x="8" y="41" fill="#334155" fontSize="5" fontWeight="700" letterSpacing="0.3">SERVING</text>
                  <text x="8" y="51" fill="#94a3b8" fontSize="5.5" fontWeight="600">14 SA · 2 ACE · 1 SE · 92% SI</text>
                  <text x="114" y="41" fill="#334155" fontSize="5" fontWeight="700" letterSpacing="0.3">ATTACKING</text>
                  <text x="114" y="51" fill="#94a3b8" fontSize="5.5" fontWeight="600">36 TA · 16 K · 4 AE · .333</text>
                  <text x="220" y="41" fill="#334155" fontSize="5" fontWeight="700" letterSpacing="0.3">PASSING</text>
                  <text x="220" y="51" fill="#94a3b8" fontSize="5.5" fontWeight="600">22 PA · 2.4 APR</text>

                  {/* Tab bar */}
                  <rect x="0" y="56" width="286" height="13" fill="#060c14" />
                  {[
                    { label: 'Scoring',   active: true  },
                    { label: 'Insights',  active: false },
                    { label: 'Trends',    active: false },
                    { label: 'Serving',   active: false },
                    { label: 'Passing',   active: false },
                    { label: 'Attacking', active: false },
                    { label: 'VER',       active: false },
                  ].reduce((acc, t, i) => {
                    const x = i === 0 ? 8 : acc[i-1].rx + 8;
                    const w = t.label.length * 4 + 4;
                    return [...acc, { ...t, x, rx: x + w, w }];
                  }, []).map(t => (
                    <g key={t.label}>
                      <text x={t.x} y="66" fill={t.active ? '#f97316' : '#334155'} fontSize="6" fontWeight={t.active ? '800' : '600'}>{t.label}</text>
                      {t.active && <rect x={t.x} y="68" width={t.w} height="1.5" fill="#f97316" rx="0.5" />}
                    </g>
                  ))}

                  {/* Content area */}
                  <rect x="0" y="69" width="286" height="130" fill="#060c14" />

                  {/* EARNED / FREE / GIVEN tiles */}
                  {[
                    { label: 'EARNED', val: 18, sub: 'Kills + Aces', color: '#22c55e', x: 6  },
                    { label: 'FREE',   val: 7,  sub: 'Opp Errors',   color: '#38bdf8', x: 98  },
                    { label: 'GIVEN',  val: 5,  sub: 'Your Errors',   color: '#ef4444', x: 190 },
                  ].map(t => (
                    <g key={t.label}>
                      <rect x={t.x} y="72" width="86" height="36" rx="4" fill="#1e293b" stroke={t.color + '40'} strokeWidth="0.75" />
                      <text x={t.x + 43} y="84" fill={t.color} fontSize="5.5" fontWeight="800" textAnchor="middle" letterSpacing="0.5">{t.label}</text>
                      <text x={t.x + 43} y="100" fill={t.color} fontSize="20" fontWeight="900" textAnchor="middle">{t.val}</text>
                      <text x={t.x + 43} y="107" fill="#475569" fontSize="5" textAnchor="middle">{t.sub}</text>
                    </g>
                  ))}

                  {/* Composition bar */}
                  <text x="6" y="119" fill="#334155" fontSize="5" fontWeight="700" letterSpacing="0.3">POINT COMPOSITION</text>
                  <rect x="6" y="122" width="274" height="7" rx="2" fill="#1e293b" />
                  <rect x="6"   y="122" width="165" height="7" rx="2" fill="#22c55e" opacity="0.7" />
                  <rect x="171" y="122" width="64"  height="7" fill="#38bdf8" opacity="0.7" />
                  <rect x="235" y="122" width="45"  height="7" rx="2" fill="#ef4444" opacity="0.7" />

                  {/* Breakdown rows */}
                  <text x="6" y="140" fill="#334155" fontSize="5" fontWeight="700">EARNED</text>
                  <text x="6" y="151" fill="#64748b" fontSize="5.5">Kills</text>
                  <rect x="30" y="145" width="77" height="6" rx="1.5" fill="#22c55e20" stroke="#22c55e" strokeWidth="0.5" />
                  <text x="111" y="151" fill="#22c55e" fontSize="5.5" fontWeight="800">14</text>
                  <text x="6" y="162" fill="#64748b" fontSize="5.5">Aces</text>
                  <rect x="30" y="156" width="22" height="6" rx="1.5" fill="#22c55e20" stroke="#22c55e" strokeWidth="0.5" />
                  <text x="56" y="162" fill="#22c55e" fontSize="5.5" fontWeight="800">4</text>

                  <text x="148" y="140" fill="#334155" fontSize="5" fontWeight="700">GIVEN</text>
                  <text x="148" y="151" fill="#64748b" fontSize="5.5">Atk Err</text>
                  <rect x="180" y="145" width="27" height="6" rx="1.5" fill="#ef444420" stroke="#ef4444" strokeWidth="0.5" />
                  <text x="211" y="151" fill="#ef4444" fontSize="5.5" fontWeight="800">3</text>
                  <text x="148" y="162" fill="#64748b" fontSize="5.5">Srv Err</text>
                  <rect x="180" y="156" width="18" height="6" rx="1.5" fill="#ef444420" stroke="#ef4444" strokeWidth="0.5" />
                  <text x="202" y="162" fill="#ef4444" fontSize="5.5" fontWeight="800">2</text>

                  {/* Opp breakdown */}
                  <text x="6" y="174" fill="#334155" fontSize="5" fontWeight="700">OPP SCORED AGAINST US</text>
                  <rect x="6" y="177" width="274" height="7" rx="2" fill="#1e293b" />
                  <rect x="6"   y="177" width="82" height="7" rx="2" fill="#ef4444" opacity="0.5" />
                  <rect x="88"  y="177" width="46" height="7" fill="#f97316" opacity="0.5" />
                  <rect x="134" y="177" width="28" height="7" rx="2" fill="#64748b" opacity="0.4" />
                  <text x="47"  y="184" fill="#fca5a5" fontSize="5" textAnchor="middle">OPP K 7</text>
                  <text x="111" y="184" fill="#fb923c" fontSize="5" textAnchor="middle">OUR SE 4</text>
                  <text x="148" y="184" fill="#94a3b8" fontSize="5" textAnchor="middle">ERR 3</text>

                  {/* Timeline */}
                  <rect x="0" y="199" width="286" height="55" fill="#040810" />
                  <text x="8" y="208" fill="#1e293b" fontSize="5.5" fontWeight="700">SET 2 SCORE TIMELINE</text>
                  {(() => {
                    const usD  = [0,1,1,2,2,3,3,3,4,5,6,6,7,7,8,9,10,10,11,12,12,13,14];
                    const oppD = [0,0,1,1,2,2,3,4,4,4,4,5,5,6,6,6,6,7,7,7,8,8,8];
                    const N = usD.length, W = 272, H = 36, x0 = 7, y0 = 213;
                    const sx = (i) => x0 + (i / (N-1)) * W;
                    const sy = (v) => y0 + H - (v / 14) * H;
                    const usC  = usD.map((v, i)  => `${sx(i)},${sy(v)}`).join(' ');
                    const oppC = oppD.map((v, i) => `${sx(i)},${sy(v)}`).join(' ');
                    return (
                      <>
                        <polyline points={usC}  fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />
                        <polyline points={oppC} fill="none" stroke="#475569" strokeWidth="1.2" strokeLinejoin="round" opacity="0.8" />
                        <circle cx={sx(N-1)} cy={sy(14)} r="3"   fill="#f97316" />
                        <circle cx={sx(N-1)} cy={sy(11)} r="2.5" fill="#475569" />
                        <text x={sx(N-1) + 4} cy={sy(14)} y={sy(14) + 2}  fill="#f97316" fontSize="5.5" fontWeight="900">14</text>
                        <text x={sx(N-1) + 4} cy={sy(11)} y={sy(11) + 2}  fill="#94a3b8" fontSize="5.5">11</text>
                      </>
                    );
                  })()}

                  {/* ── RIGHT PANEL ── */}

                  {/* Score */}
                  <text x="364" y="24" fill="#334155" fontSize="5.5" fontWeight="700" textAnchor="middle" letterSpacing="0.5">SET 2 SCORE</text>
                  <text x="340" y="46" fill="#f1f5f9" fontSize="22" fontWeight="900" textAnchor="middle">14</text>
                  <text x="364" y="44" fill="#334155" fontSize="16" textAnchor="middle">–</text>
                  <text x="388" y="46" fill="#64748b" fontSize="22" fontWeight="700" textAnchor="middle">11</text>
                  <text x="364" y="55" fill="#334155" fontSize="5" textAnchor="middle">since last TO: +3 – 0</text>

                  {/* Win probability */}
                  <text x="364" y="65" fill="#334155" fontSize="5.5" fontWeight="700" textAnchor="middle" letterSpacing="0.3">SET WIN PROBABILITY</text>
                  <text x="364" y="83" fill="#22c55e" fontSize="20" fontWeight="900" textAnchor="middle">72%</text>
                  <text x="338" y="92" fill="#475569" fontSize="5.5" textAnchor="middle">SO% 61%</text>
                  <text x="390" y="92" fill="#475569" fontSize="5.5" textAnchor="middle">SP% 54%</text>

                  {/* Last 8 points chips */}
                  <text x="364" y="102" fill="#334155" fontSize="5.5" fontWeight="700" textAnchor="middle">LAST 8 POINTS</text>
                  {[
                    { label: 'K',     ours: true  },
                    { label: 'ACE',   ours: true  },
                    { label: 'K',     ours: true  },
                    { label: 'OPP K', ours: false },
                    { label: 'SE',    ours: false },
                    { label: 'K',     ours: true  },
                    { label: 'BLK',   ours: true  },
                    { label: 'ACE',   ours: true  },
                  ].map((pt, i) => {
                    const col = i % 4;
                    const row = Math.floor(i / 4);
                    const px = 293 + col * 37;
                    const py = 106 + row * 14;
                    return (
                      <g key={i}>
                        <rect x={px} y={py} width="34" height="11" rx="2"
                          fill={pt.ours ? '#05260f' : '#3b0808'}
                          stroke={pt.ours ? '#22c55e40' : '#ef444440'}
                          strokeWidth="0.5" />
                        <text x={px + 17} y={py + 8} fill={pt.ours ? '#4ade80' : '#f87171'} fontSize="5.5" fontWeight="800" textAnchor="middle">{pt.label}</text>
                      </g>
                    );
                  })}

                  {/* Win prob sparkline */}
                  {(() => {
                    const d = [50,52,55,51,54,58,55,52,57,61,64,62,66,68,70,68,72];
                    const W = 140, H = 22, x0 = 293, y0 = 134;
                    const coords = d.map((v, i) => {
                      const cx = x0 + (i / (d.length-1)) * W;
                      const cy = y0 + H - ((v - 50) / 24) * H;
                      return `${cx},${cy}`;
                    }).join(' ');
                    return (
                      <>
                        <text x="293" y="132" fill="#1e293b" fontSize="5.5">Match Win %</text>
                        <text x="433" y="132" fill="#22c55e" fontSize="5.5" fontWeight="800" textAnchor="end">72% ↑</text>
                        <line x1="293" y1={y0 + H/2} x2="433" y2={y0 + H/2} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 2" />
                        <polyline points={coords} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />
                      </>
                    );
                  })()}

                  {/* Rotation */}
                  <text x="364" y="168" fill="#334155" fontSize="5.5" fontWeight="700" textAnchor="middle">R5 · THIS SET</text>
                  <text x="338" y="178" fill="#22c55e" fontSize="7.5" fontWeight="900" textAnchor="middle">SO% 60%</text>
                  <line x1="364" y1="171" x2="364" y2="180" stroke="#1e293b" strokeWidth="0.75" />
                  <text x="390" y="178" fill="#38bdf8" fontSize="7.5" fontWeight="900" textAnchor="middle">SP% 45%</text>

                  {/* Error leader */}
                  <text x="364" y="188" fill="#334155" fontSize="5" textAnchor="middle">ERR LEADER: SARA · 3 (2 AE · 1 SE)</text>

                  {/* Countdown ring — 38 sec remaining */}
                  <circle cx="364" cy="218" r="20" fill="none" stroke="#1e293b" strokeWidth="5" />
                  <circle cx="364" cy="218" r="20"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="125.66"
                    strokeDashoffset="46.07"
                    transform="rotate(-90 364 218)"
                  />
                  <text x="364" y="223" fill="#f1f5f9" fontSize="14" fontWeight="900" textAnchor="middle">38</text>

                  {/* Resume button */}
                  <rect x="308" y="242" width="112" height="10" rx="2.5" fill="#f97316" />
                  <text x="364" y="250" fill="#fff" fontSize="6.5" fontWeight="900" textAnchor="middle" letterSpacing="1">RESUME</text>
                </svg>

                <p className="text-sm text-slate-400 mt-3">
                  The moment you call a timeout, Vantage pulls up a full analytics overlay. The left panel gives you instant access to eleven stat tabs — Scoring, Insights, Trends, Serving, Passing, Attacking, Blocking, Defense, VER, Compare, and Opponent — with a SET/MATCH scope toggle and a live score timeline at the bottom. The right panel surfaces what matters most: current score, set win probability, last eight points broken down by type, match win % trend, rotation SO%/SP%, and an error leader flag. A 60-second countdown ring keeps you on pace, and a built-in court whiteboard lets you draw up a play before you hit Resume.
                </p>
              </div>

              {/* ── Feature Card: Real-Time Win Factors ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  REAL-TIME WIN FACTORS
                </p>
                <img loading="lazy" src="/screenshots/Insights.png" alt="Real-Time Win Factors" className="w-full rounded-xl" />

                <p className="text-sm text-slate-400 mt-3">
                  Vantage continuously compares your live match stats to your season's historical win and loss averages. Twelve key metrics are ranked by win factor — the percentage of your win/loss gap that stat accounts for. Green means you're at win-level performance right now; amber means you're close; red means this metric is tracking closer to your loss average and needs attention. Open it during any timeout to instantly know where to focus.
                </p>
              </div>

              {/* ── Feature Card: Records Tracker ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  INDIVIDUAL, TEAM &amp; PROGRAM RECORDS
                </p>
                <div className="flex flex-col gap-2">
                  <img loading="lazy" src="/screenshots/Team Records 1.png" alt="Team Records tracker" className="w-full rounded-xl" />
                  <img loading="lazy" src="/screenshots/Team Records 2.png" alt="Team Records detail" className="w-full rounded-xl" />
                </div>

                <p className="text-sm text-slate-400 mt-3">
                  Vantage tracks records at every level — individual player personal bests, single-match and single-set team records, and all-time program milestones — all updated in real time as the match unfolds. The moment a player threatens a personal record or a team stat crosses into historic territory, Vantage flags it so you never miss a milestone. Every match, every set, every stat is automatically benchmarked against your program's full history.
                </p>
              </div>

              {/* ── Feature Card: FamilyScope ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  FAMILYSCOPE
                </p>
                <img loading="lazy" src="/screenshots/FamilyScope.png" alt="FamilyScope parent view" className="w-full rounded-xl" />

                <p className="text-sm text-slate-400 mt-3">
                  FamilyScope gives parents and fans a live, read-only view of the match right on their phone — no app download, no account required. Share a QR code or link before tip-off and they'll see the live score, set-by-set results, a real-time action feed updated after every rally, and the full box score. You stay focused on the sideline; they stay connected to every point.
                </p>
              </div>

              {/* ── Feature Card: Teams Page ── */}
              <div className="w-full mt-8">
                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mb-3 text-white">
                  THE TEAMS PAGE
                </p>
                <img loading="lazy" src="/screenshots/Teams Page.png" alt="Teams page" className="w-full rounded-xl" />

                <p className="text-sm text-slate-400 mt-3">
                  Your Teams page is your program's home base. Set up any school, club, or organization with colors and logo, then build out your roster with full player profile cards — position, jersey number, season stats, and VER rating all in one view. The Rotations tab lets you define custom serve receive formations for each of your six rotations. The Practice tab logs serve tracker sessions, serve receive ratings, and practice game scores. And the History tab preserves your all-time roster across every season you've tracked.
                </p>
              </div>

              <h2
                className="text-[36.8px] font-black uppercase leading-none tracking-[0.15em] text-center mt-8"
                style={{ color: '#ffffff' }}
              >
                AND MUCH MORE...!
              </h2>
              <p className="text-sm text-slate-400 text-center mt-6">
                Start your free trial — no credit card required.
              </p>
              <button
                onClick={onSignup}
                className="relative overflow-hidden w-full rounded-2xl bg-primary py-4 text-[18.4px] leading-none font-black text-white tracking-wide active:scale-[0.97] transition-transform btn-shimmer mt-2"
              >
                SIGN UP FREE
              </button>
              <button
                onClick={() => { window.scrollTo(0, 0); setShowForm(true); }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/40 py-3 text-sm font-bold text-slate-400 tracking-wide active:scale-[0.97] transition-transform mb-12"
              >
                Already have an account? Log in
              </button>
            </>
          ) : (
            <div className="w-full flex flex-col gap-4 animate-slide-up-fade">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="Email"
                value={email}
                disabled={loading}
                onChange={e => { setEmail(e.target.value); setError(''); setForgotSent(false); }}
                onKeyDown={e => e.key === 'Enter' && passRef.current?.focus()}
                className={inp}
              />
              <input
                ref={passRef}
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                disabled={loading}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className={inp}
              />

              {error      && <p className="text-sm text-red-400 text-center -mt-1">{error}</p>}
              {forgotSent && <p className="text-sm text-emerald-400 text-center -mt-1">Reset link sent — check your email</p>}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full rounded-2xl bg-primary py-5 text-lg font-black text-white tracking-wide active:scale-[0.97] transition-transform disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Log In'}
              </button>

              <div className="flex justify-between -mt-1">
                <button
                  onClick={() => { setShowForm(false); setError(''); setForgotSent(false); setEmail(''); setPassword(''); }}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleForgot}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>
          )}
        </div>

        </div>{/* end brandmark */}

      </div>
    </div>
  );
}
