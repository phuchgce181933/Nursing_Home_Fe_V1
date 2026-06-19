import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function StaffBanModal({ staff, onBan, onUnban, onClose, loading }) {
  const { t } = useTranslation();
  const [banReason, setBanReason] = useState('');

  if (!staff) return null;

  const isBanned = staff.isBanned;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal staff-profile-modal" onClick={(e) => e.stopPropagation()}>

        <div className={`deactivate-modal__icon ${isBanned ? 'deactivate-modal__icon--unban' : ''}`}>
          {isBanned ? '🔓' : '🚫'}
        </div>

        <h2 className="modal__title" style={{ color: isBanned ? '#15803d' : '#dc2626' }}>
          {isBanned ? t('admin.staff.profiles.unbanTitle') : t('admin.staff.profiles.banTitle')}
        </h2>

        {isBanned ? (
          <>
            <p className="deactivate-modal__text">
              {t('admin.staff.profiles.unbanConfirm', { name: staff.fullName })}
            </p>
            <p className="deactivate-modal__text" style={{ color: '#94a3b8', fontSize: '0.825rem' }}>
              {t('admin.staff.profiles.unbanHint')}
            </p>
            {staff.banReason && (
              <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: 8 }}>
                {t('admin.staff.profiles.previousBanReason')} <em>{staff.banReason}</em>
              </p>
            )}
            <div className="modal__actions">
              <button className="btn-cancel" onClick={onClose} disabled={loading}>{t('common.cancel')}</button>
              <button
                style={{ padding: '8px 20px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: '#16a34a', color: '#fff' }}
                onClick={() => onUnban(staff._id)}
                disabled={loading}
              >
                {loading ? t('admin.staff.profiles.processing') : t('admin.staff.profiles.confirmUnban')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="deactivate-modal__text">
              {t('admin.staff.profiles.banConfirm', { name: staff.fullName })}
            </p>
            <p className="deactivate-modal__text" style={{ color: '#94a3b8', fontSize: '0.825rem' }}>
              {t('admin.staff.profiles.banHint')}
            </p>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label>{t('admin.staff.profiles.banReasonOptional')}</label>
              <input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder={t('admin.staff.profiles.banReasonPlaceholder')}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }}
              />
            </div>
            <div className="modal__actions">
              <button className="btn-cancel" onClick={onClose} disabled={loading}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={() => onBan(staff._id, banReason)} disabled={loading}>
                {loading ? t('admin.staff.profiles.processing') : t('admin.staff.profiles.confirmBan')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
