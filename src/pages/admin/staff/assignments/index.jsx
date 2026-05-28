import { useCallback, useEffect, useMemo, useState } from 'react';
import staffService from '../../../../services/staff.service';
import careTaskService from '../../../../services/careTask.service';
import facilityService from '../../../../services/facility.service';
import { floorLabel, roomLabel } from '../../../../components/facility/FloorRoomSelect';
import { canAssignAreas, canAssignResidents } from '../../../../utils/staffAssignable';
import { isStaffOnLeaveForAssignment } from '../../../../utils/leaveUtils';
import '../../../../styles/admin/StaffAssignmentPage.css';

const ROLE_LABELS = { doctor: 'Bác sĩ', nurse: 'Y tá', staff: 'Chăm sóc viên', manager: 'Quản lý', admin: 'Admin' };

const TASK_TYPES = [
  { value: 'morning_care',      label: 'Chăm sóc buổi sáng' },
  { value: 'medication',        label: 'Dùng thuốc' },
  { value: 'physical_therapy',  label: 'Vật lý trị liệu' },
  { value: 'meal_assistance',   label: 'Hỗ trợ bữa ăn' },
  { value: 'evening_check',     label: 'Kiểm tra buổi tối' },
  { value: 'emergency_response', label: 'Phản ứng khẩn cấp' },
];
const CARE_LEVELS = [
  { value: 'low',    label: '🟢 Thấp' },
  { value: 'medium', label: '🟠 Trung bình' },
  { value: 'high',   label: '🔴 Cao' },
];
const COVERAGE_CONFIG = {
  fullyStaffed: { label: '🟢 Đủ nhân viên',   cls: 'coverage--full' },
  understaffed: { label: '🟠 Thiếu nhân viên', cls: 'coverage--under' },
  noCoverage:   { label: '🔴 Không có phủ sóng', cls: 'coverage--none' },
};

const today = () => new Date().toISOString().slice(0, 10);

const SHIFT_STATUS_VI = { published: 'Đã đăng', confirmed: 'Đã xác nhận' };

function formatDateVi(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function NonAssignableBadge() {
  return <span className="shift-badge shift-badge--muted">Không phân công</span>;
}

/** Badge ca trong ngày (từ shiftSummary trên GET /api/staff?assignmentDate=) */
function ShiftSummaryBadge({ summary, assignable = true }) {
  if (!assignable) return <NonAssignableBadge />;
  if (!summary) return <span className="shift-badge shift-badge--muted">—</span>;
  if (summary.onLeave) return <span className="shift-badge shift-badge--leave">Nghỉ phép</span>;
  if (summary.hasShiftOnDate) {
    return (
      <span className="shift-badge shift-badge--on" title={summary.shiftTimeLabel}>
        {summary.shiftTimeLabel || 'Có ca'}
      </span>
    );
  }
  return <span className="shift-badge shift-badge--off">Không có ca</span>;
}

/** Chi tiết ca trong panel phải — dùng shiftSummary.shiftsOnDate */
function ShiftDetailPanel({ summary, assignmentDate }) {
  if (!summary) return null;
  const dateLabel = assignmentDate || summary.assignmentDate;
  return (
    <div className="shift-detail-panel">
      <div className="shift-detail-panel__title">Ca làm việc — {formatDateVi(dateLabel)}</div>
      {summary.onLeave && (
        <p className="shift-detail-panel__hint shift-detail-panel__hint--warn">
          Nhân viên có đơn nghỉ phép đã duyệt trong ngày này.
        </p>
      )}
      {!summary.onLeave && summary.shiftsOnDate?.length > 0 ? (
        <ul className="shift-detail-panel__list">
          {summary.shiftsOnDate.map((sh) => (
            <li key={sh._id} className="shift-detail-panel__item">
              <span className="shift-detail-panel__name">{sh.name}</span>
              <span className="shift-detail-panel__time">{sh.startTime} – {sh.endTime}</span>
              <span className={`shift-status-tag shift-status-tag--${sh.status}`}>
                {SHIFT_STATUS_VI[sh.status] || sh.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        !summary.onLeave && (
          <p className="shift-detail-panel__hint">Chưa có ca đã đăng hoặc đã xác nhận trong ngày này.</p>
        )
      )}
    </div>
  );
}

// ── Alert helper ──────────────────────────────────────────────────────────────
function Alert({ type, msg }) {
  if (!msg) return null;
  const styles = {
    success: { background: '#dcfce7', border: '1px solid #86efac', color: '#15803d' },
    error:   { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' },
    warning: { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' },
  };
  return (
    <div style={{ ...styles[type], borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontSize: '0.875rem' }}>
      {msg}
    </div>
  );
}

// ── Tab 1: Area Assignment ────────────────────────────────────────────────────
function AreaTab({ staff, loading, assignmentDate, onStaffUpdated }) {
  const [selected, setSelected]         = useState(null);
  const [selectedFloorIds, setSelectedFloorIds] = useState([]);
  const [selectedRoomIds, setSelectedRoomIds]   = useState([]);
  const [floors, setFloors]             = useState([]);
  const [rooms, setRooms]               = useState([]);
  const [loadingFloors, setLoadingFloors] = useState(true);
  const [loadingRooms, setLoadingRooms]   = useState(false);
  const [saving, setSaving]               = useState(false);
  const [success, setSuccess]           = useState('');
  const [error, setError]               = useState('');
  const [infos, setInfos]               = useState([]);
  const [coverage, setCoverage]         = useState(null);

  const floorLabelMap = useMemo(
    () => Object.fromEntries(floors.map((f) => [f._id, floorLabel(f)])),
    [floors]
  );

  useEffect(() => {
    facilityService
      .listFloors({ activeOnly: true })
      .then((data) => setFloors(Array.isArray(data) ? data : []))
      .catch(() => setFloors([]))
      .finally(() => setLoadingFloors(false));
  }, []);

  useEffect(() => {
    if (!selectedFloorIds.length) {
      setRooms([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingRooms(true);
    Promise.all(selectedFloorIds.map((id) => facilityService.listRoomsByFloor(id)))
      .then((results) => {
        if (cancelled) return;
        setRooms(results.flat());
      })
      .catch(() => {
        if (!cancelled) setRooms([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRooms(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFloorIds]);

  const resolveAreaLabel = (area) => {
    if (typeof area === 'object' && area !== null) {
      return floorLabel(area);
    }
    return floorLabelMap[area] || area;
  };

  const toggleFloor = (id) => {
    setSelectedFloorIds((prev) => {
      const removing = prev.includes(id);
      const next = removing ? prev.filter((x) => x !== id) : [...prev, id];
      if (removing) {
        setSelectedRoomIds((roomPrev) =>
          roomPrev.filter((rid) => {
            const room = rooms.find((r) => r._id === rid);
            return !room || String(room.floorId) !== String(id);
          })
        );
      }
      return next;
    });
  };

  const toggleRoom = (id) => {
    setSelectedRoomIds((prev) =>
      (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    );
  };

  useEffect(() => {
    setSelected(null);
    setCoverage(null);
  }, [assignmentDate]);

  const handleSelect = (s) => {
    if (!canAssignAreas(s) || isStaffOnLeaveForAssignment(s)) return;
    setSelected(s);
    setSuccess('');
    setError('');
    setInfos([]);
    setCoverage(null);
    const floorIds = (s.staffProfile?.responsibleAreaIds || []).map((f) =>
      (typeof f === 'object' ? f._id : f).toString()
    );
    const roomIds = (s.staffProfile?.responsibleRoomIds || []).map((r) =>
      (typeof r === 'object' ? r._id : r).toString()
    );
    setSelectedFloorIds(floorIds);
    setSelectedRoomIds(roomIds);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    setSuccess('');
    setInfos([]);
    try {
      const res = await staffService.assignAreas(selected._id, {
        floorIds: selectedFloorIds,
        roomIds: selectedRoomIds,
      });
      setSuccess('Đã cập nhật khu vực phụ trách (master data)!');
      const hints = res.info || res.warnings || [];
      if (hints.length) setInfos(hints);
      if (selectedFloorIds[0]) {
        const cov = await staffService.getAreaCoverageStatus(selectedFloorIds[0]);
        setCoverage(cov);
      }
      onStaffUpdated?.();
    } catch (e) {
      setError(e.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Staff list */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Nhân viên</th><th>Vai trò</th><th>Ca trong ngày</th><th>Tầng phụ trách</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="empty-state">Đang tải...</td></tr>}
            {!loading && staff.length === 0 && <tr><td colSpan={5} className="empty-state">Không có nhân viên</td></tr>}
            {!loading && staff.map((s) => {
              const areas = s.staffProfile?.responsibleAreaIds || [];
              return (
                <tr key={s._id} style={{ background: selected?._id === s._id ? '#eff6ff' : undefined }}>
                  <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                  <td>{ROLE_LABELS[s.role] || s.role}</td>
                  <td>
                    <ShiftSummaryBadge summary={s.shiftSummary} assignable={canAssignAreas(s)} />
                  </td>
                  <td>
                    {areas.length
                      ? areas.map((a) => (
                          <span key={typeof a === 'object' ? a._id : a} className="area-badge" style={{ marginRight: 4 }}>
                            {resolveAreaLabel(a)}
                          </span>
                        ))
                      : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Chưa phân công</span>}
                  </td>
                  <td>
                    {canAssignAreas(s) ? (
                      isStaffOnLeaveForAssignment(s) ? (
                        <span className="shift-badge shift-badge--leave">Nghỉ phép</span>
                      ) : (
                        <button
                          className="btn btn--sm btn--edit"
                          onClick={() => handleSelect(s)}
                          disabled={!s.staffProfile}
                          title={!s.staffProfile ? 'Chưa có hồ sơ nhân viên' : undefined}
                        >
                          Chọn
                        </button>
                      )
                    ) : (
                      <NonAssignableBadge />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit panel */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        {!selected ? (
          <div className="empty-state">Chọn nhân viên để phân công khu vực</div>
        ) : !canAssignAreas(selected) ? (
          <div className="empty-state empty-state--warn">
            Tài khoản Admin hoặc Quản lý không được phân công khu vực, ca làm hoặc nhiệm vụ chăm sóc.
          </div>
        ) : !selected.staffProfile ? (
          <div className="empty-state empty-state--warn">Nhân viên chưa có hồ sơ — không thể phân công khu vực.</div>
        ) : isStaffOnLeaveForAssignment(selected) ? (
          <div className="empty-state empty-state--warn">
            Nhân viên có đơn nghỉ phép đã duyệt trong ngày phân công — không thể phân công khu vực.
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 14 }}>
              Phân công khu vực — <span style={{ color: '#3b82f6' }}>{selected.fullName}</span>
            </div>
            <Alert type="success" msg={success} />
            <Alert type="error"   msg={error} />
            {infos.map((msg, i) => <Alert key={i} type="warning" msg={`ℹ️ ${msg}`} />)}

            <ShiftDetailPanel summary={selected.shiftSummary} assignmentDate={assignmentDate} />

            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12, lineHeight: 1.45 }}>
              Tầng/phòng lưu cố định trên hồ sơ nhân viên (master data). Ca làm việc theo ngày xem ở trên — phân công ca tại mục Quản lý ca làm việc.
            </p>

            {coverage && (
              <div className={`coverage-badge ${COVERAGE_CONFIG[coverage.coverage]?.cls || ''}`} style={{ marginBottom: 12 }}>
                {COVERAGE_CONFIG[coverage.coverage]?.label} — {coverage.activeToday}/{coverage.totalAssigned} nhân viên hoạt động hôm nay
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Tầng / Khu vực phụ trách</label>
              {loadingFloors ? (
                <p className="field-hint">Đang tải danh sách tầng...</p>
              ) : (
                <div className="area-multi-select">
                  {floors.length === 0 && <p className="field-hint">Chưa có tầng trong hệ thống</p>}
                  {floors.map((f) => (
                    <label key={f._id} className="area-multi-select__item">
                      <input
                        type="checkbox"
                        checked={selectedFloorIds.includes(f._id)}
                        onChange={() => toggleFloor(f._id)}
                      />
                      <span>{floorLabel(f)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Phòng phụ trách (tùy chọn)</label>
              {!selectedFloorIds.length ? (
                <p className="field-hint">Chọn ít nhất một tầng để xem phòng</p>
              ) : loadingRooms ? (
                <p className="field-hint">Đang tải phòng...</p>
              ) : (
                <div className="area-multi-select">
                  {rooms.length === 0 && <p className="field-hint">Không có phòng trên các tầng đã chọn</p>}
                  {rooms.map((r) => (
                    <label key={r._id} className="area-multi-select__item">
                      <input
                        type="checkbox"
                        checked={selectedRoomIds.includes(r._id)}
                        onChange={() => toggleRoom(r._id)}
                      />
                      <span>{roomLabel(r)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu phân công khu vực'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function residentPickerLabel(r) {
  const room = r.roomId;
  const roomNum = typeof room === 'object' ? room?.roomNumber : '';
  const code = r.residentCode ? ` (${r.residentCode})` : '';
  return `${r.fullName || 'Cư dân'}${code}${roomNum ? ` · P.${roomNum}` : ''}`;
}

// ── Tab 2: Resident Assignment ────────────────────────────────────────────────
function ResidentTab({ staff, loading, assignmentDate, onStaffUpdated }) {
  const [selected, setSelected]           = useState(null);
  const [selectedResidentIds, setSelectedResidentIds] = useState([]);
  const [residentOptions, setResidentOptions] = useState([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [residentHint, setResidentHint]   = useState('');
  const [residentFilterMode, setResidentFilterMode] = useState(null);
  const [residentSearch, setResidentSearch] = useState('');
  const [saving, setSaving]               = useState(false);
  const [success, setSuccess]             = useState('');
  const [error, setError]                 = useState('');

  useEffect(() => {
    setSelected(null);
    setResidentOptions([]);
    setSelectedResidentIds([]);
  }, [assignmentDate]);

  const areaScopeKey = useMemo(() => {
    if (!selected?._id) return '';
    const p = staff.find((s) => s._id === selected._id)?.staffProfile || selected.staffProfile;
    if (!p) return '';
    const rooms = (p.responsibleRoomIds || []).map((r) => String(r._id || r)).sort().join(',');
    const floors = (p.responsibleAreaIds || []).map((f) => String(f._id || f)).sort().join(',');
    if (!rooms && !floors) return '_none_';
    return `${rooms}|${floors}`;
  }, [selected?._id, staff]);

  const loadResidentsForStaff = async (member) => {
    if (!member?._id) return;
    if (!member.staffProfile) {
      setResidentOptions([]);
      setResidentFilterMode(null);
      setResidentHint('Nhân viên chưa có hồ sơ — không thể phân công cư dân.');
      return;
    }

    setLoadingResidents(true);
    setResidentHint('');
    setResidentFilterMode(null);
    try {
      const res = await staffService.listResidentsAvailable(member._id, {
        status: 'admitted',
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setResidentFilterMode(res.filterMode || null);
      setResidentOptions(
        [...list].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'vi'))
      );
      if (res.message) {
        setResidentHint(res.message);
      } else if (!list.length) {
        setResidentHint(
          res.filterMode === 'rooms'
            ? 'Không có cư dân trong các phòng phụ trách đã chọn.'
            : 'Không có cư dân trên tầng phụ trách.'
        );
      }
    } catch (e) {
      setResidentOptions([]);
      setResidentFilterMode(null);
      setResidentHint(e.response?.data?.message || 'Không tải được danh sách cư dân');
    } finally {
      setLoadingResidents(false);
    }
  };

  const handleSelect = (s) => {
    if (!canAssignResidents(s) || isStaffOnLeaveForAssignment(s)) return;
    setSelected(s);
    setSuccess('');
    setError('');
    const ids = (s.staffProfile?.assignedResidentIds || []).map((r) =>
      (typeof r === 'object' ? r._id : r).toString()
    );
    setSelectedResidentIds(ids);
    setResidentSearch('');
  };

  useEffect(() => {
    if (!selected?._id) return;
    const fresh = staff.find((s) => s._id === selected._id) || selected;
    loadResidentsForStaff(fresh);
  }, [selected?._id, areaScopeKey]);

  const toggleResident = (id) => {
    const sid = String(id);
    setSelectedResidentIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );
  };

  const filteredResidents = useMemo(() => {
    const q = residentSearch.trim().toLowerCase();
    if (!q) return residentOptions;
    return residentOptions.filter((r) => {
      const name = (r.fullName || '').toLowerCase();
      const code = (r.residentCode || '').toLowerCase();
      const room = r.roomId?.roomNumber?.toLowerCase?.() || '';
      return name.includes(q) || code.includes(q) || room.includes(q);
    });
  }, [residentOptions, residentSearch]);

  const handleSave = async () => {
    if (!selected) return;
    if (!selected.staffProfile) {
      setError('Nhân viên chưa có hồ sơ — không thể phân công cư dân.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await staffService.assignResidents(selected._id, {
        residentIds: selectedResidentIds,
      });
      setSuccess('Đã cập nhật danh sách cư dân phụ trách!');
      onStaffUpdated?.();
    } catch (e) {
      setError(e.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Nhân viên</th><th>Vai trò</th><th>Ca trong ngày</th><th>Cư dân đang chăm sóc</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="empty-state">Đang tải...</td></tr>}
            {!loading && staff.length === 0 && (
              <tr><td colSpan={5} className="empty-state">Không có nhân viên</td></tr>
            )}
            {!loading && staff.map((s) => {
              const residents = s.staffProfile?.assignedResidentIds || [];
              return (
                <tr key={s._id} style={{ background: selected?._id === s._id ? '#eff6ff' : undefined }}>
                  <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                  <td>{ROLE_LABELS[s.role] || s.role}</td>
                  <td>
                    <ShiftSummaryBadge summary={s.shiftSummary} assignable={canAssignResidents(s)} />
                  </td>
                  <td>
                    {residents.length
                      ? <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{residents.length} cư dân</span>
                      : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Chưa giao</span>}
                  </td>
                  <td>
                    {canAssignResidents(s) ? (
                      isStaffOnLeaveForAssignment(s) ? (
                        <span className="shift-badge shift-badge--leave">Nghỉ phép</span>
                      ) : (
                        <button
                          className="btn btn--sm btn--edit"
                          onClick={() => handleSelect(s)}
                          disabled={!s.staffProfile}
                          title={!s.staffProfile ? 'Chưa có hồ sơ nhân viên' : undefined}
                        >
                          Chọn
                        </button>
                      )
                    ) : (
                      <NonAssignableBadge />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        {!selected ? (
          <div className="empty-state">Chọn nhân viên để phân công cư dân phụ trách</div>
        ) : !canAssignResidents(selected) ? (
          <div className="empty-state empty-state--warn">
            Tài khoản Admin hoặc Quản lý không được phân công cư dân.
          </div>
        ) : !selected.staffProfile ? (
          <div className="empty-state empty-state--warn">Nhân viên chưa có hồ sơ — không thể phân công cư dân.</div>
        ) : isStaffOnLeaveForAssignment(selected) ? (
          <div className="empty-state empty-state--warn">
            Nhân viên có đơn nghỉ phép đã duyệt trong ngày phân công — không thể phân công cư dân.
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 14 }}>
              Cư dân phụ trách — <span style={{ color: '#3b82f6' }}>{selected.fullName}</span>
            </div>
            <Alert type="success" msg={success} />
            <Alert type="error"   msg={error} />
            <ShiftDetailPanel summary={selected.shiftSummary} assignmentDate={assignmentDate} />

            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12, lineHeight: 1.45 }}>
              {residentFilterMode === 'rooms'
                ? 'Chỉ hiển thị cư dân trong các phòng phụ trách đã chọn (không lấy cả tầng).'
                : residentFilterMode === 'floors'
                  ? 'Hiển thị cư dân trên tầng phụ trách (chưa chọn phòng cụ thể).'
                  : 'Phân công khu vực/phòng trước khi giao cư dân.'}
              {' '}Bỏ chọn tất cả và lưu để xóa phân công.
            </p>

            {residentHint && (
              <p className="field-hint field-hint--warn" style={{ marginBottom: 10 }}>{residentHint}</p>
            )}

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Tìm cư dân</label>
              <input
                type="search"
                value={residentSearch}
                onChange={(e) => setResidentSearch(e.target.value)}
                placeholder="Tên, mã hoặc số phòng..."
                disabled={loadingResidents || !residentOptions.length}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>
                Chọn cư dân ({selectedResidentIds.length} đã chọn)
              </label>
              {loadingResidents ? (
                <p className="field-hint">Đang tải danh sách cư dân...</p>
              ) : (
                <div className="area-multi-select resident-picker">
                  {filteredResidents.length === 0 && !residentHint && (
                    <p className="field-hint">Không có cư dân phù hợp</p>
                  )}
                  {filteredResidents.map((r) => (
                    <label key={r._id} className="area-multi-select__item">
                      <input
                        type="checkbox"
                        checked={selectedResidentIds.includes(String(r._id))}
                        onChange={() => toggleResident(r._id)}
                      />
                      <span>{residentPickerLabel(r)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              className="btn btn--primary"
              onClick={handleSave}
              disabled={saving || loadingResidents}
            >
              {saving ? 'Đang lưu...' : 'Lưu danh sách cư dân'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab 3: Care Tasks (bước 3 — sau khu vực + cư dân) ───────────────────────
const TASK_STATUS_LABELS = { pending: 'Chờ', in_progress: 'Đang làm', completed: 'Hoàn thành', skipped: 'Bỏ qua' };
const TASK_STATUS_NEXT   = { pending: ['in_progress', 'skipped'], in_progress: ['completed', 'skipped'] };

const toMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const isTimeWithinShift = (timeValue, shift) => {
  const t = toMinutes(timeValue);
  const start = toMinutes(shift?.startTime);
  const end = toMinutes(shift?.endTime);
  if (t === null || start === null || end === null) return false;
  if (end <= start) return t >= start || t <= end; // overnight shift
  return t >= start && t <= end;
};

const emptyTaskForm = (workDate) => ({
  staffProfileId: '',
  shiftId: '',
  residentId: '',
  taskType: 'morning_care',
  careLevel: 'low',
  workDate,
  scheduledTime: '',
  notes: '',
});

function careResidentOptionLabel(r) {
  return residentPickerLabel(r);
}

function CareTaskTab({ assignmentDate, staff }) {
  const [tasks, setTasks]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [filterDate, setFilterDate]     = useState(assignmentDate);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(emptyTaskForm(assignmentDate));
  const [saveError, setSaveErr]         = useState('');
  const [saving, setSaving]             = useState(false);
  const [ctx, setCtx]                   = useState(null);
  const [ctxLoading, setCtxLoading]     = useState(false);
  const [assignedResidents, setAssignedResidents] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [residentHint, setResidentHint] = useState('');

  useEffect(() => {
    setFilterDate(assignmentDate);
    setForm((prev) => ({ ...prev, workDate: assignmentDate }));
  }, [assignmentDate]);

  const taskTypeOptions = ctx?.taskTypes?.length
    ? ctx.taskTypes
    : TASK_TYPES.map((t) => ({ value: t.value, labelVi: t.label }));
  const careLevelOptions = ctx?.careLevels?.length
    ? ctx.careLevels
    : CARE_LEVELS.map((l) => ({
        value: l.value,
        labelVi: l.label.replace(/^[^\s]+\s/, ''),
      }));

  const staffWithShifts = ctx?.staffWithShifts ?? [];

  const onLeaveByUserId = useMemo(
    () => Object.fromEntries(staff.map((s) => [String(s._id), isStaffOnLeaveForAssignment(s)])),
    [staff]
  );

  const staffWithShiftsAvailable = useMemo(
    () => staffWithShifts.filter((s) => !onLeaveByUserId[String(s.userId)]),
    [staffWithShifts, onLeaveByUserId]
  );

  const selectedStaffEntry = useMemo(
    () =>
      staffWithShiftsAvailable.find(
        (s) => String(s.staffProfileId) === String(form.staffProfileId)
      ) || null,
    [staffWithShiftsAvailable, form.staffProfileId]
  );

  const shiftOptions = selectedStaffEntry?.shiftsOnDate ?? [];
  const selectedShift =
    shiftOptions.find((s) => String(s._id) === String(form.shiftId))
    || shiftOptions[0]
    || null;

  const taskTypeLabel = (value) =>
    taskTypeOptions.find((t) => t.value === value)?.labelVi
    || TASK_TYPES.find((t) => t.value === value)?.label
    || value;

  const careLevelLabel = (value) =>
    careLevelOptions.find((l) => l.value === value)?.labelVi
    || CARE_LEVELS.find((l) => l.value === value)?.label
    || value;

  const loadContext = async (workDate) => {
    setCtxLoading(true);
    try {
      const data = await careTaskService.getAssignmentContext(workDate);
      setCtx(data);
      return data;
    } catch (e) {
      setCtx(null);
      setSaveErr(e.response?.data?.message || 'Không tải được dữ liệu form');
      return null;
    } finally {
      setCtxLoading(false);
    }
  };

  const loadAssignedResidents = async (userId) => {
    if (!userId) {
      setAssignedResidents([]);
      setResidentHint('');
      return;
    }
    setResidentsLoading(true);
    setResidentHint('');
    try {
      const res = await staffService.listAssignedResidents(userId);
      const list = Array.isArray(res.data) ? res.data : [];
      setAssignedResidents(list);
      if (res.message) {
        setResidentHint(res.message);
      } else if (!list.length) {
        setResidentHint('Chưa có cư dân phụ trách — hoàn thành bước 2 trước.');
      }
    } catch (e) {
      setAssignedResidents([]);
      setResidentHint(e.response?.data?.message || 'Không tải được danh sách cư dân');
    } finally {
      setResidentsLoading(false);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await careTaskService.listCareTasks({ workDate: filterDate });
      const raw = res.data ?? res;
      setTasks(Array.isArray(raw) ? raw : []);
    } catch (e) {
      setError(e.response?.data?.message || 'Tải thất bại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [filterDate]);

  useEffect(() => {
    if (showForm && form.workDate === assignmentDate) {
      loadContext(assignmentDate);
    }
  }, [showForm, assignmentDate]);

  const handleOpenForm = () => {
    setForm(emptyTaskForm(assignmentDate));
    setSaveErr('');
    setAssignedResidents([]);
    setResidentHint('');
    setShowForm(true);
  };

  const handleStaffChange = (profileId) => {
    const entry = staffWithShiftsAvailable.find((s) => String(s.staffProfileId) === String(profileId));
    setForm((prev) => ({
      ...prev,
      staffProfileId: profileId,
      shiftId: entry?.shiftsOnDate?.[0]?._id?.toString() || '',
      residentId: '',
    }));
    loadAssignedResidents(entry?.userId);
  };

  const handleCreate = async () => {
    setSaveErr('');
    if (selectedStaffEntry && onLeaveByUserId[String(selectedStaffEntry.userId)]) {
      setSaveErr('Nhân viên đang nghỉ phép trong ngày này — không thể giao nhiệm vụ.');
      return;
    }
    const scheduledTimeTrimmed = form.scheduledTime?.trim();
    if (scheduledTimeTrimmed && selectedShift && !isTimeWithinShift(scheduledTimeTrimmed, selectedShift)) {
      setSaveErr(
        `Giờ dự kiến phải nằm trong khung ca ${selectedShift.startTime} - ${selectedShift.endTime}.`
      );
      return;
    }
    setSaving(true);
    try {
      const payload = {
        staffProfileId: form.staffProfileId,
        residentId: form.residentId,
        taskType: form.taskType,
        careLevel: form.careLevel,
        workDate: form.workDate,
        scheduledTime: scheduledTimeTrimmed || undefined,
        notes: form.notes || undefined,
      };
      if (form.shiftId) payload.shiftId = form.shiftId;
      await careTaskService.createCareTask(payload);
      setShowForm(false);
      loadTasks();
    } catch (e) {
      setSaveErr(e.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await careTaskService.updateCareTaskStatus(id, status);
      loadTasks();
    } catch (e) {
      alert(e.response?.data?.message || 'Thất bại');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa nhiệm vụ này?')) return;
    try {
      await careTaskService.deleteCareTask(id);
      loadTasks();
    } catch (e) {
      alert(e.response?.data?.message || 'Thất bại');
    }
  };

  const staffOnShiftHint =
    form.workDate !== assignmentDate
      ? 'Đổi ngày phân công ở thanh trên để giao nhiệm vụ.'
      : ctxLoading
        ? ''
        : !showForm
          ? ''
          : staffWithShiftsAvailable.length === 0
            ? staffWithShifts.length > 0
              ? 'Tất cả nhân viên có ca trong ngày đều đang nghỉ phép — không thể giao nhiệm vụ.'
              : 'Không có nhân viên có ca đã đăng/xác nhận trong ngày này. Phân công ca trước.'
            : '';

  return (
    <div>
      <p className="assignment-steps-hint">
        Quy trình 3 bước: <strong>1. Khu vực phụ trách</strong> →{' '}
        <strong>2. Cư dân phụ trách</strong> → <strong>3. Nhiệm vụ chăm sóc</strong> (tab này).
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Xem ngày:</label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }}
        />
        <button className="btn btn--primary" onClick={handleOpenForm}>+ Giao nhiệm vụ</button>
      </div>

      {error && <Alert type="error" msg={error} />}

      {showForm && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Giao nhiệm vụ chăm sóc mới</div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12 }}>
            Nhân viên phải có ca đã đăng/xác nhận và cư dân đã được giao ở bước 2.
          </p>
          {saveError && <Alert type="error" msg={saveError} />}
          <div className="form-grid">
            <div className="form-group">
              <label>Ngày thực hiện *</label>
              <input type="date" value={form.workDate} readOnly />
              <small className="field-hint">Theo ngày phân công ở thanh trên.</small>
            </div>

            <div className="form-group">
              <label>Nhân viên có ca *</label>
              {ctxLoading ? (
                <p className="field-hint">Đang tải danh sách nhân viên...</p>
              ) : (
                <select
                  value={form.staffProfileId}
                  onChange={(e) => handleStaffChange(e.target.value)}
                  disabled={staffWithShiftsAvailable.length === 0}
                >
                  <option value="">— Chọn nhân viên —</option>
                  {staffWithShiftsAvailable.map((s) => (
                    <option key={s.staffProfileId} value={s.staffProfileId}>
                      {s.fullName} ({ROLE_LABELS[s.role] || s.role}) · {s.shiftTimeLabel}
                    </option>
                  ))}
                </select>
              )}
              {staffOnShiftHint && (
                <small className="field-hint field-hint--warn">{staffOnShiftHint}</small>
              )}
            </div>

            {shiftOptions.length > 1 && (
              <div className="form-group">
                <label>Ca làm việc</label>
                <select
                  value={form.shiftId}
                  onChange={(e) => setForm((p) => ({ ...p, shiftId: e.target.value }))}
                >
                  {shiftOptions.map((sh) => (
                    <option key={sh._id} value={sh._id}>
                      {sh.name} · {sh.startTime} – {sh.endTime} ({SHIFT_STATUS_VI[sh.status] || sh.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Cư dân phụ trách *</label>
              {residentsLoading ? (
                <p className="field-hint">Đang tải cư dân đã giao...</p>
              ) : (
                <select
                  value={form.residentId}
                  onChange={(e) => setForm((p) => ({ ...p, residentId: e.target.value }))}
                  disabled={!form.staffProfileId || assignedResidents.length === 0}
                >
                  <option value="">— Chọn cư dân —</option>
                  {assignedResidents.map((r) => (
                    <option key={r._id} value={r._id}>
                      {careResidentOptionLabel(r)}
                    </option>
                  ))}
                </select>
              )}
              {residentHint && (
                <small className="field-hint field-hint--warn">{residentHint}</small>
              )}
            </div>

            <div className="form-group">
              <label>Loại nhiệm vụ *</label>
              <select
                value={form.taskType}
                onChange={(e) => setForm((p) => ({ ...p, taskType: e.target.value }))}
              >
                {taskTypeOptions.map((t) => (
                  <option key={t.value} value={t.value}>{t.labelVi}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Mức độ chăm sóc *</label>
              <select
                value={form.careLevel}
                onChange={(e) => setForm((p) => ({ ...p, careLevel: e.target.value }))}
              >
                {careLevelOptions.map((l) => (
                  <option key={l.value} value={l.value}>{l.labelVi}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Giờ dự kiến</label>
              <input
                type="time"
                value={form.scheduledTime}
                onChange={(e) => setForm((p) => ({ ...p, scheduledTime: e.target.value }))}
              />
              {selectedShift && (
                <small className="field-hint">
                  Khung hợp lệ: {selectedShift.startTime} - {selectedShift.endTime}
                </small>
              )}
            </div>

            <div className="form-group form-grid--full">
              <label>Ghi chú</label>
              <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              className="btn btn--primary"
              onClick={handleCreate}
              disabled={saving || !form.staffProfileId || !form.residentId}
            >
              {saving ? 'Đang lưu...' : 'Lưu nhiệm vụ'}
            </button>
            <button
              className="btn"
              style={{ background: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
              onClick={() => setShowForm(false)}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>Đang tải...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nhân viên</th><th>Cư dân</th><th>Loại nhiệm vụ</th><th>Mức độ</th>
              <th>Giờ</th><th>Trạng thái</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr><td colSpan={7} className="empty-state">Không có nhiệm vụ nào ngày này</td></tr>
            )}
            {tasks.map((t) => {
              const staffName = t.staffProfileId?.userId?.fullName || t.staffProfileId?.staffCode || '—';
              const resident = t.residentId?.fullName || t.residentId?.residentCode || '—';
              const next = TASK_STATUS_NEXT[t.status] || [];
              return (
                <tr key={t._id}>
                  <td>{staffName}</td>
                  <td>{resident}</td>
                  <td>{taskTypeLabel(t.taskType)}</td>
                  <td>{careLevelLabel(t.careLevel)}</td>
                  <td>{t.scheduledTime || '—'}</td>
                  <td>
                    <span className={`task-status task-status--${t.status}`}>
                      {TASK_STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td>
                    {next.map((s) => (
                      <button
                        key={s}
                        className="btn btn--sm btn--edit"
                        style={{ marginRight: 4 }}
                        onClick={() => handleStatus(t._id, s)}
                      >
                        {TASK_STATUS_LABELS[s]}
                      </button>
                    ))}
                    {t.status === 'pending' && (
                      <button className="btn btn--sm btn--delete" onClick={() => handleDelete(t._id)}>Xóa</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'area',      label: '🏢 Khu vực phụ trách' },
  { key: 'residents', label: '👴 Cư dân phụ trách' },
  { key: 'tasks',     label: '📋 Nhiệm vụ chăm sóc' },
];

export default function StaffAssignmentPage() {
  const [activeTab, setActiveTab] = useState('area');
  const [assignmentDate, setAssignmentDate] = useState(today());
  const [staff, setStaff]         = useState([]);
  const [loading, setLoading]     = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffService.getAll({ limit: 100, assignmentDate });
      setStaff(res.data || []);
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [assignmentDate]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  return (
    <div className="assignment-page">
      <div className="assignment-page__header">
        <h1 className="assignment-page__title">Phân công nhân viên</h1>
        <p className="assignment-page__subtitle">Khu vực phụ trách, cư dân chăm sóc và nhiệm vụ theo ca</p>
      </div>

      <div className="assignment-toolbar">
        <label className="assignment-toolbar__label" htmlFor="assignment-date">
          Ngày phân công
        </label>
        <input
          id="assignment-date"
          type="date"
          className="assignment-toolbar__date"
          value={assignmentDate}
          onChange={(e) => setAssignmentDate(e.target.value)}
        />
        <span className="assignment-toolbar__hint">{formatDateVi(assignmentDate)}</span>
        <span className="assignment-toolbar__note">
          Ca hiển thị: đã đăng / đã xác nhận · Tầng/phòng lưu cố định trên hồ sơ
        </span>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        {activeTab === 'area'      && (
          <AreaTab
            staff={staff}
            loading={loading}
            assignmentDate={assignmentDate}
            onStaffUpdated={loadStaff}
          />
        )}
        {activeTab === 'residents' && (
          <ResidentTab
            staff={staff}
            loading={loading}
            assignmentDate={assignmentDate}
            onStaffUpdated={loadStaff}
          />
        )}
        {activeTab === 'tasks'     && (
          <CareTaskTab assignmentDate={assignmentDate} staff={staff} />
        )}
      </div>
    </div>
  );
}
