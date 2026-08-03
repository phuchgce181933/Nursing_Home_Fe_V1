import { useTranslation } from 'react-i18next';

function PlaceholderPage({ title }) {
  const { t } = useTranslation();
  return (
    <div className="role-dashboard-card">
      <h1>{title}</h1>
      <p>{t('common.placeholderBody')}</p>
    </div>
  );
}

export default PlaceholderPage;
