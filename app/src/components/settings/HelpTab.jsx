import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GuideGroup } from './GuideGroup';
import { FAQ_TOPICS } from './helpContent';

const ALL_GUIDES = [
  { to: '/help/first-match',         icon: '🆕', label: 'Your First Match'                 },
  { to: '/help/default-team',         icon: '🏠', label: 'Setting Up Default Team & Season' },
  { to: '/help/roster',               icon: '👥', label: 'Managing Your Roster'             },
  { to: '/help/live-match',           icon: '📲', label: 'Live Match Screen Guide'          },
  { to: '/help/serve-receive',        icon: '📐', label: 'Serve-Receive Formation Setup'    },
  { to: '/help/substitutions',        icon: '🔄', label: 'Substitutions & Lineup Changes'   },
  { to: '/help/match-summary',        icon: '📋', label: 'Match Summary Walkthrough'        },
  { to: '/help/exporting',            icon: '📤', label: 'Exporting & Sharing Stats'        },
  { to: '/help/reports',              icon: '📈', label: 'Reading the Reports Page'         },
  { to: '/help/player-report',        icon: '📊', label: 'Reading Player Reports'           },
  { to: '/help/pre-match-prep',       icon: '🎯', label: 'Pre-Match Prep Workflow'          },
  { to: '/help/season-history',       icon: '🏆', label: 'Season History & Playoff Entry'   },
  { to: '/help/end-season',           icon: '🏁', label: 'How to End a Season'              },
  { to: '/help/vantage-win-factors',  icon: '🏆', label: 'Reading Your Win Factors'         },
  { to: '/help/vantage-rotations',    icon: '🔄', label: 'Rotation Intelligence'            },
  { to: '/help/vantage-attack',       icon: '⚡', label: 'Attack Analytics'                 },
];

// `onOpenTopic` opens a FAQ topic in <HelpModal>, which is rendered by the
// parent (not here) — it stays mounted across tab switches so it doesn't
// close if the user taps away from Help while it's open.
export function HelpTab({ onOpenTopic }) {
  const [helpSearch, setHelpSearch] = useState('');

  return (
    <div className="p-4">

      <p className="text-center text-sm rounded-xl px-4 py-2 mb-4" style={{ color: '#fbbf24', border: '1px solid rgba(232,83,11,0.5)', background: 'rgba(232,83,11,0.1)' }}>
        Experiencing technical difficulties?{' '}
        <a href="mailto:vantagevb@gmail.com" className="underline font-bold">vantagevb@gmail.com</a>
      </p>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
        <input
          type="search"
          placeholder="Search help topics…"
          value={helpSearch}
          onChange={e => setHelpSearch(e.target.value)}
          className="w-full bg-bg border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
        />
      </div>

      {helpSearch.trim() ? (() => {
        const q = helpSearch.trim().toLowerCase();
        const matchedGuides = ALL_GUIDES.filter(g => g.label.toLowerCase().includes(q));
        const matchedFaqs = FAQ_TOPICS.filter(t =>
          t.label.toLowerCase().includes(q) ||
          t.content?.some(c =>
            (c.heading ?? '').toLowerCase().includes(q) ||
            (c.body ?? '').toLowerCase().includes(q)
          )
        );
        const hasResults = matchedGuides.length > 0 || matchedFaqs.length > 0;
        return (
          <div className="space-y-1">
            {!hasResults && (
              <p className="text-sm text-slate-500 text-center py-4">No results for &ldquo;{helpSearch.trim()}&rdquo;</p>
            )}
            {matchedGuides.map(({ to, icon, label }) => (
              <Link key={to} to={to}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg border border-primary/40 hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{icon}</span>
                  <span className="text-sm font-medium text-slate-200">{label}</span>
                  <span className="text-[9px] font-bold text-primary border border-primary/50 rounded px-1 py-px">GUIDE</span>
                </span>
                <span className="text-slate-500 text-sm">›</span>
              </Link>
            ))}
            {matchedFaqs.map((topic) => (
              <button
                key={topic.id}
                onClick={() => onOpenTopic(topic)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg border border-slate-700 hover:border-primary/60 hover:bg-primary/5 transition-colors text-left"
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{topic.icon}</span>
                  <span className="text-sm font-medium text-slate-200">{topic.label}</span>
                  <span className="text-[9px] font-bold text-slate-500 border border-slate-600 rounded px-1 py-px">FAQ</span>
                </span>
                <span className="text-slate-500 text-sm">›</span>
              </button>
            ))}
          </div>
        );
      })() : (
      <div className="space-y-4">

        <GuideGroup title="Getting Started" items={[
          { to: '/help/first-match',  icon: '🆕', label: 'Your First Match'                 },
          { to: '/help/default-team', icon: '🏠', label: 'Setting Up Default Team & Season' },
          { to: '/help/roster',       icon: '👥', label: 'Managing Your Roster'             },
        ]} />

        <GuideGroup title="Recording a Match" items={[
          { to: '/help/live-match',    icon: '📲', label: 'Live Match Screen Guide'        },
          { to: '/help/serve-receive', icon: '📐', label: 'Serve-Receive Formation Setup'  },
          { to: '/help/substitutions', icon: '🔄', label: 'Substitutions & Lineup Changes' },
        ]} />

        <GuideGroup title="After the Match" items={[
          { to: '/help/match-summary', icon: '📋', label: 'Match Summary Walkthrough' },
          { to: '/help/exporting',     icon: '📤', label: 'Exporting & Sharing Stats' },
        ]} />

        <GuideGroup title="Analysis & Reports" items={[
          { to: '/help/reports',        icon: '📈', label: 'Reading the Reports Page' },
          { to: '/help/player-report',  icon: '📊', label: 'Reading Player Reports'   },
          { to: '/help/pre-match-prep', icon: '🎯', label: 'Pre-Match Prep Workflow'  },
        ]} />

        <GuideGroup title="Season Management" items={[
          { to: '/help/season-history', icon: '🏆', label: 'Season History & Playoff Entry' },
          { to: '/help/end-season',     icon: '🏁', label: 'How to End a Season'            },
        ]} />

        <GuideGroup
          title="Find Your Vantage"
          groupDesc="Deep-dive guides on using your data to make better coaching decisions."
          isVantage
          items={[
            { to: '/help/vantage-win-factors', icon: '🏆', label: 'Reading Your Win Factors', desc: 'Which stats predict your wins'    },
            { to: '/help/vantage-rotations',   icon: '🔄', label: 'Rotation Intelligence',    desc: 'Find & fix your weak rotations'   },
            { to: '/help/vantage-attack',      icon: '⚡', label: 'Attack Analytics',          desc: 'Hit%, IS/OOS, pass-to-kill chain' },
          ]}
        />

        {/* FAQ modals */}
        <div>
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1.5 px-1">FAQ</p>
          <div className="space-y-1">
            {FAQ_TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => onOpenTopic(topic)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg border border-slate-700 hover:border-primary/60 hover:bg-primary/5 transition-colors text-left"
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{topic.icon}</span>
                  <span className="text-sm font-medium text-slate-200">{topic.label}</span>
                </span>
                <span className="text-slate-500 text-sm">›</span>
              </button>
            ))}
          </div>
        </div>

      </div>
      )}
    </div>
  );
}
