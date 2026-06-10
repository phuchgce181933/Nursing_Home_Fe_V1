import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function ScheduleFilters({
  workDate,
  status,
  residentId,
  residents,
  loading,
  onWorkDateChange,
  onStatusChange,
  onResidentIdChange,
  onReload,
}) {
  const { t } = useTranslation();

  const statusOptions = useMemo(
    () => [
      { value: '', label: t('common.all') },
      { value: 'pending', label: t('common.careTaskStatus.pending') },
      { value: 'in_progress', label: t('common.careTaskStatus.in_progress') },
      { value: 'completed', label: t('common.careTaskStatus.completed') },
      { value: 'skipped', label: t('common.careTaskStatus.skipped') },
      { value: 'missed', label: t('common.careTaskStatus.missed') },
    ],
    [t]
  );

  return (
    <div className="resident-page__filters">
      <div className="resident-page__filter-row">
        <label className="resident-page__filter">
          <span>{t('common.date')} *</span>
          <input
            type="date"
            required
            value={workDate}
            onChange={(e) => onWorkDateChange(e.target.value)}
          />
        </label>
        <label className="resident-page__filter">
          <span>{t('common.status')}</span>
          <select value={status} onChange={(e) => onStatusChange(e.target.value)}>
            {statusOptions.map((o) => (
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

export default ScheduleFilters;
