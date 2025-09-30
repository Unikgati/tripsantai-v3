// api/admin-login.js
// Server-side admin login proxy with optional reCAPTCHA verification and simple IP rate limiting.
// Env vars used: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECAPTCHA_SECRET (optional)

export default async function handler(req, res) {
	const setCors = () => {
		// In production, replace '*' with your origin.
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Max-Age', '3600');
	};
	setCors();

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
	const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || process.env.RECAPTCHA_V3_SECRET;

	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
		return res.status(500).json({ error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
	}

	try {
		const body = req.body || {};
		const email = (body.email || '').toString();
		const password = (body.password || '').toString();
		const recaptchaToken = body.recaptchaToken || '';

		if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

		// Simple in-memory rate limiter keyed by IP
		// NOTE: This is a best-effort mitigation for small deployments. For production use a shared store (redis) or platform rate limits.
		const RATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
		const MAX_ATTEMPTS = 6;
		const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
		if (!global._adminLoginAttempts) global._adminLoginAttempts = new Map();
		const attempts = global._adminLoginAttempts;
		const now = Date.now();
		let entry = attempts.get(ip);
		if (!entry || now - entry.first > RATE_WINDOW_MS) {
			entry = { count: 0, first: now };
		}
		entry.count = (entry.count || 0) + 1;
		attempts.set(ip, entry);
		if (entry.count > MAX_ATTEMPTS) {
			return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
		}

		// Optional reCAPTCHA verification when secret configured
		if (RECAPTCHA_SECRET) {
			if (!recaptchaToken) return res.status(400).json({ error: 'Missing recaptcha token' });
			try {
				const rcResp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({ secret: RECAPTCHA_SECRET, response: recaptchaToken }),
				});
				const rcJson = await rcResp.json();
				// For v3, you may want to check score as well (rcJson.score)
				if (!rcJson || rcJson.success !== true) {
					return res.status(401).json({ error: 'Failed recaptcha verification' });
				}
			} catch (e) {
				console.warn('recaptcha verify failed', e && e.message ? e.message : e);
				return res.status(500).json({ error: 'recaptcha verification error' });
			}
		}

			// Call Supabase auth REST to perform password grant
			const authUrl = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
			const authResp = await fetch(authUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'apikey': SERVICE_ROLE_KEY,
				},
				body: JSON.stringify({ email, password }),
			});

			const authJson = await authResp.json().catch(() => null);
			if (!authResp.ok) {
				// Increment entry count further on explicit bad credential response to make brute force harder
				entry.count = (entry.count || 0) + 1;
				attempts.set(ip, entry);
				const msg = (authJson && (authJson.error_description || authJson.error || authJson.message)) || 'Invalid credentials';
				return res.status(401).json({ error: msg });
			}

			// If the authenticated user is an admin with MFA enabled, require MFA step
			try {
				const adminCheck = await fetch(`${SUPABASE_URL}/rest/v1/admins?email=eq.${encodeURIComponent(email)}&select=mfa_enabled`, {
					method: 'GET',
					headers: {
						apikey: SERVICE_ROLE_KEY,
						Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
						Accept: 'application/json'
					}
				});
				if (adminCheck.ok) {
					const adminRows = await adminCheck.json();
					const isAdminMfa = Array.isArray(adminRows) && adminRows[0] && adminRows[0].mfa_enabled === true;
					if (isAdminMfa) {
						// create short-lived ticket for MFA verification
						if (!global._mfaTickets) global._mfaTickets = new Map();
						const ticket = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
						// store ticket -> email mapping with expiry (5 minutes)
						const expiresAt = Date.now() + 5 * 60 * 1000;
						global._mfaTickets.set(ticket, { email, authJson, expiresAt });
						return res.status(200).json({ mfa_required: true, ticket });
					}
				}
			} catch (e) {
				console.warn('admin mfa check failed', e && e.message ? e.message : e);
			}

			// Successful sign-in: return the auth payload to client so client can set session locally.
			// authJson typically contains: access_token, expires_in, refresh_token, user
			return res.status(200).json(authJson || {});

	} catch (err) {
		console.error('admin-login error', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
}

