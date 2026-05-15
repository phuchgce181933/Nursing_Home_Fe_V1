import '../../styles/admin/DashboardPage.css';

function DashboardPage() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <h1 className="dashboard-page__title">Admin Dashboard</h1>
        <p className="dashboard-page__subtitle">Welcome to the admin dashboard.</p>
      </div>
      
      <div className="dashboard-page__grid">
        <div className="dashboard-card">
          <div className="dashboard-card__title">Total Residents</div>
          <div className="dashboard-card__value">24</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card__title">Active Staff</div>
          <div className="dashboard-card__value">8</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card__title">Appointments Today</div>
          <div className="dashboard-card__value">5</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card__title">Care Notes</div>
          <div className="dashboard-card__value">42</div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;