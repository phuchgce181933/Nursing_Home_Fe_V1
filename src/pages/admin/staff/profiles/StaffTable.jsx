import { useTranslation } from 'react-i18next';
import { STAFF_ROLE_LABELS } from '../../../../constants/rolePolicy';

function StatusBadge({ s, t }) {
  if (s.isBanned) return <span className="status-badge status-badge--banned">{t('admin.staff.profiles.statusBanned')}</span>;
  if (!s.isActive) return <span className="status-badge status-badge--inactive">{t('admin.staff.profiles.statusInactive')}</span>;
  return <span className="status-badge status-badge--active">{t('admin.staff.profiles.statusActive')}</span>;
}

export default function StaffTable({ staff, loading, onView, onEdit, onBan, canManage }) {
  const { t } = useTranslation();

  return (
    <div className="resident-page__table">
      <table className="resident-page__table-element">
        <thead>
          <tr className="resident-page__table-header">
            <th>{t('admin.staff.profiles.colStaffCode')}</th>
            <th>{t('common.colFullName')}</th>
            <th>{t('admin.staff.profiles.colEmail')}</th>
            <th>{t('admin.staff.profiles.colPhone')}</th>
            <th>{t('common.colRole')}</th>
            <th>{t('admin.staff.profiles.colSpecialty')}</th>
            <th>{t('common.colStatus')}</th>
            <th>{t('common.colActions')}</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={8} className="resident-page__empty">{t('common.loading')}</td>
            </tr>
          )}
          {!loading && staff.length === 0 && (
            <tr>
              <td colSpan={8} className="resident-page__empty">{t('admin.staff.profiles.emptyList')}</td>
            </tr>
          )}
          {!loading && staff.map((s) => {
            const manageable = canManage ? canManage(s) : true;
            return (
            <tr key={s._id} className="resident-page__table-row">
              <td>{s.staffProfile?.staffCode || '—'}</td>
              <td>
                <div className="resident-page__name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {s.avatarUrl && (
                    <img
                      src={s.avatarUrl}
                      alt=""
                      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  )}
                  <strong>{s.fullName}</strong>
                </div>
              </td>
              <td>{s.email}</td>
              <td>{s.phone || '—'}</td>
              <td>
                <span className={`role-badge role-badge--${s.role}`}>
                  {STAFF_ROLE_LABELS[s.role] || t(`common.roles.${s.role}`, { defaultValue: s.role })}
                </span>
              </td>
              <td>{s.staffProfile?.specialty || '—'}</td>
              <td>
                <StatusBadge s={s} t={t} />
              </td>
              <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="resident-page__action"
                  onClick={() => onView(s)}
                >
                  {t('common.view')}
                </button>
                  <button
                  type="button"
                  className="resident-page__action"
                  style={s.isBanned ? undefined : { background: 'rgba(220, 38, 38, 0.12)', color: '#b91c1c' }}
                  onClick={() => onBan(s)}
                  disabled={!manageable}
                  title={!manageable ? t('admin.staff.profiles.banNoPermission') : undefined}
                >
                  {s.isBanned ? t('admin.staff.profiles.unban') : t('admin.staff.profiles.ban')}
                </button>
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
