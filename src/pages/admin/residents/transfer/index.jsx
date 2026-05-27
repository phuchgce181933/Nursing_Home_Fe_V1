import { useCallback, useEffect, useMemo, useState } from 'react';
import facilityService from '../../../../services/facility.service';
import residentService, { RESIDENT_TRANSFER_ROUTE_HINT } from '../../../../services/resident.service';
import { FaEye, FaPen } from 'react-icons/fa';
import '../../../../styles/admin/TransferResidentPage.css';
import '../../../../styles/admin/residentActionIcons.css';
import { RESIDENCY_LABELS } from '../_shared/residentLabels';

const roomText = (room) => {
  if (!room) return '—';
  return room.roomNumber ? `Phòng ${room.roomNumber}` : room.label || '—';
};

const bedText = (bed) => {
  if (!bed) return '—';
  return bed.bedCode ? `${bed.bedCode}${bed.bedType ? ` (${bed.bedType})` : ''}` : '—';
};

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
  const [showRouteHint, setShowRouteHint] = useState(false);
  const [viewPopup, setViewPopup] = useState(false);
  const [editPopup, setEditPopup] = useState(false);

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

  const openViewPopup = (resident) => {
    setSelectedId(resident._id);
    setPanelMsg('');
    setTargetError('');
    setViewPopup(true);
  };

  const openEditPopup = (resident) => {
    setSelectedId(resident._id);
    setPanelMsg('');
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
    setPanelMsg('');
    try {
      const res = await residentService.transferResidentToRoom(selectedId, {
        targetRoomId,
        targetBedId,
      });
      setPanelMsg(res.message || 'Đã chuyển cư dân sang phòng mới');
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
    <div className="transfer-page">
      <div className="transfer-page__header">
        <h1 className="transfer-page__title">Chuyển cư dân sang phòng khác</h1>
        <p className="transfer-page__subtitle">
          Admin/Manager chọn cư dân, chọn tầng đích và giường đích để thực hiện chuyển phòng.
        </p>
      </div>

      <form className="transfer-toolbar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Tìm theo tên hoặc mã cư dân..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
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
        <button type="submit" className="btn btn--primary">
          Tìm kiếm
        </button>
      </form>

      {listError && <p className="form-error">{listError}</p>}
      {showRouteHint && <p className="transfer-route-hint">⚠️ {RESIDENT_TRANSFER_ROUTE_HINT}</p>}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
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
        <div className="modal-overlay" onClick={() => setViewPopup(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Chi tiết vị trí cư dân</h2>
            {targetLoading ? (
              <div className="empty-state">Đang tải thông tin...</div>
            ) : targetError ? (
              <div className="empty-state">{targetError}</div>
            ) : (
              <div className="transfer-card">
                <h3>Vị trí hiện tại</h3>
                <p>
                  <strong>Phòng:</strong> {roomText(targetsData?.currentAssignment?.room)}
                </p>
                <p>
                  <strong>Giường:</strong> {bedText(targetsData?.currentAssignment?.bed)}
                </p>
              </div>
            )}
            <div className="modal__actions">
              <button type="button" className="btn-cancel" onClick={() => setViewPopup(false)}>
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
                  <p>
                    <strong>Phòng:</strong> {roomText(targetsData?.currentAssignment?.room)}
                  </p>
                  <p>
                    <strong>Giường:</strong> {bedText(targetsData?.currentAssignment?.bed)}
                  </p>
                </div>
                <form onSubmit={handleTransfer}>
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
                  <div className="modal__actions">
                    <button type="button" className="btn-cancel" onClick={() => setEditPopup(false)}>
                      Đóng
                    </button>
                    <button type="submit" className="btn-save" disabled={saving}>
                      {saving ? 'Đang chuyển...' : 'Xác nhận chuyển phòng'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
