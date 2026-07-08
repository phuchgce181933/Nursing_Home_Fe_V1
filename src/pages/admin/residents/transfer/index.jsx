import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePortalPrefix } from '../../../../hooks/usePortalPrefix';
import facilityService from '../../../../services/facility.service';
import residentService, { RESIDENT_TRANSFER_ROUTE_HINT } from '../../../../services/resident.service';
import { formatStaffAreasSyncedSummary } from '../../../../utils/staffAreasSynced';
import { resolveApiError } from '../../../../utils/apiMessage';
import { FaEye, FaPen } from 'react-icons/fa';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import ListPagination from '../../../../components/ui/ListPagination';
import { ADMIN_LIST_PAGE_SIZE } from '../../../../constants/adminListPage';
import useDebouncedSearch from '../../../../hooks/useDebouncedSearch';
import '../../../../styles/admin/TransferResidentPage.css';
import '../../../../styles/admin/residentActionIcons.css';
import { getGenderLabel, getResidencyLabel } from '../_shared/residentLabels';

const roomText = (room, t) => {
  if (!room) return '—';
  return room.roomNumber ? `${t('admin.residents.common.room')} ${room.roomNumber}` : room.label || room.name || '—';
};

const bedText = (bed) => {
  if (!bed) return '—';
  return bed.bedCode ? `${bed.bedCode}${bed.bedType ? ` (${bed.bedType})` : ''}` : '—';
};

const buildingText = (building) => {
  if (!building) return '—';
  return building.name || building.code || '—';
};

const floorText = (floor, t) => {
  if (!floor) return '—';
  return floor.name || (floor.floorNumber != null ? `${t('admin.residents.common.floor')} ${floor.floorNumber}` : floor.label || '—');
};

const formatDateLocale = (value, language) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const locale = language?.startsWith('vi') ? 'vi-VN' : 'en-US';
  return d.toLocaleDateString(locale);
};

const resolveTargetsInfo = (targetsData, t) => {
  if (!targetsData || (targetsData.targets || []).length > 0) return '';
  if (targetsData.messageKey === 'RESIDENT_TRANSFER_NO_TARGETS') {
    return t('admin.residents.transfer.noAvailableBeds');
  }
  return targetsData.message || t('admin.residents.transfer.noAvailableBeds');
};

function DetailRow({ label, value }) {
  return (
    <div className="transfer-detail-row">
      <span className="transfer-detail-row__label">{label}</span>
      <span className="transfer-detail-row__value">{value ?? '—'}</span>
    </div>
  );
}

function LocationBlock({ assignment, area, t }) {
  const room = assignment?.room || area?.room;
  const floor = assignment?.floor || area?.floor;
  const building = assignment?.building || area?.building;
  const bed = assignment?.bed || area?.bed;

  return (
  <>
    <DetailRow label={t('admin.residents.common.building')} value={buildingText(building)} />
    <DetailRow label={t('admin.residents.common.floor')} value={floorText(floor, t)} />
    <DetailRow label={t('admin.residents.common.room')} value={roomText(room, t)} />
    <DetailRow label={t('admin.residents.common.bed')} value={bedText(bed)} />
    {room?.roomType && <DetailRow label={t('admin.residents.common.roomType')} value={room.roomType} />}
  </>
  );
}

export default function TransferResidentPage() {
  const { t, i18n } = useTranslation();
  const [residents, setResidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const resetPageOnSearch = useCallback(() => setPage(1), []);
  const { search, setSearch, debouncedSearch } = useDebouncedSearch({
    onDebouncedChange: resetPageOnSearch,
  });
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [targetsData, setTargetsData] = useState(null);
  const [targetLoading, setTargetLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const [targetRoomId, setTargetRoomId] = useState('');
  const [targetBedId, setTargetBedId] = useState('');
  const floorIdRef = useRef(floorId);
  const selectedIdRef = useRef(selectedId);
  const pendingAutoFloorRef = useRef(false);
  floorIdRef.current = floorId;
  selectedIdRef.current = selectedId;
  const [saving, setSaving] = useState(false);
  const [panelMsg, setPanelMsg] = useState('');
  const [staffSyncNotice, setStaffSyncNotice] = useState(null);
  const [staffSyncEmptyNote, setStaffSyncEmptyNote] = useState(false);
  const [showRouteHint, setShowRouteHint] = useState(false);
  const [viewPopup, setViewPopup] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState('');
  const [editPopup, setEditPopup] = useState(false);

  const portalPrefix = usePortalPrefix();
  const assignmentsPath = `${portalPrefix}/staff/assignments`;

  const clearTransferFeedback = () => {
    setPanelMsg('');
    setStaffSyncNotice(null);
    setStaffSyncEmptyNote(false);
  };

  const loadList = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setListLoading(true);
    setListError('');
    try {
      const res = await residentService.listForFamilyManagement({
        page,
        limit: ADMIN_LIST_PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      });
      setResidents(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (e) {
      setListError(e.response?.data?.message || t('admin.residents.transfer.loadFailed'));
      setResidents([]);
    } finally {
      if (!silent) setListLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, t]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const [buildingRes, floorRes] = await Promise.all([
          facilityService.listBuildings({ activeOnly: true }),
          facilityService.listFloors({ activeOnly: true }),
        ]);
        const b = Array.isArray(buildingRes) ? buildingRes : [];
        const f = Array.isArray(floorRes) ? floorRes : [];
        setBuildings(b);
        setFloors(f);
        if (b.length && !buildingId) setBuildingId(String(b[0]._id));
      } catch {
        setBuildings([]);
        setFloors([]);
      }
    };
    loadFacilities();
  }, []);

  const floorsInBuilding = useMemo(
    () =>
      floors.filter((f) => {
        if (!buildingId) return true;
        const bid = f?.buildingId?._id || f?.buildingId;
        return String(bid) === String(buildingId);
      }),
    [floors, buildingId]
  );

  useEffect(() => {
    if (!floorsInBuilding.length) {
      setFloorId('');
      return;
    }
    if (!floorsInBuilding.some((f) => String(f._id) === String(floorId))) {
      setFloorId(String(floorsInBuilding[0]._id));
    }
  }, [floorsInBuilding, floorId]);

  const clearTargetSelections = () => {
    setTargetRoomId('');
    setTargetBedId('');
  };

  const handleBuildingChange = (nextBuildingId) => {
    setBuildingId(nextBuildingId);
    clearTargetSelections();
    setSubmitError('');
  };

  const handleFloorChange = (nextFloorId) => {
    setFloorId(nextFloorId);
    clearTargetSelections();
    setSubmitError('');
  };

  const loadTargets = useCallback(async () => {
    if (!selectedId || !floorId) {
      setTargetsData(null);
      return;
    }
    const requestFloorId = floorId;
    const requestSelectedId = selectedId;
    setTargetLoading(true);
    setLoadError('');
    try {
      const data = await residentService.getTransferTargets(requestSelectedId, { floorId: requestFloorId });
      if (
        requestFloorId !== floorIdRef.current ||
        requestSelectedId !== selectedIdRef.current
      ) {
        return;
      }

      if (pendingAutoFloorRef.current) {
        const currentFloorId = data.currentAssignment?.floor?._id || data.currentAssignment?.floor;
        const currentBuildingId = data.currentAssignment?.building?._id || data.currentAssignment?.building;
        pendingAutoFloorRef.current = false;
        if (currentBuildingId) {
          setBuildingId(String(currentBuildingId));
        }
        if (currentFloorId && String(currentFloorId) !== String(requestFloorId)) {
          setFloorId(String(currentFloorId));
          return;
        }
      }

      setTargetsData(data);
      clearTargetSelections();
    } catch (e) {
      if (
        requestFloorId !== floorIdRef.current ||
        requestSelectedId !== selectedIdRef.current
      ) {
        return;
      }
      const status = e?.response?.status;
      setLoadError(resolveApiError(e, t, 'admin.residents.transfer.loadTargetFailed'));
      setTargetsData(null);
      clearTargetSelections();
      if (status === 404 || status === 400) setShowRouteHint(true);
    } finally {
      if (
        requestFloorId === floorIdRef.current &&
        requestSelectedId === selectedIdRef.current
      ) {
        setTargetLoading(false);
      }
    }
  }, [selectedId, floorId, t]);

  const refreshAfterTransfer = useCallback(async () => {
    const tasks = [loadList({ silent: true })];
    if (selectedId && floorId) tasks.push(loadTargets());
    await Promise.all(tasks);
  }, [selectedId, floorId, loadList, loadTargets]);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  const selectedRoom = useMemo(
    () => targetsData?.targets?.find((r) => String(r._id) === String(targetRoomId)) || null,
    [targetsData, targetRoomId]
  );

  const openViewPopup = async (resident) => {
    clearTransferFeedback();
    setViewPopup(true);
    setViewDetail(null);
    setViewError('');
    setViewLoading(true);
    try {
      const data = await residentService.getResidentDetail(resident._id);
      setViewDetail(data.resident);
    } catch (e) {
      setViewError(e.response?.data?.message || e.message || t('admin.residents.transfer.loadDetailFailed'));
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewPopup = () => {
    setViewPopup(false);
    setViewDetail(null);
    setViewError('');
  };

  const targetsInfo = useMemo(
    () => resolveTargetsInfo(targetsData, t),
    [targetsData, t]
  );

  const openEditPopup = (resident) => {
    setSelectedId(resident._id);
    clearTransferFeedback();
    setLoadError('');
    setSubmitError('');
    setTargetsData(null);
    clearTargetSelections();
    pendingAutoFloorRef.current = true;
    setEditPopup(true);
  };

  const closeEditPopup = () => {
    setEditPopup(false);
    setLoadError('');
    setSubmitError('');
    setTargetsData(null);
    clearTargetSelections();
    pendingAutoFloorRef.current = false;
  };

  const currentBedLabel = useMemo(() => {
    const bed = targetsData?.currentAssignment?.bed;
    return bedText(bed);
  }, [targetsData]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!targetRoomId || !targetBedId) {
      setSubmitError(t('admin.residents.transfer.selectTargetRequired'));
      return;
    }
    setSaving(true);
    setSubmitError('');
    clearTransferFeedback();
    try {
      const res = await residentService.transferResidentToRoom(selectedId, {
        targetRoomId,
        targetBedId,
      });
      setPanelMsg(res.message || t('admin.residents.transfer.transferSuccess'));

      const synced = res.staffAreasSynced;
      const summary = formatStaffAreasSyncedSummary(synced, {
        floors,
        transferTargets: targetsData?.targets || [],
      }, t);
      if (summary) {
        setStaffSyncNotice(summary);
        setStaffSyncEmptyNote(false);
      } else if (Array.isArray(synced) && synced.length === 0) {
        setStaffSyncNotice(null);
        setStaffSyncEmptyNote(true);
      }

      await refreshAfterTransfer();
    } catch (e) {
      const status = e?.response?.status;
      setSubmitError(resolveApiError(e, t, 'admin.residents.transfer.transferFailed'));
      if (status === 404 || status === 400) setShowRouteHint(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell
      title={t('admin.residents.transfer.title')}
      subtitle={t('admin.residents.transfer.subtitle')}
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
        </div>
      </div>

      {listError && <div className="resident-page__error">{listError}</div>}
      {showRouteHint && <p className="resident-page__hint-box">⚠️ {RESIDENT_TRANSFER_ROUTE_HINT}</p>}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('admin.residents.common.colCode')}</th>
              <th>{t('admin.residents.common.colFullName')}</th>
              <th>{t('admin.residents.common.colStatus')}</th>
              <th>{t('admin.residents.transfer.colActions')}</th>
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
                  <td>{getResidencyLabel(t, r.residencyStatus)}</td>
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
                        title={t('admin.residents.transfer.transferRoom')}
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
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        )}
      </div>
      {viewPopup && (
        <div className="modal-overlay" onClick={closeViewPopup}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{t('admin.residents.transfer.detailTitle')}</h2>
            {viewDetail?.fullName && (
              <p className="transfer-page__subtitle" style={{ marginTop: -8, marginBottom: 16 }}>
                {viewDetail.fullName}
                {viewDetail.residentCode ? ` · ${viewDetail.residentCode}` : ''}
              </p>
            )}
            {viewLoading && <div className="empty-state">{t('admin.residents.common.loadingDetail')}</div>}
            {viewError && <p className="form-error">{viewError}</p>}
            {!viewLoading && viewDetail && (
              <>
                <div className="transfer-card">
                  <h3>{t('admin.residents.transfer.personalInfo')}</h3>
                  <div className="transfer-detail-grid">
                    <DetailRow label={t('admin.residents.common.residentCode')} value={viewDetail.residentCode} />
                    <DetailRow
                      label={t('admin.residents.common.colStatus')}
                      value={getResidencyLabel(t, viewDetail.residencyStatus)}
                    />
                    <DetailRow label={t('profile.gender')} value={getGenderLabel(t, viewDetail.gender)} />
                    <DetailRow
                      label={t('admin.residents.common.dateOfBirth')}
                      value={
                        viewDetail.dateOfBirth
                          ? `${formatDateLocale(viewDetail.dateOfBirth, i18n.language)}${viewDetail.age != null ? ` ${t('admin.residents.byArea.ageSuffix', { age: viewDetail.age })}` : ''}`
                          : '—'
                      }
                    />
                    <DetailRow label={t('admin.residents.common.bloodType')} value={viewDetail.bloodType} />
                    <DetailRow
                      label={t('admin.residents.common.admittedAt')}
                      value={formatDateLocale(viewDetail.admittedAt, i18n.language)}
                    />
                  </div>
                </div>
                <div className="transfer-card">
                  <h3>{t('admin.residents.transfer.currentLocation')}</h3>
                  <div className="transfer-detail-grid">
                    <LocationBlock area={viewDetail.area} t={t} />
                  </div>
                </div>
              </>
            )}
            <div className="modal__actions">
              <button type="button" className="btn-cancel" onClick={closeViewPopup}>
                {t('admin.residents.common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
      {editPopup && (
        <div className="modal-overlay" onClick={closeEditPopup}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{t('admin.residents.transfer.modalTitle')}</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>{t('admin.residents.transfer.targetBuilding')}</label>
                <select value={buildingId} onChange={(e) => handleBuildingChange(e.target.value)}>
                  {buildings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name || b.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('admin.residents.transfer.targetFloor')}</label>
                <select value={floorId} onChange={(e) => handleFloorChange(e.target.value)}>
                  {floorsInBuilding.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name || `${t('admin.residents.common.floor')} ${f.floorNumber}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="transfer-card">
              <h3>{t('admin.residents.transfer.currentLocation')}</h3>
              <div className="transfer-detail-grid">
                <LocationBlock assignment={targetsData?.currentAssignment} t={t} />
              </div>
              {currentBedLabel !== '—' && (
                <p className="transfer-page__hint-box" style={{ marginTop: 12, marginBottom: 0 }}>
                  {t('admin.residents.transfer.currentBedHiddenNote', { bed: currentBedLabel })}
                </p>
              )}
            </div>

            {loadError && <p className="form-error">{loadError}</p>}
            {targetLoading && (
              <div className="empty-state">{t('admin.residents.transfer.loadingRooms')}</div>
            )}

            {!targetLoading && (
              <form onSubmit={handleTransfer}>
                {targetsInfo && (
                  <p className="transfer-page__hint-box" style={{ marginBottom: 12 }}>
                    {targetsInfo}
                  </p>
                )}
                <div className="form-grid">
                  <div className="form-group">
                    <label>{t('admin.residents.transfer.colTargetRoom')}</label>
                    <select
                      value={targetRoomId}
                      onChange={(e) => {
                        setTargetRoomId(e.target.value);
                        setTargetBedId('');
                        setSubmitError('');
                      }}
                      disabled={!(targetsData?.targets || []).length}
                    >
                      <option value="">{t('admin.residents.transfer.selectRoom')}</option>
                      {(targetsData?.targets || []).map((room) => (
                        <option key={room._id} value={room._id}>
                          {t('admin.residents.transfer.roomOption', {
                            number: room.roomNumber,
                            count: room.availableBeds.length,
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t('admin.residents.transfer.targetBed')}</label>
                    <select
                      value={targetBedId}
                      onChange={(e) => {
                        setTargetBedId(e.target.value);
                        setSubmitError('');
                      }}
                      disabled={!(targetsData?.targets || []).length}
                    >
                      <option value="">{t('admin.residents.transfer.selectBed')}</option>
                      {(selectedRoom?.availableBeds || []).map((bed) => (
                        <option key={bed._id} value={bed._id}>
                          {bed.bedCode} {bed.bedType ? `(${bed.bedType})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {submitError && <p className="form-error">{submitError}</p>}
                {panelMsg && <p className="form-success">{panelMsg}</p>}
                {staffSyncNotice && (
                  <div className="transfer-staff-sync" role="status">
                    <p className="transfer-staff-sync__title">{staffSyncNotice.title}</p>
                    <ul className="transfer-staff-sync__list">
                      {staffSyncNotice.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <Link className="transfer-staff-sync__link" to={assignmentsPath}>
                      {t('admin.residents.transfer.viewStaffAssignment')}
                    </Link>
                  </div>
                )}
                {staffSyncEmptyNote && !staffSyncNotice && (
                  <div className="transfer-staff-sync" role="status">
                    <p className="transfer-staff-sync__muted">
                      {t('admin.residents.transfer.noStaffSync')}
                    </p>
                  </div>
                )}
                <div className="modal__actions">
                  <button type="button" className="btn-cancel" onClick={closeEditPopup}>
                    {t('admin.residents.common.close')}
                  </button>
                  <button type="submit" className="btn-save" disabled={saving || !(targetsData?.targets || []).length}>
                    {saving ? t('admin.residents.transfer.transferring') : t('admin.residents.transfer.confirmTransfer')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
