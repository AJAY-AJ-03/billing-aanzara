// src/components/layout/AdminLayout.tsx
import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  Tag,
  Receipt,
  BarChart3,
  Users,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import './AdminLayout.css';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/categories', label: 'Categories', icon: Layers },
      { to: '/admin/stock', label: 'Stock', icon: Boxes },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/admin/sales', label: 'Sales Log', icon: Receipt },
      { to: '/admin/offers', label: 'Offers & Discounts', icon: Tag },
    ],
  },
  {
    label: 'Insights',
    items: [{ to: '/admin/reports', label: 'Reports', icon: BarChart3 }],
  },
  {
    label: 'Administration',
    items: [{ to: '/admin/users', label: 'User Accounts', icon: Users }],
  },
];

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  categories: 'Categories',
  stock: 'Stock Management',
  offers: 'Offers & Discounts',
  sales: 'Sales Log',
  reports: 'Reports',
  users: 'User Accounts',
};

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('admin.sidebarCollapsed') === '1';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('admin.sidebarCollapsed', collapsed ? '1' : '0');
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

  const currentSegment = location.pathname.split('/').filter(Boolean).pop() || 'dashboard';
  const currentTitle = PAGE_TITLES[currentSegment] ?? 'Dashboard';

  return (
    <div className={`admin-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">A</div>
          {!collapsed && (
            <div className="admin-brand-text">
              <span className="admin-brand-name">Aanzara</span>
              <span className="admin-brand-sub">Billing Suite</span>
            </div>
          )}
          <button
            type="button"
            className="admin-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="admin-nav">
          {NAV_GROUPS.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              {!collapsed && <div className="admin-nav-group-label">{group.label}</div>}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `admin-nav-link ${isActive ? 'is-active' : ''}`
                  }
                >
                  <item.icon size={18} strokeWidth={1.8} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {!collapsed && <span className="admin-version">v1.0 · Admin Portal</span>}
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-breadcrumb">
            <span className="admin-breadcrumb-root">Admin</span>
            <span className="admin-breadcrumb-sep">/</span>
            <span className="admin-breadcrumb-current">{currentTitle}</span>
          </div>

          <div className="admin-header-actions">
            <div className="admin-search">
              <Search size={16} strokeWidth={2} />
              <input
                type="text"
                placeholder="Search products, bills, users…"
                aria-label="Search"
              />
            </div>

            <button type="button" className="admin-icon-btn" aria-label="Notifications">
              <Bell size={18} strokeWidth={1.8} />
              <span className="admin-notif-dot" />
            </button>

            <div className="admin-user-menu" ref={menuRef}>
              <button
                type="button"
                className="admin-user-trigger"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <div className="admin-avatar">{user?.name?.charAt(0) || 'A'}</div>
                <div className="admin-user-text">
                  <span className="admin-user-name">{user?.name}</span>
                  <span className="admin-user-role">{user?.role}</span>
                </div>
                <ChevronDown size={16} className={`admin-chevron ${menuOpen ? 'is-open' : ''}`} />
              </button>

              {menuOpen && (
                <div className="admin-user-dropdown">
                  <button type="button" className="admin-dropdown-item">
                    <Settings size={16} strokeWidth={1.8} />
                    <span>Account settings</span>
                  </button>
                  <div className="admin-dropdown-divider" />
                  <button type="button" className="admin-dropdown-item is-danger" onClick={handleLogout}>
                    <LogOut size={16} strokeWidth={1.8} />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="admin-page-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;