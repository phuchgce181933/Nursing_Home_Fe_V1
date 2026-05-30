import { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Search, Eye, Pencil, Trash2, History, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import careNoteService from '../../services/careNote.service';
import medicationService from '../../services/medication.service';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/shared/CareNotesPage.css';

/* ─── Constants ─────────────────────────────── */

const NOTE_TYPE_LABELS = {
  meal: 'Bữa ăn',
  activity: 'Hoạt động',
  health: 'Sức khỏe',
  general: 'Chung',
};

const MEAL_TYPES     = [{ value: 'breakfast', label: 'Sáng' }, { value: 'lunch', label: 'Trưa' }, { value: 'dinner', label: 'Tối' }, { value: 'snack', label: 'Bữa phụ' }];
const INTAKE_AMOUNTS = [{ value: 'none', label: 'Không ăn' }, { value: 'little', label: 'Ăn ít (< 25%)' }, { value: 'half', label: 'Nửa phần (~50%)' }, { value: 'most', label: 'Phần lớn (~75%)' }, { value: 'all', label: 'Ăn hết' }];
const APPETITE_OPTS  = [{ value: 'poor', label: 'Kém' }, { value: 'fair', label: 'Bình thường' }, { value: 'good', label: 'Tốt' }, { value: 'excellent', label: 'Rất tốt' }];
const ACTIVITY_TYPES = [{ value: 'walking', label: 'Đi bộ' }, { value: 'exercise', label: 'Tập thể dục' }, { value: 'physiotherapy', label: 'Vật lý trị liệu' }, { value: 'bathing', label: 'Tắm rửa' }, { value: 'grooming', label: 'Vệ sinh cá nhân' }, { value: 'reading', label: 'Đọc sách/báo' }, { value: 'socializing', label: 'Giao lưu xã hội' }, { value: 'other', label: 'Khác' }];
const PARTICIPATION  = [{ value: 'refused', label: 'Từ chối' }, { value: 'assisted', label: 'Cần hỗ trợ' }, { value: 'supervised', label: 'Giám sát' }, { value: 'independent', label: 'Độc lập' }];
const MOOD_OPTS      = [{ value: 'happy', label: 'Vui vẻ' }, { value: 'neutral', label: 'Bình thường' }, { value: 'sad', label: 'Buồn' }, { value: 'agitated', label: 'Kích động' }, { value: 'anxious', label: 'Lo âu' }];
const CONSCIOUSNESS  = [{ value: 'alert', label: 'Tỉnh táo' }, { value: 'confused', label: 'Lú lẫn' }, { value: 'drowsy', label: 'Buồn ngủ' }, { value: 'unresponsive', label: 'Không phản ứng' }];
const FALL_RISKS     = [{ value: 'low', label: 'Thấp' }, { value: 'medium', label: 'Trung bình' }, { value: 'high', label: 'Cao' }];

const LIMIT = 15;

/* ─── Helpers ────────────────────────────────── */

const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const toDatetimeLocal = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const residentName = (r) => {
  if (!r) return '—';
  if (typeof r === 'string') return r;
  return r.fullName || '—';
};
const residentCode = (r) => (r && typeof r === 'object' ? r.residentCode || '' : '');
const residentId   = (r) => (r && typeof r === 'object' ? r._id : r) || '';

const authorName = (s) => s?.userId?.fullName || '—';
const authorRole = (s) => s?.userId?.role || '';

const labelOf = (list, value) => list.find((o) => o.value === value)?.label || value;

/* ─── Modal wrapper ──────────────────────────── */

function Modal({ title, onClose, children, footer, size }) {
  return (
    <div className="cn-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`cn-modal${size === 'lg' ? ' cn-modal--lg' : ''}`}>
        <div className="cn-modal__header">
          <h2 className="cn-modal__title">{title}</h2>
          <button className="cn-modal__close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="cn-modal__body">{children}</div>
        {footer && <div className="cn-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ─── Metadata form section ─────────────────── */

function MetaFormSection({ noteType, meta, setMeta }) {
  const setM = (f) => (e) => setMeta((p) => ({ ...p, [f]: e.target.value }));

  if (noteType === 'meal') {
    return (
      <div className="cn-meta-section">
        <div className="cn-meta-section__title">🍽️ Chi tiết bữa ăn</div>
        <div className="cn-meta-grid">
          <div className="cn-form-group">
            <label className="cn-form-label">Loại bữa</label>
            <select className="cn-form-input" value={meta.mealType} onChange={setM('mealType')}>
              <option value="">— Chọn loại bữa —</option>
              {MEAL_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="cn-form-group">
            <label className="cn-form-label">Lượng ăn</label>
            <select className="cn-form-input" value={meta.intakeAmount} onChange={setM('intakeAmount')}>
              <option value="">— Chọn lượng ăn —</option>
              {INTAKE_AMOUNTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="cn-form-group">
            <label className="cn-form-label">Cảm giác ăn ngon</label>
            <select className="cn-form-input" value={meta.appetite} onChange={setM('appetite')}>
              <option value="">— Chọn —</option>
              {APPETITE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  }

  if (noteType === 'activity') {
    return (
      <div className="cn-meta-section">
        <div className="cn-meta-section__title">🏃 Chi tiết hoạt động</div>
        <div className="cn-meta-grid">
          <div className="cn-form-group">
            <label className="cn-form-label">Loại hoạt động</label>
            <select className="cn-form-input" value={meta.activityType} onChange={setM('activityType')}>
              <option value="">— Chọn hoạt động —</option>
              {ACTIVITY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="cn-form-group">
            <label className="cn-form-label">Thời gian (phút)</label>
            <input
              type="number"
              className="cn-form-input"
              min="0"
              placeholder="Nhập số phút..."
              value={meta.duration}
              onChange={setM('duration')}
            />
          </div>
          <div className="cn-form-group">
            <label className="cn-form-label">Mức độ tham gia</label>
            <select className="cn-form-input" value={meta.participationLevel} onChange={setM('participationLevel')}>
              <option value="">— Chọn mức độ —</option>
              {PARTICIPATION.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="cn-form-group">
            <label className="cn-form-label">Tâm trạng</label>
            <select className="cn-form-input" value={meta.mood} onChange={setM('mood')}>
              <option value="">— Chọn tâm trạng —</option>
              {MOOD_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  }

  if (noteType === 'health') {
    return (
      <div className="cn-meta-section">
        <div className="cn-meta-section__title">🩺 Chi tiết sức khỏe</div>
        <div className="cn-meta-grid">
          <div className="cn-form-group cn-form-group--full">
            <label className="cn-form-label">Triệu chứng (cách nhau bởi dấu phẩy)</label>
            <input
              type="text"
              className="cn-form-input"
              placeholder="VD: ho, sốt, khó thở, mệt mỏi..."
              value={meta.symptomsText}
              onChange={setM('symptomsText')}
            />
          </div>
          <div className="cn-form-group">
            <label className="cn-form-label">Mức độ tỉnh táo</label>
            <select className="cn-form-input" value={meta.consciousness} onChange={setM('consciousness')}>
              <option value="">— Chọn —</option>
              {CONSCIOUSNESS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="cn-form-group">
            <label className="cn-form-label">Nguy cơ ngã</label>
            <select className="cn-form-input" value={meta.fallRisk} onChange={setM('fallRisk')}>
              <option value="">— Chọn —</option>
              {FALL_RISKS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="cn-form-group">
            <label className="cn-form-label">Tình trạng da</label>
            <input
              type="text"
              className="cn-form-input"
              placeholder="Mô tả tình trạng da..."
              value={meta.skinCondition}
              onChange={setM('skinCondition')}
            />
          </div>
          <div className="cn-form-group cn-form-group--full">
            <label className="cn-form-label">Ghi chú quan sát thêm</label>
            <textarea
              className="cn-form-input"
              rows={2}
              placeholder="Các thay đổi thể trạng khác..."
              value={meta.observations}
              onChange={setM('observations')}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/* ─── Create / Edit Modal ────────────────────── */

function NoteFormModal({ mode, note, residents, onSave, onClose }) {
  const [form, setForm] = useState({
    residentId: residentId(note?.residentId) || '',
    noteType: note?.noteType || 'general',
    content: note?.content || '',
    noteAt: toDatetimeLocal(note?.noteAt || new Date()),
  });

  const [meta, setMeta] = useState({
    mealType: note?.metadata?.mealType || '',
    intakeAmount: note?.metadata?.intakeAmount || '',
    appetite: note?.metadata?.appetite || '',
    activityType: note?.metadata?.activityType || '',
    duration: note?.metadata?.duration ?? '',
    participationLevel: note?.metadata?.participationLevel || '',
    mood: note?.metadata?.mood || '',
    symptomsText: (note?.metadata?.symptoms || []).join(', '),
    consciousness: note?.metadata?.consciousness || '',
    fallRisk: note?.metadata?.fallRisk || '',
    skinCondition: note?.metadata?.skinCondition || '',
    observations: note?.metadata?.observations || '',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setF = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const buildMetadata = () => {
    const t = form.noteType;
    if (t === 'meal') {
      const m = {};
      if (meta.mealType) m.mealType = meta.mealType;
      if (meta.intakeAmount) m.intakeAmount = meta.intakeAmount;
      if (meta.appetite) m.appetite = meta.appetite;
      return m;
    }
    if (t === 'activity') {
      const m = {};
      if (meta.activityType) m.activityType = meta.activityType;
      if (meta.duration !== '') m.duration = Number(meta.duration);
      if (meta.participationLevel) m.participationLevel = meta.participationLevel;
      if (meta.mood) m.mood = meta.mood;
      return m;
    }
    if (t === 'health') {
      const m = {};
      const symptoms = meta.symptomsText.split(',').map((s) => s.trim()).filter(Boolean);
      if (symptoms.length) m.symptoms = symptoms;
      if (meta.consciousness) m.consciousness = meta.consciousness;
      if (meta.fallRisk) m.fallRisk = meta.fallRisk;
      if (meta.skinCondition) m.skinCondition = meta.skinCondition.trim();
      if (meta.observations) m.observations = meta.observations.trim();
      return m;
    }
    return {};
  };

  const validate = () => {
    const errs = {};
    if (!form.residentId) errs.residentId = 'Vui lòng chọn cư dân';
    if (!form.content || form.content.trim().length < 5) errs.content = 'Nội dung phải ít nhất 5 ký tự';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        residentId: form.residentId,
        noteType: form.noteType,
        content: form.content.trim(),
        noteAt: form.noteAt ? new Date(form.noteAt).toISOString() : undefined,
        metadata: buildMetadata(),
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={mode === 'create' ? 'Tạo ghi chú chăm sóc' : 'Chỉnh sửa ghi chú'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="cn-btn cn-btn--secondary" onClick={onClose} disabled={saving}>Hủy</button>
          <button className="cn-btn cn-btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Đang lưu...' : mode === 'create' ? 'Tạo ghi chú' : 'Lưu thay đổi'}
          </button>
        </>
      }
    >
      <div className="cn-form-grid">
        {/* Resident */}
        <div className="cn-form-group cn-form-group--full">
          <label className="cn-form-label">Cư dân <span className="cn-required">*</span></label>
          <select
            className={`cn-form-input${errors.residentId ? ' cn-form-input--error' : ''}`}
            value={form.residentId}
            onChange={setF('residentId')}
            disabled={mode === 'edit'}
          >
            <option value="">— Chọn cư dân —</option>
            {residents.map((r) => (
              <option key={r._id} value={r._id}>
                {r.fullName} {r.residentCode ? `(${r.residentCode})` : ''}
              </option>
            ))}
          </select>
          {errors.residentId && <span className="cn-form-error">{errors.residentId}</span>}
        </div>

        {/* Type + Datetime */}
        <div className="cn-form-group">
          <label className="cn-form-label">Loại ghi chú</label>
          <select className="cn-form-input" value={form.noteType} onChange={setF('noteType')}>
            {Object.entries(NOTE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="cn-form-group">
          <label className="cn-form-label">Thời gian ghi nhận</label>
          <input
            type="datetime-local"
            className="cn-form-input"
            value={form.noteAt}
            onChange={setF('noteAt')}
          />
        </div>

        {/* Content */}
        <div className="cn-form-group cn-form-group--full">
          <label className="cn-form-label">Nội dung ghi chú <span className="cn-required">*</span></label>
          <textarea
            className={`cn-form-input${errors.content ? ' cn-form-input--error' : ''}`}
            rows={4}
            placeholder="Mô tả chi tiết tình trạng / hoạt động / bữa ăn của cư dân..."
            value={form.content}
            onChange={setF('content')}
          />
          {errors.content && <span className="cn-form-error">{errors.content}</span>}
        </div>
      </div>

      {/* Conditional metadata section */}
      <MetaFormSection noteType={form.noteType} meta={meta} setMeta={setMeta} />
    </Modal>
  );
}

/* ─── View Modal ─────────────────────────────── */

function NoteViewModal({ note, onClose }) {
  const meta = note.metadata || {};
  const t = note.noteType;

  const MetaRow = ({ label, value }) =>
    value ? (
      <div className="cn-view-item">
        <span className="cn-view-label">{label}</span>
        <span className="cn-view-value">{value}</span>
      </div>
    ) : null;

  return (
    <Modal title="Chi tiết ghi chú chăm sóc" onClose={onClose} size="lg" footer={
      <button className="cn-btn cn-btn--secondary" onClick={onClose}>Đóng</button>
    }>
      <div className="cn-view-grid">
        <div className="cn-view-item">
          <span className="cn-view-label">Cư dân</span>
          <span className="cn-view-value">
            {residentName(note.residentId)}
            {residentCode(note.residentId) && ` (${residentCode(note.residentId)})`}
          </span>
        </div>
        <div className="cn-view-item">
          <span className="cn-view-label">Loại ghi chú</span>
          <span className={`cn-badge cn-badge--${t}`}>{NOTE_TYPE_LABELS[t] || t}</span>
        </div>

        <div className="cn-view-item cn-view-item--full">
          <span className="cn-view-label">Nội dung</span>
          <span className="cn-view-value cn-view-value--content">{note.content}</span>
        </div>

        {/* Meal metadata */}
        {t === 'meal' && (meta.mealType || meta.intakeAmount || meta.appetite) && (
          <>
            <hr className="cn-view-divider" />
            <span className="cn-view-section-title">🍽️ Chi tiết bữa ăn</span>
            <MetaRow label="Loại bữa"            value={labelOf(MEAL_TYPES, meta.mealType)} />
            <MetaRow label="Lượng ăn"            value={labelOf(INTAKE_AMOUNTS, meta.intakeAmount)} />
            <MetaRow label="Cảm giác ăn ngon"    value={labelOf(APPETITE_OPTS, meta.appetite)} />
          </>
        )}

        {/* Activity metadata */}
        {t === 'activity' && (meta.activityType || meta.participationLevel || meta.mood || meta.duration) && (
          <>
            <hr className="cn-view-divider" />
            <span className="cn-view-section-title">🏃 Chi tiết hoạt động</span>
            <MetaRow label="Loại hoạt động"       value={labelOf(ACTIVITY_TYPES, meta.activityType)} />
            <MetaRow label="Thời gian"             value={meta.duration != null ? `${meta.duration} phút` : null} />
            <MetaRow label="Mức độ tham gia"       value={labelOf(PARTICIPATION, meta.participationLevel)} />
            <MetaRow label="Tâm trạng"             value={labelOf(MOOD_OPTS, meta.mood)} />
          </>
        )}

        {/* Health metadata */}
        {t === 'health' && (meta.symptoms?.length || meta.consciousness || meta.fallRisk || meta.skinCondition || meta.observations) && (
          <>
            <hr className="cn-view-divider" />
            <span className="cn-view-section-title">🩺 Chi tiết sức khỏe</span>
            {Array.isArray(meta.symptoms) && meta.symptoms.length > 0 && (
              <div className="cn-view-item cn-view-item--full">
                <span className="cn-view-label">Triệu chứng</span>
                <div className="cn-chips">
                  {meta.symptoms.map((s, i) => <span key={i} className="cn-chip">{s}</span>)}
                </div>
              </div>
            )}
            <MetaRow label="Mức độ tỉnh táo"     value={labelOf(CONSCIOUSNESS, meta.consciousness)} />
            <MetaRow label="Nguy cơ ngã"          value={labelOf(FALL_RISKS, meta.fallRisk)} />
            <MetaRow label="Tình trạng da"        value={meta.skinCondition} />
            <MetaRow label="Ghi chú quan sát"     value={meta.observations} />
          </>
        )}

        <hr className="cn-view-divider" />
        <div className="cn-view-item">
          <span className="cn-view-label">Tác giả</span>
          <span className="cn-view-value">{authorName(note.authorStaffId)} <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>({authorRole(note.authorStaffId)})</span></span>
        </div>
        <div className="cn-view-item">
          <span className="cn-view-label">Thời gian ghi nhận</span>
          <span className="cn-view-value">{fmtDateTime(note.noteAt)}</span>
        </div>
        <div className="cn-view-item">
          <span className="cn-view-label">Tạo lúc</span>
          <span className="cn-view-value">{fmtDateTime(note.createdAt)}</span>
        </div>
        {note.updatedAt !== note.createdAt && (
          <div className="cn-view-item">
            <span className="cn-view-label">Cập nhật lần cuối</span>
            <span className="cn-view-value">{fmtDateTime(note.updatedAt)}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ─── Delete Confirm Modal ───────────────────── */

function DeleteConfirmModal({ note, onConfirm, onClose, saving }) {
  return (
    <Modal title="Xóa ghi chú" onClose={onClose} footer={
      <>
        <button className="cn-btn cn-btn--secondary" onClick={onClose} disabled={saving}>Hủy</button>
        <button className="cn-btn cn-btn--danger" onClick={onConfirm} disabled={saving}>
          {saving ? 'Đang xóa...' : 'Xác nhận xóa'}
        </button>
      </>
    }>
      <div className="cn-delete-body">
        <div className="cn-delete-icon"><AlertTriangle size={26} /></div>
        <p className="cn-delete-text">
          Bạn có chắc muốn xóa ghi chú này không? Hành động này <strong>không thể hoàn tác</strong>.
        </p>
        <div className="cn-delete-preview">
          <span className={`cn-badge cn-badge--${note.noteType}`}>{NOTE_TYPE_LABELS[note.noteType]}</span>
          &nbsp;
          {residentName(note.residentId)} · {fmtDateTime(note.noteAt)}
          <br />
          <em style={{ color: '#64748b', fontSize: 12 }}>{note.content?.slice(0, 80)}{note.content?.length > 80 ? '...' : ''}</em>
        </div>
      </div>
    </Modal>
  );
}

/* ─── History Modal ──────────────────────────── */

function HistoryModal({ resident, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    if (!resident) return;
    let active = true;
    setLoading(true);
    careNoteService.getNoteHistory(residentId(resident), typeFilter ? { noteType: typeFilter } : {})
      .then((data) => { if (active) setHistory(Array.isArray(data) ? data : (data?.data || [])); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [resident, typeFilter]);

  return (
    <Modal
      title={`Lịch sử ghi chú — ${residentName(resident)}`}
      onClose={onClose}
      size="lg"
      footer={<button className="cn-btn cn-btn--secondary" onClick={onClose}>Đóng</button>}
    >
      <div className="cn-history-filter">
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Lọc theo loại:</span>
        <select
          className="cn-form-input"
          style={{ width: 160 }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Tất cả</option>
          {Object.entries(NOTE_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Đang tải lịch sử..." />
      ) : history.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>Không có ghi chú nào.</p>
      ) : (
        <div className="cn-history-table-wrap">
          <table className="cn-history-table">
            <thead>
              <tr>
                <th>Loại</th>
                <th>Nội dung</th>
                <th>Tác giả</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {history.map((n) => (
                <tr key={n._id}>
                  <td><span className={`cn-badge cn-badge--${n.noteType}`}>{NOTE_TYPE_LABELS[n.noteType]}</span></td>
                  <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</td>
                  <td>{authorName(n.authorStaffId)}</td>
                  <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>{fmtDateTime(n.noteAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

/* ─── Main Page ──────────────────────────────── */

function CareNotesPage() {
  const { user } = useAuth();

  /* data */
  const [notes, setNotes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [residents, setResidents] = useState([]);
  const [msg, setMsg]             = useState({ text: '', type: '' });

  /* tabs + pagination */
  const [tab, setTab]             = useState('all');
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  /* filters */
  const [search, setSearch]               = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const [residentFilter, setResidentFilter] = useState('');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');

  /* modals */
  const [modal, setModal] = useState({ type: null, data: null });
  const closeModal = () => setModal({ type: null, data: null });

  /* helpers */
  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  /* load residents once */
  useEffect(() => {
    medicationService.getMyResidents()
      .then((data) => setResidents(Array.isArray(data) ? data : (data?.data || data?.residents || [])))
      .catch(() => setResidents([]));
  }, []);

  /* load notes */
  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: LIMIT,
        ...(search.trim()      ? { search: search.trim() }                     : {}),
        ...(typeFilter         ? { noteType: typeFilter }                       : {}),
        ...(residentFilter     ? { residentId: residentFilter }                 : {}),
        ...(dateFrom           ? { from: new Date(dateFrom).toISOString() }     : {}),
        ...(dateTo             ? { to: new Date(`${dateTo}T23:59:59`).toISOString() } : {}),
      };
      const result = tab === 'mine'
        ? await careNoteService.getMyNotes(params)
        : await careNoteService.listNotes(params);

      setNotes(result?.data || []);
      setTotal(result?.total || 0);
      setTotalPages(result?.totalPages || 1);
    } catch (err) {
      showMsg(err?.response?.data?.message || 'Không thể tải danh sách ghi chú.', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, typeFilter, residentFilter, dateFrom, dateTo]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  /* reset page when filters change */
  const handleTabChange = (t) => { setTab(t); setPage(1); };
  const handleTypeFilter = (e) => { setTypeFilter(e.target.value); setPage(1); };
  const handleResidentFilter = (e) => { setResidentFilter(e.target.value); setPage(1); };
  const handleDateFrom = (e) => { setDateFrom(e.target.value); setPage(1); };
  const handleDateTo   = (e) => { setDateTo(e.target.value); setPage(1); };

  const clearFilters = () => {
    setSearch(''); setTypeFilter(''); setResidentFilter('');
    setDateFrom(''); setDateTo(''); setPage(1);
  };

  const hasFilters = search || typeFilter || residentFilter || dateFrom || dateTo;

  /* CRUD handlers */
  const handleCreate = async (payload) => {
    try {
      await careNoteService.createNote(payload);
      showMsg('Ghi chú đã được tạo thành công.');
      closeModal();
      await loadNotes();
    } catch (err) {
      showMsg(err?.response?.data?.message || 'Không thể tạo ghi chú.', 'error');
      throw err;
    }
  };

  const handleEdit = async (payload) => {
    try {
      await careNoteService.updateNote(modal.data._id, payload);
      showMsg('Ghi chú đã được cập nhật.');
      closeModal();
      await loadNotes();
    } catch (err) {
      showMsg(err?.response?.data?.message || 'Không thể cập nhật ghi chú.', 'error');
      throw err;
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await careNoteService.deleteNote(modal.data._id);
      showMsg('Đã xóa ghi chú.');
      closeModal();
      await loadNotes();
    } catch (err) {
      showMsg(err?.response?.data?.message || 'Không thể xóa ghi chú.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <LoadingSpinner label="Đang tải..." />;

  return (
    <div className="cn-page">
      {/* ── Header ── */}
      <div className="cn-header">
        <div>
          <h1 className="cn-header__title">Ghi chú chăm sóc</h1>
          <p className="cn-header__subtitle">Ghi nhận tình trạng bữa ăn, hoạt động sinh hoạt và sức khỏe của cư dân</p>
        </div>
        <button
          className="cn-btn cn-btn--primary"
          onClick={() => setModal({ type: 'create', data: null })}
        >
          <PlusCircle size={16} />
          Tạo ghi chú
        </button>
      </div>

      {/* ── Message ── */}
      {msg.text && (
        <div className={`cn-message cn-message--${msg.type}`}>{msg.text}</div>
      )}

      {/* ── Toolbar ── */}
      <div className="cn-toolbar">
        <div className="cn-toolbar__search">
          <Search size={15} />
          <input
            placeholder="Tìm kiếm nội dung ghi chú..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select value={typeFilter} onChange={handleTypeFilter}>
          <option value="">Tất cả loại</option>
          {Object.entries(NOTE_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <select value={residentFilter} onChange={handleResidentFilter}>
          <option value="">Tất cả cư dân</option>
          {residents.map((r) => (
            <option key={r._id} value={r._id}>
              {r.fullName}{r.residentCode ? ` (${r.residentCode})` : ''}
            </option>
          ))}
        </select>

        <span className="cn-toolbar__date-label">Từ:</span>
        <input type="date" value={dateFrom} onChange={handleDateFrom} />
        <span className="cn-toolbar__date-label">Đến:</span>
        <input type="date" value={dateTo} onChange={handleDateTo} />

        {hasFilters && (
          <button className="cn-btn cn-btn--ghost" onClick={clearFilters}>
            Xóa lọc
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="cn-tabs">
        <button
          className={`cn-tab${tab === 'all' ? ' cn-tab--active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          Tất cả ghi chú {tab === 'all' && total > 0 ? `(${total})` : ''}
        </button>
        <button
          className={`cn-tab${tab === 'mine' ? ' cn-tab--active' : ''}`}
          onClick={() => handleTabChange('mine')}
        >
          Ghi chú của tôi {tab === 'mine' && total > 0 ? `(${total})` : ''}
        </button>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <LoadingSpinner label="Đang tải ghi chú..." />
      ) : (
        <div className="cn-table-wrap">
          <table className="cn-table">
            <thead>
              <tr>
                <th>Cư dân</th>
                <th>Loại</th>
                <th>Nội dung</th>
                <th>Tác giả</th>
                <th>Thời gian</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {notes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="cn-empty">
                    {hasFilters ? 'Không tìm thấy ghi chú phù hợp với bộ lọc.' : 'Chưa có ghi chú nào.'}
                  </td>
                </tr>
              ) : (
                notes.map((note) => (
                  <tr key={note._id}>
                    <td>
                      <div className="cn-resident-name">{residentName(note.residentId)}</div>
                      <div className="cn-resident-code">{residentCode(note.residentId)}</div>
                    </td>
                    <td>
                      <span className={`cn-badge cn-badge--${note.noteType}`}>
                        {NOTE_TYPE_LABELS[note.noteType] || note.noteType}
                      </span>
                    </td>
                    <td>
                      <div className="cn-content-preview">{note.content}</div>
                    </td>
                    <td>
                      <div className="cn-author-name">{authorName(note.authorStaffId)}</div>
                      <div className="cn-author-role">{authorRole(note.authorStaffId)}</div>
                    </td>
                    <td className="cn-date">{fmtDateTime(note.noteAt)}</td>
                    <td>
                      <div className="cn-actions">
                        <button
                          className="cn-action-btn cn-action-btn--view"
                          title="Xem chi tiết"
                          onClick={() => setModal({ type: 'view', data: note })}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="cn-action-btn cn-action-btn--edit"
                          title="Chỉnh sửa"
                          onClick={() => setModal({ type: 'edit', data: note })}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="cn-action-btn cn-action-btn--delete"
                          title="Xóa"
                          onClick={() => setModal({ type: 'delete', data: note })}
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          className="cn-action-btn cn-action-btn--history"
                          title="Xem lịch sử cư dân"
                          onClick={() => setModal({ type: 'history', data: note.residentId })}
                        >
                          <History size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="cn-pagination">
          <button
            className="cn-pagination__btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Trước
          </button>
          <span className="cn-pagination__info">
            Trang {page} / {totalPages} &nbsp;·&nbsp; {total} ghi chú
          </span>
          <button
            className="cn-pagination__btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Tiếp →
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {modal.type === 'create' && (
        <NoteFormModal
          mode="create"
          note={null}
          residents={residents}
          onSave={handleCreate}
          onClose={closeModal}
        />
      )}

      {modal.type === 'edit' && modal.data && (
        <NoteFormModal
          mode="edit"
          note={modal.data}
          residents={residents}
          onSave={handleEdit}
          onClose={closeModal}
        />
      )}

      {modal.type === 'view' && modal.data && (
        <NoteViewModal note={modal.data} onClose={closeModal} />
      )}

      {modal.type === 'delete' && modal.data && (
        <DeleteConfirmModal
          note={modal.data}
          saving={saving}
          onConfirm={handleDelete}
          onClose={closeModal}
        />
      )}

      {modal.type === 'history' && modal.data && (
        <HistoryModal resident={modal.data} onClose={closeModal} />
      )}
    </div>
  );
}

export default CareNotesPage;
