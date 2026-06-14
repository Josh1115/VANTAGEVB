// Centralized localStorage key constants and typed get/set helpers.
// Import STORAGE_KEYS instead of using raw strings to prevent typos and
// make key usage searchable across the codebase.

export const STORAGE_KEYS = {
  ACCOUNT_TOKEN: 'vbstat_account_token',
  ACCOUNT_EMAIL: 'vbstat_account_email',
  AMOLED:             'vbstat_amoled',
  ACCENT:             'vbstat_accent',
  COACH_NAME:         'vbstat_coach_name',
  PROGRAM_NAME:       'vbstat_program_name',
  SOUNDS:             'vbstat_sounds',
  MAX_SUBS:           'vbstat_max_subs',
  DEFAULT_FORMAT:     'vbstat_default_format',
  PLAYER_NAME_FORMAT: 'vbstat_player_name_format',
  SCORE_DETAIL:       'vbstat_score_detail',
  MATCH_VIEW_DEFAULT: 'vbstat_match_view_default',
  DEFAULT_TEAM_ID:    'vbstat_default_team_id',
  DEFAULT_SEASON_ID:  'vbstat_default_season_id',
  WAKE_LOCK:          'vbstat_wake_lock',
  HAPTIC:             'vbstat_haptic',
  FLIP_LAYOUT:        'vbstat_flip_layout',
  LAST_SET_SCORE:     'vbstat_last_set_score',
  MAXPREPS_TEAM_ID:   'vbstat_maxpreps_id',
  WIN_MESSAGE:        'vbstat_win_message',
  ROSTER_SORT:        'vbstat_roster_sort',
  PLAYOFF_ORG:        'vbstat_playoff_org',
  ASSUME_SETTER_ROT1:   'vbstat_assume_setter_rot1',
  CLOSEST_SORT_ASC:     'vbstat_closest_sort_asc',
  HISTORY_COMMITS_OPEN: 'vbstat_history_commits_open',
  HISTORY_AWARDS_OPEN:  'vbstat_history_awards_open',
  HISTORY_PROGRAM_OPEN: 'vbstat_history_program_open',
  HELP_GUIDE_SEEN:      'vbstat_help_guide_seen',
};

export function getStorageItem(key, defaultValue = null) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch { /* quota exceeded or private mode — ignore */ }
}

export function getBoolStorage(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

// Like getBoolStorage but defaults to true when the key is absent.
export function getBoolStorageDefaultTrue(key) {
  try {
    const v = localStorage.getItem(key);
    return v !== '0';
  } catch {
    return true;
  }
}

export function setBoolStorage(key, value) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch { /* quota exceeded or private mode — ignore */ }
}

// Parse a JSON draft blob from localStorage. Returns null on missing key or parse error.
// Used by tool pages (ServeTracker, PracticeGame, ServeReceive) that share this pattern.
export function readDraftJson(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

export function getIntStorage(key, defaultValue = NaN) {
  try {
    const v = parseInt(localStorage.getItem(key), 10);
    return isNaN(v) ? defaultValue : v;
  } catch {
    return defaultValue;
  }
}

// Returns the full playoff label, e.g. "IHSA Playoffs" or "NCAA Playoffs".
export function getPlayoffLabel() {
  const org = getStorageItem(STORAGE_KEYS.PLAYOFF_ORG, 'IHSA').trim();
  return org ? `${org} Playoffs` : 'IHSA Playoffs';
}
