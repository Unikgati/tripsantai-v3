-- db/rls.sql
-- Row Level Security (RLS) sample policies for ayotrip
-- Run these in Supabase SQL Editor (recommended) or via psql using a service_role key.
-- IMPORTANT: Review policies and adapt to your exact schema/column names before applying in production.

-- Helper: check admin membership using admins table (admins.auth_uid should store supabase auth uid)

-- 1) DESTINATIONS: public can SELECT, only admins can INSERT/UPDATE/DELETE
ALTER TABLE IF EXISTS public.destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS destinations_select_public ON public.destinations
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS destinations_admin_full ON public.destinations
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid()));

-- 2) BLOG POSTS: public can SELECT, only admins can write
ALTER TABLE IF EXISTS public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS blog_posts_select_public ON public.blog_posts
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS blog_posts_admin_full ON public.blog_posts
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid()));

-- 3) ORDERS: allow INSERT from unauthenticated/authenticated clients (for creating orders)
--    Restrict UPDATE/DELETE to the owner (user_id) or admins.
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS orders_insert_public ON public.orders
  FOR INSERT USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS orders_select_admin ON public.orders
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid()));
CREATE POLICY IF NOT EXISTS orders_update_owner_or_admin ON public.orders
  FOR UPDATE, DELETE USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid())
  ) WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid())
  );

-- 4) INVOICES: default to admin-only for all operations; adjust if you need public access via share_token.
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS invoices_admin_full ON public.invoices
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid()));

-- If you require public read access via a share_token, add a policy like below (example):
-- CREATE POLICY invoices_select_by_share_token ON public.invoices
--   FOR SELECT USING (share_token IS NOT NULL);

-- 5) APP SETTINGS: admin-only
ALTER TABLE IF EXISTS public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS app_settings_admin_full ON public.app_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid()));

-- 6) Admins table: only allow service_role or current admins to modify admin list.
ALTER TABLE IF EXISTS public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS admins_service_or_admin ON public.admins
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.auth_uid = auth.uid()));

-- Instructions to apply:
-- 1) Open Supabase Dashboard -> SQL Editor -> New Query
-- 2) Paste the contents of this file and run
-- 3) Verify by testing common flows (public SELECT, orders INSERT, admin updates)

-- Note: service_role key bypasses RLS entirely. Use server-side functions/endpoints with service_role
-- for trusted operations (admin scripts, migrations, backups).
-- ===== RLS: keep public SELECT for destinations & blog_posts, allow public orders INSERT,
-- ===== invoices: admin-only CRUD, public access only via fetch_invoice_by_token function.

-- Enable RLS
alter table if exists public.destinations enable row level security;
alter table if exists public.blog_posts enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.app_settings enable row level security;
alter table if exists public.invoices enable row level security;

-- Public read-only for destinations and blog_posts (only SELECT)
-- (Allow anonymous users to SELECT)
drop policy if exists public_select_destinations on public.destinations;
create policy public_select_destinations on public.destinations for select using (true);

drop policy if exists public_select_blog_posts on public.blog_posts;
create policy public_select_blog_posts on public.blog_posts for select using (true);

-- Orders: allow anyone to insert orders (public booking flow)
drop policy if exists orders_insert_public on public.orders;
-- For INSERT policies: only WITH CHECK is allowed. USING is ignored for INSERT and causes errors.
create policy orders_insert_public on public.orders for insert with check (true);

drop policy if exists orders_select_admin on public.orders;
create policy orders_select_admin on public.orders for select using (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
);

-- Orders: restrict update/delete to admin only (admins table or admin claim)
drop policy if exists orders_update_admin_or_owner on public.orders;
create policy orders_update_admin_or_owner on public.orders for update using (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
) with check (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
);

drop policy if exists orders_delete_admin_or_owner on public.orders;
create policy orders_delete_admin_or_owner on public.orders for delete using (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
);

-- app_settings: only admin can read/write
drop policy if exists app_settings_admin on public.app_settings;
-- Policies for app_settings: separate by command
create policy app_settings_select_admin on public.app_settings for select using (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
);
create policy app_settings_insert_admin on public.app_settings for insert with check (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
);
create policy app_settings_update_admin on public.app_settings for update using (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
) with check (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
);
create policy app_settings_delete_admin on public.app_settings for delete using (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
);

-- invoices: admin-only for CRUD (no public SELECT)
-- Policies for invoices: explicit per command
drop policy if exists invoices_select_admin on public.invoices;
create policy invoices_select_admin on public.invoices for select using (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
);
drop policy if exists invoices_insert_admin on public.invoices;
create policy invoices_insert_admin on public.invoices for insert with check (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
);
drop policy if exists invoices_update_admin on public.invoices;
create policy invoices_update_admin on public.invoices for update using (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
) with check (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
);
drop policy if exists invoices_delete_admin on public.invoices;
create policy invoices_delete_admin on public.invoices for delete using (
  exists (select 1 from public.admins a where a.auth_uid = auth.uid())
);

-- Important: public callers should NOT be able to SELECT invoices directly.
-- To allow public view-by-token, use the SECURITY DEFINER function `fetch_invoice_by_token`.
-- Ensure function is created and granted EXECUTE to public (see db/invoice_public_function.sql).