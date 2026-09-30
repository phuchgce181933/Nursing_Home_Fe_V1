import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import '../../styles/admin/ConfirmModal.css';

/**
 * Reusable confirmation modal.
 *
 * Props:
 *  - open:            boolean — show/hide
 *  - title:           string
 *  - message:         ReactNode | string
 *  - details:         ReactNode | string (optional, rendered below message)
 *  - confirmLabel:    string (default "Xác nhận")
 *  - cancelLabel:     string (default "Hủy")
 *  - tone:            'danger' | 'warning' | 'info' (default 'warning')
 *  - busy:            boolean — disable buttons while async work is running
 *  - onConfirm():     Promise<void> | void
 *  - onClose():       void
 */
export default function ConfirmModal({
  open,
  title,
  message,
  details,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  tone = 'warning',
  busy = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  const handleConfirm = async () => {
    if (busy) return;
    try {
      const result = onConfirm && onConfirm();
      if (result && typeof result.then === 'function') {
        await result;
      }
    } catch (err) {
      // Let the parent handle errors via state — do not auto-close.
      return;
    }
    if (onClose) onClose();
  };

  const handleBackdrop = (e) => {
    if (busy) return;
    if (e.target === e.currentTarget && onClose) onClose();
  };

  return (
    <div className="confirm-modal-backdrop" onMouseDown={handleBackdrop}>
      <div className={`confirm-modal-card tone-${tone}`} role="dialog" aria-modal="true">
        <button
          type="button"
          className="confirm-modal-close"
          onClick={onClose}
          disabled={busy}
          aria-label="Đóng"
        >
          <X size={18} />
        </button>
        <div className="confirm-modal-icon">
          <AlertTriangle size={28} />
        </div>
        <h3 className="confirm-modal-title">{title}</h3>
        {message && <div className="confirm-modal-message">{message}</div>}
        {details && <div className="confirm-modal-details">{details}</div>}
        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-modal-btn confirm-modal-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-modal-btn confirm-modal-btn-primary tone-${tone}`}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
