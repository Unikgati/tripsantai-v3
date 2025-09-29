// api/create-invoice.js
// Minimal serverless endpoint (Vercel/Netlify) to create an invoice using SUPABASE service_role key.
// Environment variables required:
// SUPABASE_URL - e.g. https://xyzcompany.supabase.co
// SUPABASE_SERVICE_ROLE_KEY - service role key (store in secret manager)

export default async function handler(req, res) {
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
  const userToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!userToken) return res.status(401).json({ error: 'Missing user token' });

  try {
    // 1) Verify user via GoTrue /auth/v1/user
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'apikey': SERVICE_ROLE_KEY,
      }
    });
    if (!userResp.ok) {
      return res.status(401).json({ error: 'Invalid user token' });
    }
    const userJson = await userResp.json();
    const uid = userJson?.id;
    if (!uid) return res.status(401).json({ error: 'Unable to verify user' });

    // 2) Check admins table via REST
    const adminCheck = await fetch(`${SUPABASE_URL}/rest/v1/admins?auth_uid=eq.${uid}&select=id`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Accept': 'application/json'
      }
    });
    if (!adminCheck.ok) {
      const text = await adminCheck.text();
      return res.status(500).json({ error: 'Failed to check admin table', detail: text });
    }
    const adminRows = await adminCheck.json();
    if (!Array.isArray(adminRows) || adminRows.length === 0) {
      return res.status(403).json({ error: 'Not an admin' });
    }

    // 3) Read payload and validate
    const { order_id, total, metadata, share_token } = req.body || {};
    if (!order_id || typeof total === 'undefined') {
      return res.status(400).json({ error: 'Missing required fields: order_id, total' });
    }
    if (typeof order_id !== 'number' && !/^[0-9]+$/.test(String(order_id))) {
      return res.status(400).json({ error: 'order_id must be a number' });
    }
    const numericOrderId = Number(order_id);
    const numericTotal = Number(total);
    if (!Number.isFinite(numericTotal) || numericTotal < 0) {
      return res.status(400).json({ error: 'total must be a non-negative number' });
    }

    // 4) Server-side verification: fetch the order row and compute/verify total.
    const orderResp = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${numericOrderId}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!orderResp.ok) {
      const txt = await orderResp.text().catch(() => null);
      return res.status(400).json({ error: 'Order lookup failed', detail: txt });
    }

    const orders = await orderResp.json();
    const orderRow = Array.isArray(orders) ? orders[0] : orders;
    if (!orderRow) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Prefer authoritative total from the order row if available. Do not trust client-sent total.
    const serverTotal = typeof orderRow.total_price !== 'undefined' ? Number(orderRow.total_price) : (typeof orderRow.totalPrice !== 'undefined' ? Number(orderRow.totalPrice) : null);
    const finalTotal = (serverTotal !== null && Number.isFinite(serverTotal)) ? serverTotal : numericTotal;

    // Ensure share_token exists server-side; generate if missing.
    const crypto = require('crypto');
    const makeToken = (len = 18) => {
      try {
        return crypto.randomBytes(Math.ceil(len * 3 / 4)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, len);
      } catch (e) {
        // fallback
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
        let t = '';
        for (let i = 0; i < len; i++) t += chars[Math.floor(Math.random() * chars.length)];
        return t;
      }
    };

    const tokenToUse = share_token || makeToken(18);

    // 5) Insert invoice via REST with idempotency: try insert, if duplicate exists return existing row.
    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/invoices`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        // return representation on success
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([{ order_id: numericOrderId, total: finalTotal, metadata: metadata || {}, share_token: tokenToUse }])
    });

    if (insertResp.ok) {
      const inserted = await insertResp.json();
      return res.status(201).json({ invoice: inserted[0] });
    }

    // If insert failed (unique constraint), try to fetch existing invoice for the order and return it.
    const errText = await insertResp.text().catch(() => null);
    // Attempt to fetch existing invoice by order_id
    try {
      const fetchExisting = await fetch(`${SUPABASE_URL}/rest/v1/invoices?order_id=eq.${numericOrderId}&select=*&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Accept': 'application/json'
        }
      });
      if (fetchExisting.ok) {
        const rows = await fetchExisting.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return res.status(200).json({ invoice: rows[0], note: 'existing' });
        }
      }
    } catch (e) {
      // ignore and return generic error below
    }

    return res.status(500).json({ error: 'Insert failed', detail: errText });

  } catch (err) {
    console.error('create-invoice error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
// end of handler