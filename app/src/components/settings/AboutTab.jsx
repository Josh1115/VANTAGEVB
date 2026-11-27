import { Link } from 'react-router-dom';
import { TERMS_STORAGE_KEY } from '../auth/TermsGate';

/* global __APP_VERSION__ */
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';

const ROW = 'w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700/40 active:bg-slate-700/60 transition-colors';
const GROUP = 'rounded-xl bg-slate-800/60 border border-slate-700/60 overflow-hidden divide-y divide-slate-700/60';
const HEAD = 'text-[15px] font-black uppercase tracking-wider text-primary underline underline-offset-4 decoration-2 mb-2';

const FEATURES = [
  'Live stat tracking',
  'Deep analytics & Volleyball Efficiency Ratings (VER)',
  'Between-set & timeout insights',
  'Attack & serve spray charts',
  'Opponent scouting',
  'Lineup optimizer',
  'Record books & program history',
  'Player awards & milestones',
  'Game cards & MaxPreps upload',
  'Whiteboard & practice tools',
  'Offline + cross-device sync',
];

// About tab: logo + mission, contact/support, app version, and the legal
// links (Terms, Privacy) that used to be their own Legal tab.
export function AboutTab() {
  return (
    <div className="p-4 space-y-6">
      {/* Logo + mission statement (moved here from the bottom of the Settings page) */}
      <section>
        <div className="text-center mb-4">
          <div className="relative mx-auto" style={{ width: 'min(72vw, 340px)' }}>
            <img
              src="/logo.png"
              alt="VANTAGE"
              className="h-auto w-full block"
              style={{ transform: 'translateX(-3%)' }}
            />
            <span className="absolute text-slate-400 select-none" style={{ top: '6%', right: '2%', fontSize: 'min(3vw, 14px)' }}>™</span>
          </div>
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-400 mt-1">Immediate Impact Analytics</p>
        </div>
        <div className="border-t border-slate-700 mb-4" />
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-2 text-center">Mission Statement</p>
        <p className="text-[15.75px] text-white font-semibold leading-relaxed text-center">
          Vantage exists to help coaches make better decisions in the moment, help players see their growth over time, and help every program honor its history. We believe great volleyball is built one decision, one season, and one legacy at a time.
        </p>
        <div className="border-t border-slate-700 my-4" />
        <p className="text-[15.75px] text-slate-200 leading-relaxed text-center">
          Vantage is the all-in-one volleyball hub for coaches who want a competitive edge — data collection, analysis, coaching advice, trend analysis, record books, and program history, all in one place. Record every contact live during a match — serves, passes, attacks, blocks, and digs — and instantly access deep analytics: rotation efficiency, player Volleyball Efficiency Ratings (VER), win correlation insights, and real-time performance alerts. It works fully offline in any gym and syncs across all your devices when you're back online.
        </p>
        <p className="text-[15.75px] text-slate-200 leading-relaxed text-center mt-3">
          Every match you stat builds one centralized, digital history — season records, career milestones, and all-time leaderboards — that lives and grows with every set you track, so your program's legacy is never lost in a binder or spreadsheet again. Each new season picks up right where the last one left off — returning players roll over, seniors graduate into your history, and your trophy cabinet keeps growing year after year. When the final point is scored, send results to the press in seconds with shareable game cards, or upload your box score straight to MaxPreps. From pre-match lineup prep to gametime decisions, Vantage gives your program the same data-driven tools used at the highest levels of the sport.
        </p>
        <p className="text-[15.75px] text-slate-200 leading-relaxed text-center mt-3">
          Built for the bench, not just the box score: between-set breakdowns, timeout insights, and live alerts help you adjust in the moment, while attack and serve spray charts show exactly where points are won and lost. Scout opponents with their history and tendencies, find your best rotations and lineups with the lineup optimizer and rotation intelligence, and draw up plays on the built-in whiteboard or run practice tools — all in the same app. Automatic awards, records, Career Club totals, and milestones keep your players motivated all season long.
        </p>
        {/* Short feature bullets, tight under the paragraphs */}
        <ul className="mt-3 list-disc list-inside text-center text-sm text-slate-300 leading-snug">
          {FEATURES.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </section>

      {/* Contact & app info */}
      <div>
        <p className={HEAD}>Support</p>
        <div className={GROUP}>
          <a href="mailto:vantagevb@gmail.com" className={ROW}>
            <span className="flex items-center gap-3">
              <svg className="w-4 h-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
              <span className="flex flex-col items-start">
                Contact Us
                <span className="text-xs font-normal text-slate-500">vantagevb@gmail.com</span>
              </span>
            </span>
            <span className="text-slate-500 text-lg leading-none">›</span>
          </a>
          {APP_VERSION && (
            <div className={`${ROW} hover:bg-transparent active:bg-transparent`}>
              <span className="flex items-center gap-3">
                <svg className="w-4 h-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                App Version
              </span>
              <span className="text-slate-400 font-mono text-xs">{APP_VERSION}</span>
            </div>
          )}
        </div>
      </div>

      {/* Legal */}
      <div>
        <p className={HEAD}>Legal</p>
        <div className={GROUP}>
        <Link
          to="/terms"
          className={ROW}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span className="flex flex-col items-start">
              Terms &amp; Conditions
              {(() => {
                try {
                  const raw = localStorage.getItem(TERMS_STORAGE_KEY);
                  if (!raw) return null;
                  let acceptedAt = null;
                  try { acceptedAt = JSON.parse(raw).acceptedAt ?? null; } catch { /* old plain-string format */ }
                  if (!acceptedAt) return <span className="text-xs font-normal text-slate-500">Agreed (date not recorded)</span>;
                  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
                  return <span className="text-xs font-normal text-slate-500">Agreed {fmt.format(new Date(acceptedAt))}</span>;
                } catch { return null; }
              })()}
            </span>
          </span>
          <span className="text-slate-500 text-lg leading-none">›</span>
        </Link>
        <Link
          to="/privacy"
          className={ROW}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Privacy Policy
          </span>
          <span className="text-slate-500 text-lg leading-none">›</span>
        </Link>
        </div>
      </div>

    </div>
  );
}
