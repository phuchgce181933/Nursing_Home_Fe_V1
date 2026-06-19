import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminPageShell from '../../components/admin/AdminPageShell';
import ListPagination from '../../components/ui/ListPagination';
import useClientPagination from '../../hooks/useClientPagination';
import useDebouncedSearch from '../../hooks/useDebouncedSearch';
import nutritionReportService from '../../services/nutritionReport.service';
import { getLocalDateString } from '../../utils/dateUtils';
import {
  dietTypeLabel,
  formatLocaleDate,
  formatLocaleDateTime,
  intakeStatusLabel,
  mealTypeLabel,
} from '../../utils/nutritionLabels';
import '../../styles/nurse/NutritionReportsPage.css';

const today = () => getLocalDateString();
const addDays = (dateStr, delta) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return getLocalDateString(d);
};

function NutritionReportsPage() {
  const { t, i18n } = useTranslation();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const [to, setTo] = useState(today());
  const [from, setFrom] = useState(addDays(today(), -6));
  const [missingOnly, setMissingOnly] = useState(false);
  const [summary, setSummary] = useState(null);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const queryParams = useCallback(
    () => ({
      from,
      to,
      search: debouncedSearch.trim() || undefined,
      missingMealPlan: missingOnly ? 'true' : undefined,
      limit: 100,
    }),
    [from, to, debouncedSearch, missingOnly]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, listRes] = await Promise.all([
        nutritionReportService.getSummary({ from, to }),
        nutritionReportService.listResidents(queryParams()),
      ]);
      setSummary(summaryRes || null);
      setResidents(Array.isArray(listRes?.data) ? listRes.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || t('nurse.nutritionReports.loadFailed'));
      setSummary(null);
      setResidents([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, queryParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const {
    paginatedItems: paginatedResidents,
    page,
    setPage,
    totalPages,
    total,
  } = useClientPagination(residents);

  const setLast7Days = () => {
    const end = today();
    setTo(end);
    setFrom(addDays(end, -6));
  };

  const setTodayOnly = () => {
    const d = today();
    setFrom(d);
    setTo(d);
  };

  const openDetail = async (residentId) => {
    setDetailLoading(true);
    setError('');
    try {
      const data = await nutritionReportService.getResidentReport(residentId, { from, to });
      setDetail(data);
    } catch (e) {
      setError(e?.response?.data?.message || t('nurse.nutritionReports.detailLoadFailed'));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setDetail(null);

  const StatusCell = ({ ok }) => (
    <span className={ok ? 'nutrition-reports__status-yes' : 'nutrition-reports__status-no'}>
      {ok ? '✓' : '—'}
    </span>
  );

  return (
    <AdminPageShell title={t('nurse.nutritionReports.title')} subtitle={t('nurse.nutritionReports.subtitle')}>
      {error && <div className="resident-page__error">{error}</div>}

      <div className="resident-page__filters nutrition-reports__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t('nurse.nutritionReports.fromDate')}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="resident-page__filter">
            <span>{t('nurse.nutritionReports.toDate')}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="resident-page__filter">
            <span>{t('nurse.nutritionReports.searchResident')}</span>
            <input
              type="search"
              placeholder={t('common.searchNameOrCode')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="resident-page__filter nutrition-reports__checkbox-filter">
            <span>{t('nurse.nutritionReports.missingMealPlanOnly')}</span>
            <input
              type="checkbox"
              checked={missingOnly}
              onChange={(e) => setMissingOnly(e.target.checked)}
            />
          </label>
          <div className="resident-page__filter-actions">
            <button type="button" className="resident-page__button resident-page__button--ghost" onClick={setLast7Days}>
              {t('nurse.nutritionReports.last7Days')}
            </button>
            <button type="button" className="resident-page__button resident-page__button--ghost" onClick={setTodayOnly}>
              {t('nurse.nutritionReports.todayOnly')}
            </button>
            <button
              type="button"
              className="resident-page__button resident-page__button--primary"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? t('common.loading') : t('common.reload')}
            </button>
          </div>
        </div>
      </div>

      {summary && (
        <div className="nutrition-reports__kpi-grid">
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.totalAdmittedResidents ?? 0}</div>
            <div className="nutrition-reports__kpi-label">{t('nurse.nutritionReports.kpiAdmitted')}</div>
          </div>
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.residentsWithMealPlan ?? 0}</div>
            <div className="nutrition-reports__kpi-label">{t('nurse.nutritionReports.kpiWithMealPlan')}</div>
          </div>
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.residentsWithSpecialDiet ?? 0}</div>
            <div className="nutrition-reports__kpi-label">{t('nurse.nutritionReports.kpiWithSpecialDiet')}</div>
          </div>
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.residentsWithMealTimeSchedule ?? 0}</div>
            <div className="nutrition-reports__kpi-label">{t('nurse.nutritionReports.kpiWithMealTime')}</div>
          </div>
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.totalMealIntakeRecords ?? 0}</div>
            <div className="nutrition-reports__kpi-label">{t('nurse.nutritionReports.kpiIntakeRecords')}</div>
          </div>
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.residentsWithMealIntake ?? 0}</div>
            <div className="nutrition-reports__kpi-label">{t('nurse.nutritionReports.kpiWithIntake')}</div>
          </div>
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.totalMealNotes ?? 0}</div>
            <div className="nutrition-reports__kpi-label">{t('nurse.nutritionReports.kpiMealNotes')}</div>
          </div>
          <div className="nutrition-reports__kpi nutrition-reports__kpi--warn">
            <div className="nutrition-reports__kpi-value">{summary.residentsMissingMealPlan ?? 0}</div>
            <div className="nutrition-reports__kpi-label">{t('nurse.nutritionReports.kpiMissingMealPlan')}</div>
          </div>
        </div>
      )}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('common.colResident')}</th>
              <th>{t('common.colCode')}</th>
              <th>{t('nurse.nutritionReports.colMealPlan')}</th>
              <th>{t('nurse.nutritionReports.colSpecialDiet')}</th>
              <th>{t('nurse.nutritionReports.colMealTime')}</th>
              <th>{t('nurse.nutritionReports.colIntake')}</th>
              <th>{t('nurse.nutritionReports.colMealNotes')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="empty-state">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading && residents.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-state">
                  {t('nurse.nutritionReports.emptyFiltered')}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedResidents.map((row) => (
                <tr key={row.residentId}>
                  <td>{row.fullName || '—'}</td>
                  <td>{row.residentCode || '—'}</td>
                  <td>
                    <StatusCell ok={row.hasMealPlan} />
                  </td>
                  <td>
                    <StatusCell ok={row.hasSpecialDiet} />
                  </td>
                  <td>
                    <StatusCell ok={row.hasMealTimeSchedule} />
                  </td>
                  <td>{row.mealIntakeCount ?? 0}</td>
                  <td>{row.mealNotesCount ?? 0}</td>
                  <td>
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
        {!loading && residents.length > 0 && (
          <ListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        )}
      </div>

      {(detailLoading || detail) && (
        <div className="nutrition-reports__modal-overlay" onClick={!detailLoading ? closeDetail : undefined}>
          <div className="nutrition-reports__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="nutrition-reports__modal-header">
              <h3 className="nutrition-reports__modal-title">
                {t('nurse.nutritionReports.detailTitle', { name: detail?.resident?.fullName || '...' })}
              </h3>
              {!detailLoading && (
                <button type="button" className="nutrition-reports__modal-close" onClick={closeDetail}>
                  ×
                </button>
              )}
            </div>
            <div className="nutrition-reports__modal-body">
              {detailLoading && <p>{t('nurse.nutritionReports.detailLoading')}</p>}
              {!detailLoading && detail && (
                <>
                  <p className="nutrition-reports__resident-meta">
                    <strong>{t('nurse.nutritionReports.detailCode')}:</strong> {detail.resident?.residentCode || '—'} ·{' '}
                    <strong>{t('nurse.nutritionReports.detailPeriod')}:</strong> {formatLocaleDate(detail.period?.from, i18n.language)} – {formatLocaleDate(detail.period?.to, i18n.language)}
                    {detail.resident?.allergies?.length > 0 && (
                      <>
                        {' '}
                        · <strong>{t('nurse.nutritionReports.detailAllergies')}:</strong> {detail.resident.allergies.join(', ')}
                      </>
                    )}
                    {detail.resident?.chronicConditions?.length > 0 && (
                      <>
                        {' '}
                        · <strong>{t('nurse.nutritionReports.detailChronic')}:</strong> {detail.resident.chronicConditions.join(', ')}
                      </>
                    )}
                  </p>
                  <p className="nutrition-reports__resident-meta">
                    {t('nurse.nutritionReports.detailSummary', {
                      mealPlanMeals: detail.summary?.mealPlanMealCount ?? 0,
                      intakeCount: detail.summary?.mealIntakeCount ?? 0,
                      mealNotesCount: detail.summary?.mealNotesCount ?? 0,
                      daysWithData: detail.summary?.daysWithData ?? 0,
                    })}
                  </p>

                  {(!detail.days || detail.days.length === 0) && (
                    <p className="empty-state">{t('nurse.nutritionReports.emptyDetailDays')}</p>
                  )}

                  {Array.isArray(detail.days) &&
                    detail.days.map((day) => (
                      <div key={day.workDate} className="nutrition-reports__day-block">
                        <h3 className="nutrition-reports__day-title">{formatLocaleDate(day.workDate, i18n.language)}</h3>

                        {day.mealTimeSchedule && (
                          <div className="nutrition-reports__subsection">
                            <h4>{t('nurse.nutritionReports.sectionMealTimes')}</h4>
                            <p>
                              {t('nurse.nutritionReports.mealTimesLine', {
                                breakfast: day.mealTimeSchedule.breakfastTime,
                                lunch: day.mealTimeSchedule.lunchTime,
                                dinner: day.mealTimeSchedule.dinnerTime,
                              })}
                              {day.mealTimeSchedule.notes ? ` — ${day.mealTimeSchedule.notes}` : ''}
                            </p>
                          </div>
                        )}

                        {day.mealPlanEntries?.length > 0 && (
                          <div className="nutrition-reports__subsection">
                            <h4>{t('nurse.nutritionReports.sectionMealPlan')}</h4>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>{t('nurse.nutritionReports.colMeal')}</th>
                                  <th>{t('nurse.nutritionReports.colDish')}</th>
                                  <th>{t('common.colTime')}</th>
                                  <th>{t('nurse.nutritionReports.colKcal')}</th>
                                  <th>{t('nurse.nutritionReports.colNotes')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {day.mealPlanEntries.map((m, idx) => (
                                  <tr key={`${day.workDate}-meal-${idx}`}>
                                    <td>{mealTypeLabel(m.mealType, t)}</td>
                                    <td>{m.mealName}</td>
                                    <td>{m.mealTime || '—'}</td>
                                    <td>{m.calories ?? '—'}</td>
                                    <td>{m.nutritionNote || m.stageNote || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {day.specialDietEntries?.length > 0 && (
                          <div className="nutrition-reports__subsection">
                            <h4>{t('nurse.nutritionReports.sectionSpecialDiet')}</h4>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>{t('nurse.nutritionReports.colType')}</th>
                                  <th>{t('nurse.nutritionReports.colRestrictions')}</th>
                                  <th>{t('nurse.nutritionReports.colGoal')}</th>
                                  <th>{t('common.colTime')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {day.specialDietEntries.map((d, idx) => (
                                  <tr key={`${day.workDate}-diet-${idx}`}>
                                    <td>{dietTypeLabel(d.dietType, t)}</td>
                                    <td>
                                      {Array.isArray(d.restrictions) ? d.restrictions.join(', ') || '—' : '—'}
                                    </td>
                                    <td>{d.nutritionGoal || '—'}</td>
                                    <td>{d.effectiveTime || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {day.mealIntakeNotes?.length > 0 && (
                          <div className="nutrition-reports__subsection">
                            <h4>{t('nurse.nutritionReports.sectionIntake')}</h4>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>{t('nurse.nutritionReports.colMeal')}</th>
                                  <th>{t('nurse.nutritionReports.colPlannedDish')}</th>
                                  <th>{t('common.colStatus')}</th>
                                  <th>{t('nurse.nutritionReports.colPortion')}</th>
                                  <th>{t('nurse.nutritionReports.colNotes')}</th>
                                  <th>{t('nurse.nutritionReports.colRecordedAt')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {day.mealIntakeNotes.map((row) => (
                                  <tr key={row._id}>
                                    <td>{mealTypeLabel(row.mealType, t)}</td>
                                    <td>{row.plannedMealName || '—'}</td>
                                    <td>{intakeStatusLabel(row.intakeStatus, t)}</td>
                                    <td>
                                      {row.intakeStatus === 'partial' && row.portionPercent != null
                                        ? `${row.portionPercent}%`
                                        : '—'}
                                    </td>
                                    <td>{row.notes || '—'}</td>
                                    <td>{formatLocaleDateTime(row.recordedAt, i18n.language)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {day.mealNotes?.length > 0 && (
                          <div className="nutrition-reports__subsection">
                            <h4>{t('nurse.nutritionReports.sectionMealNotes')}</h4>
                            {day.mealNotes.map((n) => (
                              <div key={n._id} className="nutrition-reports__note">
                                <time>{formatLocaleDateTime(n.noteAt, i18n.language)}</time>
                                {n.authorName && <span>{n.authorName}: </span>}
                                {n.content}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}

export default NutritionReportsPage;
