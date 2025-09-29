// api/upsert-app-settings.js
// Serverless endpoint to upsert the single app_settings row (id = 1) using SUPABASE_SERVICE_ROLE_KEY.
// Also attempts to delete Cloudinary assets if client supplies `removed_public_ids`.
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and optional CLOUDINARY_* for deletions.

export default async function handler(req, res) {
  const setCors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '3600');
  };
  setCors();
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  // Expect Authorization: Bearer <user_access_token>
  const authHeader = (req.headers.authorization || '');
  const userToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!userToken) return res.status(401).json({ error: 'Missing user token' });

  try {
    // Verify user token
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userToken}`, 'apikey': SERVICE_ROLE_KEY }
    });
    if (!userResp.ok) return res.status(401).json({ error: 'Invalid user token' });
    const userJson = await userResp.json();
    const uid = userJson?.id;
    if (!uid) return res.status(401).json({ error: 'Unable to verify user' });

    // Admin check via admins table using service role key
    const adminCheck = await fetch(`${SUPABASE_URL}/rest/v1/admins?auth_uid=eq.${uid}&select=id`, {
      method: 'GET',
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'Accept': 'application/json' }
    });
    if (!adminCheck.ok) {
      const txt = await adminCheck.text();
      return res.status(500).json({ error: 'Failed to check admin table', detail: txt });
    }
    const adminRows = await adminCheck.json();
    if (!Array.isArray(adminRows) || adminRows.length === 0) return res.status(403).json({ error: 'Not an admin' });

    const payload = req.body;
    if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Invalid payload' });

    // Attempt Cloudinary deletions if requested
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

    // Build safe payload for PostgREST upsert
    const keyMap = {
      id: 'id',
      theme: 'theme',
      accentColor: 'accentcolor',
      brandName: 'brandname',
      tagline: 'tagline',
      logoLightUrl: 'logolighturl',
      logoDarkUrl: 'logodarkurl',
      favicon16Url: 'favicon16url',
      favicon192Url: 'favicon192url',
      favicon512Url: 'favicon512url',
      email: 'email',
      address: 'address',
      whatsappNumber: 'whatsappnumber',
      facebookUrl: 'facebookurl',
      instagramUrl: 'instagramurl',
      twitterUrl: 'twitterurl',
      bankName: 'bankname',
      bankAccountNumber: 'bankaccountnumber',
      bankAccountHolder: 'bankaccountholder',
      heroSlides: 'heroslides',
    };

    const safePayload = { id: 1 };
    for (const srcKey of Object.keys(payload)) {
      if (srcKey === 'removed_public_ids') continue; // transient
      const normalized = keyMap[srcKey] || srcKey.toLowerCase();
      safePayload[normalized] = payload[srcKey];
    }

    // Ensure JSONB fields are valid JSON structures
    if ('heroslides' in safePayload && typeof safePayload.heroslides === 'string') {
      try { safePayload.heroslides = JSON.parse(safePayload.heroslides); } catch (e) { /* ignore */ }
    }

    // Perform PostgREST upsert using service role key
    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?on_conflict=id`, {
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
      console.error('upsert-app-settings: PostgREST insert failed', insertResp.status, errText);
      return res.status(insertResp.status || 500).json({ error: 'Upsert failed', status: insertResp.status, detail: errText });
    }

    const inserted = await insertResp.json();
    return res.status(200).json({ data: inserted[0] });

  } catch (err) {
    console.error('upsert-app-settings error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
