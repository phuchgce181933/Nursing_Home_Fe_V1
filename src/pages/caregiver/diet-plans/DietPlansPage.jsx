import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminPageShell from '../../../components/admin/AdminPageShell';
import ListPagination from '../../../components/ui/ListPagination';
import useClientPagination from '../../../hooks/useClientPagination';
import useDebouncedSearch from '../../../hooks/useDebouncedSearch';
import caregiverDietPlanService from '../../../services/caregiverDietPlan.service';
import { resolveApiError } from '../../../utils/apiMessage';
import { getLocalDateString } from '../../../utils/dateUtils';
import { formatLocaleDate } from '../../../utils/nutritionLabels';
import '../../../styles/caregiver/DietPlansPage.css';
import DietPlanDetailModal from './components/DietPlanDetailModal';

const today = () => getLocalDateString();

function StatusCell({ ok }) {
  return <span className={ok ? 'diet-plans-page__status-yes' : 'diet-plans-page__status-no'}>{ok ? '✓' : '—'}</span>;
}

function DietPlansPage() {
  const { t, i18n } = useTranslation();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const [workDate, setWorkDate] = useState(today());
  const [residentId, setResidentId] = useState('');
  const [residents, setResidents] = useState([]);
  const [rows, setRows] = useState([]);
  const [dayMeta, setDayMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const loadResidents = async () => {
    try {
      const res = await caregiverDietPlanService.listResidents();
      setResidents(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(resolveApiError(e, t, 'caregiver.dietPlans.loadFailed'));
    }
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await caregiverDietPlanService.listOverview({
        workDate,
        residentId: residentId || undefined,
        search: debouncedSearch.trim() || undefined,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setDayMeta({
        hasPublishedMealPlanDay: res.hasPublishedMealPlanDay,
        hasPublishedSpecialDietDay: res.hasPublishedSpecialDietDay,
        mealPlanDayTitle: res.mealPlanDayTitle,
        specialDietDayTitle: res.specialDietDayTitle,
      });
    } catch (e) {
      setError(resolveApiError(e, t, 'caregiver.dietPlans.loadFailed'));
      setRows([]);
      setDayMeta(null);
    } finally {
      setLoading(false);
    }
  }, [workDate, residentId, debouncedSearch, t]);

  useEffect(() => {
    loadResidents();
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const {
    paginatedItems: paginatedRows,
    page,
    setPage,
    totalPages,
    total,
  } = useClientPagination(rows);

  const openDetail = async (rid) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setError('');
    try {
      const data = await caregiverDietPlanService.getResidentPlan(rid, { workDate });
      setDetail(data);
    } catch (e) {
      setError(resolveApiError(e, t, 'caregiver.dietPlans.detailLoadFailed'));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
  };

  return (
    <AdminPageShell title={t('caregiver.dietPlans.title')} subtitle={t('caregiver.dietPlans.subtitle')}>
      {error && <div className="resident-page__error">{error}</div>}

      <div className="resident-page__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t('common.date')}</span>
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </label>
          <label className="resident-page__filter">
            <span>{t('common.resident')}</span>
            <select value={residentId} onChange={(e) => setResidentId(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {residents.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.fullName || r.residentCode}
                </option>
              ))}
            </select>
          </label>
          <label className="resident-page__filter">
            <span>{t('common.search')}</span>
            <input
              type="search"
              placeholder={t('common.searchResidentPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
      </div>

      {dayMeta && (
        <p className="diet-plans-page__day-banner">
          {t('caregiver.dietPlans.dayBanner', { date: formatLocaleDate(workDate, i18n.language) })}{' '}
          {dayMeta.hasPublishedMealPlanDay
            ? t('caregiver.dietPlans.hasMealPlan', {
                title: dayMeta.mealPlanDayTitle ? ` (${dayMeta.mealPlanDayTitle})` : '',
              })
            : t('caregiver.dietPlans.noMealPlan')}
          {' · '}
          {dayMeta.hasPublishedSpecialDietDay
            ? t('caregiver.dietPlans.hasSpecialDiet', {
                title: dayMeta.specialDietDayTitle ? ` (${dayMeta.specialDietDayTitle})` : '',
              })
            : t('caregiver.dietPlans.noSpecialDiet')}
        </p>
      )}

      <h3 className="diet-plans-page__section-title">{t('caregiver.dietPlans.assignedResidents')}</h3>
      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('common.colResident')}</th>
              <th>{t('caregiver.dietPlans.colMealPlan')}</th>
              <th>{t('caregiver.dietPlans.colSpecialDiet')}</th>
              <th>{t('caregiver.dietPlans.colMealTimes')}</th>
              <th>{t('caregiver.dietPlans.colAllergies')}</th>
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
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  {t('caregiver.dietPlans.emptyFiltered')}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedRows.map((row) => (
                <tr key={row.residentId}>
                  <td>
                    <div>{row.fullName || '—'}</div>
                    <div className="diet-plans-page__meal-meta">{row.residentCode || ''}</div>
                  </td>
                  <td>
                    <StatusCell ok={row.hasMealPlan} />
                    {row.hasMealPlan && (
                      <span className="diet-plans-page__meal-meta">
                        {' '}
                        ({t('caregiver.common.mealCount', { count: row.mealPlanMealCount })})
                      </span>
                    )}
                  </td>
                  <td>
                    <StatusCell ok={row.hasSpecialDiet} />
                    {row.hasSpecialDiet && (
                      <span className="diet-plans-page__meal-meta"> ({row.specialDietCount})</span>
                    )}
                  </td>
                  <td>
                    <StatusCell ok={row.hasMealTimeSchedule} />
                  </td>
                  <td>
                    {row.allergies?.length > 0 ? (
                      <span className="diet-plans-page__allergies">{row.allergies.join(', ')}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="diet-plans-page__row-actions">
                    <button
                      type="button"
                      className="resident-page__button resident-page__button--ghost"
                      onClick={() => openDetail(row.residentId)}
                    >
                      {t('common.viewDetails')}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <ListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      )}

      <DietPlanDetailModal
        open={detailOpen}
        loading={detailLoading}
        detail={detail}
        workDate={workDate}
        onClose={closeDetail}
      />
    </AdminPageShell>
  );
}

export default DietPlansPage;
