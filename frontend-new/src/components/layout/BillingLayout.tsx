import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart,
  History,
  LayoutDashboard,
  LogOut,
  Receipt,
  ShieldAlert
} from 'lucide-react';

export const BillingLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Receipt size={28} />
          <span>AANZARA POS</span>
        </div>

        <ul className="sidebar-menu">
          <li>
            <NavLink to="/billing/create" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <ShoppingCart size={18} />
              <span>Create Bill</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/billing/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Overview</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/billing/history" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <History size={18} />
              <span>Billing History</span>
            </NavLink>
          </li>
          {user?.role === 'Admin' && (
            <li style={{ marginTop: '20px', borderTop: '1px solid var(--bg-card-border)', paddingTop: '16px' }}>
              <NavLink to="/admin/dashboard" className="sidebar-link" style={{ color: 'var(--accent-warning)' }}>
                <ShieldAlert size={18} />
                <span>Admin Portal</span>
              </NavLink>
            </li>
          )}
        </ul>
      </aside>

      <main className="main-content">
        <header className="header-bar">
          <div className="header-title">Billing POS Terminal</div>
          <div className="user-badge">
            <div className="user-avatar" style={{ background: 'var(--accent-success)' }}>
              {user?.name?.charAt(0) || 'W'}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{user?.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user?.role}</div>
            </div>
            <button className="btn btn-secondary" onClick={handleLogout} style={{ marginLeft: '12px', padding: '8px 12px' }}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="page-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default BillingLayout;
