// src/pages/auth/LoginPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/ipcApi';
import {
  Receipt,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  WifiOff,
  BarChart3,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import './LoginPage.css';

const REMEMBER_KEY = 'aanzara.login.remember';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [demoOpen, setDemoOpen] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  /* Restore remembered email on mount */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
        window.setTimeout(() => passwordRef.current?.focus(), 0);
      } else {
        window.setTimeout(() => emailRef.current?.focus(), 0);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login({ email: email.trim(), password });
      if (res.success && res.data) {
        try {
          if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
          else localStorage.removeItem(REMEMBER_KEY);
        } catch {
          /* ignore storage errors */
        }

        login(res.data);
        showToast(`Welcome back, ${res.data.name}!`, 'success');

        if (res.data.role === 'Admin') navigate('/admin/dashboard');
        else navigate('/billing/create');
      } else {
        const msg = res.message || 'Login failed. Check your credentials.';
        setErrorMsg(msg);
        showToast(msg, 'error');
      }
    } catch (err: any) {
      const msg = err?.message || 'An unexpected error occurred.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (emailVal: string, passVal: string) => {
    setEmail(emailVal);
    setPassword(passVal);
    setErrorMsg('');
    window.setTimeout(() => passwordRef.current?.focus(), 0);
  };

  const checkCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div className="login-shell">
      {/* ---------- Left brand panel ---------- */}
      <aside className="login-brand-panel">
        <div className="login-brand-mark">
          <div className="login-brand-logo">
            <Receipt size={22} strokeWidth={2} />
          </div>
          <div>
            <div className="login-brand-name">Aanzara</div>
            <div className="login-brand-sub">Billing Suite · Desktop Edition</div>
          </div>
        </div>

        <div className="login-brand-copy">
          <div className="login-brand-headline">
            Run your counter <em>faster</em>, <br />
            without the cloud.
          </div>
          <div className="login-brand-desc">
            A complete offline billing, inventory, and reporting suite built
            for retail counters that can't afford downtime.
          </div>

          <div className="login-brand-features">
            <div className="login-feature">
              <span className="login-feature-dot">
                <WifiOff size={12} strokeWidth={2.5} />
              </span>
              <span>Fully offline — no internet required at the counter</span>
            </div>
            <div className="login-feature">
              <span className="login-feature-dot">
                <ShieldCheck size={12} strokeWidth={2.5} />
              </span>
              <span>Local data, encrypted storage, admin-controlled access</span>
            </div>
            <div className="login-feature">
              <span className="login-feature-dot">
                <BarChart3 size={12} strokeWidth={2.5} />
              </span>
              <span>Real-time sales, GST, and stock insights</span>
            </div>
          </div>
        </div>

        <div className="login-brand-footer">
          © {new Date().getFullYear()} Aanzara Corporate · All rights reserved
        </div>
      </aside>

      {/* ---------- Right form panel ---------- */}
      <main className="login-form-panel">
        <div className="login-card">
          {/* Mobile-only mark */}
          <div className="login-mobile-mark">
            <div className="login-brand-logo">
              <Receipt size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="login-brand-name" style={{ color: 'var(--admin-text)' }}>
                Aanzara
              </div>
              <div className="login-brand-sub" style={{ color: 'var(--admin-text-muted)' }}>
                Billing Suite
              </div>
            </div>
          </div>

          <div className="login-title">Sign in to your terminal</div>
          <div className="login-subtitle">
            Use your registered email and password.
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-email">
                Email address
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <Mail size={16} />
                </span>
                <input
                  id="login-email"
                  ref={emailRef}
                  type="email"
                  className="login-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-password">
                Password
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <Lock size={16} />
                </span>
                <input
                  id="login-password"
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={checkCapsLock}
                  onKeyDown={checkCapsLock}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-input-action"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {capsLock && (
                <div className="login-caps-hint">
                  <AlertCircle size={12} />
                  Caps Lock is on
                </div>
              )}
            </div>

            {/* Remember + forgot */}
            <div className="login-row">
              <label className="login-checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                />
                Remember me on this device
              </label>
              <button type="button" className="login-forgot" disabled={loading}>
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="admin-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {errorMsg && (
              <div className="login-error">
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}
          </form>

          {/* Demo credentials (collapsed by default) */}
          <div className="login-demo">
            <button
              type="button"
              className="login-demo-toggle"
              onClick={() => setDemoOpen((v) => !v)}
              aria-expanded={demoOpen}
            >
              <span>Demo credentials</span>
              <ChevronDown
                size={14}
                className={`chev ${demoOpen ? 'is-open' : ''}`}
              />
            </button>

            {demoOpen && (
              <div className="login-demo-body">
                <button
                  type="button"
                  className="login-demo-btn"
                  onClick={() => handleQuickLogin('admin@example.com', 'Admin@123')}
                  disabled={loading}
                >
                  Admin
                  <small>admin@example.com</small>
                </button>
                <button
                  type="button"
                  className="login-demo-btn"
                  onClick={() => handleQuickLogin('sales@example.com', 'Sales@123')}
                  disabled={loading}
                >
                  Sales Worker
                  <small>sales@example.com</small>
                </button>
              </div>
            )}
          </div>

          <div className="login-card-footer">
            Aanzara Billing Suite · v1.0
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;