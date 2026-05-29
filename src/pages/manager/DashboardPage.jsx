import '../../styles/admin/DashboardPage.css';

export default function ManagerDashboardPage() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <h1 className="dashboard-page__title">Bảng điều khiển quản lý</h1>
        <p className="dashboard-page__subtitle">
          Vận hành cư dân, phân công nhân sự và theo dõi ca làm việc.
        </p>
      </div>

      <div className="dashboard-page__grid">
        <div className="dashboard-card">
          <div className="dashboard-card__title">Cư dân đang điều trị</div>
          <div className="dashboard-card__value">—</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card__title">Nhân viên vận hành</div>
          <div className="dashboard-card__value">—</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card__title">Ca hôm nay</div>
          <div className="dashboard-card__value">—</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card__title">Đơn nghỉ chờ duyệt</div>
          <div className="dashboard-card__value">—</div>
        </div>
      </div>
    </div>
  );
}
