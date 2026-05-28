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
import '../../../../styles/admin/ShiftManagementPage.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIFT_TYPES = [
  { value: 'morning',   label: 'Ca sáng' },
  { value: 'afternoon', label: 'Ca chiều' },
  { value: 'night',     label: 'Ca đêm' },
  { value: 'on_call',   label: 'Ca trực' },
];

const TEMPLATE_STATUS_LABELS = { active: 'Hoạt động', inactive: 'Tạm dừng' };
const SHIFT_STATUS_LABELS    = { draft: 'Nháp', published: 'Đã đăng', confirmed: 'Đã xác nhận', completed: 'Hoàn thành', cancelled: 'Đã hủy' };


const today = () => getLocalDateString();

const buildShiftPayload = (form) => {
  const { floorId: _f, roomId: _r, ...rest } = form;
  return rest;
};
const utcToday = () => getUtcDateString();
const nextWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() + 6);
  return getLocalDateString(d);
};

const emptyTemplate = { name: '', shiftCode: '', shiftType: 'morning', startTime: '07:00', endTime: '15:00', colorLabel: '#607D8B', minStaff: 1, description: '' };
const emptyShift    = { name: '', startTime: '', endTime: '', workDate: today(), assignedStaffId: '', shiftTemplateId: '', taskDescription: '', notes: '' };

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
    const { assignedStaffId, workDate, startTime, endTime, shiftTemplateId } = form;
    if (!assignedStaffId || !workDate || !startTime || !endTime) {
      setPreview([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await shiftService.checkConflicts({
          assignedStaffId,
          workDate,
          startTime,
          endTime,
          excludeId,
          shiftTemplateId: shiftTemplateId || undefined,
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
    form.startTime,
    form.endTime,
    form.shiftTemplateId,
    excludeId,
  ]);

  return { preview, loading };
}

function StatusBadge({ value, map, prefix }) {
  return <span className={`status-badge status-badge--${prefix}-${value}`}>{map[value] || value}</span>;
}

// ── Tab 1: Mẫu ca làm việc (Templates) ───────────────────────────────────────

function TemplateFormModal({ initial, onSave, onClose }) {
  // Merge with emptyTemplate so fields missing from old DB records get defaults
  const [form, setForm] = useState({ ...emptyTemplate, ...(initial || {}) });
  const [error, setError] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Lỗi');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{initial ? 'Sửa mẫu ca' : 'Tạo mẫu ca mới'}</h2>
        {error && <p className="form-error">{error}</p>}
        <div className="form-grid">
          <div className="form-group form-grid--full">
            <label>Tên ca *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ca Sáng A" />
          </div>
          <div className="form-group">
            <label>Mã ca (shiftCode) *</label>
            <input value={form.shiftCode} onChange={(e) => set('shiftCode', e.target.value.toUpperCase())} placeholder="S1" />
          </div>
          <div className="form-group">
            <label>Loại ca *</label>
            <select value={form.shiftType} onChange={(e) => set('shiftType', e.target.value)}>
              {SHIFT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Giờ bắt đầu *</label>
            <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Giờ kết thúc *</label>
            <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Màu hiển thị</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.colorLabel} onChange={(e) => set('colorLabel', e.target.value)} style={{ width: 40, height: 34, padding: 2, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }} />
              <input value={form.colorLabel} onChange={(e) => set('colorLabel', e.target.value)} style={{ flex: 1 }} />
            </div>
          </div>
          <div className="form-group">
            <label>Nhân viên tối thiểu/ca</label>
            <input type="number" min={1} value={form.minStaff} onChange={(e) => set('minStaff', +e.target.value)} />
          </div>
          <div className="form-group form-grid--full">
            <label>Mô tả</label>
            <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Mô tả ngắn gọn về ca..." />
          </div>
        </div>
        <div className="modal__actions">
          <button className="btn-cancel" onClick={onClose}>Hủy</button>
          <button className="btn-save" onClick={handleSave}>Lưu</button>
        </div>
      </div>
    </div>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await shiftService.getTemplates(filterStatus ? { status: filterStatus } : {});
      const raw = res.data || res;
      setTemplates(Array.isArray(raw) ? raw : (raw.data || []));
    } catch (e) { setError(e.response?.data?.message || 'Tải thất bại'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus]);

  const handleCreate = async (form) => {
    await shiftService.createTemplate(form);
    load();
  };

  const handleUpdate = async (form) => {
    const res = await shiftService.updateTemplate(editTarget._id, form);
    if (res.warning) alert(`⚠️ ${res.warning}`);
    load();
  };

  const handleToggleStatus = async (t) => {
    const next = t.status === 'active' ? 'inactive' : 'active';
    try { await shiftService.updateTemplateStatus(t._id, next); load(); }
    catch (e) { alert(e.response?.data?.message || 'Thất bại'); }
  };

  const handleDelete = async (t) => {
    if (!confirm(`Xóa mẫu ca "${t.name}"?`)) return;
    try { await shiftService.deleteTemplate(t._id); load(); }
    catch (e) { alert(e.response?.data?.message || 'Thất bại'); }
  };

  return (
    <div>
      <div className="tab-toolbar">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(TEMPLATE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Tạo mẫu ca</button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? <p className="loading-text">Đang tải...</p> : (
        <table className="data-table">
          <thead><tr><th>Mã</th><th>Tên ca</th><th>Loại</th><th>Giờ</th><th>Thời lượng</th><th>Min NV</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {templates.length === 0 && <tr><td colSpan={8} className="empty-row">Chưa có mẫu ca nào</td></tr>}
            {templates.map((t) => (
              <tr key={t._id}>
                <td><span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{t.shiftCode}</span></td>
                <td>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: t.colorLabel || '#607D8B', marginRight: 6 }} />
                  {t.name}
                  {t.crossesMidnight && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#7c3aed' }}>🌙 qua ngày</span>}
                </td>
                <td>{SHIFT_TYPES.find((x) => x.value === t.shiftType)?.label || t.shiftType}</td>
                <td>{t.startTime} – {t.endTime}</td>
                <td>{t.durationHours != null ? `${t.durationHours}h` : '—'}</td>
                <td>{t.minStaff}</td>
                <td><StatusBadge value={t.status} map={TEMPLATE_STATUS_LABELS} prefix="tpl" /></td>
                <td className="action-cell">
                  <button className="action-btn action-btn--edit" onClick={() => setEditTarget(t)}>Sửa</button>
                  <button className="action-btn action-btn--secondary" onClick={() => handleToggleStatus(t)}>
                    {t.status === 'active' ? 'Tắt' : 'Bật'}
                  </button>
                  <button className="action-btn action-btn--danger" onClick={() => handleDelete(t)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && <TemplateFormModal onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      {editTarget && (
        <TemplateFormModal
          initial={editTarget}
          onSave={handleUpdate}
          onClose={() => setEditTarget(null)}
        />
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
  const [overrideTime, setOverrideTime] = useState(false);
  const { preview, loading: previewLoading } = useConflictPreview(form);
  const set = (k, v) => {
    setConflicts([]);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const selectedTemplate = form.shiftTemplateId
    ? templates.find((x) => x._id === form.shiftTemplateId)
    : null;

  const handleTemplateSelect = (id) => {
    const t = templates.find((x) => x._id === id);
    setOverrideTime(false);
    setConflicts([]);
    if (t) setForm((p) => ({ ...p, shiftTemplateId: id, name: t.name, startTime: t.startTime, endTime: t.endTime }));
    else setForm((p) => ({ ...p, shiftTemplateId: '', startTime: '', endTime: '', name: '' }));
  };

  const handleSave = async () => {
    setError('');
    setConflicts([]);
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
          {/* Template selector */}
          <div className="form-group form-grid--full">
            <label>Mẫu ca</label>
            <select value={form.shiftTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)}>
              <option value="">— Ca tự do (nhập thủ công) —</option>
              {templates.filter((t) => t.status === 'active').map((t) => (
                <option key={t._id} value={t._id}>{t.shiftCode} — {t.name} ({t.startTime}–{t.endTime})</option>
              ))}
            </select>
          </div>

          {/* Template info card */}
          {selectedTemplate && (
            <div className="form-grid--full" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#0369a1' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: selectedTemplate.colorLabel || '#607D8B', marginRight: 6 }} />
                {selectedTemplate.name} · {selectedTemplate.shiftCode}
              </div>
              <div>🕐 {selectedTemplate.startTime} – {selectedTemplate.endTime} &nbsp;·&nbsp; ⏱ {selectedTemplate.durationHours}h &nbsp;·&nbsp; 👥 min {selectedTemplate.minStaff} NV</div>
              <div style={{ marginTop: 6 }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', textDecoration: 'underline', fontSize: '0.78rem', padding: 0 }}
                  onClick={() => setOverrideTime((v) => !v)}
                >
                  {overrideTime ? '↩ Dùng giờ từ mẫu' : '✏️ Ghi đè giờ cho ca này'}
                </button>
              </div>
            </div>
          )}

          {/* Tên ca */}
          <div className="form-group form-grid--full">
            <label>Tên ca *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ca sáng A1..." />
          </div>

          {/* Staff */}
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

          {/* Time: shown as read-only when template selected and not overriding */}
          {(!selectedTemplate || overrideTime) ? (
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
          ) : (
            <>
              <div className="form-group">
                <label>Giờ bắt đầu</label>
                <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', color: '#475569' }}>
                  🕐 {form.startTime} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>(từ mẫu)</span>
                </div>
              </div>
              <div className="form-group">
                <label>Giờ kết thúc</label>
                <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', color: '#475569' }}>
                  🕐 {form.endTime} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>(từ mẫu)</span>
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

function UpdateShiftModal({ shift, onSave, onClose }) {
  const currentStaff = shift.assignedStaffId;
  const currentUserId = currentStaff?.userId?._id || currentStaff?.userId || '';
  const templateId = shift.shiftTemplateId?._id || shift.shiftTemplateId || '';

  const [form, setForm] = useState({
    name:            shift.name || '',
    startTime:       shift.startTime || '',
    endTime:         shift.endTime || '',
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

  const handleSave = async () => {
    setError('');
    setConflicts([]);
    if (!form.changeReason.trim()) { setError('Bắt buộc nhập lý do thay đổi'); return; }
    try {
      const payload = buildShiftPayload(form);
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
            <label>Tên ca</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
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
          <div className="form-group">
            <label>Giờ bắt đầu</label>
            <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Giờ kết thúc</label>
            <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
          </div>
          <div className="form-group form-grid--full">
            <label>Mô tả công việc</label>
            <input value={form.taskDescription} onChange={(e) => set('taskDescription', e.target.value)} />
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
  const [templates, setTemplates]         = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterFrom, setFilterFrom]       = useState(today());
  const [filterTo, setFilterTo]           = useState(nextWeek());
  const [showCreate, setShowCreate]       = useState(false);
  const [editShift, setEditShift]         = useState(null);
  const [actionConflicts, setActConflicts] = useState([]);

  const loadTemplates = async () => {
      const res = await shiftService.getTemplates();
      const raw = res.data || res;
      setTemplates(Array.isArray(raw) ? raw : (raw.data || []));
  };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await shiftService.listShifts({
        status: filterStatus || undefined,
        fromDate: filterFrom,
        toDate: filterTo,
      });
      // Backend returns { data: [], total, page } — extract the array
      const raw = res.data || res;
      setShifts(Array.isArray(raw) ? raw : (raw.data || []));
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
    try { await shiftService.cancelShift(s._id, reason); load(); }
    catch (e) { alert(e.response?.data?.message || 'Thất bại'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa ca nháp này?')) return;
    try { await shiftService.deleteShift(id); load(); }
    catch (e) { alert(e.response?.data?.message || 'Thất bại'); }
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
  const canCancel  = (s) => !['completed', 'cancelled'].includes(s.status);
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
      </p>

      {error && <p className="form-error">{error}</p>}
      {actionConflicts.length > 0 && (
        <ConflictList
          conflicts={actionConflicts}
          title="Kết quả kiểm tra xung đột (đăng / cập nhật ca)"
        />
      )}

      {loading ? <p className="loading-text">Đang tải...</p> : (
        <table className="data-table">
          <thead><tr><th>Tên ca</th><th>Nhân viên</th><th>Ngày</th><th>Giờ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {shifts.length === 0 && <tr><td colSpan={6} className="empty-row">Không có ca nào trong khoảng thời gian này</td></tr>}
            {shifts.map((s) => {
              const staffObj  = s.assignedStaffId;
              const staffName = staffObj?.userId?.fullName || staffObj?.staffCode || '—';
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
      {editShift && <UpdateShiftModal shift={editShift} onSave={handleUpdate} onClose={() => setEditShift(null)} />}
    </div>
  );
}

// ── Tab 3: Lịch làm việc (Schedule view) ─────────────────────────────────────

function ScheduleTab() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(nextWeek());

  const load = async () => {
    if (!fromDate || !toDate) return;
    setLoading(true); setError('');
    try {
      const res = await shiftService.getSchedule(fromDate, toDate);
      const raw = res.data || res;
      setShifts(Array.isArray(raw) ? raw : (raw.data || []));
    } catch (e) { setError(e.response?.data?.message || 'Tải thất bại'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [fromDate, toDate]);

  // Group by workDate
  const grouped = shifts.reduce((acc, s) => {
    const d = s.workDate?.slice(0, 10) || '?';
    if (!acc[d]) acc[d] = [];
    acc[d].push(s);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div>
      <div className="tab-toolbar">
        <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Từ</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Đến</label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button className="btn-secondary" onClick={load}>Xem lịch</button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="loading-text">Đang tải...</p>}

      {!loading && sortedDates.length === 0 && (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Không có ca nào trong khoảng thời gian này</p>
      )}

      {sortedDates.map((date) => (
        <div key={date} className="schedule-day">
          <div className="schedule-day__header">
            {new Date(date + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}
            <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#94a3b8' }}>{grouped[date].length} ca</span>
          </div>
          <div className="schedule-day__grid">
            {grouped[date].map((s) => {
              const staff = s.assignedStaffId;
              const staffName = staff?.userId?.fullName || staff?.staffCode || '—';
              const color = s.shiftTemplateId?.colorLabel || '#607D8B';
              return (
                <div key={s._id} className="schedule-card" style={{ borderLeftColor: color }}>
                  <div className="schedule-card__name">{s.name}</div>
                  <div className="schedule-card__time">{s.startTime} – {s.endTime}</div>
                  <div className="schedule-card__staff">{staffName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <StatusBadge value={s.status} map={SHIFT_STATUS_LABELS} prefix="shift" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
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
    <div className="shift-page">
      <div className="shift-page__header">
        <h1 className="shift-page__title">Quản lý ca làm việc</h1>
        <p className="shift-page__subtitle">Tạo mẫu ca → Phân công → Kiểm tra xung đột → Xem lịch</p>
      </div>

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
    </div>
  );
}
