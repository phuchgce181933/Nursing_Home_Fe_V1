import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import staffService from '../../../../services/staff.service';
import ListPagination from '../../../../components/ui/ListPagination';
import useClientPagination from '../../../../hooks/useClientPagination';
import {
  isReadinessRealtimeAvailable,
  subscribeEmergencyReadiness,
} from '../../../../services/readinessRealtime.service';
import { getLocalDateString } from '../../../../utils/dateUtils';
import {
  formatResponsibleFloorLabels,
} from '../../../../utils/staffAvailabilityDisplay';
import facilityService from '../../../../services/facility.service';
import { formatFloorWithBuilding } from '../../../../utils/residentArea';
import EmergencyStaffDetailModal from './EmergencyStaffDetailModal';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import '../../../../styles/admin/EmergencyAvailabilityPage.css';

const READINESS_CONFIG = (t) => ({
  ready: { label: t('admin.staff.emergency.readiness.ready'), dot: 'available', badge: 'available', legacy: 'Available' },
  caring: { label: t('admin.staff.emergency.readiness.caring'), dot: 'on-duty', badge: 'on-duty', legacy: 'On Duty' },
  off_duty: { label: t('admin.staff.emergency.readiness.off_duty'), dot: 'off-shift', badge: 'off-shift', legacy: 'Off Shift' },
  on_leave: { label: t('admin.staff.emergency.readiness.on_leave'), dot: 'on-leave', badge: 'on-leave', legacy: 'On Leave' },
});

const LEGACY_AVAIL_CONFIG = (t) => {
  const cfg = READINESS_CONFIG(t);
  return {
    Available: cfg.ready,
    'On Duty': cfg.caring,
    'Off Shift': cfg.off_duty,
    'On Leave': cfg.on_leave,
  };
};

const AUTO_REFRESH_SECONDS = 30;

const dateLocale = (language) => (language === 'vi' ? 'vi-VN' : 'en-US');

const formatCheckDate = (iso, language) => {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(dateLocale(language), {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const resolveReadiness = (person, t) => {
  const readinessConfig = READINESS_CONFIG(t);
  if (person.readinessLevel && readinessConfig[person.readinessLevel]) {
    return {
      ...readinessConfig[person.readinessLevel],
      label: person.readinessLabelVi || readinessConfig[person.readinessLevel].label,
    };
  }
  const legacy = LEGACY_AVAIL_CONFIG(t)[person.availabilityStatus];
  return legacy || { label: person.availabilityStatus || '—', dot: 'off-shift', badge: 'off-shift' };
};

export default function EmergencyAvailabilityPage() {
  const { t, i18n } = useTranslation();
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
  const [buildingOptions, setBuildingOptions] = useState([]);
  const [detailPerson, setDetailPerson] = useState(null);

  const timerRef = useRef(null);
  const countRef = useRef(null);
  const rtdbUnsubRef = useRef(null);

  const isToday = checkDate === getLocalDateString();

  const floorById = useMemo(() => {
    const map = new Map();
    for (const floor of floorOptions) {
      if (floor?._id) map.set(String(floor._id), floor);
    }
    return map;
  }, [floorOptions]);

  const buildingById = useMemo(() => {
    const map = new Map();
    for (const building of buildingOptions) {
      if (building?._id) map.set(String(building._id), building);
    }
    return map;
  }, [buildingOptions]);

  const areaLookup = useMemo(
    () => ({ floorById, buildingById }),
    [floorById, buildingById]
  );

  useEffect(() => {
    Promise.all([
      facilityService.listFloors({ activeOnly: true }),
      facilityService.listBuildings({ activeOnly: true }),
    ])
      .then(([floors, buildings]) => {
        setFloorOptions(Array.isArray(floors) ? floors : []);
        setBuildingOptions(Array.isArray(buildings) ? buildings : []);
      })
      .catch(() => {
        setFloorOptions([]);
        setBuildingOptions([]);
      });
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
      setError(e.response?.data?.message || t('admin.staff.emergency.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [checkDate, filterRole, filterFloor, applyPayload, t]);

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
    const cfg = resolveReadiness(person, t);
    const matchAvail = filterAvail
      ? person.readinessLevel === filterAvail
        || person.availabilityStatus === filterAvail
        || cfg.legacy === filterAvail
      : true;
    const matchSearch = !search || person.fullName?.toLowerCase().includes(search.toLowerCase());
    return matchAvail && matchSearch;
  });

  const {
    paginatedItems: paginatedStaff,
    page,
    setPage,
    totalPages,
    total: filteredTotal,
  } = useClientPagination(filtered);

  useEffect(() => {
    setPage(1);
  }, [search, filterAvail, filterRole, filterFloor, checkDate, setPage]);

  const stat = (key) => {
    if (summary) {
      const map = { ready: 'ready', caring: 'caring', off_duty: 'offDuty', on_leave: 'onLeave' };
      return summary[map[key]] ?? 0;
    }
    return data.filter((person) => person.readinessLevel === key).length;
  };

  return (
    <AdminPageShell
      title={t('admin.staff.emergency.title')}
      subtitle={
        <>
          {t('admin.staff.emergency.subtitle')}
          {isToday && t('admin.staff.emergency.subtitleTodaySuffix')}
        </>
      }
    >

      {!isToday && (
        <p className="emergency-date-hint">
          {t('admin.staff.emergency.dateHint', { date: formatCheckDate(checkDate, i18n.language) })}
        </p>
      )}

      <div className="emergency-banner">
        <span style={{ fontSize: '1.2rem' }}>🚨</span>
        {t('admin.staff.emergency.banner')}
        <span className="emergency-banner__meta">
          {liveConnected && (
            <span className="live-badge">
              <span className="live-badge__dot" /> {t('admin.staff.emergency.realtime')}
            </span>
          )}
          {lastUpdated && (
            <span>
              {t('admin.staff.emergency.updatedAt', {
                time: lastUpdated.toLocaleTimeString(dateLocale(i18n.language)),
              })}
              {!liveConnected && isToday && ` · ${t('admin.staff.emergency.refreshIn', { seconds: countdown })}`}
            </span>
          )}
        </span>
      </div>

      <div className="emergency-stats">
        <div className="stat-card stat-card--available">
          <div className="stat-card__value">{stat('ready')}</div>
          <div className="stat-card__label">🟢 {t('admin.staff.emergency.statReady')}</div>
        </div>
        <div className="stat-card stat-card--busy">
          <div className="stat-card__value">{stat('caring')}</div>
          <div className="stat-card__label">🟡 {t('admin.staff.emergency.statCaring')}</div>
        </div>
        <div className="stat-card stat-card--busy" style={{ opacity: 0.7 }}>
          <div className="stat-card__value">{stat('off_duty')}</div>
          <div className="stat-card__label">⚫ {t('admin.staff.emergency.statOffDuty')}</div>
        </div>
        <div className="stat-card stat-card--off">
          <div className="stat-card__value">{stat('on_leave')}</div>
          <div className="stat-card__label">🔴 {t('admin.staff.emergency.statOnLeave')}</div>
        </div>
      </div>

      <div className="filter-row">
        <input type="search" placeholder={t('admin.staff.emergency.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <input type="date" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">{t('admin.staff.common.allRoles')}</option>
          <option value="doctor">{t('common.roles.doctor')}</option>
          <option value="nurse">{t('common.roles.nurse')}</option>
        </select>
        <select value={filterAvail} onChange={(e) => setFilterAvail(e.target.value)}>
          <option value="">{t('common.allStatuses')}</option>
          <option value="ready">🟢 {t('admin.staff.emergency.statReady')}</option>
          <option value="caring">🟡 {t('admin.staff.emergency.statCaring')}</option>
          <option value="off_duty">⚫ {t('admin.staff.emergency.statOffDuty')}</option>
          <option value="on_leave">🔴 {t('admin.staff.emergency.statOnLeave')}</option>
        </select>
        <select
          value={filterFloor}
          onChange={(e) => setFilterFloor(e.target.value)}
          style={{ minWidth: 200 }}
        >
          <option value="">{t('admin.staff.emergency.allFloors')}</option>
          {floorOptions.map((f) => (
            <option key={f._id} value={f._id}>{formatFloorWithBuilding(f, t, areaLookup)}</option>
          ))}
        </select>
        <button type="button" className="refresh-btn" onClick={loadFromApi}>
          {t('admin.staff.common.refresh')}
        </button>
      </div>

      {error && <div className="emergency-error">{error}</div>}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('admin.staff.emergency.colName')}</th>
              <th>{t('common.colRole')}</th>
              <th>{t('admin.staff.emergency.colFloors')}</th>
              <th>{t('admin.staff.emergency.colReadiness')}</th>
              <th>{t('common.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data.length && (
              <tr>
                <td colSpan={5} className="empty-state">{t('common.loading')}</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">{t('admin.staff.emergency.emptyFiltered')}</td>
              </tr>
            )}
            {paginatedStaff.map((person) => {
              const cfg = resolveReadiness(person, t);
              const floorLabelText = formatResponsibleFloorLabels(person, t, areaLookup);

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
                      {t(`common.roles.${person.role}`, { defaultValue: person.role })}
                    </span>
                  </td>
                  <td className="emergency-table-cell--wrap" title={floorLabelText}>
                    {floorLabelText}
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
                      aria-label={t('admin.staff.emergency.detail')}
                      title={t('admin.staff.emergency.detail')}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <ListPagination
          page={page}
          totalPages={totalPages}
          total={filteredTotal}
          onPageChange={setPage}
        />
      )}

      {detailPerson && (
        <EmergencyStaffDetailModal
          person={detailPerson}
          readinessConfig={resolveReadiness(detailPerson, t)}
          checkDateLabel={formatCheckDate(checkDate, i18n.language)}
          floorById={areaLookup}
          onClose={() => setDetailPerson(null)}
        />
      )}
    </AdminPageShell>
  );
}
