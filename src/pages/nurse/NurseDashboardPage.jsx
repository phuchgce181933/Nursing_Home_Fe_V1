import RoleDashboard from '../../components/dashboard/RoleDashboard';

const SECTIONS = [
  {
    title: 'Ghi chú chăm sóc',
    description: 'Ghi cập nhật tình trạng, thuốc và các công việc điều dưỡng.',
  },
  {
    title: 'Đang theo dõi',
    description: 'Quản lý người bệnh, giường và lịch trình chăm sóc hàng ngày.',
  },
];

function NurseDashboardPage() {
  return (
    <RoleDashboard
      title="Dashboard Điều dưỡng"
      greeting="Điều dưỡng"
      roleLabel="nurse"
      sections={SECTIONS}
    />
  );
}

export default NurseDashboardPage;
