function MealIntakeDeleteModal({ open, recordSummary, deleting, error, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div className="meal-intake-page__modal-overlay" onClick={deleting ? undefined : onClose}>
      <div className="meal-intake-page__modal meal-intake-page__modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="meal-intake-page__modal-header">
          <h3 className="meal-intake-page__modal-title">Xóa ghi nhận bữa ăn</h3>
          <button type="button" className="meal-intake-page__modal-close" onClick={onClose} disabled={deleting}>
            ×
          </button>
        </div>
        <div className="meal-intake-page__modal-body">
          <p>Bạn có chắc muốn xóa ghi nhận sau?</p>
          <p className="meal-intake-page__delete-summary">{recordSummary || '—'}</p>
          {error && <p className="form-error">{error}</p>}
          <div className="meal-intake-page__actions">
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

export default MealIntakeDeleteModal;
