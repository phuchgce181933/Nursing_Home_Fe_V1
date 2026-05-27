import { useState } from 'react';

export default function StaffBanModal({ staff, onBan, onUnban, onClose, loading }) {
  const [banReason, setBanReason] = useState('');

  if (!staff) return null;

  const isBanned = staff.isBanned;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>

        <div className={`deactivate-modal__icon ${isBanned ? 'deactivate-modal__icon--unban' : ''}`}>
          {isBanned ? '🔓' : '🚫'}
        </div>

        <h2 className="modal__title" style={{ color: isBanned ? '#15803d' : '#dc2626' }}>
          {isBanned ? 'Gỡ ban tài khoản' : 'Ban tài khoản'}
        </h2>

        {isBanned ? (
          <>
            <p className="deactivate-modal__text">
              Xác nhận gỡ ban cho{' '}
              <span className="deactivate-modal__name">{staff.fullName}</span>?
            </p>
            <p className="deactivate-modal__text" style={{ color: '#94a3b8', fontSize: '0.825rem' }}>
              Tài khoản sẽ được khôi phục và nhân viên có thể đăng nhập lại.
            </p>
            {staff.banReason && (
              <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: 8 }}>
                Lý do bị ban: <em>{staff.banReason}</em>
              </p>
            )}
            <div className="modal__actions">
              <button className="btn-cancel" onClick={onClose} disabled={loading}>Hủy</button>
              <button
                style={{ padding: '8px 20px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: '#16a34a', color: '#fff' }}
                onClick={() => onUnban(staff._id)}
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Xác nhận gỡ ban'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="deactivate-modal__text">
              Bạn có chắc muốn ban tài khoản của{' '}
              <span className="deactivate-modal__name">{staff.fullName}</span>?
            </p>
            <p className="deactivate-modal__text" style={{ color: '#94a3b8', fontSize: '0.825rem' }}>
              Nhân viên này sẽ không thể đăng nhập hệ thống. Có thể gỡ ban bất kỳ lúc nào.
            </p>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label>Lý do ban (tùy chọn)</label>
              <input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Vi phạm nội quy, lý do khác..."
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }}
              />
            </div>
            <div className="modal__actions">
              <button className="btn-cancel" onClick={onClose} disabled={loading}>Hủy</button>
              <button className="btn-danger" onClick={() => onBan(staff._id, banReason)} disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Xác nhận ban'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
