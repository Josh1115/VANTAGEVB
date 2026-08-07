import { fmtPct, fmtCount, fmtBlocks, fmtRate, fmtPassRating, fmtHitting, fmtVER } from './formatters';
import { VERBadge, WVERBadge } from '../components/stats/VERBadge';

// Flags the highest and lowest value in each of the given columns across
// `rows` (as `_min_<key>` / `_max_<key>`), for use with minMaxColor cellClass.
export function withMinMax(rows, keys) {
  for (const key of keys) {
    const vals = rows.map(r => r[key]).filter(v => v != null);
    if (!vals.length) continue;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    let maxDone = false;
    rows.forEach(r => {
      if (r[key] === min) r[`_min_${key}`] = true;
      if (!maxDone && r[key] === max) { r[`_max_${key}`] = true; maxDone = true; }
    });
  }
  return rows;
}

const SP_MP_COLS = [
  { key: 'mp', label: 'MP', fmt: fmtCount },
  { key: 'sp', label: 'SP', fmt: fmtCount },
];

export const SERVING_COLS = {
  all: [
    { key: 'name',     label: 'Player' },
    ...SP_MP_COLS,
    { key: 'sa',       label: 'SA',     fmt: fmtCount },
    { key: 'srv_pt',   label: 'SRV PT', fmt: fmtCount },
    { key: 'att_pt',   label: 'ATT:PT', fmt: fmtRate  },
    { key: 'ace',      label: 'ACE',    fmt: fmtCount },
    { key: 'se',       label: 'SE',     fmt: fmtCount },
    { key: 'si_pct',   label: 'S%',     fmt: fmtPct   },
    { key: 'ace_pct',  label: 'ACE%',   fmt: fmtPct   },
    { key: 'se_pct',   label: 'SE%',    fmt: fmtPct   },
    { key: 'se_ob',    label: 'SOB',    fmt: fmtCount },
    { key: 'se_net',   label: 'SNET',   fmt: fmtCount },
    { key: 'se_foot',  label: 'FOOT',   fmt: fmtCount },
    { key: 'sob_pct',  label: 'SOB%',   fmt: fmtPct   },
    { key: 'snet_pct', label: 'SNET%',  fmt: fmtPct   },
  ],
  float: [
    { key: 'name',      label: 'Player' },
    ...SP_MP_COLS,
    { key: 'f_sa',      label: 'SA',    fmt: fmtCount },
    { key: 'f_ace',     label: 'ACE',   fmt: fmtCount },
    { key: 'f_se',      label: 'SE',    fmt: fmtCount },
    { key: 'f_ace_pct', label: 'ACE%',  fmt: fmtPct   },
    { key: 'f_se_pct',  label: 'SE%',   fmt: fmtPct   },
    { key: 'f_si_pct',  label: 'S%',    fmt: fmtPct   },
  ],
  top: [
    { key: 'name',      label: 'Player' },
    ...SP_MP_COLS,
    { key: 't_sa',      label: 'SA',    fmt: fmtCount },
    { key: 't_ace',     label: 'ACE',   fmt: fmtCount },
    { key: 't_se',      label: 'SE',    fmt: fmtCount },
    { key: 't_ace_pct', label: 'ACE%',  fmt: fmtPct   },
    { key: 't_se_pct',  label: 'SE%',   fmt: fmtPct   },
    { key: 't_si_pct',  label: 'S%',    fmt: fmtPct   },
  ],
};

export const TAB_COLUMNS = {
  serving: SERVING_COLS.all,
  passing: [
    { key: 'name',    label: 'Player' },
    { key: 'mp',      label: 'MP',    fmt: fmtCount     },
    { key: 'sp',      label: 'SP',    fmt: fmtCount     },
    { key: 'pa',      label: 'REC',   fmt: fmtCount     },
    { key: 'apr',     label: 'APR',     fmt: fmtPassRating },
    { key: 'f_apr',   label: 'FLT APR', fmt: fmtPassRating },
    { key: 't_apr',   label: 'TOP APR', fmt: fmtPassRating },
    { key: 'pp_pct',  label: '3OPT%',   fmt: fmtPct       },
    { key: 'p0',      label: 'P0',    fmt: fmtCount     },
    { key: 'p1',      label: 'P1',    fmt: fmtCount     },
    { key: 'p2',      label: 'P2',    fmt: fmtCount     },
    { key: 'p3',      label: 'P3',    fmt: fmtCount     },
    { key: 'rot1_apr', label: 'R1 APR', fmt: fmtPassRating },
    { key: 'rot2_apr', label: 'R2 APR', fmt: fmtPassRating },
    { key: 'rot3_apr', label: 'R3 APR', fmt: fmtPassRating },
    { key: 'rot4_apr', label: 'R4 APR', fmt: fmtPassRating },
    { key: 'rot5_apr', label: 'R5 APR', fmt: fmtPassRating },
    { key: 'rot6_apr', label: 'R6 APR', fmt: fmtPassRating },
  ],
  attacking: [
    { key: 'name',      label: 'Player' },
    ...SP_MP_COLS,
    { key: 'ta',        label: 'ATT',   fmt: fmtCount   },
    { key: 'k',         label: 'K',     fmt: fmtCount   },
    { key: 'ae',        label: 'AE',    fmt: fmtCount   },
    { key: 'kps',       label: 'KPS',   fmt: fmtRate    },
    { key: 'k_pct',     label: 'K%',    fmt: fmtPct     },
    { key: 'hit_pct',   label: 'HIT%',  fmt: fmtHitting },
    { key: 'k_pure',     label: 'PURE',    fmt: fmtCount   },
    { key: 'k_pure_pct', label: 'PURE%',   fmt: fmtPct     },
    { key: 'k_tool',     label: 'TOOL',    fmt: fmtCount   },
    { key: 'k_tool_pct', label: 'TOOL%',   fmt: fmtPct     },
    { key: 'k_over',     label: 'OVER',    fmt: fmtCount   },
    { key: 'k_over_pct', label: 'OVER%',   fmt: fmtPct     },
    { key: 'k_tip',      label: 'TIP',     fmt: fmtCount   },
    { key: 'k_tip_pct',  label: 'TIP%',    fmt: fmtPct     },
    { key: 'k_bk',        label: 'BK',      fmt: fmtCount   },
    { key: 'k_bk_pct',   label: 'BK%',     fmt: fmtPct     },
    { key: 'k_touch',     label: 'TOUCH',   fmt: fmtCount   },
    { key: 'k_touch_pct', label: 'TOUCH%',  fmt: fmtPct     },
    { key: 'ae_ob',     label: 'OB',    fmt: fmtCount   },
    { key: 'ae_ob_pct', label: 'OB%',   fmt: fmtPct     },
    { key: 'ae_net',    label: 'NET',   fmt: fmtCount   },
    { key: 'ae_net_pct',label: 'NET%',  fmt: fmtPct     },
    { key: 'ae_blk',    label: 'BLK',   fmt: fmtCount   },
    { key: 'ae_blk_pct',label: 'BLK%',  fmt: fmtPct     },
    { key: 'ae_bra',    label: 'BRA',   fmt: fmtCount   },
    { key: 'ae_bra_pct',label: 'BRA%',  fmt: fmtPct     },
    { key: 'fbs',       label: 'FBS',   fmt: fmtCount   },
  ],
  ver: [
    { key: 'name',      label: 'Player' },
    ...SP_MP_COLS,
    { key: 'ver_raw',   label: 'VER',   fmt: fmtVER,    render: (v) => <VERBadge ver={v} /> },
    { key: 'ver',       label: 'wVER',  fmt: fmtVER,    render: (v) => <WVERBadge ver={v} /> },
    { key: 'wpa',       label: 'WPA',   fmt: fmtVER     },
    { key: 'wpa_pos',   label: 'WPA+',  fmt: fmtVER     },
    { key: 'wpa_neg',   label: 'WPA−',  fmt: fmtVER     },
    { key: 'k',         label: 'K',     fmt: fmtCount   },
    { key: 'ace',       label: 'ACE',   fmt: fmtCount   },
    { key: 'bs',        label: 'BS',    fmt: fmtCount   },
    { key: 'ba',        label: 'BA',    fmt: fmtCount   },
    { key: 'ast',       label: 'AST',   fmt: fmtCount   },
    { key: 'dig',       label: 'DIG',   fmt: fmtCount   },
    { key: 'pa',        label: 'REC',   fmt: fmtCount   },
    { key: 'p0',        label: 'P0',    fmt: fmtCount   },
    { key: 'p1',        label: 'P1',    fmt: fmtCount   },
    { key: 'p2',        label: 'P2',    fmt: fmtCount   },
    { key: 'p3',        label: 'P3',    fmt: fmtCount   },
    { key: 'ae',        label: 'AE',    fmt: fmtCount   },
    { key: 'se',        label: 'SE',    fmt: fmtCount   },
    { key: 'bhe',       label: 'BHE',   fmt: fmtCount   },
    { key: 'fbe',       label: 'DROP',   fmt: fmtCount   },
    { key: 'lift',      label: 'L',     fmt: fmtCount   },
    { key: 'net',       label: 'NET',   fmt: fmtCount   },
  ],
  blocking: [
    { key: 'name',  label: 'Player' },
    ...SP_MP_COLS,
    { key: 'blk',   label: 'BLK',   fmt: fmtBlocks },
    { key: 'bs',    label: 'BS',    fmt: fmtCount },
    { key: 'ba',    label: 'BA',    fmt: fmtCount },
    { key: 'bt',    label: 'TOUCH', fmt: fmtCount },
    { key: 'be',    label: 'BE',    fmt: fmtCount },
    { key: 'bps',   label: 'BPS',   fmt: fmtRate },
  ],
  defense: [
    { key: 'name',     label: 'Player' },
    ...SP_MP_COLS,
    { key: 'dig',      label: 'DIG',    fmt: fmtCount },
    { key: 'dig_rtg',  label: 'DIG RTG', fmt: fmtPassRating },
    { key: 'fb_dig',   label: 'FREE',   fmt: fmtCount },
    { key: 'free_rtg', label: 'FREE RTG', fmt: fmtPassRating },
    { key: 'de',       label: 'DE',     fmt: fmtCount },
    { key: 'dips',     label: 'DiPS',   fmt: fmtRate },
    { key: 'bcr',      label: 'BCR',    fmt: fmtRate },
    { key: 'fbe',      label: 'DROP',    fmt: fmtCount },
    { key: 'dg_k_pct', label: 'DG K%',  fmt: (v) => v != null ? `${Math.round(v * 100)}%` : '—' },
  ],
  setting: [
    { key: 'name',    label: 'Player' },
    ...SP_MP_COLS,
    { key: 'set_att', label: 'ATT', fmt: fmtCount },
    { key: 'ast',     label: 'AST', fmt: fmtCount },
    { key: 'bhe',     label: 'BHE', fmt: fmtCount },
    { key: 'lift',    label: 'L',   fmt: fmtCount },
    { key: 'dbl',     label: 'DBL', fmt: fmtCount },
    { key: 'aps',     label: 'APS', fmt: fmtRate  },
  ],
};

const minMaxColor = (key) => (v, row) => {
  if (row?.[`_min_${key}`]) return 'text-red-400 font-bold';
  if (row?.[`_max_${key}`]) return 'text-emerald-400 font-bold';
  return 'text-slate-300';
};

// IS/OOS per-rotation table columns (used in ReportsPage rotation analysis)
export const ISOOS_STAT_KEYS = ['is_ta', 'is_k_pct', 'is_hit_pct', 'is_win_pct', 'oos_ta', 'oos_k_pct', 'oos_hit_pct', 'oos_win_pct'];

export const ISOOS_COLS = [
  { key: 'name',        label: 'Rot'       },
  { key: 'is_ta',       label: 'IS',        fmt: fmtCount,   cellClass: minMaxColor('is_ta')       },
  { key: 'is_k_pct',    label: 'IS K%',     fmt: fmtPct,     cellClass: minMaxColor('is_k_pct')    },
  { key: 'is_hit_pct',  label: 'IS HIT%',   fmt: fmtHitting, cellClass: minMaxColor('is_hit_pct')  },
  { key: 'is_win_pct',  label: 'IS Win%',   fmt: fmtPct,     cellClass: minMaxColor('is_win_pct')  },
  { key: 'oos_ta',      label: 'OOS',       fmt: fmtCount,   cellClass: minMaxColor('oos_ta')      },
  { key: 'oos_k_pct',   label: 'OOS K%',    fmt: fmtPct,     cellClass: minMaxColor('oos_k_pct')   },
  { key: 'oos_hit_pct', label: 'OOS HIT%',  fmt: fmtHitting, cellClass: minMaxColor('oos_hit_pct') },
  { key: 'oos_win_pct', label: 'OOS Win%',  fmt: fmtPct,     cellClass: minMaxColor('oos_win_pct') },
];

// Transition/free-ball per-rotation table columns
export const TRANS_STAT_KEYS = ['free_ta', 'free_k_pct', 'free_hit_pct', 'free_win_pct', 'trans_ta', 'trans_k_pct', 'trans_hit_pct', 'trans_win_pct'];

export const TRANS_COLS = [
  { key: 'name',          label: 'Rot'       },
  { key: 'free_ta',       label: 'FB ATK',   fmt: fmtCount,   cellClass: minMaxColor('free_ta')       },
  { key: 'free_k_pct',    label: 'FB K%',    fmt: fmtPct,     cellClass: minMaxColor('free_k_pct')    },
  { key: 'free_hit_pct',  label: 'FB HIT%',  fmt: fmtHitting, cellClass: minMaxColor('free_hit_pct')  },
  { key: 'free_win_pct',  label: 'FB Win%',  fmt: fmtPct,     cellClass: minMaxColor('free_win_pct')  },
  { key: 'trans_ta',      label: 'TR ATK',   fmt: fmtCount,   cellClass: minMaxColor('trans_ta')      },
  { key: 'trans_k_pct',   label: 'TR K%',    fmt: fmtPct,     cellClass: minMaxColor('trans_k_pct')   },
  { key: 'trans_hit_pct', label: 'TR HIT%',  fmt: fmtHitting, cellClass: minMaxColor('trans_hit_pct') },
  { key: 'trans_win_pct', label: 'TR Win%',  fmt: fmtPct,     cellClass: minMaxColor('trans_win_pct') },
];

// Run-streak per-rotation table columns
const fmtAvg = (val) => val == null ? '—' : val.toFixed(1);
export const RUN_STAT_KEYS = ['max_run', 'avg_run', 'avg_stint', 'total_runs', 'runs_3plus', 'runs_5plus', 'runs_7plus', 'runs_9plus'];

export const RUN_COLS = [
  { key: 'name',       label: 'Rot'  },
  { key: 'max_run',    label: 'Best', fmt: fmtCount, cellClass: minMaxColor('max_run')    },
  { key: 'avg_run',    label: 'Avg Run',     fmt: fmtAvg,   cellClass: minMaxColor('avg_run')    },
  { key: 'avg_stint',  label: 'Avg Pts/ROT', fmt: fmtAvg,   cellClass: minMaxColor('avg_stint')  },
  { key: 'total_runs', label: '2+',   fmt: fmtCount, cellClass: minMaxColor('total_runs') },
  { key: 'runs_3plus', label: '3+',   fmt: fmtCount, cellClass: minMaxColor('runs_3plus') },
  { key: 'runs_5plus', label: '5+',   fmt: fmtCount, cellClass: minMaxColor('runs_5plus') },
  { key: 'runs_7plus', label: '7+',   fmt: fmtCount, cellClass: minMaxColor('runs_7plus') },
  { key: 'runs_9plus', label: '9+',   fmt: fmtCount, cellClass: minMaxColor('runs_9plus') },
];

export const ROTATION_STAT_KEYS = ['so_pct', 'so_opp', 'so_win', 'bp_pct', 'bp_opp', 'bp_win'];

export const ROTATION_COLS = [
  { key: 'name',    label: 'Rotation' },
  { key: 'so_pct',  label: 'SO%',    fmt: fmtPct,   cellClass: minMaxColor('so_pct') },
  { key: 'so_opp',  label: 'SO Opp', fmt: fmtCount, cellClass: minMaxColor('so_opp') },
  { key: 'so_win',  label: 'SO Win', fmt: fmtCount, cellClass: minMaxColor('so_win') },
  { key: 'bp_pct',  label: 'SP%',    fmt: fmtPct,   cellClass: minMaxColor('bp_pct') },
  { key: 'bp_opp',  label: 'SP Opp', fmt: fmtCount, cellClass: minMaxColor('bp_opp') },
  { key: 'bp_win',  label: 'SP Win', fmt: fmtCount, cellClass: minMaxColor('bp_win') },
];
