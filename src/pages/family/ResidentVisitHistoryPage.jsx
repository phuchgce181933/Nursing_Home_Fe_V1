import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
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
import residentVisitService from '../../services/residentVisit.service';
import ResidentVisitDetailDrawer from '../../components/family/ResidentVisit/ResidentVisitDetailDrawer';

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
    case 'approved':
      return 'px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium text-[12px]';
    case 'rejected':
      return 'px-3 py-1 rounded-full bg-red-50 text-error font-medium text-[12px]';
    case 'cancelled':
      return 'px-3 py-1 rounded-full bg-red-50 text-error font-medium text-[12px]';
    default:
      return 'px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium text-[12px]';
  }
};

const VISIT_STATUS_I18N = {
  pending: 'visitHistory.statusPending',
  approved: 'visitHistory.statusApproved',
  rejected: 'visitHistory.statusRejected',
  cancelled: 'visitHistory.statusCancelled',
};

export default function ResidentVisitHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);

  const [status, setStatus] = useState('');

  const [selectedVisit, setSelectedVisit] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [stats, setStats] = useState({ active: 0, approved: 0, total: 0 });

  const loadStats = async () => {
    try {
      const res = await residentVisitService.getVisitHistory({ limit: 1000 });
      const allVisits = res?.data || [];

      const active = allVisits.filter((v) => v.status === 'pending').length;
      const approved = allVisits.filter((v) => v.status === 'approved').length;

      setStats({ active, approved, total: allVisits.length });
    } catch (err) {
      console.error('Failed to load resident visit stats:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        status: status || undefined,
      };
      const res = await residentVisitService.getVisitHistory(params);
      setVisits(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load resident visit history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadStats();
  }, [page, status]);

  const handleOpenDetail = (visit) => {
    setSelectedVisit(visit);
    setIsDrawerOpen(true);
  };

  const handleCancelSuccess = () => {
    loadData();
    loadStats();
  };

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
            <h1 className="arh-header__title">{t('visitHistory.title')}</h1>
            <p className="arh-header__subtitle">
              {t('visitHistory.subtitle')}
            </p>
          </div>
          <button
            className="arh-btn arh-btn--primary"
            onClick={() => navigate('/family/resident-visits/new')}
          >
            <Plus size={16} />
            {t('visitHistory.newVisit')}
          </button>
        </div>

        {/* Statistics Cards Grid */}
        <div className="arh-stats-grid">
          <div className="arh-stat-card">
            <div className="arh-stat-card__header">
              <div className="arh-stat-card__icon-box arh-stat-card__icon-box--pending">
                <Clock size={20} />
              </div>
              <span className="arh-stat-card__label">{t('visitHistory.statsPending')}</span>
            </div>
            <div className="arh-stat-card__value">{String(stats.active).padStart(2, '0')}</div>
          </div>

          <div className="arh-stat-card">
            <div className="arh-stat-card__header">
              <div className="arh-stat-card__icon-box arh-stat-card__icon-box--completed">
                <CheckCircle size={20} />
              </div>
              <span className="arh-stat-card__label">{t('visitHistory.statsApproved')}</span>
            </div>
            <div className="arh-stat-card__value">{String(stats.approved).padStart(2, '0')}</div>
          </div>

          <div className="arh-stat-card">
            <div className="arh-stat-card__header">
              <div className="arh-stat-card__icon-box arh-stat-card__icon-box--appointment">
                <Calendar size={20} />
              </div>
              <span className="arh-stat-card__label">{t('visitHistory.statsTotal')}</span>
            </div>
            <div className="arh-stat-card__value">{String(stats.total).padStart(2, '0')}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="arh-filters">
          <div className="arh-filters__field">
            <select
              className="arh-filters__select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('visitHistory.allStatuses')}</option>
              <option value="pending">{t('visitHistory.statusPending')}</option>
              <option value="approved">{t('visitHistory.statusApproved')}</option>
              <option value="rejected">{t('visitHistory.statusRejected')}</option>
              <option value="cancelled">{t('visitHistory.statusCancelled')}</option>
            </select>
          </div>
        </div>

        {/* Request List Section */}
        <div className="arh-table-container">
          {loading ? (
            <div className="arh-loading">
              <Loader2 size={32} className="arh-spinner" />
              <span>{t('visitHistory.loading')}</span>
            </div>
          ) : visits.length === 0 ? (
            <div className="arh-empty">
              <Inbox size={48} className="arh-empty__icon" />
              <h4>{t('visitHistory.emptyTitle')}</h4>
              <p>{t('visitHistory.emptyDesc')}</p>
              <button
                className="arh-btn arh-btn--primary mt-4"
                onClick={() => navigate('/family/resident-visits/new')}
              >
                {t('visitHistory.newVisit')}
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="arh-table-wrapper">
                <table className="arh-table">
                  <thead>
                    <tr>
                      <th>{t('visitHistory.colResident')}</th>
                      <th>{t('visitHistory.colVisitor')}</th>
                      <th>{t('visitHistory.colPreferredDate')}</th>
                      <th>{t('visitHistory.colTimeSlot')}</th>
                      <th>{t('visitHistory.colVisitors')}</th>
                      <th>{t('visitHistory.colStatus')}</th>
                      <th className="text-right">{t('visitHistory.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v) => (
                      <tr key={v._id}>
                        <td>
                          <strong className="text-slate-800">{v.resident?.fullName || 'N/A'}</strong>
                        </td>
                        <td>{v.visitorName}</td>
                        <td>{formatViDate(v.requestedDate)}</td>
                        <td>{v.requestedTimeSlot || 'N/A'}</td>
                        <td>{v.numberOfVisitors}</td>
                        <td>
                          <span className={getStatusBadgeClass(v.status)}>{t(VISIT_STATUS_I18N[v.status] || 'visitHistory.statusPending')}</span>
                        </td>
                        <td className="text-right">
                          <button className="arh-action-btn" title={t('visitHistory.viewDetail')} onClick={() => handleOpenDetail(v)}>
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
                {visits.map((v) => (
                  <div key={v._id} className="arh-mobile-card">
                    <div className="arh-mobile-card__header">
                      <strong className="text-slate-800 text-[15px]">{v.resident?.fullName || 'N/A'}</strong>
                      <span className={getStatusBadgeClass(v.status)}>{t(VISIT_STATUS_I18N[v.status] || 'visitHistory.statusPending')}</span>
                    </div>

                    <div className="arh-mobile-card__body">
                      <div className="arh-mobile-card__row">
                        <span>{t('visitHistory.mobileVisitor')}</span>
                        <strong>{v.visitorName}</strong>
                      </div>
                      <div className="arh-mobile-card__row">
                        <span>{t('visitHistory.mobileDate')}</span>
                        <strong>{formatViDate(v.requestedDate)}</strong>
                      </div>
                      <div className="arh-mobile-card__row">
                        <span>{t('visitHistory.mobileTimeSlot')}</span>
                        <strong>{v.requestedTimeSlot || 'N/A'}</strong>
                      </div>
                      <div className="arh-mobile-card__row">
                        <span>{t('visitHistory.mobileVisitors')}</span>
                        <strong>{v.numberOfVisitors}</strong>
                      </div>
                    </div>

                    <div className="arh-mobile-card__footer">
                      <button className="arh-action-btn w-full" onClick={() => handleOpenDetail(v)}>
                        <Eye size={16} />
                        {t('visitHistory.viewDetailFull')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="arh-pagination">
                  <span className="arh-pagination__total">
                    {t('visitHistory.paginationInfo', { shown: visits.length, total })}
                  </span>

                  <div className="arh-pagination__controls">
                    <button className="arh-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
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
      <ResidentVisitDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedVisit(null);
        }}
        visit={selectedVisit}
        onCancelSuccess={handleCancelSuccess}
      />
    </>
  );
}
