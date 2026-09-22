// src/pages/admin/CategoriesPage.tsx
import React, { useEffect, useState } from 'react';
import api from '../../services/ipcApi';
import type { CategoryDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import { Plus, Search, X, Edit2, ToggleLeft, ToggleRight, FolderOpen, Loader2 } from 'lucide-react';

const PAGE_SIZE = 8;

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [deactivateTarget, setDeactivateTarget] = useState<CategoryDto | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    loadCategories();
  }, [pageNumber, search]);

  const loadCategories = async () => {
    setLoading(true);
    const res = await api.categories.getPaged({ pageNumber, pageSize: PAGE_SIZE, search });
    if (res.success && res.data) {
      setCategories(res.data.items);
      setTotalCount(res.data.totalCount);
      setTotalPages(res.data.totalPages || 1);
    }
    setLoading(false);
  };

  const handleOpenModal = (c?: CategoryDto) => {
    if (c) {
      setEditingId(c.id);
      setName(c.name);
      setDescription(c.description || '');
    } else {
      setEditingId(null);
      setName('');
      setDescription('');
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const res = await api.categories.update(editingId, { name, description });
        if (res.success) {
          showToast('Category updated', 'success');
          setModalOpen(false);
          loadCategories();
        } else {
          showToast(res.message || 'Update failed', 'error');
        }
      } else {
        const res = await api.categories.create({ name, description });
        if (res.success) {
          showToast('Category created', 'success');
          setModalOpen(false);
          loadCategories();
        } else {
          showToast(res.message || 'Creation failed', 'error');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c: CategoryDto) => {
    if (c.isActive) {
      setDeactivateTarget(c);
      return;
    }
    const res = await api.categories.toggle(c.id);
    if (res.success) {
      showToast(`${c.name} reactivated`, 'success');
      loadCategories();
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const res = await api.categories.toggle(deactivateTarget.id);
    if (res.success) {
      showToast(`${deactivateTarget.name} deactivated`, 'info');
      loadCategories();
    }
    setDeactivateTarget(null);
  };

  const hasProducts = (deactivateTarget?.productCount || 0) > 0;

  return (
    <div>
      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-toolbar-title">
            <h2>Categories</h2>
            <span>{totalCount} total</span>
          </div>
          <div className="admin-toolbar-actions">
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={16} />
              <span>Add Category</span>
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
            placeholder="Search category name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageNumber(1);
            }}
          />
          {search && (
            <button type="button" className="admin-input-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th className="num">Products</th>
              <th>Status</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="admin-cell-primary">{c.name}</td>
                <td style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>
                  {c.description || <span style={{ color: 'var(--admin-text-faint)' }}>No description</span>}
                </td>
                <td className="num">
                  <span className="admin-badge admin-badge-neutral">{c.productCount || 0}</span>
                </td>
                <td>
                  <span className={`admin-badge ${c.isActive ? 'admin-badge-success' : 'admin-badge-neutral'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="admin-cell-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary admin-btn-icon"
                      onClick={() => handleOpenModal(c)}
                      title="Edit category"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary admin-btn-icon"
                      onClick={() => handleToggle(c)}
                      title={c.isActive ? 'Deactivate category' : 'Reactivate category'}
                    >
                      {c.isActive ? (
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

        {!loading && categories.length === 0 && (
          <div className="admin-empty-block">
            <div className="admin-empty-icon">
              <FolderOpen size={20} />
            </div>
            <div className="admin-empty-title">
              {search ? 'No categories match your search' : 'No categories yet'}
            </div>
            <div className="admin-empty-desc">
              {search ? (
                <>
                  Try a different name, or{' '}
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
                'Add a category to start organizing your products.'
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

      <Modal isOpen={modalOpen} title={editingId ? 'Edit Category' : 'Add Category'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="admin-field">
            <label className="admin-label">Category Name</label>
            <input
              type="text"
              className="admin-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="admin-field" style={{ marginTop: '16px' }}>
            <label className="admin-label">Description <span className="optional">(optional)</span></label>
            <textarea
              className="admin-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of products belong here"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="admin-spin" />}
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={!!deactivateTarget}
        title="Deactivate category?"
        message={
          hasProducts
            ? `"${deactivateTarget?.name}" still has ${deactivateTarget?.productCount} product(s) assigned. They'll keep this category but it won't be selectable for new products until reactivated.`
            : `"${deactivateTarget?.name}" will be hidden from category pickers until reactivated.`
        }
        confirmLabel="Deactivate"
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
};

export default CategoriesPage;