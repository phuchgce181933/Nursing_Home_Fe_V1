import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import leaveRequestService from '../../services/leaveRequest.service';
import { calcInclusiveLeaveDays, formatLeaveDate } from '../../utils/leaveUtils';
import '../../styles/shared/LeaveRequestPage.css';

const LEAVE_TYPES = ['annual', 'sick', 'emergency', 'unpaid', 'other'];

const STATUS_CLASS = {
  draft: 'pending',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
};

const minStartDate = (type) => {
  if (type === 'emergency') return new Date().toISOString().slice(0, 10);
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const emptyForm = { type: 'annual', startDate: '', endDate: '', reason: '' };

export default function LeaveRequestPage() {
  const { t } = useTranslation();
  const ns = 'shared.leaveRequests';

  const typeOptions = useMemo(
    () => LEAVE_TYPES.map((value) => ({ value, label: t(`${ns}.types.${value}`) })),
    [t, ns]
  );

  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [formError, setFormError] = useState('');
  const [cancellingId, setCancelId] = useState(null);

  const previewDays = useMemo(
    () => calcInclusiveLeaveDays(form.startDate, form.endDate),
    [form.startDate, form.endDate]
  );

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await leaveRequestService.getAll({ limit: 50 });
      setMyRequests(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) return;
    setSubmitting(true);
    setFormError('');
    setWarnings([]);
    try {
      const res = await leaveRequestService.submit({
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      });
      setForm(emptyForm);
      setSuccessMsg(t(`${ns}.successMsg`));
      setTimeout(() => setSuccessMsg(''), 6000);

      const w = [];
      if (res.balanceWarning) w.push(t(`${ns}.balanceWarning`, { message: res.balanceWarning }));
      if (res.shiftWarning) w.push(t(`${ns}.shiftWarning`, { message: res.shiftWarning }));
      setWarnings(w);

      loadRequests();
    } catch (err) {
      setFormError(err.response?.data?.message || t(`${ns}.submitFailed`));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm(t(`${ns}.cancelConfirm`))) return;
    setCancelId(id);
    try {
      await leaveRequestService.cancel(id);
      setMyRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: 'cancelled' } : r)));
    } catch (err) {
      alert(err.response?.data?.message || t(`${ns}.cancelFailed`));
    } finally {
      setCancelId(null);
    }
  };

  const leaveTypeLabel = (type) => t(`${ns}.types.${type}`, { defaultValue: type });

  const statusLabel = (status) =>
    t(`common.leaveStatus.${status}`, { defaultValue: status });

  return (
    <div className="leave-page">
      <div className="leave-page__header">
        <h1 className="leave-page__title">{t(`${ns}.title`)}</h1>
        <p className="leave-page__subtitle">{t(`${ns}.subtitle`)}</p>
      </div>

      {successMsg && (
        <div className="success-toast">
          <span>✅</span> {successMsg}
        </div>
      )}
      {warnings.map((w, i) => (
        <div
          key={i}
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            borderRadius: 8,
            padding: '8px 14px',
            marginBottom: 8,
            fontSize: '0.875rem',
          }}
        >
          {w}
        </div>
      ))}

      <div className="leave-form-card">
        <h2 className="leave-form-card__title">{t(`${ns}.formTitle`)}</h2>
        {formError && (
          <div style={{ color: '#dc2626', marginBottom: 10, fontSize: '0.875rem' }}>{formError}</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="leave-form-grid">
            <div className="form-group leave-form-full">
              <label>{t(`${ns}.typeLabel`)}</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value, startDate: '', endDate: '' })}
                required
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {form.type !== 'emergency' && (
                <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{t(`${ns}.advanceHint`)}</small>
              )}
            </div>
            <div className="form-group">
              <label>{t(`${ns}.startDateLabel`)}</label>
              <input
                type="date"
                value={form.startDate}
                min={minStartDate(form.type)}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>{t(`${ns}.endDateLabel`)}</label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || minStartDate(form.type)}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
              {previewDays > 0 && (
                <small className="field-hint">{t(`${ns}.daysPreview`, { count: previewDays })}</small>
              )}
            </div>
            <div className="form-group leave-form-full">
              <label>{t(`${ns}.reasonLabel`)}</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder={t(`${ns}.reasonPlaceholder`)}
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? t(`${ns}.submitting`) : t(`${ns}.submit`)}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="leave-history__title">{t(`${ns}.historyTitle`)}</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t(`${ns}.colType`)}</th>
                <th>{t(`${ns}.colFrom`)}</th>
                <th>{t(`${ns}.colTo`)}</th>
                <th>{t(`${ns}.colDays`)}</th>
                <th>{t(`${ns}.colReason`)}</th>
                <th>{t(`${ns}.colSubmitted`)}</th>
                <th>{t('common.colStatus')}</th>
                <th>{t(`${ns}.colReviewNote`)}</th>
                <th>{t(`${ns}.colActions`)}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="empty-state">
                    {t('common.loading')}
                  </td>
                </tr>
              )}
              {!loading && myRequests.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-state">
                    {t(`${ns}.emptyList`)}
                  </td>
                </tr>
              )}
              {!loading &&
                myRequests.map((r) => (
                  <tr key={r._id}>
                    <td>{leaveTypeLabel(r.type)}</td>
                    <td>{formatLeaveDate(r.startDate)}</td>
                    <td>{formatLeaveDate(r.endDate)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {r.daysRequested ??
                        (r.startDate && r.endDate
                          ? calcInclusiveLeaveDays(formatLeaveDate(r.startDate), formatLeaveDate(r.endDate))
                          : '—')}
                    </td>
                    <td>{r.reason}</td>
                    <td>{formatLeaveDate(r.createdAt)}</td>
                    <td>
                      <span className={`leave-status leave-status--${STATUS_CLASS[r.status] || r.status}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.reviewNote || '—'}</td>
                    <td>
                      {r.status === 'pending' && (
                        <button
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                            background: '#fee2e2',
                            color: '#dc2626',
                          }}
                          disabled={cancellingId === r._id}
                          onClick={() => handleCancel(r._id)}
                        >
                          {cancellingId === r._id ? '...' : t(`${ns}.cancelButton`)}
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
