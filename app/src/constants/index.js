// Team/org color ID → hex (matches ORG_COLORS in TeamsPage)
export const ORG_COLOR_HEX = {
  red:    '#dc2626',
  orange: '#ea580c',
  yellow: '#ca8a04',
  blue:   '#1d4ed8',
  purple: '#7c3aed',
  pink:   '#db2777',
  white:  '#e2e8f0',
  black:  '#1e293b',
  gray:   '#64748b',
  green:  '#16a34a',
};

// Player positions
export const POSITIONS = {
  S:   'Setter',
  OH:  'Outside Hitter',
  OPP: 'Opposite',
  MB:  'Middle Blocker',
  L:   'Libero',
  DS:  'Defensive Specialist',
  RS:  'Right Side',
};
export const POSITION_KEYS = Object.keys(POSITIONS);

// Match states
export const MATCH_STATUS = {
  SCHEDULED:   'scheduled',
  SETUP:       'setup',
  IN_PROGRESS: 'in_progress',
  COMPLETE:    'complete',
};

// Set states
export const SET_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETE:    'complete',
};

// Serve side / point winner
export const SIDE = {
  US:   'us',
  THEM: 'them',
};

// Serve / receive type (tracked on every serve and pass contact)
export const SERVE_TYPE = {
  FLOAT:    'float',
  TOPSPIN:  'topspin',
};

// Contact action types
export const ACTION = {
  SERVE:             'serve',
  PASS:              'pass',
  SET:               'set',
  ATTACK:            'attack',
  BLOCK:             'block',
  DIG:               'dig',
  FREEBALL_RECEIVE:  'freeball_receive',
  FREEBALL_SEND:     'freeball_send',
  ERROR:             'error',
};

// Contact results by action
export const RESULT = {
  // serve
  ACE:                 'ace',
  IN:                  'in',
  ERROR:               'error',
  // set
  ASSIST:              'assist',
  BALL_HANDLING_ERROR: 'ball_handling_error',
  // attack
  KILL:                'kill',
  ATTEMPT:             'attempt',
  // block — note: stored value 'assist' is disambiguated at query time via action='block'
  SOLO:                'solo',
  BLOCK_ASSIST:        'assist',
  // dig
  SUCCESS:             'success',
  FREEBALL:            'freeball',
  // freeball
  FREE_BALL_ERROR:     'free_ball_error',
  // other errors
  LIFT:                'lift',
  DOUBLE:              'double',
  NET_TOUCH:           'net',
  ROTATION_ERROR:      'rotation_error',
};

// Match format
export const FORMAT = {
  BEST_OF_3: 'best_of_3',
  BEST_OF_5: 'best_of_5',
};

// Trackable stats for live record alerts
export const TRACKABLE_STATS = [
  { label: 'Kills',           key: 'k',       type: 'count' },
  { label: 'Aces',            key: 'ace',     type: 'count' },
  { label: 'Digs',            key: 'dig',     type: 'count' },
  { label: 'Solo Blocks',     key: 'bs',      type: 'count' },
  { label: 'Block Assists',   key: 'ba',      type: 'count' },
  { label: 'Assists',         key: 'ast',     type: 'count' },
  { label: 'Attack Attempts', key: 'ta',      type: 'count' },
  { label: 'Hitting %',       key: 'hit_pct', type: 'rate'  },
  { label: 'Kill %',          key: 'k_pct',   type: 'rate'  },
  { label: 'Avg Pass Rating', key: 'apr',     type: 'rate'  },
];

// VER position multipliers — calibrated against real season data (2026), not guessed.
// Every position was tested by computing an actual best-player-of-the-season's raw
// (pre-multiplier) VER and solving for the multiplier that placed that season in its
// deserved tier. Earlier round-number guesses (OH 1.00, MB 1.05, S 0.90, L 1.65, DS 2.00)
// left every non-OH position landing at BENCH/AVG even in genuinely great seasons —
// a flat multiplier can't fix a position having fewer stat categories to draw from
// (a Libero only ever touches DIG/passing; a setter/OH touch nearly everything).
// OH/OPP/RS are no longer a fixed "baseline" — they needed real recalibration too.
export const POSITION_MULTIPLIERS = {
  OH:  2.70,
  OPP: 2.70,
  RS:  2.70,
  MB:  4.75,
  S:   4.00,
  L:   4.75,
  DS:  5.00,
};

// App accent colors — shared between main.jsx (CSS variable bootstrap) and SettingsPage
export const ACCENT_COLORS = [
  { id: 'orange', label: 'Orange', hex: '#e8530b', rgb: '232 83 11' },
  { id: 'blue',   label: 'Blue',   hex: '#3b82f6', rgb: '59 130 246' },
  { id: 'green',  label: 'Green',  hex: '#22c55e', rgb: '34 197 94'  },
  { id: 'red',    label: 'Red',    hex: '#ef4444', rgb: '239 68 68'  },
  { id: 'purple', label: 'Purple', hex: '#a855f7', rgb: '168 85 247' },
  { id: 'yellow', label: 'Yellow', hex: '#eab308', rgb: '234 179 8'  },
  { id: 'maroon', label: 'Maroon', hex: '#9b1c1c', rgb: '155 28 28'  },
  { id: 'navy',   label: 'Navy',   hex: '#1e3a5f', rgb: '30 58 95'   },
  { id: 'forest', label: 'Forest', hex: '#166534', rgb: '22 101 52'  },
  { id: 'gold',   label: 'Gold',   hex: '#b45309', rgb: '180 83 9'   },
  { id: 'teal',   label: 'Teal',   hex: '#0f766e', rgb: '15 118 110' },
  { id: 'pink',   label: 'Pink',   hex: '#db2777', rgb: '219 39 119' },
];

export const COLLEGE_DIVISIONS = [
  { value: 'NCAA D1', label: 'NCAA D1' },
  { value: 'NCAA D2', label: 'NCAA D2' },
  { value: 'NCAA D3', label: 'NCAA D3' },
  { value: 'NAIA',    label: 'NAIA'    },
  { value: 'JUCO',    label: 'JUCO'    },
  { value: 'Club',    label: 'Club'    },
];

// Plan feature lists
export const TRIAL_MATCH_LIMIT  = 5;
export const TRIAL_FEATURES     = [
  'Full Core feature access',
  'All analytics & reports',
  'Practice tools & whiteboard',
  'Opponent scouting page',
  'Multi-format export (PDF, CSV, MaxPreps)',
  'Limited to 5 matches',
  'Read-only after trial ends',
];
// Kept for grandfathered Baseline users
export const BASELINE_FEATURES  = [
  'Limited to one level',
  'Limited to one season',
  'Max 20 matches',
  'Basic stats (K, Ace, Blk, Digs, Ast, Errs)',
  'Live stat recording',
  'No Records page',
  'No History page',
  'No Reports page',
  'No MaxPreps export',
  'Limited settings & customization',
  'Baseline priority support',
  'No tools / practice features',
  'No whiteboard',
  'No opponent page',
];
export const CORE_FEATURES      = ['Full analytics suite', 'Career records & history', 'Practice tools', 'Opponent scouting page', 'Rotation optimizer', 'Multi-format export (PDF, CSV, MaxPreps)'];
export const ADVANTAGE_FEATURES = ['Everything in CORE', 'Two levels per program (JV + Varsity)', 'Up to 45 matches per team/level', 'Priority customer support'];
export const TOPPER_FEATURES    = ['Everything in ADVANTAGE', 'Up to 60 matches per team/level'];

// Jersey / team colors — shared between TeamsPage (color picker) and SeasonsPage (accent derivation)
export const JERSEY_COLORS = [
  { id: 'black',  label: 'Black',  bg: '#111827', border: '#374151' },
  { id: 'white',  label: 'White',  bg: '#f8fafc', border: '#94a3b8' },
  { id: 'gray',   label: 'Gray',   bg: '#94a3b8', border: '#64748b' },
  { id: 'red',    label: 'Red',    bg: '#dc2626', border: '#ef4444' },
  { id: 'orange', label: 'Orange', bg: '#ea580c', border: '#e8530b' },
  { id: 'yellow', label: 'Yellow', bg: '#ca8a04', border: '#eab308' },
  { id: 'green',  label: 'Green',  bg: '#16a34a', border: '#22c55e' },
  { id: 'blue',   label: 'Blue',   bg: '#1d4ed8', border: '#3b82f6' },
  { id: 'purple', label: 'Purple', bg: '#7c3aed', border: '#a855f7' },
  { id: 'pink',   label: 'Pink',   bg: '#db2777', border: '#ec4899' },
];

// School year badge classes (shared between HistoryPage and PlayerStatsPage)
export const SCHOOL_YEAR_CLS = {
  Freshman:  'bg-white text-black border-white/30',
  Sophomore: 'bg-teal-400 text-black border-teal-300/50',
  Junior:    'bg-blue-600 text-white border-blue-500/50',
  Senior:    'bg-black text-white border-slate-600',
};

// NFHS rules
// MAX_SUBS_PER_SET: intentionally 18 (club/college rules) rather than NFHS's 12.
// Overridable via localStorage key 'vbstat_max_subs'. Change to 12 for strict NFHS play.
export const NFHS = {
  MAX_SUBS_PER_SET:     18,
  MAX_TIMEOUTS_PER_SET:  2,
  SET_WIN_SCORE:        25,
  FIFTH_SET_WIN_SCORE:  15,
  WIN_BY:                2,
};

