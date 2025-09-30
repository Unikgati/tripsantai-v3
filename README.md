<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15QPDfPxnQHLd3iS0wrfwmYoCpZdamf2H

## Run Locally

## Environment & Third-party setup (Supabase + Cloudinary)

This project integrates Supabase (Postgres + Auth) for data persistence and Cloudinary for image hosting (unsigned client uploads).

Required env variables (client-side, Vite expects VITE_ prefix):

- `VITE_SUPABASE_URL` — your Supabase project URL (e.g. https://xxxxx.supabase.co)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon public key (used client-side with RLS)
- `VITE_CLOUDINARY_CLOUD_NAME` — your Cloudinary cloud name
- `VITE_CLOUDINARY_UPLOAD_PRESET` — an unsigned upload preset name

Example `.env.local` (DO NOT COMMIT):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your_anon_key...
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
```

Cloudinary unsigned preset quick setup:
1. Open your Cloudinary dashboard -> Settings -> Upload -> Upload presets
2. Create a new preset, enable "Unsigned" and set desired upload restrictions (allowed formats, max size)
3. Use that preset name as `VITE_CLOUDINARY_UPLOAD_PRESET`

Supabase schema (example)
-------------------------
Create the following tables in Supabase SQL editor. These are minimal and should be adjusted to your needs.

-- `destinations` table
```sql
create table if not exists public.destinations (
   id bigint primary key,
   title text,
   slug text,
   imageUrl text,
   galleryImages jsonb,
   longDescription text,
   priceTiers jsonb,
   duration int,
   minPeople int,
   itinerary jsonb,
   facilities text[],
   categories text[],
   mapCoordinates jsonb,
   created_at timestamptz default now()
);
```

-- `blog_posts` table
```sql
create table if not exists public.blog_posts (
   id bigint primary key,
   title text,
   slug text,
   imageUrl text,
   category text,
   author text,
   date text,
   content text,
   created_at timestamptz default now()
);
```

Row Level Security (RLS) sample (basic)
--------------------------------------
Supabase anon key is public; secure access with RLS policies. Example policy to allow inserts/updates/deletes only when a specific header or claim is present (replace with your auth logic):

```sql
alter table public.destinations enable row level security;
create policy "anon_insert_destinations" on public.destinations for insert using (true) with check (true);
create policy "anon_update_destinations" on public.destinations for update using (true) with check (true);
create policy "anon_delete_destinations" on public.destinations for delete using (true);

-- Note: The policy above is permissive; tighten it in production. Consider using service_role on server-side admin endpoints.
```

Security notes
- The anon key is safe for client-read and constrained write flows when using RLS policies.
- For any privileged server-side work (bulk import, admin-only actions), use the Supabase service_role key on a server you control.

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
