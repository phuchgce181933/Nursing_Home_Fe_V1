import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminPageShell from '../../../components/admin/AdminPageShell';
import ListPagination from '../../../components/ui/ListPagination';
import useClientPagination from '../../../hooks/useClientPagination';
import useDebouncedSearch from '../../../hooks/useDebouncedSearch';
import caregiverRehabilitationScheduleService from '../../../services/caregiverRehabilitationSchedule.service';
import { getLocalDateString } from '../../../utils/dateUtils';
import { formatVNDate } from '../../../utils/nutritionLabels';
import '../../../styles/caregiver/RehabilitationSchedulePage.css';
import RehabScheduleDetailModal from './components/RehabScheduleDetailModal';

const today = () => getLocalDateString();

function StatusCell({ ok }) {
  return (
    <span className={ok ? 'rehab-schedule-page__status-yes' : 'rehab-schedule-page__status-no'}>
      {ok ? '✓' : '—'}
    </span>
  );
}

function RehabilitationSchedulePage() {
  const { t } = useTranslation();
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
      const res = await caregiverRehabilitationScheduleService.listResidents();
      setResidents(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || t('caregiver.rehabSchedule.loadFailed'));
    }
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await caregiverRehabilitationScheduleService.listOverview({
        workDate,
        residentId: residentId || undefined,
        search: debouncedSearch.trim() || undefined,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setDayMeta({
        hasPublishedRehabDay: res.hasPublishedRehabDay,
        planTitle: res.planTitle,
      });
    } catch (e) {
      setError(e?.response?.data?.message || t('caregiver.rehabSchedule.loadFailed'));
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
      const data = await caregiverRehabilitationScheduleService.getResidentSchedule(rid, { workDate });
      setDetail(data);
    } catch (e) {
      setError(e?.response?.data?.message || t('caregiver.rehabSchedule.detailLoadFailed'));
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
    <AdminPageShell title={t('caregiver.rehabSchedule.title')} subtitle={t('caregiver.rehabSchedule.subtitle')}>
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
        <p className="rehab-schedule-page__day-banner">
          {t('caregiver.rehabSchedule.dayBanner', { date: formatVNDate(workDate) })}{' '}
          {dayMeta.hasPublishedRehabDay
            ? t('caregiver.rehabSchedule.hasRehabPlan', {
                title: dayMeta.planTitle ? ` (${dayMeta.planTitle})` : '',
              })
            : t('caregiver.rehabSchedule.noRehabPlan')}
        </p>
      )}

      <h3 className="rehab-schedule-page__section-title">{t('caregiver.rehabSchedule.assignedResidents')}</h3>
      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('common.colResident')}</th>
              <th>{t('caregiver.rehabSchedule.colHasSchedule')}</th>
              <th>{t('caregiver.rehabSchedule.colSessionCount')}</th>
              <th>{t('common.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="empty-state">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  {t('caregiver.rehabSchedule.emptyFiltered')}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedRows.map((row) => (
                <tr key={row.residentId}>
                  <td>
                    <div>{row.fullName || '—'}</div>
                    <div className="rehab-schedule-page__session-meta">{row.residentCode || ''}</div>
                  </td>
                  <td>
                    <StatusCell ok={row.hasRehabSchedule} />
                  </td>
                  <td>{row.sessionCount ?? 0}</td>
                  <td className="rehab-schedule-page__row-actions">
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

      <RehabScheduleDetailModal
        open={detailOpen}
        loading={detailLoading}
        detail={detail}
        workDate={workDate}
        onClose={closeDetail}
      />
    </AdminPageShell>
  );
}

export default RehabilitationSchedulePage;
