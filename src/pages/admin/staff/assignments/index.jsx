import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resolveApiError, resolveApiSuccess } from '../../../../utils/apiMessage';
import staffService from '../../../../services/staff.service';
import careTaskService from '../../../../services/careTask.service';
import ListPagination from '../../../../components/ui/ListPagination';
import useDebouncedSearch from '../../../../hooks/useDebouncedSearch';
import useClientPagination from '../../../../hooks/useClientPagination';
import { canReceiveCareTask } from '../../../../utils/staffAssignable';
import { isStaffOnLeaveForAssignment } from '../../../../utils/leaveUtils';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import { useAuth } from '../../../../hooks/useAuth';
import { useToast } from '../../../../hooks/useToast';
import { todayVN } from '../../../../utils/dateUtils';
import { findStaffDutyGapConflict } from '../../../../utils/careTaskValidation';
import {
  ASSIGNMENT_TABS,
  TASK_TYPE_VALUES,
  CARE_LEVEL_VALUES,
  buildShiftTimeLabel,
  careLevelLabel,
  filterAssignableStaff,
  filterEligibleShifts,
  formatAssignmentDate,
  getAssignmentBasePath,
  isStaffVisibleForAreaResidentTabs,
  residentPickerLabel,
  roleLabel,
  shiftStatusLabel,
  taskTypeLabel,
} from './assignmentHelpers';
import { Alert, AssignmentDeleteIconButton, AssignmentSkipIconButton, useMinuteNow } from './assignmentShared';
import '../../../../styles/admin/StaffAssignmentPage.css';
import { AreaTab, ResidentTab } from './AssignmentListTabs';

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

function CareTaskTab({ staff, assignmentDate }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
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
  const [filterDate, setFilterDate]     = useState(() => assignmentDate || todayVN());
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
    if (!filterDate) return;
    setLoading(true);
    setError('');
    try {
      const raw = await careTaskService.listCareTasks({ workDate: filterDate, limit: 100 });
      setTasks(Array.isArray(raw) ? raw : (raw?.data || []));
    } catch (e) {
      if (e.response?.status === 404) {
        setTasks([]);
        setError('');
      } else if (e.response?.status === 400) {
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
    const gapConflictTime = findStaffDutyGapConflict(
      scheduledTimeTrimmed,
      tasks,
      form.staffProfileId
    );
    if (gapConflictTime) {
      setSaveErr(
        t('admin.staff.assignments.tasks.dutyGapTooSmallError', { conflictTime: gapConflictTime })
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
      showToast(e.response?.data?.message || t('admin.staff.assignments.tasks.actionFailed'), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('admin.staff.assignments.tasks.confirmDelete'))) return;
    try {
      await careTaskService.deleteCareTask(id);
      loadTasks();
    } catch (e) {
      showToast(e.response?.data?.message || t('admin.staff.assignments.tasks.actionFailed'), 'error');
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
                  <td className="assignment-table__cell--actions resident-action-cell">
                    <div className="resident-action-group assignment-action-group">
                    {next.map((s) => (
                      <AssignmentSkipIconButton
                        key={s}
                        title={taskStatusLabel(t, s)}
                        onClick={() => handleStatus(task._id, s)}
                      />
                    ))}
                    {task.status === 'pending' && (
                      <AssignmentDeleteIconButton
                        title={t('common.delete')}
                        onClick={() => handleDelete(task._id)}
                      />
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
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabs = TABS(t);
  const basePath = getAssignmentBasePath(user?.role);

  const tabFromUrl = searchParams.get('tab');
  const activeTab = ASSIGNMENT_TABS.includes(tabFromUrl) ? tabFromUrl : 'area';

  const dateFromUrl = searchParams.get('date');
  const assignmentDate = dateFromUrl && dateFromUrl >= todayVN() ? dateFromUrl : todayVN();

  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const { search: staffSearch, setSearch: setStaffSearch, debouncedSearch: debouncedStaffSearch } = useDebouncedSearch();
  const displayNow = useMinuteNow(assignmentDate === todayVN());

  const updateSearchParams = useCallback(
    (updates) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([key, value]) => {
          if (value == null || value === '') next.delete(key);
          else next.set(key, value);
        });
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  useEffect(() => {
    const minDate = todayVN();
    const normalizedDate = assignmentDate < minDate ? minDate : assignmentDate;
    const normalizedTab = ASSIGNMENT_TABS.includes(tabFromUrl) ? tabFromUrl : 'area';
    if (normalizedDate !== dateFromUrl || normalizedTab !== tabFromUrl) {
      updateSearchParams({ tab: normalizedTab, date: normalizedDate });
    }
  }, [assignmentDate, dateFromUrl, tabFromUrl, updateSearchParams]);

  const setActiveTab = (tab) => {
    updateSearchParams({ tab, date: assignmentDate });
  };

  const setAssignmentDate = (date) => {
    const minDate = todayVN();
    const nextDate = date < minDate ? minDate : date;
    updateSearchParams({ tab: activeTab, date: nextDate });
  };

  const filteredStaff = useMemo(() => {
    const visible = allStaff.filter((s) =>
      isStaffVisibleForAreaResidentTabs(s, assignmentDate, displayNow)
    );
    const q = debouncedStaffSearch.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter(
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
        {activeTab === 'area' && (
          <AreaTab
            staff={paginatedStaff}
            loading={loading}
            assignmentDate={assignmentDate}
            displayNow={displayNow}
            staffPagination={staffPagination}
            basePath={basePath}
          />
        )}
        {activeTab === 'residents' && (
          <ResidentTab
            staff={paginatedStaff}
            loading={loading}
            assignmentDate={assignmentDate}
            displayNow={displayNow}
            staffPagination={staffPagination}
            basePath={basePath}
          />
        )}
        {activeTab === 'tasks'     && (
          <CareTaskTab staff={allStaff} assignmentDate={assignmentDate} />
        )}
      </div>
    </AdminPageShell>
  );
}
