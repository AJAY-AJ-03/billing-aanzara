import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/ipcApi';
import type { SaleListItemDto } from '../../../../shared/types/ipc';
import Pagination from '../../components/common/Pagination';
import { Search, Eye } from 'lucide-react';

export const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<SaleListItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSales();
  }, [pageNumber, search]);

  const loadSales = async () => {
    const res = await api.sales.getPaged({ pageNumber, pageSize: 10, search });
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

        <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '360px' }}>
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
              {sales.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.invoiceNumber}</strong></td>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                  <td>{s.customerName || 'Walk-in Customer'}</td>
                  <td>{s.salesWorkerName || 'Admin'}</td>
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
              ))}
            </tbody>
          </table>
        </div>

        <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
      </div>
    </div>
  );
};

export default SalesPage;
