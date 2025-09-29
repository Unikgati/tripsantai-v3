-- Migration: create table to track failed admin login attempts
CREATE TABLE IF NOT EXISTS auth_failed_logins (
  email TEXT PRIMARY KEY,
  attempts INT NOT NULL DEFAULT 0,
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_failed_logins_last_attempt ON auth_failed_logins (last_attempt);
