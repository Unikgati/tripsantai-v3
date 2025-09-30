import React, { useEffect, useState } from 'react';
import { SpinnerIcon } from '../../components/Icons';
import { useToast } from '../../components/Toast';
import getSupabaseClient from '../../lib/supabase';

interface AdminLoginPageProps {
    onLogin: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [recaptchaReady, setRecaptchaReady] = useState(false);
    const [recaptchaError, setRecaptchaError] = useState<string | null>(null);

    // Preload grecaptcha on mount if site key available
    useEffect(() => {
        const siteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').toString();
        if (!siteKey) return;
        const win = window as any;
        let mounted = true;
        const load = async () => {
            try {
                if (!win.grecaptcha) {
                    await new Promise<void>((resolve, reject) => {
                        const s = document.createElement('script');
                        s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
                        s.async = true;
                        s.defer = true;
                        s.onload = () => resolve();
                        s.onerror = () => reject(new Error('Failed to load recaptcha'));
                        document.head.appendChild(s);
                    });
                }
                if (win.grecaptcha && typeof win.grecaptcha.ready === 'function') {
                    win.grecaptcha.ready(() => { if (mounted) setRecaptchaReady(true); });
                } else {
                    if (mounted) setRecaptchaError('reCAPTCHA not available');
                }
            } catch (e) {
                console.warn('recaptcha preload failed', e && (e as Error).message ? (e as Error).message : e);
                if (mounted) setRecaptchaError('Failed to load reCAPTCHA');
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
        setIsLoading(true);
        // Try to fetch reCAPTCHA token if site key configured
        const siteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').toString();
        const getRecaptchaToken = async (): Promise<string | null> => {
            if (!siteKey) return null;
            const win = window as any;
            if (!win.grecaptcha || typeof win.grecaptcha.execute !== 'function') return null;
            try {
                // ensure ready
                await new Promise<void>((resolve) => {
                    try {
                        win.grecaptcha.ready(resolve);
                    } catch (e) {
                        resolve();
                    }
                });
                // execute with timeout
                const tokenPromise = win.grecaptcha.execute(siteKey, { action: 'admin_login' });
                const token = await Promise.race([
                    tokenPromise,
                    new Promise<null>((res) => setTimeout(() => res(null), 5000))
                ]);
                if (!token) return null;
                return token as string;
            } catch (e) {
                console.warn('recaptcha exec failed', e && (e as Error).message ? (e as Error).message : e);
                return null;
            }
        };
    try {
            // Call server-side login proxy which can enforce recaptcha and rate-limits
            setRecaptchaError(null);
            // don't attempt if recaptcha isn't ready
            if (!recaptchaReady && (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').toString()) {
                setRecaptchaError('reCAPTCHA masih dimuat, coba lagi sebentar');
                setIsLoading(false);
                return;
            }
            const recaptchaToken = await getRecaptchaToken();
            if (!recaptchaToken && (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').toString()) {
                setRecaptchaError('Gagal memverifikasi reCAPTCHA — refresh dan coba lagi');
                setIsLoading(false);
                return;
            }
            const resp = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: username, password, recaptchaToken })
            });
                const json = await resp.json().catch(() => null);
            if (!resp.ok) {
                const msg = (json && (json.error || json.message)) || `Login failed (${resp.status})`;
                try { showToast(msg, 'error'); } catch {}
                setIsLoading(false);
                return;
            }

            // json should contain access_token and refresh_token when successful
            const supabase = getSupabaseClient();
            try {
                if (json && json.access_token && json.refresh_token) {
                    // set session in client so the app is authenticated
                    // supabase-js provides auth.setSession in v2
                    if (typeof supabase.auth.setSession === 'function') {
                        await supabase.auth.setSession({ access_token: json.access_token, refresh_token: json.refresh_token });
                    }
                }
            } catch (e) {
                console.warn('Failed to set supabase session from server response', e);
            }

            // Successful sign-in: call onLogin and let App sync session
            onLogin();
            try { showToast('Berhasil login', 'success'); } catch {}
        } catch (err: any) {
        try { showToast(err?.message ?? 'Login error', 'error'); } catch {}
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="login-card">
                <h1>Admin Login</h1>
                <form className="login-form" onSubmit={handleSubmit}>
                    {/* inline error removed; using global toast for consistent messages */}
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    {recaptchaError && <div className="form-error" style={{ color: 'crimson', marginTop: 8 }}>{recaptchaError}</div>}
                    <button type="submit" className={`btn btn-primary btn-large ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
                        {isLoading && <SpinnerIcon />}
                        <span>Login</span>
                    </button>
                </form>
            </div>
        </div>
    );
};