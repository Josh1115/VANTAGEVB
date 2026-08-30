import Dexie from 'dexie';
import { normalizeMatchDate } from '../utils/matchDate';
import { repairServerPlayerIds } from '../stats/serverRepair';

function getDbName() {
  try {
    const uid = localStorage.getItem('vbstat_user_id');
    return uid ? `VBAPPv2_${uid}` : 'VBAPPv2';
  } catch {
    return 'VBAPPv2';
  }
}

// crypto.randomUUID() isn't available on older browsers (e.g. pre-15.4
// Safari) — fall back to a manually-built random id so record creation
// never crashes on those devices.
function safeUUID() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

export const db = new Dexie(getDbName());

// v26: rebuild `rally.server_player_id` (SRV PT / ATT:PT) from the serve
// contacts the coach logged. That field was either never recorded (~half of
// older rallies) or, on a match synced before stats/merge.js learned to
// translate it, left pointing at the other device's player id. Only nulls and
// orphans are rewritten — a rally that already names a real local player is
// left untouched. Idempotent: no serve contact to pair with = no change. See
// stats/serverRepair.js.
db.version(26).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type, uid',
  teams:              '++id, org_id, name, share_token, uid',
  seasons:            '++id, team_id, year, status, uid',
  players:            '++id, team_id, is_active, uid',
  opponents:          '++id, name, uid',
  saved_lineups:      '++id, team_id, uid',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id, uid',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat, uid',
  season_history:     '++id, team_id, year, uid',
  tourney_entries:    '++id, team_id, year, uid',
  player_commits:     '++id, team_id, grad_year, uid',
  auto_backups:       '++id, created_at',
  accolade_types:     '++id, team_id, uid',
  accolade_winners:   '++id, type_id, team_id, uid',
  practice_sessions:  '++id, team_id, tool_type, date, archived, uid',
  tombstones:         '++id, type, key, [type+key]',
}).upgrade(async (tx) => {
  // Never let a hiccup in the repair block the DB from opening — the field it
  // fixes only feeds two display stats, and it can be re-run later.
  try {
    await repairServerPlayerIds(tx);
  } catch (err) {
    console.warn('[VBStat] server_player_id repair (v26) skipped:', err);
  }
});

// v25: normalize match `date` to a timezone-proof calendar day.
// `date` was built with `new Date(localString).toISOString()`, which bakes in
// the device's UTC offset — so the same real game got a different day string on
// devices in different timezones, or rolled to the next day when quick-started
// in the evening. Cloud sync identifies a match by `opponent | date.slice(0,10)`,
// so that drift split one game into two (see stats/merge.js, utils/matchDate.js).
// Re-anchor every match to noon UTC of the day the coach meant (recovered by
// reading the stored timestamp in this device's local timezone — how it was
// entered). `updated_at` is deliberately NOT touched: this is a storage-format
// cleanup, not a content edit, and bumping it would spawn spurious sync
// conflicts. The pass is idempotent, so devices that upgrade at different times
// still converge on identical strings.
db.version(25).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type, uid',
  teams:              '++id, org_id, name, share_token, uid',
  seasons:            '++id, team_id, year, status, uid',
  players:            '++id, team_id, is_active, uid',
  opponents:          '++id, name, uid',
  saved_lineups:      '++id, team_id, uid',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id, uid',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat, uid',
  season_history:     '++id, team_id, year, uid',
  tourney_entries:    '++id, team_id, year, uid',
  player_commits:     '++id, team_id, grad_year, uid',
  auto_backups:       '++id, created_at',
  accolade_types:     '++id, team_id, uid',
  accolade_winners:   '++id, type_id, team_id, uid',
  practice_sessions:  '++id, team_id, tool_type, date, archived, uid',
  tombstones:         '++id, type, key, [type+key]',
}).upgrade(async (tx) => {
  await tx.table('matches').toCollection().modify((m) => {
    if (!m.date) return;
    const fixed = normalizeMatchDate(m.date);
    if (fixed !== m.date) m.date = fixed;
  });
});

// v24: extend the v23 `uid`/`updated_at` fix to the rest of the tables that
// support in-place editing but were left out the first time — historical
// records, season history, tournament entries, player commits, accolade
// types/winners, saved lineups, and practice sessions. Same bug, same fix:
// without a permanent id, editing one of these (correcting a career stat,
// renaming a tournament or an award, archiving a practice session) made sync
// treat the edit as a brand-new record instead of an update. Also fixes these
// tables not syncing between devices at all — see stats/merge.js.
db.version(24).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type, uid',
  teams:              '++id, org_id, name, share_token, uid',
  seasons:            '++id, team_id, year, status, uid',
  players:            '++id, team_id, is_active, uid',
  opponents:          '++id, name, uid',
  saved_lineups:      '++id, team_id, uid',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id, uid',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat, uid',
  season_history:     '++id, team_id, year, uid',
  tourney_entries:    '++id, team_id, year, uid',
  player_commits:     '++id, team_id, grad_year, uid',
  auto_backups:       '++id, created_at',
  accolade_types:     '++id, team_id, uid',
  accolade_winners:   '++id, type_id, team_id, uid',
  practice_sessions:  '++id, team_id, tool_type, date, archived, uid',
  tombstones:         '++id, type, key, [type+key]',
}).upgrade(async (tx) => {
  const now = new Date().toISOString();
  const tables = [
    'saved_lineups', 'historical_records', 'season_history', 'tourney_entries',
    'player_commits', 'accolade_types', 'accolade_winners', 'practice_sessions',
  ];
  for (const name of tables) {
    await tx.table(name).toCollection().modify((row) => {
      if (!row.uid) row.uid = safeUUID();
      if (!row.updated_at) row.updated_at = now;
    });
  }
});

// v23: add `uid` (a permanent random id, assigned once and never changed) and
// `updated_at` to the core entity tables. Cloud sync used to recognize "the same
// player/opponent/match on two devices" by comparing name + jersey number (or
// name + date) — so editing one of those fields (e.g. adding a jersey number, or
// renaming a scrimmage) made sync think it was a brand-new record and duplicate
// it instead of updating it. `uid` gives every record a fingerprint that survives
// edits; `updated_at` lets sync tell which copy of an edited record is newer.
// See stats/merge.js for how these are used, and the `creating`/`updating` hooks
// below for how they get set automatically.
db.version(23).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type, uid',
  teams:              '++id, org_id, name, share_token, uid',
  seasons:            '++id, team_id, year, status, uid',
  players:            '++id, team_id, is_active, uid',
  opponents:          '++id, name, uid',
  saved_lineups:      '++id, team_id',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id, uid',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat',
  season_history:     '++id, team_id, year',
  tourney_entries:    '++id, team_id, year',
  player_commits:     '++id, team_id, grad_year',
  auto_backups:       '++id, created_at',
  accolade_types:     '++id, team_id',
  accolade_winners:   '++id, type_id, team_id',
  practice_sessions:  '++id, team_id, tool_type, date, archived',
  tombstones:         '++id, type, key, [type+key]',
}).upgrade(async (tx) => {
  const now = new Date().toISOString();
  const tables = ['organizations', 'teams', 'seasons', 'players', 'opponents', 'matches'];
  for (const name of tables) {
    await tx.table(name).toCollection().modify((row) => {
      if (!row.uid) row.uid = safeUUID();
      if (!row.updated_at) row.updated_at = now;
    });
  }
});

// v22: add tombstones table — records deliberate deletes (match/team/org) by natural
// key so cloud sync can't resurrect something the user deleted on purpose.
db.version(22).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type',
  teams:              '++id, org_id, name, share_token',
  seasons:            '++id, team_id, year, status',
  players:            '++id, team_id, is_active',
  opponents:          '++id, name',
  saved_lineups:      '++id, team_id',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat',
  season_history:     '++id, team_id, year',
  tourney_entries:    '++id, team_id, year',
  player_commits:     '++id, team_id, grad_year',
  auto_backups:       '++id, created_at',
  accolade_types:     '++id, team_id',
  accolade_winners:   '++id, type_id, team_id',
  practice_sessions:  '++id, team_id, tool_type, date, archived',
  tombstones:         '++id, type, key, [type+key]',
});

// v21: add share_token to teams for FamilyScope HUB sharing.
db.version(21).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type',
  teams:              '++id, org_id, name, share_token',
  seasons:            '++id, team_id, year, status',
  players:            '++id, team_id, is_active',
  opponents:          '++id, name',
  saved_lineups:      '++id, team_id',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat',
  season_history:     '++id, team_id, year',
  tourney_entries:    '++id, team_id, year',
  player_commits:     '++id, team_id, grad_year',
  auto_backups:       '++id, created_at',
  accolade_types:     '++id, team_id',
  accolade_winners:   '++id, type_id, team_id',
  practice_sessions:  '++id, team_id, tool_type, date, archived',
});

// v20: add archived index on practice_sessions for end-of-season archiving.
db.version(20).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type',
  teams:              '++id, org_id, name',
  seasons:            '++id, team_id, year, status',
  players:            '++id, team_id, is_active',
  opponents:          '++id, name',
  saved_lineups:      '++id, team_id',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat',
  season_history:     '++id, team_id, year',
  tourney_entries:    '++id, team_id, year',
  player_commits:     '++id, team_id, grad_year',
  auto_backups:       '++id, created_at',
  accolade_types:     '++id, team_id',
  accolade_winners:   '++id, type_id, team_id',
  practice_sessions:  '++id, team_id, tool_type, date, archived',
});

// v19: add status index on seasons to support manual End Season.
db.version(19).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type',
  teams:              '++id, org_id, name',
  seasons:            '++id, team_id, year, status',
  players:            '++id, team_id, is_active',
  opponents:          '++id, name',
  saved_lineups:      '++id, team_id',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat',
  season_history:     '++id, team_id, year',
  tourney_entries:    '++id, team_id, year',
  player_commits:     '++id, team_id, grad_year',
  auto_backups:       '++id, created_at',
  accolade_types:     '++id, team_id',
  accolade_winners:   '++id, type_id, team_id',
});

// v18: add accolade_types and accolade_winners for individual player awards.
db.version(18).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type',
  teams:              '++id, org_id, name',
  seasons:            '++id, team_id, year',
  players:            '++id, team_id, is_active',
  opponents:          '++id, name',
  saved_lineups:      '++id, team_id',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat',
  season_history:     '++id, team_id, year',
  tourney_entries:    '++id, team_id, year',
  player_commits:     '++id, team_id, grad_year',
  auto_backups:       '++id, created_at',
  accolade_types:     '++id, team_id',
  accolade_winners:   '++id, type_id, team_id',
});

// v17: add auto_backups table for rolling internal snapshots.
db.version(17).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type',
  teams:              '++id, org_id, name',
  seasons:            '++id, team_id, year',
  players:            '++id, team_id, is_active',
  opponents:          '++id, name',
  saved_lineups:      '++id, team_id',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat',
  season_history:     '++id, team_id, year',
  tourney_entries:    '++id, team_id, year',
  player_commits:     '++id, team_id, grad_year',
  auto_backups:       '++id, created_at',
});

// v16: add player_commits table for college commitment tracking.
db.version(16).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type',
  teams:              '++id, org_id, name',
  seasons:            '++id, team_id, year',
  players:            '++id, team_id, is_active',
  opponents:          '++id, name',
  saved_lineups:      '++id, team_id',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat',
  season_history:     '++id, team_id, year',
  tourney_entries:    '++id, team_id, year',
  player_commits:     '++id, team_id, grad_year',
});

// v15: add tourney_entries table for manual tournament history.
db.version(15).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type',
  teams:              '++id, org_id, name',
  seasons:            '++id, team_id, year',
  players:            '++id, team_id, is_active',
  opponents:          '++id, name',
  saved_lineups:      '++id, team_id',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat',
  season_history:     '++id, team_id, year',
  tourney_entries:    '++id, team_id, year',
});

// v14: add season_history table for per-season program history.
db.version(14).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type',
  teams:              '++id, org_id, name',
  seasons:            '++id, team_id, year',
  players:            '++id, team_id, is_active',
  opponents:          '++id, name',
  saved_lineups:      '++id, team_id',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat',
  season_history:     '++id, team_id, year',
});

// v13: add historical_records table for pre-app season records.
db.version(13).stores({
  rallies:            '++id, set_id, rally_number',
  sets:               '++id, match_id, set_number',
  lineups:            '++id, set_id, player_id',
  substitutions:      '++id, set_id, rally_number',
  organizations:      '++id, name, type',
  teams:              '++id, org_id, name',
  seasons:            '++id, team_id, year',
  players:            '++id, team_id, is_active',
  opponents:          '++id, name',
  saved_lineups:      '++id, team_id',
  contacts:           '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:            '++id, season_id, status, date, opponent_id',
  opp_tendencies:     '++id, opp_id, match_id',
  timeouts:           '++id, match_id, set_id',
  historical_records: '++id, team_id, category, stat',
});

// v12: add timeouts table for timeout effectiveness tracking.
db.version(12).stores({
  rallies:         '++id, set_id, rally_number',
  sets:            '++id, match_id, set_number',
  lineups:         '++id, set_id, player_id',
  substitutions:   '++id, set_id, rally_number',
  organizations:   '++id, name, type',
  teams:           '++id, org_id, name',
  seasons:         '++id, team_id, year',
  players:         '++id, team_id, is_active',
  opponents:       '++id, name',
  saved_lineups:   '++id, team_id',
  contacts:        '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:         '++id, season_id, status, date, opponent_id',
  opp_tendencies:  '++id, opp_id, match_id',
  timeouts:        '++id, match_id, set_id',
});

// v11: add opponent_id index on matches for efficient opponent history queries.
db.version(11).stores({
  rallies:         '++id, set_id, rally_number',
  sets:            '++id, match_id, set_number',
  lineups:         '++id, set_id, player_id',
  substitutions:   '++id, set_id, rally_number',
  organizations:   '++id, name, type',
  teams:           '++id, org_id, name',
  seasons:         '++id, team_id, year',
  players:         '++id, team_id, is_active',
  opponents:       '++id, name',
  saved_lineups:   '++id, team_id',
  contacts:        '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:         '++id, season_id, status, date, opponent_id',
  opp_tendencies:  '++id, opp_id, match_id',
});

// v10: add opp_tendencies table for structured opponent scouting data.
db.version(10).stores({
  rallies:         '++id, set_id, rally_number',
  sets:            '++id, match_id, set_number',
  lineups:         '++id, set_id, player_id',
  substitutions:   '++id, set_id, rally_number',
  organizations:   '++id, name, type',
  teams:           '++id, org_id, name',
  seasons:         '++id, team_id, year',
  players:         '++id, team_id, is_active',
  opponents:       '++id, name',
  saved_lineups:   '++id, team_id',
  contacts:        '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:         '++id, season_id, status, date',
  opp_tendencies:  '++id, opp_id, match_id',
});

// v9: re-declare every table that was only ever defined in v1.
//   If a prior failed migration left the DB in a state where these tables
//   were never created, this forces Dexie to create them. If they already
//   exist, Dexie no-ops. No data is ever lost by re-declaring the same schema.
db.version(9).stores({
  rallies:       '++id, set_id, rally_number',
  sets:          '++id, match_id, set_number',
  lineups:       '++id, set_id, player_id',
  substitutions: '++id, set_id, rally_number',
  organizations: '++id, name, type',
  teams:         '++id, org_id, name',
  seasons:       '++id, team_id, year',
  players:       '++id, team_id, is_active',
  opponents:     '++id, name',
  saved_lineups: '++id, team_id',
  contacts:      '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:       '++id, season_id, status, date',
});

// v8: remove compound indexes — they are not used by any query and are not
//   supported in Safari/WebKit before iOS 15.2, causing the v7 migration to
//   fail and breaking all IndexedDB writes on iPad.
db.version(8).stores({
  contacts: '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:  '++id, season_id, status, date',
});

// v7: originally added compound indexes; changed to simple indexes because
//   compound indexes are not supported in Safari/WebKit before iOS 15.2.
//   Users already at v7 with compound indexes are cleaned up by v8 above.
//   Users stuck at v6 (failed v7) can now migrate through v7 successfully.
db.version(7).stores({
  contacts: '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
  matches:  '++id, season_id, status, date',
});

db.version(6).stores({
  practice_sessions: '++id, team_id, tool_type, date',
});

db.version(5).stores({
  contacts: '++id, match_id, player_id, action, set_id, rally_id, rotation_num',
});

db.version(4).stores({
  records: '++id, team_id, type, player_id',
});

db.version(3).stores({
  records: '++id, team_id, type',
});

db.version(2).stores({
  saved_lineups: '++id, team_id',
});

db.version(1).stores({
  organizations: '++id, name, type',
  teams:         '++id, org_id, name',
  seasons:       '++id, team_id, year',
  players:       '++id, team_id, is_active',
  opponents:     '++id, name',
  matches:       '++id, season_id, status, date',
  sets:          '++id, match_id, set_number',
  lineups:       '++id, set_id, player_id',
  substitutions: '++id, set_id, rally_number',
  rallies:       '++id, set_id, rally_number',
  contacts:      '++id, match_id, player_id, action, set_id, rally_id',
});

// Auto-assign a permanent `uid` to every new row in these tables, and keep
// `updated_at` current on every edit — without having to touch every place in
// the app that creates or edits a player/opponent/match/etc. See the v23
// migration note above for why this exists.
const UID_TRACKED_TABLES = [
  'organizations', 'teams', 'seasons', 'players', 'opponents', 'matches',
  'saved_lineups', 'historical_records', 'season_history', 'tourney_entries',
  'player_commits', 'accolade_types', 'accolade_winners', 'practice_sessions',
];
for (const name of UID_TRACKED_TABLES) {
  db[name].hook('creating', (_primKey, obj) => {
    if (!obj.uid) obj.uid = safeUUID();
    if (!obj.updated_at) obj.updated_at = new Date().toISOString();
  });
  db[name].hook('updating', (modifications) => {
    if ('updated_at' in modifications) return undefined;
    return { updated_at: new Date().toISOString() };
  });
}

// When another page/tab needs to upgrade the DB to a newer version, close
// this connection immediately so the upgrade isn't blocked indefinitely.
db.on('versionchange', () => {
  db.close();
  window.location.reload();
});

// If another connection is blocking the upgrade, reload and retry.
db.on('blocked', () => {
  window.location.reload();
});

// If the DB fails to open for ANY reason (corrupt state, version mismatch,
// failed prior migration, etc.), delete the DB and reload so the app stays
// functional. A sessionStorage flag prevents an infinite reload loop in
// environments where IndexedDB itself is unavailable (e.g. iOS Private Mode).
db.open().catch(async (err) => {
  console.error('[VBStat] DB open failed, resetting database:', err);
  const alreadyReset = sessionStorage.getItem('vbstat_db_reset');
  if (alreadyReset) {
    console.error('[VBStat] DB reset already attempted — IndexedDB may be unavailable in this context.');
    return;
  }
  sessionStorage.setItem('vbstat_db_reset', '1');
  try { await Dexie.delete('VBAPPv2'); } catch (deleteErr) { console.error('[VBStat] DB delete failed:', deleteErr); }
  window.location.reload();
});

export default db;
