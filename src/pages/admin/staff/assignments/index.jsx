import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveApiError, resolveApiSuccess } from '../../../../utils/apiMessage';
import staffService from '../../../../services/staff.service';
import careTaskService from '../../../../services/careTask.service';
import facilityService from '../../../../services/facility.service';
import ListPagination from '../../../../components/ui/ListPagination';
import useDebouncedSearch from '../../../../hooks/useDebouncedSearch';
import useClientPagination from '../../../../hooks/useClientPagination';
import { floorLabel, roomLabel } from '../../../../components/facility/FloorRoomSelect';
import {
  canAssignAreas,
  canAssignResidents,
  canReceiveCareTask,
  NON_ASSIGNABLE_ROLES,
} from '../../../../utils/staffAssignable';
import { isStaffOnLeaveForAssignment } from '../../../../utils/leaveUtils';
import { getApiErrorPayload, blockingCareTasksMessage } from '../../../../utils/blockingCareTasks';
import BlockingCareTasksAlert from '../../../../components/staff/BlockingCareTasksAlert';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import { filterShiftsNotEnded, todayVN } from '../../../../utils/dateUtils';
import '../../../../styles/admin/StaffAssignmentPage.css';

const TASK_TYPE_VALUES = [
  'morning_care',
  'medication',
  'physical_therapy',
  'meal_assistance',
  'evening_check',
  'emergency_response',
];
const CARE_LEVEL_VALUES = ['low', 'medium', 'high'];
const CARE_LEVEL_EMOJI = { low: '🟢', medium: '🟠', high: '🔴' };

const dateLocale = (language) => (language === 'vi' ? 'vi-VN' : 'en-US');

const taskTypeLabel = (t, value) =>
  t(`admin.staff.assignments.taskTypes.${value}`, { defaultValue: value });

const careLevelLabel = (t, value) => {
  const emoji = CARE_LEVEL_EMOJI[value] || '';
  const label = t(`common.careLevel.${value}`, { defaultValue: value });
  return emoji ? `${emoji} ${label}` : label;
};

const roleLabel = (t, role) => t(`common.roles.${role}`, { defaultValue: role });

const shiftStatusLabel = (t, status) =>
  t(`common.shiftStatus.${status}`, { defaultValue: status });

const filterAssignableStaff = (list) =>
  (list || []).filter(
    (s) => !NON_ASSIGNABLE_ROLES.includes(String(s.role || '').toLowerCase())
  );

const ELIGIBLE_SHIFT_STATUSES = ['published', 'confirmed'];

const filterEligibleShifts = (shifts) =>
  (shifts || []).filter((s) => ELIGIBLE_SHIFT_STATUSES.includes(s.status));

const buildShiftTimeLabel = (shifts) =>
  shifts.length ? shifts.map((s) => `${s.startTime} – ${s.endTime}`).join(', ') : '';

const resolveShiftSummaryForDisplay = (summary, assignmentDate, now = new Date()) => {
  if (!summary) return null;
  const active = filterShiftsNotEnded(
    filterEligibleShifts(summary.shiftsOnDate),
    assignmentDate,
    now
  );
  return {
    ...summary,
    shiftsOnDate: active,
    hasShiftOnDate: active.length > 0,
    shiftTimeLabel: buildShiftTimeLabel(active),
  };
};

const hasActiveShiftOnDate = (staff, assignmentDate, displayNow) => {
  const resolved = resolveShiftSummaryForDisplay(staff?.shiftSummary, assignmentDate, displayNow);
  return Boolean(resolved?.hasShiftOnDate);
};

/** Re-render every minute when viewing today so ended shifts disappear without reload. */
function useMinuteNow(enabled) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

function formatAssignmentDate(iso, language) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(dateLocale(language), {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function NonAssignableBadge() {
  const { t } = useTranslation();
  return <span className="shift-badge shift-badge--muted">{t('admin.staff.assignments.badges.nonAssignable')}</span>;
}

/** Badge ca trong ngày (từ shiftSummary trên GET /api/staff?assignmentDate=) */
function ShiftSummaryBadge({ summary, assignmentDate, displayNow, assignable = true }) {
  const { t } = useTranslation();
  if (!assignable) return <NonAssignableBadge />;
  if (!summary) return <span className="shift-badge shift-badge--muted">—</span>;
  const resolved = resolveShiftSummaryForDisplay(summary, assignmentDate, displayNow);
  if (resolved.onLeave) return <span className="shift-badge shift-badge--leave">{t('admin.staff.assignments.badges.onLeave')}</span>;
  if (resolved.hasShiftOnDate) {
    const shifts = resolved.shiftsOnDate || [];
    return (
      <div className="shift-badge-group">
        {shifts.map((sh) => (
          <span
            key={sh._id}
            className="shift-badge shift-badge--on"
            title={[sh.name, `${sh.startTime} – ${sh.endTime}`].filter(Boolean).join(' · ')}
          >
            {sh.startTime} – {sh.endTime}
          </span>
        ))}
      </div>
    );
  }
  return <span className="shift-badge shift-badge--off">{t('admin.staff.assignments.badges.noShift')}</span>;
}

/** Chi tiết ca trong panel phải — dùng shiftSummary.shiftsOnDate */
function ShiftDetailPanel({ summary, assignmentDate, displayNow }) {
  const { t, i18n } = useTranslation();
  if (!summary) return null;
  const resolved = resolveShiftSummaryForDisplay(summary, assignmentDate, displayNow);
  const dateLabel = assignmentDate || resolved.assignmentDate;
  return (
    <div className="shift-detail-panel">
      <div className="shift-detail-panel__title">
        {t('admin.staff.assignments.shiftDetail.title', {
          date: formatAssignmentDate(dateLabel, i18n.language),
        })}
      </div>
      {resolved.onLeave && (
        <p className="shift-detail-panel__hint shift-detail-panel__hint--warn">
          {t('admin.staff.assignments.shiftDetail.onLeaveHint')}
        </p>
      )}
      {!resolved.onLeave && resolved.shiftsOnDate?.length > 0 ? (
        <ul className="shift-detail-panel__list">
          {resolved.shiftsOnDate.map((sh) => (
            <li key={sh._id} className="shift-detail-panel__item">
              <span className="shift-detail-panel__name">{sh.name}</span>
              <span className="shift-detail-panel__time">{sh.startTime} – {sh.endTime}</span>
              <span className={`shift-status-tag shift-status-tag--${sh.status}`}>
                {shiftStatusLabel(t, sh.status)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        !resolved.onLeave && (
          <p className="shift-detail-panel__hint">{t('admin.staff.assignments.shiftDetail.noShiftsHint')}</p>
        )
      )}
    </div>
  );
}

// ── Alert helper ──────────────────────────────────────────────────────────────
function Alert({ type, msg }) {
  if (!msg) return null;
  const styles = {
    success: { background: '#dcfce7', border: '1px solid #86efac', color: '#15803d' },
    error:   { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' },
    warning: { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' },
  };
  return (
    <div style={{ ...styles[type], borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontSize: '0.875rem' }}>
      {msg}
    </div>
  );
}

// ── Tab 1: Area Assignment ────────────────────────────────────────────────────
function AreaTab({ staff, staffPool, loading, assignmentDate, displayNow, onStaffUpdated, staffPagination }) {
  const { t } = useTranslation();
  const [selected, setSelected]         = useState(null);
  const [selectedFloorIds, setSelectedFloorIds] = useState([]);
  const [selectedRoomIds, setSelectedRoomIds]   = useState([]);
  const [floors, setFloors]             = useState([]);
  const [rooms, setRooms]               = useState([]);
  const [loadingFloors, setLoadingFloors] = useState(true);
  const [loadingRooms, setLoadingRooms]   = useState(false);
  const [saving, setSaving]               = useState(false);
  const [success, setSuccess]           = useState('');
  const [error, setError]               = useState('');
  const [blockingTasks, setBlockingTasks] = useState([]);
  const [infos, setInfos]               = useState([]);

  const floorLabelMap = useMemo(
    () => Object.fromEntries(floors.map((f) => [f._id, floorLabel(f)])),
    [floors]
  );

  useEffect(() => {
    facilityService
      .listFloors({ activeOnly: true })
      .then((data) => setFloors(Array.isArray(data) ? data : []))
      .catch(() => setFloors([]))
      .finally(() => setLoadingFloors(false));
  }, []);

  useEffect(() => {
    if (!selectedFloorIds.length) {
      setRooms([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingRooms(true);
    Promise.all(selectedFloorIds.map((id) => facilityService.listRoomsByFloor(id)))
      .then((results) => {
        if (cancelled) return;
        setRooms(results.flat());
      })
      .catch(() => {
        if (!cancelled) setRooms([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRooms(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFloorIds]);

  const resolveAreaLabel = (area) => {
    if (typeof area === 'object' && area !== null) {
      return floorLabel(area);
    }
    return floorLabelMap[area] || area;
  };

  const toggleFloor = (id) => {
    setSelectedFloorIds((prev) => {
      const removing = prev.includes(id);
      const next = removing ? prev.filter((x) => x !== id) : [...prev, id];
      if (removing) {
        setSelectedRoomIds((roomPrev) =>
          roomPrev.filter((rid) => {
            const room = rooms.find((r) => r._id === rid);
            return !room || String(room.floorId) !== String(id);
          })
        );
      }
      return next;
    });
  };

  const toggleRoom = (id) => {
    setSelectedRoomIds((prev) =>
      (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    );
  };

  useEffect(() => {
    setSelected(null);
    setSelectedFloorIds([]);
    setSelectedRoomIds([]);
    setSuccess('');
    setError('');
    setBlockingTasks([]);
    setInfos([]);
  }, [assignmentDate]);

  useEffect(() => {
    if (!selected) return;
    const stillInPool = staffPool?.some((s) => s._id === selected._id);
    if (!stillInPool || !hasActiveShiftOnDate(selected, assignmentDate, displayNow)) {
      setSelected(null);
      setSelectedFloorIds([]);
      setSelectedRoomIds([]);
      setSuccess('');
      setError('');
      setBlockingTasks([]);
      setInfos([]);
    }
  }, [staffPool, selected, assignmentDate, displayNow]);

  const handleSelect = (s) => {
    if (!canAssignAreas(s) || isStaffOnLeaveForAssignment(s)) return;
    setSelected(s);
    setSuccess('');
    setError('');
    setBlockingTasks([]);
    setInfos([]);
    const { floorIds, roomIds } = areaIdsFromProfile(s.staffProfile);
    setSelectedFloorIds(floorIds);
    setSelectedRoomIds(roomIds);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    setBlockingTasks([]);
    setSuccess('');
    setInfos([]);
    try {
      const res = await staffService.assignAreas(selected._id, {
        floorIds: selectedFloorIds,
        roomIds: selectedRoomIds,
      });
      setSuccess(t('admin.staff.assignments.area.areaUpdated'));
      const hints = res.info || res.warnings || [];
      if (hints.length) setInfos(hints);

      if (res.staffProfile) {
        const { floorIds, roomIds } = areaIdsFromProfile(res.staffProfile);
        setSelected((prev) =>
          prev ? { ...prev, staffProfile: res.staffProfile } : prev
        );
        setSelectedFloorIds(floorIds);
        setSelectedRoomIds(roomIds);
      }

      const pruned = res.residentsPruned;
      if (pruned?.count > 0) {
        const names = (pruned.removed || [])
          .map((r) => {
            const room = r.roomNumber ? `${t('admin.staff.assignments.residents.roomPrefix')}${r.roomNumber}` : '';
            const label = r.fullName || r.residentCode || '';
            return [label, room].filter(Boolean).join(' · ');
          })
          .filter(Boolean)
          .join(', ');
        setInfos((prev) => [
          ...prev,
          t('admin.staff.assignments.area.residentsPruned', {
            count: pruned.count,
            names: names ? t('admin.staff.assignments.area.residentsPrunedNames', { names }) : '',
          }),
        ]);
      }

      await onStaffUpdated?.();
    } catch (e) {
      const { message, blockingTasks: blocked } = getApiErrorPayload(e, t('common.saveFailed'));
      setBlockingTasks(blocked);
      setError(blocked.length ? blockingCareTasksMessage(message) : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="assignment-tab-layout">
      {/* Staff list */}
      <div className="data-table-wrap assignment-table-wrap">
        <table className="data-table assignment-table">
          <colgroup>
            <col className="assignment-col assignment-col--name" />
            <col className="assignment-col assignment-col--role" />
            <col className="assignment-col assignment-col--shift" />
            <col className="assignment-col assignment-col--area" />
            <col className="assignment-col assignment-col--action" />
          </colgroup>
          <thead>
            <tr>
              <th>{t('admin.staff.assignments.area.colStaff')}</th>
              <th title={t('admin.staff.assignments.area.colRole')}>{t('admin.staff.assignments.area.colRole')}</th>
              <th title={t('admin.staff.assignments.area.colShift')}>{t('admin.staff.assignments.area.colShift')}</th>
              <th title={t('admin.staff.assignments.area.colArea')}>{t('admin.staff.assignments.area.colArea')}</th>
              <th aria-label={t('common.colActions')} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="empty-state">{t('admin.staff.assignments.area.loading')}</td></tr>}
            {!loading && staff.length === 0 && (
              <tr><td colSpan={5} className="empty-state">{t('admin.staff.assignments.area.emptyStaff')}</td></tr>
            )}
            {!loading && staff.map((s) => {
              const areas = s.staffProfile?.responsibleAreaIds || [];
              return (
                <tr key={s._id} style={{ background: selected?._id === s._id ? '#eff6ff' : undefined }}>
                  <td className="assignment-table__cell--name">{s.fullName}</td>
                  <td>{roleLabel(t, s.role)}</td>
                  <td className="assignment-table__cell--badges">
                    <ShiftSummaryBadge
                      summary={s.shiftSummary}
                      assignmentDate={assignmentDate}
                      displayNow={displayNow}
                      assignable={canAssignAreas(s)}
                    />
                  </td>
                  <td className="assignment-table__cell--badges">
                    {areas.length ? (
                      <div className="assignment-cell-badges">
                        {areas.map((a) => (
                          <span key={typeof a === 'object' ? a._id : a} className="area-badge">
                            {resolveAreaLabel(a)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="assignment-table__empty">{t('admin.staff.assignments.badges.notAssigned')}</span>
                    )}
                  </td>
                  <td className="assignment-table__cell--actions">
                    {canAssignAreas(s) ? (
                      isStaffOnLeaveForAssignment(s) ? (
                        <span className="shift-badge shift-badge--leave">{t('admin.staff.assignments.badges.onLeave')}</span>
                      ) : (
                        <button
                          className="btn btn--sm btn--edit"
                          onClick={() => handleSelect(s)}
                          disabled={!s.staffProfile}
                          title={!s.staffProfile ? t('admin.staff.assignments.area.noProfile') : undefined}
                        >
                          {t('admin.staff.assignments.area.selectStaff')}
                        </button>
                      )
                    ) : (
                      <NonAssignableBadge />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && staff.length > 0 && staffPagination && (
          <ListPagination
            page={staffPagination.page}
            totalPages={staffPagination.totalPages}
            total={staffPagination.total}
            onPageChange={staffPagination.onPageChange}
          />
        )}
      </div>

      {/* Edit panel */}
      <div className="assignment-panel">
        {!selected ? (
          <div className="empty-state">{t('admin.staff.assignments.area.emptyPanel')}</div>
        ) : !canAssignAreas(selected) ? (
          <div className="empty-state empty-state--warn">
            {t('admin.staff.assignments.area.adminManagerWarn')}
          </div>
        ) : !selected.staffProfile ? (
          <div className="empty-state empty-state--warn">{t('admin.staff.assignments.area.noProfileWarn')}</div>
        ) : isStaffOnLeaveForAssignment(selected) ? (
          <div className="empty-state empty-state--warn">
            {t('admin.staff.assignments.area.onLeaveWarn')}
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 14 }}>
              {t('admin.staff.assignments.area.panelTitle', { name: selected.fullName })}
            </div>
            <Alert type="success" msg={success} />
            {blockingTasks.length > 0 ? (
              <BlockingCareTasksAlert
                message={error}
                tasks={blockingTasks}
                hint={t('admin.staff.assignments.careTaskTabHint')}
              />
            ) : (
              <Alert type="error" msg={error} />
            )}
            {infos.map((msg, i) => <Alert key={i} type="warning" msg={`ℹ️ ${msg}`} />)}

            <ShiftDetailPanel
              summary={selected.shiftSummary}
              assignmentDate={assignmentDate}
              displayNow={displayNow}
            />

            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12, lineHeight: 1.45 }}>
              {t('admin.staff.assignments.area.masterDataHint')}
            </p>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>{t('admin.staff.assignments.area.floorsLabel')}</label>
              {loadingFloors ? (
                <p className="field-hint">{t('admin.staff.assignments.area.loadingFloors')}</p>
              ) : (
                <div className="area-multi-select">
                  {floors.length === 0 && <p className="field-hint">{t('admin.staff.assignments.area.noFloors')}</p>}
                  {floors.map((f) => (
                    <label key={f._id} className="area-multi-select__item">
                      <input
                        type="checkbox"
                        checked={selectedFloorIds.includes(f._id)}
                        onChange={() => toggleFloor(f._id)}
                      />
                      <span>{floorLabel(f)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>{t('admin.staff.assignments.area.roomsLabel')}</label>
              {!selectedFloorIds.length ? (
                <p className="field-hint">{t('admin.staff.assignments.area.selectFloorFirst')}</p>
              ) : loadingRooms ? (
                <p className="field-hint">{t('admin.staff.assignments.area.loadingRooms')}</p>
              ) : (
                <div className="area-multi-select">
                  {rooms.length === 0 && <p className="field-hint">{t('admin.staff.assignments.area.noRooms')}</p>}
                  {rooms.map((r) => (
                    <label key={r._id} className="area-multi-select__item">
                      <input
                        type="checkbox"
                        checked={selectedRoomIds.includes(r._id)}
                        onChange={() => toggleRoom(r._id)}
                      />
                      <span>{roomLabel(r)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? t('common.saving') : t('admin.staff.assignments.area.saveArea')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function assignedResidentIdsFromProfile(profile) {
  return (profile?.assignedResidentIds || []).map((r) =>
    String(typeof r === 'object' ? r._id : r)
  );
}

function areaIdsFromProfile(profile) {
  const floorIds = (profile?.responsibleAreaIds || []).map((f) =>
    String(typeof f === 'object' ? f._id : f)
  );
  const roomIds = (profile?.responsibleRoomIds || []).map((r) =>
    String(typeof r === 'object' ? r._id : r)
  );
  return { floorIds, roomIds };
}

function residentPickerLabel(r, t) {
  const room = r.roomId;
  const roomNum = typeof room === 'object' ? room?.roomNumber : '';
  const code = r.residentCode ? ` (${r.residentCode})` : '';
  const roomPrefix = t('admin.staff.assignments.residents.roomPrefix');
  return `${r.fullName || t('admin.staff.assignments.residents.defaultResidentLabel')}${code}${roomNum ? ` · ${roomPrefix}${roomNum}` : ''}`;
}

// ── Tab 2: Resident Assignment ────────────────────────────────────────────────
function ResidentTab({ staff, staffPool, loading, assignmentDate, displayNow, onStaffUpdated, staffPagination }) {
  const { t, i18n } = useTranslation();
  const [selected, setSelected]           = useState(null);
  const [selectedResidentIds, setSelectedResidentIds] = useState([]);
  const [residentOptions, setResidentOptions] = useState([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [residentHint, setResidentHint]   = useState('');
  const [residentFilterMode, setResidentFilterMode] = useState(null);
  const [residentSearch, setResidentSearch] = useState('');
  const [saving, setSaving]               = useState(false);
  const [success, setSuccess]             = useState('');
  const [error, setError]                 = useState('');
  const [blockingTasks, setBlockingTasks] = useState([]);

  useEffect(() => {
    setSelected(null);
    setResidentOptions([]);
    setSelectedResidentIds([]);
    setBlockingTasks([]);
    setSuccess('');
    setError('');
    setResidentHint('');
    setResidentSearch('');
  }, [assignmentDate]);

  useEffect(() => {
    if (!selected) return;
    const stillInPool = staffPool?.some((s) => s._id === selected._id);
    if (!stillInPool || !hasActiveShiftOnDate(selected, assignmentDate, displayNow)) {
      setSelected(null);
      setResidentOptions([]);
      setSelectedResidentIds([]);
      setBlockingTasks([]);
      setSuccess('');
      setError('');
      setResidentHint('');
      setResidentSearch('');
    }
  }, [staffPool, selected, assignmentDate, displayNow]);

  const areaScopeKey = useMemo(() => {
    if (!selected?._id) return '';
    const p = staff.find((s) => s._id === selected._id)?.staffProfile || selected.staffProfile;
    if (!p) return '';
    const rooms = (p.responsibleRoomIds || []).map((r) => String(r._id || r)).sort().join(',');
    const floors = (p.responsibleAreaIds || []).map((f) => String(f._id || f)).sort().join(',');
    if (!rooms && !floors) return '_none_';
    return `${rooms}|${floors}`;
  }, [selected?._id, staff]);

  const loadResidentsForStaff = async (member) => {
    if (!member?._id) return;
    if (!member.staffProfile) {
      setResidentOptions([]);
      setResidentFilterMode(null);
      setResidentHint(t('admin.staff.assignments.residents.noProfileHint'));
      return;
    }

    setLoadingResidents(true);
    setResidentHint('');
    setResidentFilterMode(null);
    try {
      const res = await staffService.listResidentsAvailable(member._id, {
        status: 'admitted',
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setResidentFilterMode(res.filterMode || null);
      setResidentOptions(
        [...list].sort((a, b) =>
          (a.fullName || '').localeCompare(b.fullName || '', i18n.language === 'vi' ? 'vi' : 'en')
        )
      );
      if (res.message) {
        setResidentHint(resolveApiSuccess(res, t));
      } else if (!list.length) {
        setResidentHint(
          res.filterMode === 'rooms'
            ? t('admin.staff.assignments.residents.noResidentsRooms')
            : t('admin.staff.assignments.residents.noResidentsFloors')
        );
      }
    } catch (e) {
      setResidentOptions([]);
      setResidentFilterMode(null);
      setResidentHint(resolveApiError(e, t, 'admin.staff.assignments.residents.loadResidentsFailed'));
    } finally {
      setLoadingResidents(false);
    }
  };

  const handleSelect = (s) => {
    if (!canAssignResidents(s) || isStaffOnLeaveForAssignment(s)) return;
    setSelected(s);
    setSuccess('');
    setError('');
    setBlockingTasks([]);
    setSelectedResidentIds(assignedResidentIdsFromProfile(s.staffProfile));
    setResidentSearch('');
  };

  const syncAssignedResidents = async (member) => {
    try {
      const res = await staffService.listAssignedResidents(member._id);
      const assigned = Array.isArray(res.data) ? res.data : [];
      const ids = assigned.map((r) => String(r._id));
      setSelectedResidentIds(ids);
      setSelected((prev) =>
        prev?._id === member._id
          ? {
              ...prev,
              staffProfile: {
                ...prev.staffProfile,
                assignedResidentIds: assigned,
              },
            }
          : prev
      );
      return assigned;
    } catch {
      const ids = assignedResidentIdsFromProfile(member.staffProfile);
      setSelectedResidentIds(ids);
      return null;
    }
  };

  useEffect(() => {
    if (!selected?._id) return undefined;
    let cancelled = false;
    const fresh = staff.find((s) => s._id === selected._id) || selected;

    (async () => {
      setSelected((prev) => (prev?._id === fresh._id ? { ...fresh } : prev));
      await syncAssignedResidents(fresh);
      if (!cancelled) await loadResidentsForStaff(fresh);
    })();

    return () => {
      cancelled = true;
    };
  }, [selected?._id, areaScopeKey]);

  const toggleResident = (id) => {
    const sid = String(id);
    setSelectedResidentIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );
  };

  const filteredResidents = useMemo(() => {
    const q = residentSearch.trim().toLowerCase();
    if (!q) return residentOptions;
    return residentOptions.filter((r) => {
      const name = (r.fullName || '').toLowerCase();
      const code = (r.residentCode || '').toLowerCase();
      const room = r.roomId?.roomNumber?.toLowerCase?.() || '';
      return name.includes(q) || code.includes(q) || room.includes(q);
    });
  }, [residentOptions, residentSearch]);

  const handleSave = async () => {
    if (!selected) return;
    if (!selected.staffProfile) {
      setError(t('admin.staff.assignments.residents.noProfileWarn'));
      return;
    }
    setSaving(true);
    setError('');
    setBlockingTasks([]);
    setSuccess('');
    try {
      const res = await staffService.assignResidents(selected._id, {
        residentIds: selectedResidentIds,
      });
      setSuccess(t('admin.staff.assignments.residents.residentsUpdated'));
      if (res.staffProfile) {
        setSelected((prev) =>
          prev ? { ...prev, staffProfile: res.staffProfile } : prev
        );
        setSelectedResidentIds(assignedResidentIdsFromProfile(res.staffProfile));
      }
      await onStaffUpdated?.();
    } catch (e) {
      const { message, blockingTasks: blocked } = getApiErrorPayload(e, t('common.saveFailed'));
      setBlockingTasks(blocked);
      setError(blocked.length ? blockingCareTasksMessage(message) : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="assignment-tab-layout">
      <div className="data-table-wrap assignment-table-wrap">
        <table className="data-table assignment-table">
          <colgroup>
            <col className="assignment-col assignment-col--name" />
            <col className="assignment-col assignment-col--role" />
            <col className="assignment-col assignment-col--shift" />
            <col className="assignment-col assignment-col--area" />
            <col className="assignment-col assignment-col--action" />
          </colgroup>
          <thead>
            <tr>
              <th>{t('admin.staff.assignments.area.colStaff')}</th>
              <th title={t('admin.staff.assignments.area.colRole')}>{t('admin.staff.assignments.area.colRole')}</th>
              <th title={t('admin.staff.assignments.area.colShift')}>{t('admin.staff.assignments.area.colShift')}</th>
              <th title={t('admin.staff.assignments.residents.colResidents')}>{t('admin.staff.assignments.residents.colResidents')}</th>
              <th aria-label={t('common.colActions')} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="empty-state">{t('admin.staff.assignments.area.loading')}</td></tr>}
            {!loading && staff.length === 0 && (
              <tr><td colSpan={5} className="empty-state">{t('admin.staff.assignments.area.emptyStaff')}</td></tr>
            )}
            {!loading && staff.map((s) => {
              const residents = s.staffProfile?.assignedResidentIds || [];
              return (
                <tr key={s._id} style={{ background: selected?._id === s._id ? '#eff6ff' : undefined }}>
                  <td className="assignment-table__cell--name">{s.fullName}</td>
                  <td>{roleLabel(t, s.role)}</td>
                  <td className="assignment-table__cell--badges">
                    <ShiftSummaryBadge
                      summary={s.shiftSummary}
                      assignmentDate={assignmentDate}
                      displayNow={displayNow}
                      assignable={canAssignResidents(s)}
                    />
                  </td>
                  <td>
                    {residents.length
                      ? <span className="assignment-table__count">{t('admin.staff.assignments.residents.residentCount', { count: residents.length })}</span>
                      : <span className="assignment-table__empty">{t('admin.staff.assignments.residents.notAssigned')}</span>}
                  </td>
                  <td className="assignment-table__cell--actions">
                    {canAssignResidents(s) ? (
                      isStaffOnLeaveForAssignment(s) ? (
                        <span className="shift-badge shift-badge--leave">{t('admin.staff.assignments.badges.onLeave')}</span>
                      ) : (
                        <button
                          className="btn btn--sm btn--edit"
                          onClick={() => handleSelect(s)}
                          disabled={!s.staffProfile}
                          title={!s.staffProfile ? t('admin.staff.assignments.area.noProfile') : undefined}
                        >
                          {t('admin.staff.assignments.area.selectStaff')}
                        </button>
                      )
                    ) : (
                      <NonAssignableBadge />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && staff.length > 0 && staffPagination && (
          <ListPagination
            page={staffPagination.page}
            totalPages={staffPagination.totalPages}
            total={staffPagination.total}
            onPageChange={staffPagination.onPageChange}
          />
        )}
      </div>

      <div className="assignment-panel">
        {!selected ? (
          <div className="empty-state">{t('admin.staff.assignments.residents.emptyPanel')}</div>
        ) : !canAssignResidents(selected) ? (
          <div className="empty-state empty-state--warn">
            {t('admin.staff.assignments.residents.adminManagerWarn')}
          </div>
        ) : !selected.staffProfile ? (
          <div className="empty-state empty-state--warn">{t('admin.staff.assignments.residents.noProfileWarn')}</div>
        ) : isStaffOnLeaveForAssignment(selected) ? (
          <div className="empty-state empty-state--warn">
            {t('admin.staff.assignments.residents.onLeaveWarn')}
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 14 }}>
              {t('admin.staff.assignments.residents.panelTitle', { name: selected.fullName })}
            </div>
            <Alert type="success" msg={success} />
            {blockingTasks.length > 0 ? (
              <BlockingCareTasksAlert
                message={error}
                tasks={blockingTasks}
                hint={t('admin.staff.assignments.careTaskTabHint')}
              />
            ) : (
              <Alert type="error" msg={error} />
            )}
            <ShiftDetailPanel
              summary={selected.shiftSummary}
              assignmentDate={assignmentDate}
              displayNow={displayNow}
            />

            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12, lineHeight: 1.45 }}>
              {residentFilterMode === 'rooms'
                ? t('admin.staff.assignments.residents.filterRoomsHint')
                : residentFilterMode === 'floors'
                  ? t('admin.staff.assignments.residents.filterFloorsHint')
                  : t('admin.staff.assignments.residents.filterDefaultHint')}
              {' '}{t('admin.staff.assignments.residents.clearAllHint')}
            </p>

            {residentHint && (
              <p className="field-hint field-hint--warn" style={{ marginBottom: 10 }}>{residentHint}</p>
            )}

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>{t('admin.staff.assignments.residents.searchLabel')}</label>
              <input
                type="search"
                value={residentSearch}
                onChange={(e) => setResidentSearch(e.target.value)}
                placeholder={t('admin.staff.assignments.residents.searchPlaceholder')}
                disabled={loadingResidents || !residentOptions.length}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>
                {t('admin.staff.assignments.residents.selectResidents', { count: selectedResidentIds.length })}
              </label>
              {loadingResidents ? (
                <p className="field-hint">{t('admin.staff.assignments.residents.loadingResidents')}</p>
              ) : (
                <div className="area-multi-select resident-picker">
                  {filteredResidents.length === 0 && !residentHint && (
                    <p className="field-hint">{t('admin.staff.assignments.residents.noMatchingResidents')}</p>
                  )}
                  {filteredResidents.map((r) => (
                    <label key={r._id} className="area-multi-select__item">
                      <input
                        type="checkbox"
                        checked={selectedResidentIds.includes(String(r._id))}
                        onChange={() => toggleResident(r._id)}
                      />
                      <span>{residentPickerLabel(r, t)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              className="btn btn--primary"
              onClick={handleSave}
              disabled={saving || loadingResidents}
            >
              {saving ? t('common.saving') : t('admin.staff.assignments.residents.saveResidents')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab 3: Care Tasks ───────────────────────────────────────────────────────
/** Admin/manager may only skip (not in_progress/completed) */
const TASK_STATUS_ADMIN_NEXT = {
  pending: ['skipped'],
  in_progress: ['skipped'],
};

const taskStatusLabel = (t, status) =>
  t(`common.careTaskStatus.${status}`, { defaultValue: status });

const toMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const isTimeWithinShift = (timeValue, shift) => {
  const t = toMinutes(timeValue);
  const start = toMinutes(shift?.startTime);
  const end = toMinutes(shift?.endTime);
  if (t === null || start === null || end === null) return false;
  if (end <= start) return t >= start || t <= end; // overnight shift
  return t >= start && t <= end;
};

const emptyTaskForm = (workDate) => ({
  staffProfileId: '',
  shiftId: '',
  residentId: '',
  taskType: 'morning_care',
  careLevel: 'low',
  workDate,
  scheduledTime: '',
  notes: '',
});

const buildAssignmentContextFallback = (staffList, t) => ({
  taskTypes: TASK_TYPE_VALUES.map((value) => ({ value, labelVi: taskTypeLabel(t, value) })),
  careLevels: CARE_LEVEL_VALUES.map((value) => ({
    value,
    labelVi: t(`common.careLevel.${value}`, { defaultValue: value }),
  })),
  staffWithShifts: (staffList || [])
    .map((s) => {
      const shiftsOnDate = filterEligibleShifts(s.shiftSummary?.shiftsOnDate);
      if (!shiftsOnDate.length || !s.staffProfile?._id) return null;
      if (!canReceiveCareTask(s)) return null;
      return {
        staffProfileId: s.staffProfile._id,
        userId: s._id,
        fullName: s.fullName,
        role: s.role,
        shiftTimeLabel: buildShiftTimeLabel(shiftsOnDate),
        shiftsOnDate,
      };
    })
    .filter(Boolean),
});

function careResidentOptionLabel(r, t) {
  return residentPickerLabel(r, t);
}

function CareTaskTab({ staff }) {
  const { t } = useTranslation();
  const [tasks, setTasks]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const { search: taskSearch, setSearch: setTaskSearch, debouncedSearch: debouncedTaskSearch } = useDebouncedSearch();
  const filteredTasks = useMemo(() => {
    const q = debouncedTaskSearch.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) => {
      const staffName = task.staffProfileId?.userId?.fullName || task.staffProfileId?.staffCode || '';
      const resident = task.residentId?.fullName || task.residentId?.residentCode || '';
      return staffName.toLowerCase().includes(q) || resident.toLowerCase().includes(q);
    });
  }, [tasks, debouncedTaskSearch]);
  const {
    paginatedItems: paginatedTasks,
    page: taskPage,
    setPage: setTaskPage,
    totalPages: taskTotalPages,
    total: taskTotal,
  } = useClientPagination(filteredTasks);
  const [filterDate, setFilterDate]     = useState(() => todayVN());
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(() => emptyTaskForm(todayVN()));
  const [saveError, setSaveErr]         = useState('');
  const [saving, setSaving]             = useState(false);
  const [ctx, setCtx]                   = useState(null);
  const [ctxLoading, setCtxLoading]     = useState(false);
  const [assignedResidents, setAssignedResidents] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [residentHint, setResidentHint] = useState('');

  const taskTypeOptions = ctx?.taskTypes?.length
    ? ctx.taskTypes
    : TASK_TYPE_VALUES.map((value) => ({ value, labelVi: taskTypeLabel(t, value) }));
  const careLevelOptions = ctx?.careLevels?.length
    ? ctx.careLevels
    : CARE_LEVEL_VALUES.map((value) => ({
        value,
        labelVi: t(`common.careLevel.${value}`, { defaultValue: value }),
      }));

  const staffWithShifts = ctx?.staffWithShifts ?? [];

  const onLeaveByUserId = useMemo(
    () => Object.fromEntries(staff.map((s) => [String(s._id), isStaffOnLeaveForAssignment(s)])),
    [staff]
  );

  const staffWithShiftsAvailable = useMemo(
    () =>
      staffWithShifts.filter(
        (s) =>
          !onLeaveByUserId[String(s.userId)]
          && canReceiveCareTask(s)
      ),
    [staffWithShifts, onLeaveByUserId]
  );

  const selectedStaffEntry = useMemo(
    () =>
      staffWithShiftsAvailable.find(
        (s) => String(s.staffProfileId) === String(form.staffProfileId)
      ) || null,
    [staffWithShiftsAvailable, form.staffProfileId]
  );

  const shiftOptions = useMemo(
    () => filterEligibleShifts(selectedStaffEntry?.shiftsOnDate),
    [selectedStaffEntry]
  );
  const selectedShift =
    shiftOptions.find((s) => String(s._id) === String(form.shiftId))
    || shiftOptions[0]
    || null;

  const resolveTaskTypeLabel = (value) =>
    taskTypeOptions.find((opt) => opt.value === value)?.labelVi
    || taskTypeLabel(t, value);

  const resolveCareLevelLabel = (value) => careLevelLabel(t, value);

  const loadContext = async (workDate) => {
    setCtxLoading(true);
    setSaveErr('');
    try {
      const data = await careTaskService.getAssignmentContext(workDate);
      setCtx(data);
      return data;
    } catch (e) {
      if (e.response?.status === 404) {
        const fallback = buildAssignmentContextFallback(staff, t);
        setCtx(fallback);
        return fallback;
      }
      setCtx(buildAssignmentContextFallback(staff, t));
      setSaveErr(resolveApiError(e, t, 'admin.staff.assignments.tasks.loadFormFailed'));
      return null;
    } finally {
      setCtxLoading(false);
    }
  };

  const loadAssignedResidents = async (userId) => {
    if (!userId) {
      setAssignedResidents([]);
      setResidentHint('');
      return;
    }
    setResidentsLoading(true);
    setResidentHint('');
    try {
      const res = await staffService.listAssignedResidents(userId);
      const list = Array.isArray(res.data) ? res.data : [];
      setAssignedResidents(list);
      if (res.message) {
        setResidentHint(resolveApiSuccess(res, t));
      } else if (!list.length) {
        setResidentHint(t('admin.staff.assignments.tasks.noAssignedResidents'));
      }
    } catch (e) {
      setAssignedResidents([]);
      setResidentHint(resolveApiError(e, t, 'admin.staff.assignments.tasks.loadAssignedFailed'));
    } finally {
      setResidentsLoading(false);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const raw = await careTaskService.listCareTasks({ workDate: filterDate, limit: 100 });
      setTasks(Array.isArray(raw) ? raw : (raw?.data || []));
    } catch (e) {
      if (e.response?.status === 404) {
        setTasks([]);
        setError('');
      } else {
        setError(resolveApiError(e, t, 'common.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [filterDate]);

  useEffect(() => {
    if (!showForm || !form.workDate) return;
    if (form.workDate < todayVN()) return;
    loadContext(form.workDate);
  }, [showForm, form.workDate]);

  const handleOpenForm = () => {
    const defaultWorkDate = filterDate >= todayVN() ? filterDate : todayVN();
    setForm(emptyTaskForm(defaultWorkDate));
    setSaveErr('');
    setAssignedResidents([]);
    setResidentHint('');
    setShowForm(true);
  };

  const handleWorkDateChange = (newDate) => {
    if (!newDate || newDate < todayVN()) return;
    setForm((prev) => ({
      ...prev,
      workDate: newDate,
      staffProfileId: '',
      shiftId: '',
      residentId: '',
    }));
    setAssignedResidents([]);
    setResidentHint('');
  };

  const handleStaffChange = (profileId) => {
    const entry = staffWithShiftsAvailable.find((s) => String(s.staffProfileId) === String(profileId));
    const eligible = filterEligibleShifts(entry?.shiftsOnDate);
    setForm((prev) => ({
      ...prev,
      staffProfileId: profileId,
      shiftId: eligible[0]?._id?.toString() || '',
      residentId: '',
    }));
    loadAssignedResidents(entry?.userId);
  };

  const minScheduledTime =
    form.workDate === (ctx?.todayVN || todayVN()) ? (ctx?.minScheduledTime || '') : '';

  const handleCreate = async () => {
    setSaveErr('');
    if (selectedStaffEntry && onLeaveByUserId[String(selectedStaffEntry.userId)]) {
      setSaveErr(t('admin.staff.assignments.tasks.onLeaveError'));
      return;
    }
    if (!form.shiftId || !selectedShift) {
      setSaveErr(t('admin.staff.assignments.tasks.selectShiftError'));
      return;
    }
    const scheduledTimeTrimmed = form.scheduledTime?.trim();
    if (!scheduledTimeTrimmed) {
      setSaveErr(t('admin.staff.assignments.tasks.selectTimeError'));
      return;
    }
    if (minScheduledTime && scheduledTimeTrimmed < minScheduledTime) {
      setSaveErr(t('admin.staff.assignments.tasks.minTimeError', { time: minScheduledTime }));
      return;
    }
    if (selectedShift && !isTimeWithinShift(scheduledTimeTrimmed, selectedShift)) {
      setSaveErr(
        t('admin.staff.assignments.tasks.withinShiftError', {
          start: selectedShift.startTime,
          end: selectedShift.endTime,
        })
      );
      return;
    }
    setSaving(true);
    try {
      const payload = {
        staffProfileId: form.staffProfileId,
        residentId: form.residentId,
        shiftId: form.shiftId,
        taskType: form.taskType,
        careLevel: form.careLevel,
        workDate: form.workDate,
        scheduledTime: scheduledTimeTrimmed,
        notes: form.notes || undefined,
      };
      await careTaskService.createCareTask(payload);
      setShowForm(false);
      loadTasks();
    } catch (e) {
      setSaveErr(resolveApiError(e, t, 'common.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await careTaskService.updateCareTaskStatus(id, status);
      loadTasks();
    } catch (e) {
      alert(e.response?.data?.message || t('admin.staff.assignments.tasks.actionFailed'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('admin.staff.assignments.tasks.confirmDelete'))) return;
    try {
      await careTaskService.deleteCareTask(id);
      loadTasks();
    } catch (e) {
      alert(e.response?.data?.message || t('admin.staff.assignments.tasks.actionFailed'));
    }
  };

  const staffOnShiftHint =
    ctxLoading
      ? ''
      : !showForm
        ? ''
        : staffWithShiftsAvailable.length === 0
          ? staffWithShifts.length > 0
            ? t('admin.staff.assignments.tasks.allOnLeave')
            : t('admin.staff.assignments.tasks.noStaffWithShift')
          : '';

  return (
    <div>
      <p
        className="assignment-steps-hint"
        dangerouslySetInnerHTML={{ __html: t('admin.staff.assignments.tasks.stepsHint') }}
      />

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('admin.staff.assignments.tasks.viewDate')}</label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }}
        />
        <input
          type="search"
          placeholder={t('admin.staff.assignments.tasks.searchPlaceholder')}
          value={taskSearch}
          onChange={(e) => setTaskSearch(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', outline: 'none', minWidth: 220 }}
        />
        <button className="btn btn--primary" onClick={handleOpenForm}>{t('admin.staff.assignments.tasks.assignTask')}</button>
      </div>

      {error && <Alert type="error" msg={error} />}

      {showForm && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('admin.staff.assignments.tasks.formTitle')}</div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12 }}>
            {t('admin.staff.assignments.tasks.formHint')}
          </p>
          {saveError && <Alert type="error" msg={saveError} />}
          <div className="form-grid">
            <div className="form-group">
              <label>{t('admin.staff.assignments.tasks.workDate')}</label>
              <input
                type="date"
                min={todayVN()}
                value={form.workDate}
                onChange={(e) => handleWorkDateChange(e.target.value)}
              />
              <small className="field-hint">{t('admin.staff.assignments.tasks.workDateHint')}</small>
            </div>

            <div className="form-group">
              <label>{t('admin.staff.assignments.tasks.staffOnShift')}</label>
              {ctxLoading ? (
                <p className="field-hint">{t('admin.staff.assignments.tasks.loadingStaff')}</p>
              ) : (
                <select
                  value={form.staffProfileId}
                  onChange={(e) => handleStaffChange(e.target.value)}
                  disabled={staffWithShiftsAvailable.length === 0}
                >
                  <option value="">{t('admin.staff.assignments.tasks.selectStaff')}</option>
                  {staffWithShiftsAvailable.map((s) => (
                    <option key={s.staffProfileId} value={s.staffProfileId}>
                      {s.fullName} ({roleLabel(t, s.role)}) · {s.shiftTimeLabel}
                    </option>
                  ))}
                </select>
              )}
              {staffOnShiftHint && (
                <small className="field-hint field-hint--warn">{staffOnShiftHint}</small>
              )}
            </div>

            {shiftOptions.length > 0 && (
              <div className="form-group">
                <label>{t('admin.staff.assignments.tasks.selectShift')}</label>
                <select
                  value={form.shiftId}
                  onChange={(e) => setForm((p) => ({ ...p, shiftId: e.target.value }))}
                  disabled={!form.staffProfileId}
                >
                  {shiftOptions.map((sh) => (
                    <option key={sh._id} value={sh._id}>
                      {sh.name} · {sh.startTime} – {sh.endTime} ({shiftStatusLabel(t, sh.status)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>{t('admin.staff.assignments.tasks.assignedResident')}</label>
              {residentsLoading ? (
                <p className="field-hint">{t('admin.staff.assignments.tasks.loadingAssignedResidents')}</p>
              ) : (
                <select
                  value={form.residentId}
                  onChange={(e) => setForm((p) => ({ ...p, residentId: e.target.value }))}
                  disabled={!form.staffProfileId || assignedResidents.length === 0}
                >
                  <option value="">{t('admin.staff.assignments.tasks.selectResident')}</option>
                  {assignedResidents.map((r) => (
                    <option key={r._id} value={r._id}>
                      {careResidentOptionLabel(r, t)}
                    </option>
                  ))}
                </select>
              )}
              {residentHint && (
                <small className="field-hint field-hint--warn">{residentHint}</small>
              )}
            </div>

            <div className="form-group">
              <label>{t('admin.staff.assignments.tasks.taskType')}</label>
              <select
                value={form.taskType}
                onChange={(e) => setForm((p) => ({ ...p, taskType: e.target.value }))}
              >
                {taskTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.labelVi}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t('admin.staff.assignments.tasks.careLevel')}</label>
              <select
                value={form.careLevel}
                onChange={(e) => setForm((p) => ({ ...p, careLevel: e.target.value }))}
              >
                {careLevelOptions.map((l) => (
                  <option key={l.value} value={l.value}>{careLevelLabel(t, l.value)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t('admin.staff.assignments.tasks.scheduledTime')}</label>
              <input
                type="time"
                required
                min={minScheduledTime || undefined}
                value={form.scheduledTime}
                onChange={(e) => setForm((p) => ({ ...p, scheduledTime: e.target.value }))}
              />
              {selectedShift && (
                <small className="field-hint">
                  {t('admin.staff.assignments.tasks.validTimeRange', {
                    start: selectedShift.startTime,
                    end: selectedShift.endTime,
                  })}
                  {minScheduledTime ? ` ${t('admin.staff.assignments.tasks.fromTime', { time: minScheduledTime })}` : ''}
                </small>
              )}
            </div>

            <div className="form-group form-grid--full">
              <label>{t('admin.staff.assignments.tasks.notes')}</label>
              <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              className="btn btn--primary"
              onClick={handleCreate}
              disabled={
                saving
                || !form.staffProfileId
                || !form.residentId
                || !form.shiftId
                || !form.scheduledTime?.trim()
              }
            >
              {saving ? t('common.saving') : t('admin.staff.assignments.tasks.saveTask')}
            </button>
            <button
              className="btn"
              style={{ background: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
              onClick={() => setShowForm(false)}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>{t('common.loading')}</p>
      ) : (
        <div className="data-table-wrap assignment-table-wrap">
        <table className="data-table assignment-table assignment-table--tasks">
          <thead>
            <tr>
              <th>{t('admin.staff.assignments.tasks.colStaff')}</th>
              <th>{t('admin.staff.assignments.tasks.colResident')}</th>
              <th>{t('admin.staff.assignments.tasks.colShift')}</th>
              <th>{t('admin.staff.assignments.tasks.colTaskType')}</th>
              <th>{t('admin.staff.assignments.tasks.colCareLevel')}</th>
              <th>{t('admin.staff.assignments.tasks.colTime')}</th>
              <th>{t('admin.staff.assignments.tasks.colStatus')}</th>
              <th>{t('admin.staff.assignments.tasks.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTasks.length === 0 && (
              <tr><td colSpan={8} className="empty-state">{t('admin.staff.assignments.tasks.emptyList')}</td></tr>
            )}
            {paginatedTasks.map((task) => {
              const staffName = task.staffProfileId?.userId?.fullName || task.staffProfileId?.staffCode || '—';
              const resident = task.residentId?.fullName || task.residentId?.residentCode || '—';
              const shift = task.shiftId;
              const shiftLabel = shift
                ? `${shift.name || t('admin.staff.assignments.tasks.shiftFallback')} · ${shift.startTime}–${shift.endTime}`
                : '—';
              const next = TASK_STATUS_ADMIN_NEXT[task.status] || [];
              return (
                <tr key={task._id}>
                  <td>{staffName}</td>
                  <td>{resident}</td>
                  <td><small>{shiftLabel}</small></td>
                  <td>{resolveTaskTypeLabel(task.taskType)}</td>
                  <td>{resolveCareLevelLabel(task.careLevel)}</td>
                  <td>{task.scheduledTime || '—'}</td>
                  <td>
                    <span className={`task-status task-status--${task.status}`}>
                      {taskStatusLabel(t, task.status)}
                    </span>
                    {task.status === 'missed' && (
                      <small className="field-hint" style={{ display: 'block' }}>{t('admin.staff.assignments.tasks.shiftMissed')}</small>
                    )}
                  </td>
                  <td className="assignment-table__cell--actions">
                    <div className="assignment-action-group">
                    {next.map((s) => (
                      <button
                        key={s}
                        className="btn btn--sm btn--edit"
                        onClick={() => handleStatus(task._id, s)}
                      >
                        {taskStatusLabel(t, s)}
                      </button>
                    ))}
                    {task.status === 'pending' && (
                      <button className="btn btn--sm btn--delete" onClick={() => handleDelete(task._id)}>{t('common.delete')}</button>
                    )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && paginatedTasks.length > 0 && (
          <ListPagination
            page={taskPage}
            totalPages={taskTotalPages}
            total={taskTotal}
            onPageChange={setTaskPage}
          />
        )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = (t) => [
  { key: 'area', label: `🏢 ${t('admin.staff.assignments.tabArea')}` },
  { key: 'residents', label: `👴 ${t('admin.staff.assignments.tabResidents')}` },
  { key: 'tasks', label: `📋 ${t('admin.staff.assignments.tabTasks')}` },
];

export default function StaffAssignmentPage() {
  const { t, i18n } = useTranslation();
  const tabs = TABS(t);
  const [activeTab, setActiveTab] = useState('area');
  const [assignmentDate, setAssignmentDate] = useState(() => todayVN());
  const [allStaff, setAllStaff]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const { search: staffSearch, setSearch: setStaffSearch, debouncedSearch: debouncedStaffSearch } = useDebouncedSearch();
  const displayNow = useMinuteNow(assignmentDate === todayVN());

  const filteredStaff = useMemo(() => {
    const withShift = allStaff.filter((s) =>
      hasActiveShiftOnDate(s, assignmentDate, displayNow)
    );
    const q = debouncedStaffSearch.trim().toLowerCase();
    if (!q) return withShift;
    return withShift.filter(
      (s) =>
        (s.fullName || '').toLowerCase().includes(q)
        || (s.staffProfile?.staffCode || '').toLowerCase().includes(q)
    );
  }, [allStaff, debouncedStaffSearch, assignmentDate, displayNow]);

  const {
    paginatedItems: paginatedStaff,
    page: staffPage,
    setPage: setStaffPage,
    totalPages: staffTotalPages,
    total: staffTotal,
  } = useClientPagination(filteredStaff);

  const staffPagination = {
    page: staffPage,
    totalPages: staffTotalPages,
    total: staffTotal,
    onPageChange: setStaffPage,
  };

  useEffect(() => {
    const minDate = todayVN();
    if (assignmentDate < minDate) setAssignmentDate(minDate);
  }, [assignmentDate]);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffService.getAll({ limit: 100, assignmentDate });
      setAllStaff(filterAssignableStaff(res.data || res));
    } catch {
      setAllStaff([]);
    } finally {
      setLoading(false);
    }
  }, [assignmentDate]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  return (
    <AdminPageShell
      title={t('admin.staff.assignments.title')}
      subtitle={t('admin.staff.assignments.subtitle')}
    >
      <div className="assignment-toolbar">
        <label className="assignment-toolbar__label" htmlFor="assignment-date">
          {t('admin.staff.assignments.assignmentDate')}
        </label>
        <input
          id="assignment-date"
          type="date"
          className="assignment-toolbar__date"
          min={todayVN()}
          value={assignmentDate}
          onChange={(e) => setAssignmentDate(e.target.value)}
        />
        <span className="assignment-toolbar__hint">{formatAssignmentDate(assignmentDate, i18n.language)}</span>
        <span className="assignment-toolbar__note">
          {t('admin.staff.assignments.shiftHint')}
        </span>
        <input
          type="search"
          className="assignment-toolbar__search"
          placeholder={t('admin.staff.assignments.searchStaff')}
          value={staffSearch}
          onChange={(e) => setStaffSearch(e.target.value)}
          style={{ marginLeft: 'auto', padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem' }}
        />
      </div>

      <div className="tabs">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            className={`tab-btn ${activeTab === tabItem.key ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tabItem.key)}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'area'      && (
          <AreaTab
            staff={paginatedStaff}
            staffPool={filteredStaff}
            loading={loading}
            assignmentDate={assignmentDate}
            displayNow={displayNow}
            onStaffUpdated={loadStaff}
            staffPagination={staffPagination}
          />
        )}
        {activeTab === 'residents' && (
          <ResidentTab
            staff={paginatedStaff}
            staffPool={filteredStaff}
            loading={loading}
            assignmentDate={assignmentDate}
            displayNow={displayNow}
            onStaffUpdated={loadStaff}
            staffPagination={staffPagination}
          />
        )}
        {activeTab === 'tasks'     && (
          <CareTaskTab staff={allStaff} />
        )}
      </div>
    </AdminPageShell>
  );
}
