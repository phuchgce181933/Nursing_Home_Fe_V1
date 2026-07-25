import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Eye,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CheckCircle,
  Clock,
  Users,
} from 'lucide-react';
import residentVisitService from '../../services/residentVisit.service';
import useAuth from '../../hooks/useAuth';
import StaffVisitDetailDrawer from '../../components/family/ResidentVisit/StaffVisitDetailDrawer';

// Tái sử dụng CSS đã có sẵn cho phân hệ tương tự (Admission Requests + Facility Tour)
import '../../styles/admin/AdminAdmissionRequestsPage.css';
import '../../styles/family/FacilityTourHistoryPage.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Bị từ chối' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'pending':
      return 'status-badge-custom-adm--new';
    case 'approved':
      return 'status-badge-custom-adm--contracting';
    case 'rejected':
      return 'status-badge-custom-adm--cancelled';
    case 'cancelled':
      return 'status-badge-custom-adm--cancelled';
    default:
      return 'status-badge-custom-adm--cancelled';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'pending':
      return 'Chờ duyệt';
    case 'approved':
      return 'Đã duyệt';
    case 'rejected':
      return 'Bị từ chối';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status || 'Không xác định';
  }
};

const formatViDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (e) {
    return dateStr;
  }
};

export default function ResidentVisitRequestsPage() {
  const { user } = useAuth();
  const canReview = user?.role === 'manager' || user?.role === 'admin';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState('');

  const [selectedVisit, setSelectedVisit] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { page, limit, status: status || undefined };
      const res = await residentVisitService.listVisits(params);

      setData(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load resident visit requests:', err);
      setError('Không thể tải danh sách yêu cầu thăm. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, status]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const handleOpenDetails = (visit) => {
    setSelectedVisit(visit);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedVisit(null);
  };

  const handleActionSuccess = () => {
    fetchVisits();
  };

  const pendingCount = data.filter((v) => v.status === 'pending').length;
  const approvedCount = data.filter((v) => v.status === 'approved').length;

  return (
    <div className="adm-container">
      {/* Top Banner Header */}
      <div className="adm-header">
        <div>
          <h1>
            <Calendar className="text-emerald-sage" size={26} />
            Yêu cầu Thăm Cư dân
          </h1>
          <p>
            Quản lý các yêu cầu thăm người thân từ gia đình
            {canReview ? ' — duyệt hoặc từ chối yêu cầu.' : ' (chỉ xem, cần quản lý hoặc admin để duyệt).'}
          </p>
        </div>
        <button onClick={fetchVisits} disabled={loading} className="adm-btn-refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Tải lại
        </button>
      </div>

      {/* Metrics Counters Section */}
      <div className="adm-metrics-grid">
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <span className="adm-stat-label">Tổng số yêu cầu</span>
            <span className="adm-stat-value">{total}</span>
          </div>
        </div>

        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Clock size={22} />
          </div>
          <div>
            <span className="adm-stat-label">Chờ duyệt</span>
            <span className="adm-stat-value">{pendingCount}</span>
          </div>
        </div>

        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#effdf4', color: '#16a34a' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <span className="adm-stat-label">Đã duyệt</span>
            <span className="adm-stat-value">{approvedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="adm-filter-panel">
        <div className="adm-filter-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="adm-filter-group">
            <select
              className="adm-filter-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="adm-table-card">
        {loading && data.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center bg-white" style={{ minHeight: '300px' }}>
            <RefreshCw className="animate-spin text-emerald-sage mb-3" size={32} />
            <p className="text-slate-500 text-sm">Đang tải danh sách yêu cầu thăm...</p>
          </div>
        ) : error ? (
          <div className="p-10 flex flex-col items-center justify-center text-center bg-white" style={{ minHeight: '300px' }}>
            <AlertCircle className="text-red-500 mb-3" size={36} />
            <p className="text-slate-800 font-bold mb-1">Đã xảy ra lỗi</p>
            <p className="text-slate-500 text-sm max-w-md">{error}</p>
            <button
              onClick={fetchVisits}
              className="mt-4 px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-xl font-semibold transition-all"
            >
              Thử lại
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center bg-white" style={{ minHeight: '300px' }}>
            <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-3" style={{ width: 'fit-content' }}>
              <Calendar size={30} />
            </div>
            <p className="text-slate-700 font-bold mb-1">Không có yêu cầu thăm nào</p>
            <p className="text-slate-400 text-xs max-w-sm">
              Không tìm thấy yêu cầu thăm nào khớp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="adm-table-responsive">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Mã yêu cầu</th>
                  <th>Người thân</th>
                  <th>Người đến thăm</th>
                  <th>Lịch mong muốn</th>
                  <th style={{ textAlign: 'center' }}>Số khách</th>
                  <th>Ngày gửi</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row._id} className="adm-table-row" onClick={() => handleOpenDetails(row)}>
                    <td className="cell-code-adm">#{row._id.substring(18).toUpperCase()}</td>
                    <td>
                      <div className="cell-resident-name">{row.resident?.fullName || 'N/A'}</div>
                      <div className="cell-resident-meta">{row.resident?.residentCode || ''}</div>
                    </td>
                    <td>
                      <div className="cell-contact-name">{row.visitorName}</div>
                      <div className="cell-contact-phone">{row.visitorPhone}</div>
                    </td>
                    <td style={{ fontWeight: '500', color: '#475569' }}>
                      <div style={{ fontSize: '13px', color: '#1e293b' }}>{formatViDate(row.requestedDate)}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {row.requestedTimeSlot || 'Chưa chọn khung giờ'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>
                      <Users size={13} className="inline mr-1 text-slate-400" />
                      {row.numberOfVisitors || 1}
                    </td>
                    <td className="cell-date">{formatViDate(row.createdAt)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge-custom-adm ${getStatusBadgeClass(row.status)}`}>
                        {getStatusLabel(row.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleOpenDetails(row)} className="adm-btn-action" title="Xem chi tiết">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="adm-pagination-footer">
            <div className="pagination-info">
              Hiển thị <span>{(page - 1) * limit + 1}</span> đến{' '}
              <span>{Math.min(page * limit, total)}</span> trên <span>{total}</span> yêu cầu
            </div>

            <div className="pagination-controls">
              <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(p - 1, 1))} className="btn-page">
                <ChevronLeft size={16} />
              </button>
              <div className="page-indicator">
                Trang {page} / {totalPages}
              </div>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="btn-page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-out Detail Drawer */}
      <StaffVisitDetailDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        visit={selectedVisit}
        canReview={canReview}
        onActionSuccess={handleActionSuccess}
      />
    </div>
  );
}
