export default function StaffDeactivateModal({ staff, onConfirm, onClose, loading }) {
  if (!staff) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal staff-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="deactivate-modal__icon">⚠️</div>

        <h2 className="modal__title" style={{ color: '#dc2626' }}>Vô hiệu hóa tài khoản</h2>

        <p className="deactivate-modal__text">
          Bạn có chắc chắn muốn vô hiệu hóa tài khoản của{' '}
          <span className="deactivate-modal__name">{staff.fullName}</span>?
        </p>
        <p className="deactivate-modal__text" style={{ color: '#94a3b8', fontSize: '0.825rem' }}>
          Tài khoản sẽ bị khóa và nhân viên này không thể đăng nhập hệ thống.
          Thao tác này có thể được khôi phục bởi Admin.
        </p>

        <div className="modal__actions">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>Hủy</button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Xác nhận vô hiệu hóa'}
          </button>
        </div>
      </div>
    </div>
  );
}
