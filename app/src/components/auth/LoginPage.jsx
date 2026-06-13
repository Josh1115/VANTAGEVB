import { useEffect, useRef, useState } from 'react';
import { VantageLogo } from '../ui/VantageLogo';
import { NetDivider } from '../ui/NetDivider';
import { supabase } from '../../utils/supabase';

export function LoginPage({ onSignup }) {
  const [phase,      setPhase]      = useState(0);
  const [showForm,   setShowForm]   = useState(false);
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [logoSvgW,   setLogoSvgW]  = useState(null);
  const passRef = useRef(null);

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
    if (error) setError(error.message);
    setLoading(false);
    // On success, AuthContext onAuthStateChange fires automatically
  }

  async function handleForgot() {
    if (!email.trim()) { setError('Enter your email above first.'); return; }
    setError('');
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    setForgotSent(true);
  }

  const inp = 'w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 px-5 py-4 text-lg text-white placeholder-slate-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all';

  return (
    <div
      className="min-h-screen bg-slate-950 flex flex-col items-center px-8 animate-fade-in"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 3.5rem)' }}
    >
      <div className="flex flex-col items-center w-full max-w-sm flex-1">

        {/* Brandmark */}
        <div className="flex flex-col items-center gap-5 w-full">
          <div
            style={{
              opacity: phase >= 1 ? 1 : 0,
              transition: 'opacity 1.3s ease',
              transform: 'scale(2)',
              transformOrigin: 'top center',
              marginBottom: '5.5rem',
            }}
          >
            <VantageLogo animated={phase >= 2} onMeasure={setLogoSvgW} />
          </div>
          <p className="text-2xl font-semibold tracking-[0.25em] text-slate-400 flex gap-3">
            {['PRECISION', 'SIDELINE', 'ANALYTICS'].map((word, i) => (
              <span
                key={word}
                style={{ opacity: phase >= i + 2 ? 1 : 0, transition: 'opacity 0.6s ease' }}
              >
                {word}
              </span>
            ))}
          </p>
          <p
            className="text-[18px] italic text-slate-500 -mt-[5px]"
            style={{ opacity: phase >= 5 ? 1 : 0, transition: 'opacity 0.8s ease' }}
          >
            Powered by the S.S.E (Shua Stat Engine)
          </p>

          {/* Buttons */}
          <div
            className="w-full flex flex-col gap-4 mt-6"
            style={{ opacity: phase >= 5 ? 1 : 0, transition: 'opacity 0.8s ease' }}
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
              <div className="self-center" style={{ width: logoSvgW ? logoSvgW * 2 : undefined }}>
                <NetDivider className="mt-2" />
              </div>
              <h2
                className="text-[18.4px] font-black uppercase leading-none tracking-[0.15em] text-center section-twinkle"
                style={{ color: '#f97316', WebkitTextStroke: '0.5px rgba(255,255,255,0.6)', paintOrder: 'stroke fill' }}
              >
                FIND YOUR VANTAGE
              </h2>

              {/* ── Feature Card: Live Stat View ── */}
              <div className="w-full mt-6">
                <svg viewBox="0 0 320 240" className="w-full rounded-xl" style={{ background: '#0f172a' }}>
                  {/* Score header */}
                  <rect x="0" y="0" width="320" height="34" fill="#1e293b" />
                  <rect x="0" y="0" width="4" height="34" fill="#f97316" />
                  <text x="16" y="12" fill="#94a3b8" fontSize="7" fontWeight="700" letterSpacing="1.2">SET 2</text>
                  <text x="16" y="26" fill="#f1f5f9" fontSize="13" fontWeight="900">14</text>
                  <text x="34" y="26" fill="#475569" fontSize="11" fontWeight="700">–</text>
                  <text x="42" y="26" fill="#94a3b8" fontSize="13" fontWeight="700">11</text>
                  <text x="90" y="14" fill="#64748b" fontSize="7">LAKE ZURICH</text>
                  <text x="90" y="27" fill="#64748b" fontSize="7">vs LIBERTYVILLE</text>
                  <rect x="250" y="8" width="58" height="18" rx="4" fill="#f9731620" />
                  <circle cx="260" cy="17" r="4" fill="#f97316" />
                  <text x="267" y="21" fill="#f97316" fontSize="8" fontWeight="800">LIVE</text>

                  {/* Court grid — 6 player tiles, 2×3 */}
                  {[
                    { pos: 'S4', jersey: '#7',  name: 'EMMA',  server: false },
                    { pos: 'S3', jersey: '#3',  name: 'SARA',  server: false },
                    { pos: 'S2', jersey: '#11', name: 'AVA',   server: false },
                    { pos: 'S5', jersey: '#15', name: 'JESS',  server: false },
                    { pos: 'S6', jersey: '#4',  name: 'KATE',  server: false },
                    { pos: 'S1', jersey: '#1',  name: 'LEXI',  server: true  },
                  ].map((p, i) => {
                    const col = i % 3;
                    const row = Math.floor(i / 3);
                    const TW = 106, TH = 68;
                    const x = col * TW + 1;
                    const y = 36 + row * TH;
                    return (
                      <g key={p.pos}>
                        <rect x={x} y={y} width={TW - 1} height={TH - 1}
                          fill={p.server ? '#f9731614' : '#1e293b'}
                          stroke={p.server ? '#f97316' : '#334155'}
                          strokeWidth={p.server ? 1.5 : 0.5}
                          rx="5" />
                        <text x={x + 6} y={y + 12} fill={p.server ? '#f97316' : '#64748b'} fontSize="7" fontWeight="700">{p.pos}{p.server ? ' ★' : ''}</text>
                        <text x={x + TW / 2} y={y + 41} fill={p.server ? '#f97316' : '#f1f5f9'} fontSize="14" fontWeight="900" textAnchor="middle">{p.jersey}</text>
                        <text x={x + TW / 2} y={y + 56} fill="#94a3b8" fontSize="7" textAnchor="middle">{p.name}</text>
                      </g>
                    );
                  })}

                  {/* Stat action buttons */}
                  {[
                    { label: 'KILL',  color: '#f97316', x: 8   },
                    { label: 'ACE',   color: '#22c55e', x: 87  },
                    { label: 'DIG',   color: '#38bdf8', x: 166 },
                    { label: 'ERROR', color: '#ef4444', x: 245 },
                  ].map(b => (
                    <g key={b.label}>
                      <rect x={b.x} y={177} width={67} height={22} rx="6" fill={b.color + '22'} stroke={b.color} strokeWidth="0.75" />
                      <text x={b.x + 33.5} y={191} fill={b.color} fontSize="8" fontWeight="800" textAnchor="middle">{b.label}</text>
                    </g>
                  ))}

                  {/* Bottom label strip */}
                  <rect x="0" y="206" width="320" height="34" fill="#0f172a" />
                  <text x="12" y="219" fill="#64748b" fontSize="7" letterSpacing="0.5">RALLY IN PROGRESS</text>
                  <rect x="12" y="224" width="60" height="10" rx="3" fill="#1e293b" />
                  <text x="42" y="232" fill="#94a3b8" fontSize="6" textAnchor="middle">SERVE ZONE</text>
                  <rect x="78" y="224" width="60" height="10" rx="3" fill="#1e293b" />
                  <text x="108" y="232" fill="#94a3b8" fontSize="6" textAnchor="middle">PASS RATING</text>
                  <rect x="144" y="224" width="60" height="10" rx="3" fill="#1e293b" />
                  <text x="174" y="232" fill="#94a3b8" fontSize="6" textAnchor="middle">ATTACK ZONE</text>
                </svg>

                <p
                  className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white"
                >
                  VANTAGE POINT <span className="font-normal normal-case tracking-normal">— Live Stat Phase</span>
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Vantage Point (VP) allows you to seamlessly track every aspect on the court. Tag each kill, ace, block, and dig with more detail than ever. As data is logged, Vantage provides you Precision Sideline Analytics to make the most informed coaching decisions.
                </p>
              </div>
              {/* ── Feature Card: Oppo Scoring Bar ── */}
              <div className="w-full mt-8">
                <svg viewBox="0 0 320 240" className="w-full rounded-xl" style={{ background: '#0f172a' }}>
                  {/* Score header */}
                  <rect x="0" y="0" width="320" height="34" fill="#1e293b" />
                  <rect x="0" y="0" width="4" height="34" fill="#f97316" />
                  <text x="16" y="12" fill="#94a3b8" fontSize="7" fontWeight="700" letterSpacing="1.2">SET 2</text>
                  <text x="16" y="26" fill="#f1f5f9" fontSize="13" fontWeight="900">14</text>
                  <text x="34" y="26" fill="#475569" fontSize="11" fontWeight="700">–</text>
                  <text x="42" y="26" fill="#94a3b8" fontSize="13" fontWeight="700">11</text>
                  <text x="90" y="14" fill="#64748b" fontSize="7">LAKE ZURICH</text>
                  <text x="90" y="27" fill="#64748b" fontSize="7">vs LIBERTYVILLE</text>
                  <rect x="250" y="8" width="58" height="18" rx="4" fill="#f9731620" />
                  <circle cx="260" cy="17" r="4" fill="#f97316" />
                  <text x="267" y="21" fill="#f97316" fontSize="8" fontWeight="800">LIVE</text>

                  {/* Court grid — narrower (left 195px) */}
                  {[
                    { pos: 'S4', jersey: '#7',  name: 'EMMA', server: false },
                    { pos: 'S3', jersey: '#3',  name: 'SARA', server: false },
                    { pos: 'S2', jersey: '#11', name: 'AVA',  server: false },
                    { pos: 'S5', jersey: '#15', name: 'JESS', server: false },
                    { pos: 'S6', jersey: '#4',  name: 'KATE', server: false },
                    { pos: 'S1', jersey: '#1',  name: 'LEXI', server: true  },
                  ].map((p, i) => {
                    const col = i % 3;
                    const row = Math.floor(i / 3);
                    const TW = 64, TH = 80;
                    const x = col * TW + 1;
                    const y = 36 + row * TH;
                    return (
                      <g key={p.pos}>
                        <rect x={x} y={y} width={TW - 1} height={TH - 1}
                          fill={p.server ? '#f9731614' : '#1e293b'}
                          stroke={p.server ? '#f97316' : '#334155'}
                          strokeWidth={p.server ? 1.5 : 0.5}
                          rx="4" />
                        <text x={x + 5} y={y + 12} fill={p.server ? '#f97316' : '#64748b'} fontSize="6.5" fontWeight="700">{p.pos}</text>
                        <text x={x + TW / 2} y={y + 50} fill={p.server ? '#f97316' : '#f1f5f9'} fontSize="13" fontWeight="900" textAnchor="middle">{p.jersey}</text>
                        <text x={x + TW / 2} y={y + 64} fill="#94a3b8" fontSize="6" textAnchor="middle">{p.name}</text>
                      </g>
                    );
                  })}

                  {/* Oppo Scoring Bar — right panel */}
                  <rect x="197" y="35" width="123" height="165" rx="5" fill="#1e293b" stroke="#334155" strokeWidth="0.75" />
                  {/* Panel header */}
                  <rect x="197" y="35" width="123" height="20" rx="5" fill="#ef444418" />
                  <rect x="197" y="45" width="123" height="10" fill="#ef444418" />
                  <text x="259" y="49" fill="#ef4444" fontSize="7.5" fontWeight="800" textAnchor="middle" letterSpacing="1">OPPO SCORING BAR</text>
                  <text x="259" y="62" fill="#94a3b8" fontSize="6.5" textAnchor="middle">LIBERTYVILLE · 11 PTS</text>

                  {/* Per-rotation rows */}
                  {[
                    { rot: 'R1', pts: 3, run: false },
                    { rot: 'R2', pts: 0, run: false },
                    { rot: 'R3', pts: 2, run: false },
                    { rot: 'R4', pts: 4, run: true  },
                    { rot: 'R5', pts: 2, run: false },
                    { rot: 'R6', pts: null, run: false },
                  ].map((r, i) => {
                    const y = 70 + i * 20;
                    const barW = r.pts ? r.pts * 14 : 0;
                    const active = r.pts === null;
                    return (
                      <g key={r.rot}>
                        <text x="206" y={y + 10} fill={active ? '#f97316' : '#64748b'} fontSize="6.5" fontWeight="700">{r.rot}</text>
                        {!active && (
                          <rect x="222" y={y + 2} width={barW} height="11" rx="2.5"
                            fill={r.run ? '#ef444430' : '#33415540'}
                            stroke={r.run ? '#ef4444' : '#475569'}
                            strokeWidth="0.6" />
                        )}
                        {active && (
                          <rect x="222" y={y + 2} width="60" height="11" rx="2.5" fill="#f9731612" stroke="#f97316" strokeWidth="0.6" strokeDasharray="3 2" />
                        )}
                        {r.pts !== null && (
                          <text x={222 + barW + 4} y={y + 10} fill={r.run ? '#ef4444' : '#94a3b8'} fontSize="6.5" fontWeight={r.run ? '800' : '600'}>{r.pts}</text>
                        )}
                        {active && <text x="252" y={y + 10} fill="#f97316" fontSize="6" textAnchor="middle">NOW</text>}
                        {r.run && <text x={222 + barW + 4} y={y + 10} fill="#ef4444" fontSize="6" fontWeight="800"> ★</text>}
                      </g>
                    );
                  })}

                  {/* Run alert */}
                  <rect x="200" y="192" width="117" height="0.5" fill="#334155" />
                  <rect x="202" y="196" width="113" height="14" rx="3" fill="#ef444418" />
                  <text x="259" y="206" fill="#ef4444" fontSize="6.5" fontWeight="800" textAnchor="middle">4-PT RUN — R4</text>
                </svg>

                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white">
                  OPPONENT SCORING BAR
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Track how your opponent scores. How does your opponent score their points? The Opponent Scoring Bar vertically integrates to the right side of the screen, allowing the user to define if an opponent won the point by Kill, Serving Error, Attacking Error, Ball Handling Error, Net/Under Violation, or Rotation Overlapping Violation. Additionally, the app intuitively awards the opponent an ACE when the home team obtains a 0 rating in serve receive. Now coaches can see how their roster 'Earns', 'Gives', and are awarded 'Free' points from opponent errors.
                </p>
              </div>

              {/* ── Feature Card: Earned vs Free vs Given ── */}
              <div className="w-full mt-8">
                <svg viewBox="0 0 320 220" className="w-full rounded-xl" style={{ background: '#0f172a' }}>
                  {/* Header */}
                  <rect x="0" y="0" width="320" height="34" fill="#1e293b" />
                  <rect x="0" y="0" width="4" height="34" fill="#f97316" />
                  <text x="16" y="12" fill="#94a3b8" fontSize="7" fontWeight="700" letterSpacing="1.2">SET 2 · POINT BREAKDOWN</text>
                  <text x="16" y="26" fill="#f1f5f9" fontSize="11" fontWeight="900">LAKE ZURICH  14 – 11</text>

                  {/* Three metric tiles */}
                  {[
                    { label: 'EARNED',  value: '18', sub: 'Kills + Aces',        color: '#22c55e', x: 8   },
                    { label: 'FREE',    value: '7',  sub: 'Opp Errors',          color: '#38bdf8', x: 114 },
                    { label: 'GIVEN',   value: '9',  sub: 'Your Errors',         color: '#ef4444', x: 220 },
                  ].map(t => (
                    <g key={t.label}>
                      <rect x={t.x} y="42" width="92" height="80" rx="7" fill="#1e293b" stroke={t.color + '55'} strokeWidth="1" />
                      <text x={t.x + 46} y="60" fill={t.color} fontSize="7.5" fontWeight="800" textAnchor="middle" letterSpacing="1">{t.label}</text>
                      <text x={t.x + 46} y="100" fill={t.color} fontSize="30" fontWeight="900" textAnchor="middle">{t.value}</text>
                      <text x={t.x + 46} y="114" fill="#64748b" fontSize="6.5" textAnchor="middle">{t.sub}</text>
                    </g>
                  ))}

                  {/* Proportional stacked bar */}
                  <text x="8" y="140" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.5">POINT COMPOSITION</text>
                  <rect x="8" y="145" width="304" height="12" rx="3" fill="#1e293b" />
                  {/* Earned 18/34 = 53% → 161px, Free 7/34 = 21% → 64px, Given 9/34 = 26% → 79px */}
                  <rect x="8"   y="145" width="161" height="12" rx="3" fill="#22c55e" opacity="0.75" />
                  <rect x="169" y="145" width="64"  height="12" fill="#38bdf8" opacity="0.75" />
                  <rect x="233" y="145" width="79"  height="12" rx="3" fill="#ef4444" opacity="0.75" />

                  {/* Breakdown rows */}
                  <text x="8" y="172" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.5">EARNED BREAKDOWN</text>
                  {[
                    { label: 'Kills',  val: 14, color: '#22c55e' },
                    { label: 'Aces',   val: 4,  color: '#22c55e' },
                  ].map((r, i) => (
                    <g key={r.label}>
                      <text x="8"  y={184 + i * 13} fill="#94a3b8" fontSize="7">{r.label}</text>
                      <rect x="50" y={177 + i * 13} width={r.val * 7} height="8" rx="2" fill={r.color + '30'} stroke={r.color} strokeWidth="0.5" />
                      <text x={52 + r.val * 7} y={184 + i * 13} fill={r.color} fontSize="7" fontWeight="800">{r.val}</text>
                    </g>
                  ))}

                  <text x="165" y="172" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.5">GIVEN BREAKDOWN</text>
                  {[
                    { label: 'Svc Err',  val: 4, color: '#ef4444' },
                    { label: 'Atk Err', val: 5, color: '#ef4444' },
                  ].map((r, i) => (
                    <g key={r.label}>
                      <text x="165" y={184 + i * 13} fill="#94a3b8" fontSize="7">{r.label}</text>
                      <rect x="210" y={177 + i * 13} width={r.val * 7} height="8" rx="2" fill={r.color + '30'} stroke={r.color} strokeWidth="0.5" />
                      <text x={212 + r.val * 7} y={184 + i * 13} fill={r.color} fontSize="7" fontWeight="800">{r.val}</text>
                    </g>
                  ))}
                </svg>

                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white">
                  EARNED vs FREE vs GIVEN
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Every point your team scores falls into one of three categories. Points your team Earns through kills and aces. Points Given away through your own errors. And Free points — gifts from opponent mistakes. Vantage breaks down every point so you know exactly how your team is winning and where they're leaving points on the court.
                </p>
              </div>

              {/* ── Feature Card: Run Bar Indicator ── */}
              <div className="w-full mt-8">
                <svg viewBox="0 0 320 210" className="w-full rounded-xl" style={{ background: '#0f172a' }}>
                  {/* Header */}
                  <rect x="0" y="0" width="320" height="34" fill="#1e293b" />
                  <rect x="0" y="0" width="4" height="34" fill="#f97316" />
                  <text x="16" y="12" fill="#94a3b8" fontSize="7" fontWeight="700" letterSpacing="1.2">SET 2 · RUN TRACKER</text>
                  <text x="16" y="26" fill="#f1f5f9" fontSize="11" fontWeight="900">LAKE ZURICH  14 – 11</text>
                  <rect x="250" y="8" width="58" height="18" rx="4" fill="#f9731620" />
                  <circle cx="260" cy="17" r="4" fill="#f97316" />
                  <text x="267" y="21" fill="#f97316" fontSize="8" fontWeight="800">LIVE</text>

                  {/* Section label */}
                  <text x="8" y="50" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">POINT-BY-POINT · SET 2</text>

                  {/* Run bar — each point as a colored block, LZ orange, OPP red */}
                  {/* Sequence: LZ=1, OPP=1, LZ=1, LZ=1, OPP=1, LZ=1, OPP=1, OPP=1, OPP=1, LZ=1, LZ=1, LZ=1, LZ=1, OPP=1, LZ=1, LZ=1, OPP=1, LZ=1, OPP=1, LZ=1, LZ=1, LZ=1, OPP=1, OPP=1, OPP=1 */}
                  {[1,0,1,1,0,1,0,0,0,1,1,1,1,0,1,1,0,1,0,1,1,1,0,0,0].map((lz, i) => (
                    <rect
                      key={i}
                      x={8 + i * 12.2}
                      y="55"
                      width="11"
                      height="18"
                      rx="2.5"
                      fill={lz ? '#f97316' : '#ef4444'}
                      opacity={lz ? 0.85 : 0.7}
                    />
                  ))}

                  {/* LZ label left, OPP label right */}
                  <text x="8"   y="86" fill="#f97316" fontSize="6.5" fontWeight="800">LZ</text>
                  <text x="290" y="86" fill="#ef4444" fontSize="6.5" fontWeight="800" textAnchor="end">OPP</text>

                  {/* Run highlights — bracket annotations */}
                  {/* LZ 4-0 run: points 10-13 (index 9-12), x = 8+9*12.2 = 117.8 to 8+12*12.2+11 = 165.4 */}
                  <rect x="117" y="76" width="50" height="10" rx="3" fill="#f9731622" stroke="#f97316" strokeWidth="0.6" />
                  <text x="142" y="84" fill="#f97316" fontSize="6" fontWeight="800" textAnchor="middle">4-0 RUN ▲</text>

                  {/* OPP 3-0 run: points 7-9 (index 6-8), x = 8+6*12.2=81.2 to 8+8*12.2+11=114.6 */}
                  <rect x="80" y="76" width="36" height="10" rx="3" fill="#ef444422" stroke="#ef4444" strokeWidth="0.6" />
                  <text x="98" y="84" fill="#ef4444" fontSize="6" fontWeight="800" textAnchor="middle">3-0 ▼</text>

                  {/* Divider */}
                  <rect x="8" y="98" width="304" height="0.5" fill="#1e293b" />

                  {/* Run summary cards */}
                  <text x="8" y="112" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">LONGEST RUNS THIS SET</text>
                  {[
                    { team: 'LAKE ZURICH', run: '5-0', start: 'S1', color: '#f97316', x: 8   },
                    { team: 'LIBERTYVILLE', run: '3-0', start: 'S3', color: '#ef4444', x: 164 },
                  ].map(c => (
                    <g key={c.team}>
                      <rect x={c.x} y="117" width="148" height="40" rx="5" fill="#1e293b" stroke={c.color + '44'} strokeWidth="0.75" />
                      <text x={c.x + 10} y="130" fill="#64748b" fontSize="6.5">{c.team}</text>
                      <text x={c.x + 10} y="148" fill={c.color} fontSize="18" fontWeight="900">{c.run}</text>
                      <text x={c.x + 110} y="148" fill="#475569" fontSize="6.5" textAnchor="end">from {c.start}</text>
                    </g>
                  ))}

                  {/* Current run banner */}
                  <rect x="8" y="163" width="304" height="20" rx="4" fill="#f9731618" stroke="#f97316" strokeWidth="0.75" />
                  <text x="160" y="177" fill="#f97316" fontSize="8" fontWeight="900" textAnchor="middle" letterSpacing="0.5">▲ LAKE ZURICH ON A 3-0 RUN</text>

                  {/* Rotation indicator strip */}
                  <text x="8" y="196" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">SCORING BY ROTATION</text>
                  {[
                    { r: 'R1', lz: 3, opp: 2 },
                    { r: 'R2', lz: 1, opp: 0 },
                    { r: 'R3', lz: 2, opp: 2 },
                    { r: 'R4', lz: 4, opp: 4 },
                    { r: 'R5', lz: 2, opp: 2 },
                    { r: 'R6', lz: 2, opp: 1 },
                  ].map((r, i) => (
                    <g key={r.r}>
                      <text x={8 + i * 52} y="207" fill="#64748b" fontSize="6" textAnchor="middle">{r.r} {r.lz}–{r.opp}</text>
                    </g>
                  ))}
                </svg>

                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white">
                  RUN BAR INDICATOR
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  See momentum shift in real time. The Run Bar Indicator tracks every point of the set visually — color-coded by team — so you can instantly spot scoring runs, identify which rotations are leaking points, and know when to call a timeout before a run gets out of hand.
                </p>
              </div>

              {/* ── Feature Card: HUD Stats — Team + Player ── */}
              <div className="w-full mt-8">
                <svg viewBox="0 0 320 250" className="w-full rounded-xl" style={{ background: '#0f172a' }}>
                  {/* Header */}
                  <rect x="0" y="0" width="320" height="34" fill="#1e293b" />
                  <rect x="0" y="0" width="4" height="34" fill="#f97316" />
                  <text x="16" y="12" fill="#94a3b8" fontSize="7" fontWeight="700" letterSpacing="1.2">LIVE HUD · STAT VISIBILITY</text>
                  <text x="16" y="26" fill="#f1f5f9" fontSize="11" fontWeight="900">LAKE ZURICH  14 – 11</text>

                  {/* ── LEFT PANEL: Player Card expanded ── */}
                  <rect x="8" y="40" width="148" height="195" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="0.75" />
                  <text x="82" y="54" fill="#94a3b8" fontSize="6.5" fontWeight="700" textAnchor="middle" letterSpacing="0.8">PLAYER CARD</text>
                  {/* Player tile header */}
                  <rect x="8" y="58" width="148" height="30" rx="6" fill="#f9731618" stroke="#f97316" strokeWidth="1" />
                  <rect x="8" y="70" width="148" height="18" fill="#f9731618" />
                  <text x="82" y="69" fill="#f97316" fontSize="11" fontWeight="900" textAnchor="middle">#3 · SARA</text>
                  <text x="82" y="80" fill="#f97316" fontSize="6.5" textAnchor="middle">S3  ·  OH</text>

                  {/* Player stats grid */}
                  {[
                    { label: 'KILLS',   val: '7',  color: '#22c55e', x: 16,  y: 97  },
                    { label: 'ERRORS',  val: '2',  color: '#ef4444', x: 88,  y: 97  },
                    { label: 'ACES',    val: '1',  color: '#38bdf8', x: 16,  y: 137 },
                    { label: 'DIGS',    val: '5',  color: '#a78bfa', x: 88,  y: 137 },
                    { label: 'BLOCKS',  val: '2',  color: '#fbbf24', x: 16,  y: 177 },
                    { label: 'ATT',     val: '14', color: '#64748b', x: 88,  y: 177 },
                  ].map(s => (
                    <g key={s.label}>
                      <rect x={s.x} y={s.y} width="62" height="32" rx="4" fill="#0f172a" stroke={s.color + '44'} strokeWidth="0.6" />
                      <text x={s.x + 31} y={s.y + 12} fill="#64748b" fontSize="6" textAnchor="middle">{s.label}</text>
                      <text x={s.x + 31} y={s.y + 26} fill={s.color} fontSize="14" fontWeight="900" textAnchor="middle">{s.val}</text>
                    </g>
                  ))}

                  {/* ── RIGHT PANEL: Team stats on Run Bar ── */}
                  <rect x="164" y="40" width="148" height="195" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="0.75" />
                  <text x="238" y="54" fill="#94a3b8" fontSize="6.5" fontWeight="700" textAnchor="middle" letterSpacing="0.8">TEAM STATS</text>

                  {/* Mini run bar */}
                  <text x="172" y="67" fill="#64748b" fontSize="6" letterSpacing="0.5">RUN BAR</text>
                  {[1,0,1,1,0,1,0,0,0,1,1,1,1,0,1,1,0,1,0,1,1,1,0,0,0].map((lz, i) => (
                    <rect key={i} x={172 + i * 5.4} y="70" width="4.8" height="9" rx="1.2"
                      fill={lz ? '#f97316' : '#ef4444'} opacity={lz ? 0.85 : 0.7} />
                  ))}

                  {/* Team stat rows */}
                  {[
                    { label: 'Team Kills',    val: '18', color: '#22c55e' },
                    { label: 'Team Aces',     val: '4',  color: '#38bdf8' },
                    { label: 'Team Digs',     val: '22', color: '#a78bfa' },
                    { label: 'Team Blocks',   val: '3',  color: '#fbbf24' },
                    { label: 'Svc Errors',    val: '4',  color: '#ef4444' },
                    { label: 'Atk Errors',    val: '5',  color: '#ef4444' },
                    { label: 'Kill %',        val: '44%', color: '#f97316' },
                  ].map((s, i) => (
                    <g key={s.label}>
                      <text x="172" y={96 + i * 20} fill="#64748b" fontSize="7">{s.label}</text>
                      <text x="304" y={96 + i * 20} fill={s.color} fontSize="8" fontWeight="900" textAnchor="end">{s.val}</text>
                      <rect x="172" y={99 + i * 20} width="130" height="0.4" fill="#1e293b" />
                    </g>
                  ))}
                </svg>

                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white">
                  LIVE TEAM & PLAYER STATS IN HUD
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Essential stats for team and players fully visible on the HUD. See which players are on fire, and which have cooled off in recent rallies with eye-catching icons. Everything you need, exactly when you need it, with no navigation.
                </p>
              </div>

              {/* ── Feature Card: Set Win Probability ── */}
              <div className="w-full mt-8">
                <svg viewBox="0 0 320 230" className="w-full rounded-xl" style={{ background: '#0f172a' }}>
                  {/* Header */}
                  <rect x="0" y="0" width="320" height="34" fill="#1e293b" />
                  <rect x="0" y="0" width="4" height="34" fill="#f97316" />
                  <text x="16" y="12" fill="#94a3b8" fontSize="7" fontWeight="700" letterSpacing="1.2">SET 2 · WIN PROBABILITY</text>
                  <text x="16" y="26" fill="#f1f5f9" fontSize="11" fontWeight="900">LAKE ZURICH  14 – 11</text>
                  <rect x="250" y="8" width="58" height="18" rx="4" fill="#f9731620" />
                  <circle cx="260" cy="17" r="4" fill="#f97316" />
                  <text x="267" y="21" fill="#f97316" fontSize="8" fontWeight="800">LIVE</text>

                  {/* Big probability dial area */}
                  {/* Arc track background */}
                  <path d="M 60 115 A 100 100 0 0 1 260 115" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
                  {/* Arc fill — 72% of the semicircle */}
                  <path d="M 60 115 A 100 100 0 0 1 248 73" fill="none" stroke="#f97316" strokeWidth="14" strokeLinecap="round" opacity="0.9" />
                  {/* Opponent arc — from right */}
                  <path d="M 260 115 A 100 100 0 0 0 248 73" fill="none" stroke="#ef4444" strokeWidth="14" strokeLinecap="round" opacity="0.6" />

                  {/* Center readout */}
                  <text x="160" y="105" fill="#f97316" fontSize="32" fontWeight="900" textAnchor="middle">72%</text>
                  <text x="160" y="119" fill="#94a3b8" fontSize="7" textAnchor="middle" letterSpacing="0.5">WIN PROBABILITY</text>

                  {/* Team labels on arc ends */}
                  <text x="52"  y="130" fill="#f97316" fontSize="7" fontWeight="800" textAnchor="middle">LZ</text>
                  <text x="268" y="130" fill="#ef4444" fontSize="7" fontWeight="800" textAnchor="middle">OPP</text>

                  {/* Probability trend line */}
                  <text x="8" y="143" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">PROBABILITY TREND · THIS SET</text>
                  {/* Trend sparkline — probability values per rally */}
                  {(() => {
                    const pts = [50,52,55,51,54,58,54,50,47,44,52,58,63,59,65,68,64,70,66,72,75,72,68,70,72];
                    const minP = 44, maxP = 75, W = 304, H = 28, x0 = 8, y0 = 148;
                    const coords = pts.map((p, i) => {
                      const cx = x0 + (i / (pts.length - 1)) * W;
                      const cy = y0 + H - ((p - minP) / (maxP - minP)) * H;
                      return `${cx},${cy}`;
                    });
                    return (
                      <>
                        <polyline points={coords.join(' ')} fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" opacity="0.8" />
                        <line x1="160" y1="148" x2="160" y2="176" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" />
                        <text x="160" y="145" fill="#475569" fontSize="5.5" textAnchor="middle">50%</text>
                      </>
                    );
                  })()}

                  {/* Divider */}
                  <rect x="8" y="182" width="304" height="0.5" fill="#1e293b" />

                  {/* Input factors */}
                  <text x="8" y="194" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">CALCULATED FROM</text>
                  {[
                    { label: 'Srv Receive Win %',  val: '61%', color: '#38bdf8', x: 8   },
                    { label: 'Srv Point Win %',    val: '54%', color: '#a78bfa', x: 110 },
                    { label: 'Score Differential', val: '+3',  color: '#22c55e', x: 212 },
                  ].map(f => (
                    <g key={f.label}>
                      <rect x={f.x} y="198" width="98" height="24" rx="4" fill="#1e293b" stroke={f.color + '44'} strokeWidth="0.6" />
                      <text x={f.x + 49} y="208" fill="#64748b" fontSize="5.5" textAnchor="middle">{f.label}</text>
                      <text x={f.x + 49} y="218" fill={f.color} fontSize="9" fontWeight="900" textAnchor="middle">{f.val}</text>
                    </g>
                  ))}
                </svg>

                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white">
                  SET WIN PROBABILITY
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  After every rally, Vantage recalculates your team's probability of winning the set — powered by your historical serve receive win percentage, serve point win percentage, and live score differential. Watch the needle move in real time and know exactly when momentum is on your side.
                </p>
              </div>

              {/* ── Feature Card: Serve Stat Detail ── */}
              <div className="w-full mt-8">
                <svg viewBox="0 0 320 248" className="w-full rounded-xl" style={{ background: '#0f172a' }}>
                  {/* Header */}
                  <rect x="0" y="0" width="320" height="34" fill="#1e293b" />
                  <rect x="0" y="0" width="4" height="34" fill="#f97316" />
                  <text x="16" y="12" fill="#94a3b8" fontSize="7" fontWeight="700" letterSpacing="1.2">SET 1 · SERVE DETAIL</text>
                  <text x="16" y="26" fill="#f1f5f9" fontSize="11" fontWeight="900">LAKE ZURICH  6 – 4</text>
                  <rect x="250" y="8" width="58" height="18" rx="4" fill="#f9731620" />
                  <circle cx="260" cy="17" r="4" fill="#f97316" />
                  <text x="267" y="21" fill="#f97316" fontSize="8" fontWeight="800">LIVE</text>

                  {/* Server tile badge */}
                  <rect x="8" y="38" width="304" height="22" rx="5" fill="#f9731614" stroke="#f97316" strokeWidth="1" />
                  <text x="18" y="52" fill="#f97316" fontSize="7" fontWeight="800">★ SERVER</text>
                  <text x="160" y="52" fill="#f97316" fontSize="11" fontWeight="900" textAnchor="middle">#1 · LEXI  ·  S1  ·  OH</text>
                  <text x="303" y="52" fill="#f97316" fontSize="7" fontWeight="700" textAnchor="end">Serving</text>

                  {/* Section label: serve type */}
                  <text x="8" y="74" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">SERVE TYPE</text>

                  {/* Serve type + outcome buttons */}
                  {/* FLOAT — selected */}
                  <rect x="8"   y="78" width="66" height="22" rx="4" fill="#064e3b80" stroke="#34d399" strokeWidth="1.2" />
                  <text x="41"  y="93" fill="#34d399" fontSize="8.5" fontWeight="900" textAnchor="middle">FLOAT ●</text>
                  {/* TOP */}
                  <rect x="78"  y="78" width="50" height="22" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="0.75" />
                  <text x="103" y="93" fill="#94a3b8" fontSize="8.5" fontWeight="700" textAnchor="middle">TOP</text>
                  {/* ATT — active since type selected */}
                  <rect x="134" y="78" width="50" height="22" rx="4" fill="#064e3b50" stroke="#34d39955" strokeWidth="0.75" />
                  <text x="159" y="93" fill="#6ee7b7" fontSize="8.5" fontWeight="700" textAnchor="middle">ATT</text>
                  {/* ACE */}
                  <rect x="188" y="78" width="50" height="22" rx="4" fill="#064e3b80" stroke="#34d399" strokeWidth="1" />
                  <text x="213" y="93" fill="#34d399" fontSize="8.5" fontWeight="800" textAnchor="middle">ACE</text>
                  {/* SE */}
                  <rect x="242" y="78" width="70" height="22" rx="4" fill="#450a0a50" stroke="#ef4444" strokeWidth="1" />
                  <text x="277" y="93" fill="#fca5a5" fontSize="8.5" fontWeight="800" textAnchor="middle">SE ▼</text>

                  {/* Divider + cue */}
                  <rect x="8" y="107" width="304" height="0.5" fill="#1e293b" />
                  <text x="160" y="118" fill="#475569" fontSize="6.5" textAnchor="middle">— tap SE to tag the error type —</text>

                  {/* Section label: error */}
                  <text x="8" y="133" fill="#ef4444" fontSize="6.5" fontWeight="700" letterSpacing="0.8">SERVE ERROR — SELECT TYPE</text>

                  {/* Error sub-panel buttons */}
                  {/* × cancel */}
                  <rect x="8"   y="137" width="36" height="22" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="0.75" />
                  <text x="26"  y="152" fill="#94a3b8" fontSize="12" fontWeight="700" textAnchor="middle">×</text>
                  {/* OB */}
                  <rect x="48"  y="137" width="80" height="22" rx="4" fill="#450a0a60" stroke="#ef4444" strokeWidth="1.2" />
                  <text x="88"  y="152" fill="#fca5a5" fontSize="8.5" fontWeight="900" textAnchor="middle">OUT OF BOUNDS</text>
                  {/* NET */}
                  <rect x="132" y="137" width="74" height="22" rx="4" fill="#3b0c1e60" stroke="#f43f5e" strokeWidth="1.2" />
                  <text x="169" y="152" fill="#fda4af" fontSize="8.5" fontWeight="900" textAnchor="middle">IN THE NET</text>
                  {/* FOOT */}
                  <rect x="210" y="137" width="102" height="22" rx="4" fill="#431a0460" stroke="#f59e0b" strokeWidth="1.2" />
                  <text x="261" y="152" fill="#fcd34d" fontSize="8.5" fontWeight="900" textAnchor="middle">FOOT FAULT</text>

                  {/* Divider */}
                  <rect x="8" y="167" width="304" height="0.5" fill="#1e293b" />

                  {/* Serve breakdown tiles */}
                  <text x="8" y="179" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">SEASON SERVE BREAKDOWN</text>

                  {/* Float tile */}
                  <rect x="8" y="183" width="148" height="30" rx="4" fill="#1e293b" stroke="#34d39930" strokeWidth="0.75" />
                  <text x="16" y="195" fill="#34d399" fontSize="7.5" fontWeight="800">FLOAT</text>
                  <text x="72" y="195" fill="#64748b" fontSize="6.5" textAnchor="middle">12 SA</text>
                  <text x="106" y="195" fill="#22c55e" fontSize="6.5" textAnchor="middle">2 ACE</text>
                  <text x="140" y="195" fill="#ef4444" fontSize="6.5" textAnchor="middle">1 SE</text>
                  <text x="16" y="207" fill="#475569" fontSize="6">16.7% ACE rate · 8.3% ERR rate</text>

                  {/* Top tile */}
                  <rect x="164" y="183" width="148" height="30" rx="4" fill="#1e293b" stroke="#818cf830" strokeWidth="0.75" />
                  <text x="172" y="195" fill="#818cf8" fontSize="7.5" fontWeight="800">TOP</text>
                  <text x="228" y="195" fill="#64748b" fontSize="6.5" textAnchor="middle">8 SA</text>
                  <text x="262" y="195" fill="#22c55e" fontSize="6.5" textAnchor="middle">3 ACE</text>
                  <text x="298" y="195" fill="#64748b" fontSize="6.5" textAnchor="middle">0 SE</text>
                  <text x="172" y="207" fill="#475569" fontSize="6">37.5% ACE rate · 0% ERR rate</text>

                  {/* Error breakdown strip */}
                  <rect x="8" y="220" width="304" height="20" rx="4" fill="#1e293b" />
                  <text x="16" y="233" fill="#64748b" fontSize="6.5">Error detail:</text>
                  <text x="74" y="233" fill="#ef4444" fontSize="6.5" fontWeight="800">2 Out of Bounds</text>
                  <text x="166" y="233" fill="#475569" fontSize="6.5">·</text>
                  <text x="172" y="233" fill="#f43f5e" fontSize="6.5" fontWeight="800">1 Net</text>
                  <text x="200" y="233" fill="#475569" fontSize="6.5">·</text>
                  <text x="206" y="233" fill="#f59e0b" fontSize="6.5" fontWeight="800">0 Foot Fault</text>
                </svg>

                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white">
                  SERVE STAT DETAIL
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Every serve tells a story. Before logging a serve, Vantage prompts you to tag it as a Float or Top — and if it's an error, one more tap specifies whether it went out of bounds, hit the net, or was a foot fault. Over time, these details reveal which serve type earns your team the most aces and exactly where errors are coming from.
                </p>
              </div>

              {/* ── Feature Card: Serve Placement Map ── */}
              <div className="w-full mt-8">
                <svg viewBox="0 0 320 248" className="w-full rounded-xl" style={{ background: '#0f172a' }}>
                  {/* Header */}
                  <rect x="0" y="0" width="320" height="34" fill="#1e293b" />
                  <rect x="0" y="0" width="4" height="34" fill="#f97316" />
                  <text x="16" y="12" fill="#94a3b8" fontSize="7" fontWeight="700" letterSpacing="1.2">SERVE PLACEMENT MAP · LEXI #1</text>
                  <text x="16" y="26" fill="#f1f5f9" fontSize="11" fontWeight="900">25 Serves · 4 Aces · 83.3% SI%</text>
                  {/* Legend */}
                  <circle cx="244" cy="17" r="4.5" fill="rgba(52,211,153,0.2)" stroke="#34d399" strokeWidth="1.5" />
                  <text x="253" y="21" fill="#64748b" fontSize="6.5">In Play</text>
                  <text x="284" y="21" fill="#f59e0b" fontSize="10">★</text>
                  <text x="294" y="21" fill="#64748b" fontSize="6.5">Ace</text>

                  {/* Zone backgrounds — heat intensity */}
                  {/* Z1 — hot zone (9 serves) */}
                  <rect x="8"   y="38" width="101" height="77" fill="#f9731614" stroke="#f97316" strokeWidth="0.75" />
                  {/* Z6 — opponent weakness (4 serves) */}
                  <rect x="109" y="38" width="101" height="77" fill="#ef444410" stroke="#ef4444" strokeWidth="0.75" strokeDasharray="3 2" />
                  {/* Z5 — secondary zone (6 serves) */}
                  <rect x="210" y="38" width="102" height="77" fill="#38bdf80c" stroke="#334155" strokeWidth="0.5" />
                  {/* Z2 */}
                  <rect x="8"   y="115" width="101" height="77" fill="transparent" stroke="#334155" strokeWidth="0.5" />
                  {/* Z3 */}
                  <rect x="109" y="115" width="101" height="77" fill="transparent" stroke="#334155" strokeWidth="0.5" />
                  {/* Z4 */}
                  <rect x="210" y="115" width="102" height="77" fill="transparent" stroke="#334155" strokeWidth="0.5" />

                  {/* Zone number watermarks */}
                  <text x="58"  y="84"  fill="rgba(148,163,184,0.16)" fontSize="34" fontWeight="900" textAnchor="middle">1</text>
                  <text x="159" y="84"  fill="rgba(148,163,184,0.13)" fontSize="34" fontWeight="900" textAnchor="middle">6</text>
                  <text x="261" y="84"  fill="rgba(148,163,184,0.13)" fontSize="34" fontWeight="900" textAnchor="middle">5</text>
                  <text x="58"  y="162" fill="rgba(148,163,184,0.08)" fontSize="34" fontWeight="900" textAnchor="middle">2</text>
                  <text x="159" y="162" fill="rgba(148,163,184,0.08)" fontSize="34" fontWeight="900" textAnchor="middle">3</text>
                  <text x="261" y="162" fill="rgba(148,163,184,0.08)" fontSize="34" fontWeight="900" textAnchor="middle">4</text>

                  {/* Zone hit counts — corner of each zone */}
                  <text x="103" y="49" fill="#f97316" fontSize="9" fontWeight="900" textAnchor="end">9</text>
                  <text x="204" y="49" fill="#ef4444" fontSize="9" fontWeight="800" textAnchor="end">4</text>
                  <text x="306" y="49" fill="#38bdf8" fontSize="9" fontWeight="800" textAnchor="end">6</text>
                  <text x="103" y="126" fill="#475569" fontSize="7.5" fontWeight="700" textAnchor="end">2</text>
                  <text x="204" y="126" fill="#475569" fontSize="7.5" fontWeight="700" textAnchor="end">1</text>
                  <text x="306" y="126" fill="#475569" fontSize="7.5" fontWeight="700" textAnchor="end">3</text>

                  {/* Zone badge labels */}
                  <rect x="12"  y="106" width="42" height="10" rx="3" fill="#f9731630" />
                  <text x="33"  y="114" fill="#f97316" fontSize="6" fontWeight="900" textAnchor="middle">HOT ZONE</text>
                  <rect x="113" y="106" width="46" height="10" rx="3" fill="#ef444420" />
                  <text x="136" y="114" fill="#ef4444" fontSize="6" fontWeight="900" textAnchor="middle">OPP WEAKNESS</text>

                  {/* Serve dots — Zone 1 (9: 2 aces) */}
                  <text x="22"  y="62"  fill="#f59e0b" fontSize="11" textAnchor="middle">★</text>
                  <text x="79"  y="73"  fill="#f59e0b" fontSize="11" textAnchor="middle">★</text>
                  <circle cx="46"  cy="83"  r="5" fill="rgba(52,211,153,0.18)" stroke="#34d399" strokeWidth="1.5" />
                  <circle cx="84"  cy="57"  r="5" fill="rgba(52,211,153,0.18)" stroke="#34d399" strokeWidth="1.5" />
                  <circle cx="32"  cy="101" r="5" fill="rgba(52,211,153,0.18)" stroke="#34d399" strokeWidth="1.5" />
                  <circle cx="62"  cy="68"  r="5" fill="rgba(52,211,153,0.18)" stroke="#34d399" strokeWidth="1.5" />
                  <circle cx="91"  cy="97"  r="5" fill="rgba(52,211,153,0.18)" stroke="#34d399" strokeWidth="1.5" />
                  <circle cx="50"  cy="50"  r="5" fill="rgba(52,211,153,0.18)" stroke="#34d399" strokeWidth="1.5" />
                  <circle cx="73"  cy="98"  r="5" fill="rgba(52,211,153,0.18)" stroke="#34d399" strokeWidth="1.5" />

                  {/* Serve dots — Zone 6 (4: 0 aces — dashed red to show weakness targeting) */}
                  <circle cx="132" cy="65"  r="5" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="1.2" />
                  <circle cx="170" cy="52"  r="5" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="1.2" />
                  <circle cx="148" cy="91"  r="5" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="1.2" />
                  <circle cx="186" cy="78"  r="5" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="1.2" />

                  {/* Serve dots — Zone 5 (6: 1 ace) */}
                  <text x="243"  y="63"  fill="#f59e0b" fontSize="11" textAnchor="middle">★</text>
                  <circle cx="262" cy="80"  r="5" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="228" cy="92"  r="5" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="278" cy="56"  r="5" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="247" cy="105" r="5" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="293" cy="88"  r="5" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth="1.5" />

                  {/* Zone 2 (2 serves) */}
                  <circle cx="38"  cy="148" r="5" fill="rgba(52,211,153,0.12)" stroke="#34d399" strokeWidth="1" />
                  <circle cx="76"  cy="170" r="5" fill="rgba(52,211,153,0.12)" stroke="#34d399" strokeWidth="1" />

                  {/* Zone 3 (1 serve) */}
                  <circle cx="158" cy="158" r="5" fill="rgba(52,211,153,0.12)" stroke="#34d399" strokeWidth="1" />

                  {/* Zone 4 (3 serves: 1 ace) */}
                  <text x="236"  y="150" fill="#f59e0b" fontSize="11" textAnchor="middle">★</text>
                  <circle cx="265" cy="167" r="5" fill="rgba(52,211,153,0.12)" stroke="#34d399" strokeWidth="1" />
                  <circle cx="290" cy="148" r="5" fill="rgba(52,211,153,0.12)" stroke="#34d399" strokeWidth="1" />

                  {/* Net */}
                  <rect x="8" y="192" width="304" height="3" fill="#f97316" rx="1" opacity="0.8" />
                  <text x="160" y="204" fill="#f97316" fontSize="7" fontWeight="800" textAnchor="middle" letterSpacing="3" opacity="0.55">NET</text>

                  {/* Divider */}
                  <rect x="8" y="210" width="304" height="0.5" fill="#1e293b" />

                  {/* Zone breakdown bar */}
                  <text x="8" y="222" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">ZONE DISTRIBUTION</text>
                  {/* % bar: Z1=36% Z6=16% Z5=24% Z2=8% Z3=4% Z4=12% — total 304px */}
                  <rect x="8"   y="226" width="110" height="8" rx="0"   fill="#f97316" opacity="0.75" />
                  <rect x="118" y="226" width="49"  height="8" rx="0"   fill="#ef4444" opacity="0.6"  />
                  <rect x="167" y="226" width="73"  height="8" rx="0"   fill="#38bdf8" opacity="0.6"  />
                  <rect x="240" y="226" width="24"  height="8" rx="0"   fill="#475569" opacity="0.5"  />
                  <rect x="264" y="226" width="12"  height="8" rx="0"   fill="#334155" opacity="0.5"  />
                  <rect x="276" y="226" width="36"  height="8" rx="2"   fill="#64748b" opacity="0.5"  />
                  {/* Labels under bar */}
                  <text x="63"  y="243" fill="#f97316" fontSize="6.5" fontWeight="800" textAnchor="middle">Z1 36%</text>
                  <text x="142" y="243" fill="#ef4444"  fontSize="6.5" fontWeight="700" textAnchor="middle">Z6 16%</text>
                  <text x="203" y="243" fill="#38bdf8"  fontSize="6.5" fontWeight="700" textAnchor="middle">Z5 24%</text>
                  <text x="252" y="243" fill="#475569"  fontSize="6"   fontWeight="700" textAnchor="middle">Z2 8%</text>
                  <text x="270" y="243" fill="#334155"  fontSize="6"   fontWeight="700" textAnchor="middle">Z3</text>
                  <text x="294" y="243" fill="#64748b"  fontSize="6"   fontWeight="700" textAnchor="middle">Z4 12%</text>
                </svg>

                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white">
                  SERVE PLACEMENT MAP
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  After tagging a serve, tap anywhere on the court grid to mark exactly where it landed. Over time, the placement map reveals which zones a player targets most, where they're finding aces, and — critically — which zones of the opponent's court are receiving the ball poorly. Use it to expose weaknesses and put your best servers in position to attack them.
                </p>
              </div>

              {/* ── Feature Card: IS/OOS & Free Ball/Transition by Rotation ── */}
              <div className="w-full mt-8">
                <svg viewBox="0 0 320 236" className="w-full rounded-xl" style={{ background: '#0f172a' }}>
                  {/* Header */}
                  <rect x="0" y="0" width="320" height="34" fill="#1e293b" />
                  <rect x="0" y="0" width="4" height="34" fill="#f97316" />
                  <text x="16" y="12" fill="#94a3b8" fontSize="7" fontWeight="700" letterSpacing="1.2">SYSTEM STATE · BY ROTATION</text>
                  <text x="16" y="26" fill="#f1f5f9" fontSize="11" fontWeight="900">IN/OOS · FREE BALL · TRANSITION</text>

                  {/* Column headers */}
                  <text x="8" y="46" fill="#475569" fontSize="6" fontWeight="700">KILL %</text>
                  {['R1','R2','R3','R4','R5','R6'].map((r, i) => (
                    <text key={r} x={81 + i * 42} y="46" fill="#64748b" fontSize="7" fontWeight="700" textAnchor="middle">{r}</text>
                  ))}

                  {/* IN SYSTEM row */}
                  <text x="8" y="62" fill="#34d399" fontSize="6" fontWeight="800">IN SYS</text>
                  {[48, 52, 45, 39, 54, 47].map((pct, i) => {
                    const cx = 81 + i * 42;
                    const hi = pct >= 52;
                    return (
                      <g key={i}>
                        <rect x={cx - 18} y="50" width="36" height="16" rx="3"
                          fill={`rgba(52,211,153,${hi ? 0.22 : 0.11})`}
                          stroke={`rgba(52,211,153,${hi ? 0.75 : 0.35})`}
                          strokeWidth={hi ? '1.2' : '0.6'} />
                        <text x={cx} y="62" fill={hi ? '#34d399' : '#6ee7b7'} fontSize="8" fontWeight={hi ? '900' : '700'} textAnchor="middle">{pct}%</text>
                      </g>
                    );
                  })}

                  {/* OUT OF SYSTEM row */}
                  <text x="8" y="86" fill="#fb923c" fontSize="6" fontWeight="800">OUT SYS</text>
                  {[28, 22, 31, 18, 29, 35].map((pct, i) => {
                    const cx = 81 + i * 42;
                    const lo = pct <= 22;
                    return (
                      <g key={i}>
                        <rect x={cx - 18} y="74" width="36" height="16" rx="3"
                          fill={`rgba(251,146,60,${lo ? 0.22 : 0.10})`}
                          stroke={`rgba(251,146,60,${lo ? 0.75 : 0.30})`}
                          strokeWidth={lo ? '1.2' : '0.6'} />
                        <text x={cx} y="86" fill={lo ? '#fb923c' : '#fdba74'} fontSize="8" fontWeight={lo ? '900' : '700'} textAnchor="middle">{pct}%</text>
                      </g>
                    );
                  })}

                  {/* Delta row — IS minus OOS */}
                  {[20, 30, 14, 21, 25, 12].map((delta, i) => {
                    const cx = 81 + i * 42;
                    const big = delta >= 28;
                    return (
                      <text key={i} x={cx} y="100" fill={big ? '#f97316' : '#334155'} fontSize="5.5" fontWeight={big ? '800' : '600'} textAnchor="middle">–{delta}pp</text>
                    );
                  })}

                  {/* Divider */}
                  <rect x="8" y="106" width="304" height="0.5" fill="#1e293b" />

                  {/* Free Ball & Transition section header */}
                  <text x="8" y="116" fill="#475569" fontSize="6" fontWeight="700">KILL %</text>
                  <text x="62" y="116" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.6">FREE BALL &amp; TRANSITION</text>

                  {/* FREE BALL row */}
                  <text x="8" y="134" fill="#38bdf8" fontSize="6" fontWeight="800">FREE BL</text>
                  {[72, 68, 75, 71, 80, 70].map((pct, i) => {
                    const cx = 81 + i * 42;
                    const hi = pct >= 75;
                    return (
                      <g key={i}>
                        <rect x={cx - 18} y="122" width="36" height="16" rx="3"
                          fill={`rgba(56,189,248,${hi ? 0.22 : 0.11})`}
                          stroke={`rgba(56,189,248,${hi ? 0.75 : 0.35})`}
                          strokeWidth={hi ? '1.2' : '0.6'} />
                        <text x={cx} y="134" fill={hi ? '#38bdf8' : '#7dd3fc'} fontSize="8" fontWeight={hi ? '900' : '700'} textAnchor="middle">{pct}%</text>
                      </g>
                    );
                  })}

                  {/* TRANSITION row */}
                  <text x="8" y="158" fill="#a78bfa" fontSize="6" fontWeight="800">TRANS</text>
                  {[41, 38, 44, 35, 46, 42].map((pct, i) => {
                    const cx = 81 + i * 42;
                    const hi = pct >= 44;
                    return (
                      <g key={i}>
                        <rect x={cx - 18} y="146" width="36" height="16" rx="3"
                          fill={`rgba(167,139,250,${hi ? 0.20 : 0.09})`}
                          stroke={`rgba(167,139,250,${hi ? 0.65 : 0.28})`}
                          strokeWidth={hi ? '1.2' : '0.6'} />
                        <text x={cx} y="158" fill={hi ? '#a78bfa' : '#c4b5fd'} fontSize="8" fontWeight={hi ? '900' : '700'} textAnchor="middle">{pct}%</text>
                      </g>
                    );
                  })}

                  {/* Divider */}
                  <rect x="8" y="168" width="304" height="0.5" fill="#1e293b" />

                  {/* Rotation insight tiles */}
                  <text x="8" y="180" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">ROTATION INSIGHTS</text>

                  <rect x="8" y="184" width="146" height="34" rx="4" fill="#1e293b" stroke="#34d39928" strokeWidth="0.75" />
                  <text x="16" y="196" fill="#34d399" fontSize="6.5" fontWeight="800">BEST IN SYSTEM</text>
                  <text x="16" y="211" fill="#f1f5f9" fontSize="13" fontWeight="900">R5 · 54%</text>
                  <text x="148" y="211" fill="#34d399" fontSize="6" textAnchor="end">+25pp over OOS</text>

                  <rect x="166" y="184" width="146" height="34" rx="4" fill="#1e293b" stroke="#f9731628" strokeWidth="0.75" />
                  <text x="174" y="196" fill="#f97316" fontSize="6.5" fontWeight="800">BIGGEST OOS DROP</text>
                  <text x="174" y="211" fill="#f1f5f9" fontSize="13" fontWeight="900">R2 · –30pp</text>
                  <text x="306" y="211" fill="#f97316" fontSize="6" textAnchor="end">prioritize passing</text>

                  {/* Bottom filter hint */}
                  <text x="160" y="230" fill="#334155" fontSize="5.5" fontWeight="700" textAnchor="middle" letterSpacing="0.3">FILTER BY: ALL SETS · BY SET · BY PLAYER ROTATION POSITION</text>
                </svg>

                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white">
                  IN / OUT OF SYSTEM BY ROTATION
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Not all opportunities are equal. Vantage breaks down kill percentage by system state — In System when the pass is clean, Out of System when your team is scrambling, and separately tracks Free Ball and Transition kill rates — for every rotation. See which rotations hold up under pressure and which collapse when the pass breaks down, so you can build smarter lineups and target practice exactly where it counts.
                </p>
              </div>

              {/* ── Feature Card: Attack Detail — Kill Type & Errors ── */}
              <div className="w-full mt-8">
                <svg viewBox="0 0 320 248" className="w-full rounded-xl" style={{ background: '#0f172a' }}>
                  {/* Header */}
                  <rect x="0" y="0" width="320" height="34" fill="#1e293b" />
                  <rect x="0" y="0" width="4" height="34" fill="#f97316" />
                  <text x="16" y="12" fill="#94a3b8" fontSize="7" fontWeight="700" letterSpacing="1.2">ATTACK DETAIL · KILL TYPE &amp; ERRORS</text>
                  <text x="16" y="26" fill="#f1f5f9" fontSize="11" fontWeight="900">LAKE ZURICH  14 – 11</text>
                  <rect x="250" y="8" width="58" height="18" rx="4" fill="#f9731620" />
                  <circle cx="260" cy="17" r="4" fill="#f97316" />
                  <text x="267" y="21" fill="#f97316" fontSize="8" fontWeight="800">LIVE</text>

                  {/* Attacker tile strip */}
                  <rect x="8" y="38" width="304" height="22" rx="5" fill="#1e293b" stroke="#334155" strokeWidth="0.75" />
                  <text x="18" y="52" fill="#64748b" fontSize="7" fontWeight="700">OH</text>
                  <text x="160" y="52" fill="#f1f5f9" fontSize="11" fontWeight="900" textAnchor="middle">#3 · SARA  ·  S3</text>
                  <text x="303" y="52" fill="#64748b" fontSize="7" textAnchor="end">Hitting</text>

                  {/* Kill type section label */}
                  <text x="8" y="70" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">HITTING — KILL TYPE</text>

                  {/* Kill row 1: PURE | TOUCH | TOOL */}
                  <rect x="8"   y="74" width="100" height="22" rx="4" fill="#ea580c40" stroke="#ea580c" strokeWidth="1" />
                  <text x="58"  y="89" fill="#fb923c" fontSize="9" fontWeight="900" textAnchor="middle">PURE</text>
                  <rect x="112" y="74" width="100" height="22" rx="4" fill="#06b6d418" stroke="#06b6d4" strokeWidth="0.75" />
                  <text x="162" y="89" fill="#67e8f9" fontSize="9" fontWeight="800" textAnchor="middle">TOUCH</text>
                  <rect x="216" y="74" width="96" height="22" rx="4" fill="#d9770618" stroke="#d97706" strokeWidth="0.75" />
                  <text x="264" y="89" fill="#fbbf24" fontSize="9" fontWeight="800" textAnchor="middle">TOOL</text>

                  {/* Kill row 2: TIP/ROLL | BK ROW | OVER */}
                  <rect x="8"   y="100" width="100" height="22" rx="4" fill="#65a30d18" stroke="#65a30d" strokeWidth="0.75" />
                  <text x="58"  y="115" fill="#a3e635" fontSize="9" fontWeight="800" textAnchor="middle">TIP / ROLL</text>
                  <rect x="112" y="100" width="100" height="22" rx="4" fill="#c2410c18" stroke="#c2410c" strokeWidth="0.75" />
                  <text x="162" y="115" fill="#fb923c" fontSize="9" fontWeight="800" textAnchor="middle">BK ROW</text>
                  <rect x="216" y="100" width="96" height="22" rx="4" fill="#ca8a0418" stroke="#ca8a04" strokeWidth="0.75" />
                  <text x="264" y="115" fill="#facc15" fontSize="9" fontWeight="800" textAnchor="middle">OVER</text>

                  {/* Cue */}
                  <text x="160" y="130" fill="#475569" fontSize="6.5" textAnchor="middle">— tap K to open kill type sub-panel —</text>

                  {/* Divider */}
                  <rect x="8" y="136" width="304" height="0.5" fill="#1e293b" />

                  {/* Attack error section label */}
                  <text x="8" y="148" fill="#ef4444" fontSize="6.5" fontWeight="700" letterSpacing="0.8">ATTACK ERROR — SELECT TYPE</text>

                  {/* Error buttons: × | OB | NET | BLK | BRA */}
                  <rect x="8"   y="152" width="36" height="22" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="0.6" />
                  <text x="26"  y="167" fill="#94a3b8" fontSize="13" fontWeight="700" textAnchor="middle">×</text>
                  <rect x="48"  y="152" width="62" height="22" rx="4" fill="#450a0a50" stroke="#ef4444" strokeWidth="1.1" />
                  <text x="79"  y="167" fill="#fca5a5" fontSize="9" fontWeight="900" textAnchor="middle">OB</text>
                  <rect x="114" y="152" width="62" height="22" rx="4" fill="#3b0c1e50" stroke="#f43f5e" strokeWidth="1.1" />
                  <text x="145" y="167" fill="#fda4af" fontSize="9" fontWeight="900" textAnchor="middle">NET</text>
                  <rect x="180" y="152" width="62" height="22" rx="4" fill="#1e3a5f50" stroke="#3b82f6" strokeWidth="1.1" />
                  <text x="211" y="167" fill="#93c5fd" fontSize="9" fontWeight="900" textAnchor="middle">BLK</text>
                  <rect x="246" y="152" width="66" height="22" rx="4" fill="#450a0a30" stroke="#ef444480" strokeWidth="0.8" />
                  <text x="279" y="167" fill="#fca5a5" fontSize="9" fontWeight="800" textAnchor="middle">BRA</text>

                  {/* Cue */}
                  <text x="160" y="184" fill="#475569" fontSize="6.5" textAnchor="middle">— tap AE to tag the error type —</text>

                  {/* Divider */}
                  <rect x="8" y="190" width="304" height="0.5" fill="#1e293b" />

                  {/* Kill type breakdown — stacked bar */}
                  <text x="8" y="201" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">KILL TYPE BREAKDOWN — 30 KILLS</text>
                  {/* PURE 47%, TIP 17%, TOUCH 13%, TOOL 10%, BK 10%, OVER 3% — total 304px */}
                  <rect x="8"   y="204" width="143" height="9" fill="#ea580c" opacity="0.85" />
                  <rect x="151" y="204" width="52"  height="9" fill="#65a30d" opacity="0.80" />
                  <rect x="203" y="204" width="40"  height="9" fill="#06b6d4" opacity="0.75" />
                  <rect x="243" y="204" width="30"  height="9" fill="#d97706" opacity="0.75" />
                  <rect x="273" y="204" width="30"  height="9" fill="#c2410c" opacity="0.70" />
                  <rect x="303" y="204" width="9"   height="9" rx="1" fill="#ca8a04" opacity="0.65" />
                  {/* Labels */}
                  <text x="79"  y="220" fill="#fb923c" fontSize="6" fontWeight="800" textAnchor="middle">PURE 47%</text>
                  <text x="177" y="220" fill="#a3e635" fontSize="6" fontWeight="700" textAnchor="middle">TIP 17%</text>
                  <text x="223" y="220" fill="#67e8f9" fontSize="6" fontWeight="700" textAnchor="middle">TCH 13%</text>
                  <text x="258" y="220" fill="#fbbf24" fontSize="5.5" fontWeight="700" textAnchor="middle">TOOL</text>
                  <text x="288" y="220" fill="#fb923c" fontSize="5.5" fontWeight="700" textAnchor="middle">BK 10%</text>

                  {/* Attack error breakdown bar */}
                  <text x="8" y="231" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">ATTACK ERROR BREAKDOWN — 11 ERRORS</text>
                  {/* OB 45%, NET 36%, BLK 18% — 304px */}
                  <rect x="8"   y="234" width="138" height="5" fill="#ef4444" opacity="0.75" />
                  <rect x="146" y="234" width="109" height="5" fill="#f43f5e" opacity="0.70" />
                  <rect x="255" y="234" width="57"  height="5" rx="1" fill="#3b82f6" opacity="0.65" />
                  <text x="8"   y="246" fill="#ef4444" fontSize="6" fontWeight="800">OB 45%</text>
                  <text x="146" y="246" fill="#f43f5e" fontSize="6" fontWeight="800">NET 36%</text>
                  <text x="255" y="246" fill="#3b82f6" fontSize="6" fontWeight="800">BLK 18%</text>
                </svg>

                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white">
                  ATTACK DETAIL — KILL TYPE &amp; ERRORS
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Every kill and every error gets tagged. When a player puts the ball away, Vantage lets you log exactly how — a pure swing, a tool off the block, a tip or roll shot, a back row attack, or a touch kill. On the error side, tag whether it went out of bounds, hit the net, got blocked, or was a blocked and recovered attempt. Over a season, this reveals each hitter's tendencies and shows coaches exactly where efficiency is being left on the court.
                </p>
              </div>
              {/* ── Feature Card: VER ── */}
              <div className="w-full mt-8">
                <svg viewBox="0 0 320 254" className="w-full rounded-xl" style={{ background: '#0f172a' }}>
                  {/* Header */}
                  <rect x="0" y="0" width="320" height="34" fill="#1e293b" />
                  <rect x="0" y="0" width="4" height="34" fill="#f97316" />
                  <text x="16" y="12" fill="#94a3b8" fontSize="7" fontWeight="700" letterSpacing="1.2">VANTAGE EFFICIENCY RATING</text>
                  <text x="16" y="26" fill="#f1f5f9" fontSize="11" fontWeight="900">VER — COMPOSITE PLAYER EFFICIENCY</text>

                  {/* Formula — positive panel */}
                  <rect x="8" y="38" width="148" height="64" rx="5" fill="#052e1640" stroke="#22c55e35" strokeWidth="1" />
                  <text x="16" y="50" fill="#22c55e" fontSize="6.5" fontWeight="800" letterSpacing="0.5">EARNS POINTS</text>
                  <text x="16" y="62" fill="#4ade80" fontSize="7" fontWeight="700">K +4.0</text>
                  <text x="56" y="62" fill="#4ade80" fontSize="7" fontWeight="700">ACE +4.0</text>
                  <text x="106" y="62" fill="#4ade80" fontSize="7" fontWeight="700">SBLK +5.0</text>
                  <text x="16" y="74" fill="#86efac" fontSize="7" fontWeight="600">HBLK +2.5</text>
                  <text x="66" y="74" fill="#86efac" fontSize="7" fontWeight="600">DIG +2.0</text>
                  <text x="108" y="74" fill="#86efac" fontSize="7" fontWeight="600">AST +1.0</text>
                  <text x="16" y="86" fill="#64748b" fontSize="6">+ PASS RATING (APR weighted)</text>
                  <text x="16" y="96" fill="#475569" fontSize="5.5">÷ sets played  ×  position multiplier</text>

                  {/* Formula — negative panel */}
                  <rect x="164" y="38" width="148" height="64" rx="5" fill="#450a0a28" stroke="#ef444435" strokeWidth="1" />
                  <text x="172" y="50" fill="#ef4444" fontSize="6.5" fontWeight="800" letterSpacing="0.5">COSTS POINTS</text>
                  <text x="172" y="62" fill="#f87171" fontSize="7" fontWeight="700">AE −3.0</text>
                  <text x="216" y="62" fill="#f87171" fontSize="7" fontWeight="700">SE −3.0</text>
                  <text x="172" y="74" fill="#fca5a5" fontSize="7" fontWeight="600">BHE −3.0</text>
                  <text x="220" y="74" fill="#fca5a5" fontSize="7" fontWeight="600">LIFT −3.0</text>
                  <text x="172" y="86" fill="#fca5a5" fontSize="7" fontWeight="600">NET −3.0</text>
                  <text x="220" y="86" fill="#fca5a5" fontSize="7" fontWeight="600">DROP −3.0</text>
                  <text x="172" y="96" fill="#475569" fontSize="5.5">all error types equally weighted</text>

                  {/* Position multiplier strip */}
                  <rect x="8" y="107" width="304" height="14" rx="3" fill="#1e293b" />
                  <text x="160" y="117" fill="#64748b" fontSize="6" textAnchor="middle" letterSpacing="0.2">POSITION MULTIPLIER: OH/OPP/RS 1.0×  ·  MB 1.05×  ·  S 0.9×  ·  L 1.65×  ·  DS 2.0×</text>

                  {/* Divider */}
                  <rect x="8" y="126" width="304" height="0.5" fill="#1e293b" />

                  {/* Tier strip */}
                  <text x="8" y="136" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">PERFORMANCE TIERS</text>
                  {[
                    { label: 'NEG',    score: '<0',   tc: '#ef4444', bg: '#450a0a', x: 8,   w: 32 },
                    { label: 'BENCH',  score: '0–5',  tc: '#94a3b8', bg: '#1e293b', x: 44,  w: 40 },
                    { label: 'LOW',    score: '5–10', tc: '#eab308', bg: '#422006', x: 88,  w: 36 },
                    { label: 'AVG',    score: '10–15',tc: '#e2e8f0', bg: '#1e293b', x: 128, w: 38 },
                    { label: 'GOOD',   score: '15–22',tc: '#22c55e', bg: '#052e16', x: 170, w: 40 },
                    { label: 'ELITE',  score: '22–28',tc: '#f97316', bg: '#431407', x: 214, w: 42 },
                    { label: 'ELITE+', score: '28+',  tc: '#22d3ee', bg: '#083344', x: 260, w: 52 },
                  ].map(t => (
                    <g key={t.label}>
                      <rect x={t.x} y="140" width={t.w} height="18" rx="3" fill={t.bg + '90'} stroke={t.tc + '55'} strokeWidth="1" />
                      <text x={t.x + t.w / 2} y="152" fill={t.tc} fontSize="7" fontWeight="900" textAnchor="middle">{t.label}</text>
                      <text x={t.x + t.w / 2} y="165" fill={t.tc + '70'} fontSize="5.5" textAnchor="middle">{t.score}</text>
                    </g>
                  ))}

                  {/* Divider */}
                  <rect x="8" y="171" width="304" height="0.5" fill="#1e293b" />

                  {/* Leaderboard */}
                  <text x="8" y="181" fill="#64748b" fontSize="6.5" fontWeight="700" letterSpacing="0.8">PLAYER LEADERBOARD · SEASON VER</text>

                  {[
                    { rank: 1, jersey: '#7',  name: 'EMMA',  pos: 'OH', ver: '+28.4', tier: 'ELITE+', tc: '#22d3ee', note: null       },
                    { rank: 2, jersey: '#3',  name: 'SARA',  pos: 'OH', ver: '+23.1', tier: 'ELITE',  tc: '#f97316', note: null       },
                    { rank: 3, jersey: '#1',  name: 'LEXI',  pos: 'L',  ver: '+18.6', tier: 'GOOD',   tc: '#22c55e', note: '1.65×adj' },
                    { rank: 4, jersey: '#11', name: 'AVA',   pos: 'MB', ver: '+16.3', tier: 'GOOD',   tc: '#22c55e', note: null       },
                    { rank: 5, jersey: '#4',  name: 'KATE',  pos: 'S',  ver: '+12.8', tier: 'AVG',    tc: '#e2e8f0', note: null       },
                  ].map((p, i) => {
                    const y = 185 + i * 13;
                    return (
                      <g key={p.rank}>
                        <rect x="8" y={y} width="304" height="12" rx="2" fill={i % 2 === 0 ? '#1e293b70' : 'transparent'} />
                        <text x="18"  y={y + 9} fill="#475569" fontSize="6.5" fontWeight="700">{p.rank}</text>
                        <text x="30"  y={y + 9} fill="#64748b" fontSize="6.5" fontWeight="700">{p.jersey}</text>
                        <text x="52"  y={y + 9} fill="#f1f5f9" fontSize="6.5" fontWeight="800">{p.name}</text>
                        <text x="96"  y={y + 9} fill="#64748b" fontSize="6"   fontWeight="600">{p.pos}</text>
                        {p.note && <text x="112" y={y + 9} fill="#334155" fontSize="5.5">{p.note}</text>}
                        <text x="204" y={y + 9} fill={p.tc}    fontSize="8"   fontWeight="900" textAnchor="end">{p.ver}</text>
                        <rect x="208" y={y + 1} width="44" height="11" rx="2" fill={p.tc + '18'} stroke={p.tc + '45'} strokeWidth="0.75" />
                        <text x="230" y={y + 9} fill={p.tc}    fontSize="6.5" fontWeight="900" textAnchor="middle">{p.tier}</text>
                      </g>
                    );
                  })}

                  {/* Footer note */}
                  <text x="160" y="253" fill="#334155" fontSize="5.5" textAnchor="middle">★ LEXI (L) VER boosted by 1.65× — position adjustment levels the playing field</text>
                </svg>

                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white">
                  VANTAGE EFFICIENCY RATING (VER)
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  VER is Vantage's composite efficiency metric — a single number that captures how much a player contributes per set played. Kills, aces, blocks, digs, assists, and passing all earn points. Errors cost them. The result is position-adjusted so liberos and defensive specialists can be evaluated fairly alongside attackers. Track VER across a season to identify your most valuable contributors and spot efficiency trends before they show up in the box score.
                </p>
              </div>
              {/* ── Feature Card: Detailed Timeout Screen ── */}
              <div className="w-full mt-8">
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

                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white">
                  DETAILED TIMEOUT SCREEN
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  The moment you call a timeout, Vantage pulls up a full analytics overlay. The left panel gives you instant access to eleven stat tabs — Scoring, Insights, Trends, Serving, Passing, Attacking, Blocking, Defense, VER, Compare, and Opponent — with a SET/MATCH scope toggle and a live score timeline at the bottom. The right panel surfaces what matters most: current score, set win probability, last eight points broken down by type, match win % trend, rotation SO%/SP%, and an error leader flag. A 60-second countdown ring keeps you on pace, and a built-in court whiteboard lets you draw up a play before you hit Resume.
                </p>
              </div>

              {/* ── Feature Card: Real-Time Win Factors ── */}
              <div className="w-full mt-8">
                <svg viewBox="0 0 320 290" className="w-full rounded-xl" style={{ background: '#0f172a' }}>

                  {/* Header */}
                  <rect x="0" y="0" width="320" height="34" fill="#1e293b" />
                  <rect x="0" y="0" width="4" height="34" fill="#f97316" />
                  <text x="16" y="12" fill="#94a3b8" fontSize="7" fontWeight="700" letterSpacing="1.2">INSIGHTS</text>
                  <text x="16" y="26" fill="#f1f5f9" fontSize="11" fontWeight="900">WIN FACTORS</text>

                  {/* Context bar */}
                  <rect x="0" y="34" width="320" height="14" fill="#080d14" />
                  <text x="16" y="44" fill="#334155" fontSize="6" fontWeight="700" letterSpacing="0.5">RANKED BY IMPACT · 12W – 4L THIS SEASON</text>

                  {/* Metric cards */}
                  {[
                    { rank: '#1', label: 'Sideout %',        loss: '52%',  now: '68%',  win: '71%',  barPct: 84, nowColor: '#22c55e', status: 'ON TRACK',   statusColor: '#22c55e', wf: 28 },
                    { rank: '#2', label: 'Hitting Eff.',      loss: '.180', now: '.312', win: '.340', barPct: 83, nowColor: '#22c55e', status: 'ON TRACK',   statusColor: '#22c55e', wf: 22 },
                    { rank: '#3', label: 'Atk Errors / Set',  loss: '5.2',  now: '4.8',  win: '3.4',  barPct: 22, nowColor: '#ef4444', status: 'FOCUS HERE', statusColor: '#ef4444', wf: 18 },
                    { rank: '#4', label: 'Pass Rating',        loss: '2.0',  now: '2.2',  win: '2.5',  barPct: 40, nowColor: '#f59e0b', status: 'WATCH THIS', statusColor: '#f59e0b', wf: 15 },
                  ].map((c, i) => {
                    const y    = 48 + i * 60;
                    const barC = c.barPct >= 65 ? '#22c55e' : c.barPct >= 35 ? '#f59e0b' : '#ef4444';
                    const barW = Math.round(288 * c.barPct / 100);
                    const rankC = [
                      { bg: '#fbbf2420', stroke: '#fbbf2450', text: '#fbbf24' },
                      { bg: '#94a3b820', stroke: '#94a3b850', text: '#94a3b8' },
                      { bg: '#c2774e20', stroke: '#c2774e50', text: '#c2774e' },
                      { bg: '#33415520', stroke: '#33415550', text: '#64748b' },
                    ][i];
                    return (
                      <g key={c.label}>
                        <rect x="8" y={y} width="304" height="56" rx="4" fill="#1e293b" stroke="#243040" strokeWidth="0.5" />
                        <rect x="14" y={y+6} width="18" height="11" rx="2" fill={rankC.bg} stroke={rankC.stroke} strokeWidth="0.5" />
                        <text x="23" y={y+14.5} fill={rankC.text} fontSize="6.5" fontWeight="900" textAnchor="middle">{c.rank}</text>
                        <text x="38"  y={y+15} fill="#f1f5f9" fontSize="7.5" fontWeight="800">{c.label}</text>
                        <text x="308" y={y+15} fill={c.statusColor} fontSize="6.5" fontWeight="800" textAnchor="end">{c.status}</text>
                        <text x="63"  y={y+29} fill="#ef4444" fontSize="11" fontWeight="900" textAnchor="middle">{c.loss}</text>
                        <text x="160" y={y+29} fill={c.nowColor} fontSize="11" fontWeight="900" textAnchor="middle">{c.now}</text>
                        <text x="257" y={y+29} fill="#22c55e" fontSize="11" fontWeight="900" textAnchor="middle">{c.win}</text>
                        <text x="63"  y={y+37} fill="#7f1d1d" fontSize="5" fontWeight="700" textAnchor="middle">LOSS AVG</text>
                        <text x="160" y={y+37} fill="#475569" fontSize="5" fontWeight="700" textAnchor="middle">THIS MATCH</text>
                        <text x="257" y={y+37} fill="#14532d" fontSize="5" fontWeight="700" textAnchor="middle">WIN AVG</text>
                        <line x1="111" y1={y+20} x2="111" y2={y+39} stroke="#334155" strokeWidth="0.5" />
                        <line x1="209" y1={y+20} x2="209" y2={y+39} stroke="#334155" strokeWidth="0.5" />
                        <rect x="16" y={y+41} width="288" height="4" rx="2" fill="#0f172a" />
                        <rect x="16" y={y+41} width={barW} height="4" rx="2" fill={barC} opacity="0.85" />
                        <text x="16" y={y+53} fontSize="5.5">
                          <tspan fill="#475569" fontWeight="700">{'Win Factor:  '}</tspan>
                          <tspan fill="#60a5fa" fontWeight="900">{`${c.wf}%`}</tspan>
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <p className="text-[16px] font-black uppercase leading-none tracking-[0.15em] mt-3 text-white">
                  REAL-TIME WIN FACTORS
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Vantage continuously compares your live match stats to your season's historical win and loss averages. Twelve key metrics are ranked by win factor — the percentage of your win/loss gap that stat accounts for. Green means you're at win-level performance right now; amber means you're close; red means this metric is tracking closer to your loss average and needs attention. Open it during any timeout to instantly know where to focus.
                </p>
              </div>
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
