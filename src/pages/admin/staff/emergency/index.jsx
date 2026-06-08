import { useCallback, useEffect, useRef, useState } from 'react';
import staffService from '../../../../services/staff.service';
import {
  isReadinessRealtimeAvailable,
  subscribeEmergencyReadiness,
} from '../../../../services/readinessRealtime.service';
import { getLocalDateString } from '../../../../utils/dateUtils';
import {
  formatResponsibleFloorLabels,
  formatTaskSummary,
} from '../../../../utils/staffAvailabilityDisplay';
import facilityService from '../../../../services/facility.service';
import { floorLabel } from '../../../../components/facility/FloorRoomSelect';
import EmergencyStaffDetailModal from './EmergencyStaffDetailModal';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
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

const formatCheckDateVi = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
};

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
  const [detailPerson, setDetailPerson] = useState(null);

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
    <AdminPageShell
      title="Sẵn sàng khẩn cấp"
      subtitle={
        <>
          Trạng thái bác sĩ/y tá theo ngày đã chọn — ca đã đăng hoặc đã xác nhận; nhiệm vụ chỉ tính khi cùng ngày và còn ca hợp lệ.
          {isToday && ' Cập nhật theo thời gian thực khi xem hôm nay.'}
        </>
      }
    >

      {!isToday && (
        <p className="emergency-date-hint">
          Đang xem ngày <strong>{formatCheckDateVi(checkDate)}</strong>. Đổi ngày để so sánh — nhiệm vụ ngày khác không hiển thị ở đây.
        </p>
      )}

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

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>Họ tên</th>
              <th>Vai trò</th>
              <th>Tầng phụ trách</th>
              <th>Nhiệm vụ</th>
              <th>Mức sẵn sàng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data.length && (
              <tr>
                <td colSpan={6} className="empty-state">Đang tải...</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">Không tìm thấy nhân viên phù hợp</td>
              </tr>
            )}
            {filtered.map((person) => {
              const cfg = resolveReadiness(person);
              const floorLabel = formatResponsibleFloorLabels(person);
              const taskLabel = formatTaskSummary(person);

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
                  <td className="emergency-table-cell--wrap" title={floorLabel}>
                    {floorLabel}
                  </td>
                  <td>
                    <span className={person.hasTasks ? 'task-active' : 'task-inactive'}>
                      {taskLabel}
                    </span>
                  </td>
                  <td>
                    <span className={`avail-badge avail-badge--${cfg.badge}`}>
                      <span className={`avail-dot avail-dot--${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="emergency-detail-btn"
                      onClick={() => setDetailPerson(person)}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detailPerson && (
        <EmergencyStaffDetailModal
          person={detailPerson}
          readinessConfig={resolveReadiness(detailPerson)}
          checkDateLabel={formatCheckDateVi(checkDate)}
          onClose={() => setDetailPerson(null)}
        />
      )}
    </AdminPageShell>
  );
}
