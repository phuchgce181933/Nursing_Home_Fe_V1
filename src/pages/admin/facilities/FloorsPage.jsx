import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Loader2, X, AlertTriangle } from 'lucide-react';
import facilityService from '../../../services/facility.service';
import useFacilitiesData from './useFacilitiesData';
import FacilitiesSubNav from './FacilitiesSubNav';
import { useToast } from '../../../hooks/useToast';
import '../../../styles/admin/FacilitiesPage.css';

export default function FloorsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { loading, stats, buildings, floors, refetch } = useFacilitiesData({ withFloors: true });

  // Filter
  const [selectedBuildingId, setSelectedBuildingId] = useState('');

  // Default to the first building once buildings load (matches previous behavior).
  useEffect(() => {
    if (buildings.length > 0 && !selectedBuildingId) {
      setSelectedBuildingId(buildings[0]._id);
    }
  }, [buildings, selectedBuildingId]);

  // Submitting/Form statuses
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Modals & Form States for Floor
  const [showCreateFloorModal, setShowCreateFloorModal] = useState(false);
  const [showEditFloorModal, setShowEditFloorModal] = useState(false);
  const [showDeleteFloorModal, setShowDeleteFloorModal] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);

  const [formFloorBuildingId, setFormFloorBuildingId] = useState('');
  const [formFloorNumber, setFormFloorNumber] = useState('');
  const [formFloorName, setFormFloorName] = useState('');
  const [formFloorDescription, setFormFloorDescription] = useState('');
  const [formFloorIsActive, setFormFloorIsActive] = useState(true);

  // ----------------------------------------------------
  // Floor CRUD Handlers
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
    if (Number(formFloorNumber) <= 0) return setFormError('Số tầng phải lớn hơn 0');

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
      refetch();
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
    if (Number(formFloorNumber) <= 0) return setFormError('Số tầng phải lớn hơn 0');

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
      refetch();
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
      refetch();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Vô hiệu hóa tầng thất bại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fac-container">
      <FacilitiesSubNav
        stats={stats}
        addButton={
          <button onClick={handleOpenCreateFloor} className="fac-btn-primary">
            <Plus size={16} /> {t('facilities.addFloor')}
          </button>
        }
      />

      {/* TAB CONTENT: FLOORS */}
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
                    min="1"
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
                    min="1"
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
    </div>
  );
}
