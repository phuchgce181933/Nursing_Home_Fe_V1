import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Shield, UserCircle } from 'lucide-react';
import authService from '../services/auth.service';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

const initialProfileForm = {
  fullName: '',
  phone: '',
  gender: 'unknown',
  address: '',
  dateOfBirth: '',
};

const initialPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || '',
        phone: user.phone || '',
        gender: user.gender || 'unknown',
        address: user.address || '',
        dateOfBirth: toDateInput(user.dateOfBirth),
      });
    }
  }, [user]);

  if (!user) {
    return <LoadingSpinner label="Đang tải hồ sơ..." />;
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      await authService.updateProfile(profileForm);
      await refreshUser();
      setMessageType('success');
      setMessage('Cập nhật hồ sơ thành công.');
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessageType('error');
      setMessage('Xác nhận mật khẩu không khớp.');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setMessageType('success');
      setMessage('Đổi mật khẩu thành công.');
      setPasswordForm(initialPasswordForm);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Không thể đổi mật khẩu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="profile-page" style={{ width: '100%', maxWidth: 1120 }}>
        <header className="profile-page__header">
          <h1 className="profile-page__title">Hồ sơ người dùng</h1>
          <p className="profile-page__subtitle">Xem và cập nhật thông tin tài khoản của bạn.</p>
        </header>

        {message && (
          <div className={`message ${messageType === 'success' ? 'message--success' : 'message--error'}`}>
            {message}
          </div>
        )}

        <div className="profile-page__grid">
          <section className="profile-card profile-card--accent">
            <UserCircle size={72} className="profile-card__avatar" />
            <h2 className="profile-card__name">{user.fullName}</h2>
            <span className="profile-card__role">{user.role?.toUpperCase()}</span>
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
                <span>{user.gender || 'unknown'}</span>
              </li>
            </ul>
            <p className="profile-card__empty">Ngày tạo: {formatDate(user.createdAt)}</p>
            <p className="profile-card__empty">Lần đăng nhập gần nhất: {formatDate(user.lastLoginAt)}</p>
          </section>

          <section className="profile-card">
            <h2 className="profile-card__heading">Cập nhật hồ sơ</h2>
            <form className="profile-form" onSubmit={handleProfileSubmit}>
              <div className="profile-form__grid">
                <label className="profile-form__field">
                  <span className="profile-form__label">Họ và tên</span>
                  <input
                    className="profile-form__input"
                    value={profileForm.fullName}
                    onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))}
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Số điện thoại</span>
                  <input
                    className="profile-form__input"
                    value={profileForm.phone}
                    onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Giới tính</span>
                  <select
                    className="profile-form__input"
                    value={profileForm.gender}
                    onChange={(event) => setProfileForm((current) => ({ ...current, gender: event.target.value }))}
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
                    value={profileForm.dateOfBirth}
                    onChange={(event) => setProfileForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                  />
                </label>

                <label className="profile-form__field" style={{ gridColumn: '1 / -1' }}>
                  <span className="profile-form__label">Địa chỉ</span>
                  <input
                    className="profile-form__input"
                    value={profileForm.address}
                    onChange={(event) => setProfileForm((current) => ({ ...current, address: event.target.value }))}
                  />
                </label>
              </div>
              <div className="profile-page__actions">
                <button type="submit" className="button button--primary" disabled={isSaving}>
                  {isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
                </button>
              </div>
            </form>
          </section>

          <section className="profile-card">
            <h2 className="profile-card__heading">Đổi mật khẩu</h2>
            <form className="profile-form" onSubmit={handlePasswordSubmit}>
              <div className="profile-form__grid">
                <label className="profile-form__field" style={{ gridColumn: '1 / -1' }}>
                  <span className="profile-form__label">Mật khẩu hiện tại</span>
                  <input
                    className="profile-form__input"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                    required
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Mật khẩu mới</span>
                  <input
                    className="profile-form__input"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                    required
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Xác nhận mật khẩu mới</span>
                  <input
                    className="profile-form__input"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    required
                  />
                </label>
              </div>
              <div className="profile-page__actions">
                <button type="submit" className="button button--primary" disabled={isSaving}>
                  {isSaving ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                </button>
                <button type="button" className="button button--secondary" onClick={() => navigate('/forgot-password')}>
                  Quên mật khẩu
                </button>
                <button type="button" className="button button--danger" onClick={logout}>
                  Đăng xuất
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
