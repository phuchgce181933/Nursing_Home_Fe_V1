import useAuth from '../../hooks/useAuth';

function DoctorDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="role-dashboard-card">
      <h1>Dashboard Bác sĩ</h1>
      <p>Chào mừng {user?.fullName || 'Bác sĩ'}, bạn đang ở khu vực dành cho <strong>doctor</strong>.</p>
      <div className="role-dashboard-sections">
        <section>
          <h2>Lịch khám hôm nay</h2>
          <p>Xem lịch, cập nhật kết quả khám và quản lý bệnh nhân.</p>
        </section>
        <section>
          <h2>Yêu cầu chăm sóc</h2>
          <p>Nhận yêu cầu từ điều dưỡng và gửi hướng dẫn điều trị.</p>
        </section>
      </div>
    </div>
  );
}

export default DoctorDashboardPage;
