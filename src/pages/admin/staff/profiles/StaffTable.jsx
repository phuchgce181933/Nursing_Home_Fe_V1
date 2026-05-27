const ROLE_LABELS = {
  doctor: 'Bác sĩ', nurse: 'Y tá', staff: 'Chăm sóc viên',
  manager: 'Quản lý', admin: 'Admin',
};

function StatusBadge({ s }) {
  if (s.isBanned) return <span className="status-badge status-badge--banned">Đã ban</span>;
  if (!s.isActive) return <span className="status-badge status-badge--inactive">Vô hiệu hóa</span>;
  return <span className="status-badge status-badge--active">Đang làm</span>;
}

export default function StaffTable({ staff, loading, onView, onEdit, onBan, canManage }) {
  return (
    <div className="staff-page__table-wrap">
      <table className="staff-page__table">
        <thead>
          <tr>
            <th>Mã NV</th>
            <th>Họ tên</th>
            <th>Email</th>
            <th>Số điện thoại</th>
            <th>Vai trò</th>
            <th>Chuyên môn</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                Đang tải...
              </td>
            </tr>
          )}
          {!loading && staff.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>
                Không có nhân viên nào
              </td>
            </tr>
          )}
          {!loading && staff.map((s) => {
            const manageable = canManage ? canManage(s) : true;
            return (
            <tr key={s._id} className={s.isBanned ? 'row--banned' : ''}>
              <td>{s.staffProfile?.staffCode || '—'}</td>
              <td style={{ fontWeight: 600 }}>
                {s.avatarUrl && (
                  <img
                    src={s.avatarUrl}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginRight: 8, verticalAlign: 'middle' }}
                  />
                )}
                {s.fullName}
              </td>
              <td>{s.email}</td>
              <td>{s.phone || '—'}</td>
              <td>
                <span className={`role-badge role-badge--${s.role}`}>
                  {ROLE_LABELS[s.role] || s.role}
                </span>
              </td>
              <td>{s.staffProfile?.specialty || '—'}</td>
              <td>
                <StatusBadge s={s} />
              </td>
              <td>
                <button
                  className="staff-page__action-btn staff-page__action-btn--view"
                  onClick={() => onView(s)}
                >
                  Xem
                </button>
                <button
                  className="staff-page__action-btn staff-page__action-btn--edit"
                  onClick={() => onEdit(s)}
                  disabled={s.isBanned || !manageable}
                  title={!manageable ? 'Không có quyền sửa tài khoản admin/quản lý' : undefined}
                >
                  Sửa
                </button>
                <button
                  className={`staff-page__action-btn ${s.isBanned ? 'staff-page__action-btn--unban' : 'staff-page__action-btn--delete'}`}
                  onClick={() => onBan(s)}
                  disabled={!manageable}
                  title={!manageable ? 'Không có quyền ban tài khoản admin/quản lý' : undefined}
                >
                  {s.isBanned ? 'Gỡ ban' : 'Ban'}
                </button>
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
