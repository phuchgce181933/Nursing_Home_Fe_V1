import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import servicePackageService from '../../services/servicePackage.service';
import '../../styles/admin/AdminAdmissionRequestsPage.css'; // Reuse premium healthcare styles

const TIER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  { value: 'basic', label: 'Basic' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
];

const ACTIVE_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'true', label: 'Active Packages' },
  { value: 'false', label: 'Inactive Packages' },
];

export default function ServicePackagesPage() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'manager'].includes(user?.role);
  const rolePrefix = isAdmin ? 'admin' : 'medical';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filter states
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [isActive, setIsActive] = useState('true'); // Default filter to show active packages

  // Applied filters for query
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    tier: '',
    isActive: 'true',
  });

  // Modal states
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTier, setFormTier] = useState('standard');
  const [formPrice, setFormPrice] = useState(0);
  const [formServices, setFormServices] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Fetch list of service packages
  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        search: appliedFilters.search || undefined,
        tier: appliedFilters.tier || undefined,
        isActive: appliedFilters.isActive !== '' ? (appliedFilters.isActive === 'true') : undefined,
      };

      const res = await servicePackageService.getServicePackageList(params, rolePrefix);
      setData(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch service packages:', err);
      setError('Could not retrieve service packages. Please check your network or privileges.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters, rolePrefix]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Apply filters
  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ search, tier, isActive });
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setTier('');
    setIsActive('true');
    setPage(1);
    setAppliedFilters({ search: '', tier: '', isActive: 'true' });
  };

  // Load details
  const handleOpenDetail = async (pkgId) => {
    try {
      setError(null);
      const res = await servicePackageService.getServicePackageDetail(pkgId, rolePrefix);
      setSelectedPackage(res?.servicePackage || null);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Failed to load details:', err);
      alert('Could not retrieve package details. Please try again.');
    }
  };

  // Populate form for Edit
  const handleOpenEdit = (pkg) => {
    setSelectedPackage(pkg);
    setFormName(pkg.name || '');
    setFormDescription(pkg.description || '');
    setFormTier(pkg.tier || 'standard');
    setFormPrice(pkg.monthlyPrice || 0);
    setFormServices(pkg.services ? pkg.services.join('\n') : '');
    setFormError(null);
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormTier('standard');
    setFormPrice(0);
    setFormServices('');
    setFormError(null);
    setSelectedPackage(null);
  };

  // Create Package
  const handleCreatePackage = async (e) => {
    if (e) e.preventDefault();
    if (!formName.trim()) {
      setFormError('Package Name is required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const servicesArray = formServices
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await servicePackageService.createServicePackage({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        tier: formTier,
        monthlyPrice: Number(formPrice) || 0,
        services: servicesArray,
      });

      setShowCreateModal(false);
      resetForm();
      fetchPackages();
    } catch (err) {
      console.error('Failed to create package:', err);
      setFormError(err.response?.data?.message || 'An error occurred while creating the package.');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Package
  const handleUpdatePackage = async (e) => {
    if (e) e.preventDefault();
    if (!selectedPackage?._id) return;
    if (!formName.trim()) {
      setFormError('Package Name is required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const servicesArray = formServices
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await servicePackageService.updateServicePackage(selectedPackage._id, {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        tier: formTier,
        monthlyPrice: Number(formPrice) || 0,
        services: servicesArray,
      });

      setShowEditModal(false);
      resetForm();
      fetchPackages();
    } catch (err) {
      console.error('Failed to update package:', err);
      setFormError(err.response?.data?.message || 'An error occurred while updating the package.');
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete Package
  const handleDeletePackage = async (pkgId, pkgName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to deactivate/soft-delete "${pkgName}"? Deactivated packages cannot be assigned to new admissions.`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await servicePackageService.deleteServicePackage(pkgId);
      fetchPackages();
    } catch (err) {
      console.error('Failed to delete package:', err);
      alert(err.response?.data?.message || 'Could not deactivate package. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTierBadgeClass = (tierVal) => {
    switch (tierVal) {
      case 'basic':
        return 'assess-badge-adm--pending';
      case 'standard':
        return 'status-badge-custom-adm--consulting';
      case 'premium':
        return 'assess-badge-adm--eligible';
      case 'vip':
        return 'status-badge-custom-adm--contracting';
      default:
        return 'assess-badge-adm--pending';
    }
  };

  return (
    <div className="adm-container">
      {/* Top Banner Header */}
      <div className="adm-header">
        <div>
          <h1>Care Service Packages</h1>
          <p>
            {isAdmin
              ? 'Create, modify, view, and manage care packages for residents.'
              : 'View and check care service package details.'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="adm-btn-apply"
            style={{ borderRadius: '12px' }}
          >
            Create New Package
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <div className="adm-filter-panel">
        <form onSubmit={handleApplyFilters}>
          <div className="adm-filter-grid">
            <div className="adm-filter-group">
              <div className="adm-filter-input-wrapper">
                <Search className="adm-filter-input-icon" size={16} />
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  className="adm-filter-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="adm-filter-group">
              <select
                className="adm-filter-select"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
              >
                {TIER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adm-filter-group">
              <select
                className="adm-filter-select"
                value={isActive}
                onChange={(e) => setIsActive(e.target.value)}
              >
                {ACTIVE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-4">
            <button
              type="button"
              onClick={handleResetFilters}
              className="adm-btn-clear"
            >
              Reset Filters
            </button>
            <button type="submit" className="adm-btn-apply">
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Content Body */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-error p-4 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      <div className="adm-table-card">
        {loading && data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="animate-spin text-indigo-600 mb-3" size={32} />
            <p>Loading care service packages...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="font-medium">No service packages found matching filters.</p>
          </div>
        ) : (
          <div className="adm-table-responsive">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name & Tier</th>
                  <th>Price / Month</th>
                  <th>Services Included</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((pkg) => (
                  <tr key={pkg._id} className="adm-table-row">
                    <td
                      onClick={() => handleOpenDetail(pkg._id)}
                      className="cell-code-adm"
                    >
                      {pkg.packageCode || 'N/A'}
                    </td>
                    <td
                      onClick={() => handleOpenDetail(pkg._id)}
                      className="cell-resident-name"
                    >
                      <div className="flex items-center gap-2">
                        <span>{pkg.name}</span>
                        <span className={`status-badge-custom-adm ${getTierBadgeClass(pkg.tier)}`}>
                          {pkg.tier}
                        </span>
                      </div>
                    </td>
                    <td onClick={() => handleOpenDetail(pkg._id)}>
                      <span className="font-semibold text-slate-700">
                        {pkg.monthlyPrice?.toLocaleString() || 0} VND
                      </span>
                    </td>
                    <td onClick={() => handleOpenDetail(pkg._id)} style={{ maxWidth: '300px' }}>
                      <div className="flex flex-wrap gap-1">
                        {pkg.services && pkg.services.slice(0, 3).map((s, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-medium"
                          >
                            {s}
                          </span>
                        ))}
                        {pkg.services && pkg.services.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-bold italic ml-1">
                            +{pkg.services.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td onClick={() => handleOpenDetail(pkg._id)}>
                      <span
                        className={`status-badge-custom-adm ${
                          pkg.isActive
                            ? 'status-badge-custom-adm--checked-in'
                            : 'status-badge-custom-adm--cancelled'
                        }`}
                      >
                        {pkg.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenDetail(pkg._id)}
                          className="adm-btn-clear"
                          style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}
                        >
                          View
                        </button>
                        {isAdmin && pkg.isActive && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(pkg)}
                              className="adm-btn-apply"
                              style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', boxShadow: 'none' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePackage(pkg._id, pkg.name)}
                              className="arh-drawer__btn arh-drawer__btn--cancel"
                              style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', minHeight: 'unset' }}
                            >
                              Deactivate
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="adm-pagination-footer">
            <div className="pagination-info">
              Showing page <span>{page}</span> of <span>{totalPages}</span> ({total} total packages)
            </div>
            <div className="pagination-controls">
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage(page - 1)}
                className="btn-page"
              >
                Prev
              </button>
              <span className="page-indicator">{page}</span>
              <button
                disabled={page === totalPages || loading}
                onClick={() => setPage(page + 1)}
                className="btn-page"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Package Detail Modal */}
      {showDetailModal && selectedPackage && (
        <div className="arh-modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center w-full mb-3">
              <h4 className="arh-modal__title">{selectedPackage.name}</h4>
              <span className={`status-badge-custom-adm ${getTierBadgeClass(selectedPackage.tier)}`}>
                {selectedPackage.tier}
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">
              Code: {selectedPackage.packageCode}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-[#1B365D] mb-1.5 uppercase tracking-wide">
                Price per Month
              </label>
              <p className="text-lg font-bold text-[#1B365D] bg-[#1B365D]/5 px-3 py-2 rounded-xl border border-[#1B365D]/10">
                {selectedPackage.monthlyPrice?.toLocaleString()} VND
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
                Description
              </label>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                {selectedPackage.description || 'No description provided.'}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                Services Included
              </label>
              {selectedPackage.services && selectedPackage.services.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {selectedPackage.services.map((srv, i) => (
                    <div
                      key={i}
                      className="text-xs text-slate-700 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg font-sans"
                    >
                      • {srv}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No services listed.</p>
              )}
            </div>

            <button
              className="adm-btn-clear w-full"
              style={{ padding: '10px 24px', borderRadius: '20px' }}
              onClick={() => setShowDetailModal(false)}
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Package Create Modal */}
      {showCreateModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="arh-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Create Service Care Package</h4>
            <p className="arh-modal__text">
              Create a new care service plan with specific tier pricing and features.
            </p>

            <form onSubmit={handleCreatePackage}>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-error p-3 rounded-lg text-xs mb-4">
                  {formError}
                </div>
              )}

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Package Name *
                </label>
                <input
                  type="text"
                  className="adm-filter-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="e.g. Premium Health Plan"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Tier Level
                  </label>
                  <select
                    className="adm-filter-select"
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value)}
                  >
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Price / Month (VND)
                  </label>
                  <input
                    type="number"
                    className="adm-filter-input"
                    style={{ paddingLeft: '14px' }}
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '60px' }}
                  placeholder="Short summary of this care plan..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Included Services (One per line)
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '100px', fontFamily: 'monospace' }}
                  placeholder="e.g.&#10;24/7 Nursing Support&#10;Daily Health Monitoring&#10;Physical Therapy Sessions"
                  value={formServices}
                  onChange={(e) => setFormServices(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px' }}
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px', backgroundColor: '#1B365D' }}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="animate-spin mr-1" size={13} />}
                  Create Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Package Edit Modal */}
      {showEditModal && selectedPackage && (
        <div className="arh-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="arh-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Edit Care Package</h4>
            <p className="arh-modal__text">
              Modify details for <strong className="text-slate-800">{selectedPackage.name}</strong>.
            </p>

            <form onSubmit={handleUpdatePackage}>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-error p-3 rounded-lg text-xs mb-4">
                  {formError}
                </div>
              )}

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Package Name *
                </label>
                <input
                  type="text"
                  className="adm-filter-input"
                  style={{ paddingLeft: '14px' }}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Tier Level
                  </label>
                  <select
                    className="adm-filter-select"
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value)}
                  >
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Price / Month (VND)
                  </label>
                  <input
                    type="number"
                    className="adm-filter-input"
                    style={{ paddingLeft: '14px' }}
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '60px' }}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Included Services (One per line)
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '100px', fontFamily: 'monospace' }}
                  value={formServices}
                  onChange={(e) => setFormServices(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px' }}
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px', backgroundColor: '#1B365D' }}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="animate-spin mr-1" size={13} />}
                  Update Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
