-- One-time "2026 season kickoff" dashboard popup.
-- Tracks whether each account has already been shown the message, so it
-- appears exactly once per account (trial, master, or paid — plan doesn't
-- matter), starting whenever the coach next logs in on or after Aug 13 2026.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS seen_2026_kickoff_message boolean NOT NULL DEFAULT false;
