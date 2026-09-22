// src/pages/admin/SalesPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/ipcApi';
import type { SaleListItemDto, UserDto } from '../../../../shared/types/ipc';
import Pagination from '../../components/common/Pagination';
import { Search, X, Eye, Filter, ChevronDown, ReceiptText } from 'lucide-react';

const PAGE_SIZE = 10;

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<SaleListItemDto[]>([]);
  const [workers, setWorkers] = useState<UserDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    if (res.success && res.data) setWorkers(res.data.items);
  };

  const loadSales = async () => {
    setLoading(true);
    const res = await api.sales.getPaged({
      pageNumber,
      pageSize: PAGE_SIZE,
      search,
      salesWorkerId: salesWorkerId > 0 ? salesWorkerId : undefined,
      paymentMethod: paymentMethod !== 'All' ? paymentMethod : undefined,
      paymentStatus: paymentStatus !== 'All' ? paymentStatus : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    if (res.success && res.data) {
      setSales(res.data.items);
      setTotalCount(res.data.totalCount);
      setTotalPages(res.data.totalPages || 1);
    }
    setLoading(false);
  };

  const resetPage = () => setPageNumber(1);

  const clearAllFilters = () => {
    setSalesWorkerId(0);
    setPaymentMethod('All');
    setPaymentStatus('All');
    setFromDate('');
    setToDate('');
    resetPage();
  };

  const workerName = (id: number) => workers.find((w) => w.id === id)?.name || '';

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (salesWorkerId > 0) {
      chips.push({ key: 'worker', label: `Worker: ${workerName(salesWorkerId)}`, onRemove: () => { setSalesWorkerId(0); resetPage(); } });
    }
    if (paymentMethod !== 'All') {
      chips.push({ key: 'method', label: `Method: ${paymentMethod}`, onRemove: () => { setPaymentMethod('All'); resetPage(); } });
    }
    if (paymentStatus !== 'All') {
      chips.push({ key: 'status', label: `Status: ${paymentStatus}`, onRemove: () => { setPaymentStatus('All'); resetPage(); } });
    }
    if (fromDate) {
      chips.push({ key: 'from', label: `From ${fromDate}`, onRemove: () => { setFromDate(''); resetPage(); } });
    }
    if (toDate) {
      chips.push({ key: 'to', label: `To ${toDate}`, onRemove: () => { setToDate(''); resetPage(); } });
    }
    return chips;
  }, [salesWorkerId, paymentMethod, paymentStatus, fromDate, toDate, workers]);

  const pageTotal = sales.reduce((sum, s) => sum + s.grandTotal, 0);

  return (
    <div>
      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-toolbar-title">
            <h2>Sales &amp; Invoices</h2>
            <span>{totalCount} total</span>
          </div>
        </div>

        {sales.length > 0 && (
          <div className="admin-stat-row">
            <div className="admin-stat-chip">
              <div className="admin-stat-chip-label">Results Matching Filters</div>
              <div className="admin-stat-chip-value">{totalCount.toLocaleString('en-IN')}</div>
            </div>
            <div className="admin-stat-chip">
              <div className="admin-stat-chip-label">This Page's Total</div>
              <div className="admin-stat-chip-value is-accent">{formatCurrency(pageTotal)}</div>
            </div>
          </div>
        )}

        <div className="admin-filter-toolbar">
          <div className="admin-input-wrap">
            <span className="admin-input-wrap-icon"><Search size={16} /></span>
            <input
              type="text"
              className="admin-input"
              placeholder="Search invoice # or customer…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            />
            {search && (
              <button type="button" className="admin-input-clear" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Filter size={15} />
            <span>Filters</span>
            {activeChips.length > 0 && <span className="admin-filter-toggle-count">{activeChips.length}</span>}
            <ChevronDown size={14} style={{ transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
        </div>

        {!filtersOpen && activeChips.length > 0 && (
          <div className="admin-chip-row">
            {activeChips.map((chip) => (
              <span className="admin-chip" key={chip.key}>
                {chip.label}
                <button type="button" onClick={chip.onRemove} aria-label={`Remove ${chip.label}`}>
                  <X size={11} />
                </button>
              </span>
            ))}
            <button type="button" className="admin-chip-clear-all" onClick={clearAllFilters}>
              Clear all
            </button>
          </div>
        )}

        {filtersOpen && (
          <div className="admin-filter-panel">
            <div className="admin-field">
              <label className="admin-label">Sales Worker</label>
              <select
                className="admin-select"
                value={salesWorkerId}
                onChange={(e) => { setSalesWorkerId(Number(e.target.value)); resetPage(); }}
              >
                <option value={0}>All Workers</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label">Payment Method</label>
              <select
                className="admin-select"
                value={paymentMethod}
                onChange={(e) => { setPaymentMethod(e.target.value); resetPage(); }}
              >
                <option value="All">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label">Payment Status</label>
              <select
                className="admin-select"
                value={paymentStatus}
                onChange={(e) => { setPaymentStatus(e.target.value); resetPage(); }}
              >
                <option value="All">All Statuses</option>
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label">From Date</label>
              <input
                type="date"
                className="admin-input"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); resetPage(); }}
              />
            </div>

            <div className="admin-field">
              <label className="admin-label">To Date</label>
              <input
                type="date"
                className="admin-input"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); resetPage(); }}
              />
            </div>

            <div className="admin-filter-panel-footer">
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={clearAllFilters}>
                Clear all filters
              </button>
            </div>
          </div>
        )}

        <table className="admin-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Sales Worker</th>
              <th>Method</th>
              <th className="num">Total</th>
              <th>Status</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="admin-cell-primary">{s.invoiceNumber}</div>
                  <div className="admin-cell-secondary">
                    {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {new Date(s.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td style={{ fontSize: '13px', color: 'var(--admin-text)' }}>
                  {s.customerName || <span style={{ color: 'var(--admin-text-faint)' }}>Walk-in Customer</span>}
                </td>
                <td style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>{s.salesWorkerName || 'System'}</td>
                <td><span className="admin-badge admin-badge-neutral">{s.paymentMethod}</span></td>
                <td className="num" style={{ fontWeight: 700 }}>{formatCurrency(s.grandTotal)}</td>
                <td>
                  <span className={`admin-badge ${s.paymentStatus === 'Success' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                    {s.paymentStatus}
                  </span>
                </td>
                <td>
                  <div className="admin-cell-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary admin-btn-sm"
                      onClick={() => navigate(`/billing/invoice/${s.id}`)}
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && sales.length === 0 && (
          <div className="admin-empty-block">
            <div className="admin-empty-icon"><ReceiptText size={20} /></div>
            <div className="admin-empty-title">
              {activeChips.length > 0 || search ? 'No sales match your filters' : 'No sales recorded yet'}
            </div>
            <div className="admin-empty-desc">
              {(activeChips.length > 0 || search) && (
                <button
                  type="button"
                  onClick={() => { clearAllFilters(); setSearch(''); }}
                  style={{ color: 'var(--admin-accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                >
                  Clear search and filters
                </button>
              )}
            </div>
          </div>
        )}

        <Pagination
          pageNumber={pageNumber}
          totalPages={totalPages}
          onPageChange={setPageNumber}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
};

export default SalesPage;