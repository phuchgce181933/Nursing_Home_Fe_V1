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

  // Submitting/Form statuses
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // 1. Modals & Form States for Building (Branch 1)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // 2. Modals & Form States for Floor (Branch 2)
  const [showCreateFloorModal, setShowCreateFloorModal] = useState(false);
  const [showEditFloorModal, setShowEditFloorModal] = useState(false);
  const [showDeleteFloorModal, setShowDeleteFloorModal] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);

  const [formFloorBuildingId, setFormFloorBuildingId] = useState('');
  const [formFloorNumber, setFormFloorNumber] = useState('');
  const [formFloorName, setFormFloorName] = useState('');
  const [formFloorDescription, setFormFloorDescription] = useState('');
  const [formFloorIsActive, setFormFloorIsActive] = useState(true);

  // 3. Modals & Form States for Room (Branch 2 - Room Creation only, Branch 3 - Edit & Delete)
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [formRoomBuildingId, setFormRoomBuildingId] = useState('');
  const [formRoomFloorId, setFormRoomFloorId] = useState('');
  const [formRoomNumber, setFormRoomNumber] = useState('');
  const [formRoomType, setFormRoomType] = useState('standard');
  const [formRoomCapacity, setFormRoomCapacity] = useState(2);
  const [formRoomStatus, setFormRoomStatus] = useState('available');
  const [formRoomNotes, setFormRoomNotes] = useState('');

  // 4. Modals & Form States for Bed (Branch 3 - Bed Create & Edit)
  const [showCreateBedModal, setShowCreateBedModal] = useState(false);
  const [showEditBedModal, setShowEditBedModal] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);

  const [formBedCode, setFormBedCode] = useState('');
  const [formBedType, setFormBedType] = useState('normal');
  const [formBedCondition, setFormBedCondition] = useState('good');
  const [formBedStatus, setFormBedStatus] = useState('available');
  const [formBedNotes, setFormBedNotes] = useState('');

  // Sync tab state when defaultTab prop changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Handle Tab Change with Navigation to match Sidebar URLs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'buildings') {
      // Stay on the current route but update activeTab
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
        roomsCount: 0,
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

  // Fetch rooms when active tab is rooms/beds and selectedFloorId changes
  useEffect(() => {
    const fetchRooms = async () => {
      if ((activeTab === 'rooms' || activeTab === 'beds') && selectedFloorId) {
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

  // Fetch beds when active tab is beds and selectedRoomId changes (fetch ALL beds for admin management)
  useEffect(() => {
    const fetchBeds = async () => {
      if (activeTab === 'beds' && selectedRoomId) {
        try {
          setLoading(true);
          const loadedBeds = await facilityService.listBedsByRoom(selectedRoomId, { all: true });
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

  // ----------------------------------------------------
  // Building CRUD Handlers (Branch 1)
  // ----------------------------------------------------
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
      setFormError(err.response?.data?.message || 'Không thể tạo tòa nhà.');
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

  // ----------------------------------------------------
  // Floor CRUD Handlers (Branch 2)
  // ----------------------------------------------------
  const handleOpenCreateFloor = () => {
    setFormFloorBuildingId(buildings[0]?._id || '');
    setFormFloorNumber('');
    setFormFloorName('');
    setFormFloorDescription('');
    setFormFloorIsActive(true);
    setFormError(null);
    setShowCreateFloorModal(true);
  };

  const handleOpenEditFloor = (f) => {
    setSelectedFloor(f);
    setFormFloorBuildingId(f.buildingId?._id || f.buildingId || '');
    setFormFloorNumber(f.floorNumber || '');
    setFormFloorName(f.name || '');
    setFormFloorDescription(f.description || '');
    setFormFloorIsActive(f.isActive !== false);
    setFormError(null);
    setShowEditFloorModal(true);
  };

  const handleOpenDeleteFloor = (f) => {
    setSelectedFloor(f);
    setShowDeleteFloorModal(true);
  };

  const handleCreateFloor = async (e) => {
    e.preventDefault();
    if (!formFloorBuildingId) return setFormError('Vui lòng chọn tòa nhà');
    if (!formFloorNumber) return setFormError('Số tầng là bắt buộc');

    try {
      setSubmitting(true);
      setFormError(null);
      await facilityService.createFloor({
        buildingId: formFloorBuildingId,
        floorNumber: Number(formFloorNumber),
        name: formFloorName.trim(),
        description: formFloorDescription.trim(),
      });
      setShowCreateFloorModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Không thể tạo tầng.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFloor = async (e) => {
    e.preventDefault();
    if (!selectedFloor?._id) return;
    if (!formFloorNumber) return setFormError('Số tầng là bắt buộc');

    try {
      setSubmitting(true);
      setFormError(null);
      await facilityService.updateFloor(selectedFloor._id, {
        floorNumber: Number(formFloorNumber),
        name: formFloorName.trim(),
        description: formFloorDescription.trim(),
        isActive: formFloorIsActive,
      });
      setShowEditFloorModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Cập nhật tầng thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFloor = async () => {
    if (!selectedFloor?._id) return;
    try {
      setSubmitting(true);
      await facilityService.deleteFloor(selectedFloor._id);
      setShowDeleteFloorModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Vô hiệu hóa tầng thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Room CRUD Handlers (Branch 2 - Create Room)
  // ----------------------------------------------------
  const handleOpenCreateRoom = () => {
    const defaultBld = buildings[0]?._id || '';
    setFormRoomBuildingId(defaultBld);
    const relatedFloors = floors.filter(f => f.buildingId === defaultBld || f.buildingId?._id === defaultBld);
    setFormRoomFloorId(relatedFloors[0]?._id || '');
    setFormRoomNumber('');
    setFormRoomType('standard');
    setFormRoomCapacity(2);
    setFormRoomNotes('');
    setFormError(null);
    setShowCreateRoomModal(true);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!formRoomBuildingId) return setFormError('Vui lòng chọn tòa nhà');
    if (!formRoomFloorId) return setFormError('Vui lòng chọn tầng');
    if (!formRoomNumber.trim()) return setFormError('Số phòng là bắt buộc');
    if (formRoomCapacity < 1) return setFormError('Sức chứa phải từ 1 trở lên');

    try {
      setSubmitting(true);
      setFormError(null);
      await facilityService.createRoom({
        buildingId: formRoomBuildingId,
        floorId: formRoomFloorId,
        roomNumber: formRoomNumber.trim(),
        roomType: formRoomType,
        capacity: Number(formRoomCapacity),
        notes: formRoomNotes.trim(),
      });
      setShowCreateRoomModal(false);
      // Refresh current floor's rooms if activeTab is rooms and matches
      if (activeTab === 'rooms' && selectedFloorId === formRoomFloorId) {
        setLoading(true);
        const loadedRooms = await facilityService.listRoomsByFloor(selectedFloorId);
        setRooms(loadedRooms || []);
      }
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Tạo phòng thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Room Edit/Delete Handlers (Branch 3)
  // ----------------------------------------------------
  const handleOpenEditRoom = (r) => {
    setSelectedRoom(r);
    setFormRoomBuildingId(r.buildingId?._id || r.buildingId || '');
    setFormRoomFloorId(r.floorId?._id || r.floorId || '');
    setFormRoomNumber(r.roomNumber || '');
    setFormRoomType(r.roomType || 'standard');
    setFormRoomCapacity(r.capacity || 2);
    setFormRoomStatus(r.status || 'available');
    setFormRoomNotes(r.notes || '');
    setFormError(null);
    setShowEditRoomModal(true);
  };

  const handleOpenDeleteRoom = (r) => {
    setSelectedRoom(r);
    setShowDeleteRoomModal(true);
  };

  const handleUpdateRoom = async (e) => {
    e.preventDefault();
    if (!selectedRoom?._id) return;
    if (!formRoomNumber.trim()) return setFormError('Số phòng là bắt buộc');
    if (formRoomCapacity < 1) return setFormError('Sức chứa phải từ 1 trở lên');

    try {
      setSubmitting(true);
      setFormError(null);
      await facilityService.updateRoom(selectedRoom._id, {
        roomNumber: formRoomNumber.trim(),
        roomType: formRoomType,
        capacity: Number(formRoomCapacity),
        status: formRoomStatus,
        notes: formRoomNotes.trim(),
      });
      setShowEditRoomModal(false);
      // Refresh current floor's rooms
      if (selectedFloorId) {
        setLoading(true);
        const loadedRooms = await facilityService.listRoomsByFloor(selectedFloorId);
        setRooms(loadedRooms || []);
      }
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Cập nhật phòng thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom?._id) return;
    try {
      setSubmitting(true);
      await facilityService.deleteRoom(selectedRoom._id);
      setShowDeleteRoomModal(false);
      // Refresh current floor's rooms
      if (selectedFloorId) {
        setLoading(true);
        const loadedRooms = await facilityService.listRoomsByFloor(selectedFloorId);
        setRooms(loadedRooms || []);
      }
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Đóng phòng thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Bed CRUD Handlers (Branch 3)
  // ----------------------------------------------------
  const handleOpenCreateBed = () => {
    setFormBedCode('');
    setFormBedType('normal');
    setFormBedCondition('good');
    setFormBedStatus('available');
    setFormBedNotes('');
    setFormError(null);
    setShowCreateBedModal(true);
  };

  const handleOpenEditBed = (b) => {
    setSelectedBed(b);
    setFormBedCode(b.bedCode || '');
    setFormBedType(b.bedType || 'normal');
    setFormBedCondition(b.condition || 'good');
    setFormBedStatus(b.status || 'available');
    setFormBedNotes(b.notes || '');
    setFormError(null);
    setShowEditBedModal(true);
  };

  const handleCreateBed = async (e) => {
    e.preventDefault();
    if (!selectedRoomId) return setFormError('Vui lòng chọn phòng');
    if (!formBedCode.trim()) return setFormError('Mã giường là bắt buộc');

    try {
      setSubmitting(true);
      setFormError(null);
      await facilityService.createBed({
        roomId: selectedRoomId,
        bedCode: formBedCode.trim(),
        bedType: formBedType,
        condition: formBedCondition,
        notes: formBedNotes.trim(),
      });
      setShowCreateBedModal(false);
      // Refresh beds for this room
      setLoading(true);
      const loadedBeds = await facilityService.listBedsByRoom(selectedRoomId, { all: true });
      setBeds(loadedBeds || []);
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Tạo giường thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBed = async (e) => {
    e.preventDefault();
    if (!selectedBed?._id) return;
    if (!formBedCode.trim()) return setFormError('Mã giường là bắt buộc');

    try {
      setSubmitting(true);
      setFormError(null);
      await facilityService.updateBed(selectedBed._id, {
        bedCode: formBedCode.trim(),
        bedType: formBedType,
        condition: formBedCondition,
        status: formBedStatus,
        notes: formBedNotes.trim(),
      });
      setShowEditBedModal(false);
      // Refresh beds for this room
      setLoading(true);
      const loadedBeds = await facilityService.listBedsByRoom(selectedRoomId, { all: true });
      setBeds(loadedBeds || []);
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Cập nhật giường thất bại.');
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
        {activeTab === 'floors' && (
          <button onClick={handleOpenCreateFloor} className="fac-btn-primary">
            <Plus size={16} /> Thêm Tầng
          </button>
        )}
        {activeTab === 'rooms' && (
          <button onClick={handleOpenCreateRoom} className="fac-btn-primary">
            <Plus size={16} /> Thêm Phòng
          </button>
        )}
        {activeTab === 'beds' && selectedRoomId && (
          <button onClick={handleOpenCreateBed} className="fac-btn-primary">
            <Plus size={16} /> Thêm Giường
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

      {/* TAB CONTENT: FLOORS (CRUD Enabled in Branch 2) */}
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
          </div>

          {loading && floors.length === 0 ? (
            <div className="fac-loading-box">
              <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
              <p>Đang tải dữ liệu tầng...</p>
            </div>
          ) : floors.filter(f => !selectedBuildingId || f.buildingId === selectedBuildingId || f.buildingId?._id === selectedBuildingId).length === 0 ? (
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
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {floors
                    .filter(f => !selectedBuildingId || f.buildingId === selectedBuildingId || f.buildingId?._id === selectedBuildingId)
                    .map((f) => (
                      <tr key={f._id}>
                        <td>Tầng {f.floorNumber}</td>
                        <td style={{ fontWeight: '550' }}>{f.name || `Tầng ${f.floorNumber}`}</td>
                        <td>{f.building?.name || f.buildingId?.name || '—'}</td>
                        <td>{f.description || '—'}</td>
                        <td>
                          <span className={`fac-badge ${f.isActive !== false ? 'fac-badge--success' : 'fac-badge--danger'}`}>
                            {f.isActive !== false ? 'Hoạt động' : 'Tạm khóa'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenEditFloor(f)}
                            className="fac-btn-icon fac-btn-icon--edit"
                            title="Sửa"
                          >
                            <Edit size={16} />
                          </button>
                          {f.isActive !== false && (
                            <button
                              onClick={() => handleOpenDeleteFloor(f)}
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

      {/* TAB CONTENT: ROOMS (Creation Enabled in Branch 2) */}
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
                  .filter(f => (f.buildingId === selectedBuildingId || f.buildingId?._id === selectedBuildingId) && f.isActive !== false)
                  .map(f => (
                    <option key={f._id} value={f._id}>{f.name || `Tầng ${f.floorNumber}`}</option>
                  ))}
              </select>
            </div>
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
              <Activity size={14} />
              <span>Quản lý danh sách phòng và giường.</span>
            </div>
          </div>

          {!selectedFloorId ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                Vui lòng chọn tòa nhà và tầng cụ thể để xem danh sách phòng.
              </div>
            </div>
          ) : loading && rooms.length === 0 ? (
            <div className="fac-loading-box">
              <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
              <p>Đang tải danh sách phòng...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                Không tìm thấy phòng nào ở tầng này. Bạn có thể nhấn nút "Thêm Phòng" để tạo mới.
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
                    <th style={{ textAlign: 'right' }}>Hành động</th>
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
                           r.status === 'full' ? 'Đã đầy' :
                           r.status === 'maintenance' ? 'Bảo trì' : 'Đóng'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenEditRoom(r)}
                          className="fac-btn-icon fac-btn-icon--edit"
                          title="Sửa"
                        >
                          <Edit size={16} />
                        </button>
                        {r.status !== 'closed' && (
                          <button
                            onClick={() => handleOpenDeleteRoom(r)}
                            className="fac-btn-icon fac-btn-icon--delete"
                            title="Xóa"
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

      {/* TAB CONTENT: BEDS */}
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
                  .filter(f => f.buildingId === selectedBuildingId || f.buildingId?._id === selectedBuildingId)
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
          </div>

          {!selectedRoomId ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                Vui lòng chọn tòa nhà, tầng và phòng cụ thể để xem danh sách giường.
              </div>
            </div>
          ) : loading && beds.length === 0 ? (
            <div className="fac-loading-box">
              <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
              <p>Đang tải danh sách giường...</p>
            </div>
          ) : beds.length === 0 ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                Không tìm thấy giường nào trong phòng này. Bạn có thể nhấn nút "Thêm Giường" để tạo mới.
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
                    <th>Ghi chú</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {beds.map((b) => (
                    <tr key={b._id}>
                      <td style={{ fontWeight: '600' }}>{b.bedCode}</td>
                      <td style={{ textTransform: 'capitalize' }}>{b.bedType}</td>
                      <td>
                        <span className={`fac-badge ${
                          b.status === 'available' ? 'fac-badge--success' :
                          b.status === 'occupied' ? 'fac-badge--danger' : 'fac-badge--warning'
                        }`}>
                          {b.status === 'available' ? 'Trống' :
                           b.status === 'occupied' ? 'Đang sử dụng' :
                           b.status === 'reserved' ? 'Đặt trước' : 'Bảo trì'}
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
                      <td>{b.notes || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenEditBed(b)}
                          className="fac-btn-icon fac-btn-icon--edit"
                          title="Sửa"
                        >
                          <Edit size={16} />
                        </button>
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

      {/* DEACTIVATE BUILDING CONFIRMATION MODAL */}
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

      {/* CREATE FLOOR MODAL */}
      {showCreateFloorModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowCreateFloorModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header">
              <h3>Thêm Tầng Mới</h3>
              <button onClick={() => setShowCreateFloorModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFloor}>
              <div className="fac-modal-body">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4">
                    {formError}
                  </div>
                )}
                <div className="fac-form-group">
                  <label>Chọn Tòa Nhà *</label>
                  <select
                    className="fac-form-control"
                    value={formFloorBuildingId}
                    onChange={(e) => setFormFloorBuildingId(e.target.value)}
                    required
                  >
                    {buildings.map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="fac-form-group">
                  <label>Số Tầng (Phải là số) *</label>
                  <input
                    type="number"
                    className="fac-form-control"
                    placeholder="Ví dụ: 1, 2, 3"
                    value={formFloorNumber}
                    onChange={(e) => setFormFloorNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="fac-form-group">
                  <label>Tên Tầng (Tùy chọn)</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder="Ví dụ: Tầng 1 - Khu A"
                    value={formFloorName}
                    onChange={(e) => setFormFloorName(e.target.value)}
                  />
                </div>
                <div className="fac-form-group">
                  <label>Mô Tả</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '80px' }}
                    placeholder="Nhập mô tả tầng..."
                    value={formFloorDescription}
                    onChange={(e) => setFormFloorDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowCreateFloorModal(false)} className="fac-btn fac-btn--secondary">
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

      {/* EDIT FLOOR MODAL */}
      {showEditFloorModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowEditFloorModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header">
              <h3>Chỉnh Sửa Tầng</h3>
              <button onClick={() => setShowEditFloorModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateFloor}>
              <div className="fac-modal-body">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4">
                    {formError}
                  </div>
                )}
                <div className="fac-form-group">
                  <label>Số Tầng *</label>
                  <input
                    type="number"
                    className="fac-form-control"
                    value={formFloorNumber}
                    onChange={(e) => setFormFloorNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="fac-form-group">
                  <label>Tên Tầng</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    value={formFloorName}
                    onChange={(e) => setFormFloorName(e.target.value)}
                  />
                </div>
                <div className="fac-form-group">
                  <label>Mô Tả</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '80px' }}
                    value={formFloorDescription}
                    onChange={(e) => setFormFloorDescription(e.target.value)}
                  />
                </div>
                <div className="fac-form-group flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="floorIsActive"
                    checked={formFloorIsActive}
                    onChange={(e) => setFormFloorIsActive(e.target.checked)}
                  />
                  <label htmlFor="floorIsActive" style={{ margin: 0, cursor: 'pointer' }}>Tầng đang hoạt động</label>
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowEditFloorModal(false)} className="fac-btn fac-btn--secondary">
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

      {/* DEACTIVATE FLOOR CONFIRMATION MODAL */}
      {showDeleteFloorModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowDeleteFloorModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header" style={{ background: '#fef2f2' }}>
              <h3 style={{ color: '#dc2626' }}>Vô Hiệu Hóa Tầng?</h3>
              <button onClick={() => setShowDeleteFloorModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="fac-modal-body">
              <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                <AlertTriangle size={36} className="text-red-500" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>
                    Bạn có chắc chắn muốn vô hiệu hóa tầng <strong>{selectedFloor?.name || `Tầng ${selectedFloor?.floorNumber}`}</strong>?
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Hành động này sẽ tạm khóa tầng này và chuyển trạng thái toàn bộ phòng thuộc tầng này sang Đóng (Closed).
                  </p>
                </div>
              </div>
            </div>
            <div className="fac-modal-footer">
              <button type="button" onClick={() => setShowDeleteFloorModal(false)} className="fac-btn fac-btn--secondary">
                Hủy
              </button>
              <button type="button" onClick={handleDeleteFloor} disabled={submitting} className="fac-btn fac-btn--danger">
                {submitting ? 'Đang khóa...' : 'Xác Nhận Khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ROOM MODAL */}
      {showCreateRoomModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowCreateRoomModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header">
              <h3>Thêm Phòng Mới</h3>
              <button onClick={() => setShowCreateRoomModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateRoom}>
              <div className="fac-modal-body">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4">
                    {formError}
                  </div>
                )}
                <div className="fac-form-group">
                  <label>Chọn Tòa Nhà *</label>
                  <select
                    className="fac-form-control"
                    value={formRoomBuildingId}
                    onChange={(e) => {
                      setFormRoomBuildingId(e.target.value);
                      const relatedFloors = floors.filter(f => f.buildingId === e.target.value || f.buildingId?._id === e.target.value);
                      setFormRoomFloorId(relatedFloors[0]?._id || '');
                    }}
                    required
                  >
                    <option value="">-- Chọn tòa nhà --</option>
                    {buildings.map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="fac-form-group">
                  <label>Chọn Tầng *</label>
                  <select
                    className="fac-form-control"
                    value={formRoomFloorId}
                    onChange={(e) => setFormRoomFloorId(e.target.value)}
                    required
                    disabled={!formRoomBuildingId}
                  >
                    <option value="">-- Chọn tầng --</option>
                    {floors
                      .filter(f => (f.buildingId === formRoomBuildingId || f.buildingId?._id === formRoomBuildingId) && f.isActive !== false)
                      .map(f => (
                        <option key={f._id} value={f._id}>{f.name || `Tầng ${f.floorNumber}`}</option>
                      ))}
                  </select>
                </div>
                <div className="fac-form-group">
                  <label>Số Phòng *</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder="Ví dụ: 101, 102, 201"
                    value={formRoomNumber}
                    onChange={(e) => setFormRoomNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fac-form-group">
                    <label>Loại Phòng</label>
                    <select
                      className="fac-form-control"
                      value={formRoomType}
                      onChange={(e) => setFormRoomType(e.target.value)}
                    >
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="icu">ICU</option>
                      <option value="isolation">Isolation</option>
                    </select>
                  </div>
                  <div className="fac-form-group">
                    <label>Sức Chứa (Giường) *</label>
                    <input
                      type="number"
                      className="fac-form-control"
                      min="1"
                      value={formRoomCapacity}
                      onChange={(e) => setFormRoomCapacity(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="fac-form-group">
                  <label>Ghi Chú</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '60px' }}
                    placeholder="Ghi chú thêm về phòng..."
                    value={formRoomNotes}
                    onChange={(e) => setFormRoomNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowCreateRoomModal(false)} className="fac-btn fac-btn--secondary">
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

      {/* EDIT ROOM MODAL */}
      {showEditRoomModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowEditRoomModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header">
              <h3>Chỉnh Sửa Phòng</h3>
              <button onClick={() => setShowEditRoomModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateRoom}>
              <div className="fac-modal-body">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4">
                    {formError}
                  </div>
                )}
                <div className="fac-form-group">
                  <label>Số Phòng *</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    value={formRoomNumber}
                    onChange={(e) => setFormRoomNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fac-form-group">
                    <label>Loại Phòng</label>
                    <select
                      className="fac-form-control"
                      value={formRoomType}
                      onChange={(e) => setFormRoomType(e.target.value)}
                    >
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="icu">ICU</option>
                      <option value="isolation">Isolation</option>
                    </select>
                  </div>
                  <div className="fac-form-group">
                    <label>Sức Chứa (Giường) *</label>
                    <input
                      type="number"
                      className="fac-form-control"
                      min="1"
                      value={formRoomCapacity}
                      onChange={(e) => setFormRoomCapacity(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="fac-form-group">
                  <label>Trạng Thái Phòng</label>
                  <select
                    className="fac-form-control"
                    value={formRoomStatus}
                    onChange={(e) => setFormRoomStatus(e.target.value)}
                  >
                    <option value="available">Còn giường / Trống</option>
                    <option value="full">Đã đầy</option>
                    <option value="maintenance">Bảo trì</option>
                    <option value="closed">Đóng / Tạm khóa</option>
                  </select>
                </div>
                <div className="fac-form-group">
                  <label>Ghi Chú</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '60px' }}
                    value={formRoomNotes}
                    onChange={(e) => setFormRoomNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowEditRoomModal(false)} className="fac-btn fac-btn--secondary">
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

      {/* DELETE ROOM MODAL */}
      {showDeleteRoomModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowDeleteRoomModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header" style={{ background: '#fef2f2' }}>
              <h3 style={{ color: '#dc2626' }}>Đóng Phòng?</h3>
              <button onClick={() => setShowDeleteRoomModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="fac-modal-body">
              <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                <AlertTriangle size={36} className="text-red-500" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>
                    Bạn có chắc chắn muốn đóng phòng <strong>{selectedRoom?.roomNumber}</strong>?
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Hành động này sẽ thiết lập trạng thái phòng thành Đóng (Closed) và tự động chuyển toàn bộ giường trong phòng này sang trạng thái Bảo trì (Maintenance).
                  </p>
                </div>
              </div>
            </div>
            <div className="fac-modal-footer">
              <button type="button" onClick={() => setShowDeleteRoomModal(false)} className="fac-btn fac-btn--secondary">
                Hủy
              </button>
              <button type="button" onClick={handleDeleteRoom} disabled={submitting} className="fac-btn fac-btn--danger">
                {submitting ? 'Đang đóng...' : 'Xác Nhận Đóng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE BED MODAL */}
      {showCreateBedModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowCreateBedModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header">
              <h3>Thêm Giường Mới</h3>
              <button onClick={() => setShowCreateBedModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateBed}>
              <div className="fac-modal-body">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4">
                    {formError}
                  </div>
                )}
                <div className="fac-form-group">
                  <label>Mã Giường *</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder="Ví dụ: G101A, G101B"
                    value={formBedCode}
                    onChange={(e) => setFormBedCode(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fac-form-group">
                    <label>Loại Giường</label>
                    <select
                      className="fac-form-control"
                      value={formBedType}
                      onChange={(e) => setFormBedType(e.target.value)}
                    >
                      <option value="normal">Normal</option>
                      <option value="electric">Electric</option>
                      <option value="icu">ICU</option>
                    </select>
                  </div>
                  <div className="fac-form-group">
                    <label>Tình Trạng</label>
                    <select
                      className="fac-form-control"
                      value={formBedCondition}
                      onChange={(e) => setFormBedCondition(e.target.value)}
                    >
                      <option value="good">Tốt</option>
                      <option value="fair">Trung bình</option>
                      <option value="broken">Hỏng</option>
                    </select>
                  </div>
                </div>
                <div className="fac-form-group">
                  <label>Ghi Chú</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '60px' }}
                    placeholder="Nhập ghi chú giường..."
                    value={formBedNotes}
                    onChange={(e) => setFormBedNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowCreateBedModal(false)} className="fac-btn fac-btn--secondary">
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

      {/* EDIT BED MODAL */}
      {showEditBedModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowEditBedModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header">
              <h3>Chỉnh Sửa Giường</h3>
              <button onClick={() => setShowEditBedModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateBed}>
              <div className="fac-modal-body">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4">
                    {formError}
                  </div>
                )}
                <div className="fac-form-group">
                  <label>Mã Giường *</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    value={formBedCode}
                    onChange={(e) => setFormBedCode(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fac-form-group">
                    <label>Loại Giường</label>
                    <select
                      className="fac-form-control"
                      value={formBedType}
                      onChange={(e) => setFormBedType(e.target.value)}
                    >
                      <option value="normal">Normal</option>
                      <option value="electric">Electric</option>
                      <option value="icu">ICU</option>
                    </select>
                  </div>
                  <div className="fac-form-group">
                    <label>Tình Trạng</label>
                    <select
                      className="fac-form-control"
                      value={formBedCondition}
                      onChange={(e) => setFormBedCondition(e.target.value)}
                    >
                      <option value="good">Tốt</option>
                      <option value="fair">Trung bình</option>
                      <option value="broken">Hỏng</option>
                    </select>
                  </div>
                </div>
                <div className="fac-form-group">
                  <label>Trạng Thái Giường</label>
                  <select
                    className="fac-form-control"
                    value={formBedStatus}
                    onChange={(e) => setFormBedStatus(e.target.value)}
                    disabled={selectedBed?.status === 'occupied'}
                  >
                    <option value="available">Trống</option>
                    <option value="occupied" disabled>Đang sử dụng</option>
                    <option value="reserved">Đặt trước</option>
                    <option value="maintenance">Bảo trì</option>
                  </select>
                  {selectedBed?.status === 'occupied' && (
                    <p className="text-xs text-amber-600 mt-1">Giường đang được sử dụng bởi cư dân, không thể chuyển trạng thái thủ công.</p>
                  )}
                </div>
                <div className="fac-form-group">
                  <label>Ghi Chú</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '60px' }}
                    value={formBedNotes}
                    onChange={(e) => setFormBedNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowEditBedModal(false)} className="fac-btn fac-btn--secondary">
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
    </div>
  );
}
