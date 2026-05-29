import {
  formatExpertiseLabel,
  formatResponsibleFloorLabels,
  formatTaskSummary,
  resolveStaffCode,
  resolveStaffPhone,
} from '../../../../utils/staffAvailabilityDisplay';

const ROLE_LABELS = { doctor: 'Bác sĩ', nurse: 'Y tá' };
const SHIFT_STATUS_VI = { published: 'Đã đăng', confirmed: 'Đã xác nhận' };

function DetailRow({ label, children }) {
  return (
    <div className="emergency-detail-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function formatShiftLine(person) {
  const shift = person.currentShift;
  if (!shift) return '— Không có ca trong ngày đã chọn';

  const prefix = person.isOnShift ? 'Đang trực · ' : 'Có ca · ';
  const name = shift.name ? `${shift.name} · ` : '';
  const time = `${shift.startTime}–${shift.endTime}`;
  const status = shift.status ? ` (${SHIFT_STATUS_VI[shift.status] || shift.status})` : '';
  return `${prefix}${name}${time}${status}`;
}

export default function EmergencyStaffDetailModal({
  person,
  readinessConfig,
  checkDateLabel,
  onClose,
}) {
  if (!person) return null;

  const cfg = readinessConfig;
  const phone = resolveStaffPhone(person);
  const staffCode = resolveStaffCode(person);

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
                  {ROLE_LABELS[person.role] || person.role}
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
          <p className="emergency-detail-modal__date-hint">
            Trạng thái theo ngày: <strong>{checkDateLabel}</strong>
          </p>
        )}

        <dl className="emergency-detail-modal__grid">
          <DetailRow label="Mã nhân viên">{staffCode || '—'}</DetailRow>
          <DetailRow label="Chuyên môn">{formatExpertiseLabel(person)}</DetailRow>
          <DetailRow label="Số điện thoại">
            {phone ? (
              <a href={`tel:${phone}`} className="emergency-detail-modal__phone">
                {phone}
              </a>
            ) : (
              '—'
            )}
          </DetailRow>
          {person.email && (
            <DetailRow label="Email">
              <a href={`mailto:${person.email}`} className="emergency-detail-modal__email">
                {person.email}
              </a>
            </DetailRow>
          )}
          <DetailRow label="Tầng phụ trách">{formatResponsibleFloorLabels(person)}</DetailRow>
          <DetailRow label="Ca hiện tại">{formatShiftLine(person)}</DetailRow>
          <DetailRow label="Nhiệm vụ">
            <span className={person.hasTasks ? 'task-active' : 'task-inactive'}>
              {formatTaskSummary(person) === 'Có nhiệm vụ'
                ? '✓ Có nhiệm vụ trong ngày'
                : '— Không có nhiệm vụ'}
            </span>
          </DetailRow>
          <DetailRow label="Nghỉ phép">
            <span className={person.onLeave ? 'leave-active' : 'leave-inactive'}>
              {person.onLeave ? '✓ Đang nghỉ phép' : '— Không nghỉ'}
            </span>
          </DetailRow>
        </dl>

        <div className="modal__actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
