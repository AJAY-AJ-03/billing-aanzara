import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/ipcApi';
import { Receipt, Lock, Mail, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      if (res.success && res.data) {
        login(res.data);
        showToast(`Welcome back, ${res.data.name}!`, 'success');
        if (res.data.role === 'Admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/billing/create');
        }
      } else {
        showToast(res.message || 'Login failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (emailVal: string, passVal: string) => {
    setEmail(emailVal);
    setPassword(passVal);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.15), var(--bg-primary) 70%)',
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'var(--accent-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: '16px',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Receipt size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Aanzara Billing</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
            Offline Desktop Edition
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="email"
                className="input-control"
                style={{ paddingLeft: '42px' }}
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="password"
                className="input-control"
                style={{ paddingLeft: '42px' }}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px' }} disabled={loading}>
            {loading ? 'Authenticating...' : (
              <>
                <span>Sign In to Terminal</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', borderTop: '1px solid var(--bg-card-border)', paddingTop: '20px', fontSize: '13px' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Demo Credentials:</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: '12px', padding: '6px' }}
              onClick={() => handleQuickLogin('admin@example.com', 'Admin@123')}
            >
              Admin Demo
            </button>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: '12px', padding: '6px' }}
              onClick={() => handleQuickLogin('sales@example.com', 'Sales@123')}
            >
              Sales Worker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
