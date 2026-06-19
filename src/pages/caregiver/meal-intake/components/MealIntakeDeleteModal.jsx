import { useTranslation } from 'react-i18next';

function MealIntakeDeleteModal({ open, recordSummary, deleting, error, onClose, onConfirm }) {
  const { t } = useTranslation();
  const ns = 'caregiver';

  if (!open) return null;

  return (
    <div className="meal-intake-page__modal-overlay" onClick={deleting ? undefined : onClose}>
      <div className="meal-intake-page__modal meal-intake-page__modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="meal-intake-page__modal-header">
          <h3 className="meal-intake-page__modal-title">{t(`${ns}.mealIntake.deleteModal.title`)}</h3>
          <button type="button" className="meal-intake-page__modal-close" onClick={onClose} disabled={deleting}>
            ×
          </button>
        </div>
        <div className="meal-intake-page__modal-body">
          <p>{t(`${ns}.mealIntake.deleteModal.confirm`)}</p>
          <p className="meal-intake-page__delete-summary">{recordSummary || '—'}</p>
          {error && <p className="form-error">{error}</p>}
          <div className="meal-intake-page__actions">
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

export default MealIntakeDeleteModal;
