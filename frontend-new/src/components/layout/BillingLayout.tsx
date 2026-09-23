// src/components/layout/BillingLayout.tsx
import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart,
  History,
  LayoutDashboard,
  Receipt,
  ShieldAlert,
  LogOut,
  Settings,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import './BillingLayout.css';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Billing',
    items: [
      { to: '/billing/create', label: 'Create Bill', icon: ShoppingCart },
      { to: '/billing/dashboard', label: 'Overview', icon: LayoutDashboard },
      { to: '/billing/history', label: 'Billing History', icon: History },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin/dashboard', label: 'Admin Portal', icon: ShieldAlert, adminOnly: true },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  create: 'Create Bill',
  dashboard: 'Overview',
  history: 'Billing History',
};

export const BillingLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('billing.sidebarCollapsed') === '1';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('billing.sidebarCollapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Breadcrumb title derived from the URL's last segment
  const currentSegment = location.pathname.split('/').filter(Boolean).pop() || 'create';
  const currentTitle = PAGE_TITLES[currentSegment] ?? 'Billing';

  const isAdmin = user?.role === 'Admin';

  return (
    <div className={`billing-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className="billing-sidebar">
        <div className="billing-brand">
          <div className="billing-brand-mark">
            <Receipt size={18} strokeWidth={2} />
          </div>
          {!collapsed && (
            <div className="billing-brand-text">
              <span className="billing-brand-name">Aanzara</span>
              <span className="billing-brand-sub">POS Terminal</span>
            </div>
          )}
          <button
            type="button"
            className="billing-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="billing-nav">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.adminOnly || isAdmin,
            );
            if (visibleItems.length === 0) return null;
            return (
              <div className="billing-nav-group" key={group.label}>
                {!collapsed && (
                  <div className="billing-nav-group-label">{group.label}</div>
                )}
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `billing-nav-link ${isActive ? 'is-active' : ''} ${
                        item.adminOnly ? 'is-admin' : ''
                      }`
                    }
                  >
                    <item.icon size={18} strokeWidth={1.8} />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="billing-sidebar-footer">
          {!collapsed && <span className="billing-version">v1.0 · POS Terminal</span>}
        </div>
      </aside>

      <main className="billing-main">
        <header className="billing-header">
          <div className="billing-breadcrumb">
            <span className="billing-breadcrumb-root">Billing POS</span>
            <span className="billing-breadcrumb-sep">/</span>
            <span className="billing-breadcrumb-current">{currentTitle}</span>
          </div>

          <div className="billing-header-actions">
            <div className="billing-user-menu" ref={menuRef}>
              <button
                type="button"
                className="billing-user-trigger"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
              >
                <div className="billing-avatar">
                  {user?.name?.charAt(0) || 'W'}
                </div>
                <div className="billing-user-text">
                  <span className="billing-user-name">{user?.name}</span>
                  <span className="billing-user-role">{user?.role}</span>
                </div>
                <ChevronDown
                  size={16}
                  className={`billing-chevron ${menuOpen ? 'is-open' : ''}`}
                />
              </button>

              {menuOpen && (
                <div className="billing-user-dropdown">
                  <button type="button" className="billing-dropdown-item">
                    <Settings size={16} strokeWidth={1.8} />
                    <span>Account settings</span>
                  </button>
                  <div className="billing-dropdown-divider" />
                  <button
                    type="button"
                    className="billing-dropdown-item is-danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} strokeWidth={1.8} />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="billing-page-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default BillingLayout;