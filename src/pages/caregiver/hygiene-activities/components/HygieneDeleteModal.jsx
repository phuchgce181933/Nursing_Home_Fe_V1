function HygieneDeleteModal({ open, recordSummary, deleting, error, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div className="hygiene-page__modal-overlay" onClick={deleting ? undefined : onClose}>
      <div
        className="hygiene-page__modal hygiene-page__modal--sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="hygiene-page__modal-header">
          <h3 className="hygiene-page__modal-title">Xóa ghi nhận vệ sinh</h3>
          <button type="button" className="hygiene-page__modal-close" onClick={onClose} disabled={deleting}>
            ×
          </button>
        </div>
        <div className="hygiene-page__modal-body">
          <p>Bạn có chắc muốn xóa ghi nhận sau?</p>
          <p className="hygiene-page__delete-summary">{recordSummary || '—'}</p>
          {error && <p className="form-error">{error}</p>}
          <div className="hygiene-page__actions">
            <button type="button" className="btn btn--delete" disabled={deleting} onClick={onConfirm}>
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </button>
            <button type="button" className="btn-secondary" disabled={deleting} onClick={onClose}>
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HygieneDeleteModal;
