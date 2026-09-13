import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import servicePackageService from '../../../services/servicePackage.service';
import facilityService from '../../../services/facility.service';

/**
 * Form Chọn Gói dịch vụ (Phụ lục 01)
 * - Dropdown chọn gói từ hệ thống (có giá sẵn)
 * - Loại phòng dựa trên allowedRoomTypes của gói
 * - Chọn Tầng → Phòng → Giường
 * - Tự động điền tên và giá khi chọn gói
 *
 * Props:
 *  - pkg: object { name, monthlyPrice, roomType, floorId, floorName, roomId, roomName, bedId, bedName }
 *  - onChange: callback nhận object mới
 *  - readOnly: chế độ chỉ đọc
 */
const ROOM_TYPE_LABELS = {
  standard: 'Phòng Standard',
  premium: 'Phòng Premium',
  vip: 'Phòng VIP',
  icu: 'Phòng ICU',
  isolation: 'Phòng Cách ly',
};

export default function ServicePackageForm({ pkg = {}, onChange, readOnly = false }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pkgError, setPkgError] = useState(null);

  // Facility cascading dropdowns
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [facilityLoading, setFacilityLoading] = useState(false);

  const [selectedPackageId, setSelectedPackageId] = useState('');

  const data = pkg || {};

  // Fetch danh sách gói dịch vụ đang hoạt động
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        const res = await servicePackageService.getServicePackageList({ isActive: true }, 'admin');
        setPackages(res?.data || []);
      } catch (err) {
        console.error('Failed to fetch service packages:', err);
        setPkgError('Không tải được danh sách gói dịch vụ');
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  // Fetch tất cả tòa nhà, tầng, phòng khi mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setFacilityLoading(true);
        const [bRes, fRes] = await Promise.all([
          facilityService.listBuildings(),
          facilityService.listFloors(),
        ]);
        setBuildings(bRes || []);
        setFloors(fRes || []);
      } catch (err) {
        console.error('Failed to fetch facilities:', err);
      } finally {
        setFacilityLoading(false);
      }
    };
    fetchAll();
  }, []);



  // Khi có pkg được truyền vào (edit), tìm packageId tương ứng
  useEffect(() => {
    if (data.name && packages.length > 0) {
      const matched = packages.find(p => p.name === data.name);
      if (matched) {
        setSelectedPackageId(matched._id);
      }
    }
  }, [data.name, packages]);

  // Xử lý chọn gói
  const handleSelectPackage = (pkgId) => {
    setSelectedPackageId(pkgId);
    if (!pkgId) {
      onChange({ name: '', monthlyPrice: '', roomType: '' });
      return;
    }
    const selected = packages.find(p => p._id === pkgId);
    if (selected) {
      const defaultRoomType = (selected.allowedRoomTypes && selected.allowedRoomTypes.length > 0)
        ? selected.allowedRoomTypes[0]
        : 'standard';
      onChange({
        ...data,
        name: selected.name,
        monthlyPrice: selected.monthlyPrice,
        roomType: data.roomType || defaultRoomType,
      });
    }
  };

  const set = (k, v) => {
    const updates = { ...data, [k]: v };
    if (k === 'roomType') {
      updates.floorId = '';
      updates.floorName = '';
      updates.roomId = '';
      updates.roomName = '';
      updates.bedId = '';
      updates.bedName = '';
    }
    if (k === 'buildingId') {
      updates.floorId = '';
      updates.floorName = '';
      updates.roomId = '';
      updates.roomName = '';
      updates.bedId = '';
      updates.bedName = '';
    }
    if (k === 'floorId') {
      updates.roomId = '';
      updates.roomName = '';
      updates.bedId = '';
      updates.bedName = '';
    }
    if (k === 'roomId') {
      updates.bedId = '';
      updates.bedName = '';
    }
    onChange(updates);
  };

  const handleFloorChange = (floorId) => {
    const floor = floors.find(f => f._id === floorId);
    // Fetch rooms for the selected floor
    const fetchRooms = async () => {
      try {
        const res = await facilityService.listRoomsByFloor(floorId);
        setRooms(res || []);
      } catch (err) {
        console.error('Failed to fetch rooms:', err);
      }
    };
    fetchRooms();
    onChange({
      ...data,
      floorId,
      floorName: floor?.name || '',
      roomId: '',
      roomName: '',
      bedId: '',
      bedName: '',
    });
  };

  const handleRoomChange = (roomId) => {
    const room = rooms.find(r => r._id === roomId);
    // Fetch beds for the selected room
    const fetchBeds = async () => {
      try {
        const res = await facilityService.listBedsByRoom(roomId, { all: true });
        setBeds(res || []);
      } catch (err) {
        console.error('Failed to fetch beds:', err);
      }
    };
    fetchBeds();
    onChange({
      ...data,
      roomId,
      roomName: room?.roomNumber || '',
      bedId: '',
      bedName: '',
    });
  };

  const handleBedChange = (bedId) => {
    const bed = beds.find(b => b._id === bedId);
    onChange({
      ...data,
      bedId,
      bedName: bed?.bedNumber || '',
    });
  };

  const handleBuildingChange = (buildingId) => {
    const building = buildings.find(b => b._id === buildingId);
    // Fetch floors for the selected building
    const fetchFloors = async () => {
      try {
        const res = await facilityService.listFloors({ buildingId });
        setFloors(res || []);
      } catch (err) {
        console.error('Failed to fetch floors:', err);
      }
    };
    fetchFloors();
    onChange({
      ...data,
      buildingId,
      buildingName: building?.name || '',
      floorId: '',
      floorName: '',
      roomId: '',
      roomName: '',
      bedId: '',
      bedName: '',
    });
  };

  // Filter tầng theo tòa đã chọn và loại phòng đã chọn
  const selectableFloors = floors.filter(f => {
    const fBuildingId = f.buildingId || f.building?._id;
    if (data.buildingId && fBuildingId !== data.buildingId) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="ctc-section">
        <div className="ctc-section-header">
          <h4>📦 Chi tiết Gói dịch vụ</h4>
        </div>
        <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          <span>Đang tải danh sách gói dịch vụ...</span>
        </div>
      </div>
    );
  }

  if (pkgError) {
    return (
      <div className="ctc-section">
        <div className="ctc-section-header">
          <h4>📦 Chi tiết Gói dịch vụ</h4>
        </div>
        <div className="text-red-500 text-sm py-2">{pkgError}</div>
      </div>
    );
  }

  return (
    <div className="ctc-section">
      <div className="ctc-section-header">
        <h4>📦 Chi tiết Gói dịch vụ</h4>
      </div>

      <div className="ctc-form-grid ctc-form-grid--2">
        {/* Chọn gói dịch vụ */}
        <div className="ctc-field ctc-field--full">
          <label>Chọn gói dịch vụ *</label>
          <select
            value={selectedPackageId}
            onChange={(e) => handleSelectPackage(e.target.value)}
            disabled={readOnly}
          >
            <option value="">-- Chọn gói dịch vụ --</option>
            {packages.map(pkg => (
              <option key={pkg._id} value={pkg._id}>
                {pkg.name} ({pkg.tier?.toUpperCase()} - {Number(pkg.monthlyPrice).toLocaleString('vi-VN')} VNĐ/tháng)
              </option>
            ))}
          </select>
        </div>

        <div className="ctc-field">
          <label>Tên gói *</label>
          <input
            type="text"
            value={data.name || ''}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Gói Chăm sóc Cơ bản"
            disabled={readOnly}
          />
        </div>

        <div className="ctc-field">
          <label>Phí hàng tháng (VNĐ) *</label>
          <input
            type="number"
            value={data.monthlyPrice || ''}
            onChange={(e) => set('monthlyPrice', e.target.value ? Number(e.target.value) : '')}
            placeholder="5000000"
            disabled={readOnly}
          />
        </div>

        <div className="ctc-field">
          <label>Loại phòng</label>
          <select
            value={data.roomType || 'standard'}
            onChange={(e) => set('roomType', e.target.value)}
            disabled={readOnly}
          >
            <option value="">— Chọn loại phòng —</option>
            {Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Tòa nhà */}
        <div className="ctc-field">
          <label>Tòa nhà *</label>
          {facilityLoading ? (
            <input type="text" placeholder="Đang tải..." disabled />
          ) : (
            <select
              value={data.buildingId || ''}
              onChange={(e) => handleBuildingChange(e.target.value)}
              disabled={readOnly}
            >
              <option value="">-- Chọn tòa nhà --</option>
              {buildings.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Tầng */}
        <div className="ctc-field">
          <label>Tầng *</label>
          <select
            value={data.floorId || ''}
            onChange={(e) => handleFloorChange(e.target.value)}
            disabled={readOnly || !data.buildingId}
          >
            <option value="">-- Chọn tầng --</option>
            {selectableFloors.map(f => (
              <option key={f._id} value={f._id}>{f.name || `Tầng ${f.floorNumber}`}</option>
            ))}
          </select>
        </div>

        {/* Phòng */}
        <div className="ctc-field">
          <label>Phòng *</label>
          <select
            value={data.roomId || ''}
            onChange={(e) => handleRoomChange(e.target.value)}
            disabled={readOnly || !data.floorId}
          >
            <option value="">-- Chọn phòng --</option>
            {rooms
              .filter(r => !data.roomType || r.roomType === data.roomType)
              .map(r => (
                <option key={r._id} value={r._id}>{r.roomNumber} ({r.bedCount || 0} giường)</option>
              ))}
          </select>
          {data.floorId && rooms.filter(r => !data.roomType || r.roomType === data.roomType).length === 0 && (
            <span className="text-xs text-amber-600 mt-1 block">
              Tầng này không có phòng loại "{ROOM_TYPE_LABELS[data.roomType] || data.roomType}"
            </span>
          )}
        </div>

        {/* Giường */}
        <div className="ctc-field">
          <label>Giường *</label>
          <select
            value={data.bedId || ''}
            onChange={(e) => handleBedChange(e.target.value)}
            disabled={readOnly || !data.roomId}
          >
            <option value="">-- Chọn giường --</option>
            {beds.map(b => (
              <option key={b._id} value={b._id}>{b.bedCode}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
