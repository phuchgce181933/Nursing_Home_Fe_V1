import { useEffect, useState } from 'react';
import authService from '../../services/auth.service';

const initialCreateForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'doctor',
  phone: '',
  gender: 'unknown',
  dateOfBirth: '',
  address: '',
  specialty: '',
  staffCode: '',
  certifications: '',
};

const initialEditForm = {
  fullName: '',
  phone: '',
  gender: 'unknown',
  address: '',
  role: 'doctor',
  isActive: true,
  isBanned: false,
  banReason: '',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US'); // Thường dùng 'en-US' hoặc 'en-GB' cho tiếng Anh
}

function AdminAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [filters, setFilters] = useState({ search: '', role: '', isActive: '' });
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const loadAccounts = async (page = 1) => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries({
          ...filters,
          page,
          limit: pagination.limit,
        }).filter(([, value]) => value !== '' && value !== undefined && value !== null)
      );

      const data = await authService.getStaffAccounts(params);

      setAccounts(data.data || []);
      setPagination({
        page: data.page,
        totalPages: data.totalPages,
        total: data.total,
        limit: data.limit,
      });
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Failed to load accounts list.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleApplyFilters = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    loadAccounts(1);
  };

  const handleResetFilters = () => {
    setFilters({ search: '', role: '', isActive: '' });
    setPagination((current) => ({ ...current, page: 1 }));
    loadAccounts(1);
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const payload = {
        ...createForm,
        dateOfBirth: createForm.dateOfBirth || undefined,
        certifications: createForm.certifications
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      };

      await authService.createStaffAccount(payload);
      setMessageType('success');
      setMessage('Staff account created successfully.');
      setCreateForm(initialCreateForm);
      await loadAccounts(1);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Failed to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (user) => {
    setEditUser(user);
    setEditForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      gender: user.gender || 'unknown',
      address: user.address || '',
      role: user.role || 'doctor',
      isActive: Boolean(user.isActive),
      isBanned: Boolean(user.isBanned),
      banReason: user.banReason || '',
    });
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editUser) return;

    setSubmitting(true);
    setMessage('');

    try {
      await authService.updateUserByAdmin(editUser._id, {
        ...editForm,
        isBanned: Boolean(editForm.isBanned),
        banReason: editForm.isBanned ? editForm.banReason || 'Banned by Administrator' : '',
      });
      setMessageType('success');
      setMessage('Account updated successfully.');
      setEditUser(null);
      await loadAccounts(pagination.page);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Failed to update account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    setSubmitting(true);
    setMessage('');

    try {
      await authService.toggleStaffActive(user._id);
      setMessageType('success');
      setMessage('Active status updated successfully.');
      await loadAccounts(pagination.page);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Failed to change account status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBan = async (user) => {
    setSubmitting(true);
    setMessage('');

    try {
      await authService.updateUserByAdmin(user._id, {
        isBanned: !user.isBanned,
        banReason: user.isBanned ? '' : 'Banned by Administrator',
      });
      setMessageType('success');
      setMessage(user.isBanned ? 'Account unbanned successfully.' : 'Account banned successfully.');
      await loadAccounts(pagination.page);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Failed to perform ban/unban action.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-page__container">
        <header className="profile-page__header">
          <h1 className="profile-page__title">Account Management</h1>
          <p className="profile-page__subtitle">
            Create staff accounts, monitor list, and ban/unban accounts as needed.
          </p>
        </header>

        {message && (
          <div className={`message ${messageType === 'success' ? 'message--success' : 'message--error'}`}>
            {message}
          </div>
        )}

        <section className="profile-card">
          <h2 className="profile-card__heading">Create New Account</h2>
          <form className="profile-form" onSubmit={handleCreateSubmit}>
            <div className="profile-form__grid">
              <label className="profile-form__field">
                <span className="profile-form__label">Full Name</span>
                <input
                  className="profile-form__input"
                  value={createForm.fullName}
                  onChange={(event) => setCreateForm((current) => ({ ...current, fullName: event.target.value }))}
                  required
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Email</span>
                <input
                  className="profile-form__input"
                  type="email"
                  value={createForm.email}
                  onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Password</span>
                <input
                  className="profile-form__input"
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Role</span>
                <select
                  className="profile-form__input"
                  value={createForm.role}
                  onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Phone Number</span>
                <input
                  className="profile-form__input"
                  value={createForm.phone}
                  onChange={(event) => setCreateForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Gender</span>
                <select
                  className="profile-form__input"
                  value={createForm.gender}
                  onChange={(event) => setCreateForm((current) => ({ ...current, gender: event.target.value }))}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Date of Birth</span>
                <input
                  className="profile-form__input"
                  type="date"
                  value={createForm.dateOfBirth}
                  onChange={(event) => setCreateForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Staff Code</span>
                <input
                  className="profile-form__input"
                  value={createForm.staffCode}
                  onChange={(event) => setCreateForm((current) => ({ ...current, staffCode: event.target.value }))}
                  placeholder="Auto-generated if left blank"
                />
              </label>

              <label className="profile-form__field" style={{ gridColumn: '1 / -1' }}>
                <span className="profile-form__label">Address</span>
                <input
                  className="profile-form__input"
                  value={createForm.address}
                  onChange={(event) => setCreateForm((current) => ({ ...current, address: event.target.value }))}
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Specialty</span>
                <input
                  className="profile-form__input"
                  value={createForm.specialty}
                  onChange={(event) => setCreateForm((current) => ({ ...current, specialty: event.target.value }))}
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Certifications (comma-separated)</span>
                <input
                  className="profile-form__input"
                  value={createForm.certifications}
                  onChange={(event) => setCreateForm((current) => ({ ...current, certifications: event.target.value }))}
                />
              </label>
            </div>
            <div className="profile-page__actions">
              <button type="submit" className="button button--primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </section>

        <section className="profile-card">
          <div className="account-toolbar">
            <div>
              <h2 className="profile-card__heading">Account List</h2>
              <p className="profile-card__empty">Total {pagination.total} accounts.</p>
            </div>
            <div className="account-filter-row">
              <input
                className="profile-form__input"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by name or email"
              />
              <select className="profile-form__input" name="role" value={filters.role} onChange={handleFilterChange}>
                <option value="">All Roles</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <select className="profile-form__input" name="isActive" value={filters.isActive} onChange={handleFilterChange}>
                <option value="">All Statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <button type="button" className="button button--primary" onClick={handleApplyFilters}>
                Filter
              </button>
              <button type="button" className="button button--secondary" onClick={handleResetFilters}>
                Reset Filter
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner" role="status" aria-live="polite">
              <span className="loading-spinner__ring" aria-hidden="true" />
              <span className="loading-spinner__label">Loading accounts list...</span>
            </div>
          ) : accounts.length === 0 ? (
            <p className="profile-card__empty">No matching accounts found.</p>
          ) : (
            <div className="account-table-wrap">
              <table className="account-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Banned</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((user) => (
                    <tr key={user._id}>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>
                        <span className={`account-chip ${user.isActive ? 'account-chip--active' : 'account-chip--inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {user.isBanned && <span className="account-chip account-chip--banned">Banned</span>}
                      </td>
                      <td>{user.isBanned ? 'Yes' : 'No'}</td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="account-actions">
                          <button type="button" className="button button--secondary" onClick={() => handleEditOpen(user)}>
                            Edit
                          </button>
                          {/* <button type="button" className="button button--primary" onClick={() => handleToggleActive(user)} disabled={submitting}>
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button> */}
                          <button type="button" className={`button ${user.isBanned ? 'button--secondary' : 'button--danger'}`} onClick={() => handleToggleBan(user)} disabled={submitting}>
                            {user.isBanned ? 'Unban' : 'Ban'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="account-pagination">
            <button
              type="button"
              className="button button--secondary"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadAccounts(pagination.page - 1)}
            >
              Previous
            </button>
            <span>
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              className="button button--secondary"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadAccounts(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </section>

        {editUser && (
          <section className="profile-card">
            <h2 className="profile-card__heading">Update Account: {editUser.fullName}</h2>
            <form className="profile-form" onSubmit={handleEditSubmit}>
              <div className="profile-form__grid">
                <label className="profile-form__field">
                  <span className="profile-form__label">Full Name</span>
                  <input
                    className="profile-form__input"
                    value={editForm.fullName}
                    onChange={(event) => setEditForm((current) => ({ ...current, fullName: event.target.value }))}
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Phone Number</span>
                  <input
                    className="profile-form__input"
                    value={editForm.phone}
                    onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Gender</span>
                  <select
                    className="profile-form__input"
                    value={editForm.gender}
                    onChange={(event) => setEditForm((current) => ({ ...current, gender: event.target.value }))}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Role</span>
                  <select
                    className="profile-form__input"
                    value={editForm.role}
                    onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))}
                  >
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Address</span>
                  <input
                    className="profile-form__input"
                    value={editForm.address}
                    onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))}
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Active Status</span>
                  <select
                    className="profile-form__input"
                    value={editForm.isActive ? 'true' : 'false'}
                    onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.value === 'true' }))}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Ban Status</span>
                  <select
                    className="profile-form__input"
                    value={editForm.isBanned ? 'true' : 'false'}
                    onChange={(event) => setEditForm((current) => ({ ...current, isBanned: event.target.value === 'true' }))}
                  >
                    <option value="false">Not Banned</option>
                    <option value="true">Banned</option>
                  </select>
                </label>

                <label className="profile-form__field" style={{ gridColumn: '1 / -1' }}>
                  <span className="profile-form__label">Ban Reason</span>
                  <input
                    className="profile-form__input"
                    value={editForm.banReason}
                    onChange={(event) => setEditForm((current) => ({ ...current, banReason: event.target.value }))}
                    placeholder="Enter reason if banning this account"
                  />
                </label>
              </div>
              <div className="profile-page__actions">
                <button type="submit" className="button button--primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="button button--secondary" onClick={() => setEditUser(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

export default AdminAccountsPage;