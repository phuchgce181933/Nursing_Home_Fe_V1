import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import residentService, { RESIDENT_PRE_EXISTING_ROUTE_HINT } from '../../../../services/resident.service';
import ResidentContextBlock from '../../../../components/resident/ResidentContextBlock';
import { FaEye, FaPen } from 'react-icons/fa';
import { formatLeaveDate } from '../../../../utils/leaveUtils';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import ListPagination from '../../../../components/ui/ListPagination';
import { ADMIN_LIST_PAGE_SIZE } from '../../../../constants/adminListPage';
import useDebouncedSearch from '../../../../hooks/useDebouncedSearch';
import '../../../../styles/admin/PreExistingConditionsPage.css';
import '../../../../styles/admin/residentActionIcons.css';

const emptyForm = () => ({
  chronicConditions: '',
  medicalHistory: '',
});

const joinList = (items) => (Array.isArray(items) ? items.join(', ') : '');

const parseCommaList = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

function formatPreExistingListStatus(row, t) {
  if (!row?.hasPreExistingRecord) return t('admin.residents.common.noRecord');
  const chronic = row.chronicConditionsCount || 0;
  const history = row.medicalHistoryCount || 0;
  const parts = [];
  if (chronic > 0) parts.push(t('admin.residents.common.chronicCount', { count: chronic }));
  if (history > 0) parts.push(t('admin.residents.common.historyCount', { count: history }));
  if (!parts.length) return t('admin.residents.common.recorded');
  const filledSections = (chronic > 0 ? 1 : 0) + (history > 0 ? 1 : 0);
  const base =
    filledSections < 2
      ? t('admin.residents.common.recordedPartial', { sections: filledSections })
      : t('admin.residents.common.recorded');
  return `${base} · ${parts.join(' · ')}`;
}

export default function PreExistingConditionsPage() {
  const { t } = useTranslation();
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
  const [detailData, setDetailData] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [panelMsg, setPanelMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showRouteHint, setShowRouteHint] = useState(false);
  const [viewPopup, setViewPopup] = useState(false);
  const [editPopup, setEditPopup] = useState(false);

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

      const res = await residentService.listPreExistingConditions(params);
      setResidents(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
      if (res._fallback) setShowRouteHint(true);
    } catch (e) {
      setListError(e.response?.data?.message || t('admin.residents.common.loadListFailed'));
      setResidents([]);
    } finally {
      if (!silent) setListLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, recordedFilter, t]);

  const loadDetail = useCallback(async (residentId) => {
    if (!residentId) {
      setDetailData(null);
      setForm(emptyForm());
      return;
    }

    setDetailLoading(true);
    setDetailError('');
    setFormError('');
    try {
      const data = await residentService.getPreExistingConditions(residentId);
      setDetailData(data);
      if (data._fallback) setShowRouteHint(true);
      setForm({
        chronicConditions: joinList(data.preExistingConditions?.chronicConditions),
        medicalHistory: joinList(data.preExistingConditions?.medicalHistory),
      });
    } catch (e) {
      const status = e?.response?.status;
      const message = e.response?.data?.message || t('admin.residents.preExistingConditions.loadFailed');
      setDetailError(message);
      if (status === 404 || status === 400 || status === 403) setShowRouteHint(true);
      setDetailData(null);
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

  const openViewPopup = (resident) => {
    const residentKey = resident._id || resident.residentCode;
    setSelectedId(residentKey);
    setPanelMsg('');
    setFormError('');
    setDetailError('');
    setViewPopup(true);
    loadDetail(residentKey);
  };

  const openEditPopup = (resident) => {
    const residentKey = resident._id || resident.residentCode;
    setSelectedId(residentKey);
    setPanelMsg('');
    setFormError('');
    setDetailError('');
    setEditPopup(true);
    loadDetail(residentKey);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validateForm = () => {
    const chronicList = parseCommaList(form.chronicConditions);
    const historyList = parseCommaList(form.medicalHistory);
    if (!chronicList.length && !historyList.length) {
      return t('admin.residents.preExistingConditions.requireOneField');
    }
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      setFormError(t('admin.residents.common.noResidentSelected'));
      return;
    }
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    setSaving(true);
    setFormError('');
    setPanelMsg('');
    try {
      const payload = {};
      const chronicList = parseCommaList(form.chronicConditions);
      const historyList = parseCommaList(form.medicalHistory);
      if (chronicList.length) payload.chronicConditions = chronicList;
      if (historyList.length) payload.medicalHistory = historyList;

      const res = await residentService.updatePreExistingConditions(selectedId, payload);
      if (res._fallback) setShowRouteHint(true);
      setPanelMsg(
        res._partialMedicalHistory
          ? `${res.message || t('admin.residents.preExistingConditions.saveSuccess')} — ${t('admin.residents.preExistingConditions.routeHintPartial')}`
          : res.message || t('admin.residents.preExistingConditions.saveSuccess')
      );
      await refreshAfterSave();
      setEditPopup(false);
    } catch (e) {
      const status = e?.response?.status;
      setFormError(e.response?.data?.message || t('admin.residents.preExistingConditions.updateFailed'));
      if (status === 404 || status === 400 || status === 403) setShowRouteHint(true);
    } finally {
      setSaving(false);
    }
  };

  const selectedSummary = residents.find((r) => r._id === selectedId);
  const resident = detailData?.resident;

  return (
    <AdminPageShell
      title={t('admin.residents.preExistingConditions.title')}
      subtitle={t('admin.residents.preExistingConditions.subtitle')}
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
            <span>{t('admin.residents.common.filterRecord')}</span>
            <select
              value={recordedFilter}
              onChange={(e) => {
                setRecordedFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('admin.residents.common.filterRecordAll')}</option>
              <option value="false">{t('admin.residents.common.notRecordedYet')}</option>
              <option value="true">{t('admin.residents.common.recorded')}</option>
            </select>
          </label>
        </div>
      </div>

      {listError && <div className="resident-page__error">{listError}</div>}
      {showRouteHint && <p className="resident-page__hint-box">⚠️ {RESIDENT_PRE_EXISTING_ROUTE_HINT}</p>}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('admin.residents.common.colCode')}</th>
              <th>{t('admin.residents.common.colFullName')}</th>
              <th>{t('admin.residents.preExistingConditions.colRecordStatus')}</th>
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
                  <td className="pre-existing-status-cell">{formatPreExistingListStatus(r, t)}</td>
                  <td className="resident-action-cell">
                    <div className="resident-action-group">
                      <button
                        type="button"
                        className="resident-icon-btn resident-icon-btn--view"
                        title={t('admin.residents.common.viewResidentDetail')}
                        onClick={() => openViewPopup(r)}
                      >
                        <FaEye />
                      </button>
                      <button
                        type="button"
                        className="resident-icon-btn resident-icon-btn--edit"
                        title={t('admin.residents.common.edit')}
                        onClick={() => openEditPopup(r)}
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
        <div className="modal-overlay" onClick={() => setViewPopup(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{t('admin.residents.preExistingConditions.viewModalTitle')}</h2>
            <ResidentContextBlock
              resident={resident}
              summary={selectedSummary}
              showGender
              showStatus
            />
            {detailLoading ? (
              <div className="empty-state">{t('admin.residents.common.loadingDetail')}</div>
            ) : detailError && !detailData ? (
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
                <div className="detail-row">
                  <strong>{t('admin.residents.common.chronicConditions')}:</strong>{' '}
                  {detailData?.preExistingConditions?.chronicConditions?.length
                    ? detailData.preExistingConditions.chronicConditions.join(', ')
                    : t('admin.residents.common.none')}
                </div>
                <div className="detail-row">
                  <strong>{t('admin.residents.preExistingConditions.historyBeforeAdmission')}:</strong>{' '}
                  {detailData?.preExistingConditions?.medicalHistory?.length
                    ? detailData.preExistingConditions.medicalHistory.join(', ')
                    : t('admin.residents.common.none')}
                </div>
                {detailData?.preExistingConditions?.updatedAt && (
                  <p className="pre-existing-panel__updated">
                    {t('admin.residents.common.lastUpdated', {
                      date: formatLeaveDate(detailData.preExistingConditions.updatedAt),
                    })}
                  </p>
                )}
              </>
            )}
            <div className="modal__actions">
              <button type="button" className="btn-cancel" onClick={() => setViewPopup(false)}>
                {t('admin.residents.common.close')}
              </button>
              {selectedSummary && (
                <button
                  type="button"
                  className="btn-save"
                  onClick={() => {
                    setViewPopup(false);
                    openEditPopup(selectedSummary);
                  }}
                >
                  {t('admin.residents.initialHealth.updateAction')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {editPopup && (
        <div className="modal-overlay" onClick={() => setEditPopup(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{t('admin.residents.preExistingConditions.editModalTitle')}</h2>
            <ResidentContextBlock
              resident={resident}
              summary={selectedSummary}
              showGender
              showStatus
            />
            {detailLoading ? (
              <div className="empty-state">{t('admin.residents.common.loadingDetail')}</div>
            ) : detailError && !detailData ? (
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
                {panelMsg && <p className="form-success">{panelMsg}</p>}
                {formError && <p className="form-error">{formError}</p>}
                <form onSubmit={handleSave}>
                  <div className="form-grid">
                    <div className="form-group form-grid--full">
                      <label>{t('admin.residents.preExistingConditions.chronicLabel')}</label>
                      <textarea
                        value={form.chronicConditions}
                        onChange={(e) => setField('chronicConditions', e.target.value)}
                        placeholder={t('admin.residents.preExistingConditions.chronicPlaceholder')}
                        rows={4}
                      />
                    </div>
                    <div className="form-group form-grid--full">
                      <label>{t('admin.residents.preExistingConditions.historyLabel')}</label>
                      <textarea
                        value={form.medicalHistory}
                        onChange={(e) => setField('medicalHistory', e.target.value)}
                        placeholder={t('admin.residents.preExistingConditions.historyPlaceholder')}
                        rows={4}
                      />
                    </div>
                  </div>
                  <div className="modal__actions">
                    <button type="button" className="btn-cancel" onClick={() => setEditPopup(false)}>
                      {t('admin.residents.common.close')}
                    </button>
                    <button type="submit" className="btn-save" disabled={saving}>
                      {saving ? t('common.saving') : t('admin.residents.initialHealth.updateAction')}
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
