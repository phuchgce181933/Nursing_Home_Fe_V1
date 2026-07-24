import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Award,
  ClipboardList,
  MapPin,
  User,
  AlertTriangle,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import shiftService from '../../services/shift.service';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/shared/MyShiftsPage.css';
import { resolveApiError } from '../../utils/apiMessage';
import {
  getPostShiftCompleteMinutesRemaining,
  isWithinPostShiftCompleteWindow,
  toVNDateString,
} from '../../utils/dateUtils';
import {
  resolveShiftDisplayName,
  resolveShiftDisplayTimes,
} from '../../utils/shiftDisplayTimes';

const statusOptions = ['', 'published', 'confirmed', 'completed', 'cancelled'];

function formatTime(val) {
  if (!val) return '—';
  if (typeof val === 'string' && val.includes(':')) return val.slice(0, 5);
  return new Date(val).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function getDefaultDateRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const from = new Date(now);
  from.setDate(from.getDate() + diffToMon);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
}

function parseWorkDate(val) {
  if (!val) return null;
  const d = new Date(typeof val === 'string' && val.length === 10 ? `${val}T00:00:00` : val);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function MyShiftsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const STATUS_DISPLAY = {
    draft: t('myShifts.statusDraft'),
    published: t('myShifts.statusPublished'),
    confirmed: t('myShifts.statusConfirmed'),
    completed: t('myShifts.statusCompleted'),
    cancelled: t('myShifts.statusCancelled'),
  };

  const STATUS_PILL_LABELS = {
    '': t('myShifts.filterAll'),
    published: t('myShifts.statusPublished'),
    confirmed: t('myShifts.statusConfirmed'),
    completed: t('myShifts.statusCompleted'),
    cancelled: t('myShifts.statusCancelled'),
  };

  const WEEKDAYS_VI = [
    t('myShifts.sunday'), t('myShifts.monday'), t('myShifts.tuesday'),
    t('myShifts.wednesday'), t('myShifts.thursday'), t('myShifts.friday'),
    t('myShifts.saturday'),
  ];
  const MONTHS_VI = [
    t('myShifts.month1'), t('myShifts.month2'), t('myShifts.month3'),
    t('myShifts.month4'), t('myShifts.month5'), t('myShifts.month6'),
    t('myShifts.month7'), t('myShifts.month8'), t('myShifts.month9'),
    t('myShifts.month10'), t('myShifts.month11'), t('myShifts.month12'),
  ];
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [confirming, setConfirming] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [tickNow, setTickNow] = useState(() => new Date());

  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [statusFilter, setStatusFilter] = useState('');

  /* ── Data loading ──────────────────────────────────────────── */
  const loadShifts = async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 100,
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      };
      const res = await shiftService.getMyShifts(params);
      const body = res?.data ?? res;
      const items = Array.isArray(body) ? body : (body?.data || []);
      setShifts(Array.isArray(items) ? items : []);
    } catch (err) {
      setMessageType('error');
      setMessage(resolveApiError(err, t, 'myShifts.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadShifts();
  }, [user, fromDate, toDate, statusFilter]);

  useEffect(() => {
    const timer = setInterval(() => setTickNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  /* ── Confirm handler ───────────────────────────────────────── */
  const handleConfirm = async (shiftId) => {
    setConfirming(shiftId);
    setMessage('');
    try {
      await shiftService.confirmShift(shiftId);
      setMessageType('success');
      setMessage(t('myShifts.confirmSuccess'));
      loadShifts();
    } catch (err) {
      setMessageType('error');
      setMessage(resolveApiError(err, t, 'myShifts.confirmError'));
    } finally {
      setConfirming(null);
    }
  };

  const handleComplete = async (shiftId) => {
    setCompleting(shiftId);
    setMessage('');
    try {
      await shiftService.completeShift(shiftId);
      setMessageType('success');
      setMessage(t('myShifts.completeSuccess'));
      loadShifts();
    } catch (err) {
      setMessageType('error');
      setMessage(resolveApiError(err, t, 'myShifts.completeError'));
    } finally {
      setCompleting(null);
    }
  };

  const canCompleteShift = (shift, startTime, endTime) => {
    if (shift.status !== 'confirmed') return false;
    const workDateStr = toVNDateString(shift.workDate);
    if (!workDateStr) return false;
    return isWithinPostShiftCompleteWindow(workDateStr, startTime, endTime, tickNow);
  };

  const getCompleteMinutesRemaining = (shift, startTime, endTime) => {
    const workDateStr = toVNDateString(shift.workDate);
    if (!workDateStr) return 0;
    return getPostShiftCompleteMinutesRemaining(workDateStr, startTime, endTime, tickNow);
  };

  /* ── Stats ───────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total: shifts.length,
    published: shifts.filter((s) => s.status === 'published').length,
    confirmed: shifts.filter((s) => s.status === 'confirmed').length,
    completed: shifts.filter((s) => s.status === 'completed').length,
  }), [shifts]);

  /* ── Group by date ─────────────────────────────────────────── */
  const groupedShifts = useMemo(() => {
    const sorted = [...shifts].sort((a, b) => {
      const da = parseWorkDate(a.workDate);
      const db = parseWorkDate(b.workDate);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });

    const groups = [];
    let currentKey = '';
    for (const shift of sorted) {
      const d = parseWorkDate(shift.workDate);
      const key = d ? d.toISOString().slice(0, 10) : 'unknown';
      if (key !== currentKey) {
        currentKey = key;
        groups.push({ dateKey: key, date: d, shifts: [] });
      }
      groups[groups.length - 1].shifts.push(shift);
    }
    return groups;
  }, [shifts]);

  if (!user) {
    return <LoadingSpinner label={t('myShifts.loading')} />;
  }

  return (
    <div className="ms-page">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="ms-header">
        <div className="ms-header__info">
          <h1 className="ms-header__title">{t('myShifts.pageTitle')}</h1>
          <p className="ms-header__subtitle">{t('myShifts.pageSubtitle')}</p>
        </div>
        <button type="button" className="ms-btn ms-btn--secondary" onClick={loadShifts}>
          <RefreshCw size={16} />
          {t('myShifts.refresh')}
        </button>
      </header>

      {/* ── Toast ──────────────────────────────────────────── */}
      {message && (
        <div className={`ms-toast ms-toast--${messageType}`}>
          {messageType === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {message}
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="ms-stats">
        <div className="ms-stat-card">
          <div className="ms-stat-card__icon ms-stat-card__icon--total">
            <ClipboardList size={22} />
          </div>
          <div>
            <div className="ms-stat-card__value">{stats.total}</div>
            <div className="ms-stat-card__label">{t('myShifts.statTotal')}</div>
          </div>
        </div>
        <div className="ms-stat-card">
          <div className="ms-stat-card__icon ms-stat-card__icon--published">
            <Calendar size={22} />
          </div>
          <div>
            <div className="ms-stat-card__value">{stats.published}</div>
            <div className="ms-stat-card__label">{t('myShifts.statPublished')}</div>
          </div>
        </div>
        <div className="ms-stat-card">
          <div className="ms-stat-card__icon ms-stat-card__icon--confirmed">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="ms-stat-card__value">{stats.confirmed}</div>
            <div className="ms-stat-card__label">{t('myShifts.statConfirmed')}</div>
          </div>
        </div>
        <div className="ms-stat-card">
          <div className="ms-stat-card__icon ms-stat-card__icon--completed">
            <Award size={22} />
          </div>
          <div>
            <div className="ms-stat-card__value">{stats.completed}</div>
            <div className="ms-stat-card__label">{t('myShifts.statCompleted')}</div>
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="ms-filters">
        <div className="ms-filter-field">
          <label className="ms-filter-field__label">{t('myShifts.filterFromDate')}</label>
          <input
            className="ms-filter-field__input"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="ms-filter-field">
          <label className="ms-filter-field__label">{t('myShifts.filterToDate')}</label>
          <input
            className="ms-filter-field__input"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="ms-filter-field">
          <label className="ms-filter-field__label">{t('myShifts.filterStatus')}</label>
          <div className="ms-status-pills">
            {statusOptions.map((s) => (
              <button
                key={s}
                type="button"
                className={`ms-pill ${statusFilter === s ? 'ms-pill--active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {STATUS_PILL_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Timeline list ──────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner label={t('myShifts.loadingShifts')} />
      ) : shifts.length === 0 ? (
        <div className="ms-empty">
          <div className="ms-empty__icon"><Inbox size={42} /></div>
          <p>{t('myShifts.emptyList')}</p>
        </div>
      ) : (
        <div className="ms-timeline">
          {groupedShifts.map((group) => (
            <div key={group.dateKey}>
              <div className="ms-date-group">
                <span className="ms-date-group__label">
                  {group.date
                    ? `${WEEKDAYS_VI[group.date.getDay()]}, ${group.date.getDate()} ${MONTHS_VI[group.date.getMonth()]} ${group.date.getFullYear()}`
                    : group.dateKey}
                </span>
                <div className="ms-date-group__line" />
              </div>

              {group.shifts.map((shift, idx) => {
                const d = parseWorkDate(shift.workDate);
                const templateName = resolveShiftDisplayName(shift, t('myShifts.defaultShiftName'));
                const { startTime, endTime } = resolveShiftDisplayTimes(shift);

                return (
                  <div
                    key={shift._id}
                    className="ms-shift-card"
                    style={{ animationDelay: `${0.05 * idx}s` }}
                  >
                    <div className="ms-shift-card__time-side">
                      <div className="ms-shift-card__day">{d ? d.getDate() : '—'}</div>
                      <div className="ms-shift-card__month">{d ? MONTHS_VI[d.getMonth()] : ''}</div>
                      <div className="ms-shift-card__weekday">{d ? WEEKDAYS_VI[d.getDay()] : ''}</div>
                    </div>

                    <div className="ms-shift-card__body">
                      <div className="ms-shift-card__top">
                        <div>
                          <h3 className="ms-shift-card__name">{templateName}</h3>
                          {shift.taskDescription && (
                            <span className="ms-shift-card__template">{shift.taskDescription}</span>
                          )}
                        </div>
                        <span className={`ms-badge ms-badge--${shift.status}`}>
                          {STATUS_DISPLAY[shift.status] || shift.status}
                        </span>
                      </div>

                      <div className="ms-shift-card__time-range">
                        <Clock size={14} />
                        {formatTime(startTime)} &mdash; {formatTime(endTime)}
                      </div>

                      <div className="ms-shift-card__details">
                        {shift.assignedStaffId?.fullName && (
                          <span className="ms-shift-card__detail-item">
                            <User size={13} /> {shift.assignedStaffId.fullName}
                          </span>
                        )}
                        {shift.location && (
                          <span className="ms-shift-card__detail-item">
                            <MapPin size={13} /> {shift.location}
                          </span>
                        )}
                      </div>

                      {shift.notes && (
                        <div className="ms-shift-card__notes">{shift.notes}</div>
                      )}

                      {shift.status === 'published' && (
                        <div className="ms-shift-card__actions">
                          <button
                            type="button"
                            className="ms-btn ms-btn--success ms-btn--small"
                            disabled={confirming === shift._id}
                            onClick={() => handleConfirm(shift._id)}
                          >
                            <CheckCircle2 size={14} />
                            {confirming === shift._id ? t('myShifts.confirming') : t('myShifts.confirmShift')}
                          </button>
                        </div>
                      )}

                      {canCompleteShift(shift, startTime, endTime) && (
                        <div className="ms-shift-card__actions">
                          <button
                            type="button"
                            className="ms-btn ms-btn--primary ms-btn--small"
                            disabled={completing === shift._id}
                            onClick={() => handleComplete(shift._id)}
                          >
                            <Award size={14} />
                            {completing === shift._id ? t('myShifts.completing') : t('myShifts.completeShift')}
                          </button>
                          <span className="ms-shift-card__window-hint">
                            {t('myShifts.completeWindowRemaining', {
                              minutes: getCompleteMinutesRemaining(shift, startTime, endTime),
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
