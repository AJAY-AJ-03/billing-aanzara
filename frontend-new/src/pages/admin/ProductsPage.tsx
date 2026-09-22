// src/pages/admin/ProductsPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/ipcApi';
import type { ProductDto, CategoryDto, CreateProductDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import {
  Plus,
  Search,
  X,
  Download,
  Upload,
  Edit2,
  ToggleLeft,
  ToggleRight,
  PackageSearch,
  Loader2,
} from 'lucide-react';

const UNITS = ['Piece', 'Kg', 'Gram', 'Liter', 'ML', 'Box', 'Pack', 'Dozen'];
const GST_RATES = [0, 5, 12, 18, 28];
const PAGE_SIZE = 8;

const emptyForm = (defaultCategoryId: number): CreateProductDto => ({
  sku: `SKU-${Date.now().toString().slice(-5)}`,
  barcode: '',
  productName: '',
  categoryId: defaultCategoryId,
  description: '',
  purchasePrice: 0,
  sellingPrice: 0,
  gstPercentage: 5,
  stockQuantity: 10,
  minimumStockLevel: 5,
  unit: 'Piece',
});

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateProductDto>(emptyForm(0));

  // Deactivate confirmation
  const [deactivateTarget, setDeactivateTarget] = useState<ProductDto | null>(null);

  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [pageNumber, search]);

  const loadCategories = async () => {
    const res = await api.categories.getAllActive();
    if (res.success && res.data) {
      setCategories(res.data);
      if (res.data.length > 0) {
        setFormData((prev) => ({ ...prev, categoryId: res.data![0].id }));
      }
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    const res = await api.products.getPaged({ pageNumber, pageSize: PAGE_SIZE, search });
    if (res.success && res.data) {
      setProducts(res.data.items);
      setTotalCount(res.data.totalCount);
      setTotalPages(res.data.totalPages || 1);
    }
    setLoading(false);
  };

  const handleOpenModal = (p?: ProductDto) => {
    if (p) {
      setEditingId(p.id);
      setFormData({
        sku: p.sku,
        barcode: p.barcode || '',
        productName: p.productName,
        categoryId: p.categoryId,
        description: p.description || '',
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        gstPercentage: p.gstPercentage,
        stockQuantity: p.stockQuantity,
        minimumStockLevel: p.minimumStockLevel,
        unit: p.unit,
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm(categories[0]?.id || 1));
    }
    setModalOpen(true);
  };

  const marginPct =
    formData.sellingPrice > 0 && formData.purchasePrice > 0
      ? (((formData.sellingPrice - formData.purchasePrice) / formData.sellingPrice) * 100).toFixed(1)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const res = await api.products.update(editingId, {
          productName: formData.productName,
          categoryId: formData.categoryId,
          description: formData.description,
          purchasePrice: formData.purchasePrice,
          sellingPrice: formData.sellingPrice,
          gstPercentage: formData.gstPercentage,
          minimumStockLevel: formData.minimumStockLevel || 5,
          unit: formData.unit || 'Piece',
          isActive: true,
          barcode: formData.barcode,
        });
        if (res.success) {
          showToast('Product updated', 'success');
          setModalOpen(false);
          loadProducts();
        } else {
          showToast(res.message || 'Update failed', 'error');
        }
      } else {
        const res = await api.products.create(formData);
        if (res.success) {
          showToast('Product created', 'success');
          setModalOpen(false);
          loadProducts();
        } else {
          showToast(res.message || 'Creation failed', 'error');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (p: ProductDto) => {
    if (p.isActive) {
      setDeactivateTarget(p);
      return;
    }
    const res = await api.products.toggle(p.id);
    if (res.success) {
      showToast(`${p.productName} reactivated`, 'success');
      loadProducts();
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const res = await api.products.toggle(deactivateTarget.id);
    if (res.success) {
      showToast(`${deactivateTarget.productName} deactivated`, 'info');
      loadProducts();
    }
    setDeactivateTarget(null);
  };

  const handleExport = async () => {
    const res = await api.products.export();
    if (res.success && res.data) {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.data}`;
      link.download = `Products_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      showToast('Product list exported', 'success');
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Str = (event.target?.result as string)?.split(',')[1];
      if (!base64Str) {
        showToast('Failed to read file data', 'error');
        return;
      }
      setImporting(true);
      const res = await api.products.import(base64Str);
      setImporting(false);
      if (res.success && res.data) {
        showToast(`Imported ${res.data.importedCount} product(s)`, 'success');
        if (res.data.errors && res.data.errors.length > 0) {
          showToast(`${res.data.errors.length} row(s) had warnings`, 'warning');
        }
        loadProducts();
      } else {
        showToast(res.message || 'Import failed', 'error');
      }
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const stockBadge = (p: ProductDto) => {
    if (p.stockQuantity <= 0) return 'admin-badge-danger';
    if (p.stockQuantity <= p.minimumStockLevel) return 'admin-badge-warning';
    return 'admin-badge-success';
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls"
        onChange={handleFileImport}
        style={{ display: 'none' }}
      />

      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-toolbar-title">
            <h2>Products</h2>
            <span>{totalCount} total</span>
          </div>
          <div className="admin-toolbar-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={handleImportClick} disabled={importing}>
              {importing ? <Loader2 size={16} className="admin-spin" /> : <Upload size={16} />}
              <span>{importing ? 'Importing…' : 'Import'}</span>
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={handleExport}>
              <Download size={16} />
              <span>Export</span>
            </button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={16} />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        <div className="admin-input-wrap" style={{ maxWidth: '360px', marginBottom: '18px' }}>
          <span className="admin-input-wrap-icon">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="admin-input"
            placeholder="Search by name, SKU, or barcode…"
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

        <table className="admin-table">
          <thead>
            <tr>
              <th>SKU / Barcode</th>
              <th>Product</th>
              <th>Category</th>
              <th className="num">Buy / Sell</th>
              <th className="num">GST</th>
              <th>Stock</th>
              <th>Status</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="admin-cell-primary">{p.sku}</div>
                  <div className="admin-cell-secondary">{p.barcode || 'No barcode'}</div>
                </td>
                <td className="admin-cell-primary">{p.productName}</td>
                <td style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>{p.categoryName}</td>
                <td className="num">
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-faint)' }}>₹{p.purchasePrice.toFixed(2)}</div>
                  <div style={{ fontWeight: 700, color: 'var(--admin-text)' }}>₹{p.sellingPrice.toFixed(2)}</div>
                </td>
                <td className="num" style={{ color: 'var(--admin-text-muted)' }}>{p.gstPercentage}%</td>
                <td>
                  <span className={`admin-badge ${stockBadge(p)}`}>
                    {p.stockQuantity} {p.unit}
                  </span>
                </td>
                <td>
                  <span className={`admin-badge ${p.isActive ? 'admin-badge-success' : 'admin-badge-neutral'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="admin-cell-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary admin-btn-icon"
                      onClick={() => handleOpenModal(p)}
                      title="Edit product"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary admin-btn-icon"
                      onClick={() => handleToggleStatus(p)}
                      title={p.isActive ? 'Deactivate product' : 'Reactivate product'}
                    >
                      {p.isActive ? (
                        <ToggleRight size={16} style={{ color: 'var(--admin-accent)' }} />
                      ) : (
                        <ToggleLeft size={16} style={{ color: 'var(--admin-text-faint)' }} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && products.length === 0 && (
          <div className="admin-empty-block">
            <div className="admin-empty-icon">
              <PackageSearch size={20} />
            </div>
            <div className="admin-empty-title">
              {search ? 'No products match your search' : 'No products yet'}
            </div>
            <div className="admin-empty-desc">
              {search ? (
                <>
                  Try a different name, SKU, or barcode, or{' '}
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{ color: 'var(--admin-accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  >
                    clear the search
                  </button>
                  .
                </>
              ) : (
                'Add your first product to start building inventory.'
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

      <Modal isOpen={modalOpen} title={editingId ? 'Edit Product' : 'Add New Product'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid-2">
            <div className="admin-field">
              <label className="admin-label">SKU</label>
              <input
                type="text"
                className="admin-input"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                disabled={!!editingId}
                required
              />
              {editingId && <span className="admin-form-hint">SKU can't be changed after creation</span>}
            </div>
            <div className="admin-field">
              <label className="admin-label">Barcode <span className="optional">(optional)</span></label>
              <input
                type="text"
                className="admin-input"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Scan or type barcode"
              />
            </div>
          </div>

          <div className="admin-field" style={{ marginTop: '16px' }}>
            <label className="admin-label">Product Name</label>
            <input
              type="text"
              className="admin-input"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              required
            />
          </div>

          <div className="admin-form-grid-2" style={{ marginTop: '16px' }}>
            <div className="admin-field">
              <label className="admin-label">Category</label>
              <select
                className="admin-select"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Unit</label>
              <select
                className="admin-select"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-form-grid-3" style={{ marginTop: '16px' }}>
            <div className="admin-field">
              <label className="admin-label">Purchase Price</label>
              <div className="admin-money-wrap">
                <span className="admin-currency">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="admin-input"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div className="admin-field">
              <label className="admin-label">Selling Price</label>
              <div className="admin-money-wrap">
                <span className="admin-currency">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="admin-input"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                  required
                />
              </div>
              {marginPct && (
                <span className="admin-form-hint">
                  {Number(marginPct) >= 0 ? `${marginPct}% margin` : `${marginPct}% — selling below cost`}
                </span>
              )}
            </div>
            <div className="admin-field">
              <label className="admin-label">GST</label>
              <select
                className="admin-select"
                value={formData.gstPercentage}
                onChange={(e) => setFormData({ ...formData, gstPercentage: Number(e.target.value) })}
              >
                {GST_RATES.map((g) => (
                  <option key={g} value={g}>{g}%</option>
                ))}
              </select>
            </div>
          </div>

          {!editingId && (
            <div className="admin-form-grid-2" style={{ marginTop: '16px' }}>
              <div className="admin-field">
                <label className="admin-label">Initial Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  className="admin-input"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Low Stock Warning At</label>
                <input
                  type="number"
                  min="0"
                  className="admin-input"
                  value={formData.minimumStockLevel}
                  onChange={(e) => setFormData({ ...formData, minimumStockLevel: Number(e.target.value) })}
                  required
                />
                <span className="admin-form-hint">You'll get a low-stock badge below this quantity</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '26px' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="admin-spin" />}
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={!!deactivateTarget}
        title="Deactivate product?"
        message={`"${deactivateTarget?.productName}" will be hidden from billing and inventory screens until reactivated. Existing bills and stock history are unaffected.`}
        confirmLabel="Deactivate"
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
};

export default ProductsPage;