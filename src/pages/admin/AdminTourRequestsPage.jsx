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
  Users,
} from 'lucide-react';
import facilityTourService from '../../services/facilityTour.service';
import AdminTourDetailDrawer from '../../components/family/FacilityTour/AdminTourDetailDrawer';

// CSS Imports to align designs perfectly
import '../../styles/admin/AdminAdmissionRequestsPage.css';
import '../../styles/family/FacilityTourHistoryPage.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'confirmed', label: 'Approved & Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled / Rejected' },
];

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
      return 'status-badge-custom-adm--new'; // Blue/Slate theme for pending
    case 'confirmed':
      return 'status-badge-custom-adm--contracting'; // Green theme for confirmed
    case 'completed':
      return 'status-badge-custom-adm--checked-in'; // Emerald/Dark green for completed
    case 'cancelled':
      return 'status-badge-custom-adm--cancelled'; // Red theme for cancelled
    default:
      return 'status-badge-custom-adm--cancelled';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'pending':
      return 'Pending Review';
    case 'confirmed':
      return 'Confirmed';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status || 'Unknown';
  }
};

export default function AdminTourRequestsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Dashboard counter states
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
  });

  // Filter states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Active filters applied to query
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: '',
    from: '',
    to: '',
  });

  // Detail Drawer state
  const [selectedTourId, setSelectedTourId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch tour requests
  const fetchTours = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        search: appliedFilters.search || undefined,
        status: appliedFilters.status || undefined,
        from: appliedFilters.from || undefined,
        to: appliedFilters.to || undefined,
      };

      const res = await facilityTourService.adminGetTourList(params);

      setData(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);

      // Compute counter statistics
      if (res?.data) {
        setMetrics({
          total: res.total || 0,
          pending: res.data.filter(x => x.status === 'pending').length,
          confirmed: res.data.filter(x => x.status === 'confirmed').length,
          completed: res.data.filter(x => x.status === 'completed').length,
        });
      }
    } catch (err) {
      console.error('Failed to load facility tour requests:', err);
      setError('Could not retrieve facility tour requests. Please check your credentials or network connection.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  // Apply filters trigger
  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ search, status, from, to });
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
    setAppliedFilters({ search: '', status: '', from: '', to: '' });
  };

  // Open detail drawer
  const handleOpenDetails = (id) => {
    setSelectedTourId(id);
    setIsDrawerOpen(true);
  };

  // Close drawer
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedTourId(null);
  };

  const handleActionSuccess = () => {
    fetchTours();
  };

  return (
    <div className="adm-container">
      {/* Top Banner Header */}
      <div className="adm-header">
        <div>
          <h1>
            <Calendar className="text-emerald-sage" size={26} />
            Tour Booking Requests
          </h1>
          <p>
            Manage facility visitations, approve time slots, and consult with family member accounts.
          </p>
        </div>
        <button
          onClick={fetchTours}
          disabled={loading}
          className="adm-btn-refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Reload Data
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
            <span className="adm-stat-label">Total Requests</span>
            <span className="adm-stat-value">{total}</span>
          </div>
        </div>

        {/* Pending Card */}
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Clock size={22} />
          </div>
          <div>
            <span className="adm-stat-label">Pending Review</span>
            <span className="adm-stat-value">{data.filter(x => x.status === 'pending').length}</span>
          </div>
        </div>

        {/* Confirmed Card */}
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#effdf4', color: '#16a34a' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <span className="adm-stat-label">Confirmed Tours</span>
            <span className="adm-stat-value">{data.filter(x => x.status === 'confirmed').length}</span>
          </div>
        </div>

        {/* Completed Card */}
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#f0fdfa', color: '#0d9488' }}>
            <Users size={22} />
          </div>
          <div>
            <span className="adm-stat-label">Completed Tours</span>
            <span className="adm-stat-value">{data.filter(x => x.status === 'completed').length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="adm-filter-panel">
        <form onSubmit={handleApplyFilters}>
          <div className="adm-filter-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
            {/* Search Input */}
            <div className="adm-filter-group">
              <div className="adm-filter-input-wrapper">
                <Search className="adm-filter-input-icon" size={16} />
                <input
                  type="text"
                  className="adm-filter-input"
                  placeholder="Search contact name, phone, or email..."
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
          </div>

          {/* Secondary Filters - Dates & Buttons */}
          <div className="adm-filter-row-secondary">
            <div className="adm-filter-date-group">
              <span className="adm-date-title">
                <Calendar size={13} className="text-slate-400" /> Preferred Date Range:
              </span>

              <input
                type="date"
                className="adm-date-input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-slate-400 text-xs font-semibold">to</span>
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
                Clear Filters
              </button>
              <button
                type="submit"
                className="adm-btn-apply"
              >
                Apply Filters
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
            <p className="text-slate-500 text-sm">Retrieving tour requests...</p>
          </div>
        ) : error ? (
          <div className="p-10 flex flex-col items-center justify-center text-center bg-white" style={{ minHeight: '300px' }}>
            <AlertCircle className="text-red-500 mb-3" size={36} />
            <p className="text-slate-800 font-bold mb-1">An error occurred</p>
            <p className="text-slate-500 text-sm max-w-md">{error}</p>
            <button
              onClick={fetchTours}
              className="mt-4 px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-xl font-semibold transition-all"
            >
              Try Again
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center bg-white" style={{ minHeight: '300px' }}>
            <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-3" style={{ width: 'fit-content' }}>
              <Calendar size={30} />
            </div>
            <p className="text-slate-700 font-bold mb-1">No Tour Requests Found</p>
            <p className="text-slate-400 text-xs max-w-sm">
              We couldn't find any tour requests matching your search or filters.
            </p>
          </div>
        ) : (
          <div className="adm-table-responsive">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Primary Contact</th>
                  <th>Family Account Profile</th>
                  <th>Preferred Schedule</th>
                  <th style={{ textAlign: 'center' }}>Visitors</th>
                  <th>Submitted Date</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
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
                      #{row._id.substring(18).toUpperCase()}
                    </td>
                    <td>
                      <div className="cell-resident-name">{row.contactName || 'N/A'}</div>
                      <div className="cell-resident-meta">
                        {row.contactPhone || 'No Phone'}
                      </div>
                    </td>
                    <td>
                      <div className="cell-contact-name">
                        {row.familyAccount?.fullName || 'N/A'}
                        {row.familyAccount?.username && (
                          <span className="text-[11px] text-slate-400 font-normal ml-1.5">
                            (@{row.familyAccount.username})
                          </span>
                        )}
                      </div>
                      <div className="cell-contact-phone">
                        {row.familyAccount?.email || ''}
                      </div>
                    </td>
                    <td style={{ fontWeight: '500', color: '#475569' }}>
                      <div style={{ fontSize: '13px', color: '#1e293b' }}>
                        {formatEnglishDate(row.preferredDate)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Slot: {row.status === 'confirmed' ? (row.confirmedTimeSlot || row.preferredTimeSlot) : row.preferredTimeSlot}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>
                      {row.numberOfVisitors || 1}
                    </td>
                    <td className="cell-date">
                      {formatEnglishDate(row.createdAt)}
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
                        title="View details"
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
              Showing <span>{(page - 1) * limit + 1}</span> to{' '}
              <span>{Math.min(page * limit, total)}</span> of{' '}
              <span>{total}</span> tour bookings
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
                Page {page} / {totalPages}
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
      <AdminTourDetailDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        tourId={selectedTourId}
        onActionSuccess={handleActionSuccess}
      />
    </div>
  );
}
