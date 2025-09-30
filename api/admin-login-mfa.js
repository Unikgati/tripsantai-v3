import fetch from 'node-fetch';
import { decryptSecret } from '../utils/mfaCrypto.js';
import { authenticator } from 'otplib';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ error: 'Missing fields' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Server misconfig' });

  const rowResp = await fetch(`${SUPABASE_URL}/rest/v1/admins?email=eq.${encodeURIComponent(email)}&select=*`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  });
  if (!rowResp.ok) return res.status(401).json({ error: 'Not found' });
  const rows = await rowResp.json();
  const admin = Array.isArray(rows) && rows[0];
  if (!admin || !admin.mfa_enabled || !admin.mfa_secret_enc) return res.status(400).json({ error: 'MFA not enabled' });

  let secret;
  try { secret = decryptSecret(admin.mfa_secret_enc); } catch (e) { return res.status(500).json({ error: 'Decrypt failed' }); }
  const ok = authenticator.check(String(code), secret);
  if (!ok) return res.status(401).json({ error: 'Invalid code' });

  // At this point, MFA verified. The actual session issuance should be handled by your existing login flow.
  return res.status(200).json({ ok: true });
}
