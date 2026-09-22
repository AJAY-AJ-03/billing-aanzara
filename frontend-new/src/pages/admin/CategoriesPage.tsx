import React, { useEffect, useState } from 'react';
import api from '../../services/ipcApi';
import type { CategoryDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    loadCategories();
  }, [pageNumber, search]);

  const loadCategories = async () => {
    const res = await api.categories.getPaged({ pageNumber, pageSize: 8, search });
    if (res.success && res.data) {
      setCategories(res.data.items);
      setTotalCount(res.data.totalCount);
      setTotalPages(res.data.totalPages || 1);
    }
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
    if (editingId) {
      const res = await api.categories.update(editingId, { name, description });
      if (res.success) {
        showToast('Category updated successfully', 'success');
        setModalOpen(false);
        loadCategories();
      } else {
        showToast(res.message || 'Update failed', 'error');
      }
    } else {
      const res = await api.categories.create({ name, description });
      if (res.success) {
        showToast('Category created successfully', 'success');
        setModalOpen(false);
        loadCategories();
      } else {
        showToast(res.message || 'Creation failed', 'error');
      }
    }
  };

  const handleToggle = async (id: number) => {
    const res = await api.categories.toggle(id);
    if (res.success) {
      showToast('Category status updated', 'info');
      loadCategories();
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <span>Categories ({totalCount})</span>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        </div>

        <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '360px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="input-control"
            style={{ paddingLeft: '40px' }}
            placeholder="Search Category Name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPageNumber(1); }}
          />
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th>Product Count</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.description || '—'}</td>
                  <td><span className="badge badge-info">{c.productCount || 0} products</span></td>
                  <td>
                    <span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', marginRight: '6px' }} onClick={() => handleOpenModal(c)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleToggle(c.id)}>
                      {c.isActive ? <ToggleRight size={16} style={{ color: 'var(--accent-success)' }} /> : <ToggleLeft size={16} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
      </div>

      <Modal isOpen={modalOpen} title={editingId ? 'Edit Category' : 'Add Category'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category Name</label>
            <input
              type="text"
              className="input-control"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="input-control"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create Category'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CategoriesPage;
