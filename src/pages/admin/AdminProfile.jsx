import { useEffect, useState } from 'react';
import { Mail, Phone, Shield, Activity, BadgeCheck, UserCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

function AdminProfile() {
  const { user, loading, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({ fullName: '', phone: '', gender: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        phone: user.phone || '',
        gender: user.gender || '',
      });
    }
  }, [user]);

  if (loading || !user) {
    return <LoadingSpinner label="Đang tải hồ sơ..." />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updateProfile(formData);
      setMessage('Cập nhật hồ sơ thành công.');
      setEditMode(false);
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Cập nhật hồ sơ thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <h1 className="profile-page__title">Hồ sơ quản trị</h1>
        <p className="profile-page__subtitle">Thông tin tài khoản và nhân sự</p>
      </header>

      {message && <div className="profile-page__message">{message}</div>}

      <div className="profile-page__grid">
        <section className="profile-card profile-card--accent">
          <UserCircle size={72} className="profile-card__avatar" />
          <h2 className="profile-card__name">{user.fullName}</h2>
          <span className="profile-card__role">{user.role?.toUpperCase()}</span>
          <p className={`profile-card__status ${user.isActive ? 'is-active' : 'is-inactive'}`}>
            <BadgeCheck size={16} />
            {user.isActive ? 'Tài khoản đang hoạt động' : 'Tài khoản không hoạt động'}
          </p>

          <ul className="profile-card__list">
            <li>
              <Mail size={16} />
              <span>{user.email}</span>
            </li>
            <li>
              <Phone size={16} />
              <span>{user.phone || '—'}</span>
            </li>
            <li>
              <Shield size={16} />
              <span>Giới tính: {user.gender || '—'}</span>
            </li>
          </ul>
        </section>

        {!editMode ? (
          <section className="profile-card">
            <h2 className="profile-card__heading">
              <Activity size={18} />
              Thông tin sửa đổi
            </h2>
            <p>Nhấn nút “Cập nhật hồ sơ” để chỉnh sửa thông tin.</p>
          </section>
        ) : (
          <section className="profile-card profile-form-card">
            <h2 className="profile-card__heading">
              <Activity size={18} />
              Sửa thông tin
            </h2>

            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="profile-form__field">
                <label className="profile-form__label" htmlFor="fullName">
                  Họ và tên
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="profile-form__input"
                  required
                />
              </div>

              <div className="profile-form__field">
                <label className="profile-form__label" htmlFor="phone">
                  Số điện thoại
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={handleChange}
                  className="profile-form__input"
                />
              </div>

              <div className="profile-form__field">
                <label className="profile-form__label" htmlFor="gender">
                  Giới tính
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="profile-form__input"
                >
                  <option value="">Chọn giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div className="profile-form__actions">
                <button type="submit" className="button button--primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => {
                    setFormData({ fullName: user.fullName || '', phone: user.phone || '', gender: user.gender || '' });
                    setMessage('');
                    setEditMode(false);
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="profile-card">
          <h2 className="profile-card__heading">Hồ sơ nhân sự</h2>
          {user.staffProfile ? (
            <dl className="profile-details">
              <div>
                <dt>Mã nhân viên</dt>
                <dd>{user.staffProfile.staffCode}</dd>
              </div>
              <div>
                <dt>Nhóm vai trò</dt>
                <dd>{user.staffProfile.roleCategory}</dd>
              </div>
              <div>
                <dt>Chuyên môn</dt>
                <dd>{user.staffProfile.specialty || '—'}</dd>
              </div>
              <div>
                <dt>Khu vực phụ trách</dt>
                <dd>{user.staffProfile.responsibleAreaIds?.length || 0} khu vực</dd>
              </div>
              <div>
                <dt>Cư dân được giao</dt>
                <dd>{user.staffProfile.assignedResidentIds?.length || 0} người</dd>
              </div>
            </dl>
          ) : (
            <p className="profile-card__empty">Chưa có hồ sơ nhân sự.</p>
          )}
        </section>
      </div>

      <section className="profile-page__actions">
        {!editMode && (
          <button type="button" className="button button--primary" onClick={() => setEditMode(true)}>
            Cập nhật hồ sơ
          </button>
        )}
        {editMode && (
          <button type="button" className="button button--secondary" onClick={() => setEditMode(false)}>
            Hủy chỉnh sửa
          </button>
        )}
        <button type="button" className="button button--danger" onClick={handleLogout}>
          Đăng xuất
        </button>
      </section>
    </div>
  );
}

export default AdminProfile;
