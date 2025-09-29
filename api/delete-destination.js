// api/delete-destination.js
// Serverless endpoint to delete a destination using SUPABASE_SERVICE_ROLE_KEY.
// Expects JSON body: { id: <number> }
// Environment variables required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

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

  // Expect Authorization: Bearer <user_access_token>
  const authHeader = (req.headers.authorization || '');
  const userToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!userToken) return res.status(401).json({ error: 'Missing user token' });

  try {
    console.info('delete-destination called', { method: req.method, timestamp: new Date().toISOString() });
    // verify user token
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userToken}`, 'apikey': SERVICE_ROLE_KEY }
    });
    if (!userResp.ok) return res.status(401).json({ error: 'Invalid user token' });
    const userJson = await userResp.json();
    const uid = userJson?.id;
    if (!uid) return res.status(401).json({ error: 'Unable to verify user' });

    // check admin table
    const adminCheck = await fetch(`${SUPABASE_URL}/rest/v1/admins?auth_uid=eq.${uid}&select=id`, {
      method: 'GET',
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'Accept': 'application/json' }
    });
    if (!adminCheck.ok) {
      const txt = await adminCheck.text().catch(() => '<no body>');
      return res.status(500).json({ error: 'Failed to check admin table', detail: txt });
    }
    const adminRows = await adminCheck.json();
    if (!Array.isArray(adminRows) || adminRows.length === 0) return res.status(403).json({ error: 'Not an admin' });

  const payload = req.body;
  const id = payload && (payload.id ?? payload.destinationId ?? payload.destination_id);
  // Accept id === 0 as a valid id (frontend historically used id=0 for some rows)
  if (id === undefined || id === null) return res.status(400).json({ error: 'Missing id' });

  console.info('delete-destination payload', { id, receivedPublicIds: Array.isArray(payload.publicIds) ? payload.publicIds.length : undefined });

    // Before deleting the DB row, fetch the row to collect Cloudinary public_ids
    const fetchResp = await fetch(`${SUPABASE_URL}/rest/v1/destinations?id=eq.${encodeURIComponent(id)}&select=id,image_public_id,gallery_public_ids`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!fetchResp.ok) {
      const txt = await fetchResp.text().catch(() => '<no body>');
      console.error('delete-destination: PostgREST fetch failed', fetchResp.status, txt);
      return res.status(fetchResp.status || 500).json({ error: 'Failed to fetch destination', status: fetchResp.status, detail: txt });
    }

    const rows = await fetchResp.json();
    const destRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    console.info('delete-destination db row', {
      id: destRow?.id ?? null,
      image_public_id: destRow?.image_public_id ? true : false,
      gallery_public_ids_count: Array.isArray(destRow?.gallery_public_ids) ? destRow.gallery_public_ids.length : 0,
    });

    // If we have cloudinary keys in env, attempt to remove assets
    const cloudResults = { deleted: [], notFound: [], errors: [] };

    // allow fallback to VITE_ prefixed env if server-side variable wasn't set in Vercel
    const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME?.toString();
    const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
    const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

    if (destRow && (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)) {
      try {
        // Use dynamic import to work in ESM / serverless runtimes where require may be undefined
        const { v2: cloudinary } = await import('cloudinary').catch(err => { throw err; });
        cloudinary.config({
          cloud_name: CLOUDINARY_CLOUD_NAME,
          api_key: CLOUDINARY_API_KEY,
          api_secret: CLOUDINARY_API_SECRET,
        });

        let toDelete = [];
        if (destRow.image_public_id) toDelete.push(destRow.image_public_id);
        if (Array.isArray(destRow.gallery_public_ids)) toDelete.push(...destRow.gallery_public_ids);
        // filter falsy/empty values
        toDelete = toDelete.filter(Boolean);

        console.info('cloudinary delete list', { count: toDelete.length, listPreview: toDelete.slice(0, 10) });

        for (const pid of toDelete) {
          try {
            const result = await cloudinary.uploader.destroy(pid, { invalidate: true });
            const outcome = result && result.result ? result.result : result;
            console.info('cloudinary delete result', { publicId: pid, outcome });
            if (outcome === 'ok' || (outcome && typeof outcome === 'object' && outcome.result === 'ok')) {
              cloudResults.deleted.push(pid);
            } else if (outcome === 'not found' || (outcome && typeof outcome === 'object' && outcome.result === 'not found')) {
              cloudResults.notFound.push(pid);
            } else {
              cloudResults.errors.push({ publicId: pid, outcome });
            }
          } catch (e) {
            console.warn('Cloudinary delete failed for', pid, e && e.message ? e.message : e);
            cloudResults.errors.push({ publicId: pid, message: e && e.message ? e.message : String(e) });
          }
        }
      } catch (e) {
        console.warn('Cloudinary removal failed (skipping)', e && e.message ? e.message : e);
        cloudResults.errors.push({ message: 'cloudinary setup failed', detail: e && e.message ? e.message : String(e) });
      }
    }

    // perform delete using service role
    const deleteResp = await fetch(`${SUPABASE_URL}/rest/v1/destinations?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      }
    });

  if (!deleteResp.ok) {
      const txt = await deleteResp.text().catch(() => '<no body>');
      console.error('delete-destination: PostgREST delete failed', deleteResp.status, txt);
      return res.status(deleteResp.status || 500).json({ error: 'Delete failed', status: deleteResp.status, detail: txt });
    }

    let deleted;
    try { deleted = await deleteResp.json(); } catch (e) { deleted = null; }
  console.info('delete-destination completed', { id, deletedCount: Array.isArray(deleted) ? deleted.length : 0, cloudResults });
  return res.status(200).json({ data: deleted, cloudResults });

  } catch (err) {
    console.error('delete-destination error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
