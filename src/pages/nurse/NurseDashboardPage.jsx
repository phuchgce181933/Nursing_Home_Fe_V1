import useAuth from '../../hooks/useAuth';

function NurseDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="role-dashboard-card">
      <h1>Dashboard Điều dưỡng</h1>
      <p>Chào mừng {user?.fullName || 'Điều dưỡng'}, bạn đang ở khu vực dành cho <strong>nurse</strong>.</p>
      <div className="role-dashboard-sections">
        <section>
          <h2>Ghi chú chăm sóc</h2>
          <p>Ghi cập nhật tình trạng, thuốc và các công việc điều dưỡng.</p>
        </section>
        <section>
          <h2>Đang theo dõi</h2>
          <p>Quản lý người bệnh, giường và lịch trình chăm sóc hàng ngày.</p>
        </section>
      </div>
    </div>
  );
}

export default NurseDashboardPage;
