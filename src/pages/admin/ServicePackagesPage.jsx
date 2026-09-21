import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Grid, List, Activity, Check, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import servicePackageService from '../../services/servicePackage.service';
import '../../styles/admin/ServicePackagesPage.css'; // Premium care plans styling sheet

export default function ServicePackagesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const rolePrefix = isAdmin ? 'admin' : 'medical';

  const TIER_OPTIONS = [
    { value: '', label: t('admin.servicePackages.allTiers', 'All Tiers') },
    { value: 'basic', label: t('admin.servicePackages.tierBasic', 'Basic Level') },
    { value: 'standard', label: t('admin.servicePackages.tierStandard', 'Standard Level') },
    { value: 'premium', label: t('admin.servicePackages.tierPremium', 'Premium Level') },
    { value: 'vip', label: t('admin.servicePackages.tierVip', 'VIP Level') },
  ];

  const ACTIVE_OPTIONS = [
    { value: '', label: t('admin.servicePackages.colStatus', 'All Statuses') },
    { value: 'true', label: t('admin.servicePackages.activePackages', 'Active Packages') },
    { value: 'false', label: t('admin.servicePackages.inactivePackages', 'Inactive Packages') },
  ];

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // View style toggle: 'grid' (SaaS care cards) or 'table' (administrative row data)
  const [viewType, setViewType] = useState('grid');

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20); // Show more items in grid view
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Stats counters
  const [stats, setStats] = useState({
    totalPlans: 0,
    activePlans: 0,
    vipPremiumPlans: 0,
  });

  // Filter states
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [isActive, setIsActive] = useState('true'); // Default filter to active packages

  // Applied filters
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
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [packageToDeactivate, setPackageToDeactivate] = useState(null);

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

      // Compute statistics dynamically from the loaded dataset
      if (res?.data) {
        setStats({
          totalPlans: res.total || 0,
          activePlans: res.data.filter(x => x.isActive).length,
          vipPremiumPlans: res.data.filter(x => ['premium', 'vip'].includes(x.tier)).length,
        });
      }
    } catch (err) {
      console.error('Failed to fetch service packages:', err);
      setError(t('admin.servicePackages.fetchError'));
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

  // Load details modal
  const handleOpenDetail = async (pkgId) => {
    try {
      setError(null);
      const res = await servicePackageService.getServicePackageDetail(pkgId, rolePrefix);
      setSelectedPackage(res?.servicePackage || null);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Failed to load details:', err);
      showToast(t('admin.servicePackages.loadDetailError'), 'error');
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
      setFormError(t('admin.servicePackages.nameRequired'));
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
      setFormError(err.response?.data?.message || t('admin.servicePackages.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  // Update Package
  const handleUpdatePackage = async (e) => {
    if (e) e.preventDefault();
    if (!selectedPackage?._id) return;
    if (!formName.trim()) {
      setFormError(t('admin.servicePackages.nameRequired'));
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
      setFormError(err.response?.data?.message || t('admin.servicePackages.updateError'));
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete Package
  const handleDeletePackage = (pkgId, pkgName) => {
    setPackageToDeactivate({ id: pkgId, name: pkgName });
    setShowDeactivateConfirm(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!packageToDeactivate) return;
    try {
      setLoading(true);
      await servicePackageService.deleteServicePackage(packageToDeactivate.id);
      setShowDeactivateConfirm(false);
      setPackageToDeactivate(null);
      fetchPackages();
    } catch (err) {
      console.error('Failed to delete package:', err);
      showToast(err.response?.data?.message || t('admin.servicePackages.deactivateError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTierTagClass = (tierVal) => {
    switch (tierVal) {
      case 'basic':
        return 'sp-tier-tag--basic';
      case 'standard':
        return 'sp-tier-tag--standard';
      case 'premium':
        return 'sp-tier-tag--premium';
      case 'vip':
        return 'sp-tier-tag--vip';
      default:
        return 'sp-tier-tag--basic';
    }
  };

  const getDossierHeaderClass = (tierVal) => {
    switch (tierVal) {
      case 'basic':
        return 'dossier-header--basic';
      case 'standard':
        return 'dossier-header--standard';
      case 'premium':
        return 'dossier-header--premium';
      case 'vip':
        return 'dossier-header--vip';
      default:
        return 'dossier-header--basic';
    }
  };

  const getCardHeaderClass = (tierVal) => {
    switch (tierVal) {
      case 'basic':
        return 'sp-card__header--basic';
      case 'standard':
        return 'sp-card__header--standard';
      case 'premium':
        return 'sp-card__header--premium';
      case 'vip':
        return 'sp-card__header--vip';
      default:
        return 'sp-card__header--basic';
    }
  };

  return (
    <div className="sp-container">
      {/* Top Banner Header */}
      <div className="sp-header">
        <div>
          <h1>{t('admin.servicePackages.title', 'Care Service Packages')}</h1>
          <p>
            {isAdmin
              ? t('admin.servicePackages.subtitleAdmin', 'Configure, manage, and monitor residential care packages for elderly residents.')
              : t('admin.servicePackages.subtitleMedical', 'Review standard medical and care service packages.')}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="sp-btn-edit"
            style={{ borderRadius: '12px', padding: '12px 24px' }}
          >
            {t('admin.servicePackages.createNew', 'Create New Package')}
          </button>
        )}
      </div>

      {/* Stats Dashboard Banner */}
      <div className="sp-stats-grid">
        <div className="sp-stat-card">
          <div className="sp-stat-icon-wrapper">
            <Activity size={20} />
          </div>
          <div className="sp-stat-info">
            <span className="sp-stat-label">{t('admin.servicePackages.totalPlans', 'Total Care Plans')}</span>
            <span className="sp-stat-value">{stats.totalPlans}</span>
          </div>
        </div>

        <div className="sp-stat-card active">
          <div className="sp-stat-icon-wrapper">
            <CheckCircle size={20} />
          </div>
          <div className="sp-stat-info">
            <span className="sp-stat-label">{t('admin.servicePackages.activePlans', 'Active Plans')}</span>
            <span className="sp-stat-value">{stats.activePlans}</span>
          </div>
        </div>

        <div className="sp-stat-card">
          <div className="sp-stat-icon-wrapper">
            <span className="font-bold text-xs">VIP</span>
          </div>
          <div className="sp-stat-info">
            <span className="sp-stat-label">{t('admin.servicePackages.vipPremium', 'VIP & Premium')}</span>
            <span className="sp-stat-value">{stats.vipPremiumPlans}</span>
          </div>
        </div>
      </div>

      {/* Filter and View Toggle bar */}
      <div className="sp-action-bar">
        <div className="sp-filter-row">
          <form onSubmit={handleApplyFilters} className="flex flex-wrap gap-3 items-center w-full">
            <div className="adm-filter-group" style={{ minWidth: '240px' }}>
              <div className="adm-filter-input-wrapper">
                <Search className="adm-filter-input-icon" size={16} />
                <input
                  type="text"
                  placeholder={t('admin.servicePackages.searchPlaceholder', 'Search name or package code...')}
                  className="adm-filter-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="adm-filter-group" style={{ minWidth: '160px' }}>
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

            <div className="adm-filter-group" style={{ minWidth: '160px' }}>
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="adm-btn-clear"
                style={{ padding: '10px 18px' }}
              >
                {t('admin.servicePackages.reset', 'Reset')}
              </button>
              <button
                type="submit"
                className="adm-btn-apply"
                style={{ padding: '10px 20px', background: '#1B365D' }}
              >
                {t('admin.servicePackages.applyFilters', 'Apply Filters')}
              </button>
            </div>
          </form>
        </div>

        {/* View Toggle (Grid / Table) */}
        <div className="sp-view-toggle">
          <button
            onClick={() => setViewType('grid')}
            className={`sp-toggle-btn ${viewType === 'grid' ? 'is-active' : ''}`}
            title={t('admin.servicePackages.gridCard', 'Grid Card')}
          >
            <Grid size={15} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
            {t('admin.servicePackages.gridCard', 'Grid Card')}
          </button>
          <button
            onClick={() => setViewType('table')}
            className={`sp-toggle-btn ${viewType === 'table' ? 'is-active' : ''}`}
            title={t('admin.servicePackages.tableRows', 'Table Rows')}
          >
            <List size={15} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
            {t('admin.servicePackages.tableRows', 'Table Rows')}
          </button>
        </div>
      </div>

      {/* Content Body */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-error p-4 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      {loading && data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="animate-spin text-indigo-600 mb-3" size={32} />
          <p>{t('admin.servicePackages.loading', 'Loading care service packages...')}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-100 rounded-2xl">
          <p className="font-medium">{t('admin.servicePackages.noPackages', 'No service packages found matching filters.')}</p>
        </div>
      ) : viewType === 'grid' ? (
        /* GORGEOUS PREMIUM CARE PLANS GRID VIEW */
        <div className="sp-card-grid">
          {data.map((pkg) => (
            <div key={pkg._id} className="sp-card">
              <div className={`sp-card__header ${getCardHeaderClass(pkg.tier)}`}>
                <span className="sp-card__code">{pkg.packageCode || 'PKG-SERVICE'}</span>
                <div className="sp-card__title-row">
                  <span className="sp-card__title">{pkg.name}</span>
                  <span className={`sp-tier-tag ${getTierTagClass(pkg.tier)}`}>
                    {t(`admin.servicePackages.tier${pkg.tier.charAt(0).toUpperCase() + pkg.tier.slice(1)}`, pkg.tier)}
                  </span>
                </div>
              </div>

              <div className="sp-card__body">
                <span className="sp-card__price-label">{t('admin.servicePackages.pricingRate', 'Pricing Rate')}</span>
                <p className="sp-card__price">
                  {pkg.monthlyPrice?.toLocaleString() || 0}
                  <span>{t('admin.servicePackages.vndMonth', 'VND / month')}</span>
                </p>

                <p className="sp-card__desc">
                  {pkg.description || 'Comprehensive clinical care and daily living assistance for residents.'}
                </p>

                <div className="sp-card__divider" />

                <span className="sp-card__services-title">{t('admin.servicePackages.servicesIncluded', 'Services Included')}</span>
                <div className="sp-card__services-list">
                  {pkg.services && pkg.services.slice(0, 4).map((s, idx) => (
                    <div key={idx} className="sp-card__service-item">
                      <Check size={13} className="sp-card__service-bullet" />
                      <span>{s}</span>
                    </div>
                  ))}
                  {pkg.services && pkg.services.length > 4 && (
                    <span className="text-[11.5px] text-[#2D6A4F] font-bold italic mt-1 pl-5">
                      +{pkg.services.length - 4} {t('admin.servicePackages.otherClinical', 'other clinical features')}
                    </span>
                  )}
                </div>
              </div>

              <div className="sp-card__footer">
                <button
                  onClick={() => handleOpenDetail(pkg._id)}
                  className="sp-btn-view"
                >
                  {t('admin.servicePackages.viewDetails', 'View Details')}
                </button>
                {isAdmin && pkg.isActive && (
                  <>
                    <button
                      onClick={() => handleOpenEdit(pkg)}
                      className="sp-btn-edit"
                    >
                      {t('admin.servicePackages.edit', 'Edit')}
                    </button>
                    <button
                      onClick={() => handleDeletePackage(pkg._id, pkg.name)}
                      className="sp-btn-deactivate"
                    >
                      {t('admin.servicePackages.deactivate', 'Deactivate')}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* PROFESSIONAL ADMINISTRATIVE TABLE VIEW */
        <div className="adm-table-card">
          <div className="adm-table-responsive">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('admin.servicePackages.colCode', 'Code')}</th>
                  <th>{t('admin.servicePackages.colName', 'Name & Tier')}</th>
                  <th>{t('admin.servicePackages.colPrice', 'Price / Month')}</th>
                  <th>{t('admin.servicePackages.colServices', 'Services Included')}</th>
                  <th>{t('admin.servicePackages.colStatus', 'Status')}</th>
                  <th>{t('admin.servicePackages.colActions', 'Actions')}</th>
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
                        <span className={`sp-tier-tag ${getTierTagClass(pkg.tier)}`}>
                          {t(`admin.servicePackages.tier${pkg.tier.charAt(0).toUpperCase() + pkg.tier.slice(1)}`, pkg.tier)}
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
                            +{pkg.services.length - 3} {t('admin.servicePackages.otherClinical', 'more')}
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
                        {pkg.isActive ? t('admin.servicePackages.active', 'Active') : t('admin.servicePackages.inactive', 'Inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenDetail(pkg._id)}
                          className="sp-btn-view"
                          style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                        >
                          {t('admin.servicePackages.viewDetails', 'View')}
                        </button>
                        {isAdmin && pkg.isActive && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(pkg)}
                              className="sp-btn-edit"
                              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                            >
                              {t('admin.servicePackages.edit', 'Edit')}
                            </button>
                            <button
                              onClick={() => handleDeletePackage(pkg._id, pkg.name)}
                              className="sp-btn-deactivate"
                              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                            >
                              {t('admin.servicePackages.deactivate', 'Deactivate')}
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
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="adm-pagination-footer" style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div className="pagination-info">
            {t('admin.servicePackages.paginationInfo', { page, totalPages, total })}
          </div>
          <div className="pagination-controls">
            <button
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
              className="btn-page"
            >
              {t('admin.servicePackages.prev', 'Prev')}
            </button>
            <span className="page-indicator">{page}</span>
            <button
              disabled={page === totalPages || loading}
              onClick={() => setPage(page + 1)}
              className="btn-page"
            >
              {t('admin.servicePackages.next', 'Next')}
            </button>
          </div>
        </div>
      )}

      {/* GORGEOUS MEDICAL CARE PLAN DOSSIER (Detail Modal Overlay) */}
      {showDetailModal && selectedPackage && (
        <div className="arh-modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="arh-modal dossier-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header with custom tier background gradient */}
            <div className={`dossier-header ${getDossierHeaderClass(selectedPackage.tier)}`}>
              <span className="dossier-header__code">{t('admin.servicePackages.dossierLabel', 'Dossier:')} {selectedPackage.packageCode || 'PKG-DOSSIER'}</span>
              <div className="dossier-header__title-row">
                <h3 className="dossier-header__title">{selectedPackage.name}</h3>
                <span className="dossier-header__tag">{selectedPackage.tier}</span>
              </div>
            </div>

            {/* Content Body (Clean clinical grid, no crude text boxes!) */}
            <div className="dossier-body">
              {/* Premium Pricing Highlight Panel */}
              <div className="dossier-price-panel">
                <span className="dossier-price-label">{t('admin.servicePackages.pricePerMonth', 'Unit Price / Month')}</span>
                <span className="dossier-price-value">
                  {selectedPackage.monthlyPrice?.toLocaleString()} <span>VND</span>
                </span>
              </div>

              {/* Italic plan description dossier block */}
              <span className="dossier-section-title">{t('admin.servicePackages.packageDescription', 'Service Package Description')}</span>
              <div className="dossier-desc">
                "{selectedPackage.description || 'Standard specialized clinical services, health monitoring, and cognitive assistance designated for elderly care.'}"
              </div>

              {/* Included services with checkmark bullets */}
              <span className="dossier-section-title">{t('admin.servicePackages.medicalServices', 'Included Medical Services')}</span>
              <div className="dossier-services-box">
                {selectedPackage.services && selectedPackage.services.length > 0 ? (
                  selectedPackage.services.map((srv, i) => (
                    <div key={i} className="dossier-service-row">
                      <span className="dossier-service-bullet">
                        <Check size={14} strokeWidth={3} />
                      </span>
                      <span>{srv}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-3 text-center">{t('admin.servicePackages.noServicesAdded', 'No services have been added to this package yet.')}</p>
                )}
              </div>

              {/* dossier footer with unified button */}
              <div className="dossier-footer">
                <button
                  type="button"
                  className="sp-btn-close-dossier"
                  onClick={() => setShowDetailModal(false)}
                >
                  {t('admin.servicePackages.closeDetail', 'Close Details')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Package Create Modal */}
      {showCreateModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="arh-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">{t('admin.servicePackages.createModalTitle', 'Create New Care Service Package')}</h4>
            <p className="arh-modal__text">
              {t('admin.servicePackages.createModalText', 'Set up a new specialized medical care package to apply when residents are admitted.')}
            </p>

            <form onSubmit={handleCreatePackage}>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-error p-3 rounded-lg text-xs mb-4">
                  {formError}
                </div>
              )}

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  {t('admin.servicePackages.labelPackageName', 'Service Package Name *')}
                </label>
                <input
                  type="text"
                  className="adm-filter-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder={t('admin.servicePackages.packageNamePlaceholder', 'E.g.: Standard Rehabilitation Care Package')}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    {t('admin.servicePackages.labelTier', 'Package Tier')}
                  </label>
                  <select
                    className="adm-filter-select"
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value)}
                  >
                    <option value="basic">{t('admin.servicePackages.tierBasicOption', 'Basic')}</option>
                    <option value="standard">{t('admin.servicePackages.tierStandardOption', 'Standard')}</option>
                    <option value="premium">{t('admin.servicePackages.tierPremiumOption', 'Premium')}</option>
                    <option value="vip">{t('admin.servicePackages.tierVipOption', 'VIP')}</option>
                  </select>
                  <small style={{ color: '#0f766e', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 500 }}>
                    {formTier === 'vip' && t('admin.servicePackages.roomTypeVip', '🏥 Room Type: ICU / Isolation')}
                    {formTier === 'premium' && t('admin.servicePackages.roomTypePremium', '🌟 Room Type: Premium')}
                    {(formTier === 'standard' || formTier === 'basic') && t('admin.servicePackages.roomTypeStandard', '🏠 Room Type: Standard')}
                  </small>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    {t('admin.servicePackages.labelPriceMonth', 'Unit Price / Month (VND)')}
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
                  {t('admin.servicePackages.labelDescription', 'Detailed Description')}
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '60px' }}
                  placeholder={t('admin.servicePackages.descriptionPlaceholder', 'Summarize notable care features, suitable health profiles...')}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  {t('admin.servicePackages.labelServices', 'Included Services (One service per line)')}
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '120px', fontFamily: 'monospace' }}
                  placeholder={t('admin.servicePackages.servicesPlaceholder', 'E.g.:\nPeriodic in-depth medical assessment\n24/7 nursing support\nClinical medication management')}
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
                  {t('admin.servicePackages.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="sp-btn-edit flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px' }}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="animate-spin mr-1" size={13} />}
                  {t('admin.servicePackages.createSubmit', 'Create Package')}
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
            <h4 className="arh-modal__title">{t('admin.servicePackages.editModalTitle', 'Edit Service Package')}</h4>
            <p className="arh-modal__text">
              {t('admin.servicePackages.editModalText', { name: selectedPackage.name })}
            </p>

            <form onSubmit={handleUpdatePackage}>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-error p-3 rounded-lg text-xs mb-4">
                  {formError}
                </div>
              )}

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  {t('admin.servicePackages.labelPackageName', 'Service Package Name *')}
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
                    {t('admin.servicePackages.labelTier', 'Package Tier')}
                  </label>
                  <select
                    className="adm-filter-select"
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value)}
                  >
                     <option value="basic">{t('admin.servicePackages.tierBasicOption', 'Basic')}</option>
                     <option value="standard">{t('admin.servicePackages.tierStandardOption', 'Standard')}</option>
                     <option value="premium">{t('admin.servicePackages.tierPremiumOption', 'Premium')}</option>
                     <option value="vip">{t('admin.servicePackages.tierVipOption', 'VIP')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    {t('admin.servicePackages.labelPriceMonth', 'Unit Price / Month (VND)')}
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
                  {t('admin.servicePackages.labelDescription', 'Detailed Description')}
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
                  {t('admin.servicePackages.labelServices', 'Included Services (One service per line)')}
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '120px', fontFamily: 'monospace' }}
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
                  {t('admin.servicePackages.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="sp-btn-edit flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px' }}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="animate-spin mr-1" size={13} />}
                  {t('admin.servicePackages.updateSubmit', 'Update Package')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Deactivation Confirmation Modal */}
      {showDeactivateConfirm && packageToDeactivate && (
        <div className="arh-modal-backdrop animate-fade-in" onClick={() => {
          if (!loading) {
            setShowDeactivateConfirm(false);
            setPackageToDeactivate(null);
          }
        }}>
          <div className="arh-modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title" style={{ color: '#ef4444' }}>{t('admin.servicePackages.deactivateModalTitle', 'Deactivate Service Package')}</h4>
            <p className="arh-modal__text" style={{ marginBottom: '24px', fontSize: '14.5px', color: '#475569' }}>
              {t('admin.servicePackages.deactivateModalText', { name: packageToDeactivate.name })}
              <span className="block mt-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('admin.servicePackages.deactivateWarning', 'Deactivated service packages cannot be assigned to new residents.')}
              </span>
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                className="adm-btn-clear flex-1"
                style={{ borderRadius: '20px', padding: '12px', fontSize: '13.5px', fontWeight: '600' }}
                onClick={() => {
                  setShowDeactivateConfirm(false);
                  setPackageToDeactivate(null);
                }}
                disabled={loading}
              >
                {t('admin.servicePackages.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                className="flex-1 justify-center align-middle text-center"
                style={{
                  borderRadius: '20px',
                  padding: '12px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                onClick={handleConfirmDeactivate}
                disabled={loading}
              >
                {loading && <Loader2 className="animate-spin mr-2" size={14} />}
                {t('admin.servicePackages.confirmDeactivate', 'Confirm Deactivation')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
