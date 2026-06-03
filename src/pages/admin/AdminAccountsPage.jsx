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
  return new Date(value).toLocaleString('vi-VN');
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
      setMessage(error?.response?.data?.message || 'Không thể tải danh sách tài khoản.');
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
      setMessage('Tạo tài khoản nhân viên thành công.');
      setCreateForm(initialCreateForm);
      await loadAccounts(1);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Không thể tạo tài khoản.');
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
        banReason: editForm.isBanned ? editForm.banReason || 'Bị cấm bởi quản trị viên' : '',
      });
      setMessageType('success');
      setMessage('Cập nhật tài khoản thành công.');
      setEditUser(null);
      await loadAccounts(pagination.page);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Không thể cập nhật tài khoản.');
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
      setMessage('Cập nhật trạng thái hoạt động thành công.');
      await loadAccounts(pagination.page);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Không thể thay đổi trạng thái tài khoản.');
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
        banReason: user.isBanned ? '' : 'Bị cấm bởi quản trị viên',
      });
      setMessageType('success');
      setMessage(user.isBanned ? 'Bỏ cấm tài khoản thành công.' : 'Cấm tài khoản thành công.');
      await loadAccounts(pagination.page);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Không thể thực hiện thao tác cấm/bỏ cấm.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-page__container">
        <header className="profile-page__header">
          <h1 className="profile-page__title">Quản lý tài khoản</h1>
          <p className="profile-page__subtitle">
            Tạo tài khoản nhân viên, theo dõi danh sách và cấm/bỏ cấm tài khoản khi cần.
          </p>
        </header>

        {message && (
          <div className={`message ${messageType === 'success' ? 'message--success' : 'message--error'}`}>
            {message}
          </div>
        )}

        <section className="profile-card">
          <h2 className="profile-card__heading">Tạo tài khoản mới</h2>
          <form className="profile-form" onSubmit={handleCreateSubmit}>
            <div className="profile-form__grid">
              <label className="profile-form__field">
                <span className="profile-form__label">Họ và tên</span>
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
                <span className="profile-form__label">Mật khẩu</span>
                <input
                  className="profile-form__input"
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Vai trò</span>
                <select
                  className="profile-form__input"
                  value={createForm.role}
                  onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="doctor">Bác sĩ</option>
                  <option value="nurse">Điều dưỡng</option>
                  <option value="manager">Quản lý</option>
                  <option value="staff">Nhân viên</option>
                  <option value="pharmacist">Dược sĩ</option>
                </select>
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Số điện thoại</span>
                <input
                  className="profile-form__input"
                  value={createForm.phone}
                  onChange={(event) => setCreateForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Giới tính</span>
                <select
                  className="profile-form__input"
                  value={createForm.gender}
                  onChange={(event) => setCreateForm((current) => ({ ...current, gender: event.target.value }))}
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                  <option value="unknown">Không rõ</option>
                </select>
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Ngày sinh</span>
                <input
                  className="profile-form__input"
                  type="date"
                  value={createForm.dateOfBirth}
                  onChange={(event) => setCreateForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Mã nhân viên</span>
                <input
                  className="profile-form__input"
                  value={createForm.staffCode}
                  onChange={(event) => setCreateForm((current) => ({ ...current, staffCode: event.target.value }))}
                  placeholder="Tự động tạo nếu để trống"
                />
              </label>

              <label className="profile-form__field" style={{ gridColumn: '1 / -1' }}>
                <span className="profile-form__label">Địa chỉ</span>
                <input
                  className="profile-form__input"
                  value={createForm.address}
                  onChange={(event) => setCreateForm((current) => ({ ...current, address: event.target.value }))}
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Chuyên môn</span>
                <input
                  className="profile-form__input"
                  value={createForm.specialty}
                  onChange={(event) => setCreateForm((current) => ({ ...current, specialty: event.target.value }))}
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Chứng chỉ (cách nhau bởi dấu phẩy)</span>
                <input
                  className="profile-form__input"
                  value={createForm.certifications}
                  onChange={(event) => setCreateForm((current) => ({ ...current, certifications: event.target.value }))}
                />
              </label>
            </div>
            <div className="profile-page__actions">
              <button type="submit" className="button button--primary" disabled={submitting}>
                {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </form>
        </section>

        <section className="profile-card">
          <div className="account-toolbar">
            <div>
              <h2 className="profile-card__heading">Danh sách tài khoản</h2>
              <p className="profile-card__empty">Tổng cộng {pagination.total} tài khoản.</p>
            </div>
            <div className="account-filter-row">
              <input
                className="profile-form__input"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Tìm theo tên hoặc email"
              />
              <select className="profile-form__input" name="role" value={filters.role} onChange={handleFilterChange}>
                <option value="">Tất cả vai trò</option>
                <option value="doctor">Bác sĩ</option>
                <option value="nurse">Điều dưỡng</option>
                <option value="caregiver">Người chăm sóc</option>
                <option value="staff">Nhân viên</option>
                <option value="admin">Quản trị</option>
              </select>
              <select className="profile-form__input" name="isActive" value={filters.isActive} onChange={handleFilterChange}>
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Không hoạt động</option>
              </select>
              <button type="button" className="button button--primary" onClick={handleApplyFilters}>
                Lọc
              </button>
              <button type="button" className="button button--secondary" onClick={handleResetFilters}>
                Đặt lại
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner" role="status" aria-live="polite">
              <span className="loading-spinner__ring" aria-hidden="true" />
              <span className="loading-spinner__label">Đang tải danh sách tài khoản...</span>
            </div>
          ) : accounts.length === 0 ? (
            <p className="profile-card__empty">Không tìm thấy tài khoản phù hợp.</p>
          ) : (
            <div className="account-table-wrap">
              <table className="account-table">
                <thead>
                  <tr>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Bị cấm</th>
                    <th>Ngày tạo</th>
                    <th>Thao tác</th>
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
                          {user.isActive ? 'Hoạt động' : 'Không hoạt động'}
                        </span>
                        {user.isBanned && <span className="account-chip account-chip--banned">Bị cấm</span>}
                      </td>
                      <td>{user.isBanned ? 'Có' : 'Không'}</td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="account-actions">
                          <button type="button" className="button button--secondary" onClick={() => handleEditOpen(user)}>
                            Sửa
                          </button>
                          {/* <button type="button" className="button button--primary" onClick={() => handleToggleActive(user)} disabled={submitting}>
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button> */}
                          <button type="button" className={`button ${user.isBanned ? 'button--secondary' : 'button--danger'}`} onClick={() => handleToggleBan(user)} disabled={submitting}>
                            {user.isBanned ? 'Bỏ cấm' : 'Cấm'}
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
              Trước
            </button>
            <span>
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              className="button button--secondary"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadAccounts(pagination.page + 1)}
            >
              Tiếp theo
            </button>
          </div>
        </section>

        {editUser && (
          <section className="profile-card">
            <h2 className="profile-card__heading">Cập nhật tài khoản: {editUser.fullName}</h2>
            <form className="profile-form" onSubmit={handleEditSubmit}>
              <div className="profile-form__grid">
                <label className="profile-form__field">
                  <span className="profile-form__label">Họ và tên</span>
                  <input
                    className="profile-form__input"
                    value={editForm.fullName}
                    onChange={(event) => setEditForm((current) => ({ ...current, fullName: event.target.value }))}
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Số điện thoại</span>
                  <input
                    className="profile-form__input"
                    value={editForm.phone}
                    onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Giới tính</span>
                  <select
                    className="profile-form__input"
                    value={editForm.gender}
                    onChange={(event) => setEditForm((current) => ({ ...current, gender: event.target.value }))}
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                    <option value="unknown">Không rõ</option>
                  </select>
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Vai trò</span>
                  <select
                    className="profile-form__input"
                    value={editForm.role}
                    onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))}
                  >
                    <option value="doctor">Bác sĩ</option>
                    <option value="nurse">Điều dưỡng</option>
                    <option value="manager">Quản lý</option>
                    <option value="staff">Nhân viên</option>
                    <option value="admin">Quản trị</option>
                  </select>
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Địa chỉ</span>
                  <input
                    className="profile-form__input"
                    value={editForm.address}
                    onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))}
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Trạng thái hoạt động</span>
                  <select
                    className="profile-form__input"
                    value={editForm.isActive ? 'true' : 'false'}
                    onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.value === 'true' }))}
                  >
                    <option value="true">Đang hoạt động</option>
                    <option value="false">Không hoạt động</option>
                  </select>
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Trạng thái cấm</span>
                  <select
                    className="profile-form__input"
                    value={editForm.isBanned ? 'true' : 'false'}
                    onChange={(event) => setEditForm((current) => ({ ...current, isBanned: event.target.value === 'true' }))}
                  >
                    <option value="false">Không bị cấm</option>
                    <option value="true">Bị cấm</option>
                  </select>
                </label>

                <label className="profile-form__field" style={{ gridColumn: '1 / -1' }}>
                  <span className="profile-form__label">Lý do cấm</span>
                  <input
                    className="profile-form__input"
                    value={editForm.banReason}
                    onChange={(event) => setEditForm((current) => ({ ...current, banReason: event.target.value }))}
                    placeholder="Nhập lý do nếu cấm tài khoản này"
                  />
                </label>
              </div>
              <div className="profile-page__actions">
                <button type="submit" className="button button--primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button type="button" className="button button--secondary" onClick={() => setEditUser(null)}>
                  Huỷ
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