import { useCallback, useEffect, useRef, useState } from 'react';
import staffService from '../../../../services/staff.service';
import {
  isReadinessRealtimeAvailable,
  subscribeEmergencyReadiness,
} from '../../../../services/readinessRealtime.service';
import { getLocalDateString } from '../../../../utils/dateUtils';
import facilityService from '../../../../services/facility.service';
import { floorLabel } from '../../../../components/facility/FloorRoomSelect';
import '../../../../styles/admin/EmergencyAvailabilityPage.css';

const ROLE_LABELS = { doctor: 'Bác sĩ', nurse: 'Y tá' };

const READINESS_CONFIG = {
  ready: { label: 'Sẵn sàng', dot: 'available', badge: 'available', legacy: 'Available' },
  caring: { label: 'Đang chăm sóc', dot: 'on-duty', badge: 'on-duty', legacy: 'On Duty' },
  off_duty: { label: 'Không trực', dot: 'off-shift', badge: 'off-shift', legacy: 'Off Shift' },
  on_leave: { label: 'Nghỉ phép', dot: 'on-leave', badge: 'on-leave', legacy: 'On Leave' },
};

const LEGACY_AVAIL_CONFIG = {
  Available: READINESS_CONFIG.ready,
  'On Duty': READINESS_CONFIG.caring,
  'Off Shift': READINESS_CONFIG.off_duty,
  'On Leave': READINESS_CONFIG.on_leave,
};

const AUTO_REFRESH_SECONDS = 30;

const resolveReadiness = (person) => {
  if (person.readinessLevel && READINESS_CONFIG[person.readinessLevel]) {
    return {
      ...READINESS_CONFIG[person.readinessLevel],
      label: person.readinessLabelVi || READINESS_CONFIG[person.readinessLevel].label,
    };
  }
  const legacy = LEGACY_AVAIL_CONFIG[person.availabilityStatus];
  return legacy || { label: person.availabilityStatus || '—', dot: 'off-shift', badge: 'off-shift' };
};

export default function EmergencyAvailabilityPage() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterAvail, setFilterAvail] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [search, setSearch] = useState('');
  const [checkDate, setCheckDate] = useState(getLocalDateString());
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [floorOptions, setFloorOptions] = useState([]);

  const timerRef = useRef(null);
  const countRef = useRef(null);
  const rtdbUnsubRef = useRef(null);

  const isToday = checkDate === getLocalDateString();

  useEffect(() => {
    facilityService
      .listFloors({ activeOnly: true })
      .then((data) => setFloorOptions(Array.isArray(data) ? data : []))
      .catch(() => setFloorOptions([]));
  }, []);

  const applyPayload = useCallback((res) => {
    setData(res?.data || []);
    setSummary(res?.summary || null);
    setLastUpdated(res?.checkedAt ? new Date(res.checkedAt) : new Date());
    setCountdown(AUTO_REFRESH_SECONDS);
  }, []);

  const loadFromApi = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { date: checkDate };
      if (filterRole) params.role = filterRole;
      if (filterFloor) params.floorId = filterFloor;
      const res = await staffService.getAvailability(params);
      applyPayload(res);
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể tải dữ liệu sẵn sàng');
    } finally {
      setLoading(false);
    }
  }, [checkDate, filterRole, filterFloor, applyPayload]);

  useEffect(() => {
    loadFromApi();
  }, [loadFromApi]);

  useEffect(() => {
    if (!isToday || liveConnected) {
      clearInterval(timerRef.current);
      clearInterval(countRef.current);
      return undefined;
    }

    timerRef.current = setInterval(loadFromApi, AUTO_REFRESH_SECONDS * 1000);
    countRef.current = setInterval(() => {
      setCountdown((c) => (c > 1 ? c - 1 : AUTO_REFRESH_SECONDS));
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(countRef.current);
    };
  }, [isToday, liveConnected, loadFromApi]);

  useEffect(() => {
    if (rtdbUnsubRef.current) {
      rtdbUnsubRef.current();
      rtdbUnsubRef.current = null;
    }
    setLiveConnected(false);

    if (!isToday || !isReadinessRealtimeAvailable()) return undefined;

    let cancelled = false;

    const connect = async () => {
      try {
        const unsub = await subscribeEmergencyReadiness(
          checkDate,
          (payload) => {
            if (cancelled) return;
            applyPayload(payload);
            setLiveConnected(true);
            setError('');
          },
          { role: filterRole || undefined, floorId: filterFloor || undefined }
        );

        if (cancelled) {
          unsub();
          return;
        }

        rtdbUnsubRef.current = unsub;
      } catch (e) {
        if (!cancelled) {
          const hint = e.status === 500
            ? ' (kiểm tra Firebase Admin / service account trên backend)'
            : e.status === 503
              ? ' (backend chưa bật Firebase)'
              : '';
          console.warn(`[EmergencyAvailability] RTDB unavailable, using REST polling: ${e.message}${hint}`);
          setLiveConnected(false);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (rtdbUnsubRef.current) {
        rtdbUnsubRef.current();
        rtdbUnsubRef.current = null;
      }
    };
  }, [checkDate, filterRole, filterFloor, isToday, applyPayload]);

  const filtered = data.filter((person) => {
    const cfg = resolveReadiness(person);
    const matchAvail = filterAvail
      ? person.readinessLevel === filterAvail
        || person.availabilityStatus === filterAvail
        || cfg.legacy === filterAvail
      : true;
    const matchSearch = !search || person.fullName?.toLowerCase().includes(search.toLowerCase());
    return matchAvail && matchSearch;
  });

  const stat = (key) => {
    if (summary) {
      const map = { ready: 'ready', caring: 'caring', off_duty: 'offDuty', on_leave: 'onLeave' };
      return summary[map[key]] ?? 0;
    }
    return data.filter((person) => person.readinessLevel === key).length;
  };

  return (
    <div className="emergency-page">
      <div className="emergency-page__header">
        <h1 className="emergency-page__title">Sẵn sàng khẩn cấp</h1>
        <p className="emergency-page__subtitle">
          Trạng thái bác sĩ/y tá liên kết ca làm việc đã xác nhận - cập nhật theo thời gian thực
        </p>
      </div>

      <div className="emergency-banner">
        <span style={{ fontSize: '1.2rem' }}>🚨</span>
        Trong trường hợp khẩn cấp, liên hệ nhân viên trạng thái <strong>Sẵn sàng</strong> trước tiên.
        <span className="emergency-banner__meta">
          {liveConnected && (
            <span className="live-badge">
              <span className="live-badge__dot" /> Realtime
            </span>
          )}
          {lastUpdated && (
            <span>
              Cập nhật lúc {lastUpdated.toLocaleTimeString('vi-VN')}
              {!liveConnected && isToday && ` · làm mới sau ${countdown}s`}
            </span>
          )}
        </span>
      </div>

      <div className="emergency-stats">
        <div className="stat-card stat-card--available">
          <div className="stat-card__value">{stat('ready')}</div>
          <div className="stat-card__label">🟢 Sẵn sàng</div>
        </div>
        <div className="stat-card stat-card--busy">
          <div className="stat-card__value">{stat('caring')}</div>
          <div className="stat-card__label">🟡 Đang chăm sóc</div>
        </div>
        <div className="stat-card stat-card--busy" style={{ opacity: 0.7 }}>
          <div className="stat-card__value">{stat('off_duty')}</div>
          <div className="stat-card__label">⚫ Không trực</div>
        </div>
        <div className="stat-card stat-card--off">
          <div className="stat-card__value">{stat('on_leave')}</div>
          <div className="stat-card__label">🔴 Nghỉ phép</div>
        </div>
      </div>

      <div className="filter-row">
        <input type="text" placeholder="Tìm tên..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <input type="date" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          <option value="doctor">Bác sĩ</option>
          <option value="nurse">Y tá</option>
        </select>
        <select value={filterAvail} onChange={(e) => setFilterAvail(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="ready">🟢 Sẵn sàng</option>
          <option value="caring">🟡 Đang chăm sóc</option>
          <option value="off_duty">⚫ Không trực</option>
          <option value="on_leave">🔴 Nghỉ phép</option>
        </select>
        <select
          value={filterFloor}
          onChange={(e) => setFilterFloor(e.target.value)}
          style={{ minWidth: 200 }}
        >
          <option value="">Tất cả tầng</option>
          {floorOptions.map((f) => (
            <option key={f._id} value={f._id}>{floorLabel(f)}</option>
          ))}
        </select>
        <button type="button" className="refresh-btn" onClick={loadFromApi}>
          🔄 Làm mới
        </button>
      </div>

      {error && <div className="emergency-error">{error}</div>}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Vai trò</th>
              <th>Mã NV</th>
              <th>Ca hiện tại</th>
              <th>Nhiệm vụ</th>
              <th>Nghỉ phép</th>
              <th>Mức sẵn sàng</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data.length && (
              <tr>
                <td colSpan={7} className="empty-state">Đang tải...</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state">Không tìm thấy nhân viên phù hợp</td>
              </tr>
            )}
            {filtered.map((person) => {
              const cfg = resolveReadiness(person);
              const shift = person.currentShift;

              return (
                <tr key={person._id}>
                  <td className="staff-name-cell">
                    {person.avatarUrl && (
                      <img src={person.avatarUrl} alt="" className="staff-avatar" />
                    )}
                    {person.fullName}
                  </td>
                  <td>
                    <span className={`role-badge role-badge--${person.role}`}>
                      {ROLE_LABELS[person.role] || person.role}
                    </span>
                  </td>
                  <td>{person.staffProfile?.staffCode || '—'}</td>
                  <td>
                    {person.isOnShift && shift ? (
                      <span className="shift-active">
                        ✓ {shift.name ? `${shift.name} · ` : ''}{shift.startTime}-{shift.endTime}
                      </span>
                    ) : person.onShift ? (
                      <span className="shift-active">✓ Đang trực</span>
                    ) : (
                      <span className="shift-inactive">— Không có ca</span>
                    )}
                  </td>
                  <td>
                    <span className={person.hasTasks ? 'task-active' : 'task-inactive'}>
                      {person.hasTasks ? '✓ Có nhiệm vụ' : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={person.onLeave ? 'leave-active' : 'leave-inactive'}>
                      {person.onLeave ? '✓ Đang nghỉ' : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`avail-badge avail-badge--${cfg.badge}`}>
                      <span className={`avail-dot avail-dot--${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
