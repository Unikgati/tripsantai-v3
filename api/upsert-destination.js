// api/upsert-destination.js
// Serverless endpoint to upsert a destination using SUPABASE_SERVICE_ROLE_KEY.
// Environment variables required:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // CORS: allow browser preflight and cross-origin requests from the frontend
  const setCors = () => {
    // In production replace '*' with your origin (e.g. https://your-site.com)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '3600');
  };

  setCors();

  // Respond to preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

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
    // 1) Verify user token via Supabase auth endpoint
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'apikey': SERVICE_ROLE_KEY,
      }
    });
    if (!userResp.ok) return res.status(401).json({ error: 'Invalid user token' });
    const userJson = await userResp.json();
    const uid = userJson?.id;
    if (!uid) return res.status(401).json({ error: 'Unable to verify user' });

    // 2) Check admins table using service_role key (bypass RLS)
    const adminCheck = await fetch(`${SUPABASE_URL}/rest/v1/admins?auth_uid=eq.${uid}&select=id`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Accept': 'application/json'
      }
    });
    if (!adminCheck.ok) {
      const txt = await adminCheck.text();
      return res.status(500).json({ error: 'Failed to check admin table', detail: txt });
    }
    const adminRows = await adminCheck.json();
    if (!Array.isArray(adminRows) || adminRows.length === 0) return res.status(403).json({ error: 'Not an admin' });

    // 3) Validate payload shape (basic)
    const payload = req.body;
    if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Invalid payload' });

    // --- build safe payload for PostgREST ---
    const keyMap = {
      // frontend -> db column
      id: 'id',
      title: 'title',
      slug: 'slug',
      shortDescription: 'shortdescription',
      longDescription: 'longdescription',
      imageUrl: 'imageurl',
      galleryImages: 'galleryimages',
  imagePublicId: 'image_public_id',
  galleryPublicIds: 'gallery_public_ids',
      priceTiers: 'pricetiers',
      duration: 'duration',
      minPeople: 'minpeople',
      itinerary: 'itinerary',
      facilities: 'facilities',
      categories: 'categories',
      mapCoordinates: 'mapcoordinates'
    };

    const safePayload = {};
    // Accept both camelCase keys and already-lowercased DB keys
    for (const srcKey of Object.keys(payload)) {
      const normalized = keyMap[srcKey] || srcKey.toLowerCase();
      safePayload[normalized] = payload[srcKey];
    }

    // generate slug if missing
    if (!safePayload.slug && safePayload.title) {
      safePayload.slug = String(safePayload.title).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Ensure primary key `id` exists; if not, generate a bigint-ish id using timestamp
    // Also treat id === 0 as missing (frontend uses id=0 for new rows), which would
    // otherwise cause a duplicate key violation on the primary key.
    if (!('id' in safePayload) || safePayload.id == null || Number(safePayload.id) === 0) {
      const genId = Date.now();
      safePayload.id = Math.floor(genId * 1000 + Math.floor(Math.random() * 1000));
    }

    // Convert JS arrays for Postgres text[] columns into Postgres array literal strings
    const toPgArrayLiteral = (arr) => {
      if (!Array.isArray(arr)) return arr;
      const escaped = arr.map(v => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"'));
      return `{${escaped.join(',')}}`;
    };
    if ('facilities' in safePayload && Array.isArray(safePayload.facilities)) {
      safePayload.facilities = toPgArrayLiteral(safePayload.facilities);
    }
    if ('categories' in safePayload && Array.isArray(safePayload.categories)) {
      safePayload.categories = toPgArrayLiteral(safePayload.categories);
    }
    // convert gallery_public_ids (array of Cloudinary public_ids) to Postgres array literal if present
    if ('gallery_public_ids' in safePayload && Array.isArray(safePayload.gallery_public_ids)) {
      safePayload.gallery_public_ids = toPgArrayLiteral(safePayload.gallery_public_ids);
    }

    // If client didn't include public_ids but galleryImages/imageUrl refer to Cloudinary URLs,
    // try to infer public_id from the URL path so we persist it server-side.
    const extractCloudinaryPublicId = (url) => {
      if (!url || typeof url !== 'string') return null;
      try {
        const u = new URL(url);
        // typical Cloudinary URL: /<cloud>/image/upload/v123456/.../public_id.ext
        const parts = u.pathname.split('/');
        const uploadIndex = parts.findIndex(p => p === 'upload');
        if (uploadIndex === -1) return null;
        const remainder = parts.slice(uploadIndex + 1).join('/');
        if (!remainder) return null;
        // remove version prefix like v123456/ if present
        const withoutVersion = remainder.replace(/^v\d+\//, '');
        // Keep full path (including folders) but strip file extension
        const publicIdWithPath = withoutVersion.replace(/\.[^/.]+$/, '');
        return publicIdWithPath || null;
      } catch (e) {
        return null;
      }
    };

    // Derive image_public_id when missing
    if ((!('image_public_id' in safePayload) || safePayload.image_public_id == null) && safePayload.imageurl) {
      const derived = extractCloudinaryPublicId(safePayload.imageurl);
      if (derived) safePayload.image_public_id = derived;
    }

    // Derive gallery_public_ids when missing or containing nulls
    if (Array.isArray(safePayload.galleryimages)) {
      // only try to derive if gallery_public_ids absent or contains null/empty
      const needDerive = !Array.isArray(safePayload.gallery_public_ids) || (Array.isArray(safePayload.gallery_public_ids) && safePayload.gallery_public_ids.some(v => v == null));
      if (needDerive) {
        const derived = safePayload.galleryimages.map((u) => extractCloudinaryPublicId(typeof u === 'string' ? u : ''));
        // if at least one id derived, set gallery_public_ids to derived (strings or nulls)
        if (derived.some(d => d)) {
          safePayload.gallery_public_ids = derived.map(d => d || '');
          safePayload.gallery_public_ids = toPgArrayLiteral(safePayload.gallery_public_ids);
        }
      }
    }

    // If payload includes removed_public_ids, attempt to delete those assets from Cloudinary
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

    // Ensure JSONB fields are valid JSON structures (pricetiers, itinerary, galleryimages, mapcoordinates)
    const ensureJson = (k) => {
      if (!(k in safePayload)) return;
      try {
        // leave arrays/objects as-is; PostgREST will accept them for JSONB
        if (typeof safePayload[k] === 'string') {
          safePayload[k] = JSON.parse(safePayload[k]);
        }
      } catch (e) {
        // ignore parse error; assume caller sent a JS object already
      }
    };
    ['pricetiers','itinerary','galleryimages','mapcoordinates'].forEach(ensureJson);

  // Use PostgREST upsert via on_conflict=id to avoid duplicate key errors when row exists
  const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/destinations?on_conflict=id`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        // Use PostgREST resolution=merge-duplicates so POST with on_conflict performs upsert
        'Prefer': 'return=representation,resolution=merge-duplicates'
      },
      body: JSON.stringify([safePayload])
    });

    if (!insertResp.ok) {
      const errText = await insertResp.text().catch(() => '<no body>');
      console.error('upsert-destination: PostgREST insert failed', insertResp.status, errText);
      // Return more specific status and body so we can debug from Vercel logs / browser
      return res.status(insertResp.status || 500).json({ error: 'Upsert failed', status: insertResp.status, detail: errText });
    }

    let inserted;
    try {
      inserted = await insertResp.json();
    } catch (e) {
      console.error('upsert-destination: failed to parse insert response json', e);
      return res.status(500).json({ error: 'Upsert succeeded but response parse failed' });
    }
    return res.status(200).json({ data: inserted[0] });

  } catch (err) {
    console.error('upsert-destination error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
