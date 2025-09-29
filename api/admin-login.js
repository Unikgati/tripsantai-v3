/*
  Server-side admin login proxy with basic failed-attempt tracking.
  - POST /api/admin-login with { email, password, recaptchaToken? }
  - Server checks auth_failed_logins table via PostgREST (uses SERVICE_ROLE_KEY)
  - If locked -> return 423
  - Proxy sign-in to Supabase Auth (server-side) and on success reset attempts
  - On failure increment attempts and possibly set locked_until

  NOTE: This is a minimal implementation. For production use, add Redis rate-limits,
  enforce recaptcha, set HttpOnly cookie for sessions, and add logging/alerts.
*/

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
// Set lower thresholds for faster lockout/testing (can override via env)
const LOCK_THRESHOLD = Number(process.env.ADMIN_LOCK_THRESHOLD || 3);
const CAPTCHA_THRESHOLD = Number(process.env.ADMIN_CAPTCHA_THRESHOLD || 2);
const LOCK_MINUTES = Number(process.env.ADMIN_LOCK_MINUTES || 15);

async function fetchFailedRow(email) {
  const url = `${SUPABASE_URL}/rest/v1/auth_failed_logins?email=eq.${encodeURIComponent(email)}`;
  const resp = await fetch(url, { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } });
  if (!resp.ok) return null;
  const data = await resp.json();
  return Array.isArray(data) && data.length ? data[0] : null;
}

async function upsertFailed(email) {
  const url = `${SUPABASE_URL}/rest/v1/auth_failed_logins`;
  const body = { email, attempts: 1, last_attempt: new Date().toISOString() };
  // Use upsert via PostgREST ON CONFLICT email => increment attempts
  // PostgREST doesn't support increment in upsert; perform fetch-update loop (best-effort)
  // Try to insert first
  let inserted = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    body: JSON.stringify(body)
  }).then(r => r.ok ? r.json().catch(() => null) : null).catch(() => null);
  if (inserted) return inserted;

  // Fallback: patch existing row by incrementing attempts (read-modify-write)
  const existing = await fetchFailedRow(email);
  if (!existing) return null;
  const newAttempts = (existing.attempts || 0) + 1;
  const patch = { attempts: newAttempts, last_attempt: new Date().toISOString() };
  if (newAttempts >= LOCK_THRESHOLD) {
    const until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
    patch.locked_until = until;
  }
  const patchUrl = `${SUPABASE_URL}/rest/v1/auth_failed_logins?email=eq.${encodeURIComponent(email)}`;
  await fetch(patchUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json', apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` }, body: JSON.stringify(patch) });
  return { ...existing, ...patch };
}

async function resetFailed(email) {
  const url = `${SUPABASE_URL}/rest/v1/auth_failed_logins?email=eq.${encodeURIComponent(email)}`;
  await fetch(url, { method: 'DELETE', headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }).catch(() => null);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Server not configured' });

  const { email, password, recaptchaToken } = req.body || {};
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  try {
    const failed = await fetchFailedRow(email);
    if (failed && failed.locked_until && new Date(failed.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account temporarily locked' });
    }

    // TODO: verify recaptcha if supplied and attempts exceed CAPTCHA_THRESHOLD

    // Proxy sign-in to Supabase Auth via the token endpoint
    const tokenUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    const form = new URLSearchParams();
    form.append('email', email);
    form.append('password', password);

    const authResp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: form.toString()
    });

    if (!authResp.ok) {
      // increment failed attempts
      await upsertFailed(email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const authJson = await authResp.json();
    // On success: reset failed attempts
    await resetFailed(email);

    // For now return the auth JSON to client. In production prefer HttpOnly secure cookie.
    return res.status(200).json({ data: authJson });
  } catch (err) {
    console.error('admin-login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
