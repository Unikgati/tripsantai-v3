// api/create-review.js
// Public endpoint to accept visitor reviews safely.
// Validates name, content, rating; computes initials server-side; inserts using SUPABASE_SERVICE_ROLE_KEY.

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const content = String(body.content || '').trim();
    const rawRating = body.rating;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!content) return res.status(400).json({ error: 'Missing content' });

    // coerce rating to integer and validate range
    const rating = Number.isFinite(Number(rawRating)) ? Math.floor(Number(rawRating)) : null;
    if (rating == null || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // compute initials server-side to avoid trusting client
    const computeInitials = (full) => {
      const parts = String(full).trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return '';
      if (parts.length === 1) return parts[0][0].toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const initials = computeInitials(name);

    // Validate content length (server-side): must be <= 120 characters to match UI
    if (content.length > 120) {
      return res.status(400).json({ error: 'Content exceeds maximum length of 120 characters' });
    }

    // Sanitize lengths and strip basic HTML tags as a lightweight server-side sanitization
    const stripTags = (s) => String(s).replace(/<[^>]*>/g, '');
    const safeName = stripTags(name).slice(0, 255);
    const safeContent = stripTags(content).slice(0, 120);

    const payload = {
      name: safeName,
      initials,
      content: safeContent,
      rating
    };

    // Insert via PostgREST using service role key
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([payload])
    });

  if (!resp.ok) {
      const txt = await resp.text().catch(() => '<no body>');
      console.error('create-review: insert failed', resp.status, txt);
      return res.status(500).json({ error: 'Insert failed', detail: txt });
    }

    const inserted = await resp.json();
  return res.status(201).json({ data: inserted[0] });
  } catch (err) {
    console.error('create-review error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
