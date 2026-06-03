import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePortalPrefix } from '../../../../hooks/usePortalPrefix';
import facilityService from '../../../../services/facility.service';
import residentService, { RESIDENT_TRANSFER_ROUTE_HINT } from '../../../../services/resident.service';
import { formatStaffAreasSyncedSummary } from '../../../../utils/staffAreasSynced';
import { FaEye, FaPen } from 'react-icons/fa';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import '../../../../styles/admin/TransferResidentPage.css';
import '../../../../styles/admin/residentActionIcons.css';
import { GENDER_LABELS, RESIDENCY_LABELS } from '../_shared/residentLabels';

const roomText = (room) => {
  if (!room) return '—';
  return room.roomNumber ? `Phòng ${room.roomNumber}` : room.label || room.name || '—';
};

const bedText = (bed) => {
  if (!bed) return '—';
  return bed.bedCode ? `${bed.bedCode}${bed.bedType ? ` (${bed.bedType})` : ''}` : '—';
};

const buildingText = (building) => {
  if (!building) return '—';
  return building.name || building.code || '—';
};

const floorText = (floor) => {
  if (!floor) return '—';
  return floor.name || (floor.floorNumber != null ? `Tầng ${floor.floorNumber}` : floor.label || '—');
};

const formatDateVi = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
};

function DetailRow({ label, value }) {
  return (
    <div className="transfer-detail-row">
      <span className="transfer-detail-row__label">{label}</span>
      <span className="transfer-detail-row__value">{value ?? '—'}</span>
    </div>
  );
}

function LocationBlock({ assignment, area }) {
  const room = assignment?.room || area?.room;
  const floor = assignment?.floor || area?.floor;
  const building = assignment?.building || area?.building;
  const bed = assignment?.bed || area?.bed;

  return (
  <>
    <DetailRow label="Tòa" value={buildingText(building)} />
    <DetailRow label="Tầng" value={floorText(floor)} />
    <DetailRow label="Phòng" value={roomText(room)} />
    <DetailRow label="Giường" value={bedText(bed)} />
    {room?.roomType && <DetailRow label="Loại phòng" value={room.roomType} />}
  </>
  );
}

export default function TransferResidentPage() {
  const [residents, setResidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
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
  const [targetError, setTargetError] = useState('');

  const [targetRoomId, setTargetRoomId] = useState('');
  const [targetBedId, setTargetBedId] = useState('');
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
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setResidents(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (e) {
      setListError(e.response?.data?.message || 'Không thể tải danh sách cư dân');
      setResidents([]);
    } finally {
      if (!silent) setListLoading(false);
    }
  }, [page, search, statusFilter]);

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

  const loadTargets = useCallback(async () => {
    if (!selectedId || !floorId) {
      setTargetsData(null);
      return;
    }
    setTargetLoading(true);
    setTargetError('');
    try {
      const data = await residentService.getTransferTargets(selectedId, { floorId });
      setTargetsData(data);
      setTargetRoomId('');
      setTargetBedId('');
    } catch (e) {
      const status = e?.response?.status;
      setTargetError(e.response?.data?.message || 'Không thể tải phòng/giường đích');
      setTargetsData(null);
      if (status === 404 || status === 400) setShowRouteHint(true);
    } finally {
      setTargetLoading(false);
    }
  }, [selectedId, floorId]);

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

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

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
      setViewError(e.response?.data?.message || e.message || 'Không tải được thông tin cư dân');
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewPopup = () => {
    setViewPopup(false);
    setViewDetail(null);
    setViewError('');
  };

  const openEditPopup = (resident) => {
    setSelectedId(resident._id);
    clearTransferFeedback();
    setTargetError('');
    setEditPopup(true);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!targetRoomId || !targetBedId) {
      setTargetError('Vui lòng chọn phòng đích và giường đích');
      return;
    }
    setSaving(true);
    setTargetError('');
    clearTransferFeedback();
    try {
      const res = await residentService.transferResidentToRoom(selectedId, {
        targetRoomId,
        targetBedId,
      });
      setPanelMsg(res.message || 'Đã chuyển cư dân sang phòng mới');

      const synced = res.staffAreasSynced;
      const summary = formatStaffAreasSyncedSummary(synced, {
        floors,
        transferTargets: targetsData?.targets || [],
      });
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
      setTargetError(e.response?.data?.message || 'Chuyển phòng thất bại');
      if (status === 404 || status === 400) setShowRouteHint(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell
      title="Chuyển cư dân sang phòng khác"
      subtitle="Admin/Manager chọn cư dân, chọn tầng đích và giường đích để thực hiện chuyển phòng."
    >
      <form className="resident-page__filters" onSubmit={handleSearch}>
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>Tìm kiếm</span>
            <input
              type="text"
              placeholder="Tên hoặc mã cư dân..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          <label className="resident-page__filter">
            <span>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="admitted">Đang điều trị</option>
              <option value="pending">Chờ nhập viện</option>
              <option value="discharged">Đã xuất viện</option>
              <option value="">Tất cả trạng thái</option>
            </select>
          </label>
          <div className="resident-page__filter-actions">
            <button type="submit" className="resident-page__button resident-page__button--primary">
              Áp dụng
            </button>
          </div>
        </div>
      </form>

      {listError && <div className="resident-page__error">{listError}</div>}
      {showRouteHint && <p className="resident-page__hint-box">⚠️ {RESIDENT_TRANSFER_ROUTE_HINT}</p>}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>Mã</th>
              <th>Họ tên</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {listLoading && (
              <tr>
                <td colSpan={4} className="empty-state">
                  Đang tải...
                </td>
              </tr>
            )}
            {!listLoading && residents.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  Không có cư dân nào
                </td>
              </tr>
            )}
            {!listLoading &&
              residents.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.residentCode}</td>
                  <td style={{ fontWeight: 600 }}>{r.fullName}</td>
                  <td>{RESIDENCY_LABELS[r.residencyStatus] || r.residencyStatus || '—'}</td>
                  <td className="resident-action-cell">
                    <div className="resident-action-group">
                      <button
                        type="button"
                        className="resident-icon-btn resident-icon-btn--view"
                        title="Xem chi tiết"
                        onClick={() => openViewPopup(r)}
                      >
                        <FaEye />
                      </button>
                      <button
                        type="button"
                        className="resident-icon-btn resident-icon-btn--edit"
                        title="Chuyển phòng"
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
        {!listLoading && totalPages > 1 && (
          <div className="pagination">
            <span>
              {total} cư dân · Trang {page}/{totalPages}
            </span>
            <div className="pagination__btns">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>
      {viewPopup && (
        <div className="modal-overlay" onClick={closeViewPopup}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Chi tiết cư dân</h2>
            {viewDetail?.fullName && (
              <p className="transfer-page__subtitle" style={{ marginTop: -8, marginBottom: 16 }}>
                {viewDetail.fullName}
                {viewDetail.residentCode ? ` · ${viewDetail.residentCode}` : ''}
              </p>
            )}
            {viewLoading && <div className="empty-state">Đang tải thông tin...</div>}
            {viewError && <p className="form-error">{viewError}</p>}
            {!viewLoading && viewDetail && (
              <>
                <div className="transfer-card">
                  <h3>Thông tin cá nhân</h3>
                  <div className="transfer-detail-grid">
                    <DetailRow label="Mã cư dân" value={viewDetail.residentCode} />
                    <DetailRow
                      label="Trạng thái"
                      value={RESIDENCY_LABELS[viewDetail.residencyStatus] || viewDetail.residencyStatus}
                    />
                    <DetailRow label="Giới tính" value={GENDER_LABELS[viewDetail.gender] || '—'} />
                    <DetailRow
                      label="Ngày sinh"
                      value={
                        viewDetail.dateOfBirth
                          ? `${formatDateVi(viewDetail.dateOfBirth)}${viewDetail.age != null ? ` (${viewDetail.age} tuổi)` : ''}`
                          : '—'
                      }
                    />
                    <DetailRow label="Nhóm máu" value={viewDetail.bloodType} />
                    <DetailRow label="Ngày nhập viện" value={formatDateVi(viewDetail.admittedAt)} />
                  </div>
                </div>
                <div className="transfer-card">
                  <h3>Vị trí hiện tại</h3>
                  <div className="transfer-detail-grid">
                    <LocationBlock area={viewDetail.area} />
                  </div>
                </div>
              </>
            )}
            <div className="modal__actions">
              <button type="button" className="btn-cancel" onClick={closeViewPopup}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {editPopup && (
        <div className="modal-overlay" onClick={() => setEditPopup(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Chuyển cư dân sang phòng khác</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Tòa đích</label>
                <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
                  {buildings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name || b.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tầng đích</label>
                <select value={floorId} onChange={(e) => setFloorId(e.target.value)}>
                  {floorsInBuilding.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name || `Tầng ${f.floorNumber}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {targetLoading ? (
              <div className="empty-state">Đang tải danh sách phòng/giường...</div>
            ) : targetError ? (
              <div className="empty-state">{targetError}</div>
            ) : (
              <>
                <div className="transfer-card">
                  <h3>Vị trí hiện tại</h3>
                  <div className="transfer-detail-grid">
                    <LocationBlock assignment={targetsData?.currentAssignment} />
                  </div>
                </div>
                <form onSubmit={handleTransfer}>
                  {(targetsData?.targets || []).length === 0 && (
                    <p className="form-error" style={{ marginBottom: 12 }}>
                      {targetsData?.message ||
                        'Không có phòng/giường trống trên tầng đã chọn. Chọn tầng khác hoặc giải phóng giường trước.'}
                    </p>
                  )}
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Phòng đích</label>
                      <select
                        value={targetRoomId}
                        onChange={(e) => {
                          setTargetRoomId(e.target.value);
                          setTargetBedId('');
                        }}
                      >
                        <option value="">-- Chọn phòng --</option>
                        {(targetsData?.targets || []).map((room) => (
                          <option key={room._id} value={room._id}>
                            Phòng {room.roomNumber} - {room.availableBeds.length} giường trống
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Giường đích</label>
                      <select value={targetBedId} onChange={(e) => setTargetBedId(e.target.value)}>
                        <option value="">-- Chọn giường --</option>
                        {(selectedRoom?.availableBeds || []).map((bed) => (
                          <option key={bed._id} value={bed._id}>
                            {bed.bedCode} {bed.bedType ? `(${bed.bedType})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
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
                        Xem phân công nhân viên
                      </Link>
                    </div>
                  )}
                  {staffSyncEmptyNote && !staffSyncNotice && (
                    <div className="transfer-staff-sync" role="status">
                      <p className="transfer-staff-sync__muted">
                        Không có nhân viên nào được gán cư dân này — không cần đồng bộ khu vực
                        phụ trách.
                      </p>
                    </div>
                  )}
                  <div className="modal__actions">
                    <button type="button" className="btn-cancel" onClick={() => setEditPopup(false)}>
                      Đóng
                    </button>
                    <button type="submit" className="btn-save" disabled={saving || !(targetsData?.targets || []).length}>
                      {saving ? 'Đang chuyển...' : 'Xác nhận chuyển phòng'}
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
