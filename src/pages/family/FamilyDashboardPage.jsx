import useAuth from '../../hooks/useAuth';

function FamilyDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="role-dashboard-card">
      <h1>Trang Gia đình</h1>
      <p>Chào mừng {user?.fullName || 'Gia đình'}, bạn đang ở khu vực dành cho <strong>family</strong>.</p>
      <div className="role-dashboard-sections">
        <section>
          <h2>Hồ sơ người thân</h2>
          <p>Xem tình trạng và hồ sơ cư dân đang được chăm sóc.</p>
        </section>
        <section>
          <h2>Thông báo</h2>
          <p>Nhận tin tức và thông báo quan trọng từ viện dưỡng lão.</p>
        </section>
      </div>
    </div>
  );
}

export default FamilyDashboardPage;
