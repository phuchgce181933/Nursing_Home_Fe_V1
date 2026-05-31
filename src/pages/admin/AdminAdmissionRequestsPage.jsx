import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Eye,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  UserCheck,
} from 'lucide-react';
import admissionService from '../../services/admission.service';
import AdmissionDetailDrawer from '../../components/family/SubmitAdmission/AdmissionDetailDrawer';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'new_request', label: 'Yêu cầu mới' },
  { value: 'consulting', label: 'Đang tư vấn' },
  { value: 'assessing', label: 'Đang đánh giá' },
  { value: 'contracting', label: 'Ký hợp đồng' },
  { value: 'checked_in', label: 'Đã nhận vào ở' },
  { value: 'cancelled', label: 'Đã huỷ' },
];

const ELIGIBILITY_OPTIONS = [
  { value: '', label: 'Tất cả điều kiện' },
  { value: 'pending', label: 'Chờ đánh giá' },
  { value: 'eligible', label: 'Đủ điều kiện' },
  { value: 'not_eligible', label: 'Không đủ điều kiện' },
];

const formatViDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'new_request':
      return 'status-badge-custom-adm--new';
    case 'consulting':
      return 'status-badge-custom-adm--consulting';
    case 'assessing':
      return 'status-badge-custom-adm--assessing';
    case 'contracting':
      return 'status-badge-custom-adm--contracting';
    case 'checked_in':
      return 'status-badge-custom-adm--checked-in';
    case 'cancelled':
      return 'status-badge-custom-adm--cancelled';
    default:
      return 'status-badge-custom-adm--cancelled';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'new_request':
      return 'Yêu cầu mới';
    case 'consulting':
      return 'Đang tư vấn';
    case 'assessing':
      return 'Đang đánh giá';
    case 'contracting':
      return 'Ký hợp đồng';
    case 'checked_in':
      return 'Đã nhận vào ở';
    case 'cancelled':
      return 'Đã huỷ';
    default:
      return status;
  }
};

const getEligibilityBadgeClass = (eligibility) => {
  switch (eligibility) {
    case 'eligible':
      return 'assess-badge-adm--eligible';
    case 'not_eligible':
      return 'assess-badge-adm--ineligible';
    default:
      return 'assess-badge-adm--pending';
  }
};

const getEligibilityLabel = (eligibility) => {
  switch (eligibility) {
    case 'eligible':
      return 'Đủ điều kiện';
    case 'not_eligible':
      return 'Không đủ điều kiện';
    default:
      return 'Chờ đánh giá';
  }
};

export default function AdminAdmissionRequestsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Metrics states
  const [metrics, setMetrics] = useState({
    total: 0,
    new: 0,
    processing: 0,
    completed: 0,
  });

  // Filter states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [eligibilityStatus, setEligibilityStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Active filters applied to query
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: '',
    eligibilityStatus: '',
    from: '',
    to: '',
  });

  // Detail Drawer state
  const [selectedAdmissionId, setSelectedAdmissionId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch admission requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        limit,
        search: appliedFilters.search || undefined,
        status: appliedFilters.status || undefined,
        eligibilityStatus: appliedFilters.eligibilityStatus || undefined,
        from: appliedFilters.from || undefined,
        to: appliedFilters.to || undefined,
      };

      const res = await admissionService.adminGetAdmissionList(params);
      
      setData(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);

      // Compute simple dashboard metrics from the data list
      if (res?.data) {
        const totalCount = res.total || 0;
        setMetrics({
          total: totalCount,
          new: res.data.filter(x => x.status === 'new_request').length,
          processing: res.data.filter(x => ['consulting', 'assessing', 'contracting'].includes(x.status)).length,
          completed: res.data.filter(x => x.status === 'checked_in').length,
        });
      }
    } catch (err) {
      console.error('Failed to load admission requests:', err);
      setError('Không thể tải danh sách yêu cầu nhập viện. Vui lòng kiểm tra kết nối mạng.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Apply filters trigger
  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ search, status, eligibilityStatus, from, to });
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setEligibilityStatus('');
    setFrom('');
    setTo('');
    setPage(1);
    setAppliedFilters({ search: '', status: '', eligibilityStatus: '', from: '', to: '' });
  };

  // Open detail drawer
  const handleOpenDetails = (id) => {
    setSelectedAdmissionId(id);
    setIsDrawerOpen(true);
  };

  // Close drawer & reload list on success
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedAdmissionId(null);
  };

  const handleActionSuccess = () => {
    fetchRequests();
  };

  return (
    <div className="adm-container">
      
      {/* Top Banner Header */}
      <div className="adm-header">
        <div>
          <h1>
            <ClipboardList className="text-emerald-sage" size={26} />
            Yêu cầu nhập viện
          </h1>
          <p>
            Xem xét, đánh giá, duyệt và theo dõi các yêu cầu nhập viện từ gia đình cư dân.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="adm-btn-refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Tải lại
        </button>
      </div>

      {/* Metrics Counters Section */}
      <div className="adm-metrics-grid">
        {/* Total Card */}
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <span className="adm-stat-label">Tổng yêu cầu</span>
            <span className="adm-stat-value">{total}</span>
          </div>
        </div>

        {/* New Card */}
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Clock size={22} />
          </div>
          <div>
            <span className="adm-stat-label">Yêu cầu mới</span>
            <span className="adm-stat-value">{data.filter(x => x.status === 'new_request').length}</span>
          </div>
        </div>

        {/* Processing Card */}
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#faf5ff', color: '#9333ea' }}>
            <Activity size={22} />
          </div>
          <div>
            <span className="adm-stat-label">Đang xử lý</span>
            <span className="adm-stat-value">
              {data.filter(x => ['consulting', 'assessing', 'contracting'].includes(x.status)).length}
            </span>
          </div>
        </div>

        {/* Admitted Card */}
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <span className="adm-stat-label">Đã nhận vào ở</span>
            <span className="adm-stat-value">{data.filter(x => x.status === 'checked_in').length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="adm-filter-panel">
        <form onSubmit={handleApplyFilters}>
          <div className="adm-filter-grid">
            
            {/* Search Input */}
            <div className="adm-filter-group">
              <div className="adm-filter-input-wrapper">
                <Search className="adm-filter-input-icon" size={16} />
                <input
                  type="text"
                  className="adm-filter-input"
                  placeholder="Tìm mã yêu cầu, tên người thân, số điện thoại..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Status Select */}
            <div className="adm-filter-group">
              <select
                className="adm-filter-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Eligibility Select */}
            <div className="adm-filter-group">
              <select
                className="adm-filter-select"
                value={eligibilityStatus}
                onChange={(e) => setEligibilityStatus(e.target.value)}
              >
                {ELIGIBILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Filters - Dates & Buttons */}
          <div className="adm-filter-row-secondary">
            <div className="adm-filter-date-group">
              <span className="adm-date-title">
                <Calendar size={13} className="text-slate-400" /> Khoảng ngày gửi:
              </span>
              
              <input
                type="date"
                className="adm-date-input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-slate-400 text-xs font-semibold">đến</span>
              <input
                type="date"
                className="adm-date-input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="adm-filter-actions">
              <button
                type="button"
                onClick={handleResetFilters}
                className="adm-btn-clear"
              >
                Xoá bộ lọc
              </button>
              <button
                type="submit"
                className="adm-btn-apply"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main Table Card */}
      <div className="adm-table-card">
        {loading && data.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center bg-white" style={{ minHeight: '300px' }}>
            <RefreshCw className="animate-spin text-emerald-sage mb-3" size={32} />
            <p className="text-slate-500 text-sm">Đang tải danh sách yêu cầu nhập viện...</p>
          </div>
        ) : error ? (
          <div className="p-10 flex flex-col items-center justify-center text-center bg-white" style={{ minHeight: '300px' }}>
            <AlertCircle className="text-red-500 mb-3" size={36} />
            <p className="text-slate-800 font-bold mb-1">Đã xảy ra lỗi</p>
            <p className="text-slate-500 text-sm max-w-md">{error}</p>
            <button
              onClick={fetchRequests}
              className="mt-4 px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-xl font-semibold transition-all"
            >
              Thử lại
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center bg-white" style={{ minHeight: '300px' }}>
            <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-3" style={{ width: 'fit-content' }}>
              <ClipboardList size={30} />
            </div>
            <p className="text-slate-700 font-bold mb-1">Không tìm thấy yêu cầu nhập viện</p>
            <p className="text-slate-400 text-xs max-w-sm">
              Không có yêu cầu nhập viện nào khớp với từ khoá hoặc bộ lọc của bạn.
            </p>
          </div>
        ) : (
          <div className="adm-table-responsive">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Mã yêu cầu</th>
                  <th>Cư dân</th>
                  <th>Người liên hệ</th>
                  <th>Ngày mong muốn</th>
                  <th>Ngày gửi</th>
                  <th style={{ textAlign: 'center' }}>Đánh giá y tế</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row._id}
                    className="adm-table-row"
                    onClick={() => handleOpenDetails(row._id)}
                  >
                    <td className="cell-code-adm">
                      #{row.requestCode || `ANH-${row._id.substring(0, 4).toUpperCase()}`}
                    </td>
                    <td>
                      <div className="cell-resident-name">{row.applicant?.fullName || 'N/A'}</div>
                      <div className="cell-resident-meta">
                        {row.applicant?.gender === 'male' ? 'NAM' : row.applicant?.gender === 'female' ? 'NỮ' : row.applicant?.gender || 'N/A'}
                        {row.applicant?.dateOfBirth ? ` • ${new Date().getFullYear() - new Date(row.applicant.dateOfBirth).getFullYear()} tuổi` : ''}
                      </div>
                    </td>
                    <td>
                      <div className="cell-contact-name">
                        {row.familyAccount?.fullName || row.requestedByName || 'Người thân'}
                        {row.familyAccount?.username && (
                          <span className="text-[11px] text-slate-400 font-normal ml-1.5">
                            (@{row.familyAccount.username})
                          </span>
                        )}
                      </div>
                      <div className="cell-contact-phone">
                        {row.requestedByPhone || row.familyAccount?.phone || 'N/A'}
                      </div>
                    </td>
                    <td style={{ fontWeight: '500', color: '#475569' }}>
                      {formatViDate(row.preferredAdmissionDate)}
                    </td>
                    <td className="cell-date">
                      {formatViDate(row.createdAt)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`assess-badge-adm ${getEligibilityBadgeClass(row.eligibilityStatus)}`}>
                        {getEligibilityLabel(row.eligibilityStatus)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge-custom-adm ${getStatusBadgeClass(row.status)}`}>
                        {getStatusLabel(row.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenDetails(row._id)}
                        className="adm-btn-action"
                        title="Xem chi tiết"
                      >
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
              <span>{Math.min(page * limit, total)}</span> trong{' '}
              <span>{total}</span> yêu cầu
            </div>

            <div className="pagination-controls">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="btn-page"
              >
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

      {/* Slide-out Administrative Drawer */}
      <AdmissionDetailDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        admissionId={selectedAdmissionId}
        onCancelSuccess={handleActionSuccess}
        isAdmin={true}
      />
    </div>
  );
}
