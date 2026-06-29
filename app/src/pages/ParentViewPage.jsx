import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPvStats, subscribePvChanges } from '../utils/supabase';
import { LiveScoreBoard } from '../components/parentvantage/LiveScoreBoard';
import { LiveFeed } from '../components/parentvantage/LiveFeed';

const LIVE_TIMEOUT_MS = 45_000;

function fmtDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

function LocationBadge({ location }) {
  if (!location) return null;
  const map = { home: ['H', 'bg-emerald-900/50 text-emerald-400'], away: ['A', 'bg-red-900/50 text-red-400'], neutral: ['N', 'bg-slate-700 text-slate-400'] };
  const [label, cls] = map[location] ?? ['?', 'bg-slate-700 text-slate-400'];
  return <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${cls}`}>{label}</span>;
}

const STAT_COLS = [
  { key: 'attackAtt', label: 'TA'  },
  { key: 'kills',     label: 'K'   },
  { key: 'attackErr', label: 'AE'  },
  { key: 'serves',    label: 'SA'  },
  { key: 'aces',      label: 'ACE' },
  { key: 'serveErr',  label: 'SE'  },
  { key: 'apr',       label: 'APR' },
  { key: 'blocks',    label: 'BLK' },
  { key: 'digs',      label: 'DIG' },
];

function fmt(key, val) {
  if (key === 'apr') return val != null ? Number(val).toFixed(2) : '—';
  return val ?? 0;
}

function BoxScore({ players }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/50">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-700/60">
              <th className="sticky left-0 z-10 bg-slate-900 text-left px-3 py-2.5 font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Player</th>
              {STAT_COLS.map(c => (
                <th key={c.key} className="text-center px-3 py-2.5 font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => {
              const s = p.stats ?? {};
              const rowBg = i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750';
              return (
                <tr key={p.id} className={rowBg}>
                  <td className={`sticky left-0 z-10 ${rowBg} px-3 py-2.5 whitespace-nowrap border-b border-slate-700/30`}>
                    <span className="font-black text-primary mr-1.5">#{p.jersey}</span>
                    <span className="font-semibold text-white">{p.name}</span>
                  </td>
                  {STAT_COLS.map(c => (
                    <td key={c.key} className="text-center px-3 py-2.5 tabular-nums text-white font-medium border-b border-slate-700/30">
                      {fmt(c.key, s[c.key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamStatBar({ teamStats }) {
  if (!teamStats) return null;
  const stats = [
    { label: 'Kills',   value: teamStats.kills   },
    { label: 'Aces',    value: teamStats.aces    },
    { label: 'Digs',    value: teamStats.digs    },
    { label: 'Blocks',  value: teamStats.blocks  },
    { label: 'Assists', value: teamStats.assists },
  ];
  return (
    <div className="flex justify-between bg-slate-800 rounded-xl px-4 py-3">
      {stats.map(s => (
        <div key={s.label} className="flex flex-col items-center gap-0.5">
          <span className="text-base font-black text-white tabular-nums">{s.value ?? 0}</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export function FamilyScopeViewPage() {
  const { token } = useParams();
  const [snapshot, setSnapshot]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [liveData, setLiveData]       = useState(null);
  const [feedEvents, setFeedEvents]   = useState([]);
  const [isLive, setIsLive]           = useState(false);
  const [activeTab, setActiveTab]     = useState('boxscore'); // 'boxscore' | 'feed'
  const [isOnline, setIsOnline]       = useState(navigator.onLine);
  const liveTimerRef                  = useRef(null);

  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchPvStats(token).then(data => {
      if (!data) { setNotFound(true); setLoading(false); return; }
      setSnapshot(data.payload);
      if (data.live_score) setLiveData(data.live_score);
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  const resetLiveTimer = useCallback(() => {
    setIsLive(true);
    clearTimeout(liveTimerRef.current);
    liveTimerRef.current = setTimeout(() => setIsLive(false), LIVE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (!token || !isOnline) return;
    const channel = subscribePvChanges(token, (row) => {
      if (row.payload) setSnapshot(row.payload);
      const live = row.live_score;
      if (!live) return;
      setLiveData(live);
      resetLiveTimer();
      if (live.lastFeedItem) {
        setFeedEvents(prev => [...prev, live.lastFeedItem].slice(-40));
      }
    });
    return () => { channel.unsubscribe(); clearTimeout(liveTimerRef.current); };
  }, [token, resetLiveTimer, isOnline]);

  const players = snapshot?.players ?? [];
  const matchData = snapshot?.match;
  const ourTeam   = snapshot?.ourTeam;

  const matchStatus = isLive ? 'live'
    : matchData?.status === 'complete' ? 'final'
    : matchData?.status === 'in_progress' ? 'in_progress'
    : 'scheduled';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-5xl">🏐</div>
        <h1 className="text-xl font-black text-white">Match Not Available</h1>
        <p className="text-sm text-slate-400 max-w-xs">
          This share link has expired or the match has ended. Ask your coach for a new link when the next match starts.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {!isOnline && (
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 text-xs text-slate-400 text-center">
          You&rsquo;re offline — live updates paused
        </div>
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-black text-white leading-tight truncate">
              {ourTeam?.name ?? 'Home'} vs {matchData?.opponent ?? 'Away'}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {matchData?.date && (
                <span className="text-xs text-slate-400">{fmtDate(matchData.date)}</span>
              )}
              {matchData?.location && <LocationBadge location={matchData.location} />}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {matchStatus === 'live' && (
              <span className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
            {matchStatus === 'final' && (
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Final</span>
            )}
            <span className="text-[10px] font-bold text-slate-600 tracking-widest">VANTAGE</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Live scoreboard — visible whenever we have score data */}
        {liveData && matchStatus !== 'scheduled' && (
          <LiveScoreBoard liveData={liveData} teamName={ourTeam?.name} opponentName={matchData?.opponent} />
        )}

        {/* Final score from snapshot */}
        {matchStatus === 'final' && !liveData && matchData && (
          <div className="bg-slate-800 rounded-xl px-6 py-4 flex items-center justify-between">
            <div className="text-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{ourTeam?.name ?? 'US'}</div>
              <div className="text-4xl font-black text-white">{matchData.ourSetsWon ?? 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sets</div>
              <div className="flex items-center gap-1">
                {matchData.ourSetsWon > matchData.oppSetsWon
                  ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400">W</span>
                  : <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-900/60 text-red-400">L</span>
                }
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{matchData.opponent ?? 'THEM'}</div>
              <div className="text-4xl font-black text-white">{matchData.oppSetsWon ?? 0}</div>
            </div>
          </div>
        )}

        {/* Waiting state */}
        {matchStatus === 'scheduled' && (
          <div className="bg-slate-800/60 rounded-xl px-4 py-5 text-center space-y-2">
            <div className="text-2xl">🏐</div>
            <div className="text-sm font-semibold text-white">Match hasn&rsquo;t started yet</div>
            <div className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Stats and live score will appear automatically once recording begins.
            </div>
          </div>
        )}

        {/* Team stat totals */}
        {snapshot?.teamStats && matchStatus !== 'scheduled' && (
          <TeamStatBar teamStats={snapshot.teamStats} />
        )}

        {/* No-data state when snapshot exists but no players yet */}
        {players.length === 0 && matchStatus !== 'scheduled' && (
          <div className="bg-slate-800/60 rounded-xl px-4 py-5 text-center space-y-2">
            <div className="text-2xl">📊</div>
            <div className="text-sm font-semibold text-white">
              {matchStatus === 'final' ? 'No stats recorded' : 'Stats will appear as the match progresses'}
            </div>
            <div className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {matchStatus === 'final'
                ? 'No stat data was recorded for this match.'
                : 'Player stats update after each rally once the lineup is set.'}
            </div>
          </div>
        )}

        {/* Box Score + Play-by-Play tabs */}
        {players.length > 0 && (
          <div>
            <div className="flex border-b border-slate-700/60 mb-3">
              {[['boxscore', 'Box Score'], ['feed', 'Play-by-Play']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wide transition-colors ${
                    activeTab === key
                      ? 'text-white border-b-2 border-orange-500'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'boxscore' && <BoxScore players={players} />}

            {activeTab === 'feed' && (
              <div>
                {feedEvents.length > 0 ? (
                  <LiveFeed events={feedEvents} />
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    {isLive ? 'Waiting for plays…' : 'Play-by-play appears here during the match'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* In-progress banner — below box score */}
        {matchStatus === 'in_progress' && !isLive && (
          <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-amber-300 font-semibold">Match in progress — waiting for live updates…</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6">
          <span className="text-xs text-slate-700 font-bold tracking-widest">POWERED BY VANTAGE</span>
        </div>
      </div>
    </div>
  );
}
