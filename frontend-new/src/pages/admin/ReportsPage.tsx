// src/pages/admin/ReportsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/ipcApi';
import type { MonthlySalesDto, DailySalesDto, ProductSalesDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import {
  Download,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  Package,
  Loader2,
  FileSearch,
} from 'lucide-react';

type ReportTab = 'monthly' | 'daily' | 'product';

const YEARS = [2024, 2025, 2026, 2027];

const fmtINR = (n: number | undefined | null) =>
  `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtInt = (n: number | undefined | null) => (n ?? 0).toLocaleString('en-IN');

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
  );
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const [monthlyData, setMonthlyData] = useState<MonthlySalesDto[]>([]);
  const [dailyData, setDailyData] = useState<DailySalesDto[]>([]);
  const [productData, setProductData] = useState<ProductSalesDto[]>([]);

  const [loading, setLoading] = useState(false);
  const [exportingSales, setExportingSales] = useState(false);
  const [exportingGst, setExportingGst] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    if (activeTab === 'monthly') loadMonthly();
    if (activeTab === 'daily') loadDaily();
    if (activeTab === 'product') loadProductSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, year, fromDate, toDate]);

  const loadMonthly = async () => {
    setLoading(true);
    const res = await api.reports.monthlySales(year);
    if (res.success && res.data) setMonthlyData(res.data);
    else setMonthlyData([]);
    setLoading(false);
  };

  const loadDaily = async () => {
    setLoading(true);
    const res = await api.reports.dailySales(fromDate, toDate);
    if (res.success && res.data) setDailyData(res.data);
    else setDailyData([]);
    setLoading(false);
  };

  const loadProductSales = async () => {
    setLoading(true);
    const res = await api.reports.productSales(fromDate, toDate);
    if (res.success && res.data) setProductData(res.data);
    else setProductData([]);
    setLoading(false);
  };

  const handleExportSales = async () => {
    setExportingSales(true);
    try {
      const res = await api.reports.exportSales({ fromDate, toDate });
      if (res.success && res.data) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.data}`;
        link.download = `SalesReport_${fromDate}_to_${toDate}.xlsx`;
        link.click();
        showToast('Sales report exported to Excel', 'success');
      } else {
        showToast(res.message || 'Export failed', 'error');
      }
    } finally {
      setExportingSales(false);
    }
  };

  const handleExportGst = async () => {
    setExportingGst(true);
    try {
      const res = await api.reports.exportGst(fromDate, toDate);
      if (res.success && res.data) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.data}`;
        link.download = `GSTReport_${fromDate}_to_${toDate}.xlsx`;
        link.click();
        showToast('GST report exported to Excel', 'success');
      } else {
        showToast(res.message || 'Export failed', 'error');
      }
    } finally {
      setExportingGst(false);
    }
  };

  /* ---------- Derived stats for the current tab ---------- */
  const stats = useMemo(() => {
    if (activeTab === 'monthly') {
      const bills = monthlyData.reduce((s, m) => s + (m.numberOfBills || 0), 0);
      const sales = monthlyData.reduce((s, m) => s + (m.totalSales || 0), 0);
      const disc = monthlyData.reduce((s, m) => s + (m.discountGiven || 0), 0);
      const gst = monthlyData.reduce((s, m) => s + (m.gstCollected || 0), 0);
      const net = monthlyData.reduce((s, m) => s + (m.netSales || 0), 0);
      return { bills, sales, disc, gst, net, rows: monthlyData.length };
    }
    if (activeTab === 'daily') {
      const bills = dailyData.reduce((s, d) => s + (d.billsCount || 0), 0);
      const sales = dailyData.reduce((s, d) => s + (d.totalSales || 0), 0);
      return { bills, sales, disc: 0, gst: 0, net: sales, rows: dailyData.length };
    }
    const qty = productData.reduce((s, p) => s + (p.quantitySold || 0), 0);
    const rev = productData.reduce((s, p) => s + (p.totalRevenue || 0), 0);
    return { bills: 0, sales: rev, disc: 0, gst: 0, net: rev, rows: productData.length, qty };
  }, [activeTab, monthlyData, dailyData, productData]);

  return (
    <div>
      <div className="admin-card">
        {/* Toolbar: title + export actions */}
        <div className="admin-toolbar" style={{ marginBottom: '14px' }}>
          <div className="admin-toolbar-title">
            <h2>Business Reports &amp; GST Export</h2>
            <span>Analytics &amp; compliance</span>
          </div>
          <div className="admin-toolbar-actions">
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={handleExportSales}
              disabled={exportingSales}
            >
              {exportingSales ? <Loader2 size={16} className="admin-spin" /> : <Download size={16} />}
              <span>{exportingSales ? 'Exporting…' : 'Export Sales'}</span>
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={handleExportGst}
              disabled={exportingGst}
            >
              {exportingGst ? <Loader2 size={16} className="admin-spin" /> : <FileSpreadsheet size={16} />}
              <span>{exportingGst ? 'Exporting…' : 'Export GST'}</span>
            </button>
          </div>
        </div>

        {/* Tabs + filters on one row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '16px',
          }}
        >
          <div className="admin-tabs" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={`admin-tab ${activeTab === 'monthly' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('monthly')}
            >
              <BarChart3 size={15} />
              <span>Monthly Sales</span>
            </button>
            <button
              type="button"
              className={`admin-tab ${activeTab === 'daily' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('daily')}
            >
              <Calendar size={15} />
              <span>Daily Breakdown</span>
            </button>
            <button
              type="button"
              className={`admin-tab ${activeTab === 'product' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('product')}
            >
              <Package size={15} />
              <span>Item-wise Sales</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {activeTab === 'monthly' ? (
              <>
                <span className="admin-label" style={{ margin: 0 }}>Year</span>
                <select
                  className="admin-select"
                  style={{ width: '110px', padding: '6px 10px' }}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <input
                  type="date"
                  className="admin-input"
                  style={{ width: '150px', padding: '6px 10px' }}
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <span style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>to</span>
                <input
                  type="date"
                  className="admin-input"
                  style={{ width: '150px', padding: '6px 10px' }}
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </>
            )}
          </div>
        </div>

        {/* Summary chips — one row of 6 for monthly, 3 for others */}
        <div className="admin-stat-row" style={{ margin: '0 0 14px' }}>
          {activeTab === 'monthly' && (
            <>
              <StatChip label="Months" value={fmtInt(stats.rows)} hint={`Year ${year}`} />
              <StatChip label="Bills Issued" value={fmtInt(stats.bills)} />
              <StatChip label="Total Sales" value={fmtINR(stats.sales)} accent />
              <StatChip label="Discounts" value={fmtINR(stats.disc)} />
              <StatChip label="GST Collected" value={fmtINR(stats.gst)} />
              <StatChip label="Net Sales" value={fmtINR(stats.net)} accent />
            </>
          )}
          {activeTab === 'daily' && (
            <>
              <StatChip label="Days" value={fmtInt(stats.rows)} hint={`${fromDate} → ${toDate}`} />
              <StatChip label="Total Bills" value={fmtInt(stats.bills)} />
              <StatChip label="Total Sales" value={fmtINR(stats.sales)} accent />
            </>
          )}
          {activeTab === 'product' && (
            <>
              <StatChip label="Products" value={fmtInt(stats.rows)} />
              <StatChip label="Units Sold" value={fmtInt(stats.qty || 0)} />
              <StatChip label="Revenue" value={fmtINR(stats.net)} accent />
            </>
          )}
        </div>

        {/* Table */}
        {activeTab === 'monthly' && <MonthlyTable data={monthlyData} loading={loading} />}
        {activeTab === 'daily' && <DailyTable data={dailyData} loading={loading} />}
        {activeTab === 'product' && <ProductTable data={productData} loading={loading} />}
      </div>
    </div>
  );
};

/* ---------- Stat chip ---------- */
const StatChip: React.FC<{ label: string; value: string; hint?: string; accent?: boolean }> = ({
  label,
  value,
  hint,
  accent,
}) => (
  <div className="admin-stat-chip" style={{ padding: '10px 12px', minWidth: '120px' }}>
    <div className="admin-stat-chip-label">{label}</div>
    <div className={`admin-stat-chip-value ${accent ? 'is-accent' : ''}`} style={{ fontSize: '16px' }}>
      {value}
    </div>
    {hint && <div className="admin-stat-chip-hint">{hint}</div>}
  </div>
);

/* ---------- Empty state ---------- */
const EmptyBlock: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div className="admin-empty-block">
    <div className="admin-empty-icon">
      <FileSearch size={20} />
    </div>
    <div className="admin-empty-title">{title}</div>
    <div className="admin-empty-desc">{desc}</div>
  </div>
);

/* ---------- Monthly table ---------- */
const MonthlyTable: React.FC<{ data: MonthlySalesDto[]; loading: boolean }> = ({ data, loading }) => {
  if (!loading && data.length === 0)
    return <EmptyBlock title="No monthly data" desc="No sales were recorded for this year." />;

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Month</th>
          <th className="num">Bills</th>
          <th className="num">Total Sales</th>
          <th className="num">Discounts</th>
          <th className="num">GST Collected</th>
          <th className="num">Net Sales</th>
        </tr>
      </thead>
      <tbody>
        {data.map((m) => (
          <tr key={m.monthNumber}>
            <td className="admin-cell-primary">{m.month}</td>
            <td className="num">{fmtInt(m.numberOfBills)}</td>
            <td className="num">{fmtINR(m.totalSales)}</td>
            <td className="num" style={{ color: 'var(--admin-gold)' }}>{fmtINR(m.discountGiven)}</td>
            <td className="num" style={{ color: 'var(--admin-text-muted)' }}>{fmtINR(m.gstCollected)}</td>
            <td className="num" style={{ fontWeight: 700, color: 'var(--admin-accent)' }}>
              {fmtINR(m.netSales)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/* ---------- Daily table ---------- */
const DailyTable: React.FC<{ data: DailySalesDto[]; loading: boolean }> = ({ data, loading }) => {
  if (!loading && data.length === 0)
    return <EmptyBlock title="No daily data" desc="No bills were recorded in this date range." />;

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Date</th>
          <th className="num">Total Bills</th>
          <th className="num">Daily Sales</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.date}>
            <td className="admin-cell-primary">
              {new Date(d.date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </td>
            <td className="num">{fmtInt(d.billsCount)}</td>
            <td className="num" style={{ fontWeight: 700, color: 'var(--admin-accent)' }}>
              {fmtINR(d.totalSales)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/* ---------- Product table ---------- */
const ProductTable: React.FC<{ data: ProductSalesDto[]; loading: boolean }> = ({ data, loading }) => {
  if (!loading && data.length === 0)
    return <EmptyBlock title="No product sales" desc="No items were sold in this date range." />;

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Product</th>
          <th className="num">Quantity Sold</th>
          <th className="num">Revenue</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p) => (
          <tr key={p.productId}>
            <td className="admin-cell-primary">{p.productName}</td>
            <td className="num">
              <span className="admin-badge admin-badge-neutral">{fmtInt(p.quantitySold)} units</span>
            </td>
            <td className="num" style={{ fontWeight: 700, color: 'var(--admin-accent)' }}>
              {fmtINR(p.totalRevenue)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ReportsPage;