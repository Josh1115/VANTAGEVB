import { useState } from 'react';
import { FORMAT, ACCENT_COLORS } from '../constants';
import {
  getStorageItem, setStorageItem,
  getBoolStorage, setBoolStorage,
  getBoolStorageDefaultTrue,
  getIntStorage, STORAGE_KEYS,
} from '../utils/storage';

// Small localStorage-backed setting hooks shared across the Settings page's
// tabs. Each one is independent and side-effect-free to call from more than
// one component — there's no coordination needed between callers.

export const DEFAULT_MAX_SUBS = 18;
export const DEFAULT_FORMAT   = FORMAT.BEST_OF_3;
export const DEFAULT_PROJECTED_MATCHES = 35;

export function useToggleSetting(key, defaultVal = false) {
  const [val, setVal] = useState(() => defaultVal ? getBoolStorageDefaultTrue(key) : getBoolStorage(key));
  const save = (next) => { setBoolStorage(key, next); setVal(next); };
  return [val, save];
}

export function useSidelineMode() {
  const [on, setOn] = useState(() => getBoolStorage(STORAGE_KEYS.SIDELINE_MODE));
  const save = (next) => {
    setBoolStorage(STORAGE_KEYS.SIDELINE_MODE, next);
    document.documentElement.classList.toggle('sideline', next);
    setOn(next);
  };
  return [on, save];
}

export function useAccentColor() {
  const [accent, setAccent] = useState(() => getStorageItem(STORAGE_KEYS.ACCENT, 'orange'));
  const save = (id) => {
    const c = ACCENT_COLORS.find((x) => x.id === id) ?? ACCENT_COLORS[0];
    setStorageItem(STORAGE_KEYS.ACCENT, id);
    document.documentElement.style.setProperty('--color-primary', c.hex);
    document.documentElement.style.setProperty('--color-primary-rgb', c.rgb);
    setAccent(id);
  };
  return [accent, save];
}

// Court View: 'smart' | 'base' | 'simple'. Migrates the old on/off
// "Simple Rotation View" toggle for anyone who had it turned on.
export function useCourtViewMode() {
  const [val, setVal] = useState(() => {
    const saved = getStorageItem(STORAGE_KEYS.COURT_VIEW_MODE);
    if (saved === 'smart' || saved === 'base' || saved === 'simple') return saved;
    return getBoolStorage(STORAGE_KEYS.SIMPLE_ROTATION_VIEW) ? 'simple' : 'smart';
  });
  const save = (v) => { setStorageItem(STORAGE_KEYS.COURT_VIEW_MODE, v); setVal(v); };
  return [val, save];
}

export function useStrSetting(key, dflt) {
  const [val, setVal] = useState(() => getStorageItem(key, dflt));
  const save = (v) => { setStorageItem(key, v); setVal(v); };
  return [val, save];
}

export function useTrimSetting(key) {
  const [val, setVal] = useState(() => getStorageItem(key, ''));
  const save = (v) => { setStorageItem(key, v.trim() || null); setVal(v); };
  return [val, save];
}

export function useNullableIntSetting(key) {
  const [val, setVal] = useState(() => { const s = getIntStorage(key); return !isNaN(s) ? s : null; });
  const save = (id) => { setStorageItem(key, id); setVal(id); };
  return [val, save];
}

export function useLastSetScore() {
  const [val, setVal] = useState(() => getIntStorage(STORAGE_KEYS.LAST_SET_SCORE, 15));
  const save = (n) => { setStorageItem(STORAGE_KEYS.LAST_SET_SCORE, n); setVal(n); };
  return [val, save];
}

// Full-season match count used to extrapolate a player's season totals on the
// player profile (Season Stats → each sub-tab shows a projected row).
export function useProjectedSeasonMatches() {
  const [val, setVal] = useState(() => {
    const saved = getIntStorage(STORAGE_KEYS.PROJECTED_SEASON_MATCHES);
    return !isNaN(saved) && saved > 0 ? saved : DEFAULT_PROJECTED_MATCHES;
  });
  const save = (next) => {
    const n = Math.max(1, Math.min(200, Math.round(Number(next)) || DEFAULT_PROJECTED_MATCHES));
    setStorageItem(STORAGE_KEYS.PROJECTED_SEASON_MATCHES, n);
    setVal(n);
  };
  return [val, save];
}

export function useMaxSubs() {
  const [maxSubs, setMaxSubsState] = useState(() => {
    const saved = getIntStorage(STORAGE_KEYS.MAX_SUBS);
    return !isNaN(saved) && saved > 0 ? saved : DEFAULT_MAX_SUBS;
  });
  const save = (val) => {
    const n = Math.max(1, Math.min(99, Number(val)));
    setStorageItem(STORAGE_KEYS.MAX_SUBS, n);
    setMaxSubsState(n);
  };
  return [maxSubs, save];
}

export function useDefaultFormat() {
  const [defaultFormat, setDefaultFormatState] = useState(() => {
    const saved = getStorageItem(STORAGE_KEYS.DEFAULT_FORMAT);
    return saved === FORMAT.BEST_OF_5 ? FORMAT.BEST_OF_5 : DEFAULT_FORMAT;
  });
  const save = (val) => {
    setStorageItem(STORAGE_KEYS.DEFAULT_FORMAT, val);
    setDefaultFormatState(val);
  };
  return [defaultFormat, save];
}
