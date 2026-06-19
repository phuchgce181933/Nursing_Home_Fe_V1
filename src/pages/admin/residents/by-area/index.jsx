import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, Building2, MapPin, Download } from 'lucide-react';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import ListPagination from '../../../../components/ui/ListPagination';
import { ADMIN_LIST_PAGE_SIZE } from '../../../../constants/adminListPage';
import useDebouncedSearch from '../../../../hooks/useDebouncedSearch';
import facilityService, { getFacilityErrorMessage } from '../../../../services/facility.service';
import residentService, { RESIDENT_AREA_ROUTE_HINT } from '../../../../services/resident.service';
import { FaEye } from 'react-icons/fa';
import { formatLeaveDate } from '../../../../utils/leaveUtils';
import '../../../../styles/admin/residentActionIcons.css';
import { getGenderLabel, getResidencyLabel } from '../_shared/residentLabels';
import { formatResidentAreaLine, pickDrugAllergiesList } from '../../../../utils/residentArea';
import {
  exportResidentListToCSV,
  exportResidentListToPDF,
} from '../../../../utils/residentListExport';
import { useAuth } from '../../../../hooks/useAuth';

function ResidentDetailModal({ loading, error, resident, onClose, t }) {
  if (!loading && !error && !resident) return null;

  const area = resident?.area;
  const drugAllergiesList = pickDrugAllergiesList(resident);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{t('admin.residents.byArea.residentDetailModal')}</h2>

        {loading && <p className="empty-state">{t('common.loading')}</p>}
        {!loading && error && <p className="form-error">{error}</p>}

        {!loading && !error && resident && (
          <>
            <div className="modal__section">{t('admin.residents.common.basicInfo')}</div>
            <div className="detail-row"><strong>{t('admin.residents.common.colCode')}:</strong> {resident.residentCode}</div>
            <div className="detail-row"><strong>{t('admin.residents.common.colFullName')}:</strong> {resident.fullName}</div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.dateOfBirth')}:</strong>{' '}
              {resident.dateOfBirth ? formatLeaveDate(resident.dateOfBirth) : '—'}
              {resident.age != null && ` ${t('admin.residents.byArea.ageSuffix', { age: resident.age })}`}
            </div>
            <div className="detail-row">
              <strong>{t('profile.gender')}:</strong> {getGenderLabel(t, resident.gender)}
            </div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.colStatus')}:</strong>{' '}
              <span className={`residency-badge residency-badge--${resident.residencyStatus || 'default'}`}>
                {getResidencyLabel(t, resident.residencyStatus)}
              </span>
            </div>

            <div className="modal__section">{t('admin.residents.common.areaSection')}</div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.building')}:</strong> {area?.building?.name || area?.building?.code || '—'}
            </div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.floor')}:</strong> {area?.floor?.label || area?.floor?.name || '—'}
            </div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.room')}:</strong>{' '}
              {area?.room?.label || (area?.room?.roomNumber ? `${t('admin.residents.common.room')} ${area.room.roomNumber}` : '—')}
            </div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.bed')}:</strong> {area?.bed?.bedCode || '—'}
            </div>

            <div className="modal__section">{t('admin.residents.common.healthAtAdmission')}</div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.bloodType')}:</strong>{' '}
              {resident.bloodType && resident.bloodType !== 'unknown' ? resident.bloodType : '—'}
            </div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.initialCondition')}:</strong>
            </div>
            <div className="health-description">
              {resident.initialHealthCondition || '—'}
            </div>

            <div className="modal__section">{t('admin.residents.common.chronicAndHistory')}</div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.chronicConditions')}:</strong>
              {resident.chronicConditions?.length ? (
                <div className="detail-tags">
                  {resident.chronicConditions.map((c) => (
                    <span key={c} className="detail-tag">{c}</span>
                  ))}
                </div>
              ) : '—'}
            </div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.medicalHistory')}:</strong>
              {Array.isArray(resident.medicalHistory) && resident.medicalHistory.length ? (
                <div className="detail-tags">
                  {resident.medicalHistory.map((item) => (
                    <span key={item} className="detail-tag">{item}</span>
                  ))}
                </div>
              ) : typeof resident.medicalHistory === 'string' && resident.medicalHistory.trim() ? (
                <div className="health-description">{resident.medicalHistory}</div>
              ) : (
                '—'
              )}
            </div>

            <div className="modal__section">{t('admin.residents.common.drugAllergiesSection')}</div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.drugAllergies')}:</strong>
              {drugAllergiesList.length ? (
                <div className="detail-tags">
                  {drugAllergiesList.map((d) => (
                    <span key={d} className="detail-tag">{d}</span>
                  ))}
                </div>
              ) : (
                <span className="detail-row--muted">{t('admin.residents.common.noDrugAllergies')}</span>
              )}
            </div>

            <div className="modal__section">{t('admin.residents.common.other')}</div>
            <div className="detail-row"><strong>{t('admin.residents.common.citizenId')}:</strong> {resident.citizenId || '—'}</div>
            <div className="detail-row"><strong>{t('admin.residents.common.insurance')}:</strong> {resident.insuranceNumber || '—'}</div>
            <div className="detail-row"><strong>{t('admin.residents.common.address')}:</strong> {resident.personalAddress || '—'}</div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.admittedAt')}:</strong>{' '}
              {resident.admittedAt ? formatLeaveDate(resident.admittedAt) : '—'}
            </div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.servicePackage')}:</strong> {resident.servicePackage || '—'}
            </div>
            <div className="detail-row">
              <strong>{t('admin.residents.common.emergencyContacts')}:</strong> {resident.emergencyContactCount ?? 0}
            </div>
          </>
        )}

        <div className="modal__actions">
          <button type="button" className="btn-cancel" onClick={onClose}>{t('admin.residents.common.close')}</button>
        </div>
      </div>
    </div>
  );
}

export default function ResidentsByAreaPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState('');
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [page, setPage] = useState(1);
  const resetPageOnSearch = useCallback(() => setPage(1), []);
  const { search, setSearch, debouncedSearch } = useDebouncedSearch({
    onDebouncedChange: resetPageOnSearch,
  });

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const [floorId, setFloorId] = useState('');
  const [roomId, setRoomId] = useState('');

  const [residents, setResidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [detailModal, setDetailModal] = useState(null);
  const [usingFallbackApi, setUsingFallbackApi] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    facilityService
      .listBuildings({ activeOnly: true })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setBuildings(list);
        if (list.length && !buildingId) setBuildingId(list[0]._id);
      })
      .catch(() => setBuildings([]));
  }, []);

  const loadSummary = useCallback(async () => {
    if (!buildingId) {
      setSummary(null);
      return;
    }
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await residentService.getAreaSummary({
        buildingId,
        status: statusFilter || undefined,
      });
      setSummary(data);
      if (data?._fallback) setUsingFallbackApi(true);
    } catch (e) {
      setSummaryError(e.response?.data?.message || getFacilityErrorMessage(e, t('admin.residents.byArea.loadSummaryFailed')));
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [buildingId, statusFilter, t]);

  const loadList = useCallback(async () => {
    if (!buildingId && !floorId && !roomId) {
      setResidents([]);
      return;
    }
    setListLoading(true);
    setListError('');
    try {
      const res = await residentService.listByArea({
        buildingId: buildingId || undefined,
        floorId: floorId || undefined,
        roomId: roomId || undefined,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        limit: ADMIN_LIST_PAGE_SIZE,
      });
      setResidents(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 0);
      if (res?._fallback) setUsingFallbackApi(true);
    } catch (e) {
      setListError(e.response?.data?.message || t('admin.residents.byArea.loadListFailed'));
      setResidents([]);
    } finally {
      setListLoading(false);
    }
  }, [buildingId, floorId, roomId, debouncedSearch, statusFilter, page, t]);

  useEffect(() => {
    setFloorId('');
    setRoomId('');
    setPage(1);
    setUsingFallbackApi(false);
  }, [buildingId, statusFilter]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => { loadList(); }, [loadList]);

  const selectFloor = (id) => {
    setFloorId(id);
    setRoomId('');
    setPage(1);
  };

  const selectRoom = (fId, rId) => {
    setFloorId(fId);
    setRoomId(rId);
    setPage(1);
  };

  const selectAllBuilding = () => {
    setFloorId('');
    setRoomId('');
    setPage(1);
  };

  const openDetail = async (residentId) => {
    setDetailModal({ loading: true, error: '', resident: null });
    try {
      const data = await residentService.getResidentDetail(residentId);
      setDetailModal({ loading: false, error: '', resident: data.resident });
    } catch (e) {
      setDetailModal({
        loading: false,
        error: e.response?.data?.message || t('admin.residents.common.loadDetailFailed'),
        resident: null,
      });
    }
  };

  const activeFilterLabel = roomId
    ? summary?.floors
        ?.flatMap((f) => f.rooms.map((r) => ({ floor: f, room: r })))
        ?.find(({ room }) => String(room._id) === String(roomId))?.room.label
    : floorId
      ? summary?.floors?.find((f) => String(f._id) === String(floorId))?.label
      : buildings.find((b) => String(b._id) === String(buildingId))?.name || t('admin.residents.common.wholeBuilding');

  const buildExportFilterSummary = () => {
    const parts = [];
    if (activeFilterLabel) parts.push(t('admin.residents.common.areaFilter', { label: activeFilterLabel }));
    parts.push(
      t('admin.residents.common.statusFilter', {
        label: statusFilter ? getResidencyLabel(t, statusFilter) : t('common.allStatuses'),
      })
    );
    if (search) parts.push(t('admin.residents.common.searchFilter', { query: search }));
    return parts.join(' | ');
  };

  const handleExport = async (format) => {
    if (!buildingId) {
      alert(t('admin.residents.common.exportSelectBuilding'));
      return;
    }
    try {
      setExporting(true);
      setListError('');
      const rows = await residentService.fetchAllResidentsByAreaForExport({
        buildingId,
        floorId: floorId || undefined,
        roomId: roomId || undefined,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      });
      if (!rows.length) {
        alert(t('admin.residents.common.exportNoData'));
        return;
      }
      const meta = {
        title: t('admin.residents.byArea.export.listTitle'),
        filterSummary: buildExportFilterSummary(),
        exportedBy: user?.fullName || user?.email || '—',
        buildingLabel: activeFilterLabel,
        buildingId,
        summaryStats: {
          totalInBuilding: summary?.totalResidents ?? 0,
          floorCount: summary?.floors?.length ?? 0,
          filteredCount: rows.length,
        },
      };
      if (format === 'csv') {
        exportResidentListToCSV(rows, meta);
      } else {
        exportResidentListToPDF(rows, meta);
      }
    } catch (e) {
      console.error('Failed to export residents by area:', e);
      setListError(e.response?.data?.message || t('admin.residents.byArea.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const floorOptions = summary?.floors || [];
  const selectedFloor = floorOptions.find((f) => String(f._id) === String(floorId));
  const roomOptions = floorId
    ? selectedFloor?.rooms || []
    : floorOptions.flatMap((f) => f.rooms || []);

  const pageStats = useMemo(
    () => [
      {
        label: t('admin.residents.byArea.statTotalInBuilding'),
        value: String(summary?.totalResidents ?? 0).padStart(2, '0'),
        icon: <Building2 size={20} />,
      },
      {
        label: t('admin.residents.byArea.statFloorCount'),
        value: String(summary?.floors?.length ?? 0).padStart(2, '0'),
        icon: <MapPin size={20} />,
        iconClass: 'resident-stat__icon--admitted',
      },
      {
        label: t('admin.residents.byArea.statFiltered'),
        value: String(total).padStart(2, '0'),
        icon: <MapPin size={20} />,
        iconClass: 'resident-stat__icon--pending',
      },
    ],
    [summary, total, t]
  );

  return (
    <AdminPageShell
      title={t('admin.residents.byArea.title')}
      subtitle={t('admin.residents.byArea.subtitle')}
      actions={
        <>
          <button
            type="button"
            className="resident-page__button resident-page__button--ghost"
            onClick={() => {
              loadSummary();
              loadList();
            }}
            disabled={listLoading || exporting}
          >
            <RefreshCw size={16} className={listLoading ? 'spin' : ''} />
            {t('admin.residents.common.refresh')}
          </button>
          <button
            type="button"
            className="resident-page__button resident-page__button--export"
            onClick={() => handleExport('csv')}
            disabled={listLoading || exporting || !buildingId}
            title={t('admin.residents.byArea.exportCsvTitle')}
          >
            <Download size={16} />
            {exporting ? t('admin.residents.byArea.exporting') : t('admin.residents.byArea.exportExcel')}
          </button>
          <button
            type="button"
            className="resident-page__button resident-page__button--export-pdf"
            onClick={() => handleExport('pdf')}
            disabled={listLoading || exporting || !buildingId}
            title={t('admin.residents.byArea.exportPdfTitle')}
          >
            <Download size={16} />
            {t('admin.residents.common.exportPdf')}
          </button>
        </>
      }
      stats={summary ? pageStats : undefined}
    >
      <div className="resident-page__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t('admin.residents.common.filterBuilding')}</span>
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              disabled={!buildings.length}
            >
              {!buildings.length && <option value="">{t('admin.residents.common.noBuilding')}</option>}
              {buildings.map((b) => (
                <option key={b._id} value={b._id}>{b.name || b.code}</option>
              ))}
            </select>
          </label>
          <label className="resident-page__filter">
            <span>{t('admin.residents.common.status')}</span>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="admitted">{t('common.residency.admitted')}</option>
              <option value="pending">{t('common.residency.pending')}</option>
              <option value="discharged">{t('common.residency.discharged')}</option>
              <option value="">{t('common.allStatuses')}</option>
            </select>
          </label>
          <label className="resident-page__filter">
            <span>{t('admin.residents.byArea.floor')}</span>
            <select value={floorId} onChange={(e) => selectFloor(e.target.value)}>
              <option value="">{t('admin.residents.byArea.allFloors')}</option>
              {floorOptions.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.label || f.name || `${t('admin.residents.common.floor')} ${f.floorNumber}`}
                </option>
              ))}
            </select>
          </label>
          <label className="resident-page__filter">
            <span>{t('admin.residents.byArea.room')}</span>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">{t('admin.residents.byArea.allRooms')}</option>
              {roomOptions.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.label || `${t('admin.residents.common.room')} ${r.roomNumber}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t('admin.residents.common.search')}</span>
            <div className="resident-page__filter-input">
              <Search size={16} />
              <input
                type="search"
                placeholder={t('admin.residents.common.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
          <div className="resident-page__filter-actions">
            <button
              type="button"
              className="resident-page__button resident-page__button--ghost"
              onClick={selectAllBuilding}
            >
              {t('admin.residents.common.clearAreaFilter')}
            </button>
          </div>
        </div>
      </div>

      {usingFallbackApi && (
        <p className="resident-page__hint-box">⚠️ {RESIDENT_AREA_ROUTE_HINT}</p>
      )}

      {(summaryError || listError) && (
        <div className="resident-page__error">{summaryError || listError}</div>
      )}

      {summary && activeFilterLabel && (
        <p className="resident-page__hint">{t('admin.residents.common.filteringLabel', { label: activeFilterLabel })}</p>
      )}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('admin.residents.common.colCode')}</th>
              <th>{t('admin.residents.common.colFullName')}</th>
              <th>{t('admin.residents.byArea.colArea')}</th>
              <th>{t('admin.residents.byArea.colAllergies')}</th>
              <th>{t('admin.residents.common.colStatus')}</th>
              <th>{t('admin.residents.common.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {listLoading && (
              <tr><td colSpan={6} className="resident-page__empty">{t('common.loading')}</td></tr>
            )}
            {!listLoading && !buildingId && (
              <tr><td colSpan={6} className="resident-page__empty">{t('admin.residents.common.selectBuildingToView')}</td></tr>
            )}
            {!listLoading && buildingId && residents.length === 0 && (
              <tr><td colSpan={6} className="resident-page__empty">{t('admin.residents.common.noResidentsInArea')}</td></tr>
            )}
            {!listLoading && residents.map((r) => (
              <tr key={r._id} className="resident-page__table-row">
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.residentCode}</td>
                <td style={{ fontWeight: 600 }}>{r.fullName}</td>
                <td>{formatResidentAreaLine(r, t) || '—'}</td>
                <td>
                  {r.hasDrugAllergiesRecord
                    ? t('admin.residents.byArea.allergyRecorded', { count: r.drugAllergiesCount ?? pickDrugAllergiesList(r).length ?? 0 })
                    : t('admin.residents.byArea.allergyNotRecorded')}
                </td>
                <td>
                  <span className={`residency-badge residency-badge--${r.residencyStatus || 'default'}`}>
                    {getResidencyLabel(t, r.residencyStatus)}
                  </span>
                </td>
                <td className="resident-action-cell">
                  <button
                    type="button"
                    className="resident-icon-btn resident-icon-btn--view"
                    title={t('admin.residents.byArea.viewDetails')}
                    onClick={() => openDetail(r._id)}
                  >
                    <FaEye />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!listLoading && residents.length > 0 && (
        <ListPagination
          page={page}
          totalPages={Math.max(totalPages, 1)}
          total={total}
          onPageChange={setPage}
        />
      )}

      {detailModal && (
        <ResidentDetailModal
          loading={detailModal.loading}
          error={detailModal.error}
          resident={detailModal.resident}
          onClose={() => setDetailModal(null)}
          t={t}
        />
      )}
    </AdminPageShell>
  );
}
