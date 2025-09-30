import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!auth) return res.status(401).json({ error: 'Missing token' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Server misconfig' });

  // verify token -> user
  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${auth}`, apikey: SERVICE_KEY }
  });
  if (!userResp.ok) return res.status(401).json({ error: 'Invalid session' });
  const userJson = await userResp.json();
  const uid = userJson?.id;
  if (!uid) return res.status(401).json({ error: 'No user' });

  const secret = authenticator.generateSecret();
  const label = `${userJson.email || uid}`;
  const issuer = process.env.MFA_ISSUER || 'Tripsantai';
  const otpauth = authenticator.keyuri(label, issuer, secret);

  const qrDataUrl = await QRCode.toDataURL(otpauth);
  return res.status(200).json({ qrDataUrl, secret });
}
