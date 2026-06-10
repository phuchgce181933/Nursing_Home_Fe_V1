import { useTranslation } from 'react-i18next';

function MealIntakeListFilters({
  workDate,
  residentId,
  residents,
  loading,
  maxDate,
  onWorkDateChange,
  onResidentIdChange,
  onOpenCreate,
  onReload,
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="resident-page__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t('common.date')}</span>
            <input type="date" max={maxDate} value={workDate} onChange={(e) => onWorkDateChange(e.target.value)} />
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
              className="resident-page__button resident-page__button--primary"
              onClick={onOpenCreate}
            >
              {t('caregiver.mealIntake.addRecord')}
            </button>
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
    </>
  );
}

export default MealIntakeListFilters;
