import React, { useEffect, useState } from 'react';
import api from '../../services/ipcApi';
import type { ProductDto, StockTransactionDto, LowStockDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/common/Pagination';
import { Boxes, PlusCircle, RefreshCw, Download, AlertTriangle } from 'lucide-react';

export const StockPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stockIn' | 'adjust' | 'history' | 'alerts'>('stockIn');
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [transactions, setTransactions] = useState<StockTransactionDto[]>([]);
  const [lowStock, setLowStock] = useState<LowStockDto[]>([]);
  const [outOfStock, setOutOfStock] = useState<LowStockDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);

  // Form states
  const [stockInForm, setStockInForm] = useState({ productId: 0, quantity: 1, reference: '', remarks: '' });
  const [adjustForm, setAdjustForm] = useState<{ productId: number; transactionType: 'Adjustment' | 'Damaged' | 'Expired' | 'Return'; quantity: number; remarks: string }>({
    productId: 0,
    transactionType: 'Adjustment',
    quantity: 1,
    remarks: ''
  });

  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    loadProducts();
    loadAlerts();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, pageNumber]);

  const loadProducts = async () => {
    const res = await api.products.getPaged({ pageNumber: 1, pageSize: 1000 });
    if (res.success && res.data) {
      setProducts(res.data.items);
      if (res.data.items.length > 0) {
        setStockInForm(prev => ({ ...prev, productId: res.data!.items[0].id }));
        setAdjustForm(prev => ({ ...prev, productId: res.data!.items[0].id }));
      }
    }
  };

  const loadHistory = async () => {
    const res = await api.stock.getTransactions(0, { pageNumber, pageSize: 10 });
    if (res.success && res.data) {
      setTransactions(res.data.items);
      setTotalPages(res.data.totalPages || 1);
    }
  };

  const loadAlerts = async () => {
    const [lowRes, outRes] = await Promise.all([
      api.stock.getLowStock(),
      api.stock.getOutOfStock()
    ]);
    if (lowRes.success && lowRes.data) setLowStock(lowRes.data);
    if (outRes.success && outRes.data) setOutOfStock(outRes.data);
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.stock.stockIn(stockInForm, user?.userId);
    if (res.success) {
      showToast('Stock added successfully', 'success');
      setStockInForm({ ...stockInForm, quantity: 1, reference: '', remarks: '' });
      loadProducts();
      loadAlerts();
    } else {
      showToast(res.message || 'Stock addition failed', 'error');
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.stock.adjust(adjustForm, user?.userId);
    if (res.success) {
      showToast('Stock adjusted successfully', 'success');
      setAdjustForm({ ...adjustForm, quantity: 1, remarks: '' });
      loadProducts();
      loadAlerts();
    } else {
      showToast(res.message || 'Adjustment failed', 'error');
    }
  };

  const handleExport = async () => {
    const res = await api.stock.export();
    if (res.success && res.data) {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.data}`;
      link.download = `StockReport_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      showToast('Stock report exported to Excel', 'success');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <span>Stock & Inventory Management</span>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} />
            <span>Export Stock Excel</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--bg-card-border)', paddingBottom: '12px', marginBottom: '24px' }}>
          <button className={`btn ${activeTab === 'stockIn' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('stockIn')}>
            <PlusCircle size={16} />
            <span>Stock In Entry</span>
          </button>
          <button className={`btn ${activeTab === 'adjust' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('adjust')}>
            <RefreshCw size={16} />
            <span>Stock Adjustment</span>
          </button>
          <button className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('history')}>
            <Boxes size={16} />
            <span>Transaction Ledger</span>
          </button>
          <button className={`btn ${activeTab === 'alerts' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('alerts')}>
            <AlertTriangle size={16} />
            <span>Low Stock Alerts ({lowStock.length + outOfStock.length})</span>
          </button>
        </div>

        {activeTab === 'stockIn' && (
          <form onSubmit={handleStockInSubmit} style={{ maxWidth: '500px' }}>
            <div className="form-group">
              <label className="form-label">Select Product</label>
              <select
                className="select-control"
                value={stockInForm.productId}
                onChange={e => setStockInForm({ ...stockInForm, productId: Number(e.target.value) })}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.productName} ({p.sku}) — Available: {p.stockQuantity} {p.unit}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity to Add</label>
              <input
                type="number"
                className="input-control"
                min="0.001"
                step="any"
                value={stockInForm.quantity}
                onChange={e => setStockInForm({ ...stockInForm, quantity: Number(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">PO / Invoice Reference</label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. PO-9812"
                value={stockInForm.reference}
                onChange={e => setStockInForm({ ...stockInForm, reference: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <textarea
                className="input-control"
                rows={3}
                placeholder="Optional notes"
                value={stockInForm.remarks}
                onChange={e => setStockInForm({ ...stockInForm, remarks: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '12px' }}>
              Confirm Stock Addition
            </button>
          </form>
        )}

        {activeTab === 'adjust' && (
          <form onSubmit={handleAdjustSubmit} style={{ maxWidth: '500px' }}>
            <div className="form-group">
              <label className="form-label">Select Product</label>
              <select
                className="select-control"
                value={adjustForm.productId}
                onChange={e => setAdjustForm({ ...adjustForm, productId: Number(e.target.value) })}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.productName} ({p.sku}) — Available: {p.stockQuantity} {p.unit}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Adjustment Reason</label>
              <select
                className="select-control"
                value={adjustForm.transactionType}
                onChange={e => setAdjustForm({ ...adjustForm, transactionType: e.target.value as any })}
              >
                <option value="Adjustment">Adjustment (+/- Quantity)</option>
                <option value="Damaged">Damaged Goods (Deduct Stock)</option>
                <option value="Expired">Expired Stock (Deduct Stock)</option>
                <option value="Return">Customer Return (Add Stock)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                className="input-control"
                step="any"
                value={adjustForm.quantity}
                onChange={e => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Adjustment Remarks</label>
              <textarea
                className="input-control"
                rows={3}
                placeholder="Details regarding stock discrepancy"
                value={adjustForm.remarks}
                onChange={e => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-warning" style={{ width: '100%', marginTop: '12px', color: '#000', fontWeight: 700 }}>
              Apply Stock Adjustment
            </button>
          </form>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Prev Stock</th>
                    <th>Qty Change</th>
                    <th>New Stock</th>
                    <th>Reference / Remarks</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.createdAt).toLocaleString()}</td>
                      <td><strong>{tx.productName}</strong></td>
                      <td>
                        <span className={`badge ${tx.quantity > 0 ? 'badge-success' : 'badge-danger'}`}>
                          {tx.transactionType}
                        </span>
                      </td>
                      <td>{tx.previousStock}</td>
                      <td style={{ fontWeight: 700, color: tx.quantity > 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </td>
                      <td><strong>{tx.newStock}</strong></td>
                      <td>{tx.reference || tx.remarks || '—'}</td>
                      <td>{tx.createdByName || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
          </div>
        )}

        {activeTab === 'alerts' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h4 style={{ color: 'var(--accent-danger)', marginBottom: '12px' }}>Out of Stock ({outOfStock.length})</h4>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outOfStock.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.productName}</strong></td>
                        <td>{p.sku}</td>
                        <td><span className="badge badge-danger">{p.stockQuantity} {p.unit}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 style={{ color: 'var(--accent-warning)', marginBottom: '12px' }}>Low Stock Warning ({lowStock.length})</h4>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Stock / Min Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.productName}</strong></td>
                        <td>
                          <span className="badge badge-warning">
                            {p.stockQuantity} / min {p.minimumStockLevel} {p.unit}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockPage;
