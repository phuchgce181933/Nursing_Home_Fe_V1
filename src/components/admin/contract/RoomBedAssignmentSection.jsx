import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Building2, Layers, DoorOpen, BedDouble, UserCheck } from 'lucide-react';
import facilityService from '../../../services/facility.service';

/**
 * RoomBedAssignmentSection - Phân bổ phòng & giường cho hợp đồng
 *
 * Component cascade dropdown: Tòa nhà → Tầng → Phòng → Giường
 *
 * Props:
 *  - value: { buildingId, buildingName, floorId, floorName, roomId, roomName,
 *             bedId, bedName, roomType, responsibleStaff }
 *  - onChange: callback nhận object mới
 *  - allowedRoomTypes: mảng loại phòng được phép (lọc theo gói dịch vụ, optional)
 *  - staffByRoom: map { [roomId]: [{ _id, fullName, role, staffProfile, ... }] }
 *                 — Pre-built ở parent để tránh gọi API mỗi lần đổi phòng. Khi
 *                 không truyền prop này thì chỉ hiển thị phòng mà KHÔNG show staff.
 *  - disabled: vô hiệu hóa
 */
const ROOM_TYPE_LABELS = {
  standard: 'Phòng Standard',
  premium: 'Phòng Premium',
  vip: 'Phòng VIP',
  icu: 'Phòng ICU',
  isolation: 'Phòng Cách ly',
};

const labelViRole = (role) => {
  switch (role) {
    case 'doctor': return 'Bác sĩ';
    case 'nurse': return 'Điều dưỡng';
    case 'caregiver': return 'Hộ lý';
    default: return role || '';
  }
};

export default function RoomBedAssignmentSection({
  value = {},
  onChange,
  allowedRoomTypes,
  staffByRoom,
  disabled = false,
}) {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Nhân viên phụ trách phòng hiện tại (lookup từ map parent truyền vào).
  // Trả về mảng các staff có roomId nằm trong responsibleRoomIds của profile.
  const responsibleStaff = useMemo(() => {
    if (!staffByRoom || !value.roomId) return [];
    const key = String(value.roomId);
    return staffByRoom[key] || [];
  }, [staffByRoom, value.roomId]);

  // Load tòa nhà + tất cả tầng (để filter nhanh) khi mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [bRes, fRes] = await Promise.all([
          facilityService.listBuildings(),
          facilityService.listFloors(),
        ]);
        if (!mounted) return;
        setBuildings(bRes || []);
        setFloors(fRes || []);
      } catch (err) {
        console.error('Failed to load facilities:', err);
        setError('Không thể tải danh sách tòa nhà / tầng');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Filter tầng theo tòa nhà
  const selectableFloors = floors.filter((f) => {
    const fBuildingId = f.buildingId || f.building?._id;
    if (value.buildingId && fBuildingId !== value.buildingId) return false;
    return true;
  });

  // Filter phòng theo loại phòng (nếu có allowedRoomTypes hoặc đã chọn roomType)
  const allowedTypeSet = allowedRoomTypes && allowedRoomTypes.length > 0
    ? new Set(allowedRoomTypes)
    : null;
  const selectableRooms = rooms.filter((r) => {
    if (allowedTypeSet) return allowedTypeSet.has(r.roomType);
    if (value.roomType) return r.roomType === value.roomType;
    return true;
  });

  const update = (patch) => onChange({ ...value, ...patch });

  const handleBuildingChange = async (buildingId) => {
    const building = buildings.find((b) => b._id === buildingId);
    update({
      buildingId,
      buildingName: building?.name || '',
      floorId: '',
      floorName: '',
      roomId: '',
      roomName: '',
      roomType: '',
      bedId: '',
      bedName: '',
      responsibleStaff: [],
    });
    // Reload floors theo building
    try {
      const fRes = await facilityService.listFloors({ buildingId });
      setFloors(fRes || []);
    } catch (err) {
      console.error('Failed to fetch floors:', err);
    }
    setRooms([]);
    setBeds([]);
  };

  const handleFloorChange = async (floorId) => {
    const floor = floors.find((f) => f._id === floorId);
    update({
      floorId,
      floorName: floor?.name || '',
      roomId: '',
      roomName: '',
      roomType: '',
      bedId: '',
      bedName: '',
      responsibleStaff: [],
    });
    try {
      const rRes = await facilityService.listRoomsByFloor(floorId);
      setRooms(rRes || []);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
      setRooms([]);
    }
    setBeds([]);
  };

  const handleRoomChange = async (roomId) => {
    const room = rooms.find((r) => r._id === roomId);
    // Tìm nhân viên phụ trách phòng vừa chọn (từ map parent đã load sẵn).
    const roomStaff = (staffByRoom && roomId)
      ? (staffByRoom[String(roomId)] || [])
      : [];
    // Helper: build danh sách { id, fullName, role } gọn để parent xài khi tạo HĐ.
    const responsibleStaffCompact = roomStaff.map((s) => ({
      id: s._id || s.id,
      fullName: s.fullName || s.userId?.fullName || s.username || '',
      role: s.role || '',
    }));
    update({
      roomId,
      roomName: room?.roomNumber || '',
      roomType: room?.roomType || '',
      bedId: '',
      bedName: '',
      responsibleStaff: responsibleStaffCompact,
    });
    try {
      // Lấy TẤT CẢ giường trong phòng để hiển thị đầy đủ trạng thái (trống / có người / bảo trì).
      // Sau đó lọc ở frontend: chỉ cho chọn giường trống (status === 'available')
      // nhưng vẫn hiển thị giường có người / bảo trì ở dạng disabled để admin thấy rõ.
      const bRes = await facilityService.listBedsByRoom(roomId, { all: true });
      setBeds(bRes || []);
    } catch (err) {
      console.error('Failed to fetch beds:', err);
      setBeds([]);
    }
  };

  const handleBedChange = (bedId) => {
    const bed = beds.find((b) => b._id === bedId);
    update({ bedId, bedName: bed?.bedCode || '' });
  };

  if (loading && buildings.length === 0) {
    return (
      <div className="ctc-section">
        <div className="ctc-section-header">
          <h4>🏠 Phân bổ phòng &amp; giường</h4>
        </div>
        <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          <span>Đang tải danh sách tòa nhà...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ctc-section">
        <div className="ctc-section-header">
          <h4>🏠 Phân bổ phòng &amp; giường</h4>
        </div>
        <div className="text-red-500 text-sm py-2">{error}</div>
      </div>
    );
  }

  return (
    <div className="ctc-section">
      <div className="ctc-section-header">
        <h4>🏠 Phân bổ phòng &amp; giường <span className="text-xs text-slate-500">(tùy chọn — có thể bỏ qua nếu muốn phân bổ sau)</span></h4>
      </div>

      <div className="ctc-form-grid ctc-form-grid--2">
        {/* Tòa nhà */}
        <div className="ctc-field">
          <label>
            <Building2 size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Tòa nhà
          </label>
          <select
            value={value.buildingId || ''}
            onChange={(e) => handleBuildingChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">-- Chọn tòa nhà --</option>
            {buildings.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Tầng */}
        <div className="ctc-field">
          <label>
            <Layers size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Tầng
          </label>
          <select
            value={value.floorId || ''}
            onChange={(e) => handleFloorChange(e.target.value)}
            disabled={disabled || !value.buildingId}
          >
            <option value="">-- Chọn tầng --</option>
            {selectableFloors.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name || `Tầng ${f.floorNumber}`}
              </option>
            ))}
          </select>
        </div>

        {/* Phòng */}
        <div className="ctc-field">
          <label>
            <DoorOpen size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Phòng
            {value.roomType && (
              <span className="text-xs text-slate-500 ml-2">
                ({ROOM_TYPE_LABELS[value.roomType] || value.roomType})
              </span>
            )}
          </label>
          <select
            value={value.roomId || ''}
            onChange={(e) => handleRoomChange(e.target.value)}
            disabled={disabled || !value.floorId}
          >
            <option value="">-- Chọn phòng --</option>
            {selectableRooms.map((r) => (
              <option key={r._id} value={r._id}>
                {r.roomNumber} ({r.bedCount || 0} giường{r.roomType ? ` • ${ROOM_TYPE_LABELS[r.roomType] || r.roomType}` : ''})
              </option>
            ))}
          </select>
          {value.floorId && selectableRooms.length === 0 && (
            <span className="text-xs text-amber-600 mt-1 block">
              Tầng này không có phòng phù hợp{value.roomType ? ` loại "${ROOM_TYPE_LABELS[value.roomType] || value.roomType}"` : ''}.
            </span>
          )}
              {/* Hiển thị nhân viên phụ trách phòng đang chọn hoặc thông báo chưa phân công. */}
          {value.roomId && staffByRoom && (
            <div className="ctc-room-staff-hint" style={{ marginTop: 6, fontSize: '0.82rem' }}>
              {responsibleStaff.length > 0 ? (
                <span style={{ color: '#047857', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <UserCheck size={13} />
                  <strong>Nhân viên phụ trách:</strong>
                  <span style={{ marginLeft: 4 }}>
                    {responsibleStaff
                      .map((s) => `${s.fullName}${s.role ? ` (${labelViRole(s.role)})` : ''}`)
                      .join(', ')}
                  </span>
                </span>
              ) : (
                <span style={{ color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <UserCheck size={13} />
                  Phòng này chưa được phân công nhân viên phụ trách.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Giường */}
        <div className="ctc-field">
          <label>
            <BedDouble size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Giường
          </label>
          <select
            value={value.bedId || ''}
            onChange={(e) => handleBedChange(e.target.value)}
            disabled={disabled || !value.roomId}
          >
            <option value="">-- Chọn giường --</option>
            {beds.map((b) => {
              const isAvailable = b.status === 'available' && !b.assignedResidentId;
              const statusLabel =
                b.status === 'occupied' ? 'đã có người'
                : b.status === 'reserved' ? 'đã đặt trước'
                : b.status === 'maintenance' ? 'đang bảo trì'
                : '';
              return (
                <option
                  key={b._id}
                  value={b._id}
                  disabled={!isAvailable}
                >
                  {b.bedCode}{statusLabel ? ` — ${statusLabel}` : ''}
                </option>
              );
            })}
          </select>
          {value.roomId && beds.length > 0 && (
            <span className="text-xs text-slate-500 mt-1 block">
              {beds.filter((b) => b.status === 'available' && !b.assignedResidentId).length}/{beds.length} giường trống
            </span>
          )}
          {value.roomId && beds.length > 0
            && beds.every((b) => b.status !== 'available' || b.assignedResidentId) && (
            <span className="text-xs text-amber-600 mt-1 block">
              Phòng này hiện không còn giường trống — vui lòng chọn phòng khác hoặc bỏ qua phân bổ giường.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
