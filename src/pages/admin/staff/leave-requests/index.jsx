import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import leaveRequestService from '../../../../services/leaveRequest.service';
import ListPagination from '../../../../components/ui/ListPagination';
import useClientPagination from '../../../../hooks/useClientPagination';
import { calcInclusiveLeaveDays, formatLeaveDate } from '../../../../utils/leaveUtils';
import BlockingCareTasksAlert from '../../../../components/staff/BlockingCareTasksAlert';
import {
  conflictsFromError,
  sortConflicts,
  CONFLICT_ICON,
  getConflictLabel,
} from '../../../../constants/shiftConflicts';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import { resolveApiError } from '../../../../utils/apiMessage';
import '../../../../styles/admin/LeaveRequestAdminPage.css';

const STATUS_LABELS = (t, status) => {
  if (status === 'draft') return t('common.planStatus.draft');
  return t(`common.leaveStatus.${status}`, { defaultValue: status });
};
const TYPE_LABEL = (t, type) => t(`admin.staff.leaveRequests.types.${type}`, { defaultValue: type });
const ROLE_LABEL = (t, role) => t(`common.roles.${role}`, { defaultValue: role });
const SHIFT_STATUS_LABEL = (t, status) => {
  if (status === 'draft') return t('common.planStatus.draft');
  return t(`common.shiftStatus.${status}`, { defaultValue: status });
};

function replacementDisplay(replacement) {
  if (!replacement) return '—';
  const user = replacement.userId;
  const name = typeof user === 'object' ? user?.fullName : null;
  const code = replacement.staffCode;
  return [name, code ? `(${code})` : ''].filter(Boolean).join(' ') || '—';
}

function ApproveLeaveModal({ requestRow, onClose, onSuccess }) {
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
  }, [requestId]);

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
                          {c.blockingReasons?.length
                            ? `: ${c.blockingReasons.join('; ')}`
                            : ''}
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

export default function LeaveRequestAdminPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [reviewNotes, setNotes] = useState({});
  const [actionLoading, setActLoad] = useState(null);
  const [error, setError] = useState('');
  const [approveResult, setResult] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (filterStatus) params.status = filterStatus;
      const res = await leaveRequestService.getAll(params);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(resolveApiError(e, t, 'admin.staff.leaveRequests.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterStatus]);

  const filtered = requests.filter((r) => {
    const name = r.staffId?.fullName || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const {
    paginatedItems: paginatedRequests,
    page,
    setPage,
    totalPages,
    total: filteredTotal,
  } = useClientPagination(filtered);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, setPage]);

  const count = (s) => requests.filter((r) => r.status === s).length;

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
    setResult({
      type: 'success',
      msg: parts.join(' '),
      shifts: res.reassignedShifts?.shifts || [],
    });
    load();
  };

  const handleReject = async (id) => {
    const note = reviewNotes[id]?.trim();
    if (!note) {
      alert(t('admin.staff.leaveRequests.rejectReasonRequired'));
      return;
    }
    setActLoad(id + '_reject');
    try {
      await leaveRequestService.reject(id, note);
      setRequests((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: 'rejected', reviewNote: note } : r))
      );
    } catch (e) {
      alert(resolveApiError(e, t, 'admin.staff.leaveRequests.actionFailed'));
    } finally {
      setActLoad(null);
    }
  };

  return (
    <AdminPageShell
      title={t('admin.staff.leaveRequests.title')}
      subtitle={t('admin.staff.leaveRequests.subtitle')}
    >
      <div className="leave-stats">
        {[
          { s: 'pending', icon: '⏳', label: t('admin.staff.leaveRequests.statPending') },
          { s: 'approved', icon: '✅', label: t('admin.staff.leaveRequests.statApproved') },
          { s: 'rejected', icon: '❌', label: t('admin.staff.leaveRequests.statRejected') },
          { s: 'cancelled', icon: '🚫', label: t('admin.staff.leaveRequests.statCancelled') },
        ].map(({ s, icon, label }) => (
          <div
            key={s}
            className={`leave-stat leave-stat--${s}${filterStatus === s ? ' leave-stat--selected' : ''}`}
            onClick={() => setFilter(filterStatus === s ? '' : s)}
            onKeyDown={(e) => e.key === 'Enter' && setFilter(filterStatus === s ? '' : s)}
            role="button"
            tabIndex={0}
          >
            <div className="leave-stat__icon">{icon}</div>
            <div>
              <div className="leave-stat__value">{count(s)}</div>
              <div className="leave-stat__label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {approveResult && (
        <div className="leave-approve-toast">
          <span>✅ {approveResult.msg}</span>
          {approveResult.shifts?.length > 0 && (
            <ul>
              {approveResult.shifts.map((sh) => (
                <li key={sh.shiftId}>
                  {sh.name || t('admin.staff.leaveRequests.toast.shiftFallback')} — {formatLeaveDate(sh.workDate)}
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="leave-approve-toast__close" onClick={() => setResult(null)}>
            {t('common.close')}
          </button>
        </div>
      )}

      <div className="filter-row">
        <input
          type="search"
          placeholder={t('admin.staff.leaveRequests.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterStatus} onChange={(e) => setFilter(e.target.value)}>
          <option value="">{t('common.allStatuses')}</option>
          <option value="pending">{t('common.leaveStatus.pending')}</option>
          <option value="approved">{t('common.leaveStatus.approved')}</option>
          <option value="rejected">{t('common.leaveStatus.rejected')}</option>
          <option value="cancelled">{t('common.leaveStatus.cancelled')}</option>
        </select>
      </div>

      {error && <div className="leave-admin-error">{error}</div>}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('admin.staff.leaveRequests.colStaff')}</th>
              <th>{t('common.colRole')}</th>
              <th>{t('admin.staff.leaveRequests.colLeaveType')}</th>
              <th>{t('admin.staff.leaveRequests.colFrom')}</th>
              <th>{t('admin.staff.leaveRequests.colTo')}</th>
              <th>{t('admin.staff.leaveRequests.colDays')}</th>
              <th>{t('admin.staff.leaveRequests.colReason')}</th>
              <th>{t('admin.staff.leaveRequests.colReplacement')}</th>
              <th>{t('admin.staff.leaveRequests.colSubmitted')}</th>
              <th>{t('common.colStatus')}</th>
              <th>{t('admin.staff.leaveRequests.colReviewNote')}</th>
              <th>{t('common.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={12} className="empty-state">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="empty-state">
                  {t('admin.staff.leaveRequests.emptyList')}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedRequests.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 600 }}>{r.staffId?.fullName || '—'}</td>
                  <td>
                    <span className={`role-badge role-badge--${r.staffId?.role}`}>
                      {ROLE_LABEL(t, r.staffId?.role) || '—'}
                    </span>
                  </td>
                  <td>{TYPE_LABEL(t, r.type)}</td>
                  <td>{formatLeaveDate(r.startDate)}</td>
                  <td>{formatLeaveDate(r.endDate)}</td>
                  <td style={{ textAlign: 'center' }}>
                    {r.daysRequested ??
                      (r.startDate && r.endDate
                        ? calcInclusiveLeaveDays(
                            formatLeaveDate(r.startDate),
                            formatLeaveDate(r.endDate)
                          )
                        : '—')}
                  </td>
                  <td style={{ maxWidth: 160, fontSize: '0.8rem' }}>{r.reason}</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {replacementDisplay(r.replacementStaffProfileId)}
                  </td>
                  <td>{formatLeaveDate(r.createdAt)}</td>
                  <td>
                    <span className={`leave-status leave-status--${r.status}`}>
                      {STATUS_LABELS(t, r.status)}
                    </span>
                  </td>
                  <td>
                    {r.status === 'pending' ? (
                      <input
                        className="leave-review-input"
                        placeholder={t('admin.staff.leaveRequests.rejectReasonPlaceholder')}
                        value={reviewNotes[r._id] || ''}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [r._id]: e.target.value }))
                        }
                      />
                    ) : (
                      <span className="leave-review-note">{r.reviewNote || '—'}</span>
                    )}
                  </td>
                  <td className="leave-actions-cell">
                    <button
                      type="button"
                      className="action-btn action-btn--approve"
                      disabled={r.status !== 'pending' || !!actionLoading}
                      onClick={() => setApproveTarget(r)}
                    >
                      ✓ {t('admin.staff.leaveRequests.approve')}
                    </button>
                    <button
                      type="button"
                      className="action-btn action-btn--reject"
                      disabled={r.status !== 'pending' || !!actionLoading}
                      title={t('admin.staff.leaveRequests.rejectReasonTitle')}
                      onClick={() => handleReject(r._id)}
                    >
                      {actionLoading === r._id + '_reject' ? '...' : `✗ ${t('admin.staff.leaveRequests.reject')}`}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <ListPagination
          page={page}
          totalPages={totalPages}
          total={filteredTotal}
          onPageChange={setPage}
        />
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
