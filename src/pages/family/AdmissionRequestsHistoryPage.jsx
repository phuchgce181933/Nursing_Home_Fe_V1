import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Eye, Inbox, Loader2, Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle } from 'lucide-react';
import admissionService from '../../services/admission.service';
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
                          <button
                            className="arh-btn--action"
                            onClick={() => handleOpenDetail(adm._id || adm.id)}
                            title={t('admissionHistory.viewDetail')}
                          >
                            <Eye size={18} />
                          </button>
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
    </>
  );
}
