import RoleDashboard from '../../components/dashboard/RoleDashboard';

const SECTIONS = [
  {
    title: 'Lịch khám hôm nay',
    description: 'Xem lịch, cập nhật kết quả khám và quản lý bệnh nhân.',
  },
  {
    title: 'Yêu cầu chăm sóc',
    description: 'Nhận yêu cầu từ điều dưỡng và gửi hướng dẫn điều trị.',
  },
];

function DoctorDashboardPage() {
  return (
    <RoleDashboard
      title="Dashboard Bác sĩ"
      greeting="Bác sĩ"
      roleLabel="doctor"
      sections={SECTIONS}
    />
  );
}

export default DoctorDashboardPage;
