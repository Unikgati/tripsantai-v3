-- 0007_add_admin_mfa_columns.sql
-- Add MFA columns to admins table
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_secret_enc text,
  ADD COLUMN IF NOT EXISTS mfa_provisioned_at timestamptz;
