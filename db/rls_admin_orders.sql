-- db/rls_admin_orders.sql
-- Minimal RLS policy file that focuses only on the `orders` table.
-- Purpose: keep existing db/rls.sql unchanged and provide a small, easy-to-run SQL
-- snippet that enables safe public INSERT and admin SELECT, while restricting UPDATE/DELETE
-- to the order owner or admins.

-- IMPORTANT: Run this in Supabase SQL Editor (or psql) using a service_role key.
-- Review policies before applying in production.

-- Enable RLS for orders (no-op if already enabled)
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

-- 1) Allow public INSERTs (for booking flow)
-- For INSERT policies: Postgres ignores USING and requires only WITH CHECK.
DROP POLICY IF EXISTS orders_insert_public ON public.orders;
CREATE POLICY orders_insert_public ON public.orders
  FOR INSERT
  WITH CHECK (true);

-- 2) Allow admins (registered in public.admins) to SELECT orders
DROP POLICY IF EXISTS orders_select_admin ON public.orders;
CREATE POLICY orders_select_admin ON public.orders
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid())
  );

-- 3) Restrict UPDATE and DELETE to the owner (user_id) or admins
-- 3) Restrict UPDATE and DELETE to admins only (no owner semantics configured)
-- Note: your `orders` table schema does not include a `user_id` column, so owner-based
-- policies would fail. If you want owner-based updates later, add a `user_id uuid` column
-- and ensure it's populated on INSERT.
DROP POLICY IF EXISTS orders_update_admin_only ON public.orders;
CREATE POLICY orders_update_admin_only ON public.orders
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid())
  );

DROP POLICY IF EXISTS orders_delete_admin_only ON public.orders;
CREATE POLICY orders_delete_admin_only ON public.orders
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid())
  );

-- Helpful info notes (no-op comments):
-- - To allow admin access, ensure you have rows in public.admins with auth_uid set to
--   the Supabase Auth user's id (uuid) for each admin account.
-- - If you prefer to allow all authenticated users to SELECT orders (less strict),
--   replace the SELECT policy with: CREATE POLICY orders_select_authenticated ON public.orders FOR SELECT USING (auth.uid() IS NOT NULL);

-- End of db/rls_admin_orders.sql
