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

function formatAllergies(row, t) {
  const drug = pickDrugAllergiesList(row);
  const food = (row.allergies || []).filter(
    (a) => !drug.some((d) => d.toLowerCase() === String(a).toLowerCase())
  );
  const parts = [];
  if (drug.length) parts.push(`${t('caregiver.assignedResidents.allergiesDrug')}: ${drug.join(', ')}`);
  if (food.length) parts.push(`${t('caregiver.assignedResidents.allergiesOther')}: ${food.join(', ')}`);
  return parts.length ? parts.join(' · ') : '—';
}

function formatConditions(row) {
  const list = row.chronicConditions || [];
  return list.length ? list.join(', ') : '—';
}

function ResidentWarning({ resident, t }) {
  if (!resident) return null;
  const drug = pickDrugAllergiesList(resident);
  const food = (resident.allergies || []).filter(Boolean);
  const conditions = resident.chronicConditions || [];
  if (!drug.length && !food.length && !conditions.length) return null;

  return (
    <div className="assigned-residents-page__warning">
      {drug.length > 0 && (
        <p>
          <strong>{t('caregiver.assignedResidents.drugAllergies')}:</strong> {drug.join(', ')}
        </p>
      )}
      {food.length > 0 && (
        <p>
          <strong>{t('caregiver.assignedResidents.otherAllergies')}:</strong> {food.join(', ')}
        </p>
      )}
      {conditions.length > 0 && (
        <p>
          <strong>{t('caregiver.assignedResidents.chronicConditions')}:</strong> {conditions.join(', ')}
        </p>
      )}
    </div>
  );
}

function formatActivityTime(value, locale) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

function ActivityScheduleModal({ resident, activities, onClose, t, locale }) {
  if (!resident) return null;

  return (
    <div className="assigned-residents-page__modal-overlay" onClick={onClose}>
      <div
        className="assigned-residents-page__modal assigned-residents-page__modal--wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="assigned-residents-page__modal-header">
          <h3 className="assigned-residents-page__modal-title">
            {t('caregiver.assignedResidents.activityModalTitle')}
          </h3>
          <button type="button" className="assigned-residents-page__modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="assigned-residents-page__modal-body">
          <p className="assigned-residents-page__modal-subtitle">
            {t('caregiver.assignedResidents.activityModalSubtitle', {
              name: resident.fullName || resident.residentCode || resident._id,
            })}
          </p>
          {!activities.length && <p className="assigned-residents-page__activity-empty">{t('caregiver.assignedResidents.noScheduledActivities')}</p>}
          {activities.length > 0 && (
            <ul className="assigned-residents-page__activity-list">
              {activities.map((activity) => (
                <li key={activity._id} className="assigned-residents-page__activity-item">
                  <div className="assigned-residents-page__activity-title">
                    {activity.title || t('caregiver.assignedResidents.activityDefault')}
                  </div>
                  <div className="assigned-residents-page__activity-meta">
                    <span>{formatActivityTime(activity.scheduledAt || activity.startAt, locale)}</span>
                    {activity.location ? <span>· {activity.location}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ResidentDetailModal({ residentId, onClose, t, locale }) {
  const [loading, setLoading] = useState(true);
  const [resident, setResident] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!residentId) return;
    setLoading(true);
    setError('');
    caregiverResidentService
      .getResident(residentId)
      .then(setResident)
      .catch((e) => setError(resolveApiError(e, t, 'caregiver.assignedResidents.detailLoadFailed')))
      .finally(() => setLoading(false));
  }, [residentId, t]);

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
          <h3 className="assigned-residents-page__modal-title">{t('caregiver.assignedResidents.detailTitle')}</h3>
          <button type="button" className="assigned-residents-page__modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="assigned-residents-page__modal-body">
          {loading && <p>{t('common.loading')}</p>}
          {error && <div className="resident-page__error">{error}</div>}
          {!loading && !error && resident && (
            <>
              <ResidentWarning resident={resident} t={t} />
              <ResidentContextBlock resident={resident} showGender showStatus />
              <div className="assigned-residents-page__meta-block">
                {resident.bloodType && resident.bloodType !== 'unknown' && (
                  <p>
                    <strong>{t('caregiver.assignedResidents.bloodType')}:</strong> {resident.bloodType}
                  </p>
                )}
                {resident.initialHealthCondition && (
                  <p>
                    <strong>{t('caregiver.assignedResidents.initialHealth')}:</strong>{' '}
                    {resident.initialHealthCondition}
                  </p>
                )}
                <p>
                  <strong>{t('caregiver.assignedResidents.admittedAt')}:</strong>{' '}
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

function AssignedResidentsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const { search, setSearch, debouncedSearch, resetSearch } = useDebouncedSearch();
  const [residents, setResidents] = useState([]);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [activityByResident, setActivityByResident] = useState({});
  const [activityModalResident, setActivityModalResident] = useState(null);
  const [activityModalActivities, setActivityModalActivities] = useState([]);

  const {
    paginatedItems: paginatedResidents,
    page: clientPage,
    setPage: setClientPage,
    totalPages,
    total,
  } = useClientPagination(residents);

  const buildActivityMap = useCallback((activities = []) => {
    return (activities || []).reduce((acc, activity) => {
      const residentIds = Array.isArray(activity.participantResidentIds) ? activity.participantResidentIds : [];
      residentIds.forEach((residentId) => {
        const key = String(residentId);
        if (!acc[key]) acc[key] = [];
        acc[key].push(activity);
      });
      return acc;
    }, {});
  }, []);

  const loadResidents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [residentsResult, activitiesResult] = await Promise.allSettled([
        caregiverResidentService.listResidents({
          search: debouncedSearch || undefined,
        }),
        caregiverResidentService.listResidentActivities({ status: 'scheduled', limit: 100 }),
      ]);

      if (residentsResult.status === 'fulfilled') {
        const res = residentsResult.value;
        setResidents(Array.isArray(res.data) ? res.data : []);
        setEmptyMessage(res.message || '');
      } else {
        throw residentsResult.reason;
      }

      if (activitiesResult.status === 'fulfilled') {
        setActivityByResident(buildActivityMap(activitiesResult.value?.data || []));
      } else {
        setActivityByResident({});
      }
    } catch (e) {
      setError(resolveApiError(e, t, 'caregiver.assignedResidents.loadFailed'));
      setResidents([]);
      setActivityByResident({});
    } finally {
      setLoading(false);
    }
  }, [buildActivityMap, debouncedSearch, t]);

  useEffect(() => {
    loadResidents();
  }, [loadResidents]);

  const formatAdmittedAt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(locale);
  };

  return (
    <AdminPageShell
      title={t('caregiver.assignedResidents.title')}
      subtitle={t('caregiver.assignedResidents.subtitle')}
    >
      <div className="resident-page__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t('caregiver.assignedResidents.searchLabel')}</span>
            <input
              type="search"
              placeholder={t('caregiver.assignedResidents.searchPlaceholder')}
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
              <th>{t('caregiver.assignedResidents.activityScheduleLabel')}</th>
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
                <td colSpan={9} className="empty-state">
                  {debouncedSearch
                    ? t('caregiver.assignedResidents.emptyFiltered')
                    : t('caregiver.assignedResidents.emptyList')}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedResidents.map((row) => {
                const allergies = formatAllergies(row, t);
                const hasAllergy = allergies !== '—';
                const residentActivities = activityByResident[String(row._id)] || [];
                const hasActivities = residentActivities.length > 0;
                return (
                  <tr key={row._id}>
                    <td>{row.residentCode || '—'}</td>
                    <td>{row.fullName || '—'}</td>
                    <td>{t(`common.gender.${row.gender}`, { defaultValue: row.gender || '—' })}</td>
                    <td>{formatResidentAreaLine(row, t) || '—'}</td>
                    <td>
                      {hasActivities ? (
                        <div className="assigned-residents-page__activity-cell">
                          <span className="assigned-residents-page__activity-pill">
                            {t('caregiver.assignedResidents.activityBadge', { count: residentActivities.length })}
                          </span>
                          <button
                            type="button"
                            className="resident-page__button resident-page__button--ghost assigned-residents-page__secondary-button"
                            onClick={() => {
                              setActivityModalResident(row);
                              setActivityModalActivities(residentActivities);
                            }}
                          >
                            {t('caregiver.assignedResidents.viewActivitySchedule')}
                          </button>
                        </div>
                      ) : (
                        <span className="assigned-residents-page__activity-empty">
                          {t('caregiver.assignedResidents.noScheduledActivities')}
                        </span>
                      )}
                    </td>
                    <td className={hasAllergy ? 'assigned-residents-page__allergy-tags' : undefined}>
                      {allergies}
                    </td>
                    <td>{formatConditions(row)}</td>
                    <td>{formatAdmittedAt(row.admittedAt)}</td>
                    <td>
                      <div className="assigned-residents-page__row-actions">
                        <button
                          type="button"
                          className="resident-page__button resident-page__button--ghost"
                          onClick={() => setDetailId(row._id)}
                        >
                          {t('common.view')}
                        </button>
                      </div>
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

      <p className="assigned-residents-page__footer-link">
        <Link to="/caregiver/meal-intake-notes">{t('caregiver.assignedResidents.mealIntakeLink')}</Link>{' '}
        {t('caregiver.assignedResidents.footerLink')}
      </p>

      {detailId && (
        <ResidentDetailModal
          residentId={detailId}
          onClose={() => setDetailId(null)}
          t={t}
          locale={locale}
        />
      )}

      {activityModalResident && (
        <ActivityScheduleModal
          resident={activityModalResident}
          activities={activityModalActivities}
          onClose={() => {
            setActivityModalResident(null);
            setActivityModalActivities([]);
          }}
          t={t}
          locale={locale}
        />
      )}
    </AdminPageShell>
  );
}

export default AssignedResidentsPage;
