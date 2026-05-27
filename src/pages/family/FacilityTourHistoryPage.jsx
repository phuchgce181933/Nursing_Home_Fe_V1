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

const formatEnglishDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
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
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
  }
};

export default function FacilityTourHistoryPage() {
  const navigate = useNavigate();

  // Filters & Pagination states
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
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
            <h1 className="arh-header__title">Facility Tours History</h1>
            <p className="arh-header__subtitle">
              Manage and track your scheduled visits to An Nhiên Care Home.
            </p>
          </div>
          <button
            className="arh-btn arh-btn--primary"
            onClick={() => navigate('/family/facility-tours/new')}
          >
            <Plus size={16} />
            Schedule New Tour
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
              <span className="arh-stat-card__label">Active Bookings</span>
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
              <span className="arh-stat-card__label">Completed Tours</span>
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
              <span className="arh-stat-card__label">Total Scheduled</span>
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
              placeholder="Search by contact name..."
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
              <option value="">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="confirmed">Approved & Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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

        {/* Request List Section */}
        <div className="arh-table-container">
          {loading ? (
            <div className="arh-loading">
              <Loader2 size={32} className="arh-spinner" />
              <span>Loading facility tour history...</span>
            </div>
          ) : tours.length === 0 ? (
            <div className="arh-empty">
              <Inbox size={48} className="arh-empty__icon" />
              <h4>No Tour Requests Found</h4>
              <p>You haven't scheduled any visits or no requests match the current filters.</p>
              <button
                className="arh-btn arh-btn--primary mt-4"
                onClick={() => navigate('/family/facility-tours/new')}
              >
                Schedule New Tour
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="arh-table-wrapper">
                <table className="arh-table">
                  <thead>
                    <tr>
                      <th>Contact Person</th>
                      <th>Contact Phone</th>
                      <th>Preferred Date</th>
                      <th>Time Slot</th>
                      <th>Visitors</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tours.map((t) => (
                      <tr key={t._id}>
                        <td>
                          <strong className="text-slate-800">{t.contactName}</strong>
                        </td>
                        <td>{t.contactPhone}</td>
                        <td>{formatEnglishDate(t.preferredDate)}</td>
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
                            title="View Detail"
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
                        <span>Date:</span>
                        <strong>{formatEnglishDate(t.preferredDate)}</strong>
                      </div>
                      <div className="arh-mobile-card__row">
                        <span>Time Slot:</span>
                        <strong>{t.preferredTimeSlot || 'N/A'}</strong>
                      </div>
                      <div className="arh-mobile-card__row">
                        <span>Visitors:</span>
                        <strong>{t.numberOfVisitors}</strong>
                      </div>
                    </div>

                    <div className="arh-mobile-card__footer">
                      <button
                        className="arh-action-btn w-full"
                        onClick={() => handleOpenDetail(t)}
                      >
                        <Eye size={16} />
                        View Full Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="arh-pagination">
                  <span className="arh-pagination__total">
                    Showing <strong>{tours.length}</strong> of <strong>{total}</strong> requests
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
