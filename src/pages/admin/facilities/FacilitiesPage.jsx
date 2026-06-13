import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  Layers,
  DoorOpen,
  Bed as BedIcon,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';
import facilityService from '../../../services/facility.service';
import '../../../styles/admin/FacilitiesPage.css';

export default function FacilitiesPage({ defaultTab = 'buildings' }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    buildingsCount: 0,
    floorsCount: 0,
    roomsCount: 0,
    bedsCount: 0,
  });

  // Data lists
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Modals for Building CRUD (Branch 1)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Form states for Building
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Sync tab state when defaultTab prop changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Handle Tab Change with Navigation to match Sidebar URLs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'buildings') {
      // Since there's no direct route for /admin/buildings, we stay on the current route but update activeTab
    } else {
      navigate(`/admin/${tab}`);
    }
  };

  // Fetch initial stats & list data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const loadedBuildings = await facilityService.listBuildings({ activeOnly: false });
      setBuildings(loadedBuildings || []);

      const loadedFloors = await facilityService.listFloors({ activeOnly: false });
      setFloors(loadedFloors || []);

      // Calculate stats
      setStats({
        buildingsCount: loadedBuildings?.length || 0,
        floorsCount: loadedFloors?.length || 0,
        roomsCount: 0, // Will load if needed
        bedsCount: 0,
      });

      // Default selection
      if (loadedBuildings?.length > 0 && !selectedBuildingId) {
        setSelectedBuildingId(loadedBuildings[0]._id);
      }
    } catch (err) {
      console.error('Failed to load facility data:', err);
      setError('Không thể tải thông tin cơ sở vật chất. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [selectedBuildingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch rooms when active tab is rooms and selectedFloorId changes
  useEffect(() => {
    const fetchRooms = async () => {
      if (activeTab === 'rooms' && selectedFloorId) {
        try {
          setLoading(true);
          const loadedRooms = await facilityService.listRoomsByFloor(selectedFloorId);
          setRooms(loadedRooms || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchRooms();
  }, [activeTab, selectedFloorId]);

  // Fetch beds when active tab is beds and selectedRoomId changes
  useEffect(() => {
    const fetchBeds = async () => {
      if (activeTab === 'beds' && selectedRoomId) {
        try {
          setLoading(true);
          const loadedBeds = await facilityService.listAvailableBedsByRoom(selectedRoomId);
          setBeds(loadedBeds || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchBeds();
  }, [activeTab, selectedRoomId]);

  // Building CRUD Handlers
  const handleOpenCreate = () => {
    setFormCode('');
    setFormName('');
    setFormAddress('');
    setFormDescription('');
    setFormIsActive(true);
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (b) => {
    setSelectedBuilding(b);
    setFormCode(b.code || '');
    setFormName(b.name || '');
    setFormAddress(b.address || '');
    setFormDescription(b.description || '');
    setFormIsActive(b.isActive !== false);
    setFormError(null);
    setShowEditModal(true);
  };

  const handleOpenDelete = (b) => {
    setSelectedBuilding(b);
    setShowDeleteModal(true);
  };

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    if (!formCode.trim()) return setFormError('Mã tòa nhà là bắt buộc');
    if (!formName.trim()) return setFormError('Tên tòa nhà là bắt buộc');

    try {
      setSubmitting(true);
      setFormError(null);
      await facilityService.createBuilding({
        code: formCode.trim(),
        name: formName.trim(),
        address: formAddress.trim(),
        description: formDescription.trim(),
      });
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Không thể tạo tòa nhà. Vui lòng kiểm tra lại mã tòa nhà.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBuilding = async (e) => {
    e.preventDefault();
    if (!selectedBuilding?._id) return;
    if (!formCode.trim()) return setFormError('Mã tòa nhà là bắt buộc');
    if (!formName.trim()) return setFormError('Tên tòa nhà là bắt buộc');

    try {
      setSubmitting(true);
      setFormError(null);
      await facilityService.updateBuilding(selectedBuilding._id, {
        code: formCode.trim(),
        name: formName.trim(),
        address: formAddress.trim(),
        description: formDescription.trim(),
        isActive: formIsActive,
      });
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Cập nhật tòa nhà thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBuilding = async () => {
    if (!selectedBuilding?._id) return;
    try {
      setSubmitting(true);
      await facilityService.deleteBuilding(selectedBuilding._id);
      setShowDeleteModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Vô hiệu hóa tòa nhà thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter buildings by search term
  const filteredBuildings = buildings.filter(b => 
    b.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fac-container">
      {/* Banner Header */}
      <div className="fac-header">
        <div>
          <h1>Cấu trúc tòa nhà & Cơ sở vật chất</h1>
          <p>Cấu hình hệ thống tòa nhà, tầng, phòng và giường phục vụ việc tiếp nhận và quản lý cư trú.</p>
        </div>
        {activeTab === 'buildings' && (
          <button onClick={handleOpenCreate} className="fac-btn-primary">
            <Plus size={16} /> Thêm Tòa Nhà
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="fac-stats-grid">
        <div className="fac-stat-card">
          <div className="fac-stat-icon-wrapper">
            <Building size={20} />
          </div>
          <div className="fac-stat-info">
            <span className="fac-stat-label">Tổng số Tòa nhà</span>
            <span className="fac-stat-value">{stats.buildingsCount}</span>
          </div>
        </div>

        <div className="fac-stat-card">
          <div className="fac-stat-icon-wrapper">
            <Layers size={20} />
          </div>
          <div className="fac-stat-info">
            <span className="fac-stat-label">Tổng số Tầng</span>
            <span className="fac-stat-value">{stats.floorsCount}</span>
          </div>
        </div>

        <div className="fac-stat-card">
          <div className="fac-stat-icon-wrapper">
            <DoorOpen size={20} />
          </div>
          <div className="fac-stat-info">
            <span className="fac-stat-label">Tổng số Phòng</span>
            <span className="fac-stat-value">Đang quản lý</span>
          </div>
        </div>

        <div className="fac-stat-card">
          <div className="fac-stat-icon-wrapper">
            <BedIcon size={20} />
          </div>
          <div className="fac-stat-info">
            <span className="fac-stat-label">Tổng số Giường</span>
            <span className="fac-stat-value">Đang quản lý</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fac-tab-bar">
        <button
          onClick={() => handleTabChange('buildings')}
          className={`fac-tab-btn ${activeTab === 'buildings' ? 'active' : ''}`}
        >
          <Building size={16} /> Tòa nhà
        </button>
        <button
          onClick={() => handleTabChange('floors')}
          className={`fac-tab-btn ${activeTab === 'floors' ? 'active' : ''}`}
        >
          <Layers size={16} /> Tầng
        </button>
        <button
          onClick={() => handleTabChange('rooms')}
          className={`fac-tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
        >
          <DoorOpen size={16} /> Phòng
        </button>
        <button
          onClick={() => handleTabChange('beds')}
          className={`fac-tab-btn ${activeTab === 'beds' ? 'active' : ''}`}
        >
          <BedIcon size={16} /> Giường
        </button>
      </div>

      {/* TAB CONTENT: BUILDINGS */}
      {activeTab === 'buildings' && (
        <>
          <div className="fac-action-row">
            <div className="fac-search-wrapper">
              <Search className="fac-search-icon" size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm tòa nhà theo tên hoặc mã..."
                className="fac-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading && buildings.length === 0 ? (
            <div className="fac-loading-box">
              <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
              <p>Đang tải dữ liệu tòa nhà...</p>
            </div>
          ) : filteredBuildings.length === 0 ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                Không tìm thấy tòa nhà nào phù hợp.
              </div>
            </div>
          ) : (
            <div className="fac-table-card">
              <table className="fac-table">
                <thead>
                  <tr>
                    <th>Mã Tòa</th>
                    <th>Tên Tòa Nhà</th>
                    <th>Địa chỉ</th>
                    <th>Mô tả</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuildings.map((b) => (
                    <tr key={b._id}>
                      <td style={{ fontWeight: '600', color: '#1e293b' }}>{b.code}</td>
                      <td style={{ fontWeight: '550' }}>{b.name}</td>
                      <td>{b.address || '—'}</td>
                      <td>{b.description || '—'}</td>
                      <td>
                        <span className={`fac-badge ${b.isActive !== false ? 'fac-badge--success' : 'fac-badge--danger'}`}>
                          {b.isActive !== false ? 'Hoạt động' : 'Tạm khóa'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="fac-btn-icon fac-btn-icon--edit"
                          title="Sửa"
                        >
                          <Edit size={16} />
                        </button>
                        {b.isActive !== false && (
                          <button
                            onClick={() => handleOpenDelete(b)}
                            className="fac-btn-icon fac-btn-icon--delete"
                            title="Vô hiệu hóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB CONTENT: FLOORS (Read Only in Branch 1) */}
      {activeTab === 'floors' && (
        <>
          <div className="fac-action-row">
            <div className="flex gap-2">
              <select
                className="fac-form-control"
                style={{ width: '220px', borderRadius: '12px' }}
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
              >
                <option value="">Lọc theo Tòa nhà...</option>
                {buildings.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>Thao tác quản trị Tầng (Thêm/Sửa/Xóa) sẽ khả dụng trong phân đoạn tiếp theo.</span>
            </div>
          </div>

          {loading ? (
            <div className="fac-loading-box">
              <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
              <p>Đang tải dữ liệu tầng...</p>
            </div>
          ) : floors.filter(f => !selectedBuildingId || f.buildingId === selectedBuildingId).length === 0 ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                Không tìm thấy tầng nào thuộc tòa nhà đã chọn.
              </div>
            </div>
          ) : (
            <div className="fac-table-card">
              <table className="fac-table">
                <thead>
                  <tr>
                    <th>Số Tầng</th>
                    <th>Tên Tầng</th>
                    <th>Tòa nhà</th>
                    <th>Mô tả</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {floors
                    .filter(f => !selectedBuildingId || f.buildingId === selectedBuildingId)
                    .map((f) => (
                      <tr key={f._id}>
                        <td>Tầng {f.floorNumber}</td>
                        <td style={{ fontWeight: '550' }}>{f.name || `Tầng ${f.floorNumber}`}</td>
                        <td>{f.building?.name || '—'}</td>
                        <td>{f.description || '—'}</td>
                        <td>
                          <span className={`fac-badge ${f.isActive !== false ? 'fac-badge--success' : 'fac-badge--danger'}`}>
                            {f.isActive !== false ? 'Hoạt động' : 'Vô hiệu'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB CONTENT: ROOMS (Read Only in Branch 1) */}
      {activeTab === 'rooms' && (
        <>
          <div className="fac-action-row">
            <div className="flex gap-3 w-full max-w-md">
              <select
                className="fac-form-control"
                style={{ borderRadius: '12px' }}
                value={selectedBuildingId}
                onChange={(e) => {
                  setSelectedBuildingId(e.target.value);
                  setSelectedFloorId('');
                }}
              >
                <option value="">Chọn Tòa nhà...</option>
                {buildings.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>

              <select
                className="fac-form-control"
                style={{ borderRadius: '12px' }}
                value={selectedFloorId}
                onChange={(e) => setSelectedFloorId(e.target.value)}
                disabled={!selectedBuildingId}
              >
                <option value="">Chọn Tầng...</option>
                {floors
                  .filter(f => f.buildingId === selectedBuildingId)
                  .map(f => (
                    <option key={f._id} value={f._id}>{f.name || `Tầng ${f.floorNumber}`}</option>
                  ))}
              </select>
            </div>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>Thao tác quản lý Phòng sẽ khả dụng trong phân đoạn tiếp theo.</span>
            </div>
          </div>

          {!selectedFloorId ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                Vui lòng chọn tòa nhà và tầng cụ thể để xem danh sách phòng.
              </div>
            </div>
          ) : loading ? (
            <div className="fac-loading-box">
              <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
              <p>Đang tải danh sách phòng...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                Không tìm thấy phòng nào ở tầng này.
              </div>
            </div>
          ) : (
            <div className="fac-table-card">
              <table className="fac-table">
                <thead>
                  <tr>
                    <th>Số Phòng</th>
                    <th>Loại Phòng</th>
                    <th>Sức Chứa</th>
                    <th>Đang Ở</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r._id}>
                      <td style={{ fontWeight: '600' }}>Phòng {r.roomNumber}</td>
                      <td style={{ textTransform: 'capitalize' }}>{r.roomType}</td>
                      <td>{r.capacity} giường</td>
                      <td>{r.occupiedCount || 0}</td>
                      <td>
                        <span className={`fac-badge ${
                          r.status === 'available' ? 'fac-badge--success' : 
                          r.status === 'full' ? 'fac-badge--warning' : 'fac-badge--danger'
                        }`}>
                          {r.status === 'available' ? 'Còn giường' :
                           r.status === 'full' ? 'Đã đầy' : 'Bảo trì/Đóng'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB CONTENT: BEDS (Read Only in Branch 1) */}
      {activeTab === 'beds' && (
        <>
          <div className="fac-action-row">
            <div className="flex gap-3 w-full max-w-lg">
              <select
                className="fac-form-control"
                style={{ borderRadius: '12px' }}
                value={selectedBuildingId}
                onChange={(e) => {
                  setSelectedBuildingId(e.target.value);
                  setSelectedFloorId('');
                  setSelectedRoomId('');
                }}
              >
                <option value="">Chọn Tòa nhà...</option>
                {buildings.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>

              <select
                className="fac-form-control"
                style={{ borderRadius: '12px' }}
                value={selectedFloorId}
                onChange={(e) => {
                  setSelectedFloorId(e.target.value);
                  setSelectedRoomId('');
                }}
                disabled={!selectedBuildingId}
              >
                <option value="">Chọn Tầng...</option>
                {floors
                  .filter(f => f.buildingId === selectedBuildingId)
                  .map(f => (
                    <option key={f._id} value={f._id}>{f.name || `Tầng ${f.floorNumber}`}</option>
                  ))}
              </select>

              <select
                className="fac-form-control"
                style={{ borderRadius: '12px' }}
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                disabled={!selectedFloorId}
              >
                <option value="">Chọn Phòng...</option>
                {rooms.map(r => (
                  <option key={r._id} value={r._id}>Phòng {r.roomNumber}</option>
                ))}
              </select>
            </div>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>Thao tác quản lý Giường sẽ khả dụng trong phân đoạn tiếp theo.</span>
            </div>
          </div>

          {!selectedRoomId ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                Vui lòng chọn tòa nhà, tầng và phòng cụ thể để xem danh sách giường.
              </div>
            </div>
          ) : loading ? (
            <div className="fac-loading-box">
              <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
              <p>Đang tải danh sách giường...</p>
            </div>
          ) : beds.length === 0 ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                Không có giường trống nào trong phòng này (hoặc phòng đã đầy).
              </div>
            </div>
          ) : (
            <div className="fac-table-card">
              <table className="fac-table">
                <thead>
                  <tr>
                    <th>Mã Giường</th>
                    <th>Loại Giường</th>
                    <th>Trạng thái</th>
                    <th>Tình trạng</th>
                  </tr>
                </thead>
                <tbody>
                  {beds.map((b) => (
                    <tr key={b._id}>
                      <td style={{ fontWeight: '600' }}>{b.bedCode}</td>
                      <td style={{ textTransform: 'capitalize' }}>{b.bedType}</td>
                      <td>
                        <span className={`fac-badge ${b.status === 'available' ? 'fac-badge--success' : 'fac-badge--danger'}`}>
                          {b.status === 'available' ? 'Trống' : b.status}
                        </span>
                      </td>
                      <td>
                        <span className={`fac-badge ${
                          b.condition === 'good' ? 'fac-badge--success' :
                          b.condition === 'fair' ? 'fac-badge--warning' : 'fac-badge--danger'
                        }`}>
                          {b.condition === 'good' ? 'Tốt' : b.condition === 'fair' ? 'Trung bình' : 'Hỏng'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* CREATE BUILDING MODAL */}
      {showCreateModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header">
              <h3>Thêm Tòa Nhà Mới</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateBuilding}>
              <div className="fac-modal-body">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4">
                    {formError}
                  </div>
                )}
                <div className="fac-form-group">
                  <label>Mã Tòa Nhà *</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder="Ví dụ: TOAA, TOAB"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    required
                  />
                </div>
                <div className="fac-form-group">
                  <label>Tên Tòa Nhà *</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder="Ví dụ: Tòa Nhà A - Khu Điều Dưỡng"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div className="fac-form-group">
                  <label>Địa Chỉ</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder="Ví dụ: Phân khu phía Nam"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>
                <div className="fac-form-group">
                  <label>Mô Tả</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '80px' }}
                    placeholder="Nhập mô tả chi tiết..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="fac-btn fac-btn--secondary">
                  Hủy
                </button>
                <button type="submit" disabled={submitting} className="fac-btn fac-btn--primary">
                  {submitting ? 'Đang tạo...' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BUILDING MODAL */}
      {showEditModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header">
              <h3>Chỉnh Sửa Tòa Nhà</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateBuilding}>
              <div className="fac-modal-body">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4">
                    {formError}
                  </div>
                )}
                <div className="fac-form-group">
                  <label>Mã Tòa Nhà *</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder="Ví dụ: TOAA"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    required
                  />
                </div>
                <div className="fac-form-group">
                  <label>Tên Tòa Nhà *</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div className="fac-form-group">
                  <label>Địa Chỉ</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>
                <div className="fac-form-group">
                  <label>Mô Tả</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '80px' }}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
                <div className="fac-form-group flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <label htmlFor="isActive" style={{ margin: 0, cursor: 'pointer' }}>Tòa nhà đang hoạt động</label>
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="fac-btn fac-btn--secondary">
                  Hủy
                </button>
                <button type="submit" disabled={submitting} className="fac-btn fac-btn--primary">
                  {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header" style={{ background: '#fef2f2' }}>
              <h3 style={{ color: '#dc2626' }}>Vô Hiệu Hóa Tòa Nhà?</h3>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="fac-modal-body">
              <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                <AlertTriangle size={36} className="text-red-500" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>
                    Bạn có chắc chắn muốn vô hiệu hóa tòa nhà <strong>{selectedBuilding?.name}</strong> ({selectedBuilding?.code})?
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Hành động này sẽ tạm khóa tòa nhà. Tất cả các tầng, phòng và giường thuộc tòa nhà này cũng sẽ bị vô hiệu hóa hoặc chuyển sang trạng thái đóng.
                  </p>
                </div>
              </div>
            </div>
            <div className="fac-modal-footer">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="fac-btn fac-btn--secondary">
                Hủy
              </button>
              <button type="button" onClick={handleDeleteBuilding} disabled={submitting} className="fac-btn fac-btn--danger">
                {submitting ? 'Đang khóa...' : 'Xác Nhận Khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
