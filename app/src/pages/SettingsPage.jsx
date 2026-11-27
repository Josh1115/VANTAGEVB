import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { TabBar } from '../components/ui/Tab';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useStorageEstimate } from '../hooks/useStorageEstimate';
import { db } from '../db/schema';
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
import { AboutTab } from '../components/settings/AboutTab';
import { AccountSection, AccountIdentity } from '../components/settings/AccountSection';

const fmtMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

const SETTINGS_TABS = [
  { value: 'live-match',      label: 'Live Match'      },
  { value: 'match-rules',     label: 'Match Rules'     },
  { value: 'personalization', label: 'Personalization' },
  { value: 'data',            label: 'Data Management' },
  { value: 'help',            label: 'Help & Guides'   },
  { value: 'pricing',         label: 'Pricing'         },
  { value: 'about',           label: 'About'           },
];

export function SettingsPage() {
  const { plan, isActive, isMaster, teamsAllowed } = usePlan();

  // Dashboard nudges (e.g. the duplicate-records banner) can deep-link here
  // via navigate('/settings', { state: { tab, openDedupe } }) instead of
  // landing a coach on the default tab and making them hunt for the button.
  const location = useLocation();
  const [settingsTab, setSettingsTab] = useState(location.state?.tab ?? 'live-match');
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

  return (
    <div>
      {/* Same logo-over-title header as Teams / Records / History / Reports */}
      <header className="sticky top-0 z-20 bg-bg border-b border-slate-800 px-4 pb-3 pt-safe flex flex-col items-center gap-0.5">
        <div className="relative mx-auto" style={{ width: 'min(52vw, 260px)' }}>
          <img
            src="/logo.png"
            alt="VANTAGE"
            className="h-auto w-full block"
            style={{ transform: 'translateX(-3%)' }}
          />
          <span className="absolute text-slate-400 select-none" style={{ top: '6%', right: '2%', fontSize: 'min(2.2vw, 11px)' }}>™</span>
        </div>
        <span className="text-lg font-bold text-white tracking-wide">Settings</span>
      </header>

      <div className="p-4 space-y-4">
        {/* Settings */}
        <section className="bg-surface rounded-xl overflow-hidden">
          <TabBar tabs={SETTINGS_TABS} active={settingsTab} onChange={setSettingsTab} centered dividers />
          {settingsTab === 'pricing'         && <PricingTab />}
          {settingsTab === 'help'            && <HelpTab onOpenTopic={setHelpTopic} />}
          {settingsTab === 'personalization' && <PersonalizationTab />}
          {settingsTab === 'live-match'      && <LiveMatchTab />}
          {settingsTab === 'match-rules'     && <MatchRulesTab />}
          {settingsTab === 'data'            && <DataManagementTab onStorageChange={() => setStorageRefreshKey(k => k + 1)} autoOpenDedupe={location.state?.openDedupe} />}
          {settingsTab === 'about'           && <AboutTab />}
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

        {/* Account — plan level, credits, storage and sign-in all in one card */}
        <section className="bg-surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2
              className="text-[18.4px] font-black uppercase leading-none text-center"
              style={{ color: '#ffffff', letterSpacing: '0.15em' }}
            >Account</h2>
          </div>
          <div className="p-4 space-y-4">
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

        <AccountIdentity className="justify-center" />

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

        <AccountSection bare />
          </div>
        </section>


        <p className="text-center text-xs text-slate-800 pb-2">© VANTAGE</p>

      </div>

      <HelpModal topic={helpTopic} onClose={() => setHelpTopic(null)} />
    </div>
  );
}
