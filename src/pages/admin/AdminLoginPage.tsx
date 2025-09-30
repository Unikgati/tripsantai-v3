import React, { useState } from 'react';
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

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
        setIsLoading(true);
        // Try to fetch reCAPTCHA token if site key configured
        const siteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').toString();
        const getRecaptchaToken = async (): Promise<string | null> => {
            if (!siteKey) return null;
            try {
                // If grecaptcha not loaded, inject script
                const win = window as any;
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
                if (!win.grecaptcha || !win.grecaptcha.execute) return null;
                const token: string = await win.grecaptcha.execute(siteKey, { action: 'admin_login' });
                return token || null;
            } catch (e) {
                console.warn('recaptcha exec failed', e && (e as Error).message ? (e as Error).message : e);
                return null;
            }
        };
    try {
            // Call server-side login proxy which can enforce recaptcha and rate-limits
            const recaptchaToken = await getRecaptchaToken();
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
                    <button type="submit" className={`btn btn-primary btn-large ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
                        {isLoading && <SpinnerIcon />}
                        <span>Login</span>
                    </button>
                </form>
            </div>
        </div>
    );
};