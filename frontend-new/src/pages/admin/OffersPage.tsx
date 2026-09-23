// src/pages/admin/OffersPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/ipcApi';
import type { OfferDto, ProductDto, CreateOfferDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import {
  Plus,
  Search,
  X,
  ToggleLeft,
  ToggleRight,
  Tag,
  Loader2,
} from 'lucide-react';

const PAGE_SIZE = 8;

const emptyForm = (): CreateOfferDto => ({
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
  isActive: true,
});

const OFFER_TYPE_LABELS: Record<string, string> = {
  PercentageDiscount: 'Percentage Discount',
  FixedDiscount: 'Fixed Amount Discount',
  BuyXGetY: 'Buy X Get Y Free',
  BillDiscount: 'Bill Level Discount',
};

export const OffersPage: React.FC = () => {
  const [offers, setOffers] = useState<OfferDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateOfferDto>(emptyForm());

  const [deactivateTarget, setDeactivateTarget] = useState<OfferDto | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadOffers();
  }, [pageNumber]);

  const loadProducts = async () => {
    const res = await api.products.getPaged({ pageNumber: 1, pageSize: 1000 });
    if (res.success && res.data) setProducts(res.data.items);
  };

  const loadOffers = async () => {
    setLoading(true);
    const res = await api.offers.getPaged({ pageNumber, pageSize: PAGE_SIZE });
    if (res.success && res.data) {
      setOffers(res.data.items);
      setTotalCount(res.data.totalCount);
      setTotalPages(res.data.totalPages || 1);
    }
    setLoading(false);
  };

  // Client-side search over the currently loaded page
  const visibleOffers = useMemo(() => {
    if (!search.trim()) return offers;
    const q = search.trim().toLowerCase();
    return offers.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.productName || '').toLowerCase().includes(q) ||
        (o.offerType || '').toLowerCase().includes(q),
    );
  }, [offers, search]);

  const handleOpenModal = () => {
    setFormData(emptyForm());
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.offers.create(formData);
      if (res.success) {
        showToast('Offer created successfully', 'success');
        setModalOpen(false);
        loadOffers();
      } else {
        showToast(res.message || 'Failed to create offer', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (o: OfferDto) => {
    if (o.isActive) {
      setDeactivateTarget(o);
      return;
    }
    const res = await api.offers.toggle(o.id);
    if (res.success) {
      showToast(`${o.name} reactivated`, 'success');
      loadOffers();
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const res = await api.offers.toggle(deactivateTarget.id);
    if (res.success) {
      showToast(`${deactivateTarget.name} deactivated`, 'info');
      loadOffers();
    }
    setDeactivateTarget(null);
  };

  const renderDiscount = (o: OfferDto) => {
    if (o.offerType === 'BuyXGetY' && o.buyQuantity && o.freeQuantity) {
      return (
        <span className="admin-badge admin-badge-success">
          Buy {o.buyQuantity} · Get {o.freeQuantity} Free
        </span>
      );
    }
    if (o.offerType === 'PercentageDiscount' && o.discountPercentage) {
      return <span className="admin-badge admin-badge-success">{o.discountPercentage}% off</span>;
    }
    if ((o.offerType === 'FixedDiscount' || o.offerType === 'BillDiscount') && o.discountAmount) {
      return <span className="admin-badge admin-badge-success">₹{o.discountAmount} off</span>;
    }
    return <span className="admin-badge admin-badge-neutral">No discount value</span>;
  };

  const renderValidity = (o: OfferDto) => {
    const start = new Date(o.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const end = new Date(o.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return (
      <div>
        <div className="admin-cell-primary" style={{ fontSize: '13px' }}>{start} → {end}</div>
        <div className="admin-cell-secondary">Valid period</div>
      </div>
    );
  };

  return (
    <div>
      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-toolbar-title">
            <h2>Promotions & Offers</h2>
            <span>{totalCount} total</span>
          </div>
          <div className="admin-toolbar-actions">
            <button type="button" className="admin-btn admin-btn-primary" onClick={handleOpenModal}>
              <Plus size={16} />
              <span>Create Offer</span>
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
            placeholder="Search by offer name, product, or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              <th>Offer</th>
              <th>Target Product</th>
              <th>Rule Type</th>
              <th>Discount</th>
              <th>Validity</th>
              <th>Status</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleOffers.map((o) => (
              <tr key={o.id}>
                <td>
                  <div className="admin-cell-primary">{o.name}</div>
                  {o.description && <div className="admin-cell-secondary">{o.description}</div>}
                </td>
                <td>
                  {o.productName ? (
                    <span className="admin-badge admin-badge-neutral">{o.productName}</span>
                  ) : (
                    <span style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>
                      All Products / Bill
                    </span>
                  )}
                </td>
                <td>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)' }}>
                    {OFFER_TYPE_LABELS[o.offerType] || o.offerType}
                  </span>
                </td>
                <td>{renderDiscount(o)}</td>
                <td>{renderValidity(o)}</td>
                <td>
                  <span className={`admin-badge ${o.isActive ? 'admin-badge-success' : 'admin-badge-neutral'}`}>
                    {o.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="admin-cell-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary admin-btn-icon"
                      onClick={() => handleToggle(o)}
                      title={o.isActive ? 'Deactivate offer' : 'Reactivate offer'}
                    >
                      {o.isActive ? (
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

        {!loading && visibleOffers.length === 0 && (
          <div className="admin-empty-block">
            <div className="admin-empty-icon">
              <Tag size={20} />
            </div>
            <div className="admin-empty-title">
              {search ? 'No offers match your search' : 'No offers yet'}
            </div>
            <div className="admin-empty-desc">
              {search ? (
                <>
                  Try a different name, product, or type, or{' '}
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{
                      color: 'var(--admin-accent)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    clear the search
                  </button>
                  .
                </>
              ) : (
                'Create your first promotion to start boosting sales.'
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

      <Modal
        isOpen={modalOpen}
        title="Create New Offer"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          {/* Name + Description */}
          <div className="admin-field">
            <label className="admin-label">Offer Name</label>
            <input
              type="text"
              className="admin-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Diwali 10% Off"
              required
              autoFocus
            />
          </div>

          <div className="admin-field" style={{ marginTop: '16px' }}>
            <label className="admin-label">
              Description <span className="optional">(optional)</span>
            </label>
            <textarea
              className="admin-textarea"
              rows={2}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Short note shown on the offer card"
            />
          </div>

          {/* Target + Type */}
          <div className="admin-form-grid-2" style={{ marginTop: '16px' }}>
            <div className="admin-field">
              <label className="admin-label">
                Target Product <span className="optional">(leave empty for bill-level)</span>
              </label>
              <select
                className="admin-select"
                value={formData.productId || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    productId: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              >
                <option value="">All Products / Bill Level</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.productName} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label">Offer Type</label>
              <select
                className="admin-select"
                value={formData.offerType}
                onChange={(e) => setFormData({ ...formData, offerType: e.target.value })}
              >
                <option value="PercentageDiscount">Percentage Discount (%)</option>
                <option value="FixedDiscount">Fixed Amount Discount (₹)</option>
                <option value="BuyXGetY">Buy X Get Y Free</option>
                <option value="BillDiscount">Bill Level Discount</option>
              </select>
            </div>
          </div>

          {/* Conditional discount fields */}
          {formData.offerType === 'PercentageDiscount' && (
            <div className="admin-field" style={{ marginTop: '16px' }}>
              <label className="admin-label">Discount Percentage (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="admin-input"
                value={formData.discountPercentage || 0}
                onChange={(e) =>
                  setFormData({ ...formData, discountPercentage: Number(e.target.value) })
                }
              />
            </div>
          )}

          {formData.offerType === 'FixedDiscount' && (
            <div className="admin-field" style={{ marginTop: '16px' }}>
              <label className="admin-label">Discount Amount (₹)</label>
              <div className="admin-money-wrap">
                <span className="admin-currency">₹</span>
                <input
                  type="number"
                  min={0}
                  className="admin-input"
                  value={formData.discountAmount || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, discountAmount: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}

          {formData.offerType === 'BuyXGetY' && (
            <div className="admin-form-grid-2" style={{ marginTop: '16px' }}>
              <div className="admin-field">
                <label className="admin-label">Buy Quantity (X)</label>
                <input
                  type="number"
                  min={1}
                  className="admin-input"
                  value={formData.buyQuantity || 1}
                  onChange={(e) =>
                    setFormData({ ...formData, buyQuantity: Number(e.target.value) })
                  }
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Free Quantity (Y)</label>
                <input
                  type="number"
                  min={1}
                  className="admin-input"
                  value={formData.freeQuantity || 1}
                  onChange={(e) =>
                    setFormData({ ...formData, freeQuantity: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}

          {/* Validity */}
          <div className="admin-form-grid-2" style={{ marginTop: '16px' }}>
            <div className="admin-field">
              <label className="admin-label">
                Start Date
              </label>
              <input
                type="date"
                className="admin-input"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">End Date</label>
              <input
                type="date"
                className="admin-input"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '26px',
            }}
          >
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="admin-spin" />}
              {saving ? 'Saving…' : 'Save Offer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={!!deactivateTarget}
        title="Deactivate offer?"
        message={`"${deactivateTarget?.name}" will stop applying to new bills until reactivated. Past sales and history are unaffected.`}
        confirmLabel="Deactivate"
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
};

export default OffersPage;