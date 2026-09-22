import React, { useEffect, useState } from 'react';
import api from '../../services/ipcApi';
import type { UserDto, CreateUserDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<CreateUserDto>({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'SalesWorker'
  });

  const { showToast } = useToast();

  useEffect(() => {
    loadUsers();
  }, [pageNumber, search]);

  const loadUsers = async () => {
    const res = await api.users.getPaged({ pageNumber, pageSize: 8, search });
    if (res.success && res.data) {
      setUsers(res.data.items);
      setTotalCount(res.data.totalCount);
      setTotalPages(res.data.totalPages || 1);
    }
  };

  const handleOpenModal = (u?: UserDto) => {
    if (u) {
      setEditingId(u.id);
      setFormData({
        name: u.name,
        email: u.email,
        password: '',
        phone: u.phone || '',
        role: u.role
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'SalesWorker'
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const res = await api.users.update(editingId, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
        isActive: true
      });
      if (res.success) {
        showToast('User updated successfully', 'success');
        setModalOpen(false);
        loadUsers();
      } else {
        showToast(res.message || 'Update failed', 'error');
      }
    } else {
      const res = await api.users.create(formData);
      if (res.success) {
        showToast('User created successfully', 'success');
        setModalOpen(false);
        loadUsers();
      } else {
        showToast(res.message || 'Creation failed', 'error');
      }
    }
  };

  const handleToggle = async (id: number) => {
    const res = await api.users.toggle(id);
    if (res.success) {
      showToast('User status updated', 'info');
      loadUsers();
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <span>User Accounts & Permissions ({totalCount})</span>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={16} />
            <span>Create User</span>
          </button>
        </div>

        <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '360px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="input-control"
            style={{ paddingLeft: '40px' }}
            placeholder="Search Name, Email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPageNumber(1); }}
          />
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email Address</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`badge ${u.role === 'Admin' ? 'badge-info' : 'badge-success'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', marginRight: '6px' }} onClick={() => handleOpenModal(u)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleToggle(u.id)}>
                      {u.isActive ? <ToggleRight size={16} style={{ color: 'var(--accent-success)' }} /> : <ToggleLeft size={16} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
      </div>

      <Modal isOpen={modalOpen} title={editingId ? 'Edit User Account' : 'Create User Account'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="input-control"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="input-control"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password {editingId && '(Leave blank to keep current)'}</label>
            <input
              type="password"
              className="input-control"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required={!editingId}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="input-control"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Account Role</label>
              <select
                className="select-control"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
              >
                <option value="SalesWorker">Sales Worker</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Save User' : 'Create User'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsersPage;
