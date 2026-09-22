import React, { useEffect, useState } from 'react';
import api from '../../services/ipcApi';
import type { MonthlySalesDto, DailySalesDto, ProductSalesDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import { Download, Calendar, BarChart3, FileSpreadsheet } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'daily' | 'product'>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const [monthlyData, setMonthlyData] = useState<MonthlySalesDto[]>([]);
  const [dailyData, setDailyData] = useState<DailySalesDto[]>([]);
  const [productData, setProductData] = useState<ProductSalesDto[]>([]);

  const { showToast } = useToast();

  useEffect(() => {
    if (activeTab === 'monthly') loadMonthly();
    if (activeTab === 'daily') loadDaily();
    if (activeTab === 'product') loadProductSales();
  }, [activeTab, year, fromDate, toDate]);

  const loadMonthly = async () => {
    const res = await api.reports.monthlySales(year);
    if (res.success && res.data) setMonthlyData(res.data);
  };

  const loadDaily = async () => {
    const res = await api.reports.dailySales(fromDate, toDate);
    if (res.success && res.data) setDailyData(res.data);
  };

  const loadProductSales = async () => {
    const res = await api.reports.productSales(fromDate, toDate);
    if (res.success && res.data) setProductData(res.data);
  };

  const handleExportSales = async () => {
    const res = await api.reports.exportSales({ fromDate, toDate });
    if (res.success && res.data) {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.data}`;
      link.download = `SalesReport_${fromDate}_to_${toDate}.xlsx`;
      link.click();
      showToast('Sales report exported to Excel', 'success');
    }
  };

  const handleExportGst = async () => {
    const res = await api.reports.exportGst(fromDate, toDate);
    if (res.success && res.data) {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.data}`;
      link.download = `GSTReport_${fromDate}_to_${toDate}.xlsx`;
      link.click();
      showToast('GST report exported to Excel', 'success');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <span>Business Reports & GST Export</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={handleExportSales}>
              <Download size={16} />
              <span>Export Sales Excel</span>
            </button>
            <button className="btn btn-primary" onClick={handleExportGst}>
              <FileSpreadsheet size={16} />
              <span>Export GST Excel</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={`btn ${activeTab === 'monthly' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('monthly')}>
              <BarChart3 size={16} />
              <span>Monthly Sales</span>
            </button>
            <button className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('daily')}>
              <Calendar size={16} />
              <span>Daily Breakdown</span>
            </button>
            <button className={`btn ${activeTab === 'product' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('product')}>
              <FileSpreadsheet size={16} />
              <span>Item-wise Sales</span>
            </button>
          </div>

          {activeTab === 'monthly' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="form-label" style={{ margin: 0 }}>Year:</span>
              <select className="select-control" style={{ width: '120px' }} value={year} onChange={e => setYear(Number(e.target.value))}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="date" className="input-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input type="date" className="input-control" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          )}
        </div>

        {activeTab === 'monthly' && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Bills Issued</th>
                  <th>Total Sales (₹)</th>
                  <th>Discounts (₹)</th>
                  <th>GST Collected (₹)</th>
                  <th>Net Sales (₹)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(m => (
                  <tr key={m.monthNumber}>
                    <td><strong>{m.month}</strong></td>
                    <td>{m.numberOfBills}</td>
                    <td>₹{m.totalSales.toFixed(2)}</td>
                    <td style={{ color: 'var(--accent-warning)' }}>₹{(m.discountGiven || 0).toFixed(2)}</td>
                    <td>₹{(m.gstCollected || 0).toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-success)' }}>₹{(m.netSales || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'daily' && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Bills</th>
                  <th>Total Daily Sales</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map(d => (
                  <tr key={d.date}>
                    <td><strong>{new Date(d.date).toLocaleDateString()}</strong></td>
                    <td>{d.billsCount}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-success)' }}>₹{d.totalSales.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'product' && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity Sold</th>
                  <th>Total Generated Revenue</th>
                </tr>
              </thead>
              <tbody>
                {productData.map(p => (
                  <tr key={p.productId}>
                    <td><strong>{p.productName}</strong></td>
                    <td><span className="badge badge-info">{p.quantitySold} units</span></td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-success)' }}>₹{p.totalRevenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
