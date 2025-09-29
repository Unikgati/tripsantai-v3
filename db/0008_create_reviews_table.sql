-- 0008_create_reviews_table.sql
-- Create a simple reviews table to store visitor reviews
CREATE TABLE IF NOT EXISTS reviews (
  id bigint PRIMARY KEY DEFAULT (extract(epoch from now()) * 1000)::bigint,
  name text NOT NULL,
  initials text NOT NULL,
  content text NOT NULL,
  rating smallint NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

-- Index to quickly fetch recent reviews
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews (created_at DESC);
