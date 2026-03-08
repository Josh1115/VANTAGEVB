import { fmtPct, fmtCount } from './formatters';

export const ROTATION_COLS = [
  { key: 'name',    label: 'Rotation' },
  { key: 'so_pct',  label: 'SO%',    fmt: fmtPct   },
  { key: 'so_opp',  label: 'SO Opp', fmt: fmtCount },
  { key: 'so_win',  label: 'SO Win', fmt: fmtCount },
  { key: 'bp_pct',  label: 'BP%',    fmt: fmtPct   },
  { key: 'bp_opp',  label: 'BP Opp', fmt: fmtCount },
  { key: 'bp_win',  label: 'BP Win', fmt: fmtCount },
];
