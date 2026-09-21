import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import residentService, { RESIDENT_INITIAL_HEALTH_ROUTE_HINT } from '../../../../services/resident.service';
import { FaEye, FaPen } from 'react-icons/fa';
import { formatLeaveDate } from '../../../../utils/leaveUtils';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import ListPagination from '../../../../components/ui/ListPagination';
import { ADMIN_LIST_PAGE_SIZE } from '../../../../constants/adminListPage';
import useDebouncedSearch from '../../../../hooks/useDebouncedSearch';
import '../../../../styles/admin/InitialHealthPage.css';
import '../../../../styles/admin/residentActionIcons.css';
import { getGenderLabel, getResidencyLabel } from '../_shared/residentLabels';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];

const emptyForm = () => ({
  bloodType: '',
  initialHealthCondition: '',
});

export default function InitialHealthPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const currentRoleBase = ['/doctor', '/nurse'].find((base) => location.pathname.startsWith(base)) || '/admin';
  const residentBase = currentRoleBase;
  const canViewPreExisting = currentRoleBase === '/admin';
  const canViewDrugAllergies = canViewPreExisting || currentRoleBase === '/doctor';
  const [residents, setResidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const resetPageOnSearch = useCallback(() => setPage(1), []);
  const { search, setSearch, debouncedSearch } = useDebouncedSearch({
    onDebouncedChange: resetPageOnSearch,
  });
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [recordedFilter, setRecordedFilter] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [panelMsg, setPanelMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewPopup, setViewPopup] = useState(null);
  const [editPopup, setEditPopup] = useState(false);
  const [usingFallbackApi, setUsingFallbackApi] = useState(false);

  const loadList = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setListLoading(true);
    setListError('');
    try {
      const params = {
        page,
        limit: ADMIN_LIST_PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      };
      if (recordedFilter === 'true') params.recorded = true;
      else if (recordedFilter === 'false') params.recorded = false;

      const res = await residentService.listInitialHealth(params);
      setResidents(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
      if (res._fallback) setUsingFallbackApi(true);
    } catch (e) {
      setListError(e.response?.data?.message || t('admin.residents.common.loadListFailed'));
      setResidents([]);
    } finally {
      if (!silent) setListLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, recordedFilter, t]);

  const loadDetail = useCallback(async (residentId) => {
    if (!residentId) {
      setHealthData(null);
      setForm(emptyForm());
      return;
    }
    setDetailLoading(true);
    setDetailError('');
    setFormError('');
    try {
      const data = await residentService.getInitialHealth(residentId);
      setHealthData(data);
      if (data._fallback) setUsingFallbackApi(true);
      const h = data.initialHealth || {};
      setForm({
        bloodType: h.bloodType && h.bloodType !== 'unknown' ? h.bloodType : h.bloodType || '',
        initialHealthCondition: h.initialHealthCondition || '',
      });
    } catch (e) {
      const status = e?.response?.status;
      setDetailError(e.response?.data?.message || t('admin.residents.initialHealth.loadHealthFailed'));
      if (status === 404 || status === 403) setUsingFallbackApi(true);
      setHealthData(null);
      setForm(emptyForm());
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

  const refreshAfterSave = useCallback(async () => {
    const tasks = [loadList({ silent: true })];
    if (selectedId) tasks.push(loadDetail(selectedId));
    await Promise.all(tasks);
  }, [selectedId, loadList, loadDetail]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const validateForm = () => {
    const desc = form.initialHealthCondition.trim();
    if (!desc) return t('admin.residents.initialHealth.conditionRequired');
    if (desc.length < 10) return t('admin.residents.initialHealth.minCharsError');
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      setFormError(t('admin.residents.common.noResidentSelected'));
      return;
    }
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }
    setSaving(true);
    setFormError('');
    setPanelMsg('');
    try {
      const payload = {
        initialHealthCondition: form.initialHealthCondition.trim(),
      };
      if (form.bloodType) payload.bloodType = form.bloodType;

      const res = await residentService.recordInitialHealth(selectedId, payload);
      if (res._fallback) setUsingFallbackApi(true);
      setPanelMsg(res.message || t('admin.residents.initialHealth.saveSuccess'));
      await refreshAfterSave();
      setEditPopup(false);
    } catch (e) {
      const status = e?.response?.status;
      setFormError(e.response?.data?.message || t('admin.residents.common.saveFailed'));
      if (status === 404 || status === 405 || status === 403) setUsingFallbackApi(true);
    } finally {
      setSaving(false);
    }
  };

  const openViewPopup = async (r, e) => {
    e?.stopPropagation();
    if (!r.hasInitialHealthRecord) {
      setViewPopup({
        loading: false,
        error: '',
        summary: r,
        resident: null,
        initialHealth: null,
        notRecorded: true,
      });
      return;
    }
    const residentKey = r._id || r.residentCode;
    setViewPopup({ loading: true, error: '', summary: r, resident: null, initialHealth: null });
    try {
      const data = await residentService.getInitialHealth(residentKey);
      if (data._fallback) setUsingFallbackApi(true);
      setViewPopup({
        loading: false,
        error: '',
        summary: r,
        resident: data.resident,
        initialHealth: data.initialHealth,
      });
    } catch (err) {
      setViewPopup({
        loading: false,
        error: err.response?.data?.message || t('admin.residents.common.loadDetailFailed'),
        summary: r,
        resident: null,
        initialHealth: null,
      });
    }
  };

  const openEditPopup = (r, e) => {
    e?.stopPropagation();
    const residentKey = r._id || r.residentCode;
    setSelectedId(residentKey);
    setPanelMsg('');
    setFormError('');
    setDetailError('');
    setEditPopup(true);
    loadDetail(residentKey);
  };

  const selectedSummary = residents.find((r) => r._id === selectedId);
  const resident = healthData?.resident;
  const hasRecord = healthData?.initialHealth?.hasInitialHealthRecord;

  return (
    <AdminPageShell
      title={t('admin.residents.initialHealth.title')}
      subtitle={t('admin.residents.initialHealth.subtitle')}
    >
      <div className="resident-page__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t('admin.residents.common.search')}</span>
            <input
              type="search"
              placeholder={t('admin.residents.common.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="resident-page__filter">
            <span>{t('admin.residents.common.status')}</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="admitted">{t('common.residency.admitted')}</option>
              <option value="pending">{t('common.residency.pending')}</option>
              <option value="discharged">{t('common.residency.discharged')}</option>
              <option value="">{t('common.allStatuses')}</option>
            </select>
          </label>
          <label className="resident-page__filter">
            <span>{t('admin.residents.common.recordFilter')}</span>
            <select
              value={recordedFilter}
              onChange={(e) => {
                setRecordedFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('admin.residents.common.recordFilterAllRecorded')}</option>
              <option value="false">{t('admin.residents.common.notRecordedYet')}</option>
              <option value="true">{t('admin.residents.common.recorded')}</option>
            </select>
          </label>
        </div>
      </div>

      {listError && <div className="resident-page__error">{listError}</div>}
      {usingFallbackApi && (
        <p className="resident-page__hint-box">⚠️ {RESIDENT_INITIAL_HEALTH_ROUTE_HINT}</p>
      )}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('admin.residents.common.colCode')}</th>
              <th>{t('admin.residents.common.colFullName')}</th>
              <th>{t('admin.residents.initialHealth.colRecordStatus')}</th>
              <th>{t('admin.residents.common.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {listLoading && (
              <tr>
                <td colSpan={4} className="empty-state">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!listLoading && residents.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  {t('admin.residents.common.noResidents')}
                </td>
              </tr>
            )}
            {!listLoading &&
              residents.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.residentCode}</td>
                  <td style={{ fontWeight: 600 }}>{r.fullName}</td>
                  <td>
                    <span
                      className={`health-badge ${
                        r.hasInitialHealthRecord ? 'health-badge--recorded' : 'health-badge--pending'
                      }`}
                    >
                      {r.hasInitialHealthRecord
                        ? t('admin.residents.initialHealth.recordBadgeRecorded')
                        : t('admin.residents.initialHealth.recordBadgePending')}
                    </span>
                  </td>
                  <td className="resident-action-cell">
                    <div className="resident-action-group">
                      <button
                        type="button"
                        className="resident-icon-btn resident-icon-btn--view"
                        title={t('admin.residents.common.viewResidentDetail')}
                        onClick={(e) => openViewPopup(r, e)}
                      >
                        <FaEye />
                      </button>
                      <button
                        type="button"
                        className="resident-icon-btn resident-icon-btn--edit"
                        title={t('admin.residents.common.edit')}
                        onClick={(e) => openEditPopup(r, e)}
                      >
                        <FaPen />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!listLoading && residents.length > 0 && (
          <ListPagination
            page={page}
            totalPages={Math.max(totalPages, 1)}
            total={total}
            onPageChange={setPage}
          />
        )}
      </div>

      {viewPopup && (
        <div className="modal-overlay" onClick={() => setViewPopup(null)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{t('admin.residents.initialHealth.viewModalTitle')}</h2>
            {viewPopup.loading && (
              <p className="empty-state" style={{ padding: '16px 0' }}>
                {t('common.loading')}
              </p>
            )}
            {!viewPopup.loading && viewPopup.error && (
              <p className="form-error">{viewPopup.error}</p>
            )}
            {!viewPopup.loading && viewPopup.notRecorded && (
              <>
                <div className="detail-row">
                  <strong>{t('admin.residents.common.residentLabel')}:</strong>{' '}
                  {viewPopup.summary.fullName} ({viewPopup.summary.residentCode})
                </div>
                <p className="empty-state" style={{ padding: '24px 0' }}>
                  {t('admin.residents.initialHealth.notRecordedAdmission')}
                </p>
              </>
            )}
            {!viewPopup.loading &&
              !viewPopup.error &&
              !viewPopup.notRecorded &&
              viewPopup.resident && (
                <>
                  <div className="detail-row">
                    <strong>{t('admin.residents.common.residentLabel')}:</strong>{' '}
                    {viewPopup.resident.fullName} ({viewPopup.resident.residentCode})
                  </div>
                  <div className="detail-row">
                    <strong>{t('profile.gender')}:</strong>{' '}
                    {getGenderLabel(t, viewPopup.resident.gender)}
                  </div>
                  <div className="detail-row">
                    <strong>{t('admin.residents.common.colStatus')}:</strong>{' '}
                    {getResidencyLabel(t, viewPopup.resident.residencyStatus)}
                  </div>
                  <hr className="modal-divider" />
                  <div className="detail-row">
                    <strong>{t('admin.residents.common.bloodType')}:</strong>{' '}
                    {viewPopup.initialHealth?.bloodType === 'unknown'
                      ? t('admin.residents.initialHealth.bloodTypeUnknown')
                      : viewPopup.initialHealth?.bloodType || '—'}
                  </div>
                  <div className="detail-row">
                    <strong>{t('admin.residents.initialHealth.conditionDescription')}:</strong>
                  </div>
                  <div className="health-description">
                    {viewPopup.initialHealth?.initialHealthCondition || '—'}
                  </div>
                  {viewPopup.initialHealth?.updatedAt && (
                    <div className="detail-row detail-row--muted">
                      {t('admin.residents.common.lastUpdated', {
                        date: formatLeaveDate(viewPopup.initialHealth.updatedAt),
                      })}
                    </div>
                  )}
                </>
              )}
            <div className="modal__actions">
              <button type="button" className="btn-cancel" onClick={() => setViewPopup(null)}>
                {t('admin.residents.common.close')}
              </button>
              {!viewPopup.loading && viewPopup.summary && (
                <button
                  type="button"
                  className="btn-save"
                  onClick={() => {
                    const summary = viewPopup.summary;
                    setViewPopup(null);
                    openEditPopup(summary);
                  }}
                >
                  {viewPopup.notRecorded
                    ? t('admin.residents.initialHealth.recordAction')
                    : t('admin.residents.initialHealth.updateAction')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {editPopup && (
        <div className="modal-overlay" onClick={() => setEditPopup(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">
              {hasRecord
                ? t('admin.residents.initialHealth.editPanelTitle')
                : t('admin.residents.initialHealth.recordPanelTitle')}
            </h2>
            {detailLoading ? (
              <div className="empty-state">{t('admin.residents.common.loadingDetail')}</div>
            ) : detailError && !healthData ? (
              <div className="empty-state">
                <p>{detailError}</p>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ marginTop: 12 }}
                  onClick={() => loadDetail(selectedId)}
                >
                  {t('admin.residents.common.retryLoad')}
                </button>
              </div>
            ) : (
              <>
                <p className="initial-health-panel__subtitle">
                  {selectedSummary?.fullName || resident?.fullName}
                  {' · '}
                  {selectedSummary?.residentCode || resident?.residentCode}
                  {resident?.age != null && ` · ${t('admin.residents.common.yearsOldWithAge', { age: resident.age })}`}
                  {resident?.gender && ` · ${getGenderLabel(t, resident.gender)}`}
                </p>
                {panelMsg && <p className="form-success">{panelMsg}</p>}
                {formError && <p className="form-error">{formError}</p>}
                <form onSubmit={handleSave}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>{t('admin.residents.common.bloodType')}</label>
                      <select
                        value={form.bloodType}
                        onChange={(e) => setField('bloodType', e.target.value)}
                      >
                        <option value="">{t('admin.residents.common.keepUnchanged')}</option>
                        {BLOOD_TYPES.map((bt) => (
                          <option key={bt} value={bt}>
                            {bt === 'unknown' ? t('admin.residents.initialHealth.bloodTypeUnknown') : bt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group form-grid--full">
                      <label>{t('admin.residents.initialHealth.conditionDescription')} *</label>
                      <textarea
                        value={form.initialHealthCondition}
                        onChange={(e) => setField('initialHealthCondition', e.target.value)}
                        placeholder={t('admin.residents.initialHealth.formPlaceholder')}
                        rows={6}
                        required
                      />
                      <span className="form-hint">
                        {t('admin.residents.common.minChars', {
                          current: form.initialHealthCondition.trim().length,
                        })}
                      </span>
                    </div>
                    {(canViewPreExisting || canViewDrugAllergies) && (
                      <p className="initial-health-related-tabs">
                        {canViewPreExisting && (
                          <>
                            {t('admin.residents.initialHealth.linkPreExisting')}{' '}
                            <Link to={`${residentBase}/residents/pre-existing-conditions`}>
                              {t('admin.residents.initialHealth.linkPreExistingTab')}
                            </Link>
                          </>
                        )}
                        {canViewPreExisting && canViewDrugAllergies && ' · '}
                        {canViewDrugAllergies && (
                          <>
                            {t('admin.residents.initialHealth.linkDrugAllergies')}{' '}
                            <Link to={`${residentBase}/residents/drug-allergies`}>
                              {t('admin.residents.initialHealth.linkDrugAllergiesTab')}
                            </Link>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="modal__actions">
                    <button type="button" className="btn-cancel" onClick={() => setEditPopup(false)}>
                      {t('admin.residents.common.close')}
                    </button>
                    <button type="submit" className="btn-save" disabled={saving}>
                      {saving
                        ? t('common.saving')
                        : hasRecord
                          ? t('admin.residents.initialHealth.updateAction')
                          : t('admin.residents.initialHealth.recordAction')}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
