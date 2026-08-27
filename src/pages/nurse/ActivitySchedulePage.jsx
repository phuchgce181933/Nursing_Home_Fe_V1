import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  List,
  LayoutGrid,
  Loader2,
  User,
  Tag,
  Save,
  CheckCircle2,
} from 'lucide-react';
import activityService from '../../services/activity.service';
import residentService from '../../services/resident.service';
import { resolveApiError } from '../../utils/apiMessage';
import medicalRecordService from '../../services/medicalRecord.service';
import '../../styles/nurse/ActivitySchedulePage.css';

const formatDurationLabel = (durationMinutes, t) => {
  const totalMinutes = Number(durationMinutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '';

  const totalDays = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  const parts = [];
  if (totalDays > 0) parts.push(t('activitySchedule.durationDays', { count: totalDays }));
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}p`);

  return parts.join(' ');
};

const formatActivityDateRange = (activity) => {
  const startDate = new Date(activity?.startAt || activity?.scheduledAt);
  const endDate = new Date(activity?.endAt || activity?.startAt || activity?.scheduledAt);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '-';

  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (sameDay) {
    return `${startDate.toLocaleString('vi-VN')}`;
  }
  // If activity has a per-day duration (dailyDurationMinutes), show per-day time range instead of a continuous span
  const dailyMinutes = Number(activity?.dailyDurationMinutes);
  if (Number.isFinite(dailyMinutes) && dailyMinutes > 0 && activity?.startAt) {
    const startTime = new Date(activity.startAt);
    const perDayStart = startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const perDayEndDate = new Date(startTime.getTime() + dailyMinutes * 60000);
    const perDayEnd = perDayEndDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${startDate.toLocaleDateString('vi-VN')} → ${endDate.toLocaleDateString('vi-VN')} · ${perDayStart}–${perDayEnd}`;
  }

  return `${startDate.toLocaleString('vi-VN')} → ${endDate.toLocaleString('vi-VN')}`;
};

const formatTimeShort = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const getPerDayEndTime = (activity) => {
  const startIso = activity?.startAt || activity?.scheduledAt;
  const dailyMinutes = Number(activity?.dailyDurationMinutes);
  if (!startIso || !Number.isFinite(dailyMinutes)) return null;
  const start = new Date(startIso);
  const end = new Date(start.getTime() + dailyMinutes * 60000);
  return end.toISOString();
};

const isActivityOnDate = (activity, date) => {
  const startDate = new Date(activity?.startAt || activity?.scheduledAt);
  const endDate = new Date(activity?.endAt || activity?.startAt || activity?.scheduledAt);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return false;
  }

  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  return targetDay >= startDay && targetDay <= endDay;
};

// Kept in sync with the backend's 2-hour grace window (services/activityService.js recordParticipationResult):
// attendance can still be recorded shortly after the activity ends, even after it auto-flips to 'completed'.
const RECORD_GRACE_MS = 2 * 60 * 60 * 1000;

const isNowInDailyOccurrence = (activity) => {
  try {
    const dailyMinutes = Number(activity?.dailyDurationMinutes);
    if (!dailyMinutes || dailyMinutes <= 0) return false;

    const startIso = activity?.startAt || activity?.scheduledAt;
    const endIso = activity?.endAt || activity?.startAt || activity?.scheduledAt;
    if (!startIso || !endIso) return false;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startDate = new Date(startIso);
    const endDate = new Date(endIso);
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    // If today not within date range, not occurring today
    if (today < startDay || today > endDay) return false;

    // Build today's occurrence start using time from activity.startAt
    const occurrenceStart = new Date(today);
    occurrenceStart.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds() || 0, 0);

    const occurrenceEnd = new Date(occurrenceStart.getTime() + dailyMinutes * 60000);

    return now >= occurrenceStart && now <= occurrenceEnd;
  } catch (e) {
    return false;
  }
};

const getEffectiveStatus = (activity) => {
  if (!activity) return '';
  // If activity uses dailyDurationMinutes, determine ongoing based on today's time window
  if (activity.dailyDurationMinutes) {
    if (isNowInDailyOccurrence(activity)) return 'ongoing';
    // if today within start-end date range but not in time window, show scheduled
    const today = new Date();
    const startDate = new Date(activity.startAt || activity.scheduledAt);
    const endDate = new Date(activity.endAt || activity.startAt || activity.scheduledAt);
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (todayDay >= startDay && todayDay <= endDay) return 'scheduled';
  }
  return activity.status || '';
};

const canRecordAttendance = (activity) => {
  const status = String(activity?.status || '').trim().toLowerCase();
  if (status === 'draft' || status === 'cancelled') {
    return false;
  }

  // If activity defines a daily duration, check today's occurrence window
  if (activity?.dailyDurationMinutes) {
    return isNowInDailyOccurrence(activity);
  }

  const startDate = new Date(activity?.startAt || activity?.scheduledAt);
  const endDate = new Date(activity?.endAt || activity?.startAt || activity?.scheduledAt);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return false;
  }

  const now = new Date();
  return now >= startDate && now <= new Date(endDate.getTime() + RECORD_GRACE_MS);
};

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */
const getStatusOptions = (t) => [
  { value: '', label: t('activitySchedule.status.all') },
  { value: 'scheduled', label: t('activitySchedule.status.scheduled') },
  { value: 'completed', label: t('activitySchedule.status.completed') },
  { value: 'cancelled', label: t('activitySchedule.status.cancelled') },
];

const getStatusLabels = (t) => ({
  draft: t('activitySchedule.status.draft'),
  scheduled: t('activitySchedule.status.scheduled'),
  ongoing: t('activitySchedule.status.ongoing'),
  completed: t('activitySchedule.status.completed'),
  cancelled: t('activitySchedule.status.cancelled'),
});

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ActivitySchedulePage() {
  const { t } = useTranslation();
  const statusOptions = useMemo(() => getStatusOptions(t), [t]);
  const statusLabels = useMemo(() => getStatusLabels(t), [t]);

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('list');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [residents, setResidents] = useState({});
  const [residentsAbnormalStatus, setResidentsAbnormalStatus] = useState({});
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordMessage, setRecordMessage] = useState('');
  const [recordMessageType, setRecordMessageType] = useState('success');

  /* ---- fetch ---- */
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const params = {
        from: monthStart.toISOString(),
        to: monthEnd.toISOString(),
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      };

      const res = await activityService.getActivityList(params);
      setActivities(res?.data || []);

      /* Load resident names */
      if (res?.data?.length > 0) {
        const residentIds = new Set();
        res.data.forEach((a) => {
          a.participantResidentIds?.forEach((id) => residentIds.add(id));
        });
        if (residentIds.size > 0) {
          const residentList = await residentService.getResidentList({ page: 1, limit: 100 });
          const map = {};
          residentList?.data?.forEach((r) => { map[r._id] = r; });
          setResidents(map);
          // load latest vitals to detect abnormal status
          try {
            const results = await Promise.allSettled(
              Array.from(residentIds).map((id) => medicalRecordService.getLatestVitals(id))
            );
            const statusMap = {};
            results.forEach((r, idx) => {
              const id = Array.from(residentIds)[idx];
              if (r.status === 'fulfilled' && r.value) {
                statusMap[id] = Boolean(r.value.abnormalFlag === true);
              } else {
                statusMap[id] = false;
              }
            });
            setResidentsAbnormalStatus(statusMap);
          } catch (err) {
            console.error('Failed to load resident vitals for abnormal status', err);
          }
        }
      }
    } catch (err) {
      console.error('Fetch activities failed:', err);
      setError(err.response?.data?.message || t('activitySchedule.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [currentDate, statusFilter, searchQuery, t]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const buildAttendanceFormFromActivity = (activity) => {
    if (!activity) {
      return {
        participantResultNotes: '',
        attendanceRecords: [],
        participationRecords: [],
      };
    }

    const today = new Date();
    const todayKey = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    const targetDayIso = todayKey(today);

    const pickRecordForResident = (records = [], residentId) => {
      // Prefer record with occurrenceDate matching today, then fallback to record without occurrenceDate
      const foundByDate = (records || []).find((r) => {
        if (!r) return false;
        if (!r.residentId) return false;
        if (String(r.residentId) !== String(residentId)) return false;
        if (!r.occurrenceDate) return false;
        const occ = new Date(r.occurrenceDate);
        if (Number.isNaN(occ.getTime())) return false;
        return todayKey(occ) === targetDayIso;
      });
      if (foundByDate) return foundByDate;
      const foundNoDate = (records || []).find((r) => String(r.residentId) === String(residentId) && !r.occurrenceDate);
      return foundNoDate || null;
    };

    const existingAttendance = activity.attendanceRecords || [];
    const existingParticipation = activity.participationRecords || [];

    const participantIds = activity.participantResidentIds || [];
    return {
      participantResultNotes: activity.participantResultNotes || '',
      attendanceRecords: participantIds.map((residentId) => {
        const rec = pickRecordForResident(existingAttendance, residentId);
        return {
          residentId,
          status: rec?.status || 'present',
          note: rec?.note || '',
        };
      }),
      participationRecords: participantIds.map((residentId) => {
        const rec = pickRecordForResident(existingParticipation, residentId);
        return {
          residentId,
          participationLevel: rec?.participationLevel || 'active',
          comment: rec?.comment || '',
          incident: rec?.incident || '',
        };
      }),
    };
  };

  /* ---- month nav ---- */
  const handlePrevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const handleNextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  /* ---- calendar helpers ---- */
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
  };

  const getActivitiesForDate = (date) => activities.filter((activity) => isActivityOnDate(activity, date));

  /* ================================================================ */
  /*  List view                                                        */
  /* ================================================================ */
  const ListViewContent = () => (
    <div className="as-list-card">
      <table className="as-table">
        <thead>
          <tr>
            <th>{t('activitySchedule.table.title')}</th>
            <th>{t('activitySchedule.table.category')}</th>
            <th>{t('activitySchedule.table.dateTime')}</th>
            <th>{t('activitySchedule.table.location')}</th>
            <th>{t('activitySchedule.table.status')}</th>
            <th>{t('activitySchedule.table.participants')}</th>
          </tr>
        </thead>
        <tbody>
            {loading ? (
            <tr>
              <td colSpan="6" className="as-table-empty">
                <div className="as-loading">
                  <Loader2 size={18} /> {t('activitySchedule.loading')}
                </div>
              </td>
            </tr>
          ) : activities.length === 0 ? (
            <tr>
              <td colSpan="6" className="as-table-empty">
                {t('activitySchedule.noActivities')}
              </td>
            </tr>
            ) : (
            activities.map((activity) => {
              const effectiveStatus = getEffectiveStatus(activity);
              return (
                <tr
                  key={activity._id}
                  onClick={() => setSelectedActivity(activity)}
                >
                  <td className="as-table-title">{activity.title}</td>
                  <td>{activity.category || '-'}</td>
                  <td>{formatActivityDateRange(activity)}</td>
                  <td>{activity.location || '-'}</td>
                  <td>
                    <span className={`as-status-badge as-status-badge--${effectiveStatus || activity.status || 'draft'}`}>
                      {statusLabels[effectiveStatus] || statusLabels[activity.status] || activity.status}
                    </span>
                  </td>
                  <td className="as-participant-count">
                    {t('activitySchedule.residentCount', { count: activity.participantResidentIds?.length || 0 })}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  /* ================================================================ */
  /*  Calendar view                                                    */
  /* ================================================================ */
  const CalendarViewContent = () => {
    const days = getDaysInMonth();
    const firstDayOfWeek = days[0].getDay(); // 0 = Sun
    const todayStr = new Date().toDateString();

    return (
      <div className="as-calendar-card">
        <div className="as-calendar-grid">
          {/* Day names */}
          {[
            t('activitySchedule.daySun'),
            t('activitySchedule.dayMon'),
            t('activitySchedule.dayTue'),
            t('activitySchedule.dayWed'),
            t('activitySchedule.dayThu'),
            t('activitySchedule.dayFri'),
            t('activitySchedule.daySat'),
          ].map((d) => (
            <div key={d} className="as-calendar-dayname">{d}</div>
          ))}

          {/* Empty leading cells */}
          {Array.from({ length: firstDayOfWeek }, (_, i) => (
            <div key={`e-${i}`} className="as-calendar-cell as-calendar-cell--empty" />
          ))}

          {/* Day cells */}
          {days.map((day) => {
            const isToday = day.toDateString() === todayStr;
            const dayActivities = getActivitiesForDate(day);
            return (
              <div
                key={day.toISOString()}
                className={`as-calendar-cell ${isToday ? 'as-calendar-cell--today' : ''}`}
              >
                <div className="as-cell-date">{day.getDate()}</div>
                {dayActivities.map((a) => {
                  const effectiveStatus = getEffectiveStatus(a);
                  return (
                    <div
                      key={a._id}
                      className={`as-event-pill as-event-pill--${effectiveStatus || a.status || 'draft'}`}
                      onClick={() => setSelectedActivity(a)}
                      title={a.title}
                    >
                      {/* Show per-day time if available */}
                      <span className={`as-event-time as-event-time--${effectiveStatus || a.status || 'draft'}`}>{formatTimeShort(a.startAt || a.scheduledAt)}</span>
                      <span className="as-event-title"> {a.title}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ================================================================ */
  /*  Drawer (detail modal — slides from right)                        */
  /* ================================================================ */
  const DetailDrawer = () => {
    if (!selectedActivity) return null;
    const a = selectedActivity;
    const attendanceAllowed = canRecordAttendance(a) || isNowInDailyOccurrence(a);
    const [draft, setDraft] = useState(() => buildAttendanceFormFromActivity(a));

    const getTodayOccurrenceLabel = (activity) => {
      try {
        const today = new Date();
        const key = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
        // if activity uses dailyDurationMinutes, show today's date
        if (activity?.dailyDurationMinutes) return key(today);
        // else check attendanceRecords for today's occurrence
        const occ = (activity.attendanceRecords || []).find((r) => r?.occurrenceDate && key(new Date(r.occurrenceDate)) === key(today));
        if (occ) return key(today);
        return null;
      } catch (e) {
        return null;
      }
    };

    useEffect(() => {
      setDraft(buildAttendanceFormFromActivity(a));
    }, [a?._id]);

    const updateDraft = (updater) => {
      setDraft((prev) => updater(prev));
    };

    const handleAttendanceChange = (residentId, field, value) => {
      updateDraft((prev) => ({
        ...prev,
        attendanceRecords: prev.attendanceRecords.map((record) =>
          record.residentId === residentId ? { ...record, [field]: value } : record,
        ),
      }));
    };

    const handleParticipationChange = (residentId, field, value) => {
      updateDraft((prev) => ({
        ...prev,
        participationRecords: prev.participationRecords.map((record) =>
          record.residentId === residentId ? { ...record, [field]: value } : record,
        ),
      }));
    };

    const handleSaveRecord = async () => {
      if (!a) return;
      if (!canRecordAttendance(a)) {
        setRecordMessageType('error');
        setRecordMessage(t('activitySchedule.attendanceTimeExpired'));
        return;
      }
      const MAX_NOTE_LENGTH = 500;
      const tooLong =
        draft.participantResultNotes.trim().length > MAX_NOTE_LENGTH ||
        draft.attendanceRecords.some((r) => (r.note || '').length > MAX_NOTE_LENGTH) ||
        draft.participationRecords.some((r) => (r.comment || '').length > MAX_NOTE_LENGTH || (r.incident || '').length > MAX_NOTE_LENGTH);
      if (tooLong) {
        setRecordMessageType('error');
        setRecordMessage(t('activitySchedule.noteTooLong', { max: MAX_NOTE_LENGTH }));
        return;
      }

      try {
        setSavingRecord(true);
        setRecordMessage('');
        const payload = {
          participantResultNotes: draft.participantResultNotes.trim(),
        };

        // Attach occurrenceDate for per-day recordings (use local date at midnight)
        const today = new Date();
        const occurrenceDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

        payload.attendanceRecords = (draft.attendanceRecords || []).map((r) => ({
          ...r,
          occurrenceDate,
        }));
        payload.participationRecords = (draft.participationRecords || []).map((r) => ({
          ...r,
          occurrenceDate,
        }));
        if (a.status === 'scheduled') {
          payload.status = 'completed';
        }
        const result = await activityService.recordParticipationResult(a._id, payload);
        setSelectedActivity((prev) => (prev && prev._id === result?._id ? { ...prev, ...result } : result));
        // refresh list/calendar so counts and records update immediately
        fetchActivities();
        setDraft(buildAttendanceFormFromActivity(result || a));
        setRecordMessageType('success');
        setRecordMessage(t('activitySchedule.saveSuccess'));
      } catch (err) {
        console.error('Save activity attendance failed:', err);
        setRecordMessageType('error');
        setRecordMessage(resolveApiError(err, t, 'activitySchedule.saveRecordFailed'));
      } finally {
        setSavingRecord(false);
      }
    };

    return (
      <div className="as-drawer-overlay" onClick={() => setSelectedActivity(null)}>
        <div className="as-drawer" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="as-drawer-header">
            <h2>{a.title}</h2>
            <button
              className="as-drawer-close"
              onClick={() => setSelectedActivity(null)}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="as-drawer-body">
            {/* Status badge */}
            <div style={{ marginBottom: 18 }}>
              <span className={`as-status-badge as-status-badge--${a.status || 'draft'}`}>
                {statusLabels[a.status] || a.status}
              </span>
            </div>

            {/* Detail rows */}
            {/* Occurrence date (for per-day activities) */}
            {(() => {
              const occLabel = getTodayOccurrenceLabel(a);
              if (occLabel) {
                const d = new Date(occLabel);
                return (
                  <div className="as-detail-row">
                    <Calendar size={16} />
                    <span className="as-detail-label">{t('activitySchedule.attendanceDateLabel')}</span>
                    <span className="as-detail-value">{d.toLocaleDateString('vi-VN')}</span>
                  </div>
                );
              }
              return null;
            })()}
            <div className="as-detail-row">
              <Calendar size={16} />
              <span className="as-detail-label">{t('activitySchedule.detail.dateTime')}</span>
              <span className="as-detail-value">{formatActivityDateRange(a)}</span>
            </div>

            {a.endAt && (
              <div className="as-detail-row">
                <Clock size={16} />
                <span className="as-detail-label">{t('activitySchedule.endTimeLabel')}</span>
                <span className="as-detail-value">
                  {new Date(a.endAt || a.startAt || a.scheduledAt).toLocaleString('vi-VN')}
                </span>
              </div>
            )}

            {a.location && (
              <div className="as-detail-row">
                <MapPin size={16} />
                <span className="as-detail-label">{t('activitySchedule.detail.location')}</span>
                <span className="as-detail-value">{a.location}</span>
              </div>
            )}

            {a.durationMinutes && (
              <div className="as-detail-row">
                <Clock size={16} />
                <span className="as-detail-label">{t('activitySchedule.detail.duration')}</span>
                <span className="as-detail-value">{formatDurationLabel(a.durationMinutes, t)}</span>
              </div>
            )}

            {a.category && (
              <div className="as-detail-row">
                <Tag size={16} />
                <span className="as-detail-label">{t('activitySchedule.detail.category')}</span>
                <span className="as-detail-value">{a.category}</span>
              </div>
            )}

            <div className="as-detail-row">
              <Users size={16} />
              <span className="as-detail-label">{t('activitySchedule.detail.participants')}</span>
              <span className="as-detail-value">
                {t('activitySchedule.residentCount', { count: a.participantResidentIds?.length || 0 })}
              </span>
            </div>

            {/* Description */}
            {a.description && (
              <div className="as-description-box">
                <strong>{t('activitySchedule.detail.description')}</strong>
                <p>{a.description}</p>
              </div>
            )}

            {/* Participants */}
            {a.participantResidentIds?.length > 0 && (
              <div className="as-participants-section">
                <strong>
                  {t('activitySchedule.detail.participantList', { count: a.participantResidentIds.length })}
                </strong>
                <div className="as-participant-list">
                  {a.participantResidentIds.map((rid) => (
                    <div key={rid} className="as-participant-item">
                      <User size={14} />
                      <span style={{ marginRight: 8 }}>{residents[rid]?.fullName || t('activitySchedule.residentById', { id: rid })}</span>
                      {residentsAbnormalStatus[rid] && (
                        <span className="as-abnormal-badge" title={t('activitySchedule.abnormalWarning')} style={{ color: '#b91c1c', fontWeight: 600 }}>
                          ⚠️
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="as-record-section">
              <div className="as-record-header">
                <h3>{t('activitySchedule.attendanceSection')}</h3>
                <button type="button" className="as-save-record-btn" onClick={handleSaveRecord} disabled={savingRecord || !attendanceAllowed}>
                  {savingRecord ? <Loader2 size={14} className="as-spin-icon" /> : <Save size={14} />}
                  {savingRecord ? t('activitySchedule.saving') : t('activitySchedule.save')}
                </button>
              </div>

              {recordMessage && (
                <div className={`as-record-message ${recordMessageType === 'error' ? 'as-record-message--error' : ''}`}>
                  {recordMessageType === 'error' ? <X size={14} /> : <CheckCircle2 size={14} />}
                  {recordMessage}
                </div>
              )}

              {!attendanceAllowed && (
                <div className="as-record-message as-record-message--error">
                  <X size={14} />
                  {t('activitySchedule.attendanceNotAllowed')}
                </div>
              )}

              <label className="as-record-label">{t('activitySchedule.generalComment')}</label>
              <textarea
                className="as-record-textarea"
                value={draft.participantResultNotes}
                onChange={(e) => updateDraft((prev) => ({ ...prev, participantResultNotes: e.target.value }))}
                placeholder={t('activitySchedule.generalCommentPlaceholder')}
                disabled={!attendanceAllowed}
                maxLength={500}
              />

              <div className="as-resident-list">
                {draft.attendanceRecords.map((record) => {
                  const resident = residents[record.residentId];
                  const participation = draft.participationRecords.find((item) => item.residentId === record.residentId) || { participationLevel: 'active', comment: '', incident: '' };
                  return (
                    <div key={record.residentId} className="as-resident-record-card">
                      <div className="as-resident-record-title">
                        <User size={14} />
                        <span>{resident?.fullName || record.residentId}</span>
                      </div>

                      <div className="as-resident-record-grid">
                        <div>
                          <label className="as-record-label">{t('activitySchedule.attendanceLabel')}</label>
                          <select
                            className="as-record-select"
                            value={record.status}
                            onChange={(e) => handleAttendanceChange(record.residentId, 'status', e.target.value)}
                            disabled={!attendanceAllowed}
                          >
                            <option value="present">{t('activitySchedule.statusPresent')}</option>
                            <option value="absent">{t('activitySchedule.statusAbsent')}</option>
                            <option value="late">{t('activitySchedule.statusLate')}</option>
                            <option value="left_early">{t('activitySchedule.statusLeftEarly')}</option>
                          </select>
                        </div>

                        <div>
                          <label className="as-record-label">{t('activitySchedule.participationLevel')}</label>
                          <select
                            className="as-record-select"
                            value={participation.participationLevel || 'active'}
                            onChange={(e) => handleParticipationChange(record.residentId, 'participationLevel', e.target.value)}
                            disabled={!attendanceAllowed}
                          >
                            <option value="passive">{t('activitySchedule.participationPassive')}</option>
                            <option value="partial">{t('activitySchedule.participationPartial')}</option>
                            <option value="active">{t('activitySchedule.participationActive')}</option>
                          </select>
                        </div>
                      </div>

                      <label className="as-record-label">{t('activitySchedule.commentLabel')}</label>
                      <textarea
                        className="as-record-textarea"
                        value={participation.comment || ''}
                        onChange={(e) => handleParticipationChange(record.residentId, 'comment', e.target.value)}
                        placeholder={t('activitySchedule.commentPlaceholder')}
                        disabled={!attendanceAllowed}
                        maxLength={500}
                      />

                      <label className="as-record-label">{t('activitySchedule.incidentLabel')}</label>
                      <textarea
                        className="as-record-textarea"
                        value={participation.incident || ''}
                        onChange={(e) => handleParticipationChange(record.residentId, 'incident', e.target.value)}
                        placeholder={t('activitySchedule.incidentPlaceholder')}
                        disabled={!attendanceAllowed}
                        maxLength={500}
                      />

                      <label className="as-record-label">{t('activitySchedule.attendanceNote')}</label>
                      <textarea
                        className="as-record-textarea"
                        value={record.note || ''}
                        onChange={(e) => handleAttendanceChange(record.residentId, 'note', e.target.value)}
                        placeholder={t('activitySchedule.attendanceNotePlaceholder')}
                        disabled={!attendanceAllowed}
                        maxLength={500}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="as-drawer-footer">
            <button
              className="as-btn-close-drawer"
              onClick={() => setSelectedActivity(null)}
            >
              {t('activitySchedule.close')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <div className="as-page">
      {/* Header */}
      <div className="as-header">
        <div className="as-header-left">
          <h1>
            <Calendar size={24} />
            {t('activitySchedule.title')}
          </h1>
          <p>{t('activitySchedule.subtitle')}</p>
        </div>
        <div className="as-view-toggle">
          <button
            type="button"
            className={`as-view-btn ${viewMode === 'list' ? 'as-view-btn--active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={14} /> {t('activitySchedule.view.list')}
          </button>
          <button
            type="button"
            className={`as-view-btn ${viewMode === 'calendar' ? 'as-view-btn--active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <LayoutGrid size={14} /> {t('activitySchedule.view.calendar')}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="as-filter-bar">
        <div className="as-filter-group">
          <span className="as-filter-label">{t('activitySchedule.filter.search')}</span>
          <div className="as-search-wrapper">
            <Search size={14} />
            <input
              type="text"
              className="as-search-input"
              placeholder={t('activitySchedule.filter.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="as-filter-group" style={{ flex: 'none', minWidth: 'auto' }}>
          <span className="as-filter-label">{t('activitySchedule.filter.status')}</span>
          <div className="as-pill-group">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`as-pill ${statusFilter === opt.value ? 'as-pill--active' : ''}`}
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="as-btn-refresh"
          onClick={() => fetchActivities()}
          style={{ alignSelf: 'flex-end' }}
        >
          <RefreshCw size={14} /> {t('activitySchedule.refresh')}
        </button>
      </div>

      {/* Calendar month nav (only in calendar mode) */}
      {viewMode === 'calendar' && (
        <div className="as-calendar-nav">
          <button type="button" className="as-nav-btn" onClick={handlePrevMonth}>
            <ChevronLeft size={16} />
          </button>
          <h2>
            {t('activitySchedule.monthYear', { month: currentDate.getMonth() + 1, year: currentDate.getFullYear() })}
          </h2>
          <button type="button" className="as-nav-btn" onClick={handleNextMonth}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Content */}
      {viewMode === 'list' ? <ListViewContent /> : <CalendarViewContent />}

      {/* Error */}
      {error && <div className="as-error">{error}</div>}

      {/* Detail drawer */}
      <DetailDrawer />
    </div>
  );
}
