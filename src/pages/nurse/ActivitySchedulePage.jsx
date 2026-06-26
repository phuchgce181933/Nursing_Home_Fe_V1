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
} from 'lucide-react';
import activityService from '../../services/activity.service';
import residentService from '../../services/resident.service';
import '../../styles/nurse/ActivitySchedulePage.css';

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */
const getStatusOptions = (t) => [
  { value: '', label: t('activitySchedule.status.all') },
  { value: 'scheduled', label: t('activitySchedule.status.scheduled') },
  { value: 'ongoing', label: t('activitySchedule.status.ongoing') },
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

  const getActivitiesForDate = (date) =>
    activities.filter(
      (a) => new Date(a.scheduledAt).toDateString() === date.toDateString(),
    );

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
                <td>
                  {activity.scheduledAt
                    ? new Date(activity.scheduledAt).toLocaleString('vi-VN')
                    : '-'}
                </td>
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
              <span className="as-detail-value">
                {a.scheduledAt ? new Date(a.scheduledAt).toLocaleString('vi-VN') : '-'}
              </span>
            </div>

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
                <span className="as-detail-value">{t('activitySchedule.minutes', { count: a.durationMinutes })}</span>
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
