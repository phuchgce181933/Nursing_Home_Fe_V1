import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBan, FaEye, FaPen, FaTrash } from 'react-icons/fa';
import {
  formatAssignmentDate,
  resolveShiftSummaryForDisplay,
  shiftStatusLabel,
} from './assignmentHelpers';
import '../../../../styles/admin/residentActionIcons.css';

export function useMinuteNow(enabled) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

export function Alert({ type, msg }) {
  if (!msg) return null;
  const styles = {
    success: { background: '#dcfce7', border: '1px solid #86efac', color: '#15803d' },
    error: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' },
    warning: { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' },
  };
  return (
    <div style={{ ...styles[type], borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontSize: '0.875rem' }}>
      {msg}
    </div>
  );
}

export function NonAssignableBadge() {
  const { t } = useTranslation();
  return <span className="shift-badge shift-badge--muted">{t('admin.staff.assignments.badges.nonAssignable')}</span>;
}

export function AssignmentViewIconButton({ title, onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="resident-icon-btn resident-icon-btn--view"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      <FaEye />
    </button>
  );
}

export function AssignmentSelectIconButton({ title, onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="resident-icon-btn resident-icon-btn--edit"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      <FaPen />
    </button>
  );
}

export function AssignmentSkipIconButton({ title, onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="resident-icon-btn resident-icon-btn--skip"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      <FaBan />
    </button>
  );
}

export function AssignmentDeleteIconButton({ title, onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="resident-icon-btn resident-icon-btn--delete"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      <FaTrash />
    </button>
  );
}

export function ShiftSummaryBadge({ summary, assignmentDate, displayNow, assignable = true }) {
  const { t } = useTranslation();
  if (!assignable) return <NonAssignableBadge />;
  if (!summary) return <span className="shift-badge shift-badge--muted">—</span>;
  const resolved = resolveShiftSummaryForDisplay(summary, assignmentDate, displayNow);
  if (resolved.onLeave) return <span className="shift-badge shift-badge--leave">{t('admin.staff.assignments.badges.onLeave')}</span>;
  if (resolved.hasShiftOnDate) {
    const shifts = resolved.shiftsOnDate || [];
    return (
      <div className="shift-badge-group">
        {shifts.map((sh) => (
          <span
            key={sh._id}
            className="shift-badge shift-badge--on"
            title={[sh.name, `${sh.startTime} – ${sh.endTime}`].filter(Boolean).join(' · ')}
          >
            {sh.startTime} – {sh.endTime}
          </span>
        ))}
      </div>
    );
  }
  return <span className="shift-badge shift-badge--off">{t('admin.staff.assignments.badges.noShift')}</span>;
}

export function ShiftDetailPanel({ summary, assignmentDate, displayNow }) {
  const { t, i18n } = useTranslation();
  if (!summary) return null;
  const resolved = resolveShiftSummaryForDisplay(summary, assignmentDate, displayNow);
  const dateLabel = assignmentDate || resolved.assignmentDate;
  return (
    <div className="shift-detail-panel">
      <div className="shift-detail-panel__title">
        {t('admin.staff.assignments.shiftDetail.title', {
          date: formatAssignmentDate(dateLabel, i18n.language),
        })}
      </div>
      {resolved.onLeave && (
        <p className="shift-detail-panel__hint shift-detail-panel__hint--warn">
          {t('admin.staff.assignments.shiftDetail.onLeaveHint')}
        </p>
      )}
      {!resolved.onLeave && resolved.shiftsOnDate?.length > 0 ? (
        <ul className="shift-detail-panel__list">
          {resolved.shiftsOnDate.map((sh) => (
            <li key={sh._id} className="shift-detail-panel__item">
              <span className="shift-detail-panel__name">{sh.name}</span>
              <span className="shift-detail-panel__time">{sh.startTime} – {sh.endTime}</span>
              <span className={`shift-status-tag shift-status-tag--${sh.status}`}>
                {shiftStatusLabel(t, sh.status)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        !resolved.onLeave && (
          <p className="shift-detail-panel__hint">{t('admin.staff.assignments.shiftDetail.noShiftsHint')}</p>
        )
      )}
    </div>
  );
}
