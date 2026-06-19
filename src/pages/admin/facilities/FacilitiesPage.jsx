import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Activity,
  Wrench,
  Calendar,
  MapPin,
  Grid,
  List,
  BarChart3
} from 'lucide-react';
import facilityService from '../../../services/facility.service';
import '../../../styles/admin/FacilitiesPage.css';

export default function FacilitiesPage({ defaultTab = 'buildings' }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedBuildingStats, setSelectedBuildingStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);

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

  // 4. Modals & Form States for Bed (Branch 3 - Bed Create & Edit, Branch 4 - Bed Delete & Visual Grid)
  const [showCreateBedModal, setShowCreateBedModal] = useState(false);
  const [showEditBedModal, setShowEditBedModal] = useState(false);
  const [showDeleteBedModal, setShowDeleteBedModal] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);

  const [formBedCode, setFormBedCode] = useState('');
  const [formBedType, setFormBedType] = useState('normal');
  const [formBedCondition, setFormBedCondition] = useState('good');
  const [formBedStatus, setFormBedStatus] = useState('available');
  const [formBedNotes, setFormBedNotes] = useState('');
  const [bedViewMode, setBedViewMode] = useState('grid'); // 'grid' or 'table'

  // 5. Modals & Form States for Equipment CRUD (Branch 4)
  const [equipment, setEquipment] = useState([]);
  const [showCreateEqModal, setShowCreateEqModal] = useState(false);
  const [showEditEqModal, setShowEditEqModal] = useState(false);
  const [showDeleteEqModal, setShowDeleteEqModal] = useState(false);
  const [selectedEq, setSelectedEq] = useState(null);

  const [formEqCode, setFormEqCode] = useState('');
  const [formEqName, setFormEqName] = useState('');
  const [formEqCategory, setFormEqCategory] = useState('');
  const [formEqStatus, setFormEqStatus] = useState('available');
  const [formEqLocationType, setFormEqLocationType] = useState('storage');
  const [formEqBuildingId, setFormEqBuildingId] = useState('');
  const [formEqFloorId, setFormEqFloorId] = useState('');
  const [formEqRoomId, setFormEqRoomId] = useState('');
  const [formEqBedId, setFormEqBedId] = useState('');
  const [formEqMaintenanceDueAt, setFormEqMaintenanceDueAt] = useState('');
  const [formEqNotes, setFormEqNotes] = useState('');

  // Dynamic lists in modal
  const [modalFloors, setModalFloors] = useState([]);
  const [modalRooms, setModalRooms] = useState([]);
  const [modalBeds, setModalBeds] = useState([]);

  // Filters for Equipment
  const [eqSearchTerm, setEqSearchTerm] = useState('');
  const [eqStatusFilter, setEqStatusFilter] = useState('');

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
      
      const [loadedBuildings, loadedFloors, statsData] = await Promise.all([
        facilityService.listBuildings({ activeOnly: false }),
        facilityService.listFloors({ activeOnly: false }),
        facilityService.getStats(),
      ]);

      setBuildings(loadedBuildings || []);
      setFloors(loadedFloors || []);

      // Use real counts from /stats endpoint
      setStats({
        buildingsCount: statsData?.buildingsCount ?? loadedBuildings?.length ?? 0,
        floorsCount: statsData?.floorsCount ?? loadedFloors?.length ?? 0,
        roomsCount: statsData?.roomsCount ?? 0,
        bedsCount: statsData?.bedsCount ?? 0,
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

  // Fetch equipment list when activeTab is equipment
  useEffect(() => {
    const fetchEqData = async () => {
      if (activeTab === 'equipment') {
        try {
          setLoading(true);
          const loadedEq = await facilityService.listEquipment();
          setEquipment(loadedEq || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchEqData();
  }, [activeTab]);

  // Modal Building selection change -> Filter floors
  useEffect(() => {
    if (formEqBuildingId) {
      const fls = floors.filter(f => f.buildingId === formEqBuildingId || f.buildingId?._id === formEqBuildingId);
      setModalFloors(fls);
    } else {
      setModalFloors([]);
    }
    setModalRooms([]);
    setModalBeds([]);
    setFormEqFloorId('');
    setFormEqRoomId('');
    setFormEqBedId('');
  }, [formEqBuildingId, floors]);

  // Modal Floor change -> Fetch rooms
  useEffect(() => {
    const fetchModalRooms = async () => {
      if (formEqFloorId) {
        try {
          const rms = await facilityService.listRoomsByFloor(formEqFloorId);
          setModalRooms(rms || []);
        } catch (err) {
          console.error(err);
        }
      } else {
        setModalRooms([]);
      }
      setModalBeds([]);
      setFormEqRoomId('');
      setFormEqBedId('');
    };
    fetchModalRooms();
  }, [formEqFloorId]);

  // Modal Room change -> Fetch beds
  useEffect(() => {
    const fetchModalBeds = async () => {
      if (formEqRoomId) {
        try {
          const bds = await facilityService.listBedsByRoom(formEqRoomId, { all: true });
          setModalBeds(bds || []);
        } catch (err) {
          console.error(err);
        }
      } else {
        setModalBeds([]);
      }
      setFormEqBedId('');
    };
    fetchModalBeds();
  }, [formEqRoomId]);

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

  const handleOpenStats = async (b) => {
    try {
      setSelectedBuilding(b);
      setLoadingStats(true);
      setStatsError(null);
      setShowStatsModal(true);
      const data = await facilityService.getBuildingStats(b._id);
      setSelectedBuildingStats(data);
    } catch (err) {
      console.error(err);
      setStatsError(t('facilities.statsError'));
    } finally {
      setLoadingStats(false);
    }
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

  const handleOpenDeleteBed = (b) => {
    setSelectedBed(b);
    setShowDeleteBedModal(true);
  };

  const handleDeleteBed = async () => {
    if (!selectedBed?._id) return;
    try {
      setSubmitting(true);
      await facilityService.deleteBed(selectedBed._id);
      setShowDeleteBedModal(false);
      // Refresh beds for this room
      setLoading(true);
      const loadedBeds = await facilityService.listBedsByRoom(selectedRoomId, { all: true });
      setBeds(loadedBeds || []);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Xóa giường thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Equipment CRUD Handlers (Branch 4)
  // ----------------------------------------------------
  const handleOpenCreateEq = () => {
    setFormEqCode('');
    setFormEqName('');
    setFormEqCategory('');
    setFormEqStatus('available');
    setFormEqLocationType('storage');
    setFormEqBuildingId('');
    setFormEqFloorId('');
    setFormEqRoomId('');
    setFormEqBedId('');
    setFormEqMaintenanceDueAt('');
    setFormEqNotes('');
    setFormError(null);
    setShowCreateEqModal(true);
  };

  const handleOpenEditEq = (eq) => {
    setSelectedEq(eq);
    setFormEqCode(eq.code || '');
    setFormEqName(eq.name || '');
    setFormEqCategory(eq.category || '');
    setFormEqStatus(eq.status || 'available');
    setFormEqLocationType(eq.locationType || 'storage');
    setFormEqBuildingId(eq.buildingId?._id || eq.buildingId || '');
    setFormEqFloorId(eq.floorId?._id || eq.floorId || '');
    setFormEqRoomId(eq.roomId?._id || eq.roomId || '');
    setFormEqBedId(eq.bedId?._id || eq.bedId || '');
    setFormEqMaintenanceDueAt(eq.maintenanceDueAt ? eq.maintenanceDueAt.substring(0, 10) : '');
    setFormEqNotes(eq.notes || '');
    setFormError(null);
    setShowEditEqModal(true);
  };

  const handleOpenDeleteEq = (eq) => {
    setSelectedEq(eq);
    setShowDeleteEqModal(true);
  };

  const handleCreateEq = async (e) => {
    e.preventDefault();
    if (!formEqCode.trim()) return setFormError('Mã thiết bị là bắt buộc');
    if (!formEqName.trim()) return setFormError('Tên thiết bị là bắt buộc');

    try {
      setSubmitting(true);
      setFormError(null);
      await facilityService.createEquipment({
        code: formEqCode.trim(),
        name: formEqName.trim(),
        category: formEqCategory.trim(),
        status: formEqStatus,
        locationType: formEqLocationType,
        buildingId: formEqLocationType !== 'storage' ? formEqBuildingId || undefined : undefined,
        floorId: (formEqLocationType === 'floor' || formEqLocationType === 'room' || formEqLocationType === 'bed') ? formEqFloorId || undefined : undefined,
        roomId: (formEqLocationType === 'room' || formEqLocationType === 'bed') ? formEqRoomId || undefined : undefined,
        bedId: formEqLocationType === 'bed' ? formEqBedId || undefined : undefined,
        maintenanceDueAt: formEqMaintenanceDueAt || undefined,
        notes: formEqNotes.trim(),
      });
      setShowCreateEqModal(false);
      // Refresh equipment list
      const loadedEq = await facilityService.listEquipment();
      setEquipment(loadedEq || []);
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Thêm thiết bị thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEq = async (e) => {
    e.preventDefault();
    if (!selectedEq?._id) return;
    if (!formEqCode.trim()) return setFormError('Mã thiết bị là bắt buộc');
    if (!formEqName.trim()) return setFormError('Tên thiết bị là bắt buộc');

    try {
      setSubmitting(true);
      setFormError(null);
      await facilityService.updateEquipment(selectedEq._id, {
        code: formEqCode.trim(),
        name: formEqName.trim(),
        category: formEqCategory.trim(),
        status: formEqStatus,
        locationType: formEqLocationType,
        buildingId: formEqLocationType !== 'storage' ? formEqBuildingId || null : null,
        floorId: (formEqLocationType === 'floor' || formEqLocationType === 'room' || formEqLocationType === 'bed') ? formEqFloorId || null : null,
        roomId: (formEqLocationType === 'room' || formEqLocationType === 'bed') ? formEqRoomId || null : null,
        bedId: formEqLocationType === 'bed' ? formEqBedId || null : null,
        maintenanceDueAt: formEqMaintenanceDueAt || null,
        notes: formEqNotes.trim(),
      });
      setShowEditEqModal(false);
      // Refresh equipment list
      const loadedEq = await facilityService.listEquipment();
      setEquipment(loadedEq || []);
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Cập nhật thiết bị thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEq = async () => {
    if (!selectedEq?._id) return;
    try {
      setSubmitting(true);
      await facilityService.deleteEquipment(selectedEq._id);
      setShowDeleteEqModal(false);
      // Refresh equipment list
      const loadedEq = await facilityService.listEquipment();
      setEquipment(loadedEq || []);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Xóa thiết bị thất bại.');
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
          <h1>{t('facilities.pageTitle')}</h1>
          <p>{t('facilities.pageSubtitle')}</p>
        </div>
        {activeTab === 'buildings' && (
          <button onClick={handleOpenCreate} className="fac-btn-primary">
            <Plus size={16} /> {t('facilities.addBuilding')}
          </button>
        )}
        {activeTab === 'floors' && (
          <button onClick={handleOpenCreateFloor} className="fac-btn-primary">
            <Plus size={16} /> {t('facilities.addFloor')}
          </button>
        )}
        {activeTab === 'rooms' && (
          <button onClick={handleOpenCreateRoom} className="fac-btn-primary">
            <Plus size={16} /> {t('facilities.addRoom')}
          </button>
        )}
        {activeTab === 'beds' && selectedRoomId && (
          <button onClick={handleOpenCreateBed} className="fac-btn-primary">
            <Plus size={16} /> {t('facilities.addBed')}
          </button>
        )}
        {activeTab === 'equipment' && (
          <button onClick={handleOpenCreateEq} className="fac-btn-primary">
            <Plus size={16} /> {t('facilities.addEquipment')}
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
            <span className="fac-stat-label">{t('facilities.totalBuildings')}</span>
            <span className="fac-stat-value">{stats.buildingsCount}</span>
          </div>
        </div>

        <div className="fac-stat-card">
          <div className="fac-stat-icon-wrapper">
            <Layers size={20} />
          </div>
          <div className="fac-stat-info">
            <span className="fac-stat-label">{t('facilities.totalFloors')}</span>
            <span className="fac-stat-value">{stats.floorsCount}</span>
          </div>
        </div>

        <div className="fac-stat-card">
          <div className="fac-stat-icon-wrapper">
            <DoorOpen size={20} />
          </div>
          <div className="fac-stat-info">
            <span className="fac-stat-label">{t('facilities.totalRooms')}</span>
            <span className="fac-stat-value">{stats.roomsCount}</span>
          </div>
        </div>

        <div className="fac-stat-card">
          <div className="fac-stat-icon-wrapper">
            <BedIcon size={20} />
          </div>
          <div className="fac-stat-info">
            <span className="fac-stat-label">{t('facilities.totalBeds')}</span>
            <span className="fac-stat-value">{stats.bedsCount}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fac-tab-bar">
        <button
          onClick={() => handleTabChange('buildings')}
          className={`fac-tab-btn ${activeTab === 'buildings' ? 'active' : ''}`}
        >
          <Building size={16} /> {t('facilities.tabBuildings')}
        </button>
        <button
          onClick={() => handleTabChange('floors')}
          className={`fac-tab-btn ${activeTab === 'floors' ? 'active' : ''}`}
        >
          <Layers size={16} /> {t('facilities.tabFloors')}
        </button>
        <button
          onClick={() => handleTabChange('rooms')}
          className={`fac-tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
        >
          <DoorOpen size={16} /> {t('facilities.tabRooms')}
        </button>
        <button
          onClick={() => handleTabChange('beds')}
          className={`fac-tab-btn ${activeTab === 'beds' ? 'active' : ''}`}
        >
          <BedIcon size={16} /> {t('facilities.tabBeds')}
        </button>
        <button
          onClick={() => handleTabChange('equipment')}
          className={`fac-tab-btn ${activeTab === 'equipment' ? 'active' : ''}`}
        >
          <Activity size={16} /> {t('facilities.tabEquipment')}
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
                placeholder={t('facilities.searchBuilding')}
                className="fac-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading && buildings.length === 0 ? (
            <div className="fac-loading-box">
              <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
              <p>{t('facilities.loadingBuildings')}</p>
            </div>
          ) : filteredBuildings.length === 0 ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                {t('facilities.emptyBuildings')}
              </div>
            </div>
          ) : (
            <div className="fac-table-card">
              <table className="fac-table">
                <thead>
                  <tr>
                    <th>{t('facilities.colBuildingCode')}</th>
                    <th>{t('facilities.colBuildingName')}</th>
                    <th>{t('facilities.colAddress')}</th>
                    <th>{t('facilities.colDescription2')}</th>
                    <th>{t('facilities.colStatus')}</th>
                    <th style={{ textAlign: 'right' }}>{t('facilities.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuildings.map((b) => (
                    <tr key={b._id}>
                      <td 
                        onClick={() => handleOpenStats(b)}
                        style={{ fontWeight: '600', color: '#4f46e5', cursor: 'pointer' }}
                        title={t('facilities.viewStats')}
                      >
                        {b.code}
                      </td>
                      <td 
                        onClick={() => handleOpenStats(b)}
                        style={{ fontWeight: '550', color: '#1e293b', cursor: 'pointer' }}
                        title={t('facilities.viewStats')}
                      >
                        {b.name}
                      </td>
                      <td>{b.address || '—'}</td>
                      <td>{b.description || '—'}</td>
                      <td>
                        <span className={`fac-badge ${b.isActive !== false ? 'fac-badge--success' : 'fac-badge--danger'}`}>
                          {b.isActive !== false ? t('facilities.active') : t('facilities.inactive')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenStats(b)}
                          className="fac-btn-icon fac-btn-icon--stats"
                          title={t('facilities.viewStats')}
                          style={{ marginRight: '4px' }}
                        >
                          <BarChart3 size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="fac-btn-icon fac-btn-icon--edit"
                          title={t('facilities.edit')}
                        >
                          <Edit size={16} />
                        </button>
                        {b.isActive !== false && (
                          <button
                            onClick={() => handleOpenDelete(b)}
                            className="fac-btn-icon fac-btn-icon--delete"
                            title={t('facilities.delete')}
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

      {/* TAB CONTENT: FLOORS */}
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
                <option value="">{t('facilities.selectBuilding')}</option>
                {buildings.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {loading && floors.length === 0 ? (
            <div className="fac-loading-box">
              <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
              <p>{t('facilities.loadingFloors')}</p>
            </div>
          ) : floors.filter(f => !selectedBuildingId || f.buildingId === selectedBuildingId || f.buildingId?._id === selectedBuildingId).length === 0 ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                {t('facilities.emptyFloors')}
              </div>
            </div>
          ) : (
            <div className="fac-table-card">
              <table className="fac-table">
                <thead>
                  <tr>
                    <th>{t('facilities.colFloorNumber')}</th>
                    <th>{t('facilities.colFloorName')}</th>
                    <th>{t('facilities.colBuilding')}</th>
                    <th>{t('facilities.colDescription2')}</th>
                    <th>{t('facilities.colStatus')}</th>
                    <th style={{ textAlign: 'right' }}>{t('facilities.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {floors
                    .filter(f => !selectedBuildingId || f.buildingId === selectedBuildingId || f.buildingId?._id === selectedBuildingId)
                    .map((f) => (
                      <tr key={f._id}>
                        <td>{t('facilities.floor')} {f.floorNumber}</td>
                        <td style={{ fontWeight: '550' }}>{f.name || `${t('facilities.floor')} ${f.floorNumber}`}</td>
                        <td>{f.building?.name || f.buildingId?.name || '—'}</td>
                        <td>{f.description || '—'}</td>
                        <td>
                          <span className={`fac-badge ${f.isActive !== false ? 'fac-badge--success' : 'fac-badge--danger'}`}>
                            {f.isActive !== false ? t('facilities.active') : t('facilities.inactive')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenEditFloor(f)}
                            className="fac-btn-icon fac-btn-icon--edit"
                            title={t('facilities.edit')}
                          >
                            <Edit size={16} />
                          </button>
                          {f.isActive !== false && (
                            <button
                              onClick={() => handleOpenDeleteFloor(f)}
                              className="fac-btn-icon fac-btn-icon--delete"
                              title={t('facilities.delete')}
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
                <option value="">{t('facilities.selectBuilding')}</option>
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
                <option value="">{t('facilities.selectFloor')}</option>
                {floors
                  .filter(f => f.buildingId === selectedBuildingId || f.buildingId?._id === selectedBuildingId)
                  .map(f => (
                    <option key={f._id} value={f._id}>{f.name || `${t('facilities.floor')} ${f.floorNumber}`}</option>
                  ))}
              </select>

              <select
                className="fac-form-control"
                style={{ borderRadius: '12px' }}
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                disabled={!selectedFloorId}
              >
                <option value="">{t('facilities.selectRoom')}</option>
                {rooms.map(r => (
                  <option key={r._id} value={r._id}>{t('facilities.room')} {r.roomNumber}</option>
                ))}
              </select>
            </div>

            {selectedRoomId && beds.length > 0 && (
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
                <button
                  type="button"
                  onClick={() => setBedViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    bedViewMode === 'grid' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Grid size={14} /> {t('facilities.viewGrid')}
                </button>
                <button
                  type="button"
                  onClick={() => setBedViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    bedViewMode === 'table' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List size={14} /> {t('facilities.viewTable')}
                </button>
              </div>
            )}
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
              <p>{t('facilities.loadingBeds')}</p>
            </div>
          ) : beds.length === 0 ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                {t('facilities.emptyBeds')}
              </div>
            </div>
          ) : bedViewMode === 'grid' ? (
            /* VISUAL GRID VIEW (PREMIUM REDESIGN) */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fadeIn">
              {beds.map((b) => {
                const isAvailable = b.status === 'available';
                const isOccupied  = b.status === 'occupied';
                const isReserved  = b.status === 'reserved';

                const statusColor = isAvailable ? '#10b981' : isOccupied ? '#f43f5e' : isReserved ? '#8b5cf6' : '#f59e0b';
                const statusBg    = isAvailable ? 'rgba(16,185,129,0.08)' : isOccupied ? 'rgba(244,63,94,0.07)' : isReserved ? 'rgba(139,92,246,0.08)' : 'rgba(245,158,11,0.08)';
                const statusLabel = isAvailable ? t('facilities.statusAvailable') : isOccupied ? t('facilities.statusOccupied') : isReserved ? t('facilities.statusReserved') : t('facilities.statusMaintenance');

                const condColor = b.condition === 'good' ? '#10b981' : b.condition === 'fair' ? '#f59e0b' : '#f43f5e';
                const condLabel = b.condition === 'good' ? t('facilities.conditionGood') : b.condition === 'fair' ? t('facilities.conditionFair') : t('facilities.conditionBroken');

                const bedTypeLabel = {
                  normal: t('facilities.bedTypeNormal'), electric: t('facilities.bedTypeElectric'), icu: t('facilities.bedTypeIcu'), recliner: t('facilities.bedTypeRecliner'), stretcher: t('facilities.bedTypeStretcher')
                }[b.bedType] || b.bedType;

                return (
                  <div
                    key={b._id}
                    style={{
                      background: '#fff',
                      borderRadius: '16px',
                      border: `1.5px solid ${statusColor}30`,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'default',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${statusColor}25`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
                  >
                    {/* Status stripe at top */}
                    <div style={{ height: '4px', background: `linear-gradient(90deg, ${statusColor}, ${statusColor}99)` }} />

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '12px',
                          background: `linear-gradient(135deg, ${statusColor}22, ${statusColor}44)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: statusColor, flexShrink: 0
                        }}>
                          <BedIcon size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '15px', color: '#1e293b', letterSpacing: '0.01em' }}>{b.bedCode}</div>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center',
                            background: statusBg, color: statusColor,
                            fontSize: '11px', fontWeight: '600',
                            padding: '1px 8px', borderRadius: '20px', marginTop: '2px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor, marginRight: '5px', display: 'inline-block' }} />
                            {statusLabel}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleOpenEditBed(b)}
                          title={t('facilities.edit')}
                          style={{
                            width: '30px', height: '30px', borderRadius: '8px', border: 'none',
                            background: '#eff6ff', color: '#3b82f6', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                          onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                        >
                          <Edit size={13} />
                        </button>
                        {b.status !== 'occupied' && (
                          <button
                            onClick={() => handleOpenDeleteBed(b)}
                            title={t('facilities.delete')}
                            style={{
                              width: '30px', height: '30px', borderRadius: '8px', border: 'none',
                              background: '#fff1f2', color: '#f43f5e', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#ffe4e6'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff1f2'}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '0 14px 14px' }}>
                      {/* Bed type tag */}
                      <div style={{ marginBottom: '10px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: '500', color: '#64748b',
                          background: '#f1f5f9', borderRadius: '6px',
                          padding: '3px 10px', display: 'inline-block'
                        }}>
                          {bedTypeLabel}
                        </span>
                      </div>

                      {/* Divider */}
                      <div style={{ height: '1px', background: '#f1f5f9', margin: '0 0 10px' }} />

                      {/* Info rows */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t('facilities.statusLabel')}</span>
                          <span style={{
                            fontSize: '12px', fontWeight: '600', color: statusColor,
                            background: statusBg, padding: '2px 8px', borderRadius: '6px'
                          }}>
                            {statusLabel}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t('facilities.conditionLabel')}</span>
                          <span style={{
                            fontSize: '12px', fontWeight: '600', color: condColor,
                            background: `${condColor}14`, padding: '2px 8px', borderRadius: '6px'
                          }}>
                            {condLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="fac-table-card">
              <table className="fac-table">
                <thead>
                  <tr>
                    <th>{t('facilities.colBedCode')}</th>
                    <th>{t('facilities.colBedType')}</th>
                    <th>{t('facilities.colStatus')}</th>
                    <th>{t('facilities.colCondition')}</th>
                    <th>{t('facilities.colNotes')}</th>
                    <th style={{ textAlign: 'right' }}>{t('facilities.colActions')}</th>
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
                          {b.status === 'available' ? t('facilities.statusAvailable') :
                           b.status === 'occupied' ? t('facilities.statusOccupied') :
                           b.status === 'reserved' ? t('facilities.statusReserved') : t('facilities.statusMaintenance')}
                        </span>
                      </td>
                      <td>
                        <span className={`fac-badge ${
                          b.condition === 'good' ? 'fac-badge--success' :
                          b.condition === 'fair' ? 'fac-badge--warning' : 'fac-badge--danger'
                        }`}>
                          {b.condition === 'good' ? t('facilities.conditionGood') : b.condition === 'fair' ? t('facilities.conditionFair') : t('facilities.conditionBroken')}
                        </span>
                      </td>
                      <td>{b.notes || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenEditBed(b)}
                          className="fac-btn-icon fac-btn-icon--edit"
                          title={t('facilities.edit')}
                        >
                          <Edit size={16} />
                        </button>
                        {b.status !== 'occupied' && (
                          <button
                            onClick={() => handleOpenDeleteBed(b)}
                            className="fac-btn-icon fac-btn-icon--delete"
                            title={t('facilities.delete')}
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

      {/* TAB CONTENT: MEDICAL EQUIPMENT (Branch 4) */}
      {activeTab === 'equipment' && (
        <>
          <div className="fac-action-row">
            <div className="fac-search-wrapper">
              <Search className="fac-search-icon" size={16} />
              <input
                type="text"
                placeholder={t('facilities.searchEquipment')}
                className="fac-search-input"
                value={eqSearchTerm}
                onChange={(e) => setEqSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="fac-form-control"
                style={{ width: '180px', borderRadius: '12px' }}
                value={eqStatusFilter}
                onChange={(e) => setEqStatusFilter(e.target.value)}
              >
                <option value="">{t('facilities.filterStatus')}</option>
                <option value="available">{t('facilities.equipStatusAvailable')}</option>
                <option value="in_use">{t('facilities.equipStatusInUse')}</option>
                <option value="maintenance">{t('facilities.equipStatusMaintenance')}</option>
                <option value="retired">{t('facilities.equipStatusRetired')}</option>
              </select>
            </div>
          </div>

          {loading && equipment.length === 0 ? (
            <div className="fac-loading-box">
              <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
              <p>{t('facilities.loadingEquipment')}</p>
            </div>
          ) : equipment.filter(eq => 
            (!eqStatusFilter || eq.status === eqStatusFilter) &&
            (!eqSearchTerm || eq.name?.toLowerCase().includes(eqSearchTerm.toLowerCase()) || eq.code?.toLowerCase().includes(eqSearchTerm.toLowerCase()))
          ).length === 0 ? (
            <div className="fac-table-card">
              <div className="fac-empty-box">
                {t('facilities.emptyEquipment')}
              </div>
            </div>
          ) : (
            <div className="fac-table-card">
              <table className="fac-table">
                <thead>
                  <tr>
                    <th>{t('facilities.colEquipCode')}</th>
                    <th>{t('facilities.colEquipName')}</th>
                    <th>{t('facilities.colCategory')}</th>
                    <th>{t('facilities.colLocation')}</th>
                    <th>{t('facilities.colMaintenanceDue')}</th>
                    <th>{t('facilities.colStatus')}</th>
                    <th style={{ textAlign: 'right' }}>{t('facilities.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment
                    .filter(eq => 
                      (!eqStatusFilter || eq.status === eqStatusFilter) &&
                      (!eqSearchTerm || eq.name?.toLowerCase().includes(eqSearchTerm.toLowerCase()) || eq.code?.toLowerCase().includes(eqSearchTerm.toLowerCase()))
                    )
                    .map((eq) => (
                      <tr key={eq._id}>
                        <td style={{ fontWeight: '600', color: '#1e293b' }}>{eq.code}</td>
                        <td style={{ fontWeight: '550' }}>{eq.name}</td>
                        <td>{eq.category || '—'}</td>
                        <td>
                          <span className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-lg w-fit">
                            <MapPin size={12} className="text-slate-400" />
                            {eq.locationType === 'storage' && t('facilities.locationStorage')}
                            {eq.locationType === 'building' && `${t('facilities.locationBuilding')}: ${eq.buildingId?.name || eq.buildingId?.code || '—'}`}
                            {eq.locationType === 'floor' && `${t('facilities.locationFloor')}: ${eq.floorId?.name || eq.floorId?.floorNumber || '—'}`}
                            {eq.locationType === 'room' && `${t('facilities.locationRoom')}: ${eq.roomId?.roomNumber || '—'}`}
                            {eq.locationType === 'bed' && `${t('facilities.locationBed')}: ${eq.bedId?.bedCode || '—'}`}
                          </span>
                        </td>
                        <td>
                          {eq.maintenanceDueAt ? (
                            <span className="flex items-center gap-1.5 text-xs">
                              <Calendar size={12} className="text-slate-400" />
                              {new Date(eq.maintenanceDueAt).toLocaleDateString('vi-VN')}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <span className={`fac-badge ${
                            eq.status === 'available' ? 'fac-badge--success' :
                            eq.status === 'in_use' ? 'fac-badge--warning' :
                            eq.status === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'fac-badge--danger'
                          }`}>
                            {eq.status === 'available' ? 'Sẵn sàng' :
                             eq.status === 'in_use' ? 'Đang dùng' :
                             eq.status === 'maintenance' ? 'Bảo trì' : 'Thanh lý'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenEditEq(eq)}
                            className="fac-btn-icon fac-btn-icon--edit"
                            title="Sửa"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteEq(eq)}
                            className="fac-btn-icon fac-btn-icon--delete"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
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
              <h3>{t('facilities.modalCreateBuilding')}</h3>
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
                  <label>{t('facilities.fieldBuildingCode')}</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder={t('facilities.placeholderBuildingCode')}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    required
                  />
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldBuildingName')}</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder={t('facilities.placeholderBuildingName')}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldAddress')}</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder={t('facilities.placeholderAddress')}
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldDescription')}</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '80px' }}
                    placeholder={t('facilities.placeholderDescription')}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="fac-btn fac-btn--secondary">
                  {t('facilities.btnCancel')}
                </button>
                <button type="submit" disabled={submitting} className="fac-btn fac-btn--primary">
                  {submitting ? t('facilities.btnCreating') : t('facilities.btnCreate')}
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
              <h3>{t('facilities.modalEditBuilding')}</h3>
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
                  <label>{t('facilities.fieldBuildingCode')}</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder={t('facilities.placeholderBuildingCode')}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    required
                  />
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldBuildingName')}</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldAddress')}</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldDescription')}</label>
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
                  <label htmlFor="isActive" style={{ margin: 0, cursor: 'pointer' }}>{t('facilities.fieldIsActive')}</label>
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="fac-btn fac-btn--secondary">
                  {t('facilities.btnCancel')}
                </button>
                <button type="submit" disabled={submitting} className="fac-btn fac-btn--primary">
                  {submitting ? t('facilities.btnSaving') : t('facilities.btnSave')}
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
              <h3 style={{ color: '#dc2626' }}>{t('facilities.modalDeleteBuilding')}</h3>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="fac-modal-body">
              <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                <AlertTriangle size={36} className="text-red-500" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>
                    {t('facilities.deactivateBuildingConfirm', { name: selectedBuilding?.name, code: selectedBuilding?.code })}
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    {t('facilities.deactivateBuildingWarning', { name: selectedBuilding?.name, code: selectedBuilding?.code })}
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

      {/* BUILDING STATISTICS MODAL */}
      {showStatsModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowStatsModal(false)}>
          <div className="fac-modal" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header">
              <h3>{t('facilities.modalBuildingStats')}</h3>
              <button onClick={() => setShowStatsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="fac-modal-body">
              {loadingStats ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                  <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
                  <p>{t('facilities.loadingStats')}</p>
                </div>
              ) : statsError ? (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-4 rounded-xl text-center">
                  {statsError}
                </div>
              ) : selectedBuildingStats ? (
                <div className="animate-fadeIn">
                  {/* Building Meta Header */}
                  <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px' }}>
                    <div>
                      <div className="flex items-center gap-2.5" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>
                          {selectedBuildingStats.building.name}
                        </h4>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {selectedBuildingStats.building.code}
                        </span>
                      </div>
                      <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: selectedBuildingStats.building.isActive ? '#10b981' : '#cbd5e1',
                          display: 'inline-block'
                        }} />
                        {selectedBuildingStats.building.isActive ? t('facilities.active') : t('facilities.inactive')}
                      </p>
                    </div>
                  </div>

                  {/* High Level Stats Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px 0',
                    marginBottom: '24px'
                  }}>
                    <div style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        {t('facilities.statsFloorsCount')}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '600', color: '#0f172a' }}>
                        {selectedBuildingStats.floorsCount}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        {t('facilities.statsRoomsCount')}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '600', color: '#0f172a' }}>
                        {selectedBuildingStats.roomsCount}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        {t('facilities.statsBedsCount')}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '600', color: '#0f172a' }}>
                        {selectedBuildingStats.bedsCount}
                      </div>
                    </div>
                  </div>

                  {/* Beds Breakdown Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                      {t('facilities.tabBeds')}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {t('facilities.statsTotalBedsCount', { count: selectedBuildingStats.bedsCount })}
                    </span>
                  </div>

                  {/* Segmented Progress Bar */}
                  {selectedBuildingStats.bedsCount > 0 ? (
                    <>
                      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '24px' }}>
                        {/* Occupied */}
                        <div
                          style={{
                            width: `${(selectedBuildingStats.bedStats.occupied / selectedBuildingStats.bedsCount) * 100}%`,
                            backgroundColor: '#f43f5e',
                            transition: 'width 0.3s ease'
                          }}
                          title={`${t('facilities.statsBedStatusOccupied')}: ${selectedBuildingStats.bedStats.occupied}`}
                        />
                        {/* Available */}
                        <div
                          style={{
                            width: `${(selectedBuildingStats.bedStats.available / selectedBuildingStats.bedsCount) * 100}%`,
                            backgroundColor: '#10b981',
                            transition: 'width 0.3s ease'
                          }}
                          title={`${t('facilities.statsBedStatusAvailable')}: ${selectedBuildingStats.bedStats.available}`}
                        />
                        {/* Reserved */}
                        <div
                          style={{
                            width: `${(selectedBuildingStats.bedStats.reserved / selectedBuildingStats.bedsCount) * 100}%`,
                            backgroundColor: '#8b5cf6',
                            transition: 'width 0.3s ease'
                          }}
                          title={`${t('facilities.statsBedStatusReserved')}: ${selectedBuildingStats.bedStats.reserved}`}
                        />
                        {/* Maintenance */}
                        <div
                          style={{
                            width: `${(selectedBuildingStats.bedStats.maintenance / selectedBuildingStats.bedsCount) * 100}%`,
                            backgroundColor: '#f59e0b',
                            transition: 'width 0.3s ease'
                          }}
                          title={`${t('facilities.statsBedStatusMaintenance')}: ${selectedBuildingStats.bedStats.maintenance}`}
                        />
                      </div>

                      {/* Legends */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 0',
                          borderBottom: '1px solid #f1f5f9'
                        }}>
                          <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                            {t('facilities.statsBedStatusAvailable')}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                              {selectedBuildingStats.bedStats.available}
                            </span>
                            <span style={{
                              width: '4px',
                              height: '14px',
                              borderRadius: '2px',
                              backgroundColor: '#10b981',
                              display: 'inline-block'
                            }} />
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 0',
                          borderBottom: '1px solid #f1f5f9'
                        }}>
                          <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                            {t('facilities.statsBedStatusOccupied')}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                              {selectedBuildingStats.bedStats.occupied}
                            </span>
                            <span style={{
                              width: '4px',
                              height: '14px',
                              borderRadius: '2px',
                              backgroundColor: '#f43f5e',
                              display: 'inline-block'
                            }} />
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 0',
                          borderBottom: '1px solid #f1f5f9'
                        }}>
                          <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                            {t('facilities.statsBedStatusReserved')}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                              {selectedBuildingStats.bedStats.reserved}
                            </span>
                            <span style={{
                              width: '4px',
                              height: '14px',
                              borderRadius: '2px',
                              backgroundColor: '#8b5cf6',
                              display: 'inline-block'
                            }} />
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 0'
                        }}>
                          <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                            {t('facilities.statsBedStatusMaintenance')}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                              {selectedBuildingStats.bedStats.maintenance}
                            </span>
                            <span style={{
                              width: '4px',
                              height: '14px',
                              borderRadius: '2px',
                              backgroundColor: '#f59e0b',
                              display: 'inline-block'
                            }} />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center', padding: '24px', color: '#94a3b8', borderRadius: '12px', fontSize: '14px', fontWeight: '500' }}>
                      {t('facilities.noBedsInBuilding')}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="fac-modal-footer">
              <button type="button" onClick={() => setShowStatsModal(false)} className="fac-btn fac-btn--secondary">
                Đóng
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
              <h3>{t('facilities.modalCreateFloor')}</h3>
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
                  <label>{t('facilities.fieldSelectBuilding')}</label>
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
                  <label>{t('facilities.fieldFloorNumber')}</label>
                  <input
                    type="number"
                    className="fac-form-control"
                    placeholder={t('facilities.placeholderFloorNumber')}
                    value={formFloorNumber}
                    onChange={(e) => setFormFloorNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldFloorName')}</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder={t('facilities.placeholderFloorName')}
                    value={formFloorName}
                    onChange={(e) => setFormFloorName(e.target.value)}
                  />
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldDescription')}</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '80px' }}
                    placeholder={t('facilities.placeholderDescription')}
                    value={formFloorDescription}
                    onChange={(e) => setFormFloorDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowCreateFloorModal(false)} className="fac-btn fac-btn--secondary">
                  {t('facilities.btnCancel')}
                </button>
                <button type="submit" disabled={submitting} className="fac-btn fac-btn--primary">
                  {submitting ? t('facilities.btnCreating') : t('facilities.btnCreate')}
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
              <h3>{t('facilities.modalEditFloor')}</h3>
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
                  <label>{t('facilities.fieldFloorNumber')}</label>
                  <input
                    type="number"
                    className="fac-form-control"
                    value={formFloorNumber}
                    onChange={(e) => setFormFloorNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldFloorName')}</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    value={formFloorName}
                    onChange={(e) => setFormFloorName(e.target.value)}
                  />
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldDescription')}</label>
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
                  <label htmlFor="floorIsActive" style={{ margin: 0, cursor: 'pointer' }}>{t('facilities.fieldFloorIsActive')}</label>
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowEditFloorModal(false)} className="fac-btn fac-btn--secondary">
                  {t('facilities.btnCancel')}
                </button>
                <button type="submit" disabled={submitting} className="fac-btn fac-btn--primary">
                  {submitting ? t('facilities.btnSaving') : t('facilities.btnSave')}
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
              <h3 style={{ color: '#dc2626' }}>{t('facilities.modalDeleteFloor')}</h3>
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
                {t('facilities.btnCancel')}
              </button>
              <button type="button" onClick={handleDeleteFloor} disabled={submitting} className="fac-btn fac-btn--danger">
                {submitting ? t('facilities.btnDeactivating') : t('facilities.btnConfirmDeactivate')}
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
              <h3>{t('facilities.modalCreateRoom')}</h3>
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
                    <option value="">{t('facilities.selectBuilding')}</option>
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
                    <option value="">{t('facilities.selectFloor')}</option>
                    {floors
                      .filter(f => (f.buildingId === formRoomBuildingId || f.buildingId?._id === formRoomBuildingId) && f.isActive !== false)
                      .map(f => (
                        <option key={f._id} value={f._id}>{f.name || `${t('facilities.floor')} ${f.floorNumber}`}</option>
                      ))}
                  </select>
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldRoomNumber')}</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder={t('facilities.placeholderRoomNumber')}
                    value={formRoomNumber}
                    onChange={(e) => setFormRoomNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldRoomType')}</label>
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
                    <label>{t('facilities.fieldCapacity')}</label>
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
                  <label>{t('facilities.fieldRoomNotes')}</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '60px' }}
                    placeholder={t('facilities.placeholderRoomNotes')}
                    value={formRoomNotes}
                    onChange={(e) => setFormRoomNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowCreateRoomModal(false)} className="fac-btn fac-btn--secondary">
                  {t('facilities.btnCancel')}
                </button>
                <button type="submit" disabled={submitting} className="fac-btn fac-btn--primary">
                  {submitting ? t('facilities.btnCreating') : t('facilities.btnCreate')}
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
              <h3>{t('facilities.modalEditRoom')}</h3>
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
                  <label>{t('facilities.fieldRoomNumber')}</label>
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
                    <label>{t('facilities.fieldRoomType')}</label>
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
                    <label>{t('facilities.fieldCapacity')}</label>
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
                  <label>{t('facilities.fieldRoomStatus')}</label>
                  <select
                    className="fac-form-control"
                    value={formRoomStatus}
                    onChange={(e) => setFormRoomStatus(e.target.value)}
                    disabled={selectedRoom?.occupiedCount > 0}
                  >
                    <option value="available">{t('facilities.statusAvailable')}</option>
                    <option value="full">{t('facilities.statusFull')}</option>
                    <option value="maintenance">{t('facilities.statusMaintenance')}</option>
                    <option value="closed">{t('facilities.statusClosed')}</option>
                  </select>
                  {selectedRoom?.occupiedCount > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {t('facilities.roomOccupiedWarning')}
                    </p>
                  )}
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldRoomNotes')}</label>
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
                  {t('facilities.btnCancel')}
                </button>
                <button type="submit" disabled={submitting} className="fac-btn fac-btn--primary">
                  {submitting ? t('facilities.btnSaving') : t('facilities.btnSave')}
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
              <h3 style={{ color: '#dc2626' }}>{t('facilities.modalDeleteRoom')}</h3>
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
                {t('facilities.btnCancel')}
              </button>
              <button type="button" onClick={handleDeleteRoom} disabled={submitting} className="fac-btn fac-btn--danger">
                {submitting ? t('facilities.btnClosing') : t('facilities.btnConfirmClose')}
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
              <h3>{t('facilities.modalCreateBed')}</h3>
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
                  <label>{t('facilities.fieldBedCode')}</label>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder={t('facilities.placeholderBedCode')}
                    value={formBedCode}
                    onChange={(e) => setFormBedCode(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldBedType')}</label>
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
                  <label>{t('facilities.fieldBedNotes')}</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '60px' }}
                    placeholder={t('facilities.placeholderBedNotes')}
                    value={formBedNotes}
                    onChange={(e) => setFormBedNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowCreateBedModal(false)} className="fac-btn fac-btn--secondary">
                  {t('facilities.btnCancel')}
                </button>
                <button type="submit" disabled={submitting} className="fac-btn fac-btn--primary">
                  {submitting ? t('facilities.btnCreating') : t('facilities.btnCreate')}
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
              <h3>{t('facilities.modalEditBed')}</h3>
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
                  <label>{t('facilities.fieldBedCode')}</label>
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
                    <label>{t('facilities.fieldBedType')}</label>
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
                  <label>{t('facilities.fieldBedStatus')}</label>
                  <select
                    className="fac-form-control"
                    value={formBedStatus}
                    onChange={(e) => setFormBedStatus(e.target.value)}
                    disabled={selectedBed?.status === 'occupied'}
                  >
                    <option value="available">{t('facilities.statusAvailable')}</option>
                    <option value="occupied" disabled>{t('facilities.statusOccupied')}</option>
                    <option value="reserved">{t('facilities.statusReserved')}</option>
                    <option value="maintenance">{t('facilities.statusMaintenance')}</option>
                  </select>
                  {selectedBed?.status === 'occupied' && (
                    <p className="text-xs text-amber-600 mt-1">{t('facilities.bedOccupiedWarning')}</p>
                  )}
                </div>
                <div className="fac-form-group">
                  <label>{t('facilities.fieldBedNotes')}</label>
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
                  {t('facilities.btnCancel')}
                </button>
                <button type="submit" disabled={submitting} className="fac-btn fac-btn--primary">
                  {submitting ? t('facilities.btnSaving') : t('facilities.btnSave')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE BED MODAL */}
      {showDeleteBedModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowDeleteBedModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header" style={{ background: '#fef2f2' }}>
              <h3 style={{ color: '#dc2626' }}>{t('facilities.modalDeleteBed')}</h3>
              <button onClick={() => setShowDeleteBedModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="fac-modal-body">
              <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                <AlertTriangle size={36} className="text-red-500" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>
                    Bạn có chắc chắn muốn xóa giường <strong>{selectedBed?.bedCode}</strong>?
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Hành động này sẽ xóa hoàn toàn giường này khỏi hệ thống cơ sở vật chất. Giường chỉ có thể được xóa khi không có cư dân đang cư trú.
                  </p>
                </div>
              </div>
            </div>
            <div className="fac-modal-footer">
              <button type="button" onClick={() => setShowDeleteBedModal(false)} className="fac-btn fac-btn--secondary">
                {t('facilities.btnCancel')}
              </button>
              <button type="button" onClick={handleDeleteBed} disabled={submitting} className="fac-btn fac-btn--danger">
                {submitting ? t('facilities.btnDeleting') : t('facilities.btnConfirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EQUIPMENT MODAL */}
      {showCreateEqModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowCreateEqModal(false)}>
          <div className="fac-modal" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header">
              <h3>{t('facilities.modalCreateEquipment')}</h3>
              <button onClick={() => setShowCreateEqModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateEq}>
              <div className="fac-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4">
                    {formError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldEquipCode')}</label>
                    <input
                      type="text"
                      className="fac-form-control"
                      placeholder={t('facilities.placeholderEquipCode')}
                      value={formEqCode}
                      onChange={(e) => setFormEqCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldEquipName')}</label>
                    <input
                      type="text"
                      className="fac-form-control"
                      placeholder={t('facilities.placeholderEquipName')}
                      value={formEqName}
                      onChange={(e) => setFormEqName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldEquipCategory')}</label>
                    <input
                      type="text"
                      className="fac-form-control"
                      placeholder={t('facilities.placeholderEquipCategory')}
                      value={formEqCategory}
                      onChange={(e) => setFormEqCategory(e.target.value)}
                    />
                  </div>
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldMaintenanceDue')}</label>
                    <input
                      type="date"
                      className="fac-form-control"
                      value={formEqMaintenanceDueAt}
                      onChange={(e) => setFormEqMaintenanceDueAt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldEquipStatus')}</label>
                    <select
                      className="fac-form-control"
                      value={formEqStatus}
                      onChange={(e) => setFormEqStatus(e.target.value)}
                    >
                      <option value="available">{t('facilities.equipStatusAvailable')}</option>
                      <option value="in_use">{t('facilities.equipStatusInUse')}</option>
                      <option value="maintenance">{t('facilities.equipStatusMaintenance')}</option>
                      <option value="retired">{t('facilities.equipStatusRetired')}</option>
                    </select>
                  </div>
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldLocationType')}</label>
                    <select
                      className="fac-form-control"
                      value={formEqLocationType}
                      onChange={(e) => setFormEqLocationType(e.target.value)}
                    >
                      <option value="storage">{t('facilities.locationStorage')}</option>
                      <option value="building">{t('facilities.locationBuilding')}</option>
                      <option value="floor">{t('facilities.locationFloor')}</option>
                      <option value="room">{t('facilities.locationRoom')}</option>
                      <option value="bed">{t('facilities.locationBed')}</option>
                    </select>
                  </div>
                </div>

                {formEqLocationType !== 'storage' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 flex flex-col gap-3">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                      <MapPin size={14} /> Cấu hình vị trí định vị
                    </span>

                    <div className="fac-form-group mb-1">
                      <label>{t('facilities.fieldSelectBuilding')}</label>
                      <select
                        className="fac-form-control"
                        value={formEqBuildingId}
                        onChange={(e) => setFormEqBuildingId(e.target.value)}
                        required
                      >
                        <option value="">{t('facilities.selectBuilding')}</option>
                        {buildings.map(b => (
                          <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {(formEqLocationType === 'floor' || formEqLocationType === 'room' || formEqLocationType === 'bed') && (
                      <div className="fac-form-group mb-1">
                        <label>{t('facilities.selectFloor')}</label>
                        <select
                          className="fac-form-control"
                          value={formEqFloorId}
                          onChange={(e) => setFormEqFloorId(e.target.value)}
                          required
                          disabled={!formEqBuildingId}
                        >
                          <option value="">{t('facilities.selectFloor')}</option>
                          {modalFloors.map(f => (
                            <option key={f._id} value={f._id}>{f.name || `${t('facilities.floor')} ${f.floorNumber}`}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(formEqLocationType === 'room' || formEqLocationType === 'bed') && (
                      <div className="fac-form-group mb-1">
                        <label>{t('facilities.selectRoom')}</label>
                        <select
                          className="fac-form-control"
                          value={formEqRoomId}
                          onChange={(e) => setFormEqRoomId(e.target.value)}
                          required
                          disabled={!formEqFloorId}
                        >
                          <option value="">{t('facilities.selectRoom')}</option>
                          {modalRooms.map(r => (
                            <option key={r._id} value={r._id}>{t('facilities.room')} {r.roomNumber}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formEqLocationType === 'bed' && (
                      <div className="fac-form-group mb-1">
                        <label>{t('facilities.bed')}</label>
                        <select
                          className="fac-form-control"
                          value={formEqBedId}
                          onChange={(e) => setFormEqBedId(e.target.value)}
                          required
                          disabled={!formEqRoomId}
                        >
                          <option value="">{t('facilities.selectRoom')}</option>
                          {modalBeds.map(b => (
                            <option key={b._id} value={b._id}>{b.bedCode}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="fac-form-group mt-3">
                  <label>{t('facilities.fieldEquipNotes')}</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '60px' }}
                    placeholder={t('facilities.placeholderEquipNotes')}
                    value={formEqNotes}
                    onChange={(e) => setFormEqNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowCreateEqModal(false)} className="fac-btn fac-btn--secondary">
                  {t('facilities.btnCancel')}
                </button>
                <button type="submit" disabled={submitting} className="fac-btn fac-btn--primary">
                  {submitting ? t('facilities.btnCreating') : t('facilities.btnCreate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EQUIPMENT MODAL */}
      {showEditEqModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowEditEqModal(false)}>
          <div className="fac-modal" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header">
              <h3>{t('facilities.modalEditEquipment')}</h3>
              <button onClick={() => setShowEditEqModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateEq}>
              <div className="fac-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4">
                    {formError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldEquipCode')}</label>
                    <input
                      type="text"
                      className="fac-form-control"
                      value={formEqCode}
                      onChange={(e) => setFormEqCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldEquipName')}</label>
                    <input
                      type="text"
                      className="fac-form-control"
                      value={formEqName}
                      onChange={(e) => setFormEqName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldEquipCategory')}</label>
                    <input
                      type="text"
                      className="fac-form-control"
                      value={formEqCategory}
                      onChange={(e) => setFormEqCategory(e.target.value)}
                    />
                  </div>
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldMaintenanceDue')}</label>
                    <input
                      type="date"
                      className="fac-form-control"
                      value={formEqMaintenanceDueAt}
                      onChange={(e) => setFormEqMaintenanceDueAt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldEquipStatus')}</label>
                    <select
                      className="fac-form-control"
                      value={formEqStatus}
                      onChange={(e) => setFormEqStatus(e.target.value)}
                    >
                      <option value="available">{t('facilities.equipStatusAvailable')}</option>
                      <option value="in_use">{t('facilities.equipStatusInUse')}</option>
                      <option value="maintenance">{t('facilities.equipStatusMaintenance')}</option>
                      <option value="retired">{t('facilities.equipStatusRetired')}</option>
                    </select>
                  </div>
                  <div className="fac-form-group">
                    <label>{t('facilities.fieldLocationType')}</label>
                    <select
                      className="fac-form-control"
                      value={formEqLocationType}
                      onChange={(e) => setFormEqLocationType(e.target.value)}
                    >
                      <option value="storage">{t('facilities.locationStorage')}</option>
                      <option value="building">{t('facilities.locationBuilding')}</option>
                      <option value="floor">{t('facilities.locationFloor')}</option>
                      <option value="room">{t('facilities.locationRoom')}</option>
                      <option value="bed">{t('facilities.locationBed')}</option>
                    </select>
                  </div>
                </div>

                {formEqLocationType !== 'storage' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 flex flex-col gap-3">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                      <MapPin size={14} /> Cấu hình vị trí định vị
                    </span>

                    <div className="fac-form-group mb-1">
                      <label>{t('facilities.fieldSelectBuilding')}</label>
                      <select
                        className="fac-form-control"
                        value={formEqBuildingId}
                        onChange={(e) => setFormEqBuildingId(e.target.value)}
                        required
                      >
                        <option value="">{t('facilities.selectBuilding')}</option>
                        {buildings.map(b => (
                          <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {(formEqLocationType === 'floor' || formEqLocationType === 'room' || formEqLocationType === 'bed') && (
                      <div className="fac-form-group mb-1">
                        <label>{t('facilities.selectFloor')}</label>
                        <select
                          className="fac-form-control"
                          value={formEqFloorId}
                          onChange={(e) => setFormEqFloorId(e.target.value)}
                          required
                          disabled={!formEqBuildingId}
                        >
                          <option value="">{t('facilities.selectFloor')}</option>
                          {modalFloors.map(f => (
                            <option key={f._id} value={f._id}>{f.name || `${t('facilities.floor')} ${f.floorNumber}`}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(formEqLocationType === 'room' || formEqLocationType === 'bed') && (
                      <div className="fac-form-group mb-1">
                        <label>{t('facilities.selectRoom')}</label>
                        <select
                          className="fac-form-control"
                          value={formEqRoomId}
                          onChange={(e) => setFormEqRoomId(e.target.value)}
                          required
                          disabled={!formEqFloorId}
                        >
                          <option value="">{t('facilities.selectRoom')}</option>
                          {modalRooms.map(r => (
                            <option key={r._id} value={r._id}>{t('facilities.room')} {r.roomNumber}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formEqLocationType === 'bed' && (
                      <div className="fac-form-group mb-1">
                        <label>{t('facilities.bed')}</label>
                        <select
                          className="fac-form-control"
                          value={formEqBedId}
                          onChange={(e) => setFormEqBedId(e.target.value)}
                          required
                          disabled={!formEqRoomId}
                        >
                          <option value="">{t('facilities.selectRoom')}</option>
                          {modalBeds.map(b => (
                            <option key={b._id} value={b._id}>{b.bedCode}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="fac-form-group mt-3">
                  <label>{t('facilities.fieldEquipNotes')}</label>
                  <textarea
                    className="fac-form-control"
                    style={{ minHeight: '60px' }}
                    value={formEqNotes}
                    onChange={(e) => setFormEqNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="fac-modal-footer">
                <button type="button" onClick={() => setShowEditEqModal(false)} className="fac-btn fac-btn--secondary">
                  {t('facilities.btnCancel')}
                </button>
                <button type="submit" disabled={submitting} className="fac-btn fac-btn--primary">
                  {submitting ? t('facilities.btnSaving') : t('facilities.btnSave')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE EQUIPMENT CONFIRMATION MODAL */}
      {showDeleteEqModal && (
        <div className="fac-modal-backdrop" onClick={() => setShowDeleteEqModal(false)}>
          <div className="fac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fac-modal-header" style={{ background: '#fef2f2' }}>
              <h3 style={{ color: '#dc2626' }}>{t('facilities.modalDeleteEquipment')}</h3>
              <button onClick={() => setShowDeleteEqModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="fac-modal-body">
              <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                <AlertTriangle size={36} className="text-red-500" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>
                    Bạn có chắc chắn muốn xóa thiết bị <strong>{selectedEq?.name}</strong> ({selectedEq?.code})?
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Hành động này sẽ xóa hoàn toàn thiết bị này khỏi hệ thống cơ sở vật chất. Đối với thiết bị hỏng hoàn toàn hoặc hết niên hạn sử dụng, hãy cân nhắc cập nhật trạng thái thiết bị thành Hưu trí (Retired) thay vì xóa lịch sử của thiết bị.
                  </p>
                </div>
              </div>
            </div>
            <div className="fac-modal-footer">
              <button type="button" onClick={() => setShowDeleteEqModal(false)} className="fac-btn fac-btn--secondary">
                {t('facilities.btnCancel')}
              </button>
              <button type="button" onClick={handleDeleteEq} disabled={submitting} className="fac-btn fac-btn--danger">
                {submitting ? t('facilities.btnDeleting') : t('facilities.btnConfirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
