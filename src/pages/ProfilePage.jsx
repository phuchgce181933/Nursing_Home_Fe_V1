import useAuth from '../hooks/useAuth';

function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <div className="card profile-card">
        <h2 className="profile-card__title">Xin chào, {user?.fullName || 'Người dùng'}</h2>
        <p className="profile-card__text">Email: {user?.email}</p>
        <p className="profile-card__text">Vai trò: {user?.role}</p>
        <button className="button button--danger profile-card__logout" onClick={logout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;
