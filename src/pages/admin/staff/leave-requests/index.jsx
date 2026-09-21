import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import leaveRequestService from '../../../../services/leaveRequest.service';
import ListPagination from '../../../../components/ui/ListPagination';
import useClientPagination from '../../../../hooks/useClientPagination';
import { formatLeaveDate } from '../../../../utils/leaveUtils';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import { resolveApiError } from '../../../../utils/apiMessage';
import { useAuth } from '../../../../hooks/useAuth';
import {
  STATUS_LABELS,
  TYPE_LABEL,
  ROLE_LABEL,
  getLeaveDays,
  getLeaveListPath,
} from './leaveRequestHelpers';
import '../../../../styles/admin/LeaveRequestAdminPage.css';

export default function LeaveRequestAdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const listPath = getLeaveListPath(user?.role);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (filterStatus) params.status = filterStatus;
      const res = await leaveRequestService.getAll(params);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(resolveApiError(e, t, 'admin.staff.leaveRequests.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterStatus]);

  const filtered = requests.filter((r) => {
    const name = r.staffId?.fullName || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const {
    paginatedItems: paginatedRequests,
    page,
    setPage,
    totalPages,
    total: filteredTotal,
  } = useClientPagination(filtered);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, setPage]);

  const count = (s) => requests.filter((r) => r.status === s).length;

  const goToDetail = (id) => navigate(`${listPath}/${id}`);

  return (
    <AdminPageShell
      title={t('admin.staff.leaveRequests.title')}
      subtitle={t('admin.staff.leaveRequests.subtitle')}
    >
      <div className="leave-stats">
        {[
          { s: 'pending', icon: '⏳', label: t('admin.staff.leaveRequests.statPending') },
          { s: 'approved', icon: '✅', label: t('admin.staff.leaveRequests.statApproved') },
          { s: 'rejected', icon: '❌', label: t('admin.staff.leaveRequests.statRejected') },
          { s: 'cancelled', icon: '🚫', label: t('admin.staff.leaveRequests.statCancelled') },
        ].map(({ s, icon, label }) => (
          <div
            key={s}
            className={`leave-stat leave-stat--${s}${filterStatus === s ? ' leave-stat--selected' : ''}`}
            onClick={() => setFilter(filterStatus === s ? '' : s)}
            onKeyDown={(e) => e.key === 'Enter' && setFilter(filterStatus === s ? '' : s)}
            role="button"
            tabIndex={0}
          >
            <div className="leave-stat__icon">{icon}</div>
            <div>
              <div className="leave-stat__value">{count(s)}</div>
              <div className="leave-stat__label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="filter-row">
        <input
          type="search"
          placeholder={t('admin.staff.leaveRequests.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterStatus} onChange={(e) => setFilter(e.target.value)}>
          <option value="">{t('common.allStatuses')}</option>
          <option value="pending">{t('common.leaveStatus.pending')}</option>
          <option value="approved">{t('common.leaveStatus.approved')}</option>
          <option value="rejected">{t('common.leaveStatus.rejected')}</option>
          <option value="cancelled">{t('common.leaveStatus.cancelled')}</option>
        </select>
      </div>

      {error && <div className="leave-admin-error">{error}</div>}

      <div className="resident-page__table leave-table-compact">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('admin.staff.leaveRequests.colStaff')}</th>
              <th>{t('admin.staff.leaveRequests.colLeaveType')}</th>
              <th>{t('admin.staff.leaveRequests.colPeriod')}</th>
              <th>{t('admin.staff.leaveRequests.colDays')}</th>
              <th>{t('common.colStatus')}</th>
              <th>{t('common.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="empty-state">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  {t('admin.staff.leaveRequests.emptyList')}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedRequests.map((r) => (
                <tr
                  key={r._id}
                  className="leave-table-row--clickable"
                  onClick={() => goToDetail(r._id)}
                >
                  <td>
                    <div className="leave-staff-cell">
                      <span className="leave-staff-cell__name">{r.staffId?.fullName || '—'}</span>
                      <span className={`role-badge role-badge--${r.staffId?.role}`}>
                        {ROLE_LABEL(t, r.staffId?.role) || '—'}
                      </span>
                    </div>
                  </td>
                  <td>{TYPE_LABEL(t, r.type)}</td>
                  <td className="leave-period-cell">
                    {formatLeaveDate(r.startDate)} → {formatLeaveDate(r.endDate)}
                  </td>
                  <td className="leave-days-cell">{getLeaveDays(r)}</td>
                  <td>
                    <span className={`leave-status leave-status--${r.status}`}>
                      {STATUS_LABELS(t, r.status)}
                    </span>
                  </td>
                  <td className="leave-actions-cell" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="leave-view-btn"
                      onClick={() => goToDetail(r._id)}
                    >
                      <Eye size={14} />
                      {t('admin.staff.leaveRequests.viewDetail')}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <ListPagination
          page={page}
          totalPages={totalPages}
          total={filteredTotal}
          onPageChange={setPage}
        />
      )}
    </AdminPageShell>
  );
}
