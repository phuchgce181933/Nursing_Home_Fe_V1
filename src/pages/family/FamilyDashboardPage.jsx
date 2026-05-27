import RoleDashboard from '../../components/dashboard/RoleDashboard';

const SECTIONS = [
  {
    title: 'Hồ sơ người thân',
    description: 'Xem tình trạng và hồ sơ cư dân đang được chăm sóc.',
  },
  {
    title: 'Thông báo',
    description: 'Nhận tin tức và thông báo quan trọng từ viện dưỡng lão.',
  },
];

function FamilyDashboardPage() {
  return (
    <RoleDashboard
      title="Trang Gia đình"
      greeting="Gia đình"
      roleLabel="family"
      sections={SECTIONS}
    />
  );
}

export default FamilyDashboardPage;
