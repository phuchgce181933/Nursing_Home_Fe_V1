import { Link } from 'react-router-dom';
import RoleDashboard from '../../components/dashboard/RoleDashboard';

const SECTIONS = [
  {
    title: 'Cư dân phụ trách',
    description: (
      <>
        Xem danh sách người cao tuổi được quản lý phân công cho bạn.{' '}
        <Link to="/caregiver/assigned-residents">Mở danh sách cư dân</Link>
      </>
    ),
  },
  {
    title: 'Lịch chăm sóc hằng ngày',
    description: (
      <>
        Xem nhiệm vụ và giờ thực hiện, cập nhật trạng thái khi làm việc.{' '}
        <Link to="/caregiver/daily-care-schedule">Mở lịch chăm sóc</Link>
      </>
    ),
  },
  {
    title: 'Ghi nhận bữa ăn',
    description: (
      <>
        Ghi tình trạng ăn uống sau mỗi bữa cho cư dân phụ trách.{' '}
        <Link to="/caregiver/meal-intake-notes">Mở ghi nhận bữa ăn</Link>
      </>
    ),
  },
  {
    title: 'Chế độ ăn uống',
    description: (
      <>
        Xem thực đơn và chế độ ăn đặc biệt đã publish cho từng cư dân.{' '}
        <Link to="/caregiver/diet-plans">Mở chế độ ăn</Link>
      </>
    ),
  },
  {
    title: 'Lịch phục hồi chức năng',
    description: (
      <>
        Xem lịch trị liệu / PHCN để hỗ trợ đưa đón đúng giờ.{' '}
        <Link to="/caregiver/rehabilitation-schedule">Mở lịch phục hồi</Link>
      </>
    ),
  },
  {
    title: 'Hoạt động vệ sinh',
    description: (
      <>
        Ghi nhận vệ sinh cá nhân và dọn dẹp phòng cho cư dân.{' '}
        <Link to="/caregiver/hygiene-activities">Mở ghi nhận vệ sinh</Link>
      </>
    ),
  },
  {
    title: 'Hành vi hằng ngày',
    description: (
      <>
        Ghi nhận tâm trạng, hành vi hoặc biểu hiện bất thường trong ngày.{' '}
        <Link to="/caregiver/daily-behaviors">Mở ghi nhận hành vi</Link>
      </>
    ),
  },
];

function CaregiverDashboardPage() {
  return (
    <RoleDashboard
      title="Dashboard Caregiver"
      greeting="Caregiver"
      roleLabel="caregiver"
      sections={SECTIONS}
    />
  );
}

export default CaregiverDashboardPage;
