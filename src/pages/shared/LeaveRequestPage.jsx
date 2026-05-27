import { useEffect, useMemo, useState } from 'react';
import leaveRequestService from '../../services/leaveRequest.service';
import { calcInclusiveLeaveDays, formatLeaveDate } from '../../utils/leaveUtils';
import '../../styles/shared/LeaveRequestPage.css';

const STATUS_LABELS = {
  draft:     'Nháp',
  pending:   'Chờ duyệt',
  approved:  'Đã duyệt',
  rejected:  'Từ chối',
  cancelled: 'Đã hủy',
};
const STATUS_CLASS = {
  draft:     'pending',
  pending:   'pending',
  approved:  'approved',
  rejected:  'rejected',
  cancelled: 'cancelled',
};

const TYPE_OPTIONS = [
  { value: 'annual',    label: 'Phép năm' },
  { value: 'sick',      label: 'Nghỉ ốm' },
  { value: 'emergency', label: 'Khẩn cấp' },
  { value: 'unpaid',    label: 'Nghỉ không lương' },
  { value: 'other',     label: 'Khác' },
];

// Minimum start date: tomorrow (backend requires 24h advance for non-emergency)
const minStartDate = (type) => {
  if (type === 'emergency') return new Date().toISOString().slice(0, 10);
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const emptyForm = { type: 'annual', startDate: '', endDate: '', reason: '' };

export default function LeaveRequestPage() {
  const [myRequests, setMyRequests]   = useState([]);
  const [loading, setLoading]         = useState(false);
  const [form, setForm]               = useState(emptyForm);
  const [submitting, setSubmitting]   = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');
  const [warnings, setWarnings]       = useState([]);
  const [formError, setFormError]     = useState('');
  const [cancellingId, setCancelId]   = useState(null);

  const previewDays = useMemo(
    () => calcInclusiveLeaveDays(form.startDate, form.endDate),
    [form.startDate, form.endDate]
  );

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await leaveRequestService.getAll({ limit: 50 });
      setMyRequests(Array.isArray(res.data) ? res.data : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadRequests(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) return;
    setSubmitting(true); setFormError(''); setWarnings([]);
    try {
      const res = await leaveRequestService.submit({
        type:      form.type,
        startDate: form.startDate,
        endDate:   form.endDate,
        reason:    form.reason.trim(),
      });
      setForm(emptyForm);
      setSuccessMsg('Đơn nghỉ phép đã được gửi thành công! Vui lòng chờ phê duyệt.');
      setTimeout(() => setSuccessMsg(''), 6000);

      // Show backend warnings if any
      const w = [];
      if (res.balanceWarning) w.push(`⚠️ Số dư phép: ${res.balanceWarning}`);
      if (res.shiftWarning)   w.push(`⚠️ Ca làm việc: ${res.shiftWarning}`);
      setWarnings(w);

      loadRequests();
    } catch (e) {
      setFormError(e.response?.data?.message || 'Gửi đơn thất bại');
    } finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Xác nhận hủy đơn nghỉ phép này?')) return;
    setCancelId(id);
    try {
      await leaveRequestService.cancel(id);
      setMyRequests((prev) => prev.map((r) => r._id === id ? { ...r, status: 'cancelled' } : r));
    } catch (e) {
      alert(e.response?.data?.message || 'Hủy thất bại');
    } finally { setCancelId(null); }
  };

  return (
    <div className="leave-page">
      <div className="leave-page__header">
        <h1 className="leave-page__title">Đơn xin nghỉ phép</h1>
        <p className="leave-page__subtitle">Gửi yêu cầu nghỉ phép đến quản lý</p>
      </div>

      {successMsg && (
        <div className="success-toast"><span>✅</span> {successMsg}</div>
      )}
      {warnings.map((w, i) => (
        <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, padding: '8px 14px', marginBottom: 8, fontSize: '0.875rem' }}>
          {w}
        </div>
      ))}

      {/* Submit form */}
      <div className="leave-form-card">
        <h2 className="leave-form-card__title">Gửi đơn nghỉ phép mới</h2>
        {formError && <div style={{ color: '#dc2626', marginBottom: 10, fontSize: '0.875rem' }}>{formError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="leave-form-grid">
            <div className="form-group leave-form-full">
              <label>Loại nghỉ phép *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value, startDate: '', endDate: '' })}
                required
              >
                {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {form.type !== 'emergency' && (
                <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Phải gửi trước ít nhất 24 giờ (trừ khẩn cấp)</small>
              )}
            </div>
            <div className="form-group">
              <label>Ngày bắt đầu nghỉ *</label>
              <input
                type="date"
                value={form.startDate}
                min={minStartDate(form.type)}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Ngày kết thúc nghỉ *</label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || minStartDate(form.type)}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
              {previewDays > 0 && (
                <small className="field-hint">
                  Số ngày nghỉ: <strong>{previewDays}</strong> (tính cả ngày bắt đầu và ngày kết thúc)
                </small>
              )}
            </div>
            <div className="form-group leave-form-full">
              <label>Lý do nghỉ phép *</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Mô tả lý do xin nghỉ phép..."
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi đơn nghỉ phép'}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div>
        <h2 className="leave-history__title">Lịch sử đơn nghỉ phép</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Loại nghỉ</th>
                <th>Từ ngày</th>
                <th>Đến ngày</th>
                <th>Số ngày</th>
                <th>Lý do</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
                <th>Ghi chú duyệt</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="empty-state">Đang tải...</td></tr>}
              {!loading && myRequests.length === 0 && (
                <tr><td colSpan={9} className="empty-state">Bạn chưa có đơn nghỉ phép nào</td></tr>
              )}
              {!loading && myRequests.map((r) => (
                <tr key={r._id}>
                  <td>{TYPE_OPTIONS.find((t) => t.value === r.type)?.label || r.type}</td>
                  <td>{formatLeaveDate(r.startDate)}</td>
                  <td>{formatLeaveDate(r.endDate)}</td>
                  <td style={{ textAlign: 'center' }}>
                    {r.daysRequested
                      ?? (r.startDate && r.endDate
                        ? calcInclusiveLeaveDays(formatLeaveDate(r.startDate), formatLeaveDate(r.endDate))
                        : '—')}
                  </td>
                  <td>{r.reason}</td>
                  <td>{formatLeaveDate(r.createdAt)}</td>
                  <td>
                    <span className={`leave-status leave-status--${STATUS_CLASS[r.status] || r.status}`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.reviewNote || '—'}</td>
                  <td>
                    {r.status === 'pending' && (
                      <button
                        style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#dc2626' }}
                        disabled={cancellingId === r._id}
                        onClick={() => handleCancel(r._id)}
                      >
                        {cancellingId === r._id ? '...' : 'Hủy đơn'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
