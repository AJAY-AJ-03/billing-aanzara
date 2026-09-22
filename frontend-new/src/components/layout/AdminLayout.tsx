import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  LogOut
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
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
          <span>AANZARA</span>
        </div>

        <ul className="sidebar-menu">
          <li>
            <NavLink to="/admin/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/products" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Package size={18} />
              <span>Products</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/categories" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Layers size={18} />
              <span>Categories</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/stock" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Boxes size={18} />
              <span>Stock Management</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/offers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Tag size={18} />
              <span>Offers & Discounts</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/sales" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Receipt size={18} />
              <span>Sales Log</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/reports" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <BarChart3 size={18} />
              <span>Reports</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>User Accounts</span>
            </NavLink>
          </li>
        </ul>
      </aside>

      <main className="main-content">
        <header className="header-bar">
          <div className="header-title">Admin Management Portal</div>
          <div className="user-badge">
            <div className="user-avatar">{user?.name?.charAt(0) || 'A'}</div>
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

export default AdminLayout;
