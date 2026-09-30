import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import AdminPageShell from '../../../components/admin/AdminPageShell';
import ListPagination from '../../../components/ui/ListPagination';
import useClientPagination from '../../../hooks/useClientPagination';
import useDebouncedSearch from '../../../hooks/useDebouncedSearch';
import { useAuth } from '../../../hooks/useAuth';
import staffAssignedResidentService from '../../../services/staffAssignedResident.service';
import { resolveApiError } from '../../../utils/apiMessage';
import {
  getAssignedResidentsBasePath,
  getAssignedResidentsI18nNs,
  hasMedicalAlerts,
} from './assignedResidentHelpers';
import '../../../styles/shared/AssignedResidentsPage.css';

export default function AssignedResidentsListPage({ role, footer }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const ns = getAssignedResidentsI18nNs(role);
  const basePath = getAssignedResidentsBasePath(role);

  const { search, setSearch, debouncedSearch, resetSearch } = useDebouncedSearch();
  const [residents, setResidents] = useState([]);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    paginatedItems: paginatedResidents,
    page: clientPage,
    setPage: setClientPage,
    totalPages,
    total,
  } = useClientPagination(residents);

  const loadResidents = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    setError('');
    try {
      const res = await staffAssignedResidentService.listResidents(role, {
        userId: user?._id,
        search: debouncedSearch || undefined,
      });
      setResidents(Array.isArray(res.data) ? res.data : []);
      setEmptyMessage(res.message || '');
    } catch (e) {
      setError(resolveApiError(e, t, `${ns}.loadFailed`));
      setResidents([]);
    } finally {
      setLoading(false);
    }
  }, [role, debouncedSearch, t, ns, user?._id]);

  useEffect(() => {
    loadResidents();
  }, [loadResidents]);

  const goToDetail = (id) => navigate(`${basePath}/${id}`);

  return (
    <AdminPageShell title={t(`${ns}.title`)} subtitle={t(`${ns}.subtitle`)}>
      <div className="resident-page__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t(`${ns}.searchLabel`)}</span>
            <input
              type="search"
              placeholder={t(`${ns}.searchPlaceholder`)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {search && (
            <div className="resident-page__filter-actions">
              <button
                type="button"
                className="resident-page__button resident-page__button--ghost"
                disabled={loading}
                onClick={resetSearch}
              >
                {t('common.clearFilter')}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="resident-page__error">{error}</div>}

      {!loading && residents.length === 0 && emptyMessage && (
        <p className="ar-page__empty-hint">{emptyMessage}</p>
      )}

      <div className="resident-page__table ar-table-compact">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('common.colCode')}</th>
              <th>{t('common.colFullName')}</th>
              <th>{t('common.colGender')}</th>
              <th>{t('common.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="empty-state">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading && residents.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  {debouncedSearch ? t(`${ns}.emptyFiltered`) : t(`${ns}.emptyList`)}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedResidents.map((row) => (
                <tr
                  key={row._id}
                  className="ar-table-row--clickable"
                  onClick={() => goToDetail(row._id)}
                >
                  <td className="ar-table__code">{row.residentCode || '—'}</td>
                  <td>
                    <div className="ar-staff-cell">
                      <span className="ar-staff-cell__name">{row.fullName || '—'}</span>
                      {hasMedicalAlerts(row) && (
                        <span className="ar-alert-badge">{t(`${ns}.hasMedicalAlerts`)}</span>
                      )}
                    </div>
                  </td>
                  <td>{t(`common.gender.${row.gender}`, { defaultValue: row.gender || '—' })}</td>
                  <td className="ar-actions-cell" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="ar-view-btn"
                      title={t(`${ns}.viewDetail`)}
                      aria-label={t(`${ns}.viewDetail`)}
                      onClick={() => goToDetail(row._id)}
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && residents.length > 0 && (
        <ListPagination
          page={clientPage}
          totalPages={totalPages}
          total={total}
          onPageChange={setClientPage}
        />
      )}

      {footer}
    </AdminPageShell>
  );
}
