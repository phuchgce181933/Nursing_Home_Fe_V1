import { useTranslation } from 'react-i18next';
import { formatLocaleDateTime, intakeStatusLabel, mealTypeLabel } from '../../../../utils/nutritionLabels';
import '../../../../styles/caregiver/MealIntakeNotesPage.css';

function MealIntakeRecordsTable({ records, loading, onEdit, onDelete }) {
  const { t, i18n } = useTranslation();

  return (
    <>
      <h3 className="meal-intake-page__section-title">{t('caregiver.mealIntake.recordsList')}</h3>
      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('common.colResident')}</th>
              <th>{t('caregiver.mealIntake.colMeal')}</th>
              <th>{t('caregiver.mealIntake.colDish')}</th>
              <th>{t('caregiver.mealIntake.colStatus')}</th>
              <th>%</th>
              <th>{t('common.colTime')}</th>
              <th>{t('common.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="empty-state">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state">
                  {t('caregiver.mealIntake.emptyFiltered')}
                </td>
              </tr>
            )}
            {!loading &&
              records.map((row) => (
                <tr key={row._id}>
                  <td>{row.residentId?.fullName || row.residentId?.residentCode || '—'}</td>
                  <td>{mealTypeLabel(row.mealType, t)}</td>
                  <td>{row.plannedMealName || '—'}</td>
                  <td>{intakeStatusLabel(row.intakeStatus, t)}</td>
                  <td>{row.intakeStatus === 'partial' ? `${row.portionPercent ?? '—'}%` : '—'}</td>
                  <td>{formatLocaleDateTime(row.recordedAt, i18n.language)}</td>
                  <td className="meal-intake-page__row-actions">
                    <button
                      type="button"
                      className="resident-page__button resident-page__button--ghost"
                      onClick={() => onEdit(row)}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      className="resident-page__button resident-page__button--ghost"
                      onClick={() => onDelete(row)}
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default MealIntakeRecordsTable;
