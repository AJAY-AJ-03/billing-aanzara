import React, { useEffect, useState } from 'react';
import api from '../../services/ipcApi';
import type { AdminDashboardDto } from '../../../../shared/types/ipc';
import { Package, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const res = await api.dashboard.admin();
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading Admin Analytics...</div>;
  if (!data) return <div style={{ padding: '40px', color: 'var(--accent-danger)' }}>Failed to load dashboard metrics.</div>;

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Today's Revenue</div>
            <div className="kpi-value">₹{data.todaySales.toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: 'var(--accent-success)', marginTop: '4px' }}>
              {data.todayBills} bills created today
            </div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '12px', color: 'var(--accent-success)' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">This Month Sales</div>
            <div className="kpi-value">₹{data.thisMonthSales.toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {data.thisMonthBills} bills this month
            </div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Total Inventory Items</div>
            <div className="kpi-value">{data.totalProducts}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {data.totalStock} total stock count
            </div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '12px', color: '#8b5cf6' }}>
            <Package size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Stock Warnings</div>
            <div className="kpi-value" style={{ color: data.lowStockCount > 0 ? 'var(--accent-warning)' : 'inherit' }}>
              {data.lowStockCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--accent-danger)', marginTop: '4px' }}>
              {data.outOfStockCount} out of stock
            </div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '12px', color: 'var(--accent-warning)' }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card">
          <div className="card-title">Monthly Sales Trend</div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Bills Issued</th>
                  <th style={{ textAlign: 'right' }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlySales.map(m => (
                  <tr key={m.monthNumber}>
                    <td><strong>{m.month}</strong></td>
                    <td>{m.bills}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{m.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Top Selling Products</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.topProducts.map((p, idx) => (
              <div key={p.productId} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>#{idx + 1} {p.productName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.quantitySold} units sold</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--accent-success)' }}>₹{p.revenue.toFixed(2)}</div>
              </div>
            ))}
            {data.topProducts.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No sales data available yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
