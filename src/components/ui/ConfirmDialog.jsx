import { useTranslation } from 'react-i18next';
import '../../styles/components/ConfirmDialog.css';

export default function ConfirmDialog({
  open,
  title,
  message,
  danger = true,
  loading = false,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="confirm-dialog-overlay"
      onClick={(e) => e.target === e.currentTarget && !loading && onCancel?.()}
    >
      <div className="confirm-dialog" role="alertdialog" aria-modal="true">
        <div className="confirm-dialog__title">{title || t('common.confirmDeleteTitle')}</div>
        <p className="confirm-dialog__message">{message || t('common.actionCannotBeUndone')}</p>
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="confirm-dialog__btn confirm-dialog__btn--secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            type="button"
            className={`confirm-dialog__btn ${danger ? 'confirm-dialog__btn--danger' : 'confirm-dialog__btn--primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t('common.confirming') : (confirmLabel || t('common.confirm'))}
          </button>
        </div>
      </div>
    </div>
  );
}
