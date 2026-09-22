import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/ipcApi';
import type { BillingDashboardDto } from '../../../../shared/types/ipc';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart, DollarSign, Receipt, ArrowRight } from 'lucide-react';

export const BillingDashboardPage: React.FC = () => {
  const [data, setData] = useState<BillingDashboardDto | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    const res = await api.dashboard.billing(user!.userId);
    if (res.success && res.data) {
      setData(res.data);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Welcome, {user?.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Ready to process sales transactions
          </p>
        </div>
        <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }} onClick={() => navigate('/billing/create')}>
          <ShoppingCart size={20} />
          <span>New Billing Counter</span>
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Today's Bills Created</div>
            <div className="kpi-value">{data?.todayBills || 0}</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
            <Receipt size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Today's Total Sales</div>
            <div className="kpi-value">₹{(data?.todaySales || 0).toLocaleString()}</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '12px', color: 'var(--accent-success)' }}>
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Recent Bills Processed</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Time</th>
                <th>Payment Method</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentBills.map(b => (
                <tr key={b.invoiceNumber}>
                  <td><strong>{b.invoiceNumber}</strong></td>
                  <td>{new Date(b.createdAt).toLocaleTimeString()}</td>
                  <td><span className="badge badge-info">{b.paymentMethod}</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-success)' }}>₹{b.grandTotal.toFixed(2)}</td>
                </tr>
              ))}
              {(!data?.recentBills || data.recentBills.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No recent bills logged today. Click "New Billing Counter" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingDashboardPage;
