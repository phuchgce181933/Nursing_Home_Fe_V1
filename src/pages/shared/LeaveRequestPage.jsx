import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarDays,
  X,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import leaveRequestService from '../../services/leaveRequest.service';
import { calcInclusiveLeaveDays, formatLeaveDate } from '../../utils/leaveUtils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/shared/LeaveRequestPage.css';
import { resolveApiError } from '../../utils/apiMessage';
import { useToast } from '../../hooks/useToast';

const minStartDate = (type) => {
  if (type === 'emergency') return new Date().toISOString().slice(0, 10);
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const emptyForm = { type: 'annual', startDate: '', endDate: '', reason: '' };

export default function LeaveRequestPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const STATUS_DISPLAY = {
    draft: t('leaveRequest.statusDraft'),
    pending: t('leaveRequest.statusPending'),
    approved: t('leaveRequest.statusApproved'),
    rejected: t('leaveRequest.statusRejected'),
    cancelled: t('leaveRequest.statusCancelled'),
  };

  const TYPE_OPTIONS = [
    { value: 'annual', label: t('leaveRequest.typeAnnual') },
    { value: 'sick', label: t('leaveRequest.typeSick') },
    { value: 'emergency', label: t('leaveRequest.typeEmergency') },
    { value: 'unpaid', label: t('leaveRequest.typeUnpaid') },
    { value: 'other', label: t('leaveRequest.typeOther') },
  ];

  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [formError, setFormError] = useState('');
  const [cancellingId, setCancelId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelModal, setCancelModal] = useState(null);

  const previewDays = useMemo(
    () => calcInclusiveLeaveDays(form.startDate, form.endDate),
    [form.startDate, form.endDate],
  );

  /* ── Stats ───────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total: myRequests.length,
    pending: myRequests.filter((r) => r.status === 'pending').length,
    approved: myRequests.filter((r) => r.status === 'approved').length,
    rejected: myRequests.filter((r) => r.status === 'rejected').length,
  }), [myRequests]);

  /* ── Data loading ──────────────────────────────────────────── */
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

  /* ── Handlers ──────────────────────────────────────────────── */
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
      setDrawerOpen(false);
      setSuccessMsg(t('leaveRequest.submitSuccess'));
      setTimeout(() => setSuccessMsg(''), 6000);

      const w = [];
      if (res.balanceWarning) w.push(`${t('leaveRequest.balanceWarning')}: ${res.balanceWarning}`);
      if (res.shiftWarning) w.push(`${t('leaveRequest.shiftWarning')}: ${res.shiftWarning}`);
      setWarnings(w);
      loadRequests();
    } catch (err) {
      setFormError(resolveApiError(err, t, 'leaveRequest.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    setCancelId(id);
    try {
      await leaveRequestService.cancel(id);
      setMyRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: 'cancelled' } : r)));
    } catch (err) {
      showToast(resolveApiError(err, t, 'leaveRequest.cancelFailed'), 'error');
    } finally {
      setCancelId(null);
      setCancelModal(null);
    }
  };

  return (
    <div className="lr-page">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="lr-header">
        <div>
          <h1 className="lr-header__title">{t('leaveRequest.pageTitle')}</h1>
          <p className="lr-header__subtitle">{t('leaveRequest.pageSubtitle')}</p>
        </div>
        <button type="button" className="lr-btn lr-btn--primary" onClick={() => setDrawerOpen(true)}>
          <PlusCircle size={16} />
          {t('leaveRequest.newRequest')}
        </button>
      </header>

      {/* ── Toasts ─────────────────────────────────────────── */}
      {successMsg && (
        <div className="lr-toast lr-toast--success">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}
      {warnings.map((w, i) => (
        <div key={i} className="lr-toast lr-toast--warning">
          <AlertTriangle size={16} /> {w}
        </div>
      ))}

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="lr-stats">
        <div className="lr-stat-card">
          <div className="lr-stat-card__icon lr-stat-card__icon--total">
            <FileText size={22} />
          </div>
          <div>
            <div className="lr-stat-card__value">{stats.total}</div>
            <div className="lr-stat-card__label">{t('leaveRequest.statTotal')}</div>
          </div>
        </div>
        <div className="lr-stat-card">
          <div className="lr-stat-card__icon lr-stat-card__icon--pending">
            <Clock size={22} />
          </div>
          <div>
            <div className="lr-stat-card__value">{stats.pending}</div>
            <div className="lr-stat-card__label">{t('leaveRequest.statPending')}</div>
          </div>
        </div>
        <div className="lr-stat-card">
          <div className="lr-stat-card__icon lr-stat-card__icon--approved">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="lr-stat-card__value">{stats.approved}</div>
            <div className="lr-stat-card__label">{t('leaveRequest.statApproved')}</div>
          </div>
        </div>
        <div className="lr-stat-card">
          <div className="lr-stat-card__icon lr-stat-card__icon--rejected">
            <XCircle size={22} />
          </div>
          <div>
            <div className="lr-stat-card__value">{stats.rejected}</div>
            <div className="lr-stat-card__label">{t('leaveRequest.statRejected')}</div>
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="lr-table-card">
        <div className="lr-table-header">
          <h2 className="lr-table-header__title">{t('leaveRequest.historyTitle')}</h2>
        </div>

        {loading ? (
          <LoadingSpinner label={t('leaveRequest.loading')} />
        ) : myRequests.length === 0 ? (
          <div className="lr-empty">
            <div className="lr-empty__icon"><Inbox size={42} /></div>
            <p>{t('leaveRequest.emptyList')}</p>
          </div>
        ) : (
          <table className="lr-table">
            <thead>
              <tr>
                <th>{t('leaveRequest.colType')}</th>
                <th>{t('leaveRequest.colFromDate')}</th>
                <th>{t('leaveRequest.colToDate')}</th>
                <th>{t('leaveRequest.colDays')}</th>
                <th>{t('leaveRequest.colReason')}</th>
                <th>{t('leaveRequest.colSubmitDate')}</th>
                <th>{t('leaveRequest.colStatus')}</th>
                <th>{t('leaveRequest.colReviewNote')}</th>
                <th>{t('leaveRequest.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {myRequests.map((r) => (
                <tr key={r._id}>
                  <td>{TYPE_OPTIONS.find((opt) => opt.value === r.type)?.label || r.type}</td>
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
                    <span className={`lr-badge lr-badge--${r.status}`}>
                      {STATUS_DISPLAY[r.status] || r.status}
                    </span>
                  </td>
                  <td className="lr-review-note">{r.reviewNote || '—'}</td>
                  <td>
                    {r.status === 'pending' && (
                      <button
                        type="button"
                        className="lr-btn lr-btn--danger lr-btn--small"
                        disabled={cancellingId === r._id}
                        onClick={() => setCancelModal(r._id)}
                      >
                        {cancellingId === r._id ? '...' : t('leaveRequest.cancelRequest')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create drawer ──────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="lr-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="lr-drawer">
            <div className="lr-drawer__header">
              <h2 className="lr-drawer__title">{t('leaveRequest.drawerTitle')}</h2>
              <button type="button" className="lr-drawer__close" onClick={() => setDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="lr-drawer__body">
              {formError && (
                <div className="lr-toast lr-toast--error" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={16} /> {formError}
                </div>
              )}

              <div className="lr-form-grid">
                <div className="lr-field lr-form-full">
                  <label className="lr-field__label">{t('leaveRequest.labelType')} *</label>
                  <select
                    className="lr-field__select"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value, startDate: '', endDate: '' })}
                    required
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {form.type !== 'emergency' && (
                    <span className="lr-field__hint">{t('leaveRequest.hint24h')}</span>
                  )}
                </div>

                <div className="lr-field">
                  <label className="lr-field__label">{t('leaveRequest.labelStartDate')} *</label>
                  <input
                    className="lr-field__input"
                    type="date"
                    value={form.startDate}
                    min={minStartDate(form.type)}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>

                <div className="lr-field">
                  <label className="lr-field__label">{t('leaveRequest.labelEndDate')} *</label>
                  <input
                    className="lr-field__input"
                    type="date"
                    value={form.endDate}
                    min={form.startDate || minStartDate(form.type)}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                  {previewDays > 0 && (
                    <span className="lr-field__preview">
                      <CalendarDays size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {t('leaveRequest.previewDays', { count: previewDays })}
                    </span>
                  )}
                </div>

                <div className="lr-field lr-form-full">
                  <label className="lr-field__label">{t('leaveRequest.labelReason')} *</label>
                  <textarea
                    className="lr-field__textarea"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder={t('leaveRequest.placeholderReason')}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="button" className="lr-btn lr-btn--secondary" onClick={() => setDrawerOpen(false)}>
                  {t('leaveRequest.btnCancel')}
                </button>
                <button type="submit" className="lr-btn lr-btn--primary" disabled={submitting}>
                  <PlusCircle size={16} />
                  {submitting ? t('leaveRequest.submitting') : t('leaveRequest.btnSubmit')}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Cancel confirm modal ───────────────────────────── */}
      {cancelModal && (
        <div className="lr-modal-overlay" onClick={() => setCancelModal(null)}>
          <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="lr-modal__title">{t('leaveRequest.confirmCancelTitle')}</h3>
            <p className="lr-modal__text">
              {t('leaveRequest.confirmCancelText')}
            </p>
            <div className="lr-modal__actions">
              <button type="button" className="lr-btn lr-btn--secondary" onClick={() => setCancelModal(null)}>
                {t('leaveRequest.btnGoBack')}
              </button>
              <button
                type="button"
                className="lr-btn lr-btn--danger"
                disabled={cancellingId === cancelModal}
                onClick={() => handleCancel(cancelModal)}
              >
                {cancellingId === cancelModal ? t('leaveRequest.cancelling') : t('leaveRequest.confirmCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
