// src/pages/admin/StockPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/ipcApi';
import type { ProductDto, StockTransactionDto, LowStockDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/common/Pagination';
import {
  Boxes,
  PlusCircle,
  RefreshCw,
  Download,
  AlertTriangle,
  Search,
  Loader2,
  PackageX,
  History,
  ArrowRight,
} from 'lucide-react';

type Tab = 'stockIn' | 'adjust' | 'history' | 'alerts';
type AdjustType = 'Adjustment' | 'Damaged' | 'Expired' | 'Return';

const PAGE_SIZE = 10;

export const StockPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('stockIn');
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [transactions, setTransactions] = useState<StockTransactionDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lowStock, setLowStock] = useState<LowStockDto[]>([]);
  const [outOfStock, setOutOfStock] = useState<LowStockDto[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);

  const [stockInFilter, setStockInFilter] = useState('');
  const [adjustFilter, setAdjustFilter] = useState('');
  const [stockInSaving, setStockInSaving] = useState(false);
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [stockInForm, setStockInForm] = useState({ productId: 0, quantity: 1, reference: '', remarks: '' });
  const [adjustForm, setAdjustForm] = useState<{
    productId: number;
    transactionType: AdjustType;
    quantity: number;
    remarks: string;
  }>({
    productId: 0,
    transactionType: 'Adjustment',
    quantity: 1,
    remarks: '',
  });

  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    loadProducts();
    loadAlerts();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, pageNumber]);

  const loadProducts = async () => {
    const res = await api.products.getPaged({ pageNumber: 1, pageSize: 1000 });
    if (res.success && res.data) {
      setProducts(res.data.items);
      if (res.data.items.length > 0) {
        setStockInForm((prev) => ({ ...prev, productId: prev.productId || res.data!.items[0].id }));
        setAdjustForm((prev) => ({ ...prev, productId: prev.productId || res.data!.items[0].id }));
      }
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const res = await api.stock.getTransactions(0, { pageNumber, pageSize: PAGE_SIZE });
    if (res.success && res.data) {
      setTransactions(res.data.items);
      setTotalPages(res.data.totalPages || 1);
    }
    setHistoryLoading(false);
  };

  const loadAlerts = async () => {
    setAlertsLoading(true);
    const [lowRes, outRes] = await Promise.all([api.stock.getLowStock(), api.stock.getOutOfStock()]);
    if (lowRes.success && lowRes.data) setLowStock(lowRes.data);
    if (outRes.success && outRes.data) setOutOfStock(outRes.data);
    setAlertsLoading(false);
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockInSaving(true);
    try {
      const res = await api.stock.stockIn(stockInForm, user?.userId);
      if (res.success) {
        showToast('Stock added', 'success');
        setStockInForm((prev) => ({ ...prev, quantity: 1, reference: '', remarks: '' }));
        loadProducts();
        loadAlerts();
      } else {
        showToast(res.message || 'Stock addition failed', 'error');
      }
    } finally {
      setStockInSaving(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustSaving(true);
    try {
      const res = await api.stock.adjust(adjustForm, user?.userId);
      if (res.success) {
        showToast('Stock adjusted', 'success');
        setAdjustForm((prev) => ({ ...prev, quantity: 1, remarks: '' }));
        loadProducts();
        loadAlerts();
      } else {
        showToast(res.message || 'Adjustment failed', 'error');
      }
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleExport = async () => {
    const res = await api.stock.export();
    if (res.success && res.data) {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.data}`;
      link.download = `StockReport_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      showToast('Stock report exported', 'success');
    }
  };

  const filterProducts = (list: ProductDto[], q: string) => {
    if (!q.trim()) return list;
    const lower = q.toLowerCase();
    return list.filter((p) => p.productName.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower));
  };

  const stockInOptions = useMemo(() => filterProducts(products, stockInFilter), [products, stockInFilter]);
  const adjustOptions = useMemo(() => filterProducts(products, adjustFilter), [products, adjustFilter]);

  const stockInProduct = products.find((p) => p.id === stockInForm.productId);
  const adjustProduct = products.find((p) => p.id === adjustForm.productId);

  const stockInNewTotal = stockInProduct ? stockInProduct.stockQuantity + (stockInForm.quantity || 0) : null;

  const adjustPreview = (() => {
    if (!adjustProduct) return null;
    const qty = adjustForm.quantity || 0;
    switch (adjustForm.transactionType) {
      case 'Adjustment':
        return adjustProduct.stockQuantity + qty;
      case 'Return':
        return adjustProduct.stockQuantity + Math.abs(qty);
      case 'Damaged':
      case 'Expired':
        return adjustProduct.stockQuantity - Math.abs(qty);
    }
  })();

  const adjustHint: Record<AdjustType, string> = {
    Adjustment: 'Positive increases stock, negative decreases it.',
    Damaged: 'Quantity entered will be subtracted from stock.',
    Expired: 'Quantity entered will be subtracted from stock.',
    Return: 'Quantity entered will be added back to stock.',
  };

  const goRestock = (productId: number) => {
    setActiveTab('stockIn');
    setStockInFilter('');
    setStockInForm((prev) => ({ ...prev, productId }));
  };

  const alertTotal = lowStock.length + outOfStock.length;

  return (
    <div>
      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-toolbar-title">
            <h2>Stock &amp; Inventory</h2>
          </div>
          <div className="admin-toolbar-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={handleExport}>
              <Download size={16} />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        <div className="admin-tabs is-block">
          <button type="button" className={`admin-tab ${activeTab === 'stockIn' ? 'is-active' : ''}`} onClick={() => setActiveTab('stockIn')}>
            <PlusCircle size={15} />
            <span>Stock In</span>
          </button>
          <button type="button" className={`admin-tab ${activeTab === 'adjust' ? 'is-active' : ''}`} onClick={() => setActiveTab('adjust')}>
            <RefreshCw size={15} />
            <span>Adjustment</span>
          </button>
          <button type="button" className={`admin-tab ${activeTab === 'history' ? 'is-active' : ''}`} onClick={() => setActiveTab('history')}>
            <History size={15} />
            <span>Ledger</span>
          </button>
          <button type="button" className={`admin-tab ${activeTab === 'alerts' ? 'is-active' : ''}`} onClick={() => setActiveTab('alerts')}>
            <AlertTriangle size={15} />
            <span>Alerts</span>
            <span className={`admin-tab-count ${alertTotal > 0 ? 'has-alert' : ''}`}>{alertTotal}</span>
          </button>
        </div>

        {activeTab === 'stockIn' && (
          <div className="admin-stock-grid">
            <form onSubmit={handleStockInSubmit}>
              <div className="admin-field">
                <label className="admin-label">Product</label>
                <div className="admin-input-wrap" style={{ marginBottom: '8px' }}>
                  <span className="admin-input-wrap-icon"><Search size={15} /></span>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Type to filter products…"
                    value={stockInFilter}
                    onChange={(e) => setStockInFilter(e.target.value)}
                  />
                </div>
                <select
                  className="admin-select"
                  value={stockInForm.productId}
                  onChange={(e) => setStockInForm({ ...stockInForm, productId: Number(e.target.value) })}
                >
                  {stockInOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field" style={{ marginTop: '16px' }}>
                <label className="admin-label">Quantity to Add</label>
                <div className="admin-qty-input">
                  <input
                    type="number"
                    className="admin-input"
                    min="0.001"
                    step="any"
                    value={stockInForm.quantity}
                    onChange={(e) => setStockInForm({ ...stockInForm, quantity: Number(e.target.value) })}
                    required
                  />
                  {stockInProduct && <span className="admin-qty-unit">{stockInProduct.unit}</span>}
                </div>
              </div>

              <div className="admin-field" style={{ marginTop: '16px' }}>
                <label className="admin-label">PO / Invoice Reference <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. PO-9812"
                  value={stockInForm.reference}
                  onChange={(e) => setStockInForm({ ...stockInForm, reference: e.target.value })}
                  style={{ maxWidth: '340px' }}
                />
              </div>
              <div className="admin-field" style={{ marginTop: '16px' }}>
                <label className="admin-label">Remarks <span className="optional">(optional)</span></label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  placeholder="Any notes about this delivery"
                  value={stockInForm.remarks}
                  onChange={(e) => setStockInForm({ ...stockInForm, remarks: e.target.value })}
                  style={{ maxWidth: '340px' }}
                />
              </div>
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                style={{ marginTop: '18px' }}
                disabled={stockInSaving || !stockInProduct}
              >
                {stockInSaving && <Loader2 size={15} className="admin-spin" />}
                {stockInSaving ? 'Adding…' : 'Confirm Stock Addition'}
              </button>
            </form>

            <div className="admin-product-summary">
              {!stockInProduct ? (
                <div className="admin-product-summary-empty">Select a product to see its stock summary.</div>
              ) : (
                <>
                  <div className="admin-product-summary-name">{stockInProduct.productName}</div>
                  <div className="admin-product-summary-meta">{stockInProduct.sku} · {stockInProduct.categoryName}</div>
                  <div className="admin-summary-row">
                    <span className="admin-summary-label">Current Stock</span>
                    <span className="admin-summary-value">{stockInProduct.stockQuantity} {stockInProduct.unit}</span>
                  </div>
                  <div className="admin-summary-row">
                    <span className="admin-summary-label">After This Entry</span>
                    <span className="admin-summary-value is-accent">
                      {stockInNewTotal} {stockInProduct.unit}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'adjust' && (
          <div className="admin-stock-grid">
            <form onSubmit={handleAdjustSubmit}>
              <div className="admin-field">
                <label className="admin-label">Product</label>
                <div className="admin-input-wrap" style={{ marginBottom: '8px' }}>
                  <span className="admin-input-wrap-icon"><Search size={15} /></span>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Type to filter products…"
                    value={adjustFilter}
                    onChange={(e) => setAdjustFilter(e.target.value)}
                  />
                </div>
                <select
                  className="admin-select"
                  value={adjustForm.productId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, productId: Number(e.target.value) })}
                >
                  {adjustOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field" style={{ marginTop: '16px', maxWidth: '340px' }}>
                <label className="admin-label">Reason</label>
                <select
                  className="admin-select"
                  value={adjustForm.transactionType}
                  onChange={(e) => setAdjustForm({ ...adjustForm, transactionType: e.target.value as AdjustType })}
                >
                  <option value="Adjustment">Adjustment (+/- quantity)</option>
                  <option value="Damaged">Damaged goods</option>
                  <option value="Expired">Expired stock</option>
                  <option value="Return">Customer return</option>
                </select>
                <span className="admin-form-hint">{adjustHint[adjustForm.transactionType]}</span>
              </div>

              <div className="admin-field" style={{ marginTop: '16px' }}>
                <label className="admin-label">Quantity</label>
                <div className="admin-qty-input">
                  <input
                    type="number"
                    className="admin-input"
                    step="any"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                    required
                  />
                  {adjustProduct && <span className="admin-qty-unit">{adjustProduct.unit}</span>}
                </div>
              </div>

              <div className="admin-field" style={{ marginTop: '16px' }}>
                <label className="admin-label">Remarks</label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  placeholder="Details regarding this stock discrepancy"
                  value={adjustForm.remarks}
                  onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                  required
                  style={{ maxWidth: '340px' }}
                />
              </div>
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                style={{ marginTop: '18px' }}
                disabled={adjustSaving || !adjustProduct}
              >
                {adjustSaving && <Loader2 size={15} className="admin-spin" />}
                {adjustSaving ? 'Applying…' : 'Apply Stock Adjustment'}
              </button>
            </form>

            <div className="admin-product-summary">
              {!adjustProduct ? (
                <div className="admin-product-summary-empty">Select a product to see its stock summary.</div>
              ) : (
                <>
                  <div className="admin-product-summary-name">{adjustProduct.productName}</div>
                  <div className="admin-product-summary-meta">{adjustProduct.sku} · {adjustProduct.categoryName}</div>
                  <div className="admin-summary-row">
                    <span className="admin-summary-label">Current Stock</span>
                    <span className="admin-summary-value">{adjustProduct.stockQuantity} {adjustProduct.unit}</span>
                  </div>
                  <div className="admin-summary-row">
                    <span className="admin-summary-label">After This Entry</span>
                    <span className={`admin-summary-value ${adjustPreview !== null && adjustPreview < 0 ? 'is-danger' : 'is-accent'}`}>
                      {adjustPreview} {adjustProduct.unit}
                    </span>
                  </div>
                  {adjustPreview !== null && adjustPreview < 0 && (
                    <div className="admin-summary-note">This would take stock negative</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th className="num">Prev</th>
                  <th className="num">Change</th>
                  <th className="num">New</th>
                  <th>Reference / Remarks</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontSize: '12.5px', color: 'var(--admin-text-muted)' }}>
                      {new Date(tx.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="admin-cell-primary">{tx.productName}</td>
                    <td>
                      <span className={`admin-badge ${tx.quantity > 0 ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="num" style={{ color: 'var(--admin-text-muted)' }}>{tx.previousStock}</td>
                    <td className="num" style={{ fontWeight: 700, color: tx.quantity > 0 ? 'var(--admin-accent)' : 'var(--admin-danger)' }}>
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>{tx.newStock}</td>
                    <td style={{ fontSize: '12.5px', color: 'var(--admin-text-muted)' }}>{tx.reference || tx.remarks || '—'}</td>
                    <td style={{ fontSize: '12.5px', color: 'var(--admin-text-muted)' }}>{tx.createdByName || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!historyLoading && transactions.length === 0 && (
              <div className="admin-empty-block">
                <div className="admin-empty-icon"><History size={20} /></div>
                <div className="admin-empty-title">No stock movements yet</div>
                <div className="admin-empty-desc">Stock-ins and adjustments will show up here.</div>
              </div>
            )}

            <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="admin-grid-2">
            <div className="admin-subcard">
              <div className="admin-subcard-header">
                <AlertTriangle size={15} style={{ color: 'var(--admin-danger)' }} />
                <span className="admin-subcard-title danger">Out of Stock ({outOfStock.length})</span>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th className="num">Stock</th>
                    <th className="num">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {outOfStock.map((p) => (
                    <tr key={p.id}>
                      <td className="admin-cell-primary">{p.productName}</td>
                      <td style={{ fontSize: '12.5px', color: 'var(--admin-text-muted)' }}>{p.sku}</td>
                      <td className="num"><span className="admin-badge admin-badge-danger">{p.stockQuantity} {p.unit}</span></td>
                      <td className="num">
                        <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => goRestock(p.id)}>
                          Restock <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!alertsLoading && outOfStock.length === 0 && (
                <div className="admin-empty-block">
                  <div className="admin-empty-icon"><PackageX size={18} /></div>
                  <div className="admin-empty-desc">Nothing out of stock right now.</div>
                </div>
              )}
            </div>

            <div className="admin-subcard">
              <div className="admin-subcard-header">
                <AlertTriangle size={15} style={{ color: '#9a6b1f' }} />
                <span className="admin-subcard-title warning">Low Stock ({lowStock.length})</span>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Stock / Min</th>
                    <th className="num">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((p) => (
                    <tr key={p.id}>
                      <td className="admin-cell-primary">{p.productName}</td>
                      <td className="num">
                        <span className="admin-badge admin-badge-warning">{p.stockQuantity} / {p.minimumStockLevel} {p.unit}</span>
                      </td>
                      <td className="num">
                        <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => goRestock(p.id)}>
                          Restock <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!alertsLoading && lowStock.length === 0 && (
                <div className="admin-empty-block">
                  <div className="admin-empty-icon"><Boxes size={18} /></div>
                  <div className="admin-empty-desc">All stock levels look healthy.</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockPage;