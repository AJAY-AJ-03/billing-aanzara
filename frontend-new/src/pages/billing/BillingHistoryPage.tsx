// src/pages/billing/BillingHistoryPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/ipcApi';
import type { SaleListItemDto } from '../../../../shared/types/ipc';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/common/Pagination';
import {
  Search,
  Eye,
  Filter,
  X,
  Receipt,
  Calendar,
  Loader2,
} from 'lucide-react';
import './BillingComponents.css';

const PAGE_SIZE = 10;

const PAYMENT_METHODS = ['All', 'Cash', 'UPI', 'Card', 'Other'] as const;
const PAYMENT_STATUSES = ['All', 'Success', 'Pending'] as const;

const formatCurrency = (n: number) =>
  `₹${(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date} · ${time}`;
};

const statusBadgeClass = (status?: string) =>
  status === 'Success' ? 'admin-badge-success' : 'admin-badge-warning';

const methodBadgeClass = (method?: string) => {
  switch (method) {
    case 'UPI':
    case 'Card':
      return 'admin-badge-success';
    case 'Cash':
    default:
      return 'admin-badge-neutral';
  }
};

export const BillingHistoryPage: React.FC = () => {
  const [sales, setSales] = useState<SaleListItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  /* Filters */
  const [paymentMethod, setPaymentMethod] = useState<string>('All');
  const [paymentStatus, setPaymentStatus] = useState<string>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, search, paymentMethod, paymentStatus, fromDate, toDate]);

  const loadHistory = async () => {
    setLoading(true);
    const res = await api.sales.getPaged({
      pageNumber,
      pageSize: PAGE_SIZE,
      search,
      salesWorkerId: user?.userId,
      paymentMethod: paymentMethod !== 'All' ? paymentMethod : undefined,
      paymentStatus: paymentStatus !== 'All' ? paymentStatus : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    if (res.success && res.data) {
      setSales(res.data.items);
      setTotalCount(res.data.totalCount);
      setTotalPages(res.data.totalPages || 1);
    } else {
      setSales([]);
      setTotalCount(0);
      setTotalPages(1);
    }
    setLoading(false);
  };

  /* Active filter chips */
  const activeFilters = useMemo(() => {
    const list: { key: string; label: string; clear: () => void }[] = [];
    if (search.trim())
      list.push({
        key: 'search',
        label: `Search: "${search}"`,
        clear: () => setSearch(''),
      });
    if (paymentMethod !== 'All')
      list.push({
        key: 'method',
        label: `Method: ${paymentMethod}`,
        clear: () => setPaymentMethod('All'),
      });
    if (paymentStatus !== 'All')
      list.push({
        key: 'status',
        label: `Status: ${paymentStatus}`,
        clear: () => setPaymentStatus('All'),
      });
    if (fromDate)
      list.push({
        key: 'from',
        label: `From: ${fromDate}`,
        clear: () => setFromDate(''),
      });
    if (toDate)
      list.push({
        key: 'to',
        label: `To: ${toDate}`,
        clear: () => setToDate(''),
      });
    return list;
  }, [search, paymentMethod, paymentStatus, fromDate, toDate]);

  const clearAllFilters = () => {
    setSearch('');
    setPaymentMethod('All');
    setPaymentStatus('All');
    setFromDate('');
    setToDate('');
    setPageNumber(1);
  };

  const hasAnyFilter = activeFilters.length > 0;

  return (
    <div>
      <div className="admin-card">
        {/* Toolbar */}
        <div className="admin-toolbar">
          <div className="admin-toolbar-title">
            <h2>My Billing History &amp; Invoices</h2>
            <span>{totalCount} total</span>
          </div>
          <div className="admin-toolbar-actions">
            {hasAnyFilter && (
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={clearAllFilters}
              >
                <X size={16} />
                <span>Clear filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter row */}
        <div className="admin-filter-toolbar" style={{ marginBottom: 12 }}>
          <div className="admin-input-wrap" style={{ flex: '1 1 260px', maxWidth: 340 }}>
            <span className="admin-input-wrap-icon">
              <Search size={16} />
            </span>
            <input
              type="text"
              className="admin-input"
              placeholder="Search invoice # or customer…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageNumber(1);
              }}
            />
            {search && (
              <button
                type="button"
                className="admin-input-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <span className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={14} />
            Filters
          </span>

          <select
            className="admin-select"
            style={{ width: 140 }}
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPageNumber(1);
            }}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m === 'All' ? 'All Methods' : m}
              </option>
            ))}
          </select>

          <select
            className="admin-select"
            style={{ width: 140 }}
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPageNumber(1);
            }}
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </option>
            ))}
          </select>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--admin-border)',
              borderRadius: 8,
              background: 'var(--admin-surface)',
              padding: '0 8px',
              height: 38,
            }}
          >
            <Calendar size={14} style={{ color: 'var(--admin-text-faint)' }} />
            <input
              type="date"
              className="admin-input"
              style={{
                width: 130,
                border: 'none',
                background: 'transparent',
                padding: '6px 4px',
                boxShadow: 'none',
              }}
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPageNumber(1);
              }}
            />
            <span style={{ color: 'var(--admin-text-faint)', fontSize: 12 }}>→</span>
            <input
              type="date"
              className="admin-input"
              style={{
                width: 130,
                border: 'none',
                background: 'transparent',
                padding: '6px 4px',
                boxShadow: 'none',
              }}
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => {
                setToDate(e.target.value);
                setPageNumber(1);
              }}
            />
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="admin-chip-row">
            {activeFilters.map((f) => (
              <span key={f.key} className="admin-chip">
                {f.label}
                <button
                  type="button"
                  onClick={() => {
                    f.clear();
                    setPageNumber(1);
                  }}
                  aria-label={`Remove ${f.label}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              className="admin-chip-clear-all"
              onClick={clearAllFilters}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Table */}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date &amp; Time</th>
              <th>Customer</th>
              <th>Payment</th>
              <th className="num">Amount</th>
              <th>Status</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              sales.map((s) => (
                <tr
                  key={s.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/billing/invoice/${s.id}`)}
                >
                  <td className="admin-cell-primary">{s.invoiceNumber}</td>
                  <td style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>
                    {formatDateTime(s.createdAt)}
                  </td>
                  <td>
                    {s.customerName ? (
                      <span style={{ color: 'var(--admin-text)', fontSize: 13 }}>
                        {s.customerName}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--admin-text-faint)', fontSize: 13 }}>
                        Walk-in
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`admin-badge ${methodBadgeClass(s.paymentMethod)}`}>
                      {s.paymentMethod}
                    </span>
                  </td>
                  <td
                    className="num"
                    style={{ fontWeight: 700, color: 'var(--admin-accent)' }}
                  >
                    {formatCurrency(s.grandTotal)}
                  </td>
                  <td>
                    <span className={`admin-badge ${statusBadgeClass(s.paymentStatus)}`}>
                      {s.paymentStatus}
                    </span>
                  </td>
                  <td className="num">
                    <div className="admin-cell-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/billing/invoice/${s.id}`);
                        }}
                        title="View / Print invoice"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {loading && (
              <tr>
                <td colSpan={7}>
                  <div className="admin-state" style={{ padding: '40px 24px' }}>
                    <Loader2 size={18} className="admin-spin" />
                    <div style={{ marginTop: 8, fontSize: 13 }}>Loading history…</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!loading && sales.length === 0 && (
          <div className="admin-empty-block">
            <div className="admin-empty-icon">
              <Receipt size={20} />
            </div>
            <div className="admin-empty-title">
              {hasAnyFilter ? 'No bills match your filters' : 'No bills yet'}
            </div>
            <div className="admin-empty-desc">
              {hasAnyFilter ? (
                <>
                  Try adjusting or{' '}
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    style={{
                      color: 'var(--admin-accent)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    clearing all filters
                  </button>
                  .
                </>
              ) : (
                'Bills you create will appear here for quick lookup and reprinting.'
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

export default BillingHistoryPage;