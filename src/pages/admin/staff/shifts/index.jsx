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
  CONFLICT_LABEL,
  conflictsFromError,
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
import BlockingCareTasksAlert from '../../../../components/staff/BlockingCareTasksAlert';
import { useTranslation } from 'react-i18next';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import '../../../../styles/admin/ShiftManagementPage.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIFT_TYPES = [
  { value: 'morning',   label: 'Ca ngày' },
  { value: 'afternoon', label: 'Ca chiều/tối' },
  { value: 'night',     label: 'Ca đêm/sáng sớm' },
  { value: 'custom',    label: 'Ca gãy' },
];

const isFlexibleTemplate = (t) => Boolean(t?.isFlexibleTime || t?.shiftCode === 'SPLIT');

const templateOptionLabel = (t) =>
  isFlexibleTemplate(t)
    ? `${t.shiftCode} — ${t.name} (nhập giờ tùy chỉnh)`
    : `${t.shiftCode} — ${t.name} (${t.startTime}–${t.endTime})`;

const SHIFT_STATUS_LABELS = { draft: 'Nháp', published: 'Đã đăng', confirmed: 'Đã xác nhận', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
const CARE_TASK_TYPES = [
  { value: 'morning_care', label: 'Chăm sóc buổi sáng' },
  { value: 'medication', label: 'Cho thuốc' },
  { value: 'physical_therapy', label: 'Vật lý trị liệu' },
  { value: 'meal_assistance', label: 'Hỗ trợ bữa ăn' },
  { value: 'evening_check', label: 'Kiểm tra buổi tối' },
  { value: 'emergency_response', label: 'Ứng phó khẩn cấp' },
];
const CARE_LEVELS = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
];

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

const formatTemplateTimeDisplay = (t) =>
  isFlexibleTemplate(t) ? 'Nhập giờ khi phân công' : `${t.startTime} – ${t.endTime}`;

const formatTemplateDurationDisplay = (t) => {
  if (isFlexibleTemplate(t)) return 'Theo phân công';
  const hours = templateHours(t);
  return hours != null ? `${hours}h` : '—';
};

const addDays = (dateStr, delta) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return getLocalDateString(d);
};

const formatScheduleDayHeader = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00`);
  const weekday = d.toLocaleDateString('vi-VN', { weekday: 'long' }).toUpperCase();
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
    if (form.taskDescription !== undefined) payload.taskDescription = form.taskDescription;
    if (form.notes !== undefined) payload.notes = form.notes;
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
  if (form.taskDescription) payload.taskDescription = form.taskDescription;
  if (form.notes) payload.notes = form.notes;
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
  taskDescription: '',
  notes: '',
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
      .getAll({ limit: 200, isActive: true, assignmentDate: workDate })
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
  const sorted = sortConflicts(conflicts);
  if (!sorted.length) return null;
  return (
    <div className="conflict-list-wrap">
      {title && <p className="conflict-list__title">{title}</p>}
      <div className="conflict-list">
        {sorted.map((c, i) => (
          <div key={`${c.type}-${i}`} className={`conflict-item conflict-item--${c.severity.toLowerCase()}`}>
            {CONFLICT_ICON[c.severity]} <strong>{CONFLICT_LABEL[c.type] || c.type}</strong>
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { assignedStaffId, workDate, shiftTemplateId, startTime, endTime } = form;
    if (!assignedStaffId || !workDate || !shiftTemplateId) {
      setPreview([]);
      return undefined;
    }

    const template = templates.find((x) => x._id === shiftTemplateId);
    if (isFlexibleTemplate(template) && (!startTime || !endTime)) {
      setPreview([]);
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
      } catch {
        setPreview([]);
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

  return { preview, loading };
}

function StatusBadge({ value, map, prefix }) {
  return <span className={`status-badge status-badge--${prefix}-${value}`}>{map[value] || value}</span>;
}

// ── Tab 1: Mẫu ca làm việc (read-only system shifts) ─────────────────────────

function TemplatesTab() {
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
      setError(e.response?.data?.message || 'Tải thất bại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <p style={{ marginBottom: 12, fontSize: '0.85rem', color: '#64748b' }}>
        4 ca hệ thống — Ca Đêm (00:00–08:00), Ca Ngày (08:00–16:00), Ca Chiều/Tối (16:00–00:00), và Ca gãy (nhập giờ khi phân công).
        {totalHoursPerDay != null && (
          <> Tổng <strong>{totalHoursPerDay}h</strong>/ngày (3 ca cố định).</>
        )}
        {' '}Ca gãy dùng cho phân công đột xuất trong ngày.
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="tab-toolbar" style={{ marginBottom: 12 }}>
        <input
          type="search"
          placeholder="Tìm mã ca hoặc tên ca..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? <p className="loading-text">Đang tải...</p> : (
        <>
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên ca</th>
              <th>Loại</th>
              <th>Giờ</th>
              <th>Thời lượng</th>
              <th>Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTemplates.length === 0 && <tr><td colSpan={6} className="empty-row">Chưa có mẫu ca nào</td></tr>}
            {paginatedTemplates.map((t) => (
              <tr key={t._id}>
                <td>
                  <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                    {t.shiftCode}
                  </span>
                </td>
                <td>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: t.colorLabel || '#607D8B', marginRight: 6 }} />
                  {t.name}
                  {t.crossesMidnight && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#7c3aed' }}>🌙 qua ngày</span>}
                </td>
                <td>{SHIFT_TYPES.find((x) => x.value === t.shiftType)?.label || t.shiftType}</td>
                <td>{formatTemplateTimeDisplay(t)}</td>
                <td>{formatTemplateDurationDisplay(t)}</td>
                <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{t.description || '—'}</td>
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
  const [form, setForm] = useState(emptyShift);
  const { staff, loading: staffLoading } = useAssignableStaffForDate(form.workDate);
  const [conflicts, setConflicts] = useState([]);
  const [error, setError] = useState('');
  const { preview, loading: previewLoading } = useConflictPreview(form, { templates });
  const set = (k, v) => {
    setConflicts([]);
    setForm((p) => ({ ...p, [k]: v }));
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
      setError('Vui lòng chọn ca làm việc');
      return;
    }
    if (!form.assignedStaffId) {
      setError('Vui lòng chọn nhân viên');
      return;
    }
    if (flexible && (!form.startTime || !form.endTime)) {
      setError('Vui lòng nhập giờ bắt đầu và kết thúc cho ca gãy');
      return;
    }
    try {
      const payload = buildShiftPayload(form, { template: selectedTemplate });
      const res = await onSave(payload);
      const c = res.conflicts || [];
      setConflicts(c);
      if (!hasBlockingConflicts(c)) onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Lỗi');
      setConflicts(conflictsFromError(e));
    }
  };

  const displayConflicts = conflicts.length ? conflicts : preview;
  const showPreviewHint = !conflicts.length && preview.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scroll" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Phân công ca làm việc</h2>
        {error && <p className="form-error">{error}</p>}
        {previewLoading && <p className="conflict-preview-hint">Đang kiểm tra xung đột...</p>}
        <ConflictList
          conflicts={displayConflicts}
          title={
            conflicts.length
              ? 'Không thể lưu — cần xử lý lỗi (🔴) trước'
              : showPreviewHint
                ? 'Kiểm tra trước khi lưu'
                : null
          }
        />
        <div className="form-grid">
          <div className="form-group form-grid--full">
            <label>Ca làm việc *</label>
            <select value={form.shiftTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)}>
              <option value="">— Chọn ca —</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>{templateOptionLabel(t)}</option>
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
                <div>Ca đột xuất — nhập khung giờ trong ngày (tối thiểu 1h, tối đa 12h)</div>
              ) : (
                <>
                  <div>🕐 {selectedTemplate.startTime} – {selectedTemplate.endTime} &nbsp;·&nbsp; ⏱ {templateHours(selectedTemplate)}h</div>
                  {selectedTemplate.crossesMidnight && (
                    <div style={{ marginTop: 4, fontSize: '0.75rem' }}>🌙 Ca qua ngày (kết thúc sáng hôm sau)</div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="form-group form-grid--full">
            <label>Nhân viên *</label>
            <select
              value={form.assignedStaffId}
              onChange={(e) => set('assignedStaffId', e.target.value)}
              disabled={staffLoading || staff.length === 0}
            >
              <option value="">— Chọn nhân viên —</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.fullName} ({s.role === 'doctor' ? 'Bác sĩ' : s.role === 'nurse' ? 'Y tá' : s.role})
                  {s.staffProfile?.staffCode ? ` · ${s.staffProfile.staffCode}` : ''}
                </option>
              ))}
            </select>
            {staffLoading && <small className="field-hint">Đang tải nhân viên...</small>}
            {!staffLoading && staff.length === 0 && (
              <small className="field-hint field-hint--warn">
                Không có nhân viên khả dụng trong ngày này (có thể đang nghỉ phép).
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Ngày làm việc *</label>
            <input type="date" min={utcToday()} value={form.workDate} onChange={(e) => set('workDate', e.target.value)} />
            <small className="field-hint">Ngày tính theo UTC (khớp quy tắc PAST_DATE trên server)</small>
          </div>

          {selectedTemplate && flexible && (
            <>
              <div className="form-group">
                <label>Giờ bắt đầu *</label>
                <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Giờ kết thúc *</label>
                <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
              </div>
            </>
          )}

          {selectedTemplate && !flexible && (
            <>
              <div className="form-group">
                <label>Giờ bắt đầu</label>
                <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', color: '#475569' }}>
                  🕐 {selectedTemplate.startTime} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>(từ mẫu)</span>
                </div>
              </div>
              <div className="form-group">
                <label>Giờ kết thúc</label>
                <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', color: '#475569' }}>
                  🕐 {selectedTemplate.endTime} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>(từ mẫu)</span>
                </div>
              </div>
            </>
          )}

          <div className="form-group form-grid--full">
            <label>Mô tả công việc</label>
            <input value={form.taskDescription} onChange={(e) => set('taskDescription', e.target.value)} placeholder="Nhiệm vụ cụ thể..." />
          </div>
          <div className="form-group form-grid--full">
            <label>Ghi chú</label>
            <input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Ghi chú thêm..." />
          </div>
        </div>
        <div className="modal__actions">
          <button className="btn-cancel" onClick={onClose}>Hủy</button>
          <button className="btn-save" onClick={handleSave}>Tạo ca (Draft)</button>
        </div>
      </div>
    </div>
  );
}

function UpdateShiftModal({ shift, templates, onSave, onClose }) {
  const currentStaff = shift.assignedStaffId;
  const currentUserId = currentStaff?.userId?._id || currentStaff?.userId || '';
  const templateId = shift.shiftTemplateId?._id || shift.shiftTemplateId || '';

  const [form, setForm] = useState({
    workDate:        shift.workDate ? shift.workDate.slice(0, 10) : '',
    assignedStaffId: currentUserId?.toString() || '',
    shiftTemplateId: templateId?.toString() || '',
    startTime:       shift.startTime || '08:00',
    endTime:         shift.endTime || '12:00',
    taskDescription: shift.taskDescription || '',
    notes:           shift.notes || '',
    changeReason:    '',
  });
  const [conflicts, setConflicts] = useState([]);
  const [error, setError] = useState('');
  const { staff, loading: staffLoading } = useAssignableStaffForDate(form.workDate);
  const { preview, loading: previewLoading } = useConflictPreview(form, { excludeId: shift._id, templates });
  const set = (k, v) => {
    setConflicts([]);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const selectedTemplate = form.shiftTemplateId
    ? templates.find((x) => x._id === form.shiftTemplateId)
    : null;
  const flexible = isFlexibleTemplate(selectedTemplate);

  const handleSave = async () => {
    setError('');
    setConflicts([]);
    if (!form.shiftTemplateId) {
      setError('Vui lòng chọn ca làm việc');
      return;
    }
    if (flexible && (!form.startTime || !form.endTime)) {
      setError('Vui lòng nhập giờ bắt đầu và kết thúc cho ca gãy');
      return;
    }
    try {
      const payload = buildShiftPayload(form, { isUpdate: true, template: selectedTemplate });
      const res = await onSave(shift._id, payload);
      const c = res.conflicts || [];
      setConflicts(c);
      if (!hasBlockingConflicts(c)) onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Lỗi');
      setConflicts(conflictsFromError(e));
    }
  };

  const displayConflicts = conflicts.length ? conflicts : preview;
  const showPreviewHint = !conflicts.length && preview.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scroll" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Cập nhật ca làm việc</h2>
        {error && <p className="form-error">{error}</p>}
        {previewLoading && <p className="conflict-preview-hint">Đang kiểm tra xung đột...</p>}
        <ConflictList
          conflicts={displayConflicts}
          title={
            conflicts.length
              ? 'Không thể lưu — cần xử lý lỗi (🔴) trước'
              : showPreviewHint
                ? 'Kiểm tra trước khi lưu'
                : null
          }
        />
        <div className="form-grid">
          <div className="form-group form-grid--full">
            <label>Ca làm việc *</label>
            <select value={form.shiftTemplateId} onChange={(e) => set('shiftTemplateId', e.target.value)}>
              <option value="">— Chọn ca —</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>{templateOptionLabel(t)}</option>
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
                <div>Ca đột xuất — chỉnh khung giờ trong ngày</div>
              ) : (
                <div>🕐 {selectedTemplate.startTime} – {selectedTemplate.endTime} &nbsp;·&nbsp; ⏱ {templateHours(selectedTemplate)}h</div>
              )}
            </div>
          )}

          {flexible && (
            <>
              <div className="form-group">
                <label>Giờ bắt đầu *</label>
                <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Giờ kết thúc *</label>
                <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
              </div>
            </>
          )}

          <div className="form-group form-grid--full">
            <label>Nhân viên</label>
            <select
              value={form.assignedStaffId}
              onChange={(e) => set('assignedStaffId', e.target.value)}
              disabled={staffLoading}
            >
              <option value="">— Giữ nguyên —</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.fullName} ({s.role === 'doctor' ? 'Bác sĩ' : s.role === 'nurse' ? 'Y tá' : s.role})
                  {s.staffProfile?.staffCode ? ` · ${s.staffProfile.staffCode}` : ''}
                </option>
              ))}
            </select>
            {!staffLoading && staff.length === 0 && (
              <small className="field-hint field-hint--warn">
                Không có nhân viên khả dụng trong ngày này (có thể đang nghỉ phép).
              </small>
            )}
          </div>
          <div className="form-group">
            <label>Ngày làm việc</label>
            <input type="date" min={utcToday()} value={form.workDate} onChange={(e) => set('workDate', e.target.value)} />
          </div>
          <div className="form-group form-grid--full">
            <label>Mô tả công việc</label>
            <input value={form.taskDescription} onChange={(e) => set('taskDescription', e.target.value)} />
          </div>
          <div className="form-group form-grid--full">
            <label>Ghi chú</label>
            <input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <div className="form-group form-grid--full">
            <label>Lý do thay đổi</label>
            <input
              value={form.changeReason}
              onChange={(e) => set('changeReason', e.target.value)}
              placeholder="Tùy chọn — ghi chú lý do nếu cần"
            />
          </div>
        </div>
        <div className="modal__actions">
          <button className="btn-cancel" onClick={onClose}>Hủy</button>
          <button className="btn-save" onClick={handleSave}>Lưu thay đổi</button>
        </div>
      </div>
    </div>
  );
}

function AssignTab() {
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
    } catch (e) { setError(e.response?.data?.message || 'Tải thất bại'); }
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
      const msg = e.response?.data?.message || 'Đăng ca thất bại';
      if (hasBlockingConflicts(c)) {
        alert(`${msg}\n\nCó ${c.filter((x) => x.severity === 'ERROR').length} lỗi chặn đăng ca — xem chi tiết bên dưới.`);
      } else {
        alert(msg);
      }
    }
  };

  const handleCancel = async (s) => {
    const reason = prompt('Lý do hủy ca:');
    if (reason === null) return;
    setBlockingTasks([]);
    try {
      await shiftService.cancelShift(s._id, reason);
      load();
    } catch (e) {
      const { message, blockingTasks: blocked } = getApiErrorPayload(e, 'Hủy ca thất bại');
      if (blocked.length) {
        setBlockingTasks(blocked);
        setError(blockingCareTasksMessage(message));
      } else {
        alert(message);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa ca nháp này?')) return;
    setBlockingTasks([]);
    try {
      await shiftService.deleteShift(id);
      load();
    } catch (e) {
      const { message, blockingTasks: blocked } = getApiErrorPayload(e, 'Xóa ca thất bại');
      if (blocked.length) {
        setBlockingTasks(blocked);
        setError(blockingCareTasksMessage(message));
      } else {
        alert(message);
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
          <option value="">Tất cả trạng thái</option>
          {Object.entries(SHIFT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input
          type="search"
          placeholder="Tìm tên ca hoặc nhân viên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Phân công ca</button>
      </div>
      <p style={{ marginBottom: 12, fontSize: '0.8rem', color: '#64748b' }}>
        Sau khi <strong>Đăng ca</strong>, nhân viên tự xác nhận trong portal <strong>Ca của tôi</strong>.
        Ca <strong>Đã đăng</strong> chưa xác nhận trong 30 phút sau giờ bắt đầu sẽ tự động hủy.
        Chỉ ca <strong>Đã xác nhận</strong> mới được tính vào trang Sẵn sàng khẩn cấp.
        Phân công tầng/phòng cho nhân viên ở tab <strong>Phân công khu vực</strong>.
        {listTotalHours != null && shifts.length > 0 && (
          <> Tổng giờ trong khoảng lọc: <strong>{listTotalHours}h</strong>.</>
        )}
      </p>

      {error && !blockingTasks.length && <p className="form-error">{error}</p>}
      {blockingTasks.length > 0 && (
        <BlockingCareTasksAlert
          message={error}
          tasks={blockingTasks}
          hint="Hoàn thành, bỏ qua hoặc xóa các nhiệm vụ ở trang Phân công nhân viên → Nhiệm vụ chăm sóc, rồi thử hủy/xóa ca lại."
        />
      )}
      {actionConflicts.length > 0 && (
        <ConflictList
          conflicts={actionConflicts}
          title="Kết quả kiểm tra xung đột (đăng / cập nhật ca)"
        />
      )}

      {loading ? <p className="loading-text">Đang tải...</p> : (
        <table className="data-table">
          <thead><tr><th>Tên ca</th><th>Nhân viên</th><th>Ngày</th><th>Giờ</th><th>Thời lượng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {shifts.length === 0 && <tr><td colSpan={7} className="empty-row">Không có ca nào trong khoảng thời gian này</td></tr>}
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
                  <td>{new Date(s.workDate).toLocaleDateString('vi-VN')}</td>
                  <td>{s.startTime} – {s.endTime}</td>
                  <td>{hours != null ? `${hours}h` : '—'}</td>
                  <td><StatusBadge value={s.status} map={SHIFT_STATUS_LABELS} prefix="shift" /></td>
                  <td className="action-cell">
                    {canPublish(s) && <button className="action-btn action-btn--publish" onClick={() => handlePublish(s._id)}>Đăng</button>}
                    {canEdit(s)    && <button className="action-btn action-btn--edit"    onClick={() => setEditShift(s)}>Sửa</button>}
                    {canCancel(s)  && <button className="action-btn action-btn--warning" onClick={() => handleCancel(s)}>Hủy</button>}
                    {canDelete(s)  && <button className="action-btn action-btn--danger"  onClick={() => handleDelete(s._id)}>Xóa</button>}
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

function ScheduleColumn({ template, shifts }) {
  const columnShifts = shiftsForTemplate(shifts, template._id);
  const accent = template.colorLabel || '#607D8B';
  const flexible = isFlexibleTemplate(template);

  return (
    <div className="schedule-column" style={{ borderTopColor: accent }}>
      <div className="schedule-column__head">
        <div className="schedule-column__title">{template.name}</div>
        <div className="schedule-column__time">
          {flexible
            ? 'Nhập giờ khi phân công'
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
            <span className="schedule-column__row-name">Chưa phân công</span>
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
              <StatusBadge value={s.status} map={SHIFT_STATUS_LABELS} prefix="shift" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ScheduleDayBoard({ date, templates, shifts }) {
  const sortedTemplates = sortTemplatesByStart(templates);
  const standardTemplates = sortedTemplates.filter((t) => !isFlexibleTemplate(t));
  const splitTemplates = sortedTemplates.filter((t) => isFlexibleTemplate(t));

  return (
    <div className="schedule-day">
      <div className="schedule-day__header">{formatScheduleDayHeader(date)}</div>
      <div className="schedule-columns">
        {standardTemplates.map((template) => (
          <ScheduleColumn key={template._id} template={template} shifts={shifts} />
        ))}
      </div>
      {splitTemplates.length > 0 && (
        <div className="schedule-split-section">
          {splitTemplates.map((template) => (
            <ScheduleColumn key={template._id} template={template} shifts={shifts} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleTab() {
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
      setError(e.response?.data?.message || 'Tải thất bại');
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
          ← Hôm qua
        </button>
        <button type="button" className="btn-secondary" onClick={() => setSelectedDate(today())}>
          Hôm nay
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          aria-label="Chọn ngày"
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
        >
          Ngày mai →
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="loading-text">Đang tải...</p>}

      {!loading && scheduleTotalHours != null && (
        <p className="schedule-summary">
          Tổng giờ ca trong ngày: <strong>{scheduleTotalHours}h</strong>
        </p>
      )}

      {!loading && templates.length > 0 && (
        <ScheduleDayBoard date={selectedDate} templates={templates} shifts={shifts} />
      )}

      {!loading && templates.length === 0 && !error && (
        <p className="loading-text">Không tải được mẫu ca hệ thống</p>
      )}
    </div>
  );
}

function CreateCareScheduleTab() {
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
      setError('Vui lòng chọn mẫu lịch.');
      return;
    }
    if (selectedResidents.length < 1) {
      setError('Vui lòng chọn ít nhất 1 cư dân.');
      return;
    }
    if (!commonStaffProfileId || !commonShiftId) {
      setError('Vui lòng chọn nhân viên và ca áp dụng.');
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
      setError('Vui lòng chọn ít nhất 1 cư dân trước khi thêm đầu việc.');
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
    if (workDate < todayVN()) return 'Không thể tạo lịch cho ngày trong quá khứ.';
    if (selectedResidents.length < 1) return 'Vui lòng chọn tối thiểu 1 cư dân.';
    if (!entries.length) return 'Vui lòng thêm ít nhất một đầu việc.';
    const invalid = entries.find(
      (e) =>
        !e.residentId ||
        !e.staffProfileId ||
        !e.shiftId ||
        !e.taskType ||
        !e.careLevel ||
        !e.scheduledTime
    );
    if (invalid) return 'Mỗi đầu việc phải có cư dân, nhân viên, ca, loại việc, mức độ và giờ.';
    const invalidResident = entries.find((e) => {
      if (!e.residentId || !e.staffProfileId) return false;
      return !residentsForRow(e.staffProfileId).some((r) => String(r._id) === String(e.residentId));
    });
    if (invalidResident) {
      return 'Mỗi đầu việc phải dùng cư dân đã tick phía trên và thuộc nhân viên của hàng.';
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
      setError(e?.response?.data?.message || 'Lưu draft thất bại');
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
      setError(e?.response?.data?.message || 'Không mở được draft');
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
      setError(e?.response?.data?.message || 'Publish thất bại');
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản nháp này?')) return;
    setSaving(true);
    setError('');
    try {
      await careScheduleService.deleteDraft(id);
      if (editingScheduleId === id) resetForm();
      loadDrafts();
    } catch (e) {
      setError(e?.response?.data?.message || 'Xóa draft thất bại');
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
      setError(e?.response?.data?.message || 'Không tải được chi tiết lịch');
      setDetailSchedule(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div>
      <p style={{ marginBottom: 12, fontSize: '0.85rem', color: '#64748b' }}>
        Tạo lịch chăm sóc theo ngày cho nhiều cư dân, hỗ trợ mẫu + chỉnh tay. Lưu ở trạng thái nháp, sau đó Publish để sinh nhiệm vụ chăm sóc.
      </p>
      {error && <p className="form-error">{error}</p>}

      <div className="form-grid">
        <div className="form-group">
          <label>Ngày chăm sóc *</label>
          <input type="date" min={todayVN()} value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Tiêu đề</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Lịch chăm sóc khối A" />
        </div>
        <div className="form-group">
          <label>Nhân viên phụ trách chung</label>
          <select
            value={commonStaffProfileId}
            onChange={(e) => {
              setCommonStaffProfileId(e.target.value);
              setCommonShiftId('');
              setSelectedResidents([]);
              setEntries((prev) => prev.map((row) => ({ ...row, residentId: '', shiftId: '' })));
            }}
          >
            <option value="">— Chọn nhân viên —</option>
            {staffOptions.map((s) => (
              <option key={s.staffProfile?._id || s._id} value={s.staffProfile?._id || ''}>
                {s.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Ca áp dụng chung</label>
          <select value={commonShiftId} onChange={(e) => setCommonShiftId(e.target.value)}>
            <option value="">— Chọn ca —</option>
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
          Cư dân áp dụng (chọn nhiều) *
        </label>
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#64748b' }}>
          Chỉ các cư dân đã tick mới xuất hiện trong bảng đầu việc bên dưới. Bỏ tick sẽ xóa các hàng tương ứng.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, maxHeight: 160, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}>
          {!commonStaffProfileId && (
            <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Chọn nhân viên phụ trách để xem cư dân được phân.
            </p>
          )}
          {commonStaffProfileId && !residents.length && (
            <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Nhân viên chưa được phân cư dân.
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
          <option value="">— Chọn mẫu lịch —</option>
          {templates.map((t) => (
            <option key={t.key} value={t.key}>{t.name}</option>
          ))}
        </select>
        <button type="button" className="btn-primary" onClick={addEntriesFromTemplate}>
          + Thêm từ mẫu
        </button>
        <button type="button" className="btn-secondary" onClick={addManualRow}>
          + Thêm thủ công
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Cư dân</th>
            <th>Nhân viên</th>
            <th>Ca</th>
            <th>Loại việc</th>
            <th>Mức độ</th>
            <th>Giờ</th>
            <th>Nguồn</th>
            <th>Ghi chú</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr><td colSpan={9} className="empty-state">Chưa có đầu việc</td></tr>
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
                  {CARE_TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </td>
              <td>
                <select value={row.careLevel} onChange={(e) => patchEntry(idx, { careLevel: e.target.value })}>
                  {CARE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </td>
              <td><input type="time" value={row.scheduledTime} onChange={(e) => patchEntry(idx, { scheduledTime: e.target.value })} /></td>
              <td>{row.source === 'template' ? 'Mẫu' : 'Thủ công'}</td>
              <td><input value={row.notes || ''} onChange={(e) => patchEntry(idx, { notes: e.target.value })} /></td>
              <td><button type="button" className="btn btn--sm btn--delete" onClick={() => removeEntry(idx)}>Xóa</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="tab-toolbar">
        <button type="button" className="btn-primary" disabled={saving} onClick={submitDraft}>
          {saving ? 'Đang lưu...' : editingScheduleId ? 'Cập nhật Draft' : 'Lưu Draft'}
        </button>
        <button type="button" className="btn-secondary" onClick={resetForm}>Làm mới</button>
      </div>

      <h4 style={{ marginTop: 20 }}>Lịch trong ngày</h4>
      <div className="tab-toolbar" style={{ marginBottom: 8 }}>
        <input
          type="search"
          placeholder="Tìm tiêu đề hoặc ngày..."
          value={draftSearch}
          onChange={(e) => setDraftSearch(e.target.value)}
        />
      </div>
      {loading ? <p className="loading-text">Đang tải...</p> : (
        <>
        <table className="data-table">
          <thead>
            <tr><th>Tiêu đề</th><th>Ngày</th><th>Trạng thái</th><th>Cập nhật</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            {paginatedDrafts.length === 0 && <tr><td colSpan={5} className="empty-state">Không có lịch</td></tr>}
            {paginatedDrafts.map((d) => (
              <tr key={d._id}>
                <td>{d.title || '—'}</td>
                <td>{toVNDateString(d.workDate)}</td>
                <td><StatusBadge value={d.status} map={{ draft: 'Nháp', published: 'Đã đăng' }} prefix="shift" /></td>
                <td>{formatDateTimeVN(d.updatedAt)}</td>
                <td>
                  {d.status === 'draft' ? (
                    <>
                      <button type="button" className="btn btn--sm btn--edit" onClick={() => openDraft(d._id)}>Mở</button>{' '}
                      <button type="button" className="btn btn--sm btn--primary" onClick={() => publishDraft(d._id)}>Publish</button>{' '}
                      <button type="button" className="btn btn--sm btn--delete" onClick={() => deleteDraft(d._id)}>
                        Xóa
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn--sm btn--edit" onClick={() => openPublishedDetail(d._id)}>
                      Chi tiết
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
            <h2 className="modal__title">Chi tiết lịch đã publish</h2>
            {detailLoading && <p className="loading-text">Đang tải chi tiết...</p>}
            {!detailLoading && detailSchedule && (
              <>
                <p style={{ margin: '4px 0 12px', fontSize: '0.85rem', color: '#64748b' }}>
                  Tiêu đề: <strong>{detailSchedule.title || '—'}</strong> · Ngày:{' '}
                  <strong>{toVNDateString(detailSchedule.workDate)}</strong>
                </p>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cư dân</th>
                      <th>Nhân viên</th>
                      <th>Ca</th>
                      <th>Loại việc</th>
                      <th>Mức độ</th>
                      <th>Giờ</th>
                      <th>Nguồn</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(detailSchedule.entries) && detailSchedule.entries.length > 0 ? (
                      detailSchedule.entries.map((row, idx) => {
                        const residentName = row.residentId?.fullName || row.residentId?.residentCode || '—';
                        const staffName = row.staffProfileId?.userId?.fullName || row.staffProfileId?.staffCode || '—';
                        const shiftName = row.shiftId?.name || '—';
                        const taskLabel = CARE_TASK_TYPES.find((t) => t.value === row.taskType)?.label || row.taskType || '—';
                        const levelLabel = CARE_LEVELS.find((l) => l.value === row.careLevel)?.label || row.careLevel || '—';
                        return (
                          <tr key={`${detailSchedule._id || 'detail'}-${idx}`}>
                            <td>{residentName}</td>
                            <td>{staffName}</td>
                            <td>{shiftName}</td>
                            <td>{taskLabel}</td>
                            <td>{levelLabel}</td>
                            <td>{row.scheduledTime || '—'}</td>
                            <td>{row.source === 'template' ? 'Mẫu' : 'Thủ công'}</td>
                            <td>{row.notes || '—'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={8} className="empty-state">Lịch chưa có đầu việc</td></tr>
                    )}
                  </tbody>
                </table>
                <div className="modal__actions">
                  <button className="btn-cancel" onClick={() => setDetailSchedule(null)}>Đóng</button>
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
  { key: 'care-schedule', label: `🩺 ${t('admin.staff.shifts.tabCareSchedule')}` },
];

export default function ShiftManagementPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('templates');
  const tabs = TABS(t);

  return (
    <AdminPageShell
      title={t('admin.staff.shifts.title')}
      subtitle={t('admin.staff.shifts.subtitle')}
    >
      <div className="tabs">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            className={`tab-btn ${tab === tabItem.key ? 'tab-btn--active' : ''}`}
            onClick={() => setTab(tabItem.key)}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'assign'    && <AssignTab />}
        {tab === 'schedule'  && <ScheduleTab />}
        {tab === 'care-schedule' && <CreateCareScheduleTab />}
      </div>
    </AdminPageShell>
  );
}
