import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AdminPageShell from '../../components/admin/AdminPageShell';
import ListPagination from '../../components/ui/ListPagination';
import ResidentContextBlock from '../../components/resident/ResidentContextBlock';
import useClientPagination from '../../hooks/useClientPagination';
import useDebouncedSearch from '../../hooks/useDebouncedSearch';
import caregiverResidentService from '../../services/caregiverResident.service';
import { resolveApiError } from '../../utils/apiMessage';
import { formatResidentAreaLine, pickDrugAllergiesList } from '../../utils/residentArea';
import '../../styles/caregiver/AssignedResidentsPage.css';

function formatAllergies(row, t, i18nNs) {
  const drug = pickDrugAllergiesList(row);
  const food = (row.allergies || []).filter(
    (a) => !drug.some((d) => d.toLowerCase() === String(a).toLowerCase())
  );
  const parts = [];
  if (drug.length) parts.push(`${t(`${i18nNs}.assignedResidents.allergiesDrug`)}: ${drug.join(', ')}`);
  if (food.length) parts.push(`${t(`${i18nNs}.assignedResidents.allergiesOther`)}: ${food.join(', ')}`);
  return parts.length ? parts.join(' · ') : '—';
}

function formatConditions(row) {
  const list = row.chronicConditions || [];
  return list.length ? list.join(', ') : '—';
}

function ResidentWarning({ resident, t, i18nNs }) {
  if (!resident) return null;
  const drug = pickDrugAllergiesList(resident);
  const food = (resident.allergies || []).filter(Boolean);
  const conditions = resident.chronicConditions || [];
  if (!drug.length && !food.length && !conditions.length) return null;

  return (
    <div className="assigned-residents-page__warning">
      {drug.length > 0 && (
        <p>
          <strong>{t(`${i18nNs}.assignedResidents.drugAllergies`)}:</strong> {drug.join(', ')}
        </p>
      )}
      {food.length > 0 && (
        <p>
          <strong>{t(`${i18nNs}.assignedResidents.otherAllergies`)}:</strong> {food.join(', ')}
        </p>
      )}
      {conditions.length > 0 && (
        <p>
          <strong>{t(`${i18nNs}.assignedResidents.chronicConditions`)}:</strong> {conditions.join(', ')}
        </p>
      )}
    </div>
  );
}

function ResidentDetailModal({ residentId, onClose, t, locale, service, i18nNs }) {
  const [loading, setLoading] = useState(true);
  const [resident, setResident] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!residentId) return;
    setLoading(true);
    setError('');
    service
      .getResident(residentId)
      .then(setResident)
      .catch((e) => setError(resolveApiError(e, t, `${i18nNs}.assignedResidents.detailLoadFailed`)))
      .finally(() => setLoading(false));
  }, [residentId, t, service, i18nNs]);

  const formatAdmittedAt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(locale);
  };

  return (
    <div className="assigned-residents-page__modal-overlay" onClick={onClose}>
      <div
        className="assigned-residents-page__modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="assigned-residents-page__modal-header">
          <h3 className="assigned-residents-page__modal-title">{t(`${i18nNs}.assignedResidents.detailTitle`)}</h3>
          <button type="button" className="assigned-residents-page__modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="assigned-residents-page__modal-body">
          {loading && <p>{t('common.loading')}</p>}
          {error && <div className="resident-page__error">{error}</div>}
          {!loading && !error && resident && (
            <>
              <ResidentWarning resident={resident} t={t} i18nNs={i18nNs} />
              <ResidentContextBlock resident={resident} showGender showStatus />
              <div className="assigned-residents-page__meta-block">
                {resident.bloodType && resident.bloodType !== 'unknown' && (
                  <p>
                    <strong>{t(`${i18nNs}.assignedResidents.bloodType`)}:</strong> {resident.bloodType}
                  </p>
                )}
                {resident.initialHealthCondition && (
                  <p>
                    <strong>{t(`${i18nNs}.assignedResidents.initialHealth`)}:</strong>{' '}
                    {resident.initialHealthCondition}
                  </p>
                )}
                <p>
                  <strong>{t(`${i18nNs}.assignedResidents.admittedAt`)}:</strong>{' '}
                  {formatAdmittedAt(resident.admittedAt)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignedResidentsPage({
  service = caregiverResidentService,
  i18nNs = 'caregiver',
  mealIntakeLinkPath = '/caregiver/meal-intake-notes',
  showMealIntakeLink = true,
} = {}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const { search, setSearch, debouncedSearch, resetSearch } = useDebouncedSearch();
  const [residents, setResidents] = useState([]);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState(null);

  const {
    paginatedItems: paginatedResidents,
    page: clientPage,
    setPage: setClientPage,
    totalPages,
    total,
  } = useClientPagination(residents);

  const loadResidents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await service.listResidents({
        search: debouncedSearch || undefined,
      });
      setResidents(Array.isArray(res.data) ? res.data : []);
      setEmptyMessage(res.message || '');
    } catch (e) {
      setError(resolveApiError(e, t, `${i18nNs}.assignedResidents.loadFailed`));
      setResidents([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, t, service, i18nNs]);

  useEffect(() => {
    loadResidents();
  }, [loadResidents]);

  const formatAdmittedAt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(locale);
  };

  return (
    <AdminPageShell
      title={t(`${i18nNs}.assignedResidents.title`)}
      subtitle={t(`${i18nNs}.assignedResidents.subtitle`)}
    >
      <div className="resident-page__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t(`${i18nNs}.assignedResidents.searchLabel`)}</span>
            <input
              type="search"
              placeholder={t(`${i18nNs}.assignedResidents.searchPlaceholder`)}
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
        <p className="assigned-residents-page__empty-hint">{emptyMessage}</p>
      )}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('common.colCode')}</th>
              <th>{t('common.colFullName')}</th>
              <th>{t('common.colGender')}</th>
              <th>{t('common.colArea')}</th>
              <th>{t('common.colAllergies')}</th>
              <th>{t('common.colConditions')}</th>
              <th>{t('common.colAdmittedAt')}</th>
              <th>{t('common.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="empty-state">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading && residents.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-state">
                  {debouncedSearch
                    ? t(`${i18nNs}.assignedResidents.emptyFiltered`)
                    : t(`${i18nNs}.assignedResidents.emptyList`)}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedResidents.map((row) => {
                const allergies = formatAllergies(row, t, i18nNs);
                const hasAllergy = allergies !== '—';
                return (
                  <tr key={row._id}>
                    <td>{row.residentCode || '—'}</td>
                    <td>{row.fullName || '—'}</td>
                    <td>{t(`common.gender.${row.gender}`, { defaultValue: row.gender || '—' })}</td>
                    <td>{formatResidentAreaLine(row, t) || '—'}</td>
                    <td className={hasAllergy ? 'assigned-residents-page__allergy-tags' : undefined}>
                      {allergies}
                    </td>
                    <td>{formatConditions(row)}</td>
                    <td>{formatAdmittedAt(row.admittedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="resident-page__button resident-page__button--ghost"
                        onClick={() => setDetailId(row._id)}
                      >
                        {t('common.view')}
                      </button>
                    </td>
                  </tr>
                );
              })}
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

      {showMealIntakeLink && (
        <p className="assigned-residents-page__footer-link">
          <Link to={mealIntakeLinkPath}>{t(`${i18nNs}.assignedResidents.mealIntakeLink`)}</Link>{' '}
          {t(`${i18nNs}.assignedResidents.footerLink`)}
        </p>
      )}

      {detailId && (
        <ResidentDetailModal
          residentId={detailId}
          onClose={() => setDetailId(null)}
          t={t}
          locale={locale}
          service={service}
          i18nNs={i18nNs}
        />
      )}
    </AdminPageShell>
  );
}

export default AssignedResidentsPage;
