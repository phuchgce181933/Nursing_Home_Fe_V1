import { useTranslation } from 'react-i18next';
import {
  formatExpertiseLabel,
  formatResponsibleFloorLabels,
  resolveStaffCode,
  resolveStaffPhone,
} from '../../../../utils/staffAvailabilityDisplay';

function DetailRow({ label, children }) {
  return (
    <div className="emergency-detail-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function EmergencyStaffDetailModal({
  person,
  readinessConfig,
  checkDateLabel,
  floorById: areaLookup,
  onClose,
}) {
  const { t } = useTranslation();

  if (!person) return null;

  const cfg = readinessConfig;
  const phone = resolveStaffPhone(person);
  const staffCode = resolveStaffCode(person);

  const formatShiftLine = () => {
    const shift = person.currentShift;
    if (!shift) return t('admin.staff.emergency.detailModal.noShiftOnDate');

    const prefix = person.isOnShift
      ? t('admin.staff.emergency.detailModal.shiftOnDuty')
      : t('admin.staff.emergency.detailModal.shiftHasShift');
    const name = shift.name ? `${shift.name} · ` : '';
    const time = `${shift.startTime}–${shift.endTime}`;
    const status = shift.status
      ? ` (${t(`common.shiftStatus.${shift.status}`, { defaultValue: shift.status })})`
      : '';
    return `${prefix}${name}${time}${status}`;
  };

  const taskLabel = person.hasTasks
    ? t('admin.staff.emergency.detailModal.hasTasksToday')
    : t('admin.staff.emergency.detailModal.noTasks');

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal emergency-detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="emergency-staff-detail-title"
      >
        <div className="emergency-detail-modal__header">
          <div className="emergency-detail-modal__identity">
            {person.avatarUrl ? (
              <img src={person.avatarUrl} alt="" className="staff-avatar staff-avatar--lg" />
            ) : (
              <div className="staff-avatar staff-avatar--lg staff-avatar--placeholder" />
            )}
            <div>
              <h2 id="emergency-staff-detail-title" className="modal__title">
                {person.fullName}
              </h2>
              <div className="emergency-detail-modal__badges">
                <span className={`role-badge role-badge--${person.role}`}>
                  {t(`common.roles.${person.role}`, { defaultValue: person.role })}
                </span>
                <span className={`avail-badge avail-badge--${cfg.badge}`}>
                  <span className={`avail-dot avail-dot--${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {checkDateLabel && (
          <p
            className="emergency-detail-modal__date-hint"
            dangerouslySetInnerHTML={{
              __html: t('admin.staff.emergency.detailModal.statusByDate', { date: checkDateLabel }),
            }}
          />
        )}

        <dl className="emergency-detail-modal__grid">
          <DetailRow label={t('admin.staff.emergency.detailModal.staffCode')}>{staffCode || '—'}</DetailRow>
          <DetailRow label={t('admin.staff.emergency.detailModal.expertise')}>{formatExpertiseLabel(person)}</DetailRow>
          <DetailRow label={t('admin.staff.emergency.detailModal.phone')}>
            {phone ? (
              <a href={`tel:${phone}`} className="emergency-detail-modal__phone">
                {phone}
              </a>
            ) : (
              '—'
            )}
          </DetailRow>
          {person.email && (
            <DetailRow label={t('admin.staff.emergency.detailModal.email')}>
              <a href={`mailto:${person.email}`} className="emergency-detail-modal__email">
                {person.email}
              </a>
            </DetailRow>
          )}
          <DetailRow label={t('admin.staff.emergency.detailModal.floors')}>
            {formatResponsibleFloorLabels(person, t, areaLookup)}
          </DetailRow>
          <DetailRow label={t('admin.staff.emergency.detailModal.currentShift')}>{formatShiftLine()}</DetailRow>
          <DetailRow label={t('admin.staff.emergency.detailModal.tasks')}>
            <span className={person.hasTasks ? 'task-active' : 'task-inactive'}>
              {taskLabel}
            </span>
          </DetailRow>
          <DetailRow label={t('admin.staff.emergency.detailModal.onLeave')}>
            <span className={person.onLeave ? 'leave-active' : 'leave-inactive'}>
              {person.onLeave
                ? t('admin.staff.emergency.detailModal.onLeaveActive')
                : t('admin.staff.emergency.detailModal.notOnLeave')}
            </span>
          </DetailRow>
        </dl>

        <div className="modal__actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
