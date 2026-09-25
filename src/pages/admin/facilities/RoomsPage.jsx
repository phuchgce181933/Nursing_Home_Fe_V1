import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Loader2, X, AlertTriangle, Activity } from 'lucide-react';
import facilityService from '../../../services/facility.service';
import useFacilitiesData from './useFacilitiesData';
import FacilitiesSubNav from './FacilitiesSubNav';
import { useToast } from '../../../hooks/useToast';
import '../../../styles/admin/FacilitiesPage.css';

export default function RoomsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { loading, setLoading, stats, buildings, floors, refetch } = useFacilitiesData({ withFloors: true });

  // Filters
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [rooms, setRooms] = useState([]);

  // Default to the first building once buildings load (matches previous behavior).
  useEffect(() => {
    if (buildings.length > 0 && !selectedBuildingId) {
      setSelectedBuildingId(buildings[0]._id);
    }
  }, [buildings, selectedBuildingId]);

  // Fetch rooms when selectedFloorId changes
  useEffect(() => {
    const fetchRooms = async () => {
      if (selectedFloorId) {
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
  }, [selectedFloorId, setLoading]);

  // Submitting/Form statuses
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Modals & Form States for Room
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

  // ----------------------------------------------------
  // Room CRUD Handlers (Create)
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
    if (!formRoomBuildingId) return setFormError(t('rooms.errSelectBuilding'));
    if (!formRoomFloorId) return setFormError(t('rooms.errSelectFloor'));
    if (!formRoomNumber.trim()) return setFormError(t('rooms.errRoomNumberRequired'));
    if (formRoomNumber.trim().startsWith('-') || (!isNaN(formRoomNumber.trim()) && Number(formRoomNumber.trim()) <= 0)) {
      return setFormError(t('rooms.errRoomNumberPositive'));
    }
    if (formRoomCapacity < 1) return setFormError(t('rooms.errCapacityMin'));

    try {
      setSubmitting(true);
      setFormError(null);

      // Debug: log what we're sending
      console.log('[DEBUG] Creating room:', {
        buildingId: formRoomBuildingId,
        floorId: formRoomFloorId,
        roomNumber: formRoomNumber.trim(),
      });
      const selectedFloor = floors.find(f => f._id === formRoomFloorId);
      console.log('[DEBUG] Selected floor:', selectedFloor);
      if (selectedFloor) {
        const floorBuildingId = selectedFloor.buildingId?._id || selectedFloor.buildingId;
        console.log('[DEBUG] Floor buildingId (raw):', floorBuildingId, 'formRoomBuildingId:', formRoomBuildingId);
        console.log('[DEBUG] Comparison:', String(floorBuildingId), '===', String(formRoomBuildingId), '?', String(floorBuildingId) === String(formRoomBuildingId));
        if (String(floorBuildingId) !== String(formRoomBuildingId)) {
          setFormError(t('rooms.errFloorBuildingMismatch'));
          setSubmitting(false);
          return;
        }
      }

      await facilityService.createRoom({
        buildingId: formRoomBuildingId,
        floorId: formRoomFloorId,
        roomNumber: formRoomNumber.trim(),
        roomType: formRoomType,
        capacity: Number(formRoomCapacity),
        notes: formRoomNotes.trim(),
      });
      setShowCreateRoomModal(false);
      // Refresh current floor's rooms if it matches
      if (selectedFloorId === formRoomFloorId) {
        setLoading(true);
        const loadedRooms = await facilityService.listRoomsByFloor(selectedFloorId);
        setRooms(loadedRooms || []);
      }
      refetch();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || t('rooms.errCreateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Room Edit/Delete Handlers
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
    if (!formRoomNumber.trim()) return setFormError(t('rooms.errRoomNumberRequired'));
    if (formRoomNumber.trim().startsWith('-') || (!isNaN(formRoomNumber.trim()) && Number(formRoomNumber.trim()) <= 0)) {
      return setFormError(t('rooms.errRoomNumberPositive'));
    }
    if (formRoomCapacity < 1) return setFormError(t('rooms.errCapacityMin'));

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
      refetch();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || t('rooms.errUpdateFailed'));
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
      refetch();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || t('rooms.errCloseFailed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fac-container">
      <FacilitiesSubNav
        stats={stats}
        addButton={
          <button onClick={handleOpenCreateRoom} className="fac-btn-primary">
            <Plus size={16} /> {t('facilities.addRoom')}
          </button>
        }
      />

      {/* TAB CONTENT: ROOMS */}
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
            <option value="">{t('facilities.selectBuilding')}</option>
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
            <option value="">{t('facilities.selectFloor')}</option>
            {floors
              .filter(f => (f.buildingId === selectedBuildingId || f.buildingId?._id === selectedBuildingId) && f.isActive !== false)
              .map(f => (
                <option key={f._id} value={f._id}>{f.name || `${t('facilities.floor')} ${f.floorNumber}`}</option>
              ))}
          </select>
        </div>
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
          <Activity size={14} />
          <span>{t('rooms.manageDesc')}</span>
        </div>
      </div>

      {!selectedFloorId ? (
        <div className="fac-table-card">
          <div className="fac-empty-box">
            {t('facilities.manageBuildingDesc')}
          </div>
        </div>
      ) : loading && rooms.length === 0 ? (
        <div className="fac-loading-box">
          <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
          <p>{t('facilities.loadingRooms')}</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="fac-table-card">
          <div className="fac-empty-box">
            {t('facilities.emptyRooms')}
          </div>
        </div>
      ) : (
        <div className="fac-table-card">
          <table className="fac-table">
            <thead>
              <tr>
                <th>{t('facilities.colRoomNumber')}</th>
                <th>{t('facilities.colRoomType')}</th>
                <th>{t('facilities.colCapacity')}</th>
                <th>{t('facilities.colOccupied')}</th>
                <th>{t('facilities.colStatus')}</th>
                <th style={{ textAlign: 'right' }}>{t('facilities.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontWeight: '600' }}>{t('rooms.roomLabel', { number: r.roomNumber })}</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {r.roomType === 'standard' ? t('facilities.roomTypeStandard') :
                     r.roomType === 'premium' ? t('facilities.roomTypePremium') :
                     r.roomType === 'icu' ? t('facilities.roomTypeIcu') :
                     r.roomType === 'isolation' ? t('facilities.roomTypeIsolation') :
                     r.roomType}
                  </td>
                  <td>{t('rooms.bedCount', { count: r.capacity })}</td>
                  <td>{r.occupiedCount || 0}</td>
                  <td>
                    <span className={`fac-badge ${
                      r.status === 'available' ? 'fac-badge--success' :
                      r.status === 'full' ? 'fac-badge--warning' : 'fac-badge--danger'
                    }`}>
                      {r.status === 'available' ? t('facilities.statusAvailable') :
                       r.status === 'full' ? t('facilities.statusFull') :
                       r.status === 'maintenance' ? t('facilities.statusMaintenance') : t('facilities.statusClosed')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleOpenEditRoom(r)}
                      className="fac-btn-icon fac-btn-icon--edit"
                      title={t('facilities.edit')}
                    >
                      <Edit size={16} />
                    </button>
                    {r.status !== 'closed' && (
                      <button
                        onClick={() => handleOpenDeleteRoom(r)}
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
                  <label>{t('rooms.labelSelectBuilding')}</label>
                  <select
                    className="fac-form-control"
                    value={formRoomBuildingId}
                    onChange={(e) => {
                      setFormRoomBuildingId(e.target.value);
                      // Clear floor when building changes to prevent mismatch
                      setFormRoomFloorId('');
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
                  <label>{t('rooms.labelSelectFloor')}</label>
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
                    type="number"
                    className="fac-form-control"
                    placeholder={t('facilities.placeholderRoomNumber')}
                    value={formRoomNumber}
                    onChange={(e) => setFormRoomNumber(e.target.value)}
                    min="1"
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
                      <option value="standard">{t('facilities.roomTypeStandard')}</option>
                      <option value="premium">{t('facilities.roomTypePremium')}</option>
                      <option value="icu">{t('facilities.roomTypeIcu')}</option>
                      <option value="isolation">{t('facilities.roomTypeIsolation')}</option>
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
                    type="number"
                    className="fac-form-control"
                    value={formRoomNumber}
                    onChange={(e) => setFormRoomNumber(e.target.value)}
                    min="1"
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
                      <option value="standard">{t('facilities.roomTypeStandard')}</option>
                      <option value="premium">{t('facilities.roomTypePremium')}</option>
                      <option value="icu">{t('facilities.roomTypeIcu')}</option>
                      <option value="isolation">{t('facilities.roomTypeIsolation')}</option>
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
                    {t('rooms.confirmCloseTitle', { number: selectedRoom?.roomNumber })}
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    {t('rooms.confirmCloseBody')}
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
    </div>
  );
}
