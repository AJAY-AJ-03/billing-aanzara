// src/pages/billing/BillingDashboardPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/ipcApi';
import type { BillingDashboardDto } from '../../../../shared/types/ipc';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart,
  IndianRupee,
  Receipt,
  ArrowRight,
  Clock,
  TrendingUp,
} from 'lucide-react';
import './BillingComponents.css';

const formatCurrency = (n: number) =>
  `₹${(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const paymentBadgeClass = (method?: string) => {
  switch (method) {
    case 'UPI':
    case 'Card':
      return 'admin-badge-success';
    case 'Cash':
      return 'admin-badge-neutral';
    default:
      return 'admin-badge-neutral';
  }
};

export const BillingDashboardPage: React.FC = () => {
  const [data, setData] = useState<BillingDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const res = await api.dashboard.billing(user!.userId);
    if (res.success && res.data) setData(res.data);
    else setData(null);
    setLoading(false);
  };

  /* Derived: average bill today */
  const avgBill = useMemo(() => {
    if (!data || !data.todayBills) return 0;
    return data.todaySales / data.todayBills;
  }, [data]);

  if (loading) return <div className="admin-state">Loading your dashboard…</div>;

  return (
    <div>
      {/* Greeting header card */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="admin-toolbar" style={{ marginBottom: 0 }}>
          <div className="admin-toolbar-title">
            <h2>Welcome, {user?.name || 'Sales Worker'}</h2>
            <span>Ready to process sales transactions</span>
          </div>
          <div className="admin-toolbar-actions">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => navigate('/billing/create')}
            >
              <ShoppingCart size={16} />
              <span>New Billing Counter</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="admin-kpi-grid is-compact">
        <div className="admin-kpi-card">
          <div>
            <div className="admin-kpi-label">Today's Bills Created</div>
            <div className="admin-kpi-value">{data?.todayBills || 0}</div>
            <div className="admin-kpi-meta is-muted">Bills issued by you today</div>
          </div>
          <div className="admin-kpi-icon ink">
            <Receipt size={16} strokeWidth={2} />
          </div>
        </div>

        <div className="admin-kpi-card">
          <div>
            <div className="admin-kpi-label">Today's Total Sales</div>
            <div className="admin-kpi-value">{formatCurrency(data?.todaySales || 0)}</div>
            <div className="admin-kpi-meta is-positive">Revenue processed today</div>
          </div>
          <div className="admin-kpi-icon emerald">
            <IndianRupee size={16} strokeWidth={2} />
          </div>
        </div>

        <div className="admin-kpi-card">
          <div>
            <div className="admin-kpi-label">Average Bill Value</div>
            <div className="admin-kpi-value">{formatCurrency(avgBill)}</div>
            <div className="admin-kpi-meta is-muted">Per bill today</div>
          </div>
          <div className="admin-kpi-icon gold">
            <TrendingUp size={16} strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Recent bills card */}
      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-toolbar-title">
            <h2>Recent Bills Processed</h2>
            <span>Today's activity</span>
          </div>
          <div className="admin-toolbar-actions">
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => navigate('/billing/history')}
            >
              <Clock size={16} />
              <span>View all</span>
            </button>
          </div>
        </div>

        {data && data.recentBills && data.recentBills.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Time</th>
                <th>Payment Method</th>
                <th className="num">Total Amount</th>
                <th className="num"></th>
              </tr>
            </thead>
            <tbody>
              {data.recentBills.map((b) => (
                <tr
                  key={b.invoiceNumber}
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    navigate(`/billing/invoice/${(b as any).saleId || b.invoiceNumber}`)
                  }
                >
                  <td className="admin-cell-primary">{b.invoiceNumber}</td>
                  <td style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>
                    {formatTime(b.createdAt)}
                  </td>
                  <td>
                    <span className={`admin-badge ${paymentBadgeClass(b.paymentMethod)}`}>
                      {b.paymentMethod}
                    </span>
                  </td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--admin-accent)' }}>
                    {formatCurrency(b.grandTotal)}
                  </td>
                  <td className="num">
                    <ArrowRight size={14} style={{ color: 'var(--admin-text-faint)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty-block">
            <div className="admin-empty-icon">
              <Receipt size={20} />
            </div>
            <div className="admin-empty-title">No bills yet today</div>
            <div className="admin-empty-desc">
              Click <strong>New Billing Counter</strong> to process your first sale.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingDashboardPage;