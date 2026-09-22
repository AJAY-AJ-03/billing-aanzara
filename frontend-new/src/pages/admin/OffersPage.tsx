import React, { useEffect, useState } from 'react';
import api from '../../services/ipcApi';
import type { OfferDto, ProductDto, CreateOfferDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';

export const OffersPage: React.FC = () => {
  const [offers, setOffers] = useState<OfferDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState<CreateOfferDto>({
    name: '',
    description: '',
    productId: undefined,
    offerType: 'PercentageDiscount',
    discountPercentage: 10,
    discountAmount: 0,
    minimumQuantity: undefined,
    buyQuantity: undefined,
    freeQuantity: undefined,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    isActive: true
  });

  const { showToast } = useToast();

  useEffect(() => {
    loadProducts();
    loadOffers();
  }, [pageNumber]);

  const loadProducts = async () => {
    const res = await api.products.getPaged({ pageNumber: 1, pageSize: 1000 });
    if (res.success && res.data) setProducts(res.data.items);
  };

  const loadOffers = async () => {
    const res = await api.offers.getPaged({ pageNumber, pageSize: 8 });
    if (res.success && res.data) {
      setOffers(res.data.items);
      setTotalCount(res.data.totalCount);
      setTotalPages(res.data.totalPages || 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.offers.create(formData);
    if (res.success) {
      showToast('Offer created successfully', 'success');
      setModalOpen(false);
      loadOffers();
    } else {
      showToast(res.message || 'Failed to create offer', 'error');
    }
  };

  const handleToggle = async (id: number) => {
    const res = await api.offers.toggle(id);
    if (res.success) {
      showToast('Offer status updated', 'info');
      loadOffers();
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <span>Promotions & Offers ({totalCount})</span>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            <span>Create Offer</span>
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Offer Name</th>
                <th>Target Product</th>
                <th>Offer Rule Type</th>
                <th>Discount Details</th>
                <th>Valid Period</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.name}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{o.description || '—'}</div>
                  </td>
                  <td>{o.productName ? <span className="badge badge-info">{o.productName}</span> : <em>All Products / Bill</em>}</td>
                  <td><strong>{o.offerType}</strong></td>
                  <td>
                    {o.discountPercentage ? `${o.discountPercentage}% Off` : ''}
                    {o.discountAmount ? `₹${o.discountAmount} Off` : ''}
                    {o.buyQuantity ? `Buy ${o.buyQuantity} Get ${o.freeQuantity} Free` : ''}
                  </td>
                  <td>
                    {new Date(o.startDate).toLocaleDateString()} - {new Date(o.endDate).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`badge ${o.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {o.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleToggle(o.id)}>
                      {o.isActive ? <ToggleRight size={16} style={{ color: 'var(--accent-success)' }} /> : <ToggleLeft size={16} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
      </div>

      <Modal isOpen={modalOpen} title="Create New Offer" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Offer Name</label>
            <input
              type="text"
              className="input-control"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Target Product (Leave empty for All/Bill Offer)</label>
            <select
              className="select-control"
              value={formData.productId || ''}
              onChange={e => setFormData({ ...formData, productId: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">All Products / Bill Level Offer</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.productName} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Offer Type</label>
            <select
              className="select-control"
              value={formData.offerType}
              onChange={e => setFormData({ ...formData, offerType: e.target.value })}
            >
              <option value="PercentageDiscount">Percentage Discount (%)</option>
              <option value="FixedDiscount">Fixed Amount Discount (₹)</option>
              <option value="BuyXGetY">Buy X Get Y Free</option>
              <option value="BillDiscount">Bill Level Discount</option>
            </select>
          </div>

          {formData.offerType === 'PercentageDiscount' && (
            <div className="form-group">
              <label className="form-label">Discount Percentage (%)</label>
              <input
                type="number"
                className="input-control"
                value={formData.discountPercentage || 0}
                onChange={e => setFormData({ ...formData, discountPercentage: Number(e.target.value) })}
              />
            </div>
          )}

          {formData.offerType === 'FixedDiscount' && (
            <div className="form-group">
              <label className="form-label">Discount Amount (₹)</label>
              <input
                type="number"
                className="input-control"
                value={formData.discountAmount || 0}
                onChange={e => setFormData({ ...formData, discountAmount: Number(e.target.value) })}
              />
            </div>
          )}

          {formData.offerType === 'BuyXGetY' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Buy Quantity (X)</label>
                <input
                  type="number"
                  className="input-control"
                  value={formData.buyQuantity || 1}
                  onChange={e => setFormData({ ...formData, buyQuantity: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Free Quantity (Y)</label>
                <input
                  type="number"
                  className="input-control"
                  value={formData.freeQuantity || 1}
                  onChange={e => setFormData({ ...formData, freeQuantity: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="input-control"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="input-control"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Offer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OffersPage;
