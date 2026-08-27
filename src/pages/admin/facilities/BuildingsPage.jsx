import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  X,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import facilityService from '../../../services/facility.service';
import useFacilitiesData from './useFacilitiesData';
import FacilitiesSubNav from './FacilitiesSubNav';
import { useToast } from '../../../hooks/useToast';
import '../../../styles/admin/FacilitiesPage.css';

export default function BuildingsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  // Buildings tab doesn't use the floors list, so skip fetching it.
  const { loading, stats, buildings, refetch } = useFacilitiesData({ withFloors: false });

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Submitting/Form statuses
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Modals & Form States for Building
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

  // ----------------------------------------------------
  // Building CRUD Handlers
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
    if (!formCode.trim()) return setFormError(t('buildings.errCodeRequired'));
    if (!formName.trim()) return setFormError(t('buildings.errNameRequired'));

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
      refetch();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || t('buildings.errCreateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBuilding = async (e) => {
    e.preventDefault();
    if (!selectedBuilding?._id) return;
    if (!formCode.trim()) return setFormError(t('buildings.errCodeRequired'));
    if (!formName.trim()) return setFormError(t('buildings.errNameRequired'));

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
      refetch();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || t('buildings.errUpdateFailed'));
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
      refetch();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || t('buildings.errDeactivateFailed'), 'error');
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
      <FacilitiesSubNav
        stats={stats}
        addButton={
          <button onClick={handleOpenCreate} className="fac-btn-primary">
            <Plus size={16} /> {t('facilities.addBuilding')}
          </button>
        }
      />

      {/* TAB CONTENT: BUILDINGS */}
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
                {t('facilities.btnCancel')}
              </button>
              <button type="button" onClick={handleDeleteBuilding} disabled={submitting} className="fac-btn fac-btn--danger">
                {submitting ? t('buildings.deactivating') : t('buildings.confirmDeactivate')}
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
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
