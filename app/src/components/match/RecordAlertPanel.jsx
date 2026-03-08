const MILESTONE_CONFIG = {
  beat: {
    bg:     'bg-yellow-500/20',
    border: 'border-yellow-400',
    icon:   '🏆',
    label:  (a) => `NEW RECORD! ${a.playerName} · ${a.currentValue} ${a.statLabel} (prev: ${a.recordValue})`,
  },
  tie: {
    bg:     'bg-slate-400/20',
    border: 'border-slate-300',
    icon:   '⚡',
    label:  (a) => `TIED RECORD! ${a.playerName} · ${a.currentValue} ${a.statLabel}`,
  },
  one_away: {
    bg:     'bg-orange-500/20',
    border: 'border-orange-400',
    icon:   '🔥',
    label:  (a) => `1 Away From Record! ${a.playerName} · ${a.currentValue} ${a.statLabel} (rec: ${a.recordValue})`,
  },
  pct90: {
    bg:     'bg-yellow-600/20',
    border: 'border-yellow-500',
    icon:   '▲',
    label:  (a) => `90% of Record — ${a.playerName} · ${a.currentValue} ${a.statLabel} (rec: ${a.recordValue})`,
  },
  pct80: {
    bg:     'bg-green-600/20',
    border: 'border-green-500',
    icon:   '▲',
    label:  (a) => `80% of Record — ${a.playerName} · ${a.currentValue} ${a.statLabel} (rec: ${a.recordValue})`,
  },
};

export function RecordAlertPanel({ alerts }) {
  if (!alerts?.length) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
        No active record alerts
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {alerts.map((alert) => {
        const cfg = MILESTONE_CONFIG[alert.milestone];
        if (!cfg) return null;
        return (
          <div
            key={`${alert.recordId}_${alert.milestone}`}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border}`}
          >
            <span className="text-xl flex-shrink-0">{cfg.icon}</span>
            <span className="text-sm font-semibold text-white">{cfg.label(alert)}</span>
          </div>
        );
      })}
    </div>
  );
}
