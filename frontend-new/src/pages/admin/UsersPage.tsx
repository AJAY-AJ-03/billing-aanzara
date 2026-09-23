// src/pages/admin/UsersPage.tsx
import React, { useEffect, useState } from 'react';
import api from '../../services/ipcApi';
import type { UserDto, CreateUserDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import {
  Plus,
  Search,
  X,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Users,
  Loader2,
} from 'lucide-react';

const PAGE_SIZE = 8;

const emptyForm = (): CreateUserDto => ({
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'SalesWorker',
});

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateUserDto>(emptyForm());

  const [deactivateTarget, setDeactivateTarget] = useState<UserDto | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    loadUsers();
  }, [pageNumber, search]);

  const loadUsers = async () => {
    setLoading(true);
    const res = await api.users.getPaged({ pageNumber, pageSize: PAGE_SIZE, search });
    if (res.success && res.data) {
      setUsers(res.data.items);
      setTotalCount(res.data.totalCount);
      setTotalPages(res.data.totalPages || 1);
    }
    setLoading(false);
  };

  const handleOpenModal = (u?: UserDto) => {
    if (u) {
      setEditingId(u.id);
      setFormData({
        name: u.name,
        email: u.email,
        password: '',
        phone: u.phone || '',
        role: u.role,
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm());
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const res = await api.users.update(editingId, {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: formData.role,
          isActive: true,
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
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (u: UserDto) => {
    if (u.isActive) {
      setDeactivateTarget(u);
      return;
    }
    const res = await api.users.toggle(u.id);
    if (res.success) {
      showToast(`${u.name} reactivated`, 'success');
      loadUsers();
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const res = await api.users.toggle(deactivateTarget.id);
    if (res.success) {
      showToast(`${deactivateTarget.name} deactivated`, 'info');
      loadUsers();
    }
    setDeactivateTarget(null);
  };

  return (
    <div>
      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-toolbar-title">
            <h2>User Accounts &amp; Permissions</h2>
            <span>{totalCount} total</span>
          </div>
          <div className="admin-toolbar-actions">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => handleOpenModal()}
            >
              <Plus size={16} />
              <span>Create User</span>
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
            placeholder="Search by name or email…"
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
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="admin-cell-primary">{u.name}</td>
                <td style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>{u.email}</td>
                <td style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>
                  {u.phone || <span style={{ color: 'var(--admin-text-faint)' }}>—</span>}
                </td>
                <td>
                  <span
                    className={`admin-badge ${
                      u.role === 'Admin' ? 'admin-badge-warning' : 'admin-badge-neutral'
                    }`}
                  >
                    {u.role === 'Admin' ? 'Admin' : 'Sales Worker'}
                  </span>
                </td>
                <td>
                  <span
                    className={`admin-badge ${
                      u.isActive ? 'admin-badge-success' : 'admin-badge-neutral'
                    }`}
                  >
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="admin-cell-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary admin-btn-icon"
                      onClick={() => handleOpenModal(u)}
                      title="Edit user"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary admin-btn-icon"
                      onClick={() => handleToggle(u)}
                      title={u.isActive ? 'Deactivate user' : 'Reactivate user'}
                    >
                      {u.isActive ? (
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

        {!loading && users.length === 0 && (
          <div className="admin-empty-block">
            <div className="admin-empty-icon">
              <Users size={20} />
            </div>
            <div className="admin-empty-title">
              {search ? 'No users match your search' : 'No users yet'}
            </div>
            <div className="admin-empty-desc">
              {search ? (
                <>
                  Try a different name or email, or{' '}
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
                'Create your first user account to get started.'
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
        title={editingId ? 'Edit User Account' : 'Create User Account'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="admin-field">
            <label className="admin-label">Full Name</label>
            <input
              type="text"
              className="admin-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              required
              autoFocus
            />
          </div>

          <div className="admin-field" style={{ marginTop: '16px' }}>
            <label className="admin-label">Email Address</label>
            <input
              type="email"
              className="admin-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="admin-field" style={{ marginTop: '16px' }}>
            <label className="admin-label">
              Password{' '}
              {editingId && (
                <span className="optional">(leave blank to keep current)</span>
              )}
            </label>
            <input
              type="password"
              className="admin-input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingId ? '••••••••' : 'Set an initial password'}
              required={!editingId}
            />
            {!editingId && (
              <span className="admin-form-hint">Minimum 6 characters recommended.</span>
            )}
          </div>

          <div className="admin-form-grid-2" style={{ marginTop: '16px' }}>
            <div className="admin-field">
              <label className="admin-label">
                Phone Number <span className="optional">(optional)</span>
              </label>
              <input
                type="text"
                className="admin-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98xxxxxxxx"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label">Account Role</label>
              <select
                className="admin-select"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as CreateUserDto['role'] })
                }
              >
                <option value="SalesWorker">Sales Worker</option>
                <option value="Admin">Admin</option>
              </select>
              <span className="admin-form-hint">
                Admins can manage everything. Sales workers only bill and view stock.
              </span>
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
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={!!deactivateTarget}
        title="Deactivate user?"
        message={`"${deactivateTarget?.name}" will no longer be able to sign in until reactivated. Existing data they created is unaffected.`}
        confirmLabel="Deactivate"
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
};

export default UsersPage;