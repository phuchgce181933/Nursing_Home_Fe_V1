import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, ChevronLeft, ChevronRight, Stethoscope,
  Clock, User, Activity, Loader2, AlertCircle, CalendarDays,
} from 'lucide-react';
import careAppointmentService from '../../services/careAppointment.service';
import '../../styles/doctor/DoctorSchedulePage.css';

// ── Helpers ────────────────────────────────────────────────────────────────
const getDayAbbrs = (t) => [
  t('doctorSchedule.days.sun'), t('doctorSchedule.days.mon'), t('doctorSchedule.days.tue'),
  t('doctorSchedule.days.wed'), t('doctorSchedule.days.thu'), t('doctorSchedule.days.fri'),
  t('doctorSchedule.days.sat'),
];
const getStatusVI = (t) => ({
  scheduled: t('doctorSchedule.status.scheduled'),
  in_progress: t('doctorSchedule.status.inProgress'),
  completed: t('doctorSchedule.status.completed'),
  cancelled: t('doctorSchedule.status.cancelled'),
});

function toDateStr(d) {
  // Returns YYYY-MM-DD in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

function formatTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function DoctorSchedulePage() {
  const { t } = useTranslation();
  const VI_DAYS = getDayAbbrs(t);
  const STATUS_VI = getStatusVI(t);
  const [view, setView] = useState('week'); // 'week' | 'day'
  const [currentDate, setCurrentDate] = useState(toDateStr(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);

  // Fetch appointments for the visible range
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let from, to;
      if (view === 'week') {
        const monday = getMondayOf(currentDate);
        from = new Date(monday + 'T00:00:00').toISOString();
        to = new Date(addDays(monday, 6) + 'T23:59:59').toISOString();
      } else {
        from = new Date(currentDate + 'T00:00:00').toISOString();
        to = new Date(currentDate + 'T23:59:59').toISOString();
      }
      const res = await careAppointmentService.getMyAppointments({ from, to, limit: 200 });
      setAppointments(res?.data || []);
    } catch (err) {
      console.error('Failed to load schedule:', err);
      setError(t('doctorSchedule.error'));
    } finally {
      setLoading(false);
    }
  }, [view, currentDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Navigation ────────────────────────────────────────
  const goToday = () => setCurrentDate(toDateStr(new Date()));
  const goPrev = () => {
    setCurrentDate(prev => view === 'week' ? addDays(prev, -7) : addDays(prev, -1));
  };
  const goNext = () => {
    setCurrentDate(prev => view === 'week' ? addDays(prev, 7) : addDays(prev, 1));
  };

  // ── Derived data ──────────────────────────────────────
  const todayStr = toDateStr(new Date());
  const monday = getMondayOf(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  function getApptsForDay(dayStr) {
    return appointments.filter(a => {
      const d = new Date(a.scheduledStartAt);
      return toDateStr(d) === dayStr;
    }).sort((a, b) => new Date(a.scheduledStartAt) - new Date(b.scheduledStartAt));
  }

  // Stats
  const total = appointments.length;
  const scheduled = appointments.filter(a => a.status === 'scheduled').length;
  const inProgress = appointments.filter(a => a.status === 'in_progress').length;
  const completed = appointments.filter(a => a.status === 'completed').length;

  // ── Nav label ─────────────────────────────────────────
  let navLabel = '';
  if (view === 'week') {
    const sunStr = addDays(monday, 6);
    const monD = new Date(monday + 'T00:00:00');
    const sunD = new Date(sunStr + 'T00:00:00');
    navLabel = `${monD.getDate()}/${monD.getMonth() + 1} – ${sunD.getDate()}/${sunD.getMonth() + 1}/${sunD.getFullYear()}`;
  } else {
    navLabel = formatFullDate(currentDate);
  }

  return (
    <div className="dsp-root">
      {/* Header */}
      <div className="dsp-header">
        <div className="dsp-title-block">
          <div className="dsp-title-icon">
            <CalendarDays size={22} color="#fff" />
          </div>
          <div>
            <h1 className="dsp-title">{t('doctorSchedule.title')}</h1>
            <p className="dsp-subtitle">{t('doctorSchedule.subtitle')}</p>
          </div>
        </div>
        <div className="dsp-view-toggle">
          <button
            className={`dsp-view-btn${view === 'week' ? ' active' : ''}`}
            onClick={() => setView('week')}
          >
            {t('doctorSchedule.viewWeek')}
          </button>
          <button
            className={`dsp-view-btn${view === 'day' ? ' active' : ''}`}
            onClick={() => setView('day')}
          >
            {t('doctorSchedule.viewDay')}
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="dsp-stats">
          <div className="dsp-stat-card">
            <div className="dsp-stat-num" style={{ color: '#a5b4fc' }}>{total}</div>
            <div className="dsp-stat-label">{t('doctorSchedule.stats.total')}</div>
          </div>
          <div className="dsp-stat-card">
            <div className="dsp-stat-num" style={{ color: '#93c5fd' }}>{scheduled}</div>
            <div className="dsp-stat-label">{t('doctorSchedule.stats.scheduled')}</div>
          </div>
          <div className="dsp-stat-card">
            <div className="dsp-stat-num" style={{ color: '#fcd34d' }}>{inProgress}</div>
            <div className="dsp-stat-label">{t('doctorSchedule.stats.inProgress')}</div>
          </div>
          <div className="dsp-stat-card">
            <div className="dsp-stat-num" style={{ color: '#6ee7b7' }}>{completed}</div>
            <div className="dsp-stat-label">{t('doctorSchedule.stats.completed')}</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="dsp-nav">
        <button className="dsp-nav-btn" onClick={goPrev} aria-label={t('doctorSchedule.prev')}>
          <ChevronLeft size={16} />
        </button>
        <span className="dsp-nav-label">{navLabel}</span>
        <button className="dsp-nav-btn" onClick={goNext} aria-label={t('doctorSchedule.next')}>
          <ChevronRight size={16} />
        </button>
        <button className="dsp-today-btn" onClick={goToday}>{t('doctorSchedule.today')}</button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="dsp-loading">
          <Loader2 size={20} className="animate-spin" />
          <span>{t('doctorSchedule.loading')}</span>
        </div>
      ) : error ? (
        <div className="dsp-error">
          <AlertCircle size={20} style={{ marginBottom: 8 }} />
          <div>{error}</div>
        </div>
      ) : view === 'week' ? (
        /* ── WEEKLY VIEW ── */
        <div className="dsp-week-grid">
          {weekDays.map((dayStr, i) => {
            const dayAppts = getApptsForDay(dayStr);
            const isToday = dayStr === todayStr;
            const dayDate = new Date(dayStr + 'T00:00:00');
            return (
              <div key={dayStr} className={`dsp-day-col${isToday ? ' today' : ''}`}>
                <div className="dsp-day-header">
                  <div className="dsp-day-name">{VI_DAYS[dayDate.getDay()]}</div>
                  <div className="dsp-day-num">{dayDate.getDate()}</div>
                </div>
                <div className="dsp-day-body">
                  {dayAppts.length === 0 ? (
                    <div className="dsp-day-empty">{t('doctorSchedule.empty')}</div>
                  ) : (
                    dayAppts.map(a => (
                      <div
                        key={a._id}
                        className={`dsp-appt-chip ${a.status}`}
                        onClick={() => setSelectedAppt(a)}
                        title={a.residentId?.fullName}
                      >
                        <div className="dsp-chip-time">{formatTime(a.scheduledStartAt)}</div>
                        <div className="dsp-chip-name">{a.residentId?.fullName || '—'}</div>
                        <div className="dsp-chip-type">{a.appointmentType || ''}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── DAILY VIEW ── */
        <div className="dsp-daily-list">
          {getApptsForDay(currentDate).length === 0 ? (
            <div className="dsp-daily-empty">
              <Calendar size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div>{t('doctorSchedule.dailyEmpty')}</div>
            </div>
          ) : (
            getApptsForDay(currentDate).map(a => (
              <div
                key={a._id}
                className={`dsp-daily-card ${a.status}`}
                onClick={() => setSelectedAppt(a)}
              >
                <div className="dsp-card-time-block">
                  <div className="dsp-card-time-start">{formatTime(a.scheduledStartAt)}</div>
                  <div className="dsp-card-time-sep">↓</div>
                  <div className="dsp-card-time-end">{formatTime(a.scheduledEndAt)}</div>
                </div>
                <div className="dsp-card-divider" />
                <div className="dsp-card-body">
                  <div className="dsp-card-resident">
                    <User size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                    {a.residentId?.fullName || '—'}
                  </div>
                  <div className="dsp-card-type">
                    <Stethoscope size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                    {a.appointmentType || t('doctorSchedule.uncategorized')}
                  </div>
                  <div className="dsp-card-tags">
                    <span className={`dsp-tag dsp-tag-status-${a.status}`}>
                      {STATUS_VI[a.status] || a.status}
                    </span>
                    {a.nurseStaffId?.userId?.fullName && (
                      <span className="dsp-tag dsp-tag-nurse">
                        {t('doctorSchedule.nurse')}: {a.nurseStaffId.userId.fullName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAppt && (
        <div className="dsp-modal-backdrop" onClick={() => setSelectedAppt(null)}>
          <div className="dsp-modal" onClick={e => e.stopPropagation()}>
            <div className="dsp-modal-title">
              <Stethoscope size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              {t('doctorSchedule.modal.title')}
            </div>
            {[
              [t('doctorSchedule.modal.patient'), selectedAppt.residentId?.fullName || '—'],
              [t('doctorSchedule.modal.type'), selectedAppt.appointmentType || '—'],
              [t('doctorSchedule.modal.start'), formatTime(selectedAppt.scheduledStartAt)],
              [t('doctorSchedule.modal.end'), formatTime(selectedAppt.scheduledEndAt)],
              [t('doctorSchedule.modal.status'), STATUS_VI[selectedAppt.status] || selectedAppt.status],
              [t('doctorSchedule.modal.nurse'), selectedAppt.nurseStaffId?.userId?.fullName || '—'],
              [t('doctorSchedule.modal.notes'), selectedAppt.notes || '—'],
            ].map(([label, val]) => (
              <div className="dsp-modal-row" key={label}>
                <div className="dsp-modal-label">{label}</div>
                <div className="dsp-modal-val">{val}</div>
              </div>
            ))}
            <button className="dsp-modal-close" onClick={() => setSelectedAppt(null)}>{t('doctorSchedule.modal.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
