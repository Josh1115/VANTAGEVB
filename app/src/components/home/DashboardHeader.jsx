import { useState, useEffect, useRef } from 'react';
import { VBPlayerScene } from '../ui/VBPlayerScene';

const BALL_TYPES = [
  { type: 'spike',    cls: 'animate-spike-drop',   dur: 1700 },
  { type: 'floater',  cls: 'animate-floater-arc',  dur: 1900 },
  { type: 'ace',      cls: 'animate-ace-serve',    dur: 1400 },
  { type: 'freeball', cls: 'animate-freeball-arc', dur: 2600 },
];

// The dashboard's animated header: the volleyball net watermark, the player
// silhouette scene, and the VANTAGE logo you can tap (or long-press for a
// burst) to send a ball flying across it. Fully self-contained — none of
// this depends on match/team data, so it owns all of its own state.
export function DashboardHeader() {
  const [balls,       setBalls]       = useState([]); // [{ id, type, left }]
  const [netRippling, setNetRippling] = useState(false);

  function fireBall(typeStr, leftPct) {
    const pick = typeStr
      ? (BALL_TYPES.find((b) => b.type === typeStr) ?? BALL_TYPES[0])
      : BALL_TYPES[Math.floor(Math.random() * BALL_TYPES.length)];
    const id   = performance.now() + Math.random();
    const left = leftPct ?? (20 + Math.random() * 60);
    setBalls((prev) => [...prev, { id, type: pick.type, left }]);
    setTimeout(() => setBalls((prev) => prev.filter((b) => b.id !== id)), pick.dur);
  }

  function fireBurst() {
    const positions = [12, 28, 50, 68, 84];
    const shuffled  = [...BALL_TYPES].sort(() => Math.random() - 0.5);
    const count     = 4 + Math.floor(Math.random() * 2); // 4 or 5 balls
    positions.slice(0, count).forEach((pos, i) => {
      setTimeout(() => fireBall(shuffled[i % shuffled.length].type, pos), i * 130);
    });
    setNetRippling(true);
    setTimeout(() => setNetRippling(false), 800);
  }

  // Auto-fire a single ball periodically
  useEffect(() => {
    const trigger = () => fireBall(null, 50);
    const first   = setTimeout(trigger, 2500);
    const interval = setInterval(trigger, 15000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, []);

  // ── Long-press logo for burst ─────────────────────────────────────────────
  const longPressTimer = useRef(null);
  const isLongPress    = useRef(false);

  function handleLogoPointerDown() {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      fireBurst();
    }, 500);
  }

  function handleLogoPointerUp() {
    clearTimeout(longPressTimer.current);
  }

  function handleLogoClick() {
    if (isLongPress.current) return; // already handled by long-press
    fireBall(null, 50);
    setNetRippling(true);
    setTimeout(() => setNetRippling(false), 450);
  }

  return (
    <header className="sticky top-0 z-20 bg-bg border-b border-slate-800 px-4 pt-safe pb-10 text-center relative">

      {/* Volleyball net watermark (mesh sways via .net-wave CSS) */}
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden${netRippling ? ' net-ripple' : ''}`}
        aria-hidden="true"
        viewBox="0 0 600 66"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.18 }}
      >
        <defs>
          <pattern id="vb-net-mesh" x="0" y="0" width="18" height="10" patternUnits="userSpaceOnUse">
            <path d="M 18 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.65" />
          </pattern>
        </defs>
        <rect x="0" y="30" width="600" height="24" fill="url(#vb-net-mesh)" className="net-wave" />
        <rect x="0" y="25" width="600" height="6" fill="white" />
        <rect x="0" y="54" width="600" height="3" fill="white" />
        {/* Left antenna — full-height rod with alternating red/white stripes */}
        <rect x="44" y="0"  width="3" height="57" fill="white" />
        <rect x="44" y="0"  width="3" height="4"  fill="#ef4444" />
        <rect x="44" y="8"  width="3" height="4"  fill="#ef4444" />
        <rect x="44" y="16" width="3" height="4"  fill="#ef4444" />
        <rect x="44" y="24" width="3" height="4"  fill="#ef4444" />
        <rect x="44" y="32" width="3" height="4"  fill="#ef4444" />
        <rect x="44" y="40" width="3" height="4"  fill="#ef4444" />
        <rect x="44" y="48" width="3" height="4"  fill="#ef4444" />
        {/* Right antenna */}
        <rect x="553" y="0"  width="3" height="57" fill="white" />
        <rect x="553" y="0"  width="3" height="4"  fill="#ef4444" />
        <rect x="553" y="8"  width="3" height="4"  fill="#ef4444" />
        <rect x="553" y="16" width="3" height="4"  fill="#ef4444" />
        <rect x="553" y="24" width="3" height="4"  fill="#ef4444" />
        <rect x="553" y="32" width="3" height="4"  fill="#ef4444" />
        <rect x="553" y="40" width="3" height="4"  fill="#ef4444" />
        <rect x="553" y="48" width="3" height="4"  fill="#ef4444" />
      </svg>

      <VBPlayerScene />

      <div className="absolute inset-0 crt-scanlines pointer-events-none overflow-hidden" aria-hidden="true" />

      {/* Flying balls (supports multiple simultaneous) */}
      {balls.map((ball) => (
        <div
          key={ball.id}
          className="absolute top-0 pointer-events-none z-10"
          style={{ left: `${ball.left}%` }}
          aria-hidden="true"
        >
          <span className={`text-3xl inline-block ${BALL_TYPES.find((b) => b.type === ball.type)?.cls ?? 'animate-spike-drop'}`}>
            🏐
          </span>
        </div>
      ))}

      <h1 className="tracking-wide flex flex-col items-center gap-0.5" style={{ transform: 'translateY(25%)' }}>
        <div className="relative mx-auto" style={{ width: 'min(62vw, 482px)' }}>
          <img
            src="/logo.png"
            alt="VANTAGE"
            className="h-auto w-full block"
            style={{ transform: 'translateX(-3%)' }}
            onClick={handleLogoClick}
            onPointerDown={handleLogoPointerDown}
            onPointerUp={handleLogoPointerUp}
            onPointerLeave={handleLogoPointerUp}
          />
          <span className="absolute text-slate-400 select-none" style={{ top: '6%', right: '2%', fontSize: 'min(2.6vw, 20px)' }}>™</span>
        </div>
        <span className="text-[17.5px] font-semibold tracking-[0.22em] text-slate-300 uppercase" style={{ transform: 'translateY(-8px)' }}>
          Immediate Impact Analytics
        </span>
      </h1>

    </header>
  );
}
