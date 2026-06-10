import { useTranslation } from 'react-i18next';
import { formatVNDateTime } from '../../../../utils/nutritionLabels';
import {
  completionStatusLabel,
  hygieneActivityLabel,
  hygieneCategoryLabel,
} from '../../../../utils/hygieneLabels';

function HygieneRecordsTable({ records, loading, onEdit, onDelete }) {
  const { t } = useTranslation();

  return (
    <>
      <h3 className="hygiene-page__section-title">{t('caregiver.hygiene.recordsList')}</h3>
      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('common.colResident')}</th>
              <th>{t('caregiver.hygiene.colCategory')}</th>
              <th>{t('caregiver.hygiene.colActivity')}</th>
              <th>{t('caregiver.hygiene.colResult')}</th>
              <th>{t('common.colTime')}</th>
              <th>{t('common.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="empty-state">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  {t('caregiver.hygiene.emptyFiltered')}
                </td>
              </tr>
            )}
            {!loading &&
              records.map((row) => (
                <tr key={row._id}>
                  <td>{row.residentId?.fullName || row.residentId?.residentCode || '—'}</td>
                  <td>{hygieneCategoryLabel(row.activityCategory)}</td>
                  <td>{hygieneActivityLabel(row.activityType)}</td>
                  <td>
                    <span className={`hygiene-page__status hygiene-page__status--${row.completionStatus}`}>
                      {completionStatusLabel(row.completionStatus)}
                    </span>
                  </td>
                  <td>{formatVNDateTime(row.recordedAt)}</td>
                  <td className="hygiene-page__row-actions">
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

export default HygieneRecordsTable;
