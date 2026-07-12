import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import leaveRequestService from '../../../../services/leaveRequest.service';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import { resolveApiError } from '../../../../utils/apiMessage';
import { formatLeaveDate } from '../../../../utils/leaveUtils';
import { useAuth } from '../../../../hooks/useAuth';
import ApproveLeaveModal from './ApproveLeaveModal';
import {
  STATUS_LABELS,
  TYPE_LABEL,
  ROLE_LABEL,
  replacementDisplay,
  getLeaveDays,
  getLeaveListPath,
} from './leaveRequestHelpers';
import '../../../../styles/admin/LeaveRequestAdminPage.css';

export default function LeaveRequestDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const listPath = getLeaveListPath(user?.role);

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveResult, setApproveResult] = useState(null);

  const loadRequest = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await leaveRequestService.getById(id);
      setRequest(data);
    } catch (e) {
      setError(resolveApiError(e, t, 'admin.staff.leaveRequests.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [id]);

  const handleApproveSuccess = (res) => {
    const parts = [t('admin.staff.leaveRequests.toast.approved')];
    const replacement = res.request?.replacementStaffProfileId;
    if (replacement) {
      parts.push(t('admin.staff.leaveRequests.toast.replacement', { name: replacementDisplay(replacement) }));
    }
    if (res.reassignedShifts?.count) {
      parts.push(t('admin.staff.leaveRequests.toast.shiftsReassigned', { count: res.reassignedShifts.count }));
    }
    if (res.reassignedCareTasks?.count) {
      parts.push(t('admin.staff.leaveRequests.toast.tasksReassigned', { count: res.reassignedCareTasks.count }));
    }
    setApproveResult({ msg: parts.join(' ') });
    loadRequest();
  };

  const handleReject = async () => {
    const note = rejectNote.trim();
    if (!note) {
      alert(t('admin.staff.leaveRequests.rejectReasonRequired'));
      return;
    }
    setActionLoading(true);
    try {
      await leaveRequestService.reject(id, note);
      setRejectNote('');
      await loadRequest();
    } catch (e) {
      alert(resolveApiError(e, t, 'admin.staff.leaveRequests.actionFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const isPending = request?.status === 'pending';

  return (
    <AdminPageShell
      title={t('admin.staff.leaveRequests.detail.title')}
      subtitle={t('admin.staff.leaveRequests.detail.subtitle')}
    >
      <button type="button" className="leave-detail-back" onClick={() => navigate(listPath)}>
        <ArrowLeft size={16} />
        {t('admin.staff.leaveRequests.detail.backToList')}
      </button>

      {loading && <p className="leave-detail-loading">{t('common.loading')}</p>}
      {error && <div className="leave-admin-error">{error}</div>}

      {approveResult && (
        <div className="leave-approve-toast">
          <span>✅ {approveResult.msg}</span>
          <button type="button" className="leave-approve-toast__close" onClick={() => setApproveResult(null)}>
            {t('common.close')}
          </button>
        </div>
      )}

      {!loading && request && (
        <div className="leave-detail-card">
          <div className="leave-detail-card__header">
            <div>
              <h2 className="leave-detail-card__name">{request.staffId?.fullName || '—'}</h2>
              <span className={`role-badge role-badge--${request.staffId?.role}`}>
                {ROLE_LABEL(t, request.staffId?.role) || '—'}
              </span>
            </div>
            <span className={`leave-status leave-status--${request.status}`}>
              {STATUS_LABELS(t, request.status)}
            </span>
          </div>

          <div className="leave-detail-grid">
            <div className="leave-detail-field">
              <span className="leave-detail-field__label">{t('admin.staff.leaveRequests.colLeaveType')}</span>
              <span className="leave-detail-field__value">{TYPE_LABEL(t, request.type)}</span>
            </div>
            <div className="leave-detail-field">
              <span className="leave-detail-field__label">{t('admin.staff.leaveRequests.colDays')}</span>
              <span className="leave-detail-field__value leave-detail-field__value--highlight">
                {getLeaveDays(request)}
              </span>
            </div>
            <div className="leave-detail-field">
              <span className="leave-detail-field__label">{t('admin.staff.leaveRequests.colFrom')}</span>
              <span className="leave-detail-field__value">{formatLeaveDate(request.startDate)}</span>
            </div>
            <div className="leave-detail-field">
              <span className="leave-detail-field__label">{t('admin.staff.leaveRequests.colTo')}</span>
              <span className="leave-detail-field__value">{formatLeaveDate(request.endDate)}</span>
            </div>
            <div className="leave-detail-field">
              <span className="leave-detail-field__label">{t('admin.staff.leaveRequests.colSubmitted')}</span>
              <span className="leave-detail-field__value">{formatLeaveDate(request.createdAt)}</span>
            </div>
            <div className="leave-detail-field">
              <span className="leave-detail-field__label">{t('admin.staff.leaveRequests.colReplacement')}</span>
              <span className="leave-detail-field__value">
                {replacementDisplay(request.replacementStaffProfileId)}
              </span>
            </div>
          </div>

          <div className="leave-detail-section">
            <span className="leave-detail-field__label">{t('admin.staff.leaveRequests.colReason')}</span>
            <p className="leave-detail-text">{request.reason || '—'}</p>
          </div>

          {(request.reviewNote || !isPending) && (
            <div className="leave-detail-section">
              <span className="leave-detail-field__label">{t('admin.staff.leaveRequests.colReviewNote')}</span>
              <p className="leave-detail-text">{request.reviewNote || '—'}</p>
            </div>
          )}

          {isPending && (
            <div className="leave-detail-actions">
              <h3 className="leave-detail-actions__title">{t('admin.staff.leaveRequests.detail.actionsTitle')}</h3>
              <div className="leave-detail-actions__row">
                <button
                  type="button"
                  className="action-btn action-btn--approve"
                  disabled={actionLoading}
                  onClick={() => setApproveTarget(request)}
                >
                  ✓ {t('admin.staff.leaveRequests.approve')}
                </button>
                <button
                  type="button"
                  className="action-btn action-btn--reject"
                  disabled={actionLoading}
                  onClick={handleReject}
                >
                  {actionLoading ? '...' : `✗ ${t('admin.staff.leaveRequests.reject')}`}
                </button>
              </div>
              <label className="leave-detail-reject-label" htmlFor="reject-note">
                {t('admin.staff.leaveRequests.rejectReasonPlaceholder')}
              </label>
              <textarea
                id="reject-note"
                className="leave-detail-reject-input"
                rows={3}
                placeholder={t('admin.staff.leaveRequests.rejectReasonPlaceholder')}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {approveTarget && (
        <ApproveLeaveModal
          requestRow={approveTarget}
          onClose={() => setApproveTarget(null)}
          onSuccess={handleApproveSuccess}
        />
      )}
    </AdminPageShell>
  );
}
