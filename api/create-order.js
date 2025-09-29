// api/create-order.js
// Serverless endpoint to accept public orders and insert into Supabase using SERVICE_ROLE_KEY.
// Optional: support for reCAPTCHA v2/v3 by setting RECAPTCHA_SECRET env.

export default async function handler(req, res) {
  // CORS for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || process.env.RECAPTCHA_V3_SECRET;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration: missing SUPABASE_URL or SERVICE_ROLE_KEY' });
  }

  try {
    const payload = req.body || {};

    // Basic required fields
    const { customerName, customerPhone, destinationId, destinationTitle, participants, departureDate, totalPrice, notes, recaptchaToken } = payload;

    if (!customerName || !customerPhone || !destinationId) {
      return res.status(400).json({ error: 'Missing required fields: customerName, customerPhone, destinationId' });
    }

    // Optional: verify recaptcha if token provided and secret configured
    if (recaptchaToken && RECAPTCHA_SECRET) {
      try {
        const verify = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${encodeURIComponent(RECAPTCHA_SECRET)}&response=${encodeURIComponent(recaptchaToken)}`
        });
        const vj = await verify.json();
        if (!vj || !vj.success) {
          return res.status(400).json({ error: 'reCAPTCHA verification failed' });
        }
      } catch (e) {
        console.warn('reCAPTCHA verify failed', e && e.message ? e.message : e);
      }
    }

    // Sanitize / coerce fields
    const safeParticipants = Number(participants) && Number(participants) > 0 ? Math.floor(Number(participants)) : 1;
    const safeTotalPrice = Number(totalPrice) && Number(totalPrice) >= 0 ? Number(totalPrice) : 0;

    const order = {
      id: Date.now(),
      customer_name: String(customerName).slice(0, 255),
      customer_phone: String(customerPhone).slice(0, 64),
      destination_id: destinationId,
      destination_title: (destinationTitle || '').slice(0, 255),
      order_date: new Date().toISOString(),
      departure_date: departureDate || null,
      participants: safeParticipants,
      total_price: safeTotalPrice,
      status: 'Baru',
      payment_status: null,
      payment_history: null,
      notes: (notes || null),
    };

    // Insert using PostgREST and service role key
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([order])
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '<no body>');
      console.error('create-order: insert failed', resp.status, txt);
      return res.status(500).json({ error: 'Insert failed', detail: txt });
    }

    const inserted = await resp.json();
    return res.status(200).json({ data: inserted[0] });

  } catch (err) {
    console.error('create-order error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
