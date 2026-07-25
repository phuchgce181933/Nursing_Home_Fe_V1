import { useTranslation } from 'react-i18next';
import { formatLocaleDateTime, intakeStatusLabel, mealTypeLabel } from '../../../../utils/nutritionLabels';
import '../../../../styles/caregiver/MealIntakeNotesPage.css';

function recordedByLabel(row) {
  return (
    row.recordedByStaffId?.userId?.fullName ||
    row.recordedByStaffId?.staffCode ||
    '—'
  );
}

function isOwnRecord(row, currentUserId) {
  if (!currentUserId) return true;
  const recorderUserId = row.recordedByStaffId?.userId?._id || row.recordedByStaffId?.userId;
  return String(recorderUserId || '') === String(currentUserId);
}

function MealIntakeRecordsTable({
  records,
  loading,
  onEdit,
  onDelete,
  readOnly = false,
  canMutate = true,
  showRecordedBy = false,
  currentUserId,
  recordsListTitle,
  colRecordedByLabel,
  emptyMessage,
}) {
  const { t, i18n } = useTranslation();
  const showActionsCol = !readOnly && canMutate;
  const colCount = 6 + (showRecordedBy ? 1 : 0) + (showActionsCol ? 1 : 0);
  const listTitle = recordsListTitle || t('caregiver.mealIntake.recordsList');
  const emptyText = emptyMessage || t('caregiver.mealIntake.emptyFiltered');
  const recordedByHeader = colRecordedByLabel || t('admin.mealIntake.colRecordedBy');

  return (
    <>
      <h3 className="meal-intake-page__section-title">{listTitle}</h3>
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
              {showRecordedBy && <th>{recordedByHeader}</th>}
              {showActionsCol && <th>{t('common.colActions')}</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={colCount} className="empty-state">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={colCount} className="empty-state">
                  {emptyText}
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
                  {showRecordedBy && <td>{recordedByLabel(row)}</td>}
                  {showActionsCol && (
                    <td className="meal-intake-page__row-actions">
                      {isOwnRecord(row, currentUserId) ? (
                        <>
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
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default MealIntakeRecordsTable;
