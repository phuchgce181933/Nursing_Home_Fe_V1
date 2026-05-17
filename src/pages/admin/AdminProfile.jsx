import { Mail, Phone, Shield, Activity, BadgeCheck, UserCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

function AdminProfile() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading || !user) {
    return <LoadingSpinner label="Đang tải hồ sơ..." />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <h1 className="profile-page__title">Hồ sơ quản trị</h1>
        <p className="profile-page__subtitle">Thông tin tài khoản và nhân sự</p>
      </header>

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

        <section className="profile-card">
          <h2 className="profile-card__heading">
            <Activity size={18} />
            Thông tin hệ thống
          </h2>
          <dl className="profile-details">
            <div>
              <dt>User ID</dt>
              <dd>{user._id}</dd>
            </div>
            <div>
              <dt>Ngày tạo</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt>Đăng nhập gần nhất</dt>
              <dd>{formatDate(user.lastLoginAt)}</dd>
            </div>
          </dl>
        </section>

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
        <button type="button" className="button button--primary">
          Cập nhật hồ sơ
        </button>
        <button type="button" className="button button--secondary">
          Đổi mật khẩu
        </button>
        <button type="button" className="button button--danger" onClick={handleLogout}>
          Đăng xuất
        </button>
      </section>
    </div>
  );
}

export default AdminProfile;
