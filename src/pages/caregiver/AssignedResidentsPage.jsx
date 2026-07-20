import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AssignedResidentsListPage from '../shared/assigned-residents/AssignedResidentsListPage';

export default function CaregiverAssignedResidentsPage() {
  const { t } = useTranslation();
  return (
    <AssignedResidentsListPage
      role="caregiver"
      footer={
        <p className="ar-page__footer-link">
          <Link to="/caregiver/meal-intake-notes">{t('caregiver.assignedResidents.mealIntakeLink')}</Link>{' '}
          {t('caregiver.assignedResidents.footerLink')}
        </p>
      }
    />
  );
}