-- 0005_public_app_settings_view.sql
-- Create a read-only public view exposing safe app settings for anonymous clients
-- This allows public pages (incognito) to read branding and favicon URLs while keeping
-- the main `app_settings` table protected by RLS for admin writes.

CREATE OR REPLACE VIEW public.app_settings_public AS
SELECT
  id,
  theme,
  accentcolor,
  brandname,
  tagline,
  logolighturl,
  logodarkurl,
  favicon16url,
  favicon192url,
  favicon512url,
  email,
  address,
  whatsappnumber,
  facebookurl,
  instagramurl,
  twitterurl,
  bankname,
  bankaccountnumber,
  bankaccountholder,
  heroslides
FROM public.app_settings
WHERE id = 1;

-- Grant read access to anonymous role used by Supabase client
GRANT SELECT ON public.app_settings_public TO anon;
