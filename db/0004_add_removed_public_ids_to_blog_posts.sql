-- 0004_add_removed_public_ids_to_blog_posts.sql
-- Add a transient text[] column to record removed Cloudinary public_ids for blog posts
-- This column is optional and can be NULL; it's primarily used by admin upsert endpoints
-- that accept a removed_public_ids payload. If you prefer not to persist this, skip this migration.

BEGIN;

-- Add column if it doesn't already exist
ALTER TABLE IF EXISTS public.blog_posts
	ADD COLUMN IF NOT EXISTS removed_public_ids text[];

COMMIT;

-- Notes:
-- - This migration adds a simple Postgres text array column. The app's server
--   endpoint may send PostgREST array literal values like '{id1,id2}'. If you use
--   PostgREST directly, ensure your payload conversion matches (the server helper
--   already converts JS arrays to Postgres array literals where appropriate).
-- - After applying, you may need to refresh any cached schema in PostgREST/Supabase
--   (restart or use provider-specific cache refresh) so the new column is visible.
