import { useCallback, useEffect, useMemo, useState } from 'react';
import shiftService from '../../../../services/shift.service';
import staffService from '../../../../services/staff.service';
import careScheduleService from '../../../../services/careSchedule.service';
import ListPagination from '../../../../components/ui/ListPagination';
import { ADMIN_LIST_PAGE_SIZE } from '../../../../constants/adminListPage';
import useDebouncedSearch from '../../../../hooks/useDebouncedSearch';
import useClientPagination from '../../../../hooks/useClientPagination';
import {
  CONFLICT_ICON,
  conflictsFromError,
  getConflictLabel,
  hasBlockingConflicts,
  sortConflicts,
} from '../../../../constants/shiftConflicts';
import {
  formatDateTimeVN,
  getLocalDateString,
  getUtcDateString,
  todayVN,
  toVNDateString,
} from '../../../../utils/dateUtils';
import { canAssignShift } from '../../../../utils/staffAssignable';
import { isStaffOnLeaveForAssignment } from '../../../../utils/leaveUtils';
import { getApiErrorPayload, blockingCareTasksMessage } from '../../../../utils/blockingCareTasks';
import { useToast } from '../../../../hooks/useToast';
import BlockingCareTasksAlert from '../../../../components/staff/BlockingCareTasksAlert';
import { useTranslation } from 'react-i18next';
import { resolveApiError } from '../../../../utils/apiMessage';
import { validateSplitShiftDuration } from '../../../../utils/shiftDurationValidation';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import '../../../../styles/admin/ShiftManagementPage.css';

// ── Constants & label helpers ─────────────────────────────────────────────────

const SHOW_CARE_SCHEDULE_TAB = false;

const NS = 'admin.staff.shifts';

const getShiftTypeOptions = (t) => [
  { value: 'morning', label: t(`${NS}.shiftTypes.morning`) },
  { value: 'afternoon', label: t(`${NS}.shiftTypes.afternoon`) },
  { value: 'night', label: t(`${NS}.shiftTypes.night`) },
  { value: 'custom', label: t(`${NS}.shiftTypes.custom`) },
];

const getShiftStatusLabels = (t) => ({
  draft: t(`${NS}.shiftStatus.draft`),
  published: t(`${NS}.shiftStatus.published`),
  confirmed: t(`${NS}.shiftStatus.confirmed`),
  completed: t(`${NS}.shiftStatus.completed`),
  cancelled: t(`${NS}.shiftStatus.cancelled`),
});

const getCareTaskTypeOptions = (t) => [
  { value: 'morning_care', label: t(`${NS}.taskTypes.morning_care`) },
  { value: 'medication', label: t(`${NS}.taskTypes.medication`) },
  { value: 'physical_therapy', label: t(`${NS}.taskTypes.physical_therapy`) },
  { value: 'meal_assistance', label: t(`${NS}.taskTypes.meal_assistance`) },
  { value: 'evening_check', label: t(`${NS}.taskTypes.evening_check`) },
  { value: 'emergency_response', label: t(`${NS}.taskTypes.emergency_response`) },
];

const getCareLevelOptions = (t) => [
  { value: 'low', label: t(`${NS}.priorityLevels.low`) },
  { value: 'medium', label: t(`${NS}.priorityLevels.medium`) },
  { value: 'high', label: t(`${NS}.priorityLevels.high`) },
];

const getCareScheduleStatusLabels = (t) => ({
  draft: t(`${NS}.shiftStatus.draft`),
  published: t(`${NS}.shiftStatus.published`),
});

const getStaffRoleLabel = (t, role) => t(`common.roles.${role}`, { defaultValue: role });

const isFlexibleTemplate = (tpl) => Boolean(tpl?.isFlexibleTime || tpl?.shiftCode === 'SPLIT');

const splitShiftDurationError = (form, t) => {
  const errorKey = validateSplitShiftDuration(form.startTime, form.endTime);
  if (!errorKey) return '';
  return t(`${NS}.createModal.${errorKey}`);
};

const templateOptionLabel = (t, tpl) =>
  isFlexibleTemplate(tpl)
    ? t(`${NS}.templateOptionFlexible`, { code: tpl.shiftCode, name: tpl.name })
    : t(`${NS}.templateOptionFixed`, {
        code: tpl.shiftCode,
        name: tpl.name,
        start: tpl.startTime,
        end: tpl.endTime,
      });

/** Backend wraps payloads as { success, data }; list endpoints nest arrays under data.data */
const unwrapApiData = (res) => res?.data ?? res;

const parseTemplateList = (res) => {
  const body = unwrapApiData(res);
  if (Array.isArray(body)) return { templates: body, totalHoursPerDay: null };
  return {
    templates: body.data || [],
    totalHoursPerDay: body.totalHoursPerDay ?? null,
  };
};

const parseShiftList = (res) => {
  const body = unwrapApiData(res);
  if (Array.isArray(body)) {
    return {
      shifts: body,
      totalHours: null,
      total: body.length,
      page: 1,
      totalPages: 1,
    };
  }
  return {
    shifts: body.data || [],
    totalHours: body.totalHours ?? null,
    total: body.total ?? (body.data || []).length,
    page: body.page ?? 1,
    totalPages: body.totalPages ?? 1,
  };
};

const templateHours = (t) => t?.totalHours ?? t?.durationHours;

const formatTemplateTimeDisplay = (t, tpl) =>
  isFlexibleTemplate(tpl) ? t(`${NS}.flexibleTimeOnAssign`) : `${tpl.startTime} – ${tpl.endTime}`;

const formatTemplateDurationDisplay = (t, tpl) => {
  if (isFlexibleTemplate(tpl)) return t(`${NS}.durationByAssignment`);
  const hours = templateHours(tpl);
  return hours != null ? t(`${NS}.durationHours`, { hours }) : '—';
};

const addDays = (dateStr, delta) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return getLocalDateString(d);
};

const formatScheduleDayHeader = (dateStr, locale) => {
  const d = new Date(`${dateStr}T12:00:00`);
  const weekday = d.toLocaleDateString(locale?.startsWith('vi') ? 'vi-VN' : 'en-US', { weekday: 'long' }).toUpperCase();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${weekday}, ${day}/${month}/${year}`;
};

const sortTemplatesByStart = (templates) =>
  [...templates].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

const getShiftTemplateId = (shift) =>
  String(shift.shiftTemplateId?._id || shift.shiftTemplateId || '');

const shiftsForTemplate = (dayShifts, templateId) =>
  dayShifts.filter(
    (s) => getShiftTemplateId(s) === String(templateId) && s.status !== 'cancelled'
  );

const getStaffDisplayName = (shift) => {
  const staff = shift.assignedStaffId;
  return staff?.userId?.fullName || staff?.staffCode || null;
};

const today = () => getLocalDateString();

const buildShiftPayload = (form, { isUpdate = false, template = null } = {}) => {
  if (isUpdate) {
    const payload = { changeReason: form.changeReason?.trim() || '' };
    if (form.shiftTemplateId) payload.shiftTemplateId = form.shiftTemplateId;
    if (form.workDate) payload.workDate = form.workDate;
    if (form.assignedStaffId) payload.assignedStaffId = form.assignedStaffId;
    if (isFlexibleTemplate(template)) {
      if (form.startTime) payload.startTime = form.startTime;
      if (form.endTime) payload.endTime = form.endTime;
    }
    return payload;
  }

  const payload = {
    shiftTemplateId: form.shiftTemplateId,
    workDate: form.workDate,
    assignedStaffId: form.assignedStaffId,
  };
  if (isFlexibleTemplate(template)) {
    payload.startTime = form.startTime;
    payload.endTime = form.endTime;
  }
  return payload;
};

const utcToday = () => getUtcDateString();
const nextWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() + 6);
  return getLocalDateString(d);
};

const emptyShift = {
  shiftTemplateId: '',
  workDate: today(),
  assignedStaffId: '',
  startTime: '08:00',
  endTime: '12:00',
};

function useAssignableStaffForDate(workDate) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workDate) {
      setStaff([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    staffService
      .getAll({ limit: 200, isActive: true, isBanned: false, assignmentDate: workDate })
      .then((res) => {
        if (cancelled) return;
        const list = (res.data || []).filter(
          (s) => canAssignShift(s) && !isStaffOnLeaveForAssignment(s)
        );
        setStaff(list);
      })
      .catch(() => {
        if (!cancelled) setStaff([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [workDate]);

  return { staff, loading };
}

// ── Small shared components ───────────────────────────────────────────────────

function ConflictList({ conflicts, title }) {
  const { t } = useTranslation();
  const sorted = sortConflicts(conflicts);
  if (!sorted.length) return null;
  return (
    <div className="conflict-list-wrap">
      {title && <p className="conflict-list__title">{title}</p>}
      <div className="conflict-list">
        {sorted.map((c, i) => (
          <div key={`${c.type}-${i}`} className={`conflict-item conflict-item--${c.severity.toLowerCase()}`}>
            {CONFLICT_ICON[c.severity]} <strong>{getConflictLabel(c.type, t)}</strong>
            {c.message && <> — {c.message}</>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Live preview via GET /shifts/check-conflicts (debounced). */
function useConflictPreview(form, { excludeId, templates = [] } = {}) {
  const [preview, setPreview] = useState([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { assignedStaffId, workDate, shiftTemplateId, startTime, endTime } = form;
    if (!assignedStaffId || !workDate || !shiftTemplateId) {
      setPreview([]);
      setAvailableTimeSlots(undefined);
      return undefined;
    }

    const template = templates.find((x) => x._id === shiftTemplateId);
    if (isFlexibleTemplate(template) && (!startTime || !endTime)) {
      setPreview([]);
      setAvailableTimeSlots(undefined);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = { assignedStaffId, workDate, shiftTemplateId, excludeId };
        if (isFlexibleTemplate(template)) {
          params.startTime = startTime;
          params.endTime = endTime;
        }
        const res = await shiftService.checkConflicts(params);
        setPreview(res.conflicts || []);
        setAvailableTimeSlots(
          isFlexibleTemplate(template) ? res.availableTimeSlots || [] : undefined
        );
      } catch {
        setPreview([]);
        setAvailableTimeSlots(undefined);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
    form.assignedStaffId,
    form.workDate,
    form.shiftTemplateId,
    form.startTime,
    form.endTime,
    excludeId,
    templates,
  ]);

  return { preview, loading, availableTimeSlots };
}

function SplitAvailableSlotsHint({ slots, onUseSlot }) {
  const { t } = useTranslation();
  if (slots === null || slots === undefined) return null;
  if (!slots.length) {
    return (
      <div className="form-grid--full">
        <small className="field-hint field-hint--warn">{t(`${NS}.splitNoAvailableSlots`)}</small>
      </div>
    );
  }
  const slotsText = slots
    .map((s) => `${s.displayStart || s.startTime}–${s.displayEnd || s.endTime}`)
    .join(', ');
  return (
    <div className="form-grid--full split-slots-hint">
      <small className="field-hint">{t(`${NS}.splitAvailableSlots`, { slots: slotsText })}</small>
      <div className="split-slots-hint__actions">
        {slots.map((slot, i) => (
          <button
            key={`${slot.startTime}-${slot.endTime}-${i}`}
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onUseSlot(slot)}
          >
            {t(`${NS}.splitUseSlot`)} ({slot.displayStart || slot.startTime}–{slot.displayEnd || slot.endTime})
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ value, map, prefix }) {
  return <span className={`status-badge status-badge--${prefix}-${value}`}>{map[value] || value}</span>;
}

// ── Tab 1: Mẫu ca làm việc (read-only system shifts) ─────────────────────────

function TemplatesTab() {
  const { t } = useTranslation();
  const shiftTypeOptions = useMemo(() => getShiftTypeOptions(t), [t]);
  const [templates, setTemplates] = useState([]);
  const [totalHoursPerDay, setTotalHoursPerDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();

  const filteredTemplates = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        (t.shiftCode || '').toLowerCase().includes(q)
        || (t.name || '').toLowerCase().includes(q)
    );
  }, [templates, debouncedSearch]);

  const {
    paginatedItems: paginatedTemplates,
    page,
    setPage,
    totalPages,
    total,
  } = useClientPagination(filteredTemplates);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await shiftService.getTemplates();
      const { templates: list, totalHoursPerDay: dayTotal } = parseTemplateList(res);
      setTemplates(list);
      setTotalHoursPerDay(dayTotal);
    } catch (e) {
      setError(resolveApiError(e, t, `${NS}.loadFailed`));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <p style={{ marginBottom: 12, fontSize: '0.85rem', color: '#64748b' }}>
        {t(`${NS}.templatesTab.intro`)}
        {totalHoursPerDay != null && (
          <> {t(`${NS}.templatesTab.introTotalHours`, { hours: totalHoursPerDay })}</>
        )}
        {' '}{t(`${NS}.templatesTab.introSplitHint`)}
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="tab-toolbar" style={{ marginBottom: 12 }}>
        <input
          type="search"
          placeholder={t(`${NS}.templatesTab.searchPlaceholder`)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? <p className="loading-text">{t(`${NS}.loading`)}</p> : (
        <>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t(`${NS}.templatesTab.colCode`)}</th>
              <th>{t(`${NS}.templatesTab.colName`)}</th>
              <th>{t(`${NS}.templatesTab.colType`)}</th>
              <th>{t(`${NS}.templatesTab.colTime`)}</th>
              <th>{t(`${NS}.templatesTab.colDuration`)}</th>
              <th>{t(`${NS}.templatesTab.colDescription`)}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTemplates.length === 0 && <tr><td colSpan={6} className="empty-row">{t(`${NS}.templatesTab.empty`)}</td></tr>}
            {paginatedTemplates.map((tpl) => (
              <tr key={tpl._id}>
                <td>
                  <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                    {tpl.shiftCode}
                  </span>
                </td>
                <td>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: tpl.colorLabel || '#607D8B', marginRight: 6 }} />
                  {tpl.name}
                  {tpl.crossesMidnight && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#7c3aed' }}>{t(`${NS}.crossesMidnight`)}</span>}
                </td>
                <td>{shiftTypeOptions.find((x) => x.value === tpl.shiftType)?.label || tpl.shiftType}</td>
                <td>{formatTemplateTimeDisplay(t, tpl)}</td>
                <td>{formatTemplateDurationDisplay(t, tpl)}</td>
                <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{tpl.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {paginatedTemplates.length > 0 && (
          <ListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        )}
        </>
      )}
    </div>
  );
}

// ── Tab 2: Phân công ca (Assign Shifts) ──────────────────────────────────────

function CreateShiftModal({ templates, onSave, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyShift);
  const { staff, loading: staffLoading } = useAssignableStaffForDate(form.workDate);
  const [conflicts, setConflicts] = useState([]);
  const [error, setError] = useState('');
  const { preview, loading: previewLoading, availableTimeSlots } = useConflictPreview(form, { templates });
  const set = (k, v) => {
    setConflicts([]);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const applySplitSlot = (slot) => {
    setConflicts([]);
    setForm((p) => ({
      ...p,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  };

  const selectedTemplate = form.shiftTemplateId
    ? templates.find((x) => x._id === form.shiftTemplateId)
    : null;
  const flexible = isFlexibleTemplate(selectedTemplate);

  const handleTemplateSelect = (id) => {
    setConflicts([]);
    const tpl = templates.find((x) => x._id === id);
    setForm((p) => ({
      ...p,
      shiftTemplateId: id,
      ...(isFlexibleTemplate(tpl) ? { startTime: p.startTime || '08:00', endTime: p.endTime || '12:00' } : {}),
    }));
  };

  const handleSave = async () => {
    setError('');
    setConflicts([]);
    if (!form.shiftTemplateId) {
      setError(t(`${NS}.createModal.selectShiftRequired`));
      return;
    }
    if (!form.assignedStaffId) {
      setError(t(`${NS}.createModal.selectStaffRequired`));
      return;
    }
    if (flexible && (!form.startTime || !form.endTime)) {
      setError(t(`${NS}.createModal.splitTimeRequired`));
      return;
    }
    if (flexible) {
      const durationError = splitShiftDurationError(form, t);
      if (durationError) {
        setError(durationError);
        return;
      }
    }
    try {
      const payload = buildShiftPayload(form, { template: selectedTemplate });
      const res = await onSave(payload);
      const c = res.conflicts || [];
      setConflicts(c);
      if (!hasBlockingConflicts(c)) onClose();
    } catch (e) {
      setError(resolveApiError(e, t, `${NS}.errorGeneric`));
      setConflicts(conflictsFromError(e));
    }
  };

  const displayConflicts = conflicts.length ? conflicts : preview;
  const showPreviewHint = !conflicts.length && preview.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scroll" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{t(`${NS}.createModal.title`)}</h2>
        {error && <p className="form-error">{error}</p>}
        {previewLoading && <p className="conflict-preview-hint">{t(`${NS}.checkingConflicts`)}</p>}
        <ConflictList
          conflicts={displayConflicts}
          title={
            conflicts.length
              ? t(`${NS}.conflictCannotSave`)
              : showPreviewHint
                ? t(`${NS}.conflictPreview`)
                : null
          }
        />
        <div className="form-grid">
          <div className="form-group form-grid--full">
            <label>{t(`${NS}.createModal.shiftLabel`)}</label>
            <select value={form.shiftTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)}>
              <option value="">{t(`${NS}.selectShift`)}</option>
              {templates.map((tpl) => (
                <option key={tpl._id} value={tpl._id}>{templateOptionLabel(t, tpl)}</option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <div className="form-grid--full" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#0369a1' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: selectedTemplate.colorLabel || '#607D8B', marginRight: 6 }} />
                {selectedTemplate.name} · {selectedTemplate.shiftCode}
              </div>
              {flexible ? (
                <div>{t(`${NS}.createModal.splitHint`)}</div>
              ) : (
                <>
                  <div>🕐 {selectedTemplate.startTime} – {selectedTemplate.endTime} &nbsp;·&nbsp; ⏱ {templateHours(selectedTemplate)}h</div>
                  {selectedTemplate.crossesMidnight && (
                    <div style={{ marginTop: 4, fontSize: '0.75rem' }}>{t(`${NS}.createModal.crossesMidnightHint`)}</div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="form-group form-grid--full">
            <label>{t(`${NS}.createModal.staffLabel`)}</label>
            <select
              value={form.assignedStaffId}
              onChange={(e) => set('assignedStaffId', e.target.value)}
              disabled={staffLoading || staff.length === 0}
            >
              <option value="">{t(`${NS}.selectStaff`)}</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.fullName} ({getStaffRoleLabel(t, s.role)})
                  {s.staffProfile?.staffCode ? ` · ${s.staffProfile.staffCode}` : ''}
                </option>
              ))}
            </select>
            {staffLoading && <small className="field-hint">{t(`${NS}.loadingStaff`)}</small>}
            {!staffLoading && staff.length === 0 && (
              <small className="field-hint field-hint--warn">
                {t(`${NS}.createModal.noStaffAvailable`)}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>{t(`${NS}.createModal.workDateLabel`)}</label>
            <input type="date" min={utcToday()} value={form.workDate} onChange={(e) => set('workDate', e.target.value)} />
            <small className="field-hint">{t(`${NS}.createModal.workDateHint`)}</small>
          </div>

          {selectedTemplate && flexible && (
            <>
              <div className="form-group">
                <label>{t(`${NS}.createModal.startTimeLabel`)}</label>
                <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t(`${NS}.createModal.endTimeLabel`)}</label>
                <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
              </div>
              {form.assignedStaffId && form.workDate && !previewLoading && availableTimeSlots !== undefined && (
                <SplitAvailableSlotsHint slots={availableTimeSlots} onUseSlot={applySplitSlot} />
              )}
            </>
          )}

          {selectedTemplate && !flexible && (
            <>
              <div className="form-group">
                <label>{t(`${NS}.createModal.startTimeReadonly`)}</label>
                <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', color: '#475569' }}>
                  🕐 {selectedTemplate.startTime} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t(`${NS}.fromTemplate`)}</span>
                </div>
              </div>
              <div className="form-group">
                <label>{t(`${NS}.createModal.endTimeReadonly`)}</label>
                <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', color: '#475569' }}>
                  🕐 {selectedTemplate.endTime} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t(`${NS}.fromTemplate`)}</span>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="modal__actions">
          <button className="btn-cancel" onClick={onClose}>{t(`${NS}.cancel`)}</button>
          <button className="btn-save" onClick={handleSave}>{t(`${NS}.createModal.createDraft`)}</button>
        </div>
      </div>
    </div>
  );
}

function UpdateShiftModal({ shift, templates, onSave, onClose }) {
  const { t } = useTranslation();
  const currentStaff = shift.assignedStaffId;
  const currentUserId = currentStaff?.userId?._id || currentStaff?.userId || '';
  const templateId = shift.shiftTemplateId?._id || shift.shiftTemplateId || '';

  const [form, setForm] = useState({
    workDate:        shift.workDate ? shift.workDate.slice(0, 10) : '',
    assignedStaffId: currentUserId?.toString() || '',
    shiftTemplateId: templateId?.toString() || '',
    startTime:       shift.startTime || '08:00',
    endTime:         shift.endTime || '12:00',
    changeReason:    '',
  });
  const [conflicts, setConflicts] = useState([]);
  const [error, setError] = useState('');
  const { staff, loading: staffLoading } = useAssignableStaffForDate(form.workDate);
  const { preview, loading: previewLoading, availableTimeSlots } = useConflictPreview(form, { excludeId: shift._id, templates });
  const set = (k, v) => {
    setConflicts([]);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const applySplitSlot = (slot) => {
    setConflicts([]);
    setForm((p) => ({
      ...p,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  };

  const selectedTemplate = form.shiftTemplateId
    ? templates.find((x) => x._id === form.shiftTemplateId)
    : null;
  const flexible = isFlexibleTemplate(selectedTemplate);

  const handleSave = async () => {
    setError('');
    setConflicts([]);
    if (!form.shiftTemplateId) {
      setError(t(`${NS}.createModal.selectShiftRequired`));
      return;
    }
    if (flexible && (!form.startTime || !form.endTime)) {
      setError(t(`${NS}.createModal.splitTimeRequired`));
      return;
    }
    if (flexible) {
      const durationError = splitShiftDurationError(form, t);
      if (durationError) {
        setError(durationError);
        return;
      }
    }
    try {
      const payload = buildShiftPayload(form, { isUpdate: true, template: selectedTemplate });
      const res = await onSave(shift._id, payload);
      const c = res.conflicts || [];
      setConflicts(c);
      if (!hasBlockingConflicts(c)) onClose();
    } catch (e) {
      setError(resolveApiError(e, t, `${NS}.errorGeneric`));
      setConflicts(conflictsFromError(e));
    }
  };

  const displayConflicts = conflicts.length ? conflicts : preview;
  const showPreviewHint = !conflicts.length && preview.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scroll" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{t(`${NS}.updateModal.title`)}</h2>
        {error && <p className="form-error">{error}</p>}
        {previewLoading && <p className="conflict-preview-hint">{t(`${NS}.checkingConflicts`)}</p>}
        <ConflictList
          conflicts={displayConflicts}
          title={
            conflicts.length
              ? t(`${NS}.conflictCannotSave`)
              : showPreviewHint
                ? t(`${NS}.conflictPreview`)
                : null
          }
        />
        <div className="form-grid">
          <div className="form-group form-grid--full">
            <label>{t(`${NS}.createModal.shiftLabel`)}</label>
            <select value={form.shiftTemplateId} onChange={(e) => set('shiftTemplateId', e.target.value)}>
              <option value="">{t(`${NS}.selectShift`)}</option>
              {templates.map((tpl) => (
                <option key={tpl._id} value={tpl._id}>{templateOptionLabel(t, tpl)}</option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <div className="form-grid--full" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#0369a1' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: selectedTemplate.colorLabel || '#607D8B', marginRight: 6 }} />
                {selectedTemplate.name} · {selectedTemplate.shiftCode}
              </div>
              {flexible ? (
                <div>{t(`${NS}.updateModal.splitEditHint`)}</div>
              ) : (
                <div>🕐 {selectedTemplate.startTime} – {selectedTemplate.endTime} &nbsp;·&nbsp; ⏱ {templateHours(selectedTemplate)}h</div>
              )}
            </div>
          )}

          {flexible && (
            <>
              <div className="form-group">
                <label>{t(`${NS}.createModal.startTimeLabel`)}</label>
                <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t(`${NS}.createModal.endTimeLabel`)}</label>
                <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
              </div>
              {form.assignedStaffId && form.workDate && !previewLoading && availableTimeSlots !== undefined && (
                <SplitAvailableSlotsHint slots={availableTimeSlots} onUseSlot={applySplitSlot} />
              )}
            </>
          )}

          <div className="form-group form-grid--full">
            <label>{t(`${NS}.updateModal.staffLabel`)}</label>
            <select
              value={form.assignedStaffId}
              onChange={(e) => set('assignedStaffId', e.target.value)}
              disabled={staffLoading}
            >
              <option value="">{t(`${NS}.keepUnchanged`)}</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.fullName} ({getStaffRoleLabel(t, s.role)})
                  {s.staffProfile?.staffCode ? ` · ${s.staffProfile.staffCode}` : ''}
                </option>
              ))}
            </select>
            {!staffLoading && staff.length === 0 && (
              <small className="field-hint field-hint--warn">
                {t(`${NS}.createModal.noStaffAvailable`)}
              </small>
            )}
          </div>
          <div className="form-group">
            <label>{t(`${NS}.updateModal.workDateLabel`)}</label>
            <input type="date" min={utcToday()} value={form.workDate} onChange={(e) => set('workDate', e.target.value)} />
          </div>
          <div className="form-group form-grid--full">
            <label>{t(`${NS}.updateModal.changeReasonLabel`)}</label>
            <input
              value={form.changeReason}
              onChange={(e) => set('changeReason', e.target.value)}
              placeholder={t(`${NS}.updateModal.changeReasonPlaceholder`)}
            />
          </div>
        </div>
        <div className="modal__actions">
          <button className="btn-cancel" onClick={onClose}>{t(`${NS}.cancel`)}</button>
          <button className="btn-save" onClick={handleSave}>{t(`${NS}.save`)}</button>
        </div>
      </div>
    </div>
  );
}

function AssignTab() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const shiftStatusLabels = useMemo(() => getShiftStatusLabels(t), [t]);
  const [shifts, setShifts]               = useState([]);
  const [listTotalHours, setListTotalHours] = useState(null);
  const [templates, setTemplates]         = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterFrom, setFilterFrom]       = useState(today());
  const [filterTo, setFilterTo]           = useState(nextWeek());
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [shiftTotal, setShiftTotal]       = useState(0);
  const resetPageOnSearch = useCallback(() => setPage(1), []);
  const { search, setSearch, debouncedSearch } = useDebouncedSearch({
    onDebouncedChange: resetPageOnSearch,
  });
  const [showCreate, setShowCreate]       = useState(false);
  const [editShift, setEditShift]         = useState(null);
  const [actionConflicts, setActConflicts] = useState([]);
  const [blockingTasks, setBlockingTasks] = useState([]);

  const loadTemplates = async () => {
    const res = await shiftService.getTemplates();
    const { templates: list } = parseTemplateList(res);
    setTemplates(list);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    setBlockingTasks([]);
    try {
      const res = await shiftService.listShifts({
        page,
        limit: ADMIN_LIST_PAGE_SIZE,
        status: filterStatus || undefined,
        fromDate: filterFrom,
        toDate: filterTo,
        search: debouncedSearch || undefined,
      });
      const parsed = parseShiftList(res);
      let list = parsed.shifts;
      const q = debouncedSearch.trim().toLowerCase();
      if (q && parsed.totalPages <= 1 && list.length <= ADMIN_LIST_PAGE_SIZE) {
        list = list.filter((s) => {
          const staffName = s.assignedStaffId?.userId?.fullName || s.assignedStaffId?.staffCode || '';
          return (s.name || '').toLowerCase().includes(q) || staffName.toLowerCase().includes(q);
        });
      }
      setShifts(list);
      setListTotalHours(parsed.totalHours);
      setShiftTotal(parsed.total ?? list.length);
      setTotalPages(parsed.totalPages ?? Math.max(1, Math.ceil((parsed.total ?? list.length) / ADMIN_LIST_PAGE_SIZE)));
    } catch (e) { setError(resolveApiError(e, t, `${NS}.loadFailed`)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadTemplates();
  }, []);
  useEffect(() => { load(); }, [filterStatus, filterFrom, filterTo, page, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterFrom, filterTo]);

  const handleCreate = async (form) => {
    const res = await shiftService.createShift(form);
    load();
    return res;
  };

  const handlePublish = async (id) => {
    setActConflicts([]);
    try {
      const res = await shiftService.publishShift(id);
      const c = res.conflicts || [];
      if (c.length) setActConflicts(c);
      load();
    } catch (e) {
      const c = conflictsFromError(e);
      setActConflicts(c);
      const msg = resolveApiError(e, t, `${NS}.assignTab.publishFailed`);
      if (hasBlockingConflicts(c)) {
        showToast(t(`${NS}.assignTab.publishBlockedAlert`, {
          message: msg,
          count: c.filter((x) => x.severity === 'ERROR').length,
        }), 'error');
      } else {
        showToast(msg, 'error');
      }
    }
  };

  const handleCancel = async (s) => {
    const reason = prompt(t(`${NS}.assignTab.cancelReasonPrompt`));
    if (reason === null) return;
    setBlockingTasks([]);
    try {
      await shiftService.cancelShift(s._id, reason);
      load();
    } catch (e) {
      const { message, blockingTasks: blocked } = getApiErrorPayload(e, t(`${NS}.assignTab.cancelFailed`));
      if (blocked.length) {
        setBlockingTasks(blocked);
        setError(blockingCareTasksMessage(message));
      } else {
        showToast(message, 'error');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t(`${NS}.assignTab.deleteConfirm`))) return;
    setBlockingTasks([]);
    try {
      await shiftService.deleteShift(id);
      load();
    } catch (e) {
      const { message, blockingTasks: blocked } = getApiErrorPayload(e, t(`${NS}.assignTab.deleteFailed`));
      if (blocked.length) {
        setBlockingTasks(blocked);
        setError(blockingCareTasksMessage(message));
      } else {
        showToast(message, 'error');
      }
    }
  };

  const handleUpdate = async (id, form) => {
    const res = await shiftService.updateShift(id, form);
    const c = res.conflicts || [];
    if (c.length) setActConflicts(c);
    load();
    return res;
  };

  const canEdit    = (s) => ['draft', 'published'].includes(s.status);
  const canPublish = (s) => s.status === 'draft';
  const canCancel  = (s) => ['published', 'confirmed'].includes(s.status);
  const canDelete  = (s) => s.status === 'draft';

  return (
    <div>
      <div className="tab-toolbar">
        <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        <span style={{ color: '#94a3b8' }}>→</span>
        <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">{t(`${NS}.assignTab.allStatuses`)}</option>
          {Object.entries(shiftStatusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input
          type="search"
          placeholder={t(`${NS}.assignTab.searchPlaceholder`)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-primary" onClick={() => setShowCreate(true)}>{t(`${NS}.assignTab.assignButton`)}</button>
      </div>
      <p style={{ marginBottom: 12, fontSize: '0.8rem', color: '#64748b' }}>
        {t(`${NS}.assignTab.hintAfterPublish`)} <strong>{t(`${NS}.assignTab.hintPublishAction`)}</strong>
        {t(`${NS}.assignTab.hintStaffConfirm`)} <strong>{t(`${NS}.assignTab.hintMyShifts`)}</strong>.
        {' '}{t(`${NS}.assignTab.hintPublishedUnconfirmed`)} <strong>{t(`${NS}.assignTab.hintPublishedStatus`)}</strong>{' '}
        {t(`${NS}.assignTab.hintAutoCancel`)}
        {' '}{t(`${NS}.assignTab.hintConfirmedOnly`)} <strong>{t(`${NS}.assignTab.hintConfirmedStatus`)}</strong>{' '}
        {t(`${NS}.assignTab.hintEmergencyReady`)}
        {' '}{t(`${NS}.assignTab.hintAreaAssignment`)} <strong>{t(`${NS}.assignTab.hintAreaTab`)}</strong>
        {t(`${NS}.assignTab.hintAreaTabSuffix`)}
        {listTotalHours != null && shifts.length > 0 && (
          <> {t(`${NS}.assignTab.hintTotalHours`)} <strong>{listTotalHours}h</strong>.</>
        )}
      </p>

      {error && !blockingTasks.length && <p className="form-error">{error}</p>}
      {blockingTasks.length > 0 && (
        <BlockingCareTasksAlert
          message={error}
          tasks={blockingTasks}
          hint={t(`${NS}.assignTab.blockingTasksHint`)}
        />
      )}
      {actionConflicts.length > 0 && (
        <ConflictList
          conflicts={actionConflicts}
          title={t(`${NS}.conflictActionResult`)}
        />
      )}

      {loading ? <p className="loading-text">{t(`${NS}.loading`)}</p> : (
        <table className="data-table">
          <thead><tr><th>{t(`${NS}.assignTab.colShiftName`)}</th><th>{t(`${NS}.assignTab.colStaff`)}</th><th>{t(`${NS}.assignTab.colDate`)}</th><th>{t(`${NS}.assignTab.colTime`)}</th><th>{t(`${NS}.assignTab.colDuration`)}</th><th>{t(`${NS}.assignTab.colStatus`)}</th><th>{t(`${NS}.assignTab.colActions`)}</th></tr></thead>
          <tbody>
            {shifts.length === 0 && <tr><td colSpan={7} className="empty-row">{t(`${NS}.assignTab.empty`)}</td></tr>}
            {shifts.map((s) => {
              const staffObj  = s.assignedStaffId;
              const staffName = staffObj?.userId?.fullName || staffObj?.staffCode || '—';
              const hours = s.totalHours ?? templateHours(s.shiftTemplateId);
              return (
                <tr key={s._id}>
                  <td>
                    {s.shiftTemplateId?.colorLabel && (
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: s.shiftTemplateId.colorLabel, marginRight: 6 }} />
                    )}
                    {s.name}
                  </td>
                  <td>{staffName}</td>
                  <td>{new Date(s.workDate).toLocaleDateString(i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US')}</td>
                  <td>{s.startTime} – {s.endTime}</td>
                  <td>{hours != null ? t(`${NS}.durationHours`, { hours }) : '—'}</td>
                  <td><StatusBadge value={s.status} map={shiftStatusLabels} prefix="shift" /></td>
                  <td className="action-cell">
                    {canPublish(s) && <button className="action-btn action-btn--publish" onClick={() => handlePublish(s._id)}>{t(`${NS}.publish`)}</button>}
                    {canEdit(s)    && <button className="action-btn action-btn--edit"    onClick={() => setEditShift(s)}>{t(`${NS}.edit`)}</button>}
                    {canCancel(s)  && <button className="action-btn action-btn--warning" onClick={() => handleCancel(s)}>{t(`${NS}.cancel`)}</button>}
                    {canDelete(s)  && <button className="action-btn action-btn--danger"  onClick={() => handleDelete(s._id)}>{t(`${NS}.delete`)}</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!loading && shifts.length > 0 && (
        <ListPagination
          page={page}
          totalPages={Math.max(totalPages, 1)}
          total={shiftTotal}
          onPageChange={setPage}
        />
      )}

      {showCreate && <CreateShiftModal templates={templates} onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      {editShift && <UpdateShiftModal shift={editShift} templates={templates} onSave={handleUpdate} onClose={() => setEditShift(null)} />}
    </div>
  );
}

// ── Tab 3: Lịch làm việc (Schedule view — 3 cột ca cố định + ca gãy riêng) ───

function ScheduleColumn({ template, shifts, t, shiftStatusLabels }) {
  const columnShifts = shiftsForTemplate(shifts, template._id);
  const accent = template.colorLabel || '#607D8B';
  const flexible = isFlexibleTemplate(template);

  return (
    <div className="schedule-column" style={{ borderTopColor: accent }}>
      <div className="schedule-column__head">
        <div className="schedule-column__title">{template.name}</div>
        <div className="schedule-column__time">
          {flexible
            ? t(`${NS}.flexibleTimeOnAssign`)
            : `${template.startTime} – ${template.endTime}`}
          {!flexible && templateHours(template) != null && (
            <span className="schedule-column__hours"> · {templateHours(template)}h</span>
          )}
        </div>
      </div>
      <div className="schedule-column__body">
        {columnShifts.length === 0 ? (
          <div className="schedule-column__row schedule-column__row--empty">
            <span className="schedule-column__row-index">1</span>
            <span className="schedule-column__row-name">{t(`${NS}.scheduleTab.unassigned`)}</span>
          </div>
        ) : (
          columnShifts.map((s, i) => (
            <div key={s._id} className="schedule-column__row">
              <span className="schedule-column__row-index">{i + 1}</span>
              <span className="schedule-column__row-name">
                {getStaffDisplayName(s) || '—'}
                {flexible && s.startTime && s.endTime && (
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                    {s.startTime} – {s.endTime}
                  </span>
                )}
              </span>
              <StatusBadge value={s.status} map={shiftStatusLabels} prefix="shift" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ScheduleDayBoard({ date, templates, shifts, t, i18n, shiftStatusLabels }) {
  const sortedTemplates = sortTemplatesByStart(templates);
  const standardTemplates = sortedTemplates.filter((tpl) => !isFlexibleTemplate(tpl));
  const splitTemplates = sortedTemplates.filter((tpl) => isFlexibleTemplate(tpl));

  return (
    <div className="schedule-day">
      <div className="schedule-day__header">{formatScheduleDayHeader(date, i18n.language)}</div>
      <div className="schedule-columns">
        {standardTemplates.map((template) => (
          <ScheduleColumn key={template._id} template={template} shifts={shifts} t={t} shiftStatusLabels={shiftStatusLabels} />
        ))}
      </div>
      {splitTemplates.length > 0 && (
        <div className="schedule-split-section">
          {splitTemplates.map((template) => (
            <ScheduleColumn key={template._id} template={template} shifts={shifts} t={t} shiftStatusLabels={shiftStatusLabels} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleTab() {
  const { t, i18n } = useTranslation();
  const shiftStatusLabels = useMemo(() => getShiftStatusLabels(t), [t]);
  const [shifts, setShifts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [scheduleTotalHours, setScheduleTotalHours] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(today());

  const loadTemplates = async () => {
    try {
      const res = await shiftService.getTemplates();
      const { templates: list } = parseTemplateList(res);
      setTemplates(sortTemplatesByStart(list));
    } catch {
      setTemplates([]);
    }
  };

  const load = async () => {
    if (!selectedDate) return;
    setLoading(true);
    setError('');
    try {
      const res = await shiftService.getSchedule(selectedDate, selectedDate);
      const { shifts: list, totalHours } = parseShiftList(res);
      setShifts(list);
      setScheduleTotalHours(totalHours);
    } catch (e) {
      setError(resolveApiError(e, t, `${NS}.loadFailed`));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    load();
  }, [selectedDate]);

  return (
    <div>
      <div className="tab-toolbar schedule-toolbar">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
        >
          {t(`${NS}.scheduleTab.yesterday`)}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setSelectedDate(today())}>
          {t(`${NS}.scheduleTab.today`)}
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          aria-label={t(`${NS}.scheduleTab.selectDateAria`)}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
        >
          {t(`${NS}.scheduleTab.tomorrow`)}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="loading-text">{t(`${NS}.loading`)}</p>}

      {!loading && scheduleTotalHours != null && (
        <p className="schedule-summary">
          {t(`${NS}.scheduleTab.totalHoursDay`)} <strong>{scheduleTotalHours}h</strong>
        </p>
      )}

      {!loading && templates.length > 0 && (
        <ScheduleDayBoard date={selectedDate} templates={templates} shifts={shifts} t={t} i18n={i18n} shiftStatusLabels={shiftStatusLabels} />
      )}

      {!loading && templates.length === 0 && !error && (
        <p className="loading-text">{t(`${NS}.scheduleTab.templatesLoadFailed`)}</p>
      )}
    </div>
  );
}

function CreateCareScheduleTab() {
  const { t } = useTranslation();
  const careTaskTypeOptions = useMemo(() => getCareTaskTypeOptions(t), [t]);
  const careLevelOptions = useMemo(() => getCareLevelOptions(t), [t]);
  const careScheduleStatusLabels = useMemo(() => getCareScheduleStatusLabels(t), [t]);
  const CS = `${NS}.careScheduleTab`;
  const [workDate, setWorkDate] = useState(todayVN());
  const { staff: staffOptions } = useAssignableStaffForDate(workDate);
  const [residents, setResidents] = useState([]);
  const [staffResidentsCache, setStaffResidentsCache] = useState({});
  const [templates, setTemplates] = useState([]);
  const [dayShifts, setDayShifts] = useState([]);
  const [selectedResidents, setSelectedResidents] = useState([]);
  const [commonStaffProfileId, setCommonStaffProfileId] = useState('');
  const [commonShiftId, setCommonShiftId] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState('');
  const [drafts, setDrafts] = useState([]);
  const { search: draftSearch, setSearch: setDraftSearch, debouncedSearch: debouncedDraftSearch } = useDebouncedSearch();
  const filteredDrafts = useMemo(() => {
    const q = debouncedDraftSearch.trim().toLowerCase();
    if (!q) return drafts;
    return drafts.filter(
      (d) =>
        (d.title || '').toLowerCase().includes(q)
        || toVNDateString(d.workDate).includes(q)
    );
  }, [drafts, debouncedDraftSearch]);
  const {
    paginatedItems: paginatedDrafts,
    page: draftPage,
    setPage: setDraftPage,
    totalPages: draftTotalPages,
    total: draftTotal,
  } = useClientPagination(filteredDrafts);
  const [detailSchedule, setDetailSchedule] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const userIdForStaffProfile = (staffProfileId) => {
    if (!staffProfileId) return '';
    const match = staffOptions.find(
      (s) => String(s.staffProfile?._id || '') === String(staffProfileId)
    );
    return match?._id ? String(match._id) : '';
  };

  const loadResidentsForStaffProfile = async (staffProfileId) => {
    if (!staffProfileId) {
      setResidents([]);
      return [];
    }
    const cached = staffResidentsCache[staffProfileId];
    if (cached) {
      setResidents(cached);
      return cached;
    }
    const userId = userIdForStaffProfile(staffProfileId);
    if (!userId) {
      setResidents([]);
      return [];
    }
    try {
      const res = await staffService.getAssignedResidents(userId);
      const list = Array.isArray(res?.data) ? res.data : [];
      setStaffResidentsCache((prev) => ({ ...prev, [staffProfileId]: list }));
      setResidents(list);
      return list;
    } catch {
      setResidents([]);
      return [];
    }
  };

  const residentsForStaffProfile = (staffProfileId) => {
    if (!staffProfileId) return [];
    return staffResidentsCache[staffProfileId] || (String(staffProfileId) === String(commonStaffProfileId) ? residents : []);
  };

  const selectedResidentSet = useMemo(
    () => new Set(selectedResidents.map((id) => String(id))),
    [selectedResidents]
  );

  /** Cư dân trong dropdown hàng = đã tick phía trên ∩ được phân cho NV của hàng */
  const residentsForRow = (staffProfileId) =>
    residentsForStaffProfile(staffProfileId).filter((r) => selectedResidentSet.has(String(r._id)));

  const handleResidentCheckboxChange = (residentId, checked) => {
    const id = String(residentId);
    if (checked) {
      setSelectedResidents((prev) => (prev.includes(id) ? prev : [...prev, id]));
      return;
    }
    setSelectedResidents((prev) => prev.filter((x) => x !== id));
    setEntries((prev) => prev.filter((row) => String(row.residentId) !== id));
  };

  const loadTemplates = async () => {
    try {
      const res = await careScheduleService.getTemplates();
      setTemplates(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch {
      setTemplates([]);
    }
  };

  const loadShiftsForDay = async () => {
    try {
      const res = await shiftService.getSchedule(workDate, workDate);
      const { shifts } = parseShiftList(res);
      setDayShifts(shifts.filter((s) => ['published', 'confirmed'].includes(s.status)));
    } catch {
      setDayShifts([]);
    }
  };

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const res = await careScheduleService.listSchedules({ workDate, limit: 100 });
      const rows = Array.isArray(res?.data) ? res.data : [];
      setDrafts(rows.filter((x) => ['draft', 'published'].includes(x.status)));
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    setCommonStaffProfileId('');
    setCommonShiftId('');
    setResidents([]);
    setSelectedResidents([]);
    setStaffResidentsCache({});
    loadShiftsForDay();
    loadDrafts();
  }, [workDate]);

  useEffect(() => {
    if (!commonStaffProfileId) {
      setResidents([]);
      setSelectedResidents([]);
      return;
    }
    let cancelled = false;
    loadResidentsForStaffProfile(commonStaffProfileId).then((list) => {
      if (cancelled) return;
      const validIds = new Set(list.map((r) => String(r._id)));
      setSelectedResidents((prev) => prev.filter((id) => validIds.has(String(id))));
      setEntries((prev) =>
        prev.filter((row) => !row.residentId || validIds.has(String(row.residentId)))
      );
    });
    return () => { cancelled = true; };
  }, [commonStaffProfileId, staffOptions]);

  const shiftsBySelectedStaff = dayShifts.filter(
    (s) => String(s.assignedStaffId?._id || s.assignedStaffId) === String(commonStaffProfileId)
  );

  const addEntriesFromTemplate = () => {
    setError('');
    const tpl = templates.find((t) => t.key === templateKey);
    if (!tpl) {
      setError(t(`${CS}.selectTemplateRequired`));
      return;
    }
    if (selectedResidents.length < 1) {
      setError(t(`${CS}.selectResidentRequired`));
      return;
    }
    if (!commonStaffProfileId || !commonShiftId) {
      setError(t(`${CS}.selectStaffShiftRequired`));
      return;
    }
    const generated = [];
    selectedResidents.forEach((residentId) => {
      tpl.entries.forEach((it) => {
        generated.push({
          residentId,
          staffProfileId: commonStaffProfileId,
          shiftId: commonShiftId,
          taskType: it.taskType,
          careLevel: it.careLevel,
          scheduledTime: it.scheduledTime,
          notes: '',
          source: 'template',
          templateKey,
        });
      });
    });
    setEntries((prev) => [...prev, ...generated]);
  };

  const addManualRow = () => {
    setError('');
    if (selectedResidents.length < 1) {
      setError(t(`${CS}.selectResidentBeforeManual`));
      return;
    }
    setEntries((prev) => [
      ...prev,
      {
        residentId: selectedResidents[0] || '',
        staffProfileId: commonStaffProfileId || '',
        shiftId: commonShiftId || '',
        taskType: 'morning_care',
        careLevel: 'low',
        scheduledTime: '08:00',
        notes: '',
        source: 'manual',
      },
    ]);
  };

  const patchEntry = (idx, patch) => {
    setEntries((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const removeEntry = (idx) => setEntries((prev) => prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setTitle('');
    setSelectedResidents([]);
    setTemplateKey('');
    setEntries([]);
    setEditingScheduleId('');
    setError('');
  };

  const validateBeforeSave = () => {
    if (workDate < todayVN()) return t(`${CS}.pastDateError`);
    if (selectedResidents.length < 1) return t(`${CS}.minResidentError`);
    if (!entries.length) return t(`${CS}.minEntryError`);
    const invalid = entries.find(
      (e) =>
        !e.residentId ||
        !e.staffProfileId ||
        !e.shiftId ||
        !e.taskType ||
        !e.careLevel ||
        !e.scheduledTime
    );
    if (invalid) return t(`${CS}.entryFieldsError`);
    const invalidResident = entries.find((e) => {
      if (!e.residentId || !e.staffProfileId) return false;
      return !residentsForRow(e.staffProfileId).some((r) => String(r._id) === String(e.residentId));
    });
    if (invalidResident) {
      return t(`${CS}.entryResidentStaffError`);
    }
    return '';
  };

  const submitDraft = async () => {
    const msg = validateBeforeSave();
    if (msg) {
      setError(msg);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { workDate, title, entries };
      if (editingScheduleId) {
        await careScheduleService.updateDraft(editingScheduleId, payload);
      } else {
        await careScheduleService.createDraft(payload);
      }
      resetForm();
      loadDrafts();
    } catch (e) {
      setError(resolveApiError(e, t, `${CS}.saveDraftFailed`));
    } finally {
      setSaving(false);
    }
  };

  const openDraft = async (id) => {
    setSaving(true);
    setError('');
    try {
      const data = await careScheduleService.getSchedule(id);
      setEditingScheduleId(data._id);
      setTitle(data.title || '');
      setWorkDate(toVNDateString(data.workDate) || todayVN());
      const rows = Array.isArray(data.entries) ? data.entries : [];
      setEntries(
        rows.map((r) => ({
          residentId: String(r.residentId?._id || r.residentId || ''),
          staffProfileId: String(r.staffProfileId?._id || r.staffProfileId || ''),
          shiftId: String(r.shiftId?._id || r.shiftId || ''),
          taskType: r.taskType,
          careLevel: r.careLevel,
          scheduledTime: r.scheduledTime,
          notes: r.notes || '',
          source: r.source || 'manual',
          templateKey: r.templateKey,
        }))
      );
      const residentSet = [...new Set(rows.map((r) => String(r.residentId?._id || r.residentId || '')).filter(Boolean))];
      setSelectedResidents(residentSet);
    } catch (e) {
      setError(resolveApiError(e, t, `${CS}.openDraftFailed`));
    } finally {
      setSaving(false);
    }
  };

  const publishDraft = async (id) => {
    setSaving(true);
    setError('');
    try {
      await careScheduleService.publishSchedule(id);
      if (editingScheduleId === id) resetForm();
      loadDrafts();
    } catch (e) {
      setError(resolveApiError(e, t, `${CS}.publishFailed`));
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async (id) => {
    if (!window.confirm(t(`${CS}.deleteDraftConfirm`))) return;
    setSaving(true);
    setError('');
    try {
      await careScheduleService.deleteDraft(id);
      if (editingScheduleId === id) resetForm();
      loadDrafts();
    } catch (e) {
      setError(resolveApiError(e, t, `${CS}.deleteDraftFailed`));
    } finally {
      setSaving(false);
    }
  };

  const openPublishedDetail = async (id) => {
    setDetailLoading(true);
    setError('');
    try {
      const data = await careScheduleService.getSchedule(id);
      setDetailSchedule(data || null);
    } catch (e) {
      setError(resolveApiError(e, t, `${CS}.detailLoadFailed`));
      setDetailSchedule(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div>
      <p style={{ marginBottom: 12, fontSize: '0.85rem', color: '#64748b' }}>
        {t(`${CS}.intro`)}
      </p>
      {error && <p className="form-error">{error}</p>}

      <div className="form-grid">
        <div className="form-group">
          <label>{t(`${CS}.careDateLabel`)}</label>
          <input type="date" min={todayVN()} value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>{t(`${CS}.titleLabel`)}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(`${CS}.titlePlaceholder`)} />
        </div>
        <div className="form-group">
          <label>{t(`${CS}.commonStaffLabel`)}</label>
          <select
            value={commonStaffProfileId}
            onChange={(e) => {
              setCommonStaffProfileId(e.target.value);
              setCommonShiftId('');
              setSelectedResidents([]);
              setEntries((prev) => prev.map((row) => ({ ...row, residentId: '', shiftId: '' })));
            }}
          >
            <option value="">{t(`${NS}.selectStaff`)}</option>
            {staffOptions.map((s) => (
              <option key={s.staffProfile?._id || s._id} value={s.staffProfile?._id || ''}>
                {s.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>{t(`${CS}.commonShiftLabel`)}</label>
          <select value={commonShiftId} onChange={(e) => setCommonShiftId(e.target.value)}>
            <option value="">{t(`${NS}.selectShift`)}</option>
            {shiftsBySelectedStaff.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.startTime} - {s.endTime})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
          {t(`${CS}.residentsLabel`)}
        </label>
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#64748b' }}>
          {t(`${CS}.residentsHint`)}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, maxHeight: 160, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}>
          {!commonStaffProfileId && (
            <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              {t(`${CS}.selectStaffForResidents`)}
            </p>
          )}
          {commonStaffProfileId && !residents.length && (
            <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              {t(`${CS}.staffNoResidents`)}
            </p>
          )}
          {residents.map((r) => {
            const id = String(r._id);
            const checked = selectedResidents.includes(id);
            return (
              <label key={id} style={{ fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => handleResidentCheckboxChange(id, e.target.checked)}
                />{' '}
                {r.fullName || r.residentCode}
              </label>
            );
          })}
        </div>
      </div>

      <div className="tab-toolbar">
        <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
          <option value="">{t(`${NS}.selectScheduleTemplate`)}</option>
          {templates.map((tpl) => (
            <option key={tpl.key} value={tpl.key}>{tpl.name}</option>
          ))}
        </select>
        <button type="button" className="btn-primary" onClick={addEntriesFromTemplate}>
          {t(`${CS}.addFromTemplate`)}
        </button>
        <button type="button" className="btn-secondary" onClick={addManualRow}>
          {t(`${CS}.addManual`)}
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>{t(`${CS}.colResident`)}</th>
            <th>{t(`${CS}.colStaff`)}</th>
            <th>{t(`${CS}.colShift`)}</th>
            <th>{t(`${CS}.colTaskType`)}</th>
            <th>{t(`${CS}.colCareLevel`)}</th>
            <th>{t(`${CS}.colTime`)}</th>
            <th>{t(`${CS}.colSource`)}</th>
            <th>{t(`${CS}.colNotes`)}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr><td colSpan={9} className="empty-state">{t(`${CS}.emptyEntries`)}</td></tr>
          )}
          {entries.map((row, idx) => (
            <tr key={`${idx}-${row.residentId}-${row.scheduledTime}`}>
              <td>
                <select value={row.residentId} onChange={(e) => patchEntry(idx, { residentId: e.target.value })}>
                  <option value="">—</option>
                  {residentsForRow(row.staffProfileId).map((r) => (
                    <option key={r._id} value={r._id}>{r.fullName || r.residentCode}</option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={row.staffProfileId}
                  onChange={async (e) => {
                    const staffProfileId = e.target.value;
                    let nextResidentId = '';
                    if (staffProfileId && row.residentId && selectedResidentSet.has(String(row.residentId))) {
                      const stillValid = residentsForStaffProfile(staffProfileId).some(
                        (r) => String(r._id) === String(row.residentId)
                      );
                      if (stillValid) nextResidentId = row.residentId;
                    }
                    patchEntry(idx, { staffProfileId, shiftId: '', residentId: nextResidentId });
                    if (staffProfileId && !staffResidentsCache[staffProfileId]) {
                      const userId = userIdForStaffProfile(staffProfileId);
                      if (userId) {
                        try {
                          const res = await staffService.getAssignedResidents(userId);
                          const list = Array.isArray(res?.data) ? res.data : [];
                          setStaffResidentsCache((prev) => ({ ...prev, [staffProfileId]: list }));
                        } catch {
                          setStaffResidentsCache((prev) => ({ ...prev, [staffProfileId]: [] }));
                        }
                      }
                    }
                  }}
                >
                  <option value="">—</option>
                  {staffOptions.map((s) => <option key={s.staffProfile?._id || s._id} value={s.staffProfile?._id || ''}>{s.fullName}</option>)}
                </select>
              </td>
              <td>
                <select value={row.shiftId} onChange={(e) => patchEntry(idx, { shiftId: e.target.value })}>
                  <option value="">—</option>
                  {dayShifts
                    .filter((s) => String(s.assignedStaffId?._id || s.assignedStaffId) === String(row.staffProfileId))
                    .map((s) => <option key={s._id} value={s._id}>{s.name} ({s.startTime}-{s.endTime})</option>)}
                </select>
              </td>
              <td>
                <select value={row.taskType} onChange={(e) => patchEntry(idx, { taskType: e.target.value })}>
                  {careTaskTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </td>
              <td>
                <select value={row.careLevel} onChange={(e) => patchEntry(idx, { careLevel: e.target.value })}>
                  {careLevelOptions.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </td>
              <td><input type="time" value={row.scheduledTime} onChange={(e) => patchEntry(idx, { scheduledTime: e.target.value })} /></td>
              <td>{row.source === 'template' ? t(`${NS}.source.template`) : t(`${NS}.source.manual`)}</td>
              <td><input value={row.notes || ''} onChange={(e) => patchEntry(idx, { notes: e.target.value })} /></td>
              <td><button type="button" className="btn btn--sm btn--delete" onClick={() => removeEntry(idx)}>{t(`${NS}.delete`)}</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="tab-toolbar">
        <button type="button" className="btn-primary" disabled={saving} onClick={submitDraft}>
          {saving ? t(`${CS}.saving`) : editingScheduleId ? t(`${CS}.updateDraft`) : t(`${CS}.saveDraft`)}
        </button>
        <button type="button" className="btn-secondary" onClick={resetForm}>{t(`${NS}.reset`)}</button>
      </div>

      <h4 style={{ marginTop: 20 }}>{t(`${CS}.schedulesForDay`)}</h4>
      <div className="tab-toolbar" style={{ marginBottom: 8 }}>
        <input
          type="search"
          placeholder={t(`${CS}.searchDraftsPlaceholder`)}
          value={draftSearch}
          onChange={(e) => setDraftSearch(e.target.value)}
        />
      </div>
      {loading ? <p className="loading-text">{t(`${NS}.loading`)}</p> : (
        <>
        <table className="data-table">
          <thead>
            <tr><th>{t(`${CS}.colTitle`)}</th><th>{t(`${CS}.colDate`)}</th><th>{t(`${CS}.colStatus`)}</th><th>{t(`${CS}.colUpdated`)}</th><th>{t(`${CS}.colActions`)}</th></tr>
          </thead>
          <tbody>
            {paginatedDrafts.length === 0 && <tr><td colSpan={5} className="empty-state">{t(`${CS}.emptySchedules`)}</td></tr>}
            {paginatedDrafts.map((d) => (
              <tr key={d._id}>
                <td>{d.title || '—'}</td>
                <td>{toVNDateString(d.workDate)}</td>
                <td><StatusBadge value={d.status} map={careScheduleStatusLabels} prefix="shift" /></td>
                <td>{formatDateTimeVN(d.updatedAt)}</td>
                <td>
                  {d.status === 'draft' ? (
                    <>
                      <button type="button" className="btn btn--sm btn--edit" onClick={() => openDraft(d._id)}>{t(`${NS}.open`)}</button>{' '}
                      <button type="button" className="btn btn--sm btn--primary" onClick={() => publishDraft(d._id)}>{t(`${NS}.publish`)}</button>{' '}
                      <button type="button" className="btn btn--sm btn--delete" onClick={() => deleteDraft(d._id)}>
                        {t(`${NS}.delete`)}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn--sm btn--edit" onClick={() => openPublishedDetail(d._id)}>
                      {t(`${NS}.detail`)}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {paginatedDrafts.length > 0 && (
          <ListPagination
            page={draftPage}
            totalPages={draftTotalPages}
            total={draftTotal}
            onPageChange={setDraftPage}
          />
        )}
        </>
      )}

      {(detailLoading || detailSchedule) && (
        <div className="modal-overlay" onClick={!detailLoading ? () => setDetailSchedule(null) : undefined}>
          <div className="modal modal--scroll" style={{ maxWidth: 980 }} onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{t(`${CS}.detailPublishedTitle`)}</h2>
            {detailLoading && <p className="loading-text">{t(`${CS}.detailLoading`)}</p>}
            {!detailLoading && detailSchedule && (
              <>
                <p style={{ margin: '4px 0 12px', fontSize: '0.85rem', color: '#64748b' }}>
                  {t(`${CS}.detailTitleLabel`)} <strong>{detailSchedule.title || '—'}</strong> · {t(`${CS}.detailDateLabel`)}{' '}
                  <strong>{toVNDateString(detailSchedule.workDate)}</strong>
                </p>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t(`${CS}.colResident`)}</th>
                      <th>{t(`${CS}.colStaff`)}</th>
                      <th>{t(`${CS}.colShift`)}</th>
                      <th>{t(`${CS}.colTaskType`)}</th>
                      <th>{t(`${CS}.colCareLevel`)}</th>
                      <th>{t(`${CS}.colTime`)}</th>
                      <th>{t(`${CS}.colSource`)}</th>
                      <th>{t(`${CS}.colNotes`)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(detailSchedule.entries) && detailSchedule.entries.length > 0 ? (
                      detailSchedule.entries.map((row, idx) => {
                        const residentName = row.residentId?.fullName || row.residentId?.residentCode || '—';
                        const staffName = row.staffProfileId?.userId?.fullName || row.staffProfileId?.staffCode || '—';
                        const shiftName = row.shiftId?.name || '—';
                        const taskLabel = careTaskTypeOptions.find((opt) => opt.value === row.taskType)?.label || row.taskType || '—';
                        const levelLabel = careLevelOptions.find((l) => l.value === row.careLevel)?.label || row.careLevel || '—';
                        return (
                          <tr key={`${detailSchedule._id || 'detail'}-${idx}`}>
                            <td>{residentName}</td>
                            <td>{staffName}</td>
                            <td>{shiftName}</td>
                            <td>{taskLabel}</td>
                            <td>{levelLabel}</td>
                            <td>{row.scheduledTime || '—'}</td>
                            <td>{row.source === 'template' ? t(`${NS}.source.template`) : t(`${NS}.source.manual`)}</td>
                            <td>{row.notes || '—'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={8} className="empty-state">{t(`${CS}.emptyScheduleEntries`)}</td></tr>
                    )}
                  </tbody>
                </table>
                <div className="modal__actions">
                  <button className="btn-cancel" onClick={() => setDetailSchedule(null)}>{t(`${NS}.close`)}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = (t) => [
  { key: 'templates', label: `📋 ${t('admin.staff.shifts.tabTemplates')}` },
  { key: 'assign', label: `👤 ${t('admin.staff.shifts.tabAssign')}` },
  { key: 'schedule', label: `📅 ${t('admin.staff.shifts.tabSchedule')}` },
  ...(SHOW_CARE_SCHEDULE_TAB
    ? [{ key: 'care-schedule', label: `🩺 ${t('admin.staff.shifts.tabCareSchedule')}` }]
    : []),
];

export default function ShiftManagementPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('templates');
  const tabs = TABS(t);
  const activeTab = tabs.some((item) => item.key === tab) ? tab : tabs[0].key;

  return (
    <AdminPageShell
      title={t('admin.staff.shifts.title')}
      subtitle={t('admin.staff.shifts.subtitle')}
    >
      <div className="tabs">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            className={`tab-btn ${activeTab === tabItem.key ? 'tab-btn--active' : ''}`}
            onClick={() => setTab(tabItem.key)}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'assign'    && <AssignTab />}
        {activeTab === 'schedule'  && <ScheduleTab />}
        {SHOW_CARE_SCHEDULE_TAB && activeTab === 'care-schedule' && <CreateCareScheduleTab />}
      </div>
    </AdminPageShell>
  );
}
