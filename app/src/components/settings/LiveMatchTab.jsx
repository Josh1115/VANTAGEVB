import { STORAGE_KEYS } from '../../utils/storage';
import { previewSound } from '../../utils/sound';
import { useToggleSetting, useStrSetting, useCourtViewMode } from '../../hooks/useSettingsStorage';

const COURT_VIEW_OPTIONS = [
  { id: 'smart',  label: 'Smart',  desc: 'Players slide into serve-receive and on-court positions automatically' },
  { id: 'base',   label: 'Base',   desc: 'Serving order until the ball is live, then simple base positions, then back' },
  { id: 'simple', label: 'Simple', desc: 'Players never move — always raw serving order' },
];

const ROSTER_SORT_OPTIONS = [
  { id: 'jersey',    label: 'Jersey #',    example: '#12'  },
  { id: 'first',     label: 'First Name',  example: 'Alex' },
  { id: 'last',      label: 'Last Name',   example: 'Smith'},
];

const PLAYER_NAME_FORMATS = [
  { id: 'initial_last', label: 'Initial + Last',   example: 'J. Smith'   },
  { id: 'last',         label: 'Last Name',         example: 'Smith'      },
  { id: 'first',        label: 'First Name',        example: 'John'       },
  { id: 'first_last',   label: 'First + Last',      example: 'John Smith' },
  { id: 'nickname',     label: 'Nickname',          example: 'Johnny'     },
];

function ToggleRow({ label, description, checked, onChange, children }) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div className="flex-1 min-w-0 pr-3">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">{description}</div>
        {children}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-slate-600'}`}
        aria-checked={checked}
        role="switch"
        aria-label={label}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

export function LiveMatchTab() {
  const [wakeLock,   saveWakeLock]   = useToggleSetting(STORAGE_KEYS.WAKE_LOCK);
  const [hapticOn,   saveHaptic]     = useToggleSetting(STORAGE_KEYS.HAPTIC);
  const [soundsOn,   saveSounds]     = useToggleSetting(STORAGE_KEYS.SOUNDS);
  const [flipLayout, saveFlipLayout] = useToggleSetting(STORAGE_KEYS.FLIP_LAYOUT);
  const [courtViewMode, saveCourtViewMode] = useCourtViewMode();
  const [serveZonePrompt, saveServeZonePrompt] = useToggleSetting(STORAGE_KEYS.SERVE_ZONE_PROMPT, true);
  const [playerNameFormat, savePlayerNameFormat] = useStrSetting(STORAGE_KEYS.PLAYER_NAME_FORMAT, 'initial_last');
  const [rosterSort,       saveRosterSort]       = useStrSetting(STORAGE_KEYS.ROSTER_SORT, 'jersey');

  return (
    <div className="p-4 divide-y divide-slate-700/60 space-y-0">
      <p className="text-xs text-slate-400 pb-3">Applied during active stat recording</p>

      <ToggleRow label="Keep Screen Awake" description="Prevent the screen from sleeping during a match" checked={wakeLock} onChange={saveWakeLock} />

      <ToggleRow label="Haptic Feedback" description="Brief vibration on each contact tap" checked={hapticOn} onChange={saveHaptic} />

      <ToggleRow label="Serve Attempt / Ace Spray Chart" description="After each serve that lands in, ask where it landed in the opponent's court to build the spray chart on the match summary" checked={serveZonePrompt} onChange={saveServeZonePrompt} />

      <ToggleRow label="Sound Effects" description="Audio cues for aces, kills, and blocks" checked={soundsOn} onChange={saveSounds}>
        <button
          onClick={(e) => { e.stopPropagation(); previewSound(); }}
          className="mt-1 text-[10px] font-semibold text-primary hover:text-orange-300 transition-colors"
        >
          ▶ Preview
        </button>
      </ToggleRow>

      {/* Player name format */}
      <div className="py-3 first:pt-0 last:pb-0">
        <div className="text-sm font-medium mb-0.5">Player Name Format</div>
        <div className="text-xs text-slate-400 mb-3">How names appear on the player badge bar during a match</div>
        <div className="flex flex-col gap-1.5">
          {PLAYER_NAME_FORMATS.map(({ id, label, example }) => (
            <button
              key={id}
              onClick={() => savePlayerNameFormat(id)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                playerNameFormat === id
                  ? 'bg-primary/20 border-primary text-white'
                  : 'bg-bg border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <span className="font-medium">{label}</span>
              <span className={`font-mono text-xs ${playerNameFormat === id ? 'text-primary' : 'text-slate-500'}`}>
                {example}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lineup roster sort */}
      <div className="py-3 first:pt-0 last:pb-0">
        <div className="text-sm font-medium mb-0.5">Lineup Roster Sort</div>
        <div className="text-xs text-slate-400 mb-3">Order of players in the lineup builder dropdown</div>
        <div className="flex gap-2">
          {ROSTER_SORT_OPTIONS.map(({ id, label, example }) => (
            <button
              key={id}
              onClick={() => saveRosterSort(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border text-sm transition-colors ${
                rosterSort === id
                  ? 'bg-primary/20 border-primary text-white'
                  : 'bg-bg border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <span className="font-medium text-xs">{label}</span>
              <span className={`font-mono text-[10px] ${rosterSort === id ? 'text-primary' : 'text-slate-500'}`}>{example}</span>
            </button>
          ))}
        </div>
      </div>

      <ToggleRow label="Flip Team Layout" description="Show your team on the right side of the scoreboard" checked={flipLayout} onChange={saveFlipLayout} />

      {/* Court view */}
      <div className="py-3 first:pt-0 last:pb-0">
        <div className="text-sm font-medium mb-0.5">Court View</div>
        <div className="text-xs text-slate-400 mb-3">How players are arranged on the court during a live match</div>
        <div className="flex gap-2">
          {COURT_VIEW_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => saveCourtViewMode(id)}
              className={`flex-1 px-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                courtViewMode === id
                  ? 'bg-primary/20 border-primary text-white'
                  : 'bg-bg border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-400 mt-2">
          {COURT_VIEW_OPTIONS.find((o) => o.id === courtViewMode)?.desc}
        </div>
      </div>

    </div>
  );
}
