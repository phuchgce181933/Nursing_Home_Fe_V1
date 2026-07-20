import { useTranslation } from 'react-i18next';
import { formatLocaleDateTime } from '../../../../utils/nutritionLabels';
import {
  completionStatusLabel,
  hygieneActivityLabel,
  hygieneCategoryLabel,
} from '../../../../utils/hygieneLabels';

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

function HygieneRecordsTable({
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
  const colCount = 5 + (showRecordedBy ? 1 : 0) + (showActionsCol ? 1 : 0);
  const listTitle = recordsListTitle || t('caregiver.hygiene.recordsList');
  const emptyText = emptyMessage || t('caregiver.hygiene.emptyFiltered');
  const recordedByHeader = colRecordedByLabel || t('admin.hygiene.colRecordedBy');

  return (
    <>
      <h3 className="hygiene-page__section-title">{listTitle}</h3>
      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('common.colResident')}</th>
              <th>{t('caregiver.hygiene.colCategory')}</th>
              <th>{t('caregiver.hygiene.colActivity')}</th>
              <th>{t('caregiver.hygiene.colResult')}</th>
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
                  <td>{hygieneCategoryLabel(row.activityCategory, t)}</td>
                  <td>{hygieneActivityLabel(row.activityType, t)}</td>
                  <td>
                    <span className={`hygiene-page__status hygiene-page__status--${row.completionStatus}`}>
                      {completionStatusLabel(row.completionStatus, t)}
                    </span>
                  </td>
                  <td>{formatLocaleDateTime(row.recordedAt, i18n.language)}</td>
                  {showRecordedBy && <td>{recordedByLabel(row)}</td>}
                  {showActionsCol && (
                    <td className="hygiene-page__row-actions">
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

export default HygieneRecordsTable;
