function BehaviorDeleteModal({ open, recordSummary, deleting, error, onClose, onConfirm }) {
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
          <h3 className="behavior-page__modal-title">Xóa ghi nhận hành vi</h3>
          <button type="button" className="behavior-page__modal-close" onClick={onClose} disabled={deleting}>
            ×
          </button>
        </div>
        <div className="behavior-page__modal-body">
          <p>Bạn có chắc muốn xóa bản ghi này?</p>
          <p className="behavior-page__delete-summary">{recordSummary || '—'}</p>
          {error && <p className="form-error">{error}</p>}
          <div className="behavior-page__actions">
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

export default BehaviorDeleteModal;
