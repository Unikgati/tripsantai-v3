// api/upsert-blog-post.js
// Serverless endpoint to upsert a blog post using SUPABASE_SERVICE_ROLE_KEY.
// Accepts JSON body matching frontend BlogPost shape. Persists image_public_id if provided

export default async function handler(req, res) {
  const setCors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '3600');
  };

  setCors();
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });

  const authHeader = (req.headers.authorization || '');
  const userToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!userToken) return res.status(401).json({ error: 'Missing user token' });

  try {
    // verify user
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, { method: 'GET', headers: { 'Authorization': `Bearer ${userToken}`, 'apikey': SERVICE_ROLE_KEY } });
    if (!userResp.ok) return res.status(401).json({ error: 'Invalid user token' });
    const userJson = await userResp.json();
    const uid = userJson?.id;
    if (!uid) return res.status(401).json({ error: 'Unable to verify user' });

    // admin check
    const adminCheck = await fetch(`${SUPABASE_URL}/rest/v1/admins?auth_uid=eq.${uid}&select=id`, {
      method: 'GET', headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'Accept': 'application/json' }
    });
    if (!adminCheck.ok) {
      const txt = await adminCheck.text().catch(() => '<no body>');
      return res.status(500).json({ error: 'Failed to check admin table', detail: txt });
    }
    const adminRows = await adminCheck.json();
    if (!Array.isArray(adminRows) || adminRows.length === 0) return res.status(403).json({ error: 'Not an admin' });

    const payload = req.body;
    if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Invalid payload' });

    // Map frontend fields to DB columns
    const safePayload = {};
    for (const k of Object.keys(payload)) {
      if (k === 'imagePublicId') safePayload['image_public_id'] = payload[k];
      else safePayload[k === 'id' ? 'id' : k.toLowerCase()] = payload[k];
    }

    // ensure id exists
    if (!('id' in safePayload) || safePayload.id == null || Number(safePayload.id) === 0) {
      safePayload.id = Date.now();
    }

    // generate slug if missing
    if (!safePayload.slug && safePayload.title) safePayload.slug = String(safePayload.title).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Attempt Cloudinary deletions if client requested removed_public_ids
    if (Array.isArray(payload.removed_public_ids) && payload.removed_public_ids.length > 0) {
      const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        try {
          const { v2: cloudinary } = await import('cloudinary').catch(err => { throw err; });
          cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
          for (const pid of payload.removed_public_ids) {
            try {
              const result = await cloudinary.uploader.destroy(pid, { invalidate: true });
              console.info('cloudinary destroy', pid, result && result.result ? result.result : result);
            } catch (e) {
              console.warn('cloudinary destroy failed for', pid, e && e.message ? e.message : e);
            }
          }
        } catch (e) {
          console.warn('Cloudinary removal failed (skipping)', e && e.message ? e.message : e);
        }
      } else {
        console.info('Skipping Cloudinary removal: credentials not configured');
      }
    }

    // Remove transient field so PostgREST won't attempt to write a non-existent column
    if ('removed_public_ids' in safePayload) {
      try { delete safePayload.removed_public_ids; } catch (e) {}
    }

    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?on_conflict=id`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation,resolution=merge-duplicates'
      },
      body: JSON.stringify([safePayload])
    });

    if (!insertResp.ok) {
      const errText = await insertResp.text().catch(() => '<no body>');
      return res.status(insertResp.status || 500).json({ error: 'Upsert failed', status: insertResp.status, detail: errText });
    }
    const inserted = await insertResp.json();
    return res.status(200).json({ data: inserted[0] });
  } catch (err) {
    console.error('upsert-blog-post error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
