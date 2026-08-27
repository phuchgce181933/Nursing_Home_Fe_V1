import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, Users, Search, RefreshCw, UserCheck, UserX, Eye, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import activityService from '../../services/activity.service';
import residentService from '../../services/resident.service';
import '../../styles/admin/AdminAdmissionRequestsPage.css';
import '../../styles/family/FamilyActivityPage.css';

const formatDurationLabel = (durationMinutes) => {
  const totalMinutes = Number(durationMinutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '';

  const totalDays = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  const parts = [];
  if (totalDays > 0) parts.push(`${totalDays}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}p`);

  return parts.join(' ');
};

export default function FamilyActivityPage() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [registeredResidents, setRegisteredResidents] = useState(new Set());
  const [familyResidents, setFamilyResidents] = useState([]);
  const [selectedResident, setSelectedResident] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionMessageType, setActionMessageType] = useState('success');

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        limit,
        status: statusFilter || undefined,
        search: search || undefined,
      };
      
      const res = await activityService.getActivityList(params);
      setActivities(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error('Fetch activities failed:', err);
      setError(err.response?.data?.message || t('familyActivity.error'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, search]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    const loadFamilyResidents = async () => {
      try {
        const res = await residentService.getFamilyResidentList();
        const residents = Array.isArray(res) ? res : res?.data || [];
        setFamilyResidents(residents);
        if (residents.length > 0) {
          setSelectedResident(residents[0]._id);
        }
      } catch (err) {
        console.error('Load residents failed:', err);
      }
    };
    loadFamilyResidents();
  }, []);

  const handleRegisterResident = async (activityId) => {
    if (!selectedResident) {
      setActionMessageType('error');
      setActionMessage(t('familyActivity.selectResidentWarning'));
      return;
    }

    try {
      setRegistering(true);
      setActionMessage('');
      await activityService.registerResident(activityId, selectedResident);

      setRegisteredResidents(prev => {
        const newSet = new Set(prev);
        newSet.add(`${activityId}-${selectedResident}`);
        return newSet;
      });

      setActionMessageType('success');
      setActionMessage(t('familyActivity.registerSuccess'));
      fetchActivities();
    } catch (err) {
      console.error('Register failed:', err);
      setActionMessageType('error');
      setActionMessage(err?.response?.data?.message || t('familyActivity.registerError'));
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregisterResident = async (activityId) => {
    if (!selectedResident) return;
    try {
      setRegistering(true);
      setActionMessage('');
      await activityService.unregisterResident(activityId, selectedResident);

      setRegisteredResidents(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${activityId}-${selectedResident}`);
        return newSet;
      });

      setActionMessageType('success');
      setActionMessage(t('familyActivity.unregisterSuccess'));
      fetchActivities();
    } catch (err) {
      console.error('Unregister failed:', err);
      setActionMessageType('error');
      setActionMessage(err?.response?.data?.message || t('familyActivity.unregisterError'));
    } finally {
      setRegistering(false);
    }
  };

  const getSelectedActivity = () => {
    return activities.find((a) => a._id === selectedActivityId);
  };

  const formatActivityDateTime = (activity) => {
    const startDate = new Date(activity.startAt || activity.scheduledAt);
    const endDate = activity.endAt ? new Date(activity.endAt) : startDate;
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return `${startDate.toLocaleDateString('vi-VN')} ${startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} → ${endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${startDate.toLocaleDateString('vi-VN')} ${startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} → ${endDate.toLocaleDateString('vi-VN')} ${endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'draft': 'familyActivity.statusDraft',
      'scheduled': 'familyActivity.statusScheduled',
      'ongoing': 'familyActivity.statusOngoing',
      'completed': 'familyActivity.statusCompleted',
      'cancelled': 'familyActivity.statusCancelled'
    };
    return statusMap[status] ? t(statusMap[status]) : status;
  };

  const isRegistered = (activityId, residentId) => {
    const activity = activities.find(a => a._id === activityId);
    if (!activity) return false;
    return activity.participantResidentIds?.includes(residentId);
  };

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div>
          <h1>
            <Calendar size={26} />
            {t('familyActivity.title')}
          </h1>
          <p>{t('familyActivity.subtitle')}</p>
        </div>
      </div>

      <div className="adm-filter-panel">
        <div style={{ marginBottom: '16px' }}>
          <label className="text-sm font-semibold">{t('familyActivity.selectResident')}</label>
          <select
            className="adm-filter-select"
            value={selectedResident}
            onChange={(e) => setSelectedResident(e.target.value)}
          >
            <option value="">{t('familyActivity.selectResident')}</option>
            {familyResidents.map((resident) => (
              <option key={resident._id} value={resident._id}>
                {resident.fullName || t('familyActivity.unnamedResident')} {resident.residentCode ? `(${resident.residentCode})` : ''}
              </option>
            ))}
          </select>
        </div>

        <form className="adm-filter-grid">
          <div>
            <label className="text-sm font-semibold">{t('familyActivity.searchLabel')}</label>
            <div className="adm-filter-input-wrapper">
              <Search className="adm-filter-input-icon" size={14} />
              <input
                type="text"
                placeholder={t('familyActivity.searchPlaceholder')}
                className="adm-filter-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">{t('familyActivity.statusLabel')}</label>
            <select
              className="adm-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t('familyActivity.statusAll')}</option>
              <option value="scheduled">{t('familyActivity.statusScheduled')}</option>
              <option value="ongoing">{t('familyActivity.statusOngoing')}</option>
              <option value="completed">{t('familyActivity.statusCompleted')}</option>
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="adm-btn-refresh" onClick={() => fetchActivities()}>
              <RefreshCw size={14} /> {t('familyActivity.refresh')}
            </button>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: actionMessageType === 'success' ? '#dcfce7' : '#fee2e2',
              color: actionMessageType === 'success' ? '#166534' : '#b91c1c',
            }}
          >
            {actionMessageType === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {actionMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          {t('familyActivity.loading')}
        </div>
      ) : error ? (
        <div style={{ color: '#b91c1c', padding: '20px', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
          {error}
        </div>
      ) : activities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          {t('familyActivity.empty')}
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {activities.map((activity, idx) => {
              const isResidentRegistered = selectedResident && isRegistered(activity._id, selectedResident);
              return (
                <motion.div
                  key={activity._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.03 * (idx % 12) }}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '8px' }}>{activity.title}</h3>
                    {activity.category && (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: '#e0f2fe',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#0369a1',
                        fontWeight: 500
                      }}>
                        {activity.category}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
                    {activity.description && (
                      <p style={{ margin: '0 0 8px 0' }}>{activity.description}</p>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Calendar size={14} />
                      <span>{new Date(activity.scheduledAt).toLocaleString('vi-VN')}</span>
                    </div>

                    {activity.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <MapPin size={14} />
                        <span>{activity.location}</span>
                      </div>
                    )}

                    {activity.durationMinutes && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Clock size={14} />
                        <span>{formatDurationLabel(activity.durationMinutes)}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} />
                      <span>{t('familyActivity.residentCount', { count: activity.participantResidentIds?.length || 0 })}</span>
                    </div>
                  </div>

                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontSize: '12px'
                  }}>
                    <strong>{t('familyActivity.statusPrefix')}</strong> <span style={{ textTransform: 'capitalize' }}>{getStatusLabel(activity.status)}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button
                      type="button"
                      className="adm-btn-refresh"
                      onClick={() => setSelectedActivityId(activity._id)}
                      title={t('familyActivity.viewDetails')}
                      style={{ flex: 1 }}
                    >
                      <Eye size={14} /> {t('familyActivity.viewDetails')}
                    </button>
                    {isResidentRegistered ? (
                      <button
                        type="button"
                        className="adm-btn-refresh"
                        disabled={!selectedResident || registering || activity.status === 'completed'}
                        onClick={() => handleUnregisterResident(activity._id)}
                        style={{
                          flex: 1,
                          opacity: registering || activity.status === 'completed' ? 0.5 : 1,
                          cursor: registering || activity.status === 'completed' ? 'not-allowed' : 'pointer',
                          color: '#b91c1c',
                        }}
                      >
                        <UserX size={14} /> {t('familyActivity.unregister')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="adm-btn-refresh"
                        disabled={!selectedResident || registering || activity.status === 'cancelled' || activity.status === 'completed'}
                        onClick={() => handleRegisterResident(activity._id)}
                        style={{
                          flex: 1,
                          opacity: !selectedResident || registering || activity.status === 'cancelled' || activity.status === 'completed' ? 0.5 : 1,
                          cursor: !selectedResident || registering || activity.status === 'cancelled' || activity.status === 'completed' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <UserCheck size={14} />
                        {activity.status === 'completed' ? t('familyActivity.cannotRegister') : t('familyActivity.register')}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ─── Activity Detail Modal ─── */}
          {selectedActivityId && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'flex-end',
              zIndex: 1000
            }}>
              <div className="family-activity-modal" style={{
                width: '500px',
                height: '100%',
                backgroundColor: '#fff',
                boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{t('familyActivity.modalTitle')}</h2>
                  <button
                    type="button"
                    onClick={() => setSelectedActivityId(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="family-activity-modal-content" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                  {getSelectedActivity() && (() => {
                    const activity = getSelectedActivity();
                    return (
                      <>
                        {/* Title and Status */}
                        <div style={{ marginBottom: '20px' }}>
                          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700 }}>
                            {activity.title}
                          </h3>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            backgroundColor: activity.status === 'completed' ? '#dcfce7' : activity.status === 'cancelled' ? '#fee2e2' : '#dbeafe',
                            color: activity.status === 'completed' ? '#166534' : activity.status === 'cancelled' ? '#b91c1c' : '#0c4a6e',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}>
                            {getStatusLabel(activity.status)}
                          </span>
                        </div>

                        {/* Description */}
                        {activity.description && (
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>{t('familyActivity.description')}</label>
                            <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>{activity.description}</p>
                          </div>
                        )}

                        {/* Category */}
                        {activity.category && (
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>{t('familyActivity.category')}</label>
                            <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{activity.category}</p>
                          </div>
                        )}

                        {/* Date Range */}
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>{t('familyActivity.time')}</label>
                          <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{formatActivityDateTime(activity)}</p>
                        </div>

                        {/* Duration */}
                        {activity.durationMinutes && (
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>{t('familyActivity.duration')}</label>
                            <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{formatDurationLabel(activity.durationMinutes)}</p>
                          </div>
                        )}

                        {/* Location */}
                        {activity.location && (
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>{t('familyActivity.location')}</label>
                            <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{activity.location}</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          <div className="adm-header" style={{ marginTop: '18px', justifyContent: 'space-between' }}>
            <span>
              {t('familyActivity.pageInfo', { current: page, total: totalPages, count: total })}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="adm-btn-refresh"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                {t('familyActivity.prev')}
              </button>
              <button
                type="button"
                className="adm-btn-refresh"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              >
                {t('familyActivity.next')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
