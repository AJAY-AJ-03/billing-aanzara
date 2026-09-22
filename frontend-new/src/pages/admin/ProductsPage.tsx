import React, { useEffect, useState } from 'react';
import api from '../../services/ipcApi';
import type { ProductDto, CategoryDto, CreateProductDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Plus, Search, Download, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateProductDto>({
    sku: '',
    barcode: '',
    productName: '',
    categoryId: 0,
    description: '',
    purchasePrice: 0,
    sellingPrice: 0,
    gstPercentage: 5,
    stockQuantity: 0,
    minimumStockLevel: 5,
    unit: 'Piece'
  });

  const { showToast } = useToast();

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
        setFormData(prev => ({ ...prev, categoryId: res.data![0].id }));
      }
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    const res = await api.products.getPaged({ pageNumber, pageSize: 8, search });
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
        unit: p.unit
      });
    } else {
      setEditingId(null);
      setFormData({
        sku: `SKU-${Date.now().toString().slice(-5)}`,
        barcode: '',
        productName: '',
        categoryId: categories[0]?.id || 1,
        description: '',
        purchasePrice: 0,
        sellingPrice: 0,
        gstPercentage: 5,
        stockQuantity: 10,
        minimumStockLevel: 5,
        unit: 'Piece'
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        barcode: formData.barcode
      });
      if (res.success) {
        showToast('Product updated successfully', 'success');
        setModalOpen(false);
        loadProducts();
      } else {
        showToast(res.message || 'Update failed', 'error');
      }
    } else {
      const res = await api.products.create(formData);
      if (res.success) {
        showToast('Product created successfully', 'success');
        setModalOpen(false);
        loadProducts();
      } else {
        showToast(res.message || 'Creation failed', 'error');
      }
    }
  };

  const handleToggleStatus = async (id: number) => {
    const res = await api.products.toggle(id);
    if (res.success) {
      showToast('Product status updated', 'info');
      loadProducts();
    }
  };

  const handleExport = async () => {
    const res = await api.products.export();
    if (res.success && res.data) {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.data}`;
      link.download = `Products_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      showToast('Product list exported to Excel', 'success');
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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

      showToast('Processing Excel import...', 'info');
      const res = await api.products.import(base64Str);
      if (res.success && res.data) {
        showToast(`Successfully imported ${res.data.importedCount} product(s)`, 'success');
        if (res.data.errors && res.data.errors.length > 0) {
          showToast(`Encountered ${res.data.errors.length} row warning(s)`, 'warning');
        }
        loadProducts();
      } else {
        showToast(res.message || 'Import failed', 'error');
      }
    };

    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
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
      <div className="card">
        <div className="card-title">
          <span>Products Inventory ({totalCount})</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={handleExport}>
              <Download size={16} />
              <span>Export Excel</span>
            </button>
            <button className="btn btn-secondary" onClick={handleImportClick}>
              <Plus size={16} />
              <span>Import Excel</span>
            </button>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={16} />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '360px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="input-control"
            style={{ paddingLeft: '40px' }}
            placeholder="Search SKU, Barcode, Product Name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPageNumber(1); }}
          />
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU / Barcode</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Buy / Sell Price</th>
                <th>GST %</th>
                <th>Stock</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.sku}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{p.barcode || '—'}</div>
                  </td>
                  <td><strong>{p.productName}</strong></td>
                  <td>{p.categoryName}</td>
                  <td>₹{p.purchasePrice} / <strong>₹{p.sellingPrice}</strong></td>
                  <td>{p.gstPercentage}%</td>
                  <td>
                    <span className={`badge ${p.stockQuantity <= 0 ? 'badge-danger' : p.stockQuantity <= p.minimumStockLevel ? 'badge-warning' : 'badge-success'}`}>
                      {p.stockQuantity} {p.unit}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', marginRight: '6px' }} onClick={() => handleOpenModal(p)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleToggleStatus(p.id)}>
                      {p.isActive ? <ToggleRight size={16} style={{ color: 'var(--accent-success)' }} /> : <ToggleLeft size={16} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No products found matching query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
      </div>

      {/* Modal Form */}
      <Modal isOpen={modalOpen} title={editingId ? 'Edit Product' : 'Add New Product'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input
                type="text"
                className="input-control"
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                disabled={!!editingId}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Barcode</label>
              <input
                type="text"
                className="input-control"
                value={formData.barcode}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Barcode (optional)"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Product Name</label>
            <input
              type="text"
              className="input-control"
              value={formData.productName}
              onChange={e => setFormData({ ...formData, productName: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="select-control"
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: Number(e.target.value) })}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select
                className="select-control"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
              >
                {['Piece', 'Kg', 'Gram', 'Liter', 'ML', 'Box', 'Pack', 'Dozen'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Purchase Price (₹)</label>
              <input
                type="number"
                step="0.01"
                className="input-control"
                value={formData.purchasePrice}
                onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Selling Price (₹)</label>
              <input
                type="number"
                step="0.01"
                className="input-control"
                value={formData.sellingPrice}
                onChange={e => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">GST %</label>
              <select
                className="select-control"
                value={formData.gstPercentage}
                onChange={e => setFormData({ ...formData, gstPercentage: Number(e.target.value) })}
              >
                {[0, 5, 12, 18, 28].map(g => (
                  <option key={g} value={g}>{g}%</option>
                ))}
              </select>
            </div>
          </div>

          {!editingId && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Initial Stock Quantity</label>
                <input
                  type="number"
                  className="input-control"
                  value={formData.stockQuantity}
                  onChange={e => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Min Warning Level</label>
                <input
                  type="number"
                  className="input-control"
                  value={formData.minimumStockLevel}
                  onChange={e => setFormData({ ...formData, minimumStockLevel: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create Product'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductsPage;
