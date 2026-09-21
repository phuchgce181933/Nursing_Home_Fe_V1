import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import leaveRequestService from '../../../../services/leaveRequest.service';
import BlockingCareTasksAlert from '../../../../components/staff/BlockingCareTasksAlert';
import {
  conflictsFromError,
  sortConflicts,
  CONFLICT_ICON,
  getConflictLabel,
} from '../../../../constants/shiftConflicts';
import { resolveApiError } from '../../../../utils/apiMessage';
import { formatLeaveDate } from '../../../../utils/leaveUtils';
import {
  ROLE_LABEL,
  SHIFT_STATUS_LABEL,
  TYPE_LABEL,
} from './leaveRequestHelpers';

export default function ApproveLeaveModal({ requestRow, onClose, onSuccess }) {
  const { t } = useTranslation();
  const requestId = requestRow._id;
  const [loading, setLoading] = useState(true);
  const [candidatesData, setCandidatesData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [replacementId, setReplacementId] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [blockingTasks, setBlockingTasks] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    leaveRequestService
      .getReplacementCandidates(requestId)
      .then((data) => {
        if (!cancelled) setCandidatesData(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(resolveApiError(e, t, 'admin.staff.leaveRequests.approveModal.loadCandidatesFailed'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, t]);

  const shiftsToCover = candidatesData?.shiftsToCover ?? [];
  const needsReplacement = shiftsToCover.length > 0;
  const eligibleCandidates = (candidatesData?.candidates ?? []).filter((c) => c.eligible);
  const ineligibleCandidates = (candidatesData?.candidates ?? []).filter((c) => !c.eligible);

  const handleSubmit = async () => {
    setSubmitError('');
    setConflicts([]);
    setBlockingTasks([]);

    if (needsReplacement && !replacementId) {
      setSubmitError(t('admin.staff.leaveRequests.approveModal.selectReplacementError'));
      return;
    }

    setSaving(true);
    try {
      const res = await leaveRequestService.approve(requestId, {
        reviewNote: reviewNote.trim(),
        replacementStaffProfileId: needsReplacement ? replacementId : undefined,
      });
      onSuccess(res);
      onClose();
    } catch (e) {
      const data = e.response?.data || {};
      setSubmitError(resolveApiError(e, t, 'admin.staff.leaveRequests.approveModal.approveFailed'));
      setConflicts(conflictsFromError(e));
      setBlockingTasks(Array.isArray(data.blockingTasks) ? data.blockingTasks : []);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="leave-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="leave-modal"
        role="dialog"
        aria-labelledby="approve-leave-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="approve-leave-title" className="leave-modal__title">
          {t('admin.staff.leaveRequests.approveModal.title')}
        </h2>
        <p className="leave-modal__subtitle">
          <strong>{requestRow.staffId?.fullName}</strong>
          {' · '}
          {TYPE_LABEL(t, requestRow.type)}
          {' · '}
          {formatLeaveDate(requestRow.startDate)} → {formatLeaveDate(requestRow.endDate)}
        </p>

        {loading && <p className="leave-modal__hint">{t('admin.staff.leaveRequests.approveModal.loading')}</p>}
        {loadError && <p className="leave-modal__error">{loadError}</p>}

        {!loading && !loadError && (
          <>
            {needsReplacement ? (
              <div className="leave-modal__section">
                <h3 className="leave-modal__section-title">
                  {t('admin.staff.leaveRequests.approveModal.shiftsToCover', { count: shiftsToCover.length })}
                </h3>
                <ul className="leave-modal__shift-list">
                  {shiftsToCover.map((sh) => (
                    <li key={sh._id}>
                      <strong>{formatLeaveDate(sh.workDate)}</strong>
                      {' · '}
                      {sh.name} ({sh.startTime}–{sh.endTime})
                      {' · '}
                      {SHIFT_STATUS_LABEL(t, sh.status)}
                    </li>
                  ))}
                </ul>
                <p className="leave-modal__hint leave-modal__hint--warn">
                  {t('admin.staff.leaveRequests.approveModal.replacementRequired', {
                    role: ROLE_LABEL(t, requestRow.staffId?.role),
                  })}
                </p>

                <label className="leave-modal__label" htmlFor="replacement-select">
                  {t('admin.staff.leaveRequests.approveModal.replacementLabel')}
                </label>
                <select
                  id="replacement-select"
                  className="leave-modal__select"
                  value={replacementId}
                  onChange={(e) => setReplacementId(e.target.value)}
                  disabled={eligibleCandidates.length === 0}
                >
                  <option value="">
                    {eligibleCandidates.length
                      ? t('admin.staff.leaveRequests.approveModal.selectStaff')
                      : t('admin.staff.leaveRequests.approveModal.noEligibleCandidates')}
                  </option>
                  {eligibleCandidates.map((c) => (
                    <option key={c.staffProfileId} value={c.staffProfileId}>
                      {c.fullName || '—'}
                      {c.staffCode ? ` (${c.staffCode})` : ''}
                      {c.role ? ` · ${ROLE_LABEL(t, c.role)}` : ''}
                    </option>
                  ))}
                </select>

                {ineligibleCandidates.length > 0 && (
                  <details className="leave-modal__ineligible">
                    <summary>
                      {t('admin.staff.leaveRequests.approveModal.ineligible', { count: ineligibleCandidates.length })}
                    </summary>
                    <ul>
                      {ineligibleCandidates.map((c) => (
                        <li key={c.staffProfileId}>
                          <strong>{c.fullName}</strong>
                          {c.blockingReasons?.length ? `: ${c.blockingReasons.join('; ')}` : ''}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ) : (
              <p className="leave-modal__hint">
                {t('admin.staff.leaveRequests.approveModal.noShiftsHint')}
              </p>
            )}

            <label className="leave-modal__label" htmlFor="approve-review-note">
              {t('admin.staff.leaveRequests.approveModal.reviewNote')}
            </label>
            <textarea
              id="approve-review-note"
              className="leave-modal__textarea"
              rows={2}
              placeholder={t('admin.staff.leaveRequests.approveModal.reviewNotePlaceholder')}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
          </>
        )}

        {blockingTasks.length > 0 && (
          <BlockingCareTasksAlert
            message={submitError}
            tasks={blockingTasks}
            hint={t('admin.staff.leaveRequests.approveModal.blockingHint')}
          />
        )}
        {submitError && !blockingTasks.length && (
          <p className="leave-modal__error">{submitError}</p>
        )}
        {conflicts.length > 0 && (
          <div className="leave-modal__conflicts">
            <p className="leave-modal__conflicts-title">{t('admin.staff.leaveRequests.approveModal.conflictsTitle')}</p>
            {sortConflicts(conflicts).map((c, i) => (
              <div key={`${c.type}-${i}`} className={`leave-modal__conflict leave-modal__conflict--${c.severity?.toLowerCase()}`}>
                {CONFLICT_ICON[c.severity]} <strong>{getConflictLabel(c.type, t)}</strong>
                {c.message ? ` — ${c.message}` : ''}
              </div>
            ))}
          </div>
        )}

        <div className="leave-modal__actions">
          <button type="button" className="leave-modal__btn leave-modal__btn--ghost" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="leave-modal__btn leave-modal__btn--primary"
            onClick={handleSubmit}
            disabled={saving || loading || !!loadError || (needsReplacement && eligibleCandidates.length === 0)}
          >
            {saving ? t('common.confirming') : t('admin.staff.leaveRequests.approveModal.confirmApprove')}
          </button>
        </div>
      </div>
    </div>
  );
}
