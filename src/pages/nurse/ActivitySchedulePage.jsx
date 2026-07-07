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
import '../../styles/nurse/ActivitySchedulePage.css';

const formatDurationLabel = (durationMinutes) => {
  const totalMinutes = Number(durationMinutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '';

  const totalDays = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  const parts = [];
  if (totalDays > 0) parts.push(`${totalDays} ngày`);
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

  return `${startDate.toLocaleString('vi-VN')} → ${endDate.toLocaleString('vi-VN')}`;
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

const canRecordAttendance = (activity) => {
  const status = String(activity?.status || '').trim().toLowerCase();
  if (status === 'draft' || status === 'cancelled' || status === 'completed') {
    return false;
  }

  const startDate = new Date(activity?.startAt || activity?.scheduledAt);
  const endDate = new Date(activity?.endAt || activity?.startAt || activity?.scheduledAt);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return false;
  }

  const now = new Date();
  return now >= startDate && now <= endDate;
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
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordMessage, setRecordMessage] = useState('');

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

    const existingAttendance = (activity.attendanceRecords || []).reduce((acc, record) => {
      acc[record.residentId] = record;
      return acc;
    }, {});
    const existingParticipation = (activity.participationRecords || []).reduce((acc, record) => {
      acc[record.residentId] = record;
      return acc;
    }, {});

    const participantIds = activity.participantResidentIds || [];
    return {
      participantResultNotes: activity.participantResultNotes || '',
      attendanceRecords: participantIds.map((residentId) => ({
        residentId,
        status: existingAttendance[residentId]?.status || 'present',
        note: existingAttendance[residentId]?.note || '',
      })),
      participationRecords: participantIds.map((residentId) => ({
        residentId,
        participationLevel: existingParticipation[residentId]?.participationLevel || 'active',
        comment: existingParticipation[residentId]?.comment || '',
        incident: existingParticipation[residentId]?.incident || '',
      })),
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
            activities.map((activity) => (
              <tr
                key={activity._id}
                onClick={() => setSelectedActivity(activity)}
              >
                <td className="as-table-title">{activity.title}</td>
                <td>{activity.category || '-'}</td>
                <td>{formatActivityDateRange(activity)}</td>
                <td>{activity.location || '-'}</td>
                <td>
                  <span className={`as-status-badge as-status-badge--${activity.status || 'draft'}`}>
                    {statusLabels[activity.status] || activity.status}
                  </span>
                </td>
                <td className="as-participant-count">
                  {t('activitySchedule.residentCount', { count: activity.participantResidentIds?.length || 0 })}
                </td>
              </tr>
            ))
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
                {dayActivities.map((a) => (
                  <div
                    key={a._id}
                    className={`as-event-pill as-event-pill--${a.status || 'draft'}`}
                    onClick={() => setSelectedActivity(a)}
                    title={a.title}
                  >
                    {a.title}
                  </div>
                ))}
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
    const attendanceAllowed = canRecordAttendance(a);
    const [draft, setDraft] = useState(() => buildAttendanceFormFromActivity(a));

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
        setRecordMessage('Chỉ có thể điểm danh khi hoạt động đã được lên lịch và đang diễn ra.');
        return;
      }

      try {
        setSavingRecord(true);
        setRecordMessage('');
        const result = await activityService.recordParticipationResult(a._id, {
          participantResultNotes: draft.participantResultNotes.trim(),
          status: a.status === 'scheduled' ? 'completed' : a.status,
          attendanceRecords: draft.attendanceRecords,
          participationRecords: draft.participationRecords,
        });
        setSelectedActivity((prev) => (prev && prev._id === result?._id ? { ...prev, ...result } : result));
        setDraft(buildAttendanceFormFromActivity(result || a));
        setRecordMessage('Đã lưu điểm danh và ghi nhận tham gia cho hoạt động.');
      } catch (err) {
        console.error('Save activity attendance failed:', err);
        setRecordMessage(err.response?.data?.message || 'Không thể lưu dữ liệu.');
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
            <div className="as-detail-row">
              <Calendar size={16} />
              <span className="as-detail-label">{t('activitySchedule.detail.dateTime')}</span>
              <span className="as-detail-value">{formatActivityDateRange(a)}</span>
            </div>

            {a.endAt && (
              <div className="as-detail-row">
                <Clock size={16} />
                <span className="as-detail-label">Thời gian kết thúc</span>
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
                <span className="as-detail-value">{formatDurationLabel(a.durationMinutes)}</span>
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
                      {residents[rid]?.fullName || t('activitySchedule.residentById', { id: rid })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="as-record-section">
              <div className="as-record-header">
                <h3>Điểm danh & ghi nhận tham gia</h3>
                <button type="button" className="as-save-record-btn" onClick={handleSaveRecord} disabled={savingRecord || !attendanceAllowed}>
                  {savingRecord ? <Loader2 size={14} className="as-spin-icon" /> : <Save size={14} />}
                  {savingRecord ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>

              {recordMessage && (
                <div className={`as-record-message ${recordMessage.includes('Không thể') ? 'as-record-message--error' : ''}`}>
                  {recordMessage.includes('Không thể') ? <X size={14} /> : <CheckCircle2 size={14} />}
                  {recordMessage}
                </div>
              )}

              {!attendanceAllowed && (
                <div className="as-record-message as-record-message--error">
                  <X size={14} />
                  Chỉ có thể điểm danh khi hoạt động đã được lên lịch và đang diễn ra.
                </div>
              )}

              <label className="as-record-label">Nhận xét chung</label>
              <textarea
                className="as-record-textarea"
                value={draft.participantResultNotes}
                onChange={(e) => updateDraft((prev) => ({ ...prev, participantResultNotes: e.target.value }))}
                placeholder="Nhập nhận xét chung về hoạt động..."
                disabled={!attendanceAllowed}
              />

              {draft.attendanceRecords.map((record) => {
                const resident = residents[record.residentId];
                return (
                  <div key={record.residentId} className="as-resident-record-card">
                    <div className="as-resident-record-title">
                      <User size={14} />
                      <span>{resident?.fullName || record.residentId}</span>
                    </div>

                    <div className="as-resident-record-grid">
                      <div>
                        <label className="as-record-label">Điểm danh</label>
                        <select
                          className="as-record-select"
                          value={record.status}
                          onChange={(e) => handleAttendanceChange(record.residentId, 'status', e.target.value)}
                          disabled={!attendanceAllowed}
                        >
                          <option value="present">Có mặt</option>
                          <option value="absent">Vắng mặt</option>
                          <option value="late">Muộn</option>
                          <option value="left_early">Về sớm</option>
                        </select>
                      </div>

                      <div>
                        <label className="as-record-label">Mức độ tham gia</label>
                        <select
                          className="as-record-select"
                          value={draft.participationRecords.find((item) => item.residentId === record.residentId)?.participationLevel || 'active'}
                          onChange={(e) => handleParticipationChange(record.residentId, 'participationLevel', e.target.value)}
                          disabled={!attendanceAllowed}
                        >
                          <option value="active">Tích cực</option>
                          <option value="partial">Một phần</option>
                          <option value="passive">Thụ động</option>
                        </select>
                      </div>
                    </div>

                    <label className="as-record-label">Nhận xét</label>
                    <textarea
                      className="as-record-textarea"
                      value={draft.participationRecords.find((item) => item.residentId === record.residentId)?.comment || ''}
                      onChange={(e) => handleParticipationChange(record.residentId, 'comment', e.target.value)}
                      placeholder="Nhập nhận xét..."
                      disabled={!attendanceAllowed}
                    />

                    <label className="as-record-label">Sự cố</label>
                    <textarea
                      className="as-record-textarea"
                      value={draft.participationRecords.find((item) => item.residentId === record.residentId)?.incident || ''}
                      onChange={(e) => handleParticipationChange(record.residentId, 'incident', e.target.value)}
                      placeholder="Nếu có, ghi rõ sự cố..."
                      disabled={!attendanceAllowed}
                    />

                    <label className="as-record-label">Ghi chú điểm danh</label>
                    <textarea
                      className="as-record-textarea"
                      value={record.note || ''}
                      onChange={(e) => handleAttendanceChange(record.residentId, 'note', e.target.value)}
                      placeholder="Ghi chú thêm về điểm danh..."
                      disabled={!attendanceAllowed}
                    />
                  </div>
                );
              })}
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
