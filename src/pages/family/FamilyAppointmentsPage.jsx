import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, Stethoscope, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import familyPortalService from '../../services/familyPortal.service';
import axiosClient from '../../api/axiosClient';
import '../../styles/family/FamilyAppointmentsPage.css';

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_VI = {
  scheduled: 'Chờ khám',
  in_progress: 'Đang khám',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'scheduled', label: 'Chờ khám' },
  { value: 'in_progress', label: 'Đang khám' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

function formatTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateParts(str) {
  if (!str) return { day: '—', month: '—', year: '—', weekday: '' };
  const d = new Date(str);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('vi-VN', { month: 'short' }),
    year: d.getFullYear(),
    weekday: d.toLocaleDateString('vi-VN', { weekday: 'long' }),
  };
}

function isUpcoming(str) {
  if (!str) return false;
  const diff = new Date(str) - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000; // within 24h
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function FamilyAppointmentsPage() {
  const [residents, setResidents] = useState([]);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');

  // Load residents on mount
  useEffect(() => {
    familyPortalService.getFamilyResidents()
      .then(res => {
        const list = res?.data || res || [];
        setResidents(list);
        if (list.length > 0) setSelectedResidentId(list[0]._id);
      })
      .catch(err => console.error('Failed to load residents:', err));
  }, []);

  // Fetch appointments when resident or filters change
  const fetchAppointments = useCallback(async () => {
    if (!selectedResidentId) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        status: statusFilter || undefined,
        from: fromFilter ? new Date(fromFilter + 'T00:00:00').toISOString() : undefined,
        to: toFilter ? new Date(toFilter + 'T23:59:59').toISOString() : undefined,
        limit: 200,
      };
      const res = await axiosClient.get(
        `/family/residents/${selectedResidentId}/care-appointments`,
        { params }
      );
      const list = res.data?.data || res.data || [];
      // Sort: upcoming first, then by date desc
      list.sort((a, b) => new Date(b.scheduledStartAt) - new Date(a.scheduledStartAt));
      setAppointments(list);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Không thể tải lịch khám. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [selectedResidentId, statusFilter, fromFilter, toFilter]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Stats
  const total = appointments.length;
  const scheduled = appointments.filter(a => a.status === 'scheduled').length;
  const inProgress = appointments.filter(a => a.status === 'in_progress').length;
  const completed = appointments.filter(a => a.status === 'completed').length;

  const selectedResident = residents.find(r => r._id === selectedResidentId);

  return (
    <div className="fap-root">
      {/* Header */}
      <div className="fap-header">
        <div className="fap-title-block">
          <div className="fap-title-icon">
            <Calendar size={22} color="#fff" />
          </div>
          <div>
            <h1 className="fap-title">Lịch Khám Của Người Thân</h1>
            <p className="fap-subtitle">Theo dõi lịch hẹn khám của cư dân</p>
          </div>
        </div>
        <button
          onClick={fetchAppointments}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: '#94a3b8', cursor: 'pointer', fontSize: 13,
          }}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {/* Resident Selector */}
      {residents.length > 1 && (
        <div className="fap-resident-bar">
          <span className="fap-resident-label">Cư dân:</span>
          <div className="fap-resident-tabs">
            {residents.map(r => (
              <button
                key={r._id}
                className={`fap-resident-tab${r._id === selectedResidentId ? ' active' : ''}`}
                onClick={() => setSelectedResidentId(r._id)}
              >
                {r.fullName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="fap-filters">
        <select
          className="fap-filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          className="fap-filter-input"
          value={fromFilter}
          onChange={e => setFromFilter(e.target.value)}
          placeholder="Từ ngày"
          title="Từ ngày"
        />
        <input
          type="date"
          className="fap-filter-input"
          value={toFilter}
          onChange={e => setToFilter(e.target.value)}
          placeholder="Đến ngày"
          title="Đến ngày"
        />
        {(statusFilter || fromFilter || toFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setFromFilter(''); setToFilter(''); }}
            style={{
              padding: '8px 14px', borderRadius: 10,
              border: '1px solid rgba(248,113,113,0.3)',
              background: 'rgba(248,113,113,0.1)',
              color: '#fca5a5', cursor: 'pointer', fontSize: 13,
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="fap-stats">
          <div className="fap-stat">
            <div className="fap-stat-num" style={{ color: '#a5b4fc' }}>{total}</div>
            <div className="fap-stat-label">Tổng lịch khám</div>
          </div>
          <div className="fap-stat">
            <div className="fap-stat-num" style={{ color: '#93c5fd' }}>{scheduled}</div>
            <div className="fap-stat-label">Chờ khám</div>
          </div>
          <div className="fap-stat">
            <div className="fap-stat-num" style={{ color: '#fcd34d' }}>{inProgress}</div>
            <div className="fap-stat-label">Đang khám</div>
          </div>
          <div className="fap-stat">
            <div className="fap-stat-num" style={{ color: '#6ee7b7' }}>{completed}</div>
            <div className="fap-stat-label">Hoàn thành</div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="fap-loading">
          <Loader2 size={20} className="animate-spin" />
          <span>Đang tải lịch khám...</span>
        </div>
      ) : error ? (
        <div className="fap-error">
          <AlertCircle size={20} style={{ marginBottom: 8 }} />
          <div>{error}</div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="fap-empty">
          <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.25 }} />
          <div style={{ fontSize: 16, marginBottom: 6 }}>
            {selectedResident ? `${selectedResident.fullName} chưa có lịch khám nào` : 'Chưa có lịch khám'}
          </div>
          <div style={{ fontSize: 13, color: '#475569' }}>Lịch khám sẽ hiển thị khi được đặt lịch</div>
        </div>
      ) : (
        <div className="fap-list">
          {appointments.map(appt => {
            const { day, month, year, weekday } = formatDateParts(appt.scheduledStartAt);
            const upcoming = isUpcoming(appt.scheduledStartAt);
            return (
              <div key={appt._id} className={`fap-card ${appt.status}`}>
                {/* Date */}
                <div className="fap-card-date">
                  <div className="fap-card-day">{day}</div>
                  <div className="fap-card-month">{month} {year}</div>
                </div>

                {/* Divider */}
                <div className="fap-card-divider" />

                {/* Body */}
                <div className="fap-card-body">
                  <div className="fap-card-type">
                    <Stethoscope size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    {appt.appointmentType || 'Khám tổng quát'}
                  </div>
                  <div className="fap-card-time">
                    <Clock size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                    {weekday} · {formatTime(appt.scheduledStartAt)} – {formatTime(appt.scheduledEndAt)}
                  </div>
                  {(appt.doctorStaffId?.userId?.fullName) && (
                    <div className="fap-card-staff">
                      <User size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                      BS. {appt.doctorStaffId.userId.fullName}
                      {appt.nurseStaffId?.userId?.fullName && (
                        <span style={{ color: '#f9a8d4', marginLeft: 10 }}>
                          · YT. {appt.nurseStaffId.userId.fullName}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="fap-card-tags">
                    <span className={`fap-badge fap-badge-${appt.status}`}>
                      {STATUS_VI[appt.status] || appt.status}
                    </span>
                    {upcoming && appt.status === 'scheduled' && (
                      <span className="fap-upcoming-label">
                        ⏰ Sắp diễn ra
                      </span>
                    )}
                    {appt.notes && (
                      <span style={{
                        fontSize: 11, color: '#94a3b8',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '3px 10px', borderRadius: 20,
                        maxWidth: 200, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        📝 {appt.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Icon */}
                <div className="fap-card-icon">
                  <Calendar size={18} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
