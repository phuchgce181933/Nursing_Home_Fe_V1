import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Eye, Inbox, Loader2, Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle, RotateCcw, Send, AlertCircle, X } from 'lucide-react';
import admissionService from '../../services/admission.service';
import { useToast } from '../../hooks/useToast';
import AdmissionDetailDrawer from '../../components/family/SubmitAdmission/AdmissionDetailDrawer';

const formatEnglishDate = (dateStr) => {
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
      return 'px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium text-[12px]';
    case 'consulting':
      return 'px-3 py-1 rounded-full bg-status-warning/10 text-status-warning font-medium text-[12px]';
    case 'assessing':
      return 'px-3 py-1 rounded-full bg-status-info/10 text-status-info font-medium text-[12px]';
    case 'contracting':
      return 'px-3 py-1 rounded-full bg-sky-50 text-[#0369a1] font-medium text-[12px]';
    case 'checked_in':
      return 'px-3 py-1 rounded-full bg-status-success/10 text-status-success font-medium text-[12px]';
    case 'cancelled':
      return 'px-3 py-1 rounded-full bg-red-50 text-error font-medium text-[12px]';
    default:
      return 'px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium text-[12px]';
  }
};

const STATUS_I18N = {
  new_request: 'admissionHistory.statusNewRequest',
  consulting: 'admissionHistory.statusConsulting',
  assessing: 'admissionHistory.statusAssessing',
  contracting: 'admissionHistory.statusContracting',
  checked_in: 'admissionHistory.statusCheckedIn',
  cancelled: 'admissionHistory.statusCancelled',
};

const getEligibilityBadgeClass = (status) => {
  switch (status) {
    case 'eligible':
      return 'px-3 py-1 rounded-full bg-status-success/10 text-status-success font-medium text-[12px]';
    case 'not_eligible':
      return 'px-3 py-1 rounded-full bg-red-50 text-error font-medium text-[12px]';
    case 'pending':
    default:
      return 'px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-medium text-[12px]';
  }
};

const ELIGIBILITY_I18N = {
  eligible: 'admissionHistory.eligibilityEligible',
  not_eligible: 'admissionHistory.eligibilityNotEligible',
  pending: 'admissionHistory.eligibilityPending',
};
export default function AdmissionRequestsHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Filters & Pagination states
  const [admissions, setAdmissions] = useState([]);
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
  const [selectedId, setSelectedId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Statistics states
  const [stats, setStats] = useState({ active: 0, completed: 0, appointments: 0 });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch stats for all family admissions
  const loadStats = async () => {
    try {
      const res = await admissionService.getAdmissionHistory({ limit: 1000 });
      const allAdmissions = res?.data || [];

      const active = allAdmissions.filter(adm =>
        ['new_request', 'consulting', 'assessing', 'contracting'].includes(adm.status)
      ).length;

      const completed = allAdmissions.filter(adm =>
        adm.status === 'checked_in'
      ).length;

      const appointments = allAdmissions.filter(adm => {
        const sched = adm.initialAssessmentScheduledAt || adm.consultationScheduledAt;
        if (!sched) return false;
        return new Date(sched) > new Date();
      }).length;

      setStats({ active, completed, appointments });
    } catch (err) {
      console.error('Failed to load admission stats:', err);
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
      const res = await admissionService.getAdmissionHistory(params);
      setAdmissions(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load admission requests history:', err);
      setLoadError(err?.response?.data?.message || err?.message || t('admissionHistory.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
    loadStats();
  }, [page, status, debouncedSearch, dateStr]);

  const handleOpenDetail = (id) => {
    setSelectedId(id);
    setIsDrawerOpen(true);
  };

  const handleCancelSuccess = () => {
    // Reload table list and stats instantly when request is cancelled
    loadData();
    loadStats();
  };

  // Determine if a row can be re-submitted (contract ended or admission cancelled).
  // Matches the same logic in AdmissionDetailDrawer so the buttons stay in sync.
  const isRowResubmittable = (adm) => {
    if (!adm) return false;
    const contractEndDate = adm.contractEndDate ? new Date(adm.contractEndDate) : null;
    const naturallyExpired =
      adm.contractStatus === 'active' &&
      contractEndDate &&
      contractEndDate.getTime() < Date.now();
    const contractEnded =
      adm.contractStatus === 'cancelled' ||
      adm.contractStatus === 'terminated' ||
      adm.contractStatus === 'expired' ||
      naturallyExpired;
    return contractEnded || adm.status === 'cancelled';
  };

  const [resubmittingId, setResubmittingId] = useState(null);

  // Resubmit modal state
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [pendingResubmit, setPendingResubmit] = useState(null); // admission being resubmitted
  const [resubmitReason, setResubmitReason] = useState('');
  const [resubmitPreferredDate, setResubmitPreferredDate] = useState('');

  const openResubmitModal = (adm, e) => {
    e?.stopPropagation?.();
    if (!adm || !adm._id) return;
    setPendingResubmit(adm);
    setResubmitReason('');
    // Prefill with existing preferredAdmissionDate (if any) so family can re-use or change it.
    setResubmitPreferredDate(
      adm.preferredAdmissionDate ? adm.preferredAdmissionDate.substring(0, 10) : ''
    );
    setShowResubmitModal(true);
  };

  const closeResubmitModal = () => {
    if (resubmittingId) return;
    setShowResubmitModal(false);
    setPendingResubmit(null);
    setResubmitReason('');
    setResubmitPreferredDate('');
  };

  const handleQuickResubmit = async () => {
    if (!pendingResubmit || !pendingResubmit._id) return;
    try {
      setResubmittingId(pendingResubmit._id);
      const result = await admissionService.resubmitAdmissionRequest(
        pendingResubmit._id,
        {
          reason: resubmitReason.trim() || undefined,
          preferredAdmissionDate: resubmitPreferredDate
            ? new Date(resubmitPreferredDate).toISOString()
            : undefined,
        }
      );
      showToast(
        result?.message || t('admissionHistory.resubmitSuccess', 'Đã gửi lại yêu cầu nhập viện.'),
        'success'
      );
      closeResubmitModal();
      handleCancelSuccess();
    } catch (err) {
      console.error('Failed to resubmit admission:', err);
      showToast(
        err?.response?.data?.message || t('admissionHistory.resubmitFailed', 'Không thể gửi lại yêu cầu.'),
        'error'
      );
    } finally {
      setResubmittingId(null);
    }
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
            <h1 className="arh-header__title">{t('admissionHistory.title')}</h1>
            <p className="arh-header__subtitle">
              {t('admissionHistory.subtitle')}
            </p>
          </div>
          <button
            className="arh-btn arh-btn--primary"
            onClick={() => navigate('/family/admission-requests/new')}
          >
            <Plus size={16} />
            {t('admissionHistory.newRequest')}
          </button>
        </div>

        {/* Statistics Cards Grid */}
        <div className="arh-stats-grid">
          {/* Active Requests Card */}
          <div className="arh-stat-card">
            <div className="arh-stat-card__header">
              <div className="arh-stat-card__icon-box arh-stat-card__icon-box--pending">
                <Clock size={20} />
              </div>
              <span className="arh-stat-card__label">{t('admissionHistory.statsActive')}</span>
            </div>
            <div className="arh-stat-card__value">
              {String(stats.active).padStart(2, '0')}
            </div>
          </div>

          {/* Completed Admissions Card */}
          <div className="arh-stat-card">
            <div className="arh-stat-card__header">
              <div className="arh-stat-card__icon-box arh-stat-card__icon-box--completed">
                <CheckCircle size={20} />
              </div>
              <span className="arh-stat-card__label">{t('admissionHistory.statsCompleted')}</span>
            </div>
            <div className="arh-stat-card__value">
              {String(stats.completed).padStart(2, '0')}
            </div>
          </div>

          {/* Upcoming Appointments Card */}
          <div className="arh-stat-card">
            <div className="arh-stat-card__header">
              <div className="arh-stat-card__icon-box arh-stat-card__icon-box--appointment">
                <Calendar size={20} />
              </div>
              <span className="arh-stat-card__label">{t('admissionHistory.statsAppointments')}</span>
            </div>
            <div className="arh-stat-card__value">
              {String(stats.appointments).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Search & Filter Bar (Glass Card) */}
        <div className="arh-filters">
          <div className="arh-filters__search-wrap">
            <Search size={18} className="arh-filters__search-icon" />
            <input
              type="text"
              className="arh-filters__input"
              placeholder={t('admissionHistory.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="arh-filters__select-wrap">
            <select
              className="arh-filters__select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('admissionHistory.allStatuses')}</option>
              <option value="new_request">{t('admissionHistory.statusNewRequest')}</option>
              <option value="consulting">{t('admissionHistory.statusConsulting')}</option>
              <option value="assessing">{t('admissionHistory.statusAssessing')}</option>
              <option value="contracting">{t('admissionHistory.statusContracting')}</option>
              <option value="checked_in">{t('admissionHistory.statusCheckedIn')}</option>
              <option value="cancelled">{t('admissionHistory.statusCancelled')}</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              className="arh-filters__date"
              value={dateStr}
              onChange={(e) => {
                setDateStr(e.target.value);
                setPage(1);
              }}
              title={t('admissionHistory.filterByDate')}
            />
          </div>
        </div>

        {loadError && (
          <div className="arh-error-banner">
            <span>{loadError}</span>
            <button type="button" className="arh-error-banner__retry" onClick={loadData}>
              {t('admissionHistory.retry')}
            </button>
          </div>
        )}

        {/* Main Request History Table Card */}
        <div className="arh-card">
          {loading ? (
            <div className="arh-loading-box">
              <Loader2 className="arh-loading-spinner" size={32} />
              <p className="arh-loading-text">{t('admissionHistory.loading')}</p>
            </div>
          ) : admissions.length === 0 ? (
            <div className="arh-empty-box">
              <Inbox size={48} className="arh-empty-icon" />
              <p className="arh-empty-text">{t('admissionHistory.emptyTitle')}</p>
              <p className="text-xs max-w-sm text-slate-400 mt-1">
                {t('admissionHistory.emptyHint')}
              </p>
            </div>
          ) : (
            <>
              <div className="arh-table-wrap">
                <table className="arh-table">
                  <thead>
                    <tr>
                      <th>{t('admissionHistory.colCode')}</th>
                      <th>{t('admissionHistory.colRelative')}</th>
                      <th>{t('admissionHistory.colSubmitDate')}</th>
                      <th>{t('admissionHistory.colPreferredDate')}</th>
                      <th>{t('admissionHistory.colStatus')}</th>
                      <th>{t('admissionHistory.colEligibility')}</th>
                      <th className="text-center">{t('admissionHistory.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.map((adm) => (
                      <tr
                        key={adm._id || adm.id}
                        onClick={() => handleOpenDetail(adm._id || adm.id)}
                      >
                        <td className="font-mono font-bold text-navy-deep">
                          {adm.requestCode || `#ANH-${(adm._id || adm.id || '').substring(0, 4).toUpperCase()}`}
                        </td>
                        <td className="arh-table__name">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-navy-deep font-bold text-xs uppercase shadow-sm">
                              {(adm.applicant?.fullName || 'N')[0]}
                            </div>
                            <span>{adm.applicant?.fullName || 'N/A'}</span>
                          </div>
                        </td>
                        <td>
                          {formatEnglishDate(adm.createdAt)}
                        </td>
                        <td className="font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-400" />
                            {formatEnglishDate(adm.preferredAdmissionDate)}
                          </div>
                        </td>
                        <td>
                          <span className={`arh-badge arh-badge--${adm.status}`}>
                            {t(STATUS_I18N[adm.status] || 'admissionHistory.statusDefault')}
                          </span>
                        </td>
                        <td>
                          <span className={`arh-elig-badge arh-elig-badge--${adm.eligibilityStatus || 'pending'}`}>
                            {t(ELIGIBILITY_I18N[adm.eligibilityStatus] || 'admissionHistory.eligibilityPending')}
                          </span>
                        </td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            {isRowResubmittable(adm) && (
                              <button
                                className="arh-btn--action"
                                style={{
                                  background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                                  color: '#fff',
                                }}
                                onClick={(e) => openResubmitModal(adm, e)}
                                disabled={resubmittingId === (adm._id || adm.id)}
                                title={t('admissionHistory.resubmitTitle', 'Gửi yêu cầu nhập viện lại')}
                              >
                                {resubmittingId === (adm._id || adm.id) ? (
                                  <Loader2 className="animate-spin" size={18} />
                                ) : (
                                  <RotateCcw size={18} />
                                )}
                              </button>
                            )}
                            <button
                              className="arh-btn--action"
                              onClick={() => handleOpenDetail(adm._id || adm.id)}
                              title={t('admissionHistory.viewDetail')}
                            >
                              <Eye size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination block */}
              <div className="arh-pagination">
                <span className="arh-pagination__info">
                  {t('admissionHistory.paginationInfo', { from: Math.min((page - 1) * limit + 1, total), to: Math.min(page * limit, total), total })}
                </span>
                <div className="arh-pagination__controls">
                  <button
                    className="arh-pagination__btn"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    title={t('admissionHistory.prevPage')}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {pageNumbers.map((num) => (
                    <button
                      key={num}
                      className={`arh-pagination__page ${
                        num === page
                          ? 'arh-pagination__page--active'
                          : 'arh-pagination__page--inactive'
                      }`}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    className="arh-pagination__btn"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    title={t('admissionHistory.nextPage')}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sliding detail drawer outside the transformed container */}
      <AdmissionDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        admissionId={selectedId}
        onCancelSuccess={handleCancelSuccess}
      />

      {/* Resubmit Confirmation Modal (Family — gửi lại yêu cầu nhập viện) */}
      {showResubmitModal && pendingResubmit && (
        <div
          className="arh-modal-backdrop"
          onClick={closeResubmitModal}
        >
          <div
            className="arh-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="arh-modal__title">
                {t('admissionHistory.resubmitTitle', 'Gửi yêu cầu nhập viện lại')}
              </h4>
              <button
                type="button"
                onClick={closeResubmitModal}
                disabled={!!resubmittingId}
                className="text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="arh-modal__text">
              {t(
                'admissionHistory.resubmitConfirm',
                { name: pendingResubmit.applicant?.fullName || t('admissionHistory.relative', 'người thân') },
                `Bạn có chắc muốn gửi lại yêu cầu nhập viện cho {{name}}? Yêu cầu sẽ được Admin xem xét và chuyển sang bác sĩ khám lại.`
              )}
            </p>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs mb-3">
              <AlertCircle size={14} className="inline mr-1" />
              <strong>Lưu ý:</strong> Sau khi gửi lại, bác sĩ sẽ khám và đánh giá lại điều kiện sức khỏe
              trước khi có thể tạo hợp đồng mới.
            </div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              {t('admissionHistory.resubmitPreferredDateLabel', 'Ngày nhập viện mong muốn (tuỳ chọn)')}
            </label>
            <input
              type="date"
              className="arh-modal__input"
              min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().substring(0, 10)}
              value={resubmitPreferredDate}
              onChange={(e) => setResubmitPreferredDate(e.target.value)}
            />
            <div className="text-[10px] text-slate-400 mt-1 mb-2">
              {t(
                'admissionHistory.resubmitPreferredDateHint',
                'Để trống nếu muốn hệ thống tự đặt lịch khám mặc định (ngày mai, 8:00).'
              )}
            </div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              {t('admissionHistory.resubmitReasonLabel', 'Lý do gửi lại (tuỳ chọn)')}
            </label>
            <textarea
              className="arh-modal__textarea"
              placeholder={t(
                'admissionHistory.resubmitReasonPlaceholder',
                'Ví dụ: Cả gia đình đã sẵn sàng cho cụ nhập viện lại...'
              )}
              value={resubmitReason}
              onChange={(e) => setResubmitReason(e.target.value)}
              maxLength={500}
            />
            <div className="text-[10px] text-slate-400 text-right mt-1 mb-2">
              {resubmitReason.length}/500
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="arh-drawer__btn"
                style={{ background: '#f1f5f9', color: '#475569' }}
                onClick={closeResubmitModal}
                disabled={!!resubmittingId}
              >
                {t('common.cancel', 'Quay lại')}
              </button>
              <button
                type="button"
                className="arh-drawer__btn"
                style={{
                  background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                  color: '#fff',
                  flex: 1,
                }}
                onClick={handleQuickResubmit}
                disabled={!!resubmittingId}
              >
                {!!resubmittingId && <Loader2 className="animate-spin mr-1" size={13} />}
                <Send size={14} className="inline mr-1" />
                {t('admissionHistory.resubmitConfirmBtn', 'Xác nhận gửi lại')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
