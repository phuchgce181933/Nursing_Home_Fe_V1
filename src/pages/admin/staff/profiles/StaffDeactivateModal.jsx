import { useTranslation } from 'react-i18next';

export default function StaffDeactivateModal({ staff, onConfirm, onClose, loading }) {
  const { t } = useTranslation();

  if (!staff) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal staff-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="deactivate-modal__icon">⚠️</div>

        <h2 className="modal__title" style={{ color: '#dc2626' }}>{t('admin.staff.profiles.deactivateTitle')}</h2>

        <p className="deactivate-modal__text">
          {t('admin.staff.profiles.deactivateConfirm', { name: staff.fullName })}
        </p>
        <p className="deactivate-modal__text" style={{ color: '#94a3b8', fontSize: '0.825rem' }}>
          {t('admin.staff.profiles.deactivateHint')}
        </p>

        <div className="modal__actions">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>{t('common.cancel')}</button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? t('admin.staff.profiles.processing') : t('admin.staff.profiles.confirmDeactivate')}
          </button>
        </div>
      </div>
    </div>
  );
}
