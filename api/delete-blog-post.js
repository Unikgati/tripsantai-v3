// api/delete-blog-post.js
// Serverless endpoint to delete a blog post and its Cloudinary asset(s).
// Expects JSON body: { id: <number> }
// Environment variables required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLOUDINARY_* optionally

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
    const id = payload && (payload.id ?? payload.postId ?? payload.post_id);
    if (id === undefined || id === null) return res.status(400).json({ error: 'Missing id' });

    console.info('delete-blog-post called', { id });

    // fetch blog row to collect public_id
    const fetchResp = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${encodeURIComponent(id)}&select=id,image_public_id`, {
      method: 'GET', headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'Accept': 'application/json' }
    });
    if (!fetchResp.ok) {
      const txt = await fetchResp.text().catch(() => '<no body>');
      console.error('delete-blog-post: fetch failed', fetchResp.status, txt);
      return res.status(fetchResp.status || 500).json({ error: 'Failed to fetch blog post', status: fetchResp.status, detail: txt });
    }
    const rows = await fetchResp.json();
    const postRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    const cloudResults = { deleted: [], notFound: [], errors: [] };
    const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
    if (postRow && (CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
      try {
        const { v2: cloudinary } = await import('cloudinary').catch(err => { throw err; });
        cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

        const toDelete = [];
        if (postRow.image_public_id) toDelete.push(postRow.image_public_id);
        const preview = toDelete.slice(0, 10);
        console.info('cloudinary delete list', { count: toDelete.length, preview });
        for (const pid of toDelete) {
          try {
            const result = await cloudinary.uploader.destroy(pid, { invalidate: true });
            const outcome = result && result.result ? result.result : result;
            console.info('cloudinary delete result', { publicId: pid, outcome });
            if (outcome === 'ok') cloudResults.deleted.push(pid);
            else if (outcome === 'not found') cloudResults.notFound.push(pid);
            else cloudResults.errors.push({ publicId: pid, outcome });
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

    // delete DB row
    const deleteResp = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'Prefer': 'return=representation' }
    });
    if (!deleteResp.ok) {
      const txt = await deleteResp.text().catch(() => '<no body>');
      console.error('delete-blog-post: delete failed', deleteResp.status, txt);
      return res.status(deleteResp.status || 500).json({ error: 'Delete failed', status: deleteResp.status, detail: txt });
    }
    let deleted;
    try { deleted = await deleteResp.json(); } catch (e) { deleted = null; }
    console.info('delete-blog-post completed', { id, cloudResults });
    return res.status(200).json({ data: deleted, cloudResults });

  } catch (err) {
    console.error('delete-blog-post error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
