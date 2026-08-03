import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
  Bed as BedIcon,
  Grid,
  List,
} from 'lucide-react';
import facilityService from '../../../services/facility.service';
import useFacilitiesData from './useFacilitiesData';
import FacilitiesSubNav from './FacilitiesSubNav';
import '../../../styles/admin/FacilitiesPage.css';

export default function BedsPage() {
  const { t } = useTranslation();

  const { loading, setLoading, stats, buildings, floors, refetch } = useFacilitiesData({ withFloors: true });

  // Filters
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [bedViewMode, setBedViewMode] = useState('grid'); // 'grid' or 'table'

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

  // Fetch beds when selectedRoomId changes (fetch ALL beds for admin management)
  useEffect(() => {
    const fetchBeds = async () => {
      if (selectedRoomId) {
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
  }, [selectedRoomId, setLoading]);

  // Submitting/Form statuses
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Modals & Form States for Bed
  const [showCreateBedModal, setShowCreateBedModal] = useState(false);
  const [showEditBedModal, setShowEditBedModal] = useState(false);
  const [showDeleteBedModal, setShowDeleteBedModal] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);

  const [formBedCode, setFormBedCode] = useState('');
  const [formBedType, setFormBedType] = useState('normal');
  const [formBedCondition, setFormBedCondition] = useState('good');
  const [formBedStatus, setFormBedStatus] = useState('available');
  const [formBedNotes, setFormBedNotes] = useState('');

  // ----------------------------------------------------
  // Bed CRUD Handlers
  // ----------------------------------------------------
  const handleOpenCreateBed = () => {
    const currentRoom = rooms.find(r => r._id === selectedRoomId);
    let autoBedCode = '';
    if (currentRoom) {
      const roomPrefix = currentRoom.roomNumber;
      let nextIndex = 1;
      autoBedCode = `${roomPrefix}-G${String(nextIndex).padStart(2, '0')}`;
      const existingCodes = beds.map(b => b.bedCode.toLowerCase().trim());
      while (existingCodes.includes(autoBedCode.toLowerCase())) {
        nextIndex++;
        autoBedCode = `${roomPrefix}-G${String(nextIndex).padStart(2, '0')}`;
      }
    }
    setFormBedCode(autoBedCode);
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
      refetch();
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
      refetch();
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
      refetch();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Xóa giường thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fac-container">
      <FacilitiesSubNav
        stats={stats}
        addButton={
          selectedRoomId && (
            <button onClick={handleOpenCreateBed} className="fac-btn-primary">
              <Plus size={16} /> {t('facilities.addBed')}
            </button>
          )
        }
      />

      {/* TAB CONTENT: BEDS */}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label>{t('facilities.fieldBedCode')} *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const currentRoom = rooms.find(r => r._id === selectedRoomId);
                        if (currentRoom) {
                          const roomPrefix = currentRoom.roomNumber;
                          let nextIndex = 1;
                          let code = `${roomPrefix}-G${String(nextIndex).padStart(2, '0')}`;
                          const existingCodes = beds.map(b => b.bedCode.toLowerCase().trim());
                          while (existingCodes.includes(code.toLowerCase())) {
                            nextIndex++;
                            code = `${roomPrefix}-G${String(nextIndex).padStart(2, '0')}`;
                          }
                          setFormBedCode(code);
                        } else {
                          alert('Vui lòng chọn phòng trước');
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Tự động tạo mã
                    </button>
                  </div>
                  <input
                    type="text"
                    className="fac-form-control"
                    placeholder={t('facilities.placeholderBedCode')}
                    value={formBedCode}
                    onChange={(e) => setFormBedCode(e.target.value)}
                    required
                  />
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
    </div>
  );
}
