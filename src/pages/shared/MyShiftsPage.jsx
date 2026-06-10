import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AdminPageShell from '../../components/admin/AdminPageShell';
import ListPagination from '../../components/ui/ListPagination';
import useClientPagination from '../../hooks/useClientPagination';
import shiftService from '../../services/shift.service';
import { getLocalDateString } from '../../utils/dateUtils';
import '../../styles/shared/MyShiftsPage.css';

const STATUS_CLASS = {
  published: 'pending',
  confirmed: 'approved',
  completed: 'approved',
  cancelled: 'cancelled',
};

const today = () => getLocalDateString();

const addDays = (dateStr, delta) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return getLocalDateString(d);
};

export default function MyShiftsPage() {
  const { t, i18n } = useTranslation();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(today());
  const [confirmingId, setConfirmingId] = useState(null);

  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const formatDayLabel = useCallback(
    (dateStr) => {
      const d = new Date(`${dateStr}T12:00:00`);
      return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    },
    [locale]
  );

  const filterTabs = useMemo(
    () => [
      { value: 'published', label: t('shared.myShifts.tabNeedConfirm') },
      { value: 'confirmed', label: t('shared.myShifts.tabConfirmed') },
      { value: '', label: t('shared.myShifts.tabAll') },
    ],
    [t]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await shiftService.getMyShifts({
        status: statusFilter || undefined,
        fromDate: selectedDate,
        toDate: selectedDate,
        limit: 50,
      });
      const body = res?.data ?? res;
      setShifts(Array.isArray(body) ? body : body.data || []);
    } catch (e) {
      setError(e.response?.data?.message || t('shared.myShifts.loadFailed'));
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedDate, t]);

  useEffect(() => {
    load();
  }, [load]);

  const {
    paginatedItems: paginatedShifts,
    page,
    setPage,
    totalPages,
    total,
  } = useClientPagination(shifts);

  const todayStr = today();
  const isToday = selectedDate === todayStr;

  const handleConfirm = async (id) => {
    if (!window.confirm(t('shared.myShifts.confirmPrompt'))) return;
    setConfirmingId(id);
    try {
      await shiftService.confirmShift(id);
      await load();
    } catch (e) {
      alert(e.response?.data?.message || t('shared.myShifts.confirmFailed'));
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <AdminPageShell title={t('shared.myShifts.title')} subtitle={t('shared.myShifts.subtitle')}>
      <div className="my-shifts-page__toolbar">
          <div className="my-shifts-page__tabs">
            {filterTabs.map((tab) => (
              <button
                key={tab.value || 'all'}
                type="button"
                className={`my-shifts-page__tab${statusFilter === tab.value ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="my-shifts-page__date-nav">
            <button
              type="button"
              className="my-shifts-page__date-nav-btn"
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              aria-label={t('common.previousDay')}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="my-shifts-page__date-nav-center">
              {isToday && <span className="my-shifts-page__date-nav-badge">{t('common.today')}</span>}
              <span className="my-shifts-page__date-nav-label">{formatDayLabel(selectedDate)}</span>
            </div>
            {!isToday && (
              <button
                type="button"
                className="my-shifts-page__date-nav-today"
                onClick={() => setSelectedDate(todayStr)}
              >
                {t('common.backToToday')}
              </button>
            )}
            <button
              type="button"
              className="my-shifts-page__date-nav-btn"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              aria-label={t('common.nextDay')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {error && <div className="resident-page__error">{error}</div>}

        {loading ? (
          <div className="my-shifts-page__loading">
            <div className="my-shifts-page__loading-ring" aria-hidden="true" />
            <p className="my-shifts-page__loading-label">{t('common.loading')}</p>
          </div>
        ) : (
          <div className="resident-page__table">
            <table className="resident-page__table-element">
              <thead>
                <tr className="resident-page__table-header">
                  <th>{t('shared.myShifts.colDate')}</th>
                  <th>{t('shared.myShifts.colShiftName')}</th>
                  <th>{t('shared.myShifts.colTime')}</th>
                  <th>{t('shared.myShifts.colDuration')}</th>
                  <th>{t('shared.myShifts.colStatus')}</th>
                  <th>{t('shared.myShifts.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {!loading && shifts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="my-shifts-page__empty-row">
                      {t('shared.myShifts.emptyDay')}
                    </td>
                  </tr>
                )}
                {paginatedShifts.map((s) => (
                  <tr key={s._id}>
                    <td>{new Date(s.workDate).toLocaleDateString(locale)}</td>
                    <td>
                      <span className="my-shifts-page__shift-name">
                        {s.shiftTemplateId?.colorLabel && (
                          <span
                            className="my-shifts-page__shift-dot"
                            style={{ background: s.shiftTemplateId.colorLabel }}
                          />
                        )}
                        {s.name}
                      </span>
                    </td>
                    <td>
                      {s.startTime} – {s.endTime}
                    </td>
                    <td>{s.totalHours != null ? `${s.totalHours}h` : '—'}</td>
                    <td>
                      <span
                        className={`my-shifts-page__status my-shifts-page__status--${STATUS_CLASS[s.status] || 'pending'}`}
                      >
                        {t(`common.shiftStatus.${s.status}`, { defaultValue: s.status })}
                      </span>
                    </td>
                    <td>
                      {s.status === 'published' && (
                        <button
                          type="button"
                          className="resident-page__button resident-page__button--primary"
                          disabled={confirmingId === s._id}
                          onClick={() => handleConfirm(s._id)}
                        >
                          {confirmingId === s._id ? t('common.confirming') : t('common.confirm')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && shifts.length > 0 && (
              <ListPagination
                page={page}
                totalPages={totalPages}
                total={total}
                onPageChange={setPage}
              />
            )}
          </div>
        )}
    </AdminPageShell>
  );
}
