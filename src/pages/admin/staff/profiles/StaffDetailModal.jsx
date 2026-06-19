import { useTranslation } from 'react-i18next';

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || '—'}</span>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="detail-section">
      <h3 className="detail-section__title">{title}</h3>
      {children}
    </section>
  );
}

function fmt(date, locale) {
  if (!date) return null;
  return new Date(date).toLocaleDateString(locale);
}

function fmtDatetime(date, locale) {
  if (!date) return null;
  return new Date(date).toLocaleString(locale);
}

export default function StaffDetailModal({ staff, onClose, onEdit, canEdit = true }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US';

  if (!staff) return null;

  const profile = staff.staffProfile || {};
  const areas = profile.responsibleAreaIds || [];
  const rooms = profile.responsibleRoomIds || [];
  const residents = profile.assignedResidentIds || [];

  const roleLabel = t(`common.roles.${staff.role}`, { defaultValue: staff.role });
  const genderLabel = staff.gender
    ? t(`common.gender.${staff.gender}`, { defaultValue: staff.gender })
    : null;

  const statusLabel = staff.isBanned
    ? t('admin.staff.profiles.statusBannedLong')
    : staff.isActive
      ? t('admin.staff.profiles.statusActiveLong')
      : t('admin.staff.profiles.statusInactiveLong');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--wide staff-detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="staff-detail-title"
      >
        <div className="staff-detail-modal__body">
          <div className="detail-header">
            <div className="detail-avatar">
              {staff.avatarUrl
                ? <img src={staff.avatarUrl} alt="" className="detail-avatar__img" />
                : <span className="detail-avatar__initials">{staff.fullName?.charAt(0) || '?'}</span>}
            </div>
            <div>
              <h2 id="staff-detail-title" className="modal__title">{staff.fullName}</h2>
              <div className="detail-header__meta">
                <span className={`role-badge role-badge--${staff.role}`}>
                  {roleLabel}
                </span>
                <span className={`status-badge status-badge--${staff.isBanned ? 'banned' : staff.isActive ? 'active' : 'inactive'}`}>
                  {statusLabel}
                </span>
              </div>
              {staff.isBanned && staff.banReason && (
                <p className="detail-header__ban">{t('admin.staff.profiles.banReason', { reason: staff.banReason })}</p>
              )}
            </div>
          </div>

          <div className="detail-grid">
            <div>
              <DetailSection title={t('admin.staff.profiles.sectionPersonalInfo')}>
                <DetailRow label={t('admin.staff.profiles.colEmail')} value={staff.email} />
                <DetailRow label={t('admin.staff.profiles.labelUsername')} value={staff.username} />
                <DetailRow label={t('admin.staff.profiles.labelPhone')} value={staff.phone} />
                <DetailRow label={t('admin.staff.profiles.labelGender')} value={genderLabel} />
                <DetailRow label={t('admin.staff.profiles.labelDateOfBirth')} value={fmt(staff.dateOfBirth, locale)} />
                <DetailRow label={t('admin.staff.profiles.labelAddress')} value={staff.address} />
              </DetailSection>

              <DetailSection title={t('admin.staff.profiles.sectionAccountInfo')}>
                <DetailRow label={t('admin.staff.profiles.labelCreatedAt')} value={fmtDatetime(staff.createdAt, locale)} />
                <DetailRow label={t('admin.staff.profiles.labelLastLogin')} value={fmtDatetime(staff.lastLoginAt, locale)} />
              </DetailSection>
            </div>

            <div>
              <DetailSection title={t('admin.staff.profiles.sectionProfessionalInfo')}>
                <DetailRow label={t('admin.staff.profiles.labelStaffCode')} value={profile.staffCode} />
                <DetailRow label={t('admin.staff.profiles.labelSystemRole')} value={roleLabel} />
                <DetailRow label={t('admin.staff.profiles.labelSpecialty')} value={profile.specialty} />
                <DetailRow
                  label={t('admin.staff.profiles.labelCertifications')}
                  value={profile.certifications?.length ? profile.certifications.join(', ') : null}
                />
              </DetailSection>

              <DetailSection title={t('admin.staff.profiles.sectionAssignments')}>
                <DetailRow
                  label={t('admin.staff.profiles.labelResponsibleFloors')}
                  value={
                    areas.length
                      ? areas.map((a) => (typeof a === 'object' ? a.name || a.floorNumber || a._id : a)).join(', ')
                      : null
                  }
                />
                <DetailRow
                  label={t('admin.staff.profiles.labelResponsibleRooms')}
                  value={
                    rooms.length
                      ? rooms.map((r) => (typeof r === 'object' ? r.name || r.roomNumber || r._id : r)).join(', ')
                      : null
                  }
                />
                <DetailRow
                  label={t('admin.staff.profiles.labelAssignedResidents')}
                  value={residents.length ? t('admin.staff.profiles.assignedResidentsCount', { count: residents.length }) : null}
                />
              </DetailSection>
            </div>
          </div>
        </div>

        <div className="modal__actions">
          <button type="button" className="btn-cancel" onClick={onClose}>{t('common.close')}</button>
          {canEdit && (
            <button
              type="button"
              className="btn-save"
              onClick={() => { onClose(); onEdit(staff); }}
            >
              {t('common.edit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
