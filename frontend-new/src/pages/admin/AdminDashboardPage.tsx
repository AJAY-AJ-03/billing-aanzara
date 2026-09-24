// src/pages/admin/AdminDashboardPage.tsx
import React, { useEffect, useState } from 'react';
import api from '../../services/ipcApi';
import type { AdminDashboardDto } from '../../../../shared/types/ipc';
import { Package, IndianRupee, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import './AdminComponents.css';

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCompactCurrency = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
};

const formatCount = (n: number) => n.toLocaleString('en-IN');

/* Compact recharts tooltip that matches the admin design tokens */
const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="admin-chart-tooltip">
      <div className="admin-chart-tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div className="admin-chart-tooltip-row" key={p.dataKey}>
          <span className="admin-chart-tooltip-dot" style={{ background: p.color }} />
          <span style={{ color: 'var(--admin-text-muted)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>
            {p.dataKey === 'revenue' ? formatCurrency(p.value) : formatCount(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // ADDED

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(false);
    setErrorMessage(null); // ADDED
    const res = await api.dashboard.admin();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      console.error('[dashboard:admin] failed:', res.message); // ADDED — check DevTools console
      setError(true);
      setErrorMessage(res.message || null); // ADDED
    }
    setLoading(false);
  };

  if (loading) return <div className="admin-state">Loading dashboard…</div>;
  if (error || !data) {
    return (
      <div className="admin-state is-error">
        Couldn't load dashboard metrics. Try refreshing.
        {errorMessage && (
          // ADDED — shows the real backend error under the generic message
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            {errorMessage}
          </div>
        )}
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Prepare chart data — recharts expects an array of plain objects
  const chartData = data.monthlySales.map((m) => ({
    month: m.month,
    bills: m.bills,
    revenue: m.total,
  }));

  return (
    <div>
      <div className="admin-page-meta">Updated {today}</div>

      {/* Compact KPI grid */}
      <div className="admin-kpi-grid is-compact">
        <div className="admin-kpi-card">
          <div>
            <div className="admin-kpi-label">Today's Revenue</div>
            <div className="admin-kpi-value">{formatCurrency(data.todaySales)}</div>
            <div className="admin-kpi-meta is-positive">
              {formatCount(data.todayBills)} bills today
            </div>
          </div>
          <div className="admin-kpi-icon emerald">
            <IndianRupee size={16} strokeWidth={2} />
          </div>
        </div>

        <div className="admin-kpi-card">
          <div>
            <div className="admin-kpi-label">This Month's Sales</div>
            <div className="admin-kpi-value">{formatCurrency(data.thisMonthSales)}</div>
            <div className="admin-kpi-meta is-muted">
              {formatCount(data.thisMonthBills)} bills this month
            </div>
          </div>
          <div className="admin-kpi-icon ink">
            <TrendingUp size={16} strokeWidth={2} />
          </div>
        </div>

        <div className="admin-kpi-card">
          <div>
            <div className="admin-kpi-label">Inventory Items</div>
            <div className="admin-kpi-value">{formatCount(data.totalProducts)}</div>
            <div className="admin-kpi-meta is-muted">
              {formatCount(data.totalStock)} in stock
            </div>
          </div>
          <div className="admin-kpi-icon gold">
            <Package size={16} strokeWidth={2} />
          </div>
        </div>

        <div className="admin-kpi-card">
          <div>
            <div className="admin-kpi-label">Stock Warnings</div>
            <div className="admin-kpi-value">{formatCount(data.lowStockCount)}</div>
            <div
              className={`admin-kpi-meta ${
                data.outOfStockCount > 0 ? 'is-danger' : 'is-muted'
              }`}
            >
              {formatCount(data.outOfStockCount)} out of stock
            </div>
          </div>
          <div className="admin-kpi-icon danger">
            <AlertTriangle size={16} strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Chart + Top Products */}
      <div className="admin-grid-2">
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <div className="admin-card-title">Monthly Sales Trend</div>
              <div className="admin-card-subtitle">
                Bills issued and revenue by month
              </div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="admin-empty">No sales recorded yet.</div>
          ) : (
            <div className="admin-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--admin-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11.5, fill: 'var(--admin-text-muted)' }}
                    axisLine={{ stroke: 'var(--admin-border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11.5, fill: 'var(--admin-text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickFormatter={(v) => formatCompactCurrency(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11.5, fill: 'var(--admin-text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{
                      fontSize: 12,
                      color: 'var(--admin-text-muted)',
                      paddingTop: 8,
                    }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="var(--admin-accent)"
                    strokeWidth={2.2}
                    dot={{ r: 3, fill: 'var(--admin-accent)' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="bills"
                    name="Bills"
                    stroke="var(--admin-gold)"
                    strokeWidth={2.2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: 'var(--admin-gold)' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
                      <div className="admin-rank-meta">
                        {formatCount(p.quantitySold)} units sold
                      </div>
                    </div>
                  </div>
                  <div className="admin-rank-value">
                    {formatCurrency(p.revenue)}
                  </div>
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