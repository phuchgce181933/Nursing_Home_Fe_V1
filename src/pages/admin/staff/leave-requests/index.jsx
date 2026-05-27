import { useEffect, useState } from 'react';
import leaveRequestService from '../../../../services/leaveRequest.service';
import { calcInclusiveLeaveDays, formatLeaveDate } from '../../../../utils/leaveUtils';
import '../../../../styles/admin/LeaveRequestAdminPage.css';

const STATUS_LABELS = {
  draft:     'Nháp',
  pending:   'Chờ duyệt',
  approved:  'Đã duyệt',
  rejected:  'Từ chối',
  cancelled: 'Đã hủy',
};
const TYPE_LABELS = {
  annual:    'Phép năm',
  sick:      'Ốm',
  emergency: 'Khẩn cấp',
  unpaid:    'Không lương',
  other:     'Khác',
};
const ROLE_LABELS = { doctor: 'Bác sĩ', nurse: 'Y tá', staff: 'Nhân viên', manager: 'Quản lý' };

export default function LeaveRequestAdminPage() {
  const [requests, setRequests]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [filterStatus, setFilter]     = useState('pending');
  const [search, setSearch]           = useState('');
  const [reviewNotes, setNotes]       = useState({});
  const [actionLoading, setActLoad]   = useState(null);
  const [error, setError]             = useState('');
  // Toast for approve results (cancelled shifts etc.)
  const [approveResult, setResult]    = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const params = { limit: 100 };
      if (filterStatus) params.status = filterStatus;
      const res = await leaveRequestService.getAll(params);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể tải danh sách');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus]);

  const filtered = requests.filter((r) => {
    const name = r.staffId?.fullName || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const count = (s) => requests.filter((r) => r.status === s).length;

  const handleApprove = async (id) => {
    setActLoad(id + '_approve'); setResult(null);
    try {
      const res = await leaveRequestService.approve(id, reviewNotes[id] || '');
      await load();
      if (res.cancelledShifts?.count) {
        setResult({
          type: 'success',
          msg: `Đã duyệt. Tự động hủy ${res.cancelledShifts.count} ca làm việc trong thời gian nghỉ.`,
          shifts: res.cancelledShifts.shifts || [],
        });
      } else {
        setResult({
          type: 'success',
          msg: 'Đã duyệt đơn nghỉ phép.',
          shifts: [],
        });
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Thao tác thất bại');
    } finally { setActLoad(null); }
  };

  const handleReject = async (id) => {
    const note = reviewNotes[id]?.trim();
    if (!note) {
      alert('Vui lòng nhập lý do từ chối (bắt buộc)');
      return;
    }
    setActLoad(id + '_reject');
    try {
      await leaveRequestService.reject(id, note);
      setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: 'rejected', reviewNote: note } : r)));
    } catch (e) {
      alert(e.response?.data?.message || 'Thao tác thất bại');
    } finally { setActLoad(null); }
  };

  return (
    <div className="leave-admin-page">
      <div className="leave-admin-page__header">
        <h1 className="leave-admin-page__title">Quản lý đơn nghỉ phép</h1>
        <p className="leave-admin-page__subtitle">
          Phê duyệt hoặc từ chối yêu cầu nghỉ phép. Khi duyệt, hệ thống tự hủy các ca làm việc trong khoảng ngày nghỉ.
        </p>
      </div>

      <div className="leave-stats">
        {[
          { s: 'pending',  icon: '⏳', label: 'Chờ duyệt' },
          { s: 'approved', icon: '✅', label: 'Đã duyệt' },
          { s: 'rejected', icon: '❌', label: 'Từ chối' },
          { s: 'cancelled',icon: '🚫', label: 'Đã hủy' },
        ].map(({ s, icon, label }) => (
          <div key={s} className={`leave-stat leave-stat--${s}`} style={{ cursor: 'pointer', outline: filterStatus === s ? '2px solid #3b82f6' : 'none', borderRadius: 12 }} onClick={() => setFilter(filterStatus === s ? '' : s)}>
            <div className="leave-stat__icon">{icon}</div>
            <div>
              <div className="leave-stat__value">{count(s)}</div>
              <div className="leave-stat__label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {approveResult && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: '0.875rem' }}>
          ✅ {approveResult.msg}
          {approveResult.shifts?.length > 0 && (
            <ul style={{ marginTop: 6, paddingLeft: 20 }}>
              {approveResult.shifts.map((sh) => (
                <li key={sh.shiftId}>{sh.name || sh.shiftId} — {formatLeaveDate(sh.workDate)}</li>
              ))}
            </ul>
          )}
          <button style={{ marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', textDecoration: 'underline', fontSize: '0.8rem' }} onClick={() => setResult(null)}>Đóng</button>
        </div>
      )}

      <div className="filter-row">
        <input type="text" placeholder="Tìm tên nhân viên..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={filterStatus} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      {error && <div style={{ color: '#dc2626', marginBottom: 12, fontSize: '0.875rem' }}>{error}</div>}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Vai trò</th>
              <th>Loại nghỉ</th>
              <th>Từ ngày</th>
              <th>Đến ngày</th>
              <th>Số ngày</th>
              <th>Lý do</th>
              <th>Ngày gửi</th>
              <th>Trạng thái</th>
              <th>Ghi chú / Lý do từ chối</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={11} className="empty-state">Đang tải...</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={11} className="empty-state">Không có đơn nghỉ phép nào</td></tr>
            )}
            {!loading && filtered.map((r) => (
              <tr key={r._id}>
                <td style={{ fontWeight: 600 }}>{r.staffId?.fullName || '—'}</td>
                <td>
                  <span className={`role-badge role-badge--${r.staffId?.role}`}>
                    {ROLE_LABELS[r.staffId?.role] || r.staffId?.role || '—'}
                  </span>
                </td>
                <td>{TYPE_LABELS[r.type] || r.type}</td>
                <td>{formatLeaveDate(r.startDate)}</td>
                <td>{formatLeaveDate(r.endDate)}</td>
                <td style={{ textAlign: 'center' }}>
                  {r.daysRequested
                    ?? (r.startDate && r.endDate
                      ? calcInclusiveLeaveDays(formatLeaveDate(r.startDate), formatLeaveDate(r.endDate))
                      : '—')}
                </td>
                <td style={{ maxWidth: 160, fontSize: '0.8rem' }}>{r.reason}</td>
                <td>{formatLeaveDate(r.createdAt)}</td>
                <td>
                  <span className={`leave-status leave-status--${r.status}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                </td>
                <td>
                  {r.status === 'pending' ? (
                    <input
                      style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.8rem', width: 150 }}
                      placeholder="Lý do từ chối (bắt buộc)"
                      value={reviewNotes[r._id] || ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [r._id]: e.target.value }))}
                    />
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.reviewNote || '—'}</span>
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button
                    className="action-btn action-btn--approve"
                    disabled={r.status !== 'pending' || !!actionLoading}
                    onClick={() => handleApprove(r._id)}
                  >
                    {actionLoading === r._id + '_approve' ? '...' : '✓ Duyệt'}
                  </button>
                  <button
                    className="action-btn action-btn--reject"
                    disabled={r.status !== 'pending' || !!actionLoading}
                    title="Cần nhập lý do từ chối"
                    onClick={() => handleReject(r._id)}
                  >
                    {actionLoading === r._id + '_reject' ? '...' : '✗ Từ chối'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
