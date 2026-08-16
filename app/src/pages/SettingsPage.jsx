import { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { TabBar } from '../components/ui/Tab';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useStorageEstimate } from '../hooks/useStorageEstimate';
import { exportBackup } from '../stats/backup';
import { db } from '../db/schema';
import { useUiStore } from '../store/uiStore';
import { usePlan, PLAN_LABELS, TRIAL_MATCH_LIMIT } from '../hooks/usePlan';
import { countActiveSeasonTeams } from '../utils/teams';
import { useLiveQuery } from 'dexie-react-hooks';

import { HelpModal } from '../components/settings/HelpModal';
import { PricingTab } from '../components/settings/PricingTab';
import { PersonalizationTab } from '../components/settings/PersonalizationTab';
import { LiveMatchTab } from '../components/settings/LiveMatchTab';
import { MatchRulesTab } from '../components/settings/MatchRulesTab';
import { HelpTab } from '../components/settings/HelpTab';
import { DataManagementTab } from '../components/settings/DataManagementTab';
import { LegalTab } from '../components/settings/LegalTab';
import { AccountSection } from '../components/settings/AccountSection';

const fmtMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

const SETTINGS_TABS = [
  { value: 'pricing',         label: 'Pricing'         },
  { value: 'personalization', label: 'Personalization' },
  { value: 'live-match',      label: 'Live Match'      },
  { value: 'match-rules',     label: 'Match Rules'     },
  { value: 'help',            label: 'Help & Guides'   },
  { value: 'data',            label: 'Data Management' },
  { value: 'legal',           label: 'Legal'           },
];

export function SettingsPage() {
  const showToast = useUiStore((s) => s.showToast);
  const { plan, isActive, isMaster, teamsAllowed } = usePlan();

  const [settingsTab, setSettingsTab] = useState('pricing');
  const [helpTopic,   setHelpTopic]   = useState(null);
  const [storageRefreshKey, setStorageRefreshKey] = useState(0);

  const teams = useLiveQuery(() => db.teams.orderBy('name').toArray(), []);
  // Team limit is per season — mirror the enforcement in TeamsPage
  const activeSeasonTeamCount = useLiveQuery(countActiveSeasonTeams, []);
  const teamMatchCounts = useLiveQuery(async () => {
    if (!teams?.length) return {};
    const result = {};
    for (const team of teams) {
      const seasons = await db.seasons.where('team_id').equals(team.id).sortBy('year');
      if (!seasons.length) { result[team.id] = { matchCount: 0, seasonYear: null }; continue; }
      const latest = seasons[seasons.length - 1];
      const matchCount = await db.matches.where('season_id').equals(latest.id).count();
      result[team.id] = { matchCount, seasonYear: latest.year };
    }
    return result;
  }, [teams]);

  const { canInstall, isIOS, isInstalled, promptInstall } = useInstallPrompt();
  const storage = useStorageEstimate(storageRefreshKey);

  const usagePct = storage?.quota ? storage.usage / storage.quota : 0;
  const showStorageWarning = usagePct > 0.8;

  async function handleExport() {
    try {
      await exportBackup();
      showToast('Backup exported', 'success');
      setStorageRefreshKey(k => k + 1);
    } catch {
      showToast('Export failed', 'error');
    }
  }

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="p-4 space-y-4">

        {/* About */}
        <section className="bg-surface rounded-xl p-5">
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
            Vantage was built on a simple belief: the best decisions happen in the moment, not after the fact. By putting real-time, in-game data directly in coaches' hands, we empower coaches and players to become their best — and make the game better, one decision at a time.
          </p>
          <div className="border-t border-slate-700 my-4" />
          <p className="text-[15.75px] text-slate-200 leading-relaxed text-center">
            Vantage is a comprehensive volleyball statistics platform built for coaches who want a competitive edge. Record every contact live during a match — serves, passes, attacks, blocks, and digs — and instantly access deep analytics: rotation efficiency, player VER ratings, win correlation insights, and real-time performance alerts. All data lives on your device and works offline. From pre-match lineup prep to gametime decisions, Vantage gives your program the same data-driven tools used at the highest levels of the sport.
          </p>
          <button
            onClick={handleExport}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 active:scale-95 border border-slate-600/50 text-slate-300 hover:text-white font-semibold text-sm transition-all duration-150"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Backup
          </button>
        </section>

        {/* Install banner */}
        {!isInstalled && (canInstall || isIOS) && (
          <section className="bg-surface rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2
                className="text-[18.4px] font-black uppercase leading-none"
                style={{ color: '#ffffff', letterSpacing: '0.15em' }}
              >Install App</h2>
              <p className="text-xs text-slate-400 mt-0.5">Add VANTAGE to your home screen for the best experience</p>
            </div>
            <div className="p-4">
              {canInstall && (
                <Button className="w-full" onClick={promptInstall}>
                  Add to Home Screen
                </Button>
              )}
              {isIOS && !canInstall && (
                <div className="text-sm text-slate-300 space-y-1">
                  <p>To install on iOS:</p>
                  <ol className="list-decimal list-inside text-slate-400 space-y-1 ml-1">
                    <li>Tap the <span className="text-white font-medium">Share</span> button in Safari</li>
                    <li>Tap <span className="text-white font-medium">Add to Home Screen</span></li>
                    <li>Tap <span className="text-white font-medium">Add</span></li>
                  </ol>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Account level */}
        <div className={`w-fit mx-auto relative overflow-hidden btn-shimmer flex items-center gap-2 rounded-full px-3 py-1.5 border ${
          isMaster ? 'bg-yellow-400/10 border-yellow-400/30'
          : !isActive ? 'bg-red-400/10 border-red-400/30'
          : plan === 'trial' ? 'bg-slate-700/50 border-slate-600'
          : 'bg-primary/10 border-primary/30'
        }`}>
          <span className="text-lg font-bold text-slate-400 uppercase tracking-wider">Account Level</span>
          <span className={`text-lg font-bold ${
            isMaster ? 'text-yellow-400'
            : !isActive ? 'text-red-400'
            : plan === 'trial' ? 'text-slate-300'
            : 'text-primary'
          }`}>
            {isMaster ? 'Master' : isActive ? PLAN_LABELS[plan] : 'Expired'}
          </span>
        </div>

        {/* Credit usage */}
        {(() => {
          const teamsUsed = activeSeasonTeamCount ?? 0;
          const teamsAllowedDisplay = isMaster ? 'Unlimited' : teamsAllowed === 99 ? '5+' : String(teamsAllowed);
          const teamsRemaining = isMaster ? 'Unlimited' : teamsAllowed === 99 ? 'Unlimited' : String(Math.max(0, teamsAllowed - teamsUsed));
          return (
            <div className="bg-slate-800/60 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Credits</p>

              {/* Team credits */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Team Credits</span>
                <span className="text-sm font-bold text-white">
                  {isMaster ? (
                    <span className="text-emerald-400">Unlimited</span>
                  ) : (
                    <>{teamsUsed} used / {teamsAllowedDisplay} · <span className="text-emerald-400">{teamsRemaining} remaining</span></>
                  )}
                </span>
              </div>

              {/* Per-team match counters */}
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Season Match Credits (current season)</p>
                {!teams?.length ? (
                  <p className="text-xs text-slate-500 italic">No teams yet</p>
                ) : teams.map((team) => {
                  const info = teamMatchCounts?.[team.id];
                  const used = info?.matchCount ?? 0;
                  const isTrialPlan = plan === 'trial';
                  const remaining = isTrialPlan ? Math.max(0, TRIAL_MATCH_LIMIT - used) : null;
                  const pct = isTrialPlan ? Math.min(100, (used / TRIAL_MATCH_LIMIT) * 100) : 0;
                  return (
                    <div key={team.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300 font-medium truncate max-w-[55%]">{team.name}{info?.seasonYear ? ` · ${info.seasonYear}` : ''}</span>
                        <span className="text-xs font-bold text-white">
                          {!isTrialPlan ? (
                            <span className="text-emerald-400">Unlimited</span>
                          ) : (
                            <>{used} / {TRIAL_MATCH_LIMIT} · <span className={remaining === 0 ? 'text-red-400' : 'text-emerald-400'}>{remaining} left</span></>
                          )}
                        </span>
                      </div>
                      {isTrialPlan && (
                        <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Storage warning */}
        {showStorageWarning && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-sm">
            <p className="font-semibold text-red-300">Storage almost full</p>
            <p className="text-red-400 mt-0.5">
              {fmtMB(storage.usage)} MB used of {fmtMB(storage.quota)} MB —
              export a backup and consider clearing old data.
            </p>
          </div>
        )}

        {/* Storage info */}
        {storage && !showStorageWarning && (
          <div className="px-1 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Storage</span>
              <span>{fmtMB(storage.usage)} MB / {fmtMB(storage.quota)} MB ({(usagePct * 100).toFixed(1)}%)</span>
            </div>
            <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, usagePct * 100).toFixed(1)}%`,
                  background: usagePct >= 0.8 ? '#ef4444' : usagePct >= 0.5 ? '#f59e0b' : '#22c55e',
                }}
              />
            </div>
          </div>
        )}

        {/* Settings */}
        <section className="bg-surface rounded-xl overflow-hidden">
          <TabBar tabs={SETTINGS_TABS} active={settingsTab} onChange={setSettingsTab} />
          {settingsTab === 'pricing'         && <PricingTab />}
          {settingsTab === 'help'            && <HelpTab onOpenTopic={setHelpTopic} />}
          {settingsTab === 'personalization' && <PersonalizationTab />}
          {settingsTab === 'live-match'      && <LiveMatchTab />}
          {settingsTab === 'match-rules'     && <MatchRulesTab />}
          {settingsTab === 'data'            && <DataManagementTab onStorageChange={() => setStorageRefreshKey(k => k + 1)} />}
          {settingsTab === 'legal'           && <LegalTab />}
        </section>

        <AccountSection />

        <p className="text-center text-xs text-slate-800 pb-2">© VANTAGE</p>

      </div>

      <HelpModal topic={helpTopic} onClose={() => setHelpTopic(null)} />
    </div>
  );
}
