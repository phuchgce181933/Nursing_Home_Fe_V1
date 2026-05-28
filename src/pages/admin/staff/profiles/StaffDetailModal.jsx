const ROLE_LABELS = {
  doctor: 'Bác sĩ', nurse: 'Y tá', staff: 'Chăm sóc viên',
  manager: 'Quản lý', admin: 'Admin',
};
const GENDER_LABELS = { male: 'Nam', female: 'Nữ', other: 'Khác', unknown: 'Không rõ' };

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || '—'}</span>
    </div>
  );
}

function fmt(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN');
}

function fmtDatetime(date) {
  if (!date) return null;
  return new Date(date).toLocaleString('vi-VN');
}

export default function StaffDetailModal({ staff, onClose, onEdit, canEdit = true }) {
  if (!staff) return null;

  const profile = staff.staffProfile || {};
  const areas = profile.responsibleAreaIds || [];
  const rooms = profile.responsibleRoomIds || [];
  const residents = profile.assignedResidentIds || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide modal--scroll" onClick={(e) => e.stopPropagation()}>

        {/* Header: avatar + tên + trạng thái */}
        <div className="detail-header">
          <div className="detail-avatar">
            {staff.avatarUrl
              ? <img src={staff.avatarUrl} alt="avatar" className="detail-avatar__img" />
              : <span className="detail-avatar__initials">{staff.fullName?.charAt(0) || '?'}</span>}
          </div>
          <div>
            <h2 className="modal__title" style={{ margin: 0, fontSize: '1.2rem' }}>{staff.fullName}</h2>
            <div className="detail-header__meta">
              {/* role = quyền hệ thống */}
              <span className={`role-badge role-badge--${staff.role}`}>
                {ROLE_LABELS[staff.role] || staff.role}
              </span>
              {/* trạng thái tài khoản */}
              <span className={`status-badge status-badge--${staff.isBanned ? 'banned' : staff.isActive ? 'active' : 'inactive'}`}>
                {staff.isBanned ? 'Đang bị ban' : staff.isActive ? 'Đang làm việc' : 'Vô hiệu hóa'}
              </span>
            </div>
            {staff.isBanned && staff.banReason && (
              <p style={{ fontSize: '0.78rem', color: '#dc2626', margin: '6px 0 0', fontStyle: 'italic' }}>
                Lý do ban: {staff.banReason}
              </p>
            )}
          </div>
        </div>

        <div className="detail-grid">
          {/* ── Cột trái: Thông tin cá nhân (User model) ── */}
          <div>
            <div className="detail-section__title">Thông tin cá nhân</div>
            <DetailRow label="Email" value={staff.email} />
            <DetailRow label="Username" value={staff.username} />
            <DetailRow label="Số điện thoại" value={staff.phone} />
            <DetailRow label="Giới tính" value={GENDER_LABELS[staff.gender]} />
            <DetailRow label="Ngày sinh" value={fmt(staff.dateOfBirth)} />
            <DetailRow label="Địa chỉ" value={staff.address} />

            <div className="detail-section__title" style={{ marginTop: 16 }}>Thông tin tài khoản</div>
            <DetailRow label="Ngày tạo" value={fmtDatetime(staff.createdAt)} />
            <DetailRow label="Đăng nhập lần cuối" value={fmtDatetime(staff.lastLoginAt)} />
          </div>

          {/* ── Cột phải: Thông tin chuyên môn (StaffProfile model) ── */}
          <div>
            <div className="detail-section__title">Thông tin chuyên môn</div>
            {/* staffCode: mã định danh nhân viên trong hệ thống */}
            <DetailRow label="Mã nhân viên" value={profile.staffCode} />
            {/* roleCategory: chức danh cụ thể, VD "Điều dưỡng trưởng", "Nội khoa" */}
            <DetailRow label="Chức danh" value={profile.roleCategory} />
            <DetailRow label="Chuyên môn" value={profile.specialty} />
            <DetailRow
              label="Chứng chỉ"
              value={profile.certifications?.length ? profile.certifications.join(', ') : null}
            />

            <div className="detail-section__title" style={{ marginTop: 16 }}>Phân công</div>
            <DetailRow
              label="Tầng phụ trách"
              value={
                areas.length
                  ? areas.map((a) => (typeof a === 'object' ? a.name || a.floorNumber || a._id : a)).join(', ')
                  : null
              }
            />
            <DetailRow
              label="Phòng phụ trách"
              value={
                rooms.length
                  ? rooms.map((r) => (typeof r === 'object' ? r.name || r.roomNumber || r._id : r)).join(', ')
                  : null
              }
            />
            <DetailRow
              label="Cư dân phụ trách"
              value={residents.length ? `${residents.length} cư dân` : null}
            />
          </div>
        </div>

        <div className="modal__actions">
          <button className="btn-cancel" onClick={onClose}>Đóng</button>
          {canEdit && (
            <button className="btn-save" onClick={() => { onClose(); onEdit(staff); }}>
              Chỉnh sửa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
