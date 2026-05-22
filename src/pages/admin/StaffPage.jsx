import { useEffect, useState } from 'react';
import { Search, Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import staffService from '../../services/staff.service';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/admin/StaffPage.css';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function StaffPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit };
      if (searchQuery) params.search = searchQuery;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.isActive = statusFilter;

      const response = await staffService.listStaffAccounts(params);
      setStaff(response.data || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load staff list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [page, limit, roleFilter, statusFilter, searchQuery]);

  const handleSearch = () => {
    setPage(1);
    setSearchQuery(searchText.trim());
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSearchQuery('');
    setRoleFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="staff-page">
      <div className="staff-page__header">
        <div>
          <h1 className="staff-page__title">User Management</h1>
          <p className="staff-page__subtitle">
            Manage organization staff profiles and system access levels.
          </p>
        </div>
        <div className="staff-page__actions">
          <button type="button" className="button button--outline" onClick={() => fetchStaff()}>
            <Download size={16} />
            Export
          </button>
          <button type="button" className="button button--primary" onClick={() => navigate('/admin/staff/create')}>
            <Plus size={16} />
            Add User
          </button>
        </div>
      </div>

      <div className="staff-page__controls">
        <div className="staff-search">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search staff, email, or code..."
          />
          <button type="button" className="button button--primary" onClick={handleSearch}>
            <Search size={16} />
            Search
          </button>
        </div>

        <div className="staff-page__filters">
          <div className="staff-filter">
            <label htmlFor="staff-role">Role</label>
            <select
              id="staff-role"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="staff-filter">
            <label htmlFor="staff-status">Status</label>
            <select
              id="staff-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="staff-filter">
            <label>&nbsp;</label>
            <button type="button" className="button button--outline" onClick={handleClearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="staff-table-card">
        <div className="staff-table-container">
          {loading ? (
            <LoadingSpinner label="Loading staff..." />
          ) : error ? (
            <div className="profile-card__empty">{error}</div>
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Staff Code</th>
                  <th>Role</th>
                  <th>Specialty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.length > 0 ? (
                  staff.map((item) => (
                    <tr key={item._id} className="staff-row">
                      <td>
                        <div className="staff-table__name">
                          <strong>{item.fullName || '—'}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="staff-table__email">{item.email || '—'}</span>
                      </td>
                      <td>{item.staffProfile?.staffCode || '—'}</td>
                      <td>{item.role?.toUpperCase() || '—'}</td>
                      <td>{item.staffProfile?.specialty || 'N/A'}</td>
                      <td>
                        <span className={`staff-badge ${item.isActive ? 'staff-badge--active' : 'staff-badge--inactive'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="profile-card__empty">
                      No staff members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="staff-pagination">
          <div className="staff-pagination__summary">
            Showing {staff.length} of {total} results
          </div>
          <div className="staff-pagination__actions">
            <button
              type="button"
              className="button button--outline staff-pagination__button"
              onClick={handlePrevPage}
              disabled={page <= 1}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              type="button"
              className="button button--outline staff-pagination__button"
              onClick={handleNextPage}
              disabled={page >= totalPages}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffPage;
