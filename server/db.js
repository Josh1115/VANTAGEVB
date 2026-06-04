const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'vbstat.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    email        TEXT    UNIQUE NOT NULL,
    pin_hash     TEXT    NOT NULL,
    plan         TEXT    NOT NULL DEFAULT 'free',
    coach_name   TEXT,
    school_name  TEXT,
    school_type  TEXT,
    school_state TEXT,
    created_at   INTEGER NOT NULL
  )
`);

module.exports = db;
