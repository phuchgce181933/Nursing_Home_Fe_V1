import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Grid, List, Activity, Check, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import servicePackageService from '../../services/servicePackage.service';
import '../../styles/admin/ServicePackagesPage.css'; // Premium care plans styling sheet

const TIER_OPTIONS = [
  { value: '', label: 'Tất cả cấp độ' },
  { value: 'basic', label: 'Cơ bản' },
  { value: 'standard', label: 'Tiêu chuẩn' },
  { value: 'premium', label: 'Cao cấp' },
  { value: 'vip', label: 'VIP' },
];

const ACTIVE_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'true', label: 'Gói đang hoạt động' },
  { value: 'false', label: 'Gói không hoạt động' },
];

export default function ServicePackagesPage() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'manager'].includes(user?.role);
  const rolePrefix = isAdmin ? 'admin' : 'medical';

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
      setError('Không thể tải danh sách gói dịch vụ. Vui lòng kiểm tra quyền truy cập hoặc kết nối mạng.');
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
      alert('Không thể tải thông tin gói dịch vụ. Vui lòng thử lại.');
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
      setFormError('Tên gói dịch vụ là bắt buộc');
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
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo gói dịch vụ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Package
  const handleUpdatePackage = async (e) => {
    if (e) e.preventDefault();
    if (!selectedPackage?._id) return;
    if (!formName.trim()) {
      setFormError('Tên gói dịch vụ là bắt buộc');
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
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật gói dịch vụ.');
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
      alert(err.response?.data?.message || 'Không thể vô hiệu hóa gói dịch vụ. Vui lòng thử lại.');
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
          <h1>Gói dịch vụ chăm sóc</h1>
          <p>
            {isAdmin
              ? 'Cấu hình, quản lý và theo dõi các gói chăm sóc cho cư dân cao tuổi.'
              : 'Xem các gói dịch vụ y tế và chăm sóc tiêu chuẩn.'}
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
            Tạo gói mới
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
            <span className="sp-stat-label">Tổng gói chăm sóc</span>
            <span className="sp-stat-value">{stats.totalPlans}</span>
          </div>
        </div>

        <div className="sp-stat-card active">
          <div className="sp-stat-icon-wrapper">
            <CheckCircle size={20} />
          </div>
          <div className="sp-stat-info">
            <span className="sp-stat-label">Gói đang hoạt động</span>
            <span className="sp-stat-value">{stats.activePlans}</span>
          </div>
        </div>

        <div className="sp-stat-card">
          <div className="sp-stat-icon-wrapper">
            <span className="font-bold text-xs">VIP</span>
          </div>
          <div className="sp-stat-info">
            <span className="sp-stat-label">VIP & Cao cấp</span>
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
                  placeholder="Tìm theo tên hoặc mã gói..."
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
                Đặt lại
              </button>
              <button
                type="submit"
                className="adm-btn-apply"
                style={{ padding: '10px 20px', background: '#1B365D' }}
              >
                Áp dụng bộ lọc
              </button>
            </div>
          </form>
        </div>

        {/* View Toggle (Grid / Table) */}
        <div className="sp-view-toggle">
          <button
            onClick={() => setViewType('grid')}
            className={`sp-toggle-btn ${viewType === 'grid' ? 'is-active' : ''}`}
            title="Dạng lưới"
          >
            <Grid size={15} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
            Dạng lưới
          </button>
          <button
            onClick={() => setViewType('table')}
            className={`sp-toggle-btn ${viewType === 'table' ? 'is-active' : ''}`}
            title="Dạng bảng"
          >
            <List size={15} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
            Dạng bảng
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
          <p>Đang tải gói dịch vụ chăm sóc...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-100 rounded-2xl">
          <p className="font-medium">Không tìm thấy gói dịch vụ nào phù hợp với bộ lọc.</p>
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
                    {pkg.tier}
                  </span>
                </div>
              </div>

              <div className="sp-card__body">
                <span className="sp-card__price-label">Mức giá</span>
                <p className="sp-card__price">
                  {pkg.monthlyPrice?.toLocaleString() || 0}
                  <span>VND / tháng</span>
                </p>

                <p className="sp-card__desc">
                  {pkg.description || 'Chăm sóc lâm sàng toàn diện và hỗ trợ sinh hoạt hàng ngày cho cư dân.'}
                </p>

                <div className="sp-card__divider" />

                <span className="sp-card__services-title">Dịch vụ bao gồm</span>
                <div className="sp-card__services-list">
                  {pkg.services && pkg.services.slice(0, 4).map((s, idx) => (
                    <div key={idx} className="sp-card__service-item">
                      <Check size={13} className="sp-card__service-bullet" />
                      <span>{s}</span>
                    </div>
                  ))}
                  {pkg.services && pkg.services.length > 4 && (
                    <span className="text-[11.5px] text-[#2D6A4F] font-bold italic mt-1 pl-5">
                      +{pkg.services.length - 4} tính năng khác
                    </span>
                  )}
                </div>
              </div>

              <div className="sp-card__footer">
                <button
                  onClick={() => handleOpenDetail(pkg._id)}
                  className="sp-btn-view"
                >
                  Xem chi tiết
                </button>
                {isAdmin && pkg.isActive && (
                  <>
                    <button
                      onClick={() => handleOpenEdit(pkg)}
                      className="sp-btn-edit"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDeletePackage(pkg._id, pkg.name)}
                      className="sp-btn-deactivate"
                    >
                      Vô hiệu hóa
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
                  <th>Mã</th>
                  <th>Tên & Cấp độ</th>
                  <th>Giá / Tháng</th>
                  <th>Dịch vụ bao gồm</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
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
                            +{pkg.services.length - 3} dịch vụ khác
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
                        {pkg.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenDetail(pkg._id)}
                          className="sp-btn-view"
                          style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                        >
                          Xem
                        </button>
                        {isAdmin && pkg.isActive && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(pkg)}
                              className="sp-btn-edit"
                              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDeletePackage(pkg._id, pkg.name)}
                              className="sp-btn-deactivate"
                              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                            >
                              Vô hiệu hóa
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
            Trang <span>{page}</span> / <span>{totalPages}</span> ({total} gói dịch vụ)
          </div>
          <div className="pagination-controls">
            <button
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
              className="btn-page"
            >
              Trước
            </button>
            <span className="page-indicator">{page}</span>
            <button
              disabled={page === totalPages || loading}
              onClick={() => setPage(page + 1)}
              className="btn-page"
            >
              Tiếp
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
              <span className="dossier-header__code">Dossier: {selectedPackage.packageCode || 'PKG-DOSSIER'}</span>
              <div className="dossier-header__title-row">
                <h3 className="dossier-header__title">{selectedPackage.name}</h3>
                <span className="dossier-header__tag">{selectedPackage.tier}</span>
              </div>
            </div>

            {/* Content Body (Clean clinical grid, no crude text boxes!) */}
            <div className="dossier-body">
              {/* Premium Pricing Highlight Panel */}
              <div className="dossier-price-panel">
                <span className="dossier-price-label">Giá mỗi tháng</span>
                <span className="dossier-price-value">
                  {selectedPackage.monthlyPrice?.toLocaleString()} <span>VND/tháng</span>
                </span>
              </div>

              {/* Italic plan description dossier block */}
              <span className="dossier-section-title">Mô tả dịch vụ chăm sóc</span>
              <div className="dossier-desc">
                "{selectedPackage.description || 'Các dịch vụ lâm sàng chuyên biệt tiêu chuẩn, theo dõi sức khỏe và hỗ trợ nhận thức dành cho chăm sóc người cao tuổi.'}"
              </div>

              {/* Included services with checkmark bullets */}
              <span className="dossier-section-title">Dịch vụ y tế bao gồm</span>
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
                  <p className="text-xs text-slate-400 italic py-3 text-center">Chưa có dịch vụ nào được chỉ định cho cấp độ này.</p>
                )}
              </div>

              {/* dossier footer with unified button */}
              <div className="dossier-footer">
                <button
                  type="button"
                  className="sp-btn-close-dossier"
                  onClick={() => setShowDetailModal(false)}
                >
                  Đóng hồ sơ
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
            <h4 className="arh-modal__title">Tạo gói dịch vụ chăm sóc</h4>
            <p className="arh-modal__text">
              Tạo gói dịch vụ chăm sóc sức khỏe chuyên biệt mới cho các trường hợp nhận vào.
            </p>

            <form onSubmit={handleCreatePackage}>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-error p-3 rounded-lg text-xs mb-4">
                  {formError}
                </div>
              )}

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Tên gói dịch vụ *
                </label>
                <input
                  type="text"
                  className="adm-filter-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="VD: Gói chăm sóc lâm sàng tiêu chuẩn"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Cấp độ
                  </label>
                  <select
                    className="adm-filter-select"
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value)}
                  >
                    <option value="basic">Cơ bản</option>
                    <option value="standard">Tiêu chuẩn</option>
                    <option value="premium">Cao cấp</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Giá / Tháng (VND)
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
                  Mô tả
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '60px' }}
                  placeholder="Tóm tắt các tính năng chăm sóc, yêu cầu sức khỏe phù hợp..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Dịch vụ bao gồm (mỗi dòng một dịch vụ)
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '120px', fontFamily: 'monospace' }}
                  placeholder="VD:&#10;Đánh giá lão khoa chuyên biệt&#10;Hỗ trợ y tá lão khoa 24/7&#10;Quản lý thuốc lâm sàng"
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
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="sp-btn-edit flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px' }}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="animate-spin mr-1" size={13} />}
                  Tạo gói
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
            <h4 className="arh-modal__title">Chỉnh sửa gói dịch vụ chăm sóc</h4>
            <p className="arh-modal__text">
              Chỉnh sửa thông tin giá và tính năng cho <strong className="text-slate-800">{selectedPackage.name}</strong>.
            </p>

            <form onSubmit={handleUpdatePackage}>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-error p-3 rounded-lg text-xs mb-4">
                  {formError}
                </div>
              )}

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Tên gói dịch vụ *
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
                    Cấp độ
                  </label>
                  <select
                    className="adm-filter-select"
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value)}
                  >
                    <option value="basic">Cơ bản</option>
                    <option value="standard">Tiêu chuẩn</option>
                    <option value="premium">Cao cấp</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Giá / Tháng (VND)
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
                  Mô tả
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
                  Dịch vụ bao gồm (mỗi dòng một dịch vụ)
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
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="sp-btn-edit flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px' }}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="animate-spin mr-1" size={13} />}
                  Cập nhật gói
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
            <h4 className="arh-modal__title" style={{ color: '#ef4444' }}>Vô hiệu hóa gói dịch vụ</h4>
            <p className="arh-modal__text" style={{ marginBottom: '24px', fontSize: '14.5px', color: '#475569' }}>
              Bạn có chắc muốn vô hiệu hóa <strong>"{packageToDeactivate.name}"</strong>?
              <span className="block mt-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Gói đã vô hiệu hóa sẽ không thể được gán cho cư dân mới nhập viện.
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
                Huỷ
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
                Xác nhận vô hiệu hóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
