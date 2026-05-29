import { useEffect, useState } from 'react';
import shiftService from '../../../../services/shift.service';
import staffService from '../../../../services/staff.service';
import {
  CONFLICT_ICON,
  CONFLICT_LABEL,
  conflictsFromError,
  hasBlockingConflicts,
  sortConflicts,
} from '../../../../constants/shiftConflicts';
import { getLocalDateString, getUtcDateString } from '../../../../utils/dateUtils';
import { canAssignShift } from '../../../../utils/staffAssignable';
import { isStaffOnLeaveForAssignment } from '../../../../utils/leaveUtils';
import { getApiErrorPayload, blockingCareTasksMessage } from '../../../../utils/blockingCareTasks';
import BlockingCareTasksAlert from '../../../../components/staff/BlockingCareTasksAlert';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import '../../../../styles/admin/ShiftManagementPage.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIFT_TYPES = [
  { value: 'morning',   label: 'Ca ngày' },
  { value: 'afternoon', label: 'Ca chiều/tối' },
  { value: 'night',     label: 'Ca đêm/sáng sớm' },
];

const SHIFT_STATUS_LABELS = { draft: 'Nháp', published: 'Đã đăng', confirmed: 'Đã xác nhận', completed: 'Hoàn thành', cancelled: 'Đã hủy' };

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
  if (Array.isArray(body)) return { shifts: body, totalHours: null };
  return {
    shifts: body.data || [],
    totalHours: body.totalHours ?? null,
  };
};

const templateHours = (t) => t?.totalHours ?? t?.durationHours;

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

const buildShiftPayload = (form, { isUpdate = false } = {}) => {
  if (isUpdate) {
    const payload = { changeReason: form.changeReason };
    if (form.shiftTemplateId) payload.shiftTemplateId = form.shiftTemplateId;
    if (form.workDate) payload.workDate = form.workDate;
    if (form.assignedStaffId) payload.assignedStaffId = form.assignedStaffId;
    if (form.taskDescription !== undefined) payload.taskDescription = form.taskDescription;
    if (form.notes !== undefined) payload.notes = form.notes;
    return payload;
  }

  const payload = {
    shiftTemplateId: form.shiftTemplateId,
    workDate: form.workDate,
    assignedStaffId: form.assignedStaffId,
  };
  if (form.taskDescription) payload.taskDescription = form.taskDescription;
  if (form.notes) payload.notes = form.notes;
  return payload;
};

const utcToday = () => getUtcDateString();
const nextWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() + 6);
  return getLocalDateString(d);
};

const emptyShift = { shiftTemplateId: '', workDate: today(), assignedStaffId: '', taskDescription: '', notes: '' };

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
function useConflictPreview(form, { excludeId } = {}) {
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { assignedStaffId, workDate, shiftTemplateId } = form;
    if (!assignedStaffId || !workDate || !shiftTemplateId) {
      setPreview([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await shiftService.checkConflicts({
          assignedStaffId,
          workDate,
          shiftTemplateId,
          excludeId,
        });
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
    excludeId,
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
        3 ca mặc định hệ thống — Ca Đêm/Sáng sớm (00:00–08:00), Ca Ngày (08:00–16:00), Ca Chiều/Tối (16:00–00:00).
        {totalHoursPerDay != null && (
          <> Tổng <strong>{totalHoursPerDay}h</strong>/ngày.</>
        )}
        {' '}Giờ ca được lấy tự động khi phân công.
      </p>

      {error && <p className="form-error">{error}</p>}

      {loading ? <p className="loading-text">Đang tải...</p> : (
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
            {templates.length === 0 && <tr><td colSpan={6} className="empty-row">Chưa có mẫu ca nào</td></tr>}
            {templates.map((t) => (
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
                <td>{t.startTime} – {t.endTime}</td>
                <td>{templateHours(t) != null ? `${templateHours(t)}h` : '—'}</td>
                <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{t.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const { preview, loading: previewLoading } = useConflictPreview(form);
  const set = (k, v) => {
    setConflicts([]);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const selectedTemplate = form.shiftTemplateId
    ? templates.find((x) => x._id === form.shiftTemplateId)
    : null;

  const handleTemplateSelect = (id) => {
    setConflicts([]);
    setForm((p) => ({ ...p, shiftTemplateId: id }));
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
    try {
      const payload = buildShiftPayload(form);
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
                <option key={t._id} value={t._id}>{t.shiftCode} — {t.name} ({t.startTime}–{t.endTime})</option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <div className="form-grid--full" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#0369a1' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: selectedTemplate.colorLabel || '#607D8B', marginRight: 6 }} />
                {selectedTemplate.name} · {selectedTemplate.shiftCode}
              </div>
              <div>🕐 {selectedTemplate.startTime} – {selectedTemplate.endTime} &nbsp;·&nbsp; ⏱ {templateHours(selectedTemplate)}h</div>
              {selectedTemplate.crossesMidnight && (
                <div style={{ marginTop: 4, fontSize: '0.75rem' }}>🌙 Ca qua ngày (kết thúc sáng hôm sau)</div>
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

          {selectedTemplate && (
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
    taskDescription: shift.taskDescription || '',
    notes:           shift.notes || '',
    changeReason:    '',
  });
  const [conflicts, setConflicts] = useState([]);
  const [error, setError] = useState('');
  const { staff, loading: staffLoading } = useAssignableStaffForDate(form.workDate);
  const { preview, loading: previewLoading } = useConflictPreview(form, { excludeId: shift._id });
  const set = (k, v) => {
    setConflicts([]);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const selectedTemplate = form.shiftTemplateId
    ? templates.find((x) => x._id === form.shiftTemplateId)
    : null;

  const handleSave = async () => {
    setError('');
    setConflicts([]);
    if (!form.shiftTemplateId) {
      setError('Vui lòng chọn ca làm việc');
      return;
    }
    if (!form.changeReason.trim()) {
      setError('Bắt buộc nhập lý do thay đổi');
      return;
    }
    try {
      const payload = buildShiftPayload(form, { isUpdate: true });
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
                <option key={t._id} value={t._id}>{t.shiftCode} — {t.name} ({t.startTime}–{t.endTime})</option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <div className="form-grid--full" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#0369a1' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: selectedTemplate.colorLabel || '#607D8B', marginRight: 6 }} />
                {selectedTemplate.name} · {selectedTemplate.shiftCode}
              </div>
              <div>🕐 {selectedTemplate.startTime} – {selectedTemplate.endTime} &nbsp;·&nbsp; ⏱ {templateHours(selectedTemplate)}h</div>
            </div>
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
            <label>Lý do thay đổi *</label>
            <input
              value={form.changeReason}
              onChange={(e) => set('changeReason', e.target.value)}
              placeholder="Bắt buộc nhập lý do..."
              style={{ borderColor: !form.changeReason ? '#fca5a5' : undefined }}
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
        status: filterStatus || undefined,
        fromDate: filterFrom,
        toDate: filterTo,
      });
      const { shifts: list, totalHours } = parseShiftList(res);
      setShifts(list);
      setListTotalHours(totalHours);
    } catch (e) { setError(e.response?.data?.message || 'Tải thất bại'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadTemplates();
  }, []);
  useEffect(() => { load(); }, [filterStatus, filterFrom, filterTo]);

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

  const handleConfirm = async (id) => {
    try {
      await shiftService.confirmShift(id);
      alert('Ca đã xác nhận. Trạng thái sẵn sàng khẩn cấp sẽ cập nhật trong vài giây.');
      load();
    }
    catch (e) { alert(e.response?.data?.message || 'Thất bại'); }
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
  const canConfirm = (s) => s.status === 'published';
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
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Phân công ca</button>
      </div>
      <p style={{ marginBottom: 12, fontSize: '0.8rem', color: '#64748b' }}>
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
                    {canConfirm(s) && <button className="action-btn action-btn--confirm" onClick={() => handleConfirm(s._id)}>Xác nhận</button>}
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

      {showCreate && <CreateShiftModal templates={templates} onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      {editShift && <UpdateShiftModal shift={editShift} templates={templates} onSave={handleUpdate} onClose={() => setEditShift(null)} />}
    </div>
  );
}

// ── Tab 3: Lịch làm việc (Schedule view — 3 cột / 1 ngày) ───────────────────

function ScheduleDayBoard({ date, templates, shifts }) {
  const sortedTemplates = sortTemplatesByStart(templates);

  return (
    <div className="schedule-day">
      <div className="schedule-day__header">{formatScheduleDayHeader(date)}</div>
      <div className="schedule-columns">
        {sortedTemplates.map((template) => {
          const columnShifts = shiftsForTemplate(shifts, template._id);
          const accent = template.colorLabel || '#607D8B';

          return (
            <div
              key={template._id}
              className="schedule-column"
              style={{ borderTopColor: accent }}
            >
              <div className="schedule-column__head">
                <div className="schedule-column__title">{template.name}</div>
                <div className="schedule-column__time">
                  {template.startTime} – {template.endTime}
                  {templateHours(template) != null && (
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
                      </span>
                      <StatusBadge value={s.status} map={SHIFT_STATUS_LABELS} prefix="shift" />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
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

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'templates', label: '📋 Mẫu ca làm việc' },
  { key: 'assign',    label: '👤 Phân công ca' },
  { key: 'schedule',  label: '📅 Lịch làm việc' },
];

export default function ShiftManagementPage() {
  const [tab, setTab] = useState('templates');

  return (
    <AdminPageShell
      title="Quản lý ca làm việc"
      subtitle="3 ca cố định (DAWN · DAY · EVENING) → Phân công → Kiểm tra xung đột → Xem lịch"
    >
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'tab-btn--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'assign'    && <AssignTab />}
        {tab === 'schedule'  && <ScheduleTab />}
      </div>
    </AdminPageShell>
  );
}
