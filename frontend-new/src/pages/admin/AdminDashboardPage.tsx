// src/pages/admin/AdminDashboardPage.tsx
import React, { useEffect, useState } from 'react';
import api from '../../services/ipcApi';
import type { AdminDashboardDto } from '../../../../shared/types/ipc';
import { Package, IndianRupee, AlertTriangle, TrendingUp } from 'lucide-react';
import './AdminComponents.css';

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCount = (n: number) => n.toLocaleString('en-IN');

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(false);
    const res = await api.dashboard.admin();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(true);
    }
    setLoading(false);
  };

  if (loading) return <div className="admin-state">Loading dashboard…</div>;
  if (error || !data) {
    return <div className="admin-state is-error">Couldn't load dashboard metrics. Try refreshing.</div>;
  }

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div>
      <div className="admin-page-meta">Updated {today}</div>

      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div>
            <div className="admin-kpi-label">Today's Revenue</div>
            <div className="admin-kpi-value">{formatCurrency(data.todaySales)}</div>
            <div className="admin-kpi-meta is-positive">{formatCount(data.todayBills)} bills created today</div>
          </div>
          <div className="admin-kpi-icon emerald">
            <IndianRupee size={19} strokeWidth={2} />
          </div>
        </div>

        <div className="admin-kpi-card">
          <div>
            <div className="admin-kpi-label">This Month's Sales</div>
            <div className="admin-kpi-value">{formatCurrency(data.thisMonthSales)}</div>
            <div className="admin-kpi-meta is-muted">{formatCount(data.thisMonthBills)} bills this month</div>
          </div>
          <div className="admin-kpi-icon ink">
            <TrendingUp size={19} strokeWidth={2} />
          </div>
        </div>

        <div className="admin-kpi-card">
          <div>
            <div className="admin-kpi-label">Inventory Items</div>
            <div className="admin-kpi-value">{formatCount(data.totalProducts)}</div>
            <div className="admin-kpi-meta is-muted">{formatCount(data.totalStock)} total stock count</div>
          </div>
          <div className="admin-kpi-icon gold">
            <Package size={19} strokeWidth={2} />
          </div>
        </div>

        <div className="admin-kpi-card">
          <div>
            <div className="admin-kpi-label">Stock Warnings</div>
            <div className="admin-kpi-value">{formatCount(data.lowStockCount)}</div>
            <div className={`admin-kpi-meta ${data.outOfStockCount > 0 ? 'is-danger' : 'is-muted'}`}>
              {formatCount(data.outOfStockCount)} out of stock
            </div>
          </div>
          <div className="admin-kpi-icon danger">
            <AlertTriangle size={19} strokeWidth={2} />
          </div>
        </div>
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <div className="admin-card-title">Monthly Sales Trend</div>
              <div className="admin-card-subtitle">Bills issued and revenue by month</div>
            </div>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="num">Bills Issued</th>
                <th className="num">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.monthlySales.map((m) => (
                <tr key={m.monthNumber}>
                  <td style={{ fontWeight: 600 }}>{m.month}</td>
                  <td className="num">{formatCount(m.bills)}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.monthlySales.length === 0 && (
            <div className="admin-empty">No sales recorded yet.</div>
          )}
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <div className="admin-card-title">Top Selling Products</div>
              <div className="admin-card-subtitle">By revenue this period</div>
            </div>
          </div>

          {data.topProducts.length === 0 ? (
            <div className="admin-empty">No sales data available yet.</div>
          ) : (
            <div>
              {data.topProducts.map((p, idx) => (
                <div className="admin-rank-row" key={p.productId}>
                  <div className="admin-rank-left">
                    <div className="admin-rank-index">{idx + 1}</div>
                    <div>
                      <div className="admin-rank-name">{p.productName}</div>
                      <div className="admin-rank-meta">{formatCount(p.quantitySold)} units sold</div>
                    </div>
                  </div>
                  <div className="admin-rank-value">{formatCurrency(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;