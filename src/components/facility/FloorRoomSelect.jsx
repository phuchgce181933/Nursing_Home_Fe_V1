import { useEffect, useState } from 'react';
import facilityService, { getFacilityErrorMessage } from '../../services/facility.service';
import '../../styles/components/FloorRoomSelect.css';

const floorLabel = (f) => {
  // Sử dụng label từ backend nếu có, hoặc tự tạo với thông tin tòa nhà
  if (f.label) return f.label;
  const floorName = f.name || (f.floorNumber != null ? `Tầng ${f.floorNumber}` : f._id);
  const buildingName = f.building?.name || (f.buildingId && typeof f.buildingId === 'object' ? f.buildingId.name : null);
  return buildingName ? `${floorName} — ${buildingName}` : floorName;
};

const roomLabel = (r) => r.label || `Phòng ${r.roomNumber}`;

export default function FloorRoomSelect({
  floorId = '',
  roomId = '',
  onFloorChange,
  onRoomChange,
  floorRequired = true,
  showRoom = true,
  disabled = false,
}) {
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingFloors, setLoadingFloors] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingFloors(true);
    setError('');
    facilityService
      .listFloors({ activeOnly: true })
      .then((data) => {
        if (!cancelled) setFloors(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(getFacilityErrorMessage(e, 'Không tải được danh sách tầng'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFloors(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showRoom || !floorId) {
      setRooms([]);
      return undefined;
    }

    let cancelled = false;
    setLoadingRooms(true);
    facilityService
      .listRoomsByFloor(floorId)
      .then((data) => {
        if (!cancelled) setRooms(Array.isArray(data) ? data : []);
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
  }, [floorId, showRoom]);

  const handleFloorChange = (e) => {
    const next = e.target.value;
    onFloorChange?.(next);
    onRoomChange?.('');
  };

  return (
    <div className="floor-room-select">
      {error && <p className="floor-room-select__error">{error}</p>}

      <div className="form-group">
        <label>
          Tầng / Khu vực {floorRequired && '*'}
        </label>
        <select
          value={floorId}
          onChange={handleFloorChange}
          disabled={disabled || loadingFloors}
          required={floorRequired}
        >
          <option value="">
            {loadingFloors ? 'Đang tải tầng...' : '— Chọn tầng —'}
          </option>
          {floors.map((f) => (
            <option key={f._id} value={f._id}>
              {floorLabel(f)}
            </option>
          ))}
        </select>
        <small className="field-hint">Phân công ca bắt buộc chọn tầng — đồng bộ vào hồ sơ nhân viên</small>
      </div>

      {showRoom && (
        <div className="form-group">
          <label>Phòng (tùy chọn)</label>
          <select
            value={roomId}
            onChange={(e) => onRoomChange?.(e.target.value)}
            disabled={disabled || !floorId || loadingRooms}
          >
            <option value="">
              {!floorId
                ? 'Chọn tầng trước'
                : loadingRooms
                  ? 'Đang tải phòng...'
                  : '— Không chọn phòng —'}
            </option>
            {rooms.map((r) => (
              <option key={r._id} value={r._id}>
                {roomLabel(r)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export { floorLabel, roomLabel };
