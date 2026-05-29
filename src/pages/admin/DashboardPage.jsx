import '../../styles/admin/DashboardPage.css';
import { useTranslation } from 'react-i18next';

function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <h1 className="dashboard-page__title">{t('dashboard.title')}</h1>
        <p className="dashboard-page__subtitle">{t('dashboard.subtitle')}</p>
      </div>
      
      <div className="dashboard-page__grid">
        <div className="dashboard-card">
          <div className="dashboard-card__title">{t('dashboard.cards.totalResidents')}</div>
          <div className="dashboard-card__value">24</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card__title">{t('dashboard.cards.activeStaff')}</div>
          <div className="dashboard-card__value">8</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card__title">{t('dashboard.cards.appointmentsToday')}</div>
          <div className="dashboard-card__value">5</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card__title">{t('dashboard.cards.careNotes')}</div>
          <div className="dashboard-card__value">42</div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;