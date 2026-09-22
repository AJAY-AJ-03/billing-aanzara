import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/ipcApi';
import type { SaleListItemDto, UserDto } from '../../../../shared/types/ipc';
import Pagination from '../../components/common/Pagination';
import { Search, Eye, Filter } from 'lucide-react';

export const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<SaleListItemDto[]>([]);
  const [workers, setWorkers] = useState<UserDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');

  // Filters
  const [salesWorkerId, setSalesWorkerId] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    loadSales();
  }, [pageNumber, search, salesWorkerId, paymentMethod, paymentStatus, fromDate, toDate]);

  const loadWorkers = async () => {
    const res = await api.users.getPaged({ pageNumber: 1, pageSize: 100 });
    if (res.success && res.data) {
      setWorkers(res.data.items);
    }
  };

  const loadSales = async () => {
    const res = await api.sales.getPaged({
      pageNumber,
      pageSize: 10,
      search,
      salesWorkerId: salesWorkerId > 0 ? salesWorkerId : undefined,
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
        <div className="card-title">
          <span>Sales & Invoices History ({totalCount})</span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="input-control"
              style={{ paddingLeft: '40px' }}
              placeholder="Search Invoice #, Customer..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPageNumber(1); }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <Filter size={16} color="var(--text-dim)" />

            {/* Sales Worker Filter */}
            <select
              className="input-control"
              style={{ width: '150px' }}
              value={salesWorkerId}
              onChange={e => { setSalesWorkerId(Number(e.target.value)); setPageNumber(1); }}
            >
              <option value={0}>All Workers</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

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
                <th>Invoice #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Sales Worker</th>
                <th>Payment Method</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                    No sales records match the selected filters.
                  </td>
                </tr>
              ) : (
                sales.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.invoiceNumber}</strong></td>
                    <td>{new Date(s.createdAt).toLocaleString()}</td>
                    <td>{s.customerName || 'Walk-in Customer'}</td>
                    <td>{s.salesWorkerName || 'System'}</td>
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
                        <span>View Invoice</span>
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

export default SalesPage;
