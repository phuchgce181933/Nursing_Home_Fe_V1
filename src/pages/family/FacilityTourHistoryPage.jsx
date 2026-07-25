import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  Inbox,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
} from 'lucide-react';
import facilityTourService from '../../services/facilityTour.service';
import FacilityTourDetailDrawer from '../../components/family/FacilityTour/FacilityTourDetailDrawer';

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
    case 'pending':
      return 'px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium text-[12px]';
    case 'confirmed':
      return 'px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium text-[12px]';
    case 'completed':
      return 'px-3 py-1 rounded-full bg-sky-50 text-sky-700 font-medium text-[12px]';
    case 'cancelled':
      return 'px-3 py-1 rounded-full bg-red-50 text-error font-medium text-[12px]';
    default:
      return 'px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium text-[12px]';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'pending':
      return 'Chờ duyệt';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'completed':
      return 'Đã hoàn tất';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Chờ duyệt';
  }
};

export default function FacilityTourHistoryPage() {
  const navigate = useNavigate();

  // Filters & Pagination states
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(6); // 6 rows is professional and aesthetic
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Drawer states
  const [selectedTour, setSelectedTour] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Statistics states
  const [stats, setStats] = useState({ active: 0, completed: 0, total: 0 });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch stats for all family tours
  const loadStats = async () => {
    try {
      const res = await facilityTourService.getTourHistory({ limit: 1000 });
      const allTours = res?.data || [];

      const active = allTours.filter(t =>
        ['pending', 'confirmed'].includes(t.status)
      ).length;

      const completed = allTours.filter(t =>
        t.status === 'completed'
      ).length;

      setStats({ active, completed, total: allTours.length });
    } catch (err) {
      console.error('Failed to load facility tour stats:', err);
    }
  };

  // Fetch paginated data
  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const params = {
        page,
        limit,
        status: status || undefined,
        search: debouncedSearch.trim() || undefined,
        from: dateStr || undefined,
      };
      const res = await facilityTourService.getTourHistory(params);
      setTours(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load facility tour request history:', err);
      setLoadError(err?.response?.data?.message || err?.message || 'Không thể tải danh sách lịch hẹn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
    loadStats();
  }, [page, status, debouncedSearch, dateStr]);

  const handleOpenDetail = (tourItem) => {
    setSelectedTour(tourItem);
    setIsDrawerOpen(true);
  };

  const handleCancelSuccess = () => {
    // Reload table list and stats instantly when request is cancelled
    loadData();
    loadStats();
  };

  // Generate page numbers array
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <>
      <div className="arh-page">
        {/* Header Section */}
        <div className="arh-header">
          <div className="arh-header__title-group">
            <h1 className="arh-header__title">Lịch sử Đăng ký Tham quan</h1>
            <p className="arh-header__subtitle">
              Quản lý và theo dõi các lịch hẹn tham quan của bạn tại Viện dưỡng lão An Nhiên.
            </p>
          </div>
          <button
            className="arh-btn arh-btn--primary"
            onClick={() => navigate('/family/facility-tours/new')}
          >
            <Plus size={16} />
            Đặt lịch tham quan mới
          </button>
        </div>

        {/* Statistics Cards Grid */}
        <div className="arh-stats-grid">
          {/* Active Tours Card */}
          <div className="arh-stat-card">
            <div className="arh-stat-card__header">
              <div className="arh-stat-card__icon-box arh-stat-card__icon-box--pending">
                <Clock size={20} />
              </div>
              <span className="arh-stat-card__label">Lịch hẹn hoạt động</span>
            </div>
            <div className="arh-stat-card__value">
              {String(stats.active).padStart(2, '0')}
            </div>
          </div>

          {/* Completed Tours Card */}
          <div className="arh-stat-card">
            <div className="arh-stat-card__header">
              <div className="arh-stat-card__icon-box arh-stat-card__icon-box--completed">
                <CheckCircle size={20} />
              </div>
              <span className="arh-stat-card__label">Lịch hẹn đã hoàn tất</span>
            </div>
            <div className="arh-stat-card__value">
              {String(stats.completed).padStart(2, '0')}
            </div>
          </div>

          {/* Total Bookings Card */}
          <div className="arh-stat-card">
            <div className="arh-stat-card__header">
              <div className="arh-stat-card__icon-box arh-stat-card__icon-box--appointment">
                <Calendar size={20} />
              </div>
              <span className="arh-stat-card__label">Tổng lượt đặt lịch</span>
            </div>
            <div className="arh-stat-card__value">
              {String(stats.total).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Search & Filter Bar (Glass Card) */}
        <div className="arh-filters">
          {/* Search Input */}
          <div className="arh-filters__field flex-1">
            <Search className="arh-filters__icon" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên liên hệ..."
              className="arh-filters__input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status Dropdown */}
          <div className="arh-filters__field">
            <select
              className="arh-filters__select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="completed">Đã hoàn tất</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          {/* Date Picker */}
          <div className="arh-filters__field">
            <input
              type="date"
              className="arh-filters__date"
              value={dateStr}
              onChange={(e) => {
                setDateStr(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {loadError && (
          <div className="arh-error-banner">
            <span>{loadError}</span>
            <button type="button" className="arh-error-banner__retry" onClick={loadData}>
              Thử lại
            </button>
          </div>
        )}

        {/* Request List Section */}
        <div className="arh-table-container">
          {loading ? (
            <div className="arh-loading">
              <Loader2 size={32} className="arh-spinner" />
              <span>Đang tải lịch sử đăng ký tham quan...</span>
            </div>
          ) : tours.length === 0 ? (
            <div className="arh-empty">
              <Inbox size={48} className="arh-empty__icon" />
              <h4>Không tìm thấy yêu cầu tham quan nào</h4>
              <p>Bạn chưa đăng ký lịch hẹn tham quan nào hoặc không có yêu cầu nào khớp với bộ lọc hiện tại.</p>
              <button
                className="arh-btn arh-btn--primary mt-4"
                onClick={() => navigate('/family/facility-tours/new')}
              >
                Đặt lịch tham quan mới
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="arh-table-wrapper">
                <table className="arh-table">
                  <thead>
                    <tr>
                      <th>Người liên hệ</th>
                      <th>Số điện thoại</th>
                      <th>Ngày mong muốn</th>
                      <th>Khung giờ</th>
                      <th>Khách</th>
                      <th>Trạng thái</th>
                      <th className="text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tours.map((t) => (
                      <tr key={t._id}>
                        <td>
                          <strong className="text-slate-800">{t.contactName}</strong>
                        </td>
                        <td>{t.contactPhone}</td>
                        <td>{formatViDate(t.preferredDate)}</td>
                        <td>{t.preferredTimeSlot || 'N/A'}</td>
                        <td>{t.numberOfVisitors}</td>
                        <td>
                          <span className={getStatusBadgeClass(t.status)}>
                            {getStatusLabel(t.status)}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            className="arh-action-btn"
                            title="Xem chi tiết"
                            onClick={() => handleOpenDetail(t)}
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="arh-card-list">
                {tours.map((t) => (
                  <div key={t._id} className="arh-mobile-card">
                    <div className="arh-mobile-card__header">
                      <strong className="text-slate-800 text-[15px]">{t.contactName}</strong>
                      <span className={getStatusBadgeClass(t.status)}>
                        {getStatusLabel(t.status)}
                      </span>
                    </div>

                    <div className="arh-mobile-card__body">
                      <div className="arh-mobile-card__row">
                        <span>Ngày:</span>
                        <strong>{formatViDate(t.preferredDate)}</strong>
                      </div>
                      <div className="arh-mobile-card__row">
                        <span>Khung giờ:</span>
                        <strong>{t.preferredTimeSlot || 'N/A'}</strong>
                      </div>
                      <div className="arh-mobile-card__row">
                        <span>Khách:</span>
                        <strong>{t.numberOfVisitors}</strong>
                      </div>
                    </div>

                    <div className="arh-mobile-card__footer">
                      <button
                        className="arh-action-btn w-full"
                        onClick={() => handleOpenDetail(t)}
                      >
                        <Eye size={16} />
                        Xem chi tiết lịch hẹn
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="arh-pagination">
                  <span className="arh-pagination__total">
                    Hiển thị <strong>{tours.length}</strong> trên <strong>{total}</strong> yêu cầu
                  </span>

                  <div className="arh-pagination__controls">
                    <button
                      className="arh-page-btn"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {pageNumbers.map((num) => (
                      <button
                        key={num}
                        className={`arh-page-btn ${num === page ? 'is-active' : ''}`}
                        onClick={() => setPage(num)}
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      className="arh-page-btn"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Slideout Detail Drawer */}
      <FacilityTourDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTour(null);
        }}
        tour={selectedTour}
        onCancelSuccess={handleCancelSuccess}
      />
    </>
  );
}
