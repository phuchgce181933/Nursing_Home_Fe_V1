import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getCategoryFilterOptions, getSeverityFilterOptions } from '../constants';

function BehaviorListFilters({
  workDate,
  observationCategory,
  severity,
  residentId,
  residents,
  loading,
  maxDate,
  readOnly = false,
  canCreate = true,
  onWorkDateChange,
  onObservationCategoryChange,
  onSeverityChange,
  onResidentIdChange,
  onOpenCreate,
  onReload,
}) {
  const { t } = useTranslation();
  const categoryFilterOptions = useMemo(() => getCategoryFilterOptions(t), [t]);
  const severityFilterOptions = useMemo(() => getSeverityFilterOptions(t), [t]);

  return (
    <div className="resident-page__filters">
      <div className="resident-page__filter-row">
        <label className="resident-page__filter">
          <span>{t('common.date')}</span>
          <input
            type="date"
            max={maxDate}
            value={workDate}
            onChange={(e) => onWorkDateChange(e.target.value)}
          />
        </label>
        <label className="resident-page__filter">
          <span>{t('caregiver.dailyBehaviors.colType')}</span>
          <select value={observationCategory} onChange={(e) => onObservationCategoryChange(e.target.value)}>
            {categoryFilterOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="resident-page__filter">
          <span>{t('caregiver.dailyBehaviors.colSeverity')}</span>
          <select value={severity} onChange={(e) => onSeverityChange(e.target.value)}>
            {severityFilterOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="resident-page__filter">
          <span>{t('common.resident')}</span>
          <select value={residentId} onChange={(e) => onResidentIdChange(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {residents.map((r) => (
              <option key={r._id} value={r._id}>
                {r.fullName || r.residentCode}
              </option>
            ))}
          </select>
        </label>
        <div className="resident-page__filter-actions">
          {!readOnly && canCreate && (
            <button
              type="button"
              className="resident-page__button resident-page__button--primary"
              onClick={onOpenCreate}
            >
              {t('caregiver.dailyBehaviors.addRecord')}
            </button>
          )}
          <button
            type="button"
            className="resident-page__button resident-page__button--ghost"
            disabled={loading}
            onClick={onReload}
          >
            {loading ? t('common.loading') : t('common.reload')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BehaviorListFilters;
