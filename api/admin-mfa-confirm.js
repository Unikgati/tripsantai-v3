import fetch from 'node-fetch';
import { authenticator } from 'otplib';
import { encryptSecret } from '../utils/mfaCrypto.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const { secret, code } = req.body || {};
  if (!auth) return res.status(401).json({ error: 'Missing token' });
  if (!secret || !code) return res.status(400).json({ error: 'Missing fields' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Server misconfig' });

  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${auth}`, apikey: SERVICE_KEY }
  });
  if (!userResp.ok) return res.status(401).json({ error: 'Invalid session' });
  const userJson = await userResp.json();
  const uid = userJson?.id;
  if (!uid) return res.status(401).json({ error: 'No user' });

  const valid = authenticator.check(String(code), secret);
  if (!valid) return res.status(400).json({ error: 'Invalid code' });

  // persist
  const enc = encryptSecret(secret);
  const payload = { mfa_enabled: true, mfa_secret_enc: enc, mfa_provisioned_at: new Date().toISOString() };

  const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/admins?id=eq.${uid}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!upsertResp.ok) {
    const txt = await upsertResp.text().catch(() => '');
    return res.status(500).json({ error: 'Failed to persist', detail: txt });
  }
  return res.status(200).json({ ok: true });
}
