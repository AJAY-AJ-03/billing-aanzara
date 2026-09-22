import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/ipcApi';
import type { SaleListItemDto } from '../../../../shared/types/ipc';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/common/Pagination';
import { Search, Eye, Filter } from 'lucide-react';

export const BillingHistoryPage: React.FC = () => {
  const [sales, setSales] = useState<SaleListItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');

  // Filters
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, [pageNumber, search, paymentMethod, paymentStatus, fromDate, toDate]);

  const loadHistory = async () => {
    const res = await api.sales.getPaged({
      pageNumber,
      pageSize: 10,
      search,
      salesWorkerId: user?.userId,
      paymentMethod: paymentMethod !== 'All' ? paymentMethod : undefined,
      paymentStatus: paymentStatus !== 'All' ? paymentStatus : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined
    });
    if (res.success && res.data) {
      setSales(res.data.items);
      setTotalCount(res.data.totalCount);
      setTotalPages(res.data.totalPages || 1);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">My Billing History & Invoices ({totalCount})</div>

        {/* Filter controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="input-control"
              style={{ paddingLeft: '40px' }}
              placeholder="Search Invoice # or Customer..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPageNumber(1); }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Filter size={16} color="var(--text-dim)" />
            <select
              className="input-control"
              style={{ width: '130px' }}
              value={paymentMethod}
              onChange={e => { setPaymentMethod(e.target.value); setPageNumber(1); }}
            >
              <option value="All">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>

            <select
              className="input-control"
              style={{ width: '130px' }}
              value={paymentStatus}
              onChange={e => { setPaymentStatus(e.target.value); setPageNumber(1); }}
            >
              <option value="All">All Statuses</option>
              <option value="Success">Success</option>
              <option value="Pending">Pending</option>
            </select>

            <input
              type="date"
              className="input-control"
              style={{ width: '140px' }}
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); setPageNumber(1); }}
            />

            <input
              type="date"
              className="input-control"
              style={{ width: '140px' }}
              value={toDate}
              onChange={e => { setToDate(e.target.value); setPageNumber(1); }}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Created At</th>
                <th>Customer</th>
                <th>Payment Mode</th>
                <th>Grand Total</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                    No sales history found.
                  </td>
                </tr>
              ) : (
                sales.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.invoiceNumber}</strong></td>
                    <td>{new Date(s.createdAt).toLocaleString()}</td>
                    <td>{s.customerName || 'Walk-in Customer'}</td>
                    <td><span className="badge badge-info">{s.paymentMethod}</span></td>
                    <td><strong>₹{s.grandTotal.toFixed(2)}</strong></td>
                    <td>
                      <span className={`badge ${s.paymentStatus === 'Success' ? 'badge-success' : 'badge-warning'}`}>
                        {s.paymentStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => navigate(`/billing/invoice/${s.id}`)}>
                        <Eye size={14} />
                        <span>Print / View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
      </div>
    </div>
  );
};

export default BillingHistoryPage;
