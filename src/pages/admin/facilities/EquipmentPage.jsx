import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  X,
  AlertTriangle,
  MapPin,
  Calendar,
} from 'lucide-react';
import facilityService from '../../../services/facility.service';
import useFacilitiesData from './useFacilitiesData';
import FacilitiesSubNav from './FacilitiesSubNav';
import { useToast } from '../../../hooks/useToast';
import '../../../styles/admin/FacilitiesPage.css';

export default function EquipmentPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { loading, setLoading, stats, buildings, floors, refetch } = useFacilitiesData({ withFloors: true });

  const [equipment, setEquipment] = useState([]);

  // Submitting/Form statuses
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Modals & Form States for Equipment CRUD
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

  // Fetch equipment list on mount
  useEffect(() => {
    const fetchEqData = async () => {
      try {
        setLoading(true);
        const loadedEq = await facilityService.listEquipment();
        setEquipment(loadedEq || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEqData();
  }, [setLoading]);

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
  // Equipment CRUD Handlers
  // ----------------------------------------------------
  const handleOpenCreateEq = () => {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    setFormEqCode(`EQ-${randNum}`);
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
    if (!formEqCode.trim()) return setFormError(t('equipment.errCodeRequired'));
    if (!formEqName.trim()) return setFormError(t('equipment.errNameRequired'));
    if (formEqCategory.trim().startsWith('-') || (!isNaN(formEqCategory.trim()) && Number(formEqCategory.trim()) < 0)) {
      return setFormError(t('equipment.errCategoryNegative'));
    }
    if (formEqMaintenanceDueAt) {
      const selectedDate = new Date(formEqMaintenanceDueAt + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        return setFormError(t('equipment.errMaintenancePast'));
      }
    }

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
      refetch();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || t('equipment.errCreateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEq = async (e) => {
    e.preventDefault();
    if (!selectedEq?._id) return;
    if (!formEqCode.trim()) return setFormError(t('equipment.errCodeRequired'));
    if (!formEqName.trim()) return setFormError(t('equipment.errNameRequired'));
    if (formEqCategory.trim().startsWith('-') || (!isNaN(formEqCategory.trim()) && Number(formEqCategory.trim()) < 0)) {
      return setFormError(t('equipment.errCategoryNegative'));
    }
    if (formEqMaintenanceDueAt) {
      const selectedDate = new Date(formEqMaintenanceDueAt + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        return setFormError(t('equipment.errMaintenancePast'));
      }
    }

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
      refetch();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || t('equipment.errUpdateFailed'));
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
      refetch();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || t('equipment.errDeleteFailed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fac-container">
      <FacilitiesSubNav
        stats={stats}
        addButton={
          <button onClick={handleOpenCreateEq} className="fac-btn-primary">
            <Plus size={16} /> {t('facilities.addEquipment')}
          </button>
        }
      />

      {/* TAB CONTENT: MEDICAL EQUIPMENT */}
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
                        {eq.status === 'available' ? t('facilities.equipStatusAvailable') :
                         eq.status === 'in_use' ? t('facilities.equipStatusInUse') :
                         eq.status === 'maintenance' ? t('facilities.equipStatusMaintenance') : t('facilities.equipStatusRetired')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenEditEq(eq)}
                        className="fac-btn-icon fac-btn-icon--edit"
                        title={t('equipment.edit')}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteEq(eq)}
                        className="fac-btn-icon fac-btn-icon--delete"
                        title={t('equipment.delete')}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label>{t('facilities.fieldEquipCode')} *</label>
                      <button
                        type="button"
                        onClick={() => {
                          const randNum = Math.floor(100000 + Math.random() * 900000);
                          setFormEqCode(`EQ-${randNum}`);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {t('equipment.autoGenCode')}
                      </button>
                    </div>
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
                      min={new Date().toISOString().split('T')[0]}
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
                      <MapPin size={14} /> {t('equipment.locationConfig')}
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
                      min={new Date().toISOString().split('T')[0]}
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
                      <MapPin size={14} /> {t('equipment.locationConfig')}
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
                    {t('equipment.deleteConfirm', { name: selectedEq?.name, code: selectedEq?.code })}
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    {t('equipment.deleteWarning')}
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
