import { useTranslation } from 'react-i18next';

function BehaviorDeleteModal({ open, recordSummary, deleting, error, onClose, onConfirm }) {
  const { t } = useTranslation();
  const ns = 'caregiver';

  if (!open) return null;

  return (
    <div className="behavior-page__modal-overlay" onClick={deleting ? undefined : onClose}>
      <div
        className="behavior-page__modal behavior-page__modal--sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="behavior-page__modal-header">
          <h3 className="behavior-page__modal-title">{t(`${ns}.dailyBehaviors.deleteModal.title`)}</h3>
          <button type="button" className="behavior-page__modal-close" onClick={onClose} disabled={deleting}>
            ×
          </button>
        </div>
        <div className="behavior-page__modal-body">
          <p>{t(`${ns}.dailyBehaviors.deleteModal.confirm`)}</p>
          <p className="behavior-page__delete-summary">{recordSummary || '—'}</p>
          {error && <p className="form-error">{error}</p>}
          <div className="behavior-page__actions">
            <button type="button" className="btn btn--delete" disabled={deleting} onClick={onConfirm}>
              {deleting ? t(`${ns}.common.deleting`) : t('common.delete')}
            </button>
            <button type="button" className="btn-secondary" disabled={deleting} onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BehaviorDeleteModal;
