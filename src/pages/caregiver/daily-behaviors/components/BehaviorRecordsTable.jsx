import { useTranslation } from 'react-i18next';
import { formatLocaleDateTime } from '../../../../utils/nutritionLabels';
import {
  behaviorTypeLabel,
  moodLevelLabel,
  observationCategoryLabel,
  severityLabel,
} from '../../../../utils/behaviorLabels';

function detailText(row, t) {
  if (row.observationCategory === 'mood' && row.moodLevel) {
    return moodLevelLabel(row.moodLevel, t);
  }
  if (row.behaviorType) {
    return behaviorTypeLabel(row.behaviorType, t);
  }
  if (row.notes) {
    const short = row.notes.length > 48 ? `${row.notes.slice(0, 48)}…` : row.notes;
    return short;
  }
  return '—';
}

function BehaviorRecordsTable({ records, loading, onEdit, onDelete }) {
  const { t, i18n } = useTranslation();

  return (
    <>
      <h3 className="behavior-page__section-title">{t('caregiver.dailyBehaviors.recordsList')}</h3>
      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('common.colResident')}</th>
              <th>{t('caregiver.dailyBehaviors.colType')}</th>
              <th>{t('caregiver.dailyBehaviors.colDetail')}</th>
              <th>{t('caregiver.dailyBehaviors.colSeverity')}</th>
              <th>{t('caregiver.dailyBehaviors.colObservedAt')}</th>
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
                  {t('caregiver.dailyBehaviors.emptyFiltered')}
                </td>
              </tr>
            )}
            {!loading &&
              records.map((row) => (
                <tr key={row._id}>
                  <td>{row.residentId?.fullName || row.residentId?.residentCode || '—'}</td>
                  <td>
                    <span className={`behavior-page__category behavior-page__category--${row.observationCategory}`}>
                      {observationCategoryLabel(row.observationCategory, t)}
                    </span>
                  </td>
                  <td>
                    <span className="behavior-page__detail">{detailText(row, t)}</span>
                  </td>
                  <td>
                    <span className={`behavior-page__severity behavior-page__severity--${row.severity || 'normal'}`}>
                      {severityLabel(row.severity, t)}
                    </span>
                  </td>
                  <td>{formatLocaleDateTime(row.observedAt, i18n.language)}</td>
                  <td className="behavior-page__row-actions">
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

export default BehaviorRecordsTable;
