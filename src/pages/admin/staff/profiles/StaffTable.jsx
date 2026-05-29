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
    <div className="resident-page__table">
      <table className="resident-page__table-element">
        <thead>
          <tr className="resident-page__table-header">
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
              <td colSpan={8} className="resident-page__empty">Đang tải...</td>
            </tr>
          )}
          {!loading && staff.length === 0 && (
            <tr>
              <td colSpan={8} className="resident-page__empty">Không có nhân viên nào</td>
            </tr>
          )}
          {!loading && staff.map((s) => {
            const manageable = canManage ? canManage(s) : true;
            return (
            <tr key={s._id} className="resident-page__table-row">
              <td>{s.staffProfile?.staffCode || '—'}</td>
              <td>
                <div className="resident-page__name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {s.avatarUrl && (
                    <img
                      src={s.avatarUrl}
                      alt=""
                      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  )}
                  <strong>{s.fullName}</strong>
                </div>
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
              <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="resident-page__action"
                  onClick={() => onView(s)}
                >
                  Xem
                </button>
                <button
                  type="button"
                  className="resident-page__action"
                  onClick={() => onEdit(s)}
                  disabled={s.isBanned || !manageable}
                  title={!manageable ? 'Không có quyền sửa tài khoản admin/quản lý' : undefined}
                >
                  Sửa
                </button>
                <button
                  type="button"
                  className="resident-page__action"
                  style={s.isBanned ? undefined : { background: 'rgba(220, 38, 38, 0.12)', color: '#b91c1c' }}
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
