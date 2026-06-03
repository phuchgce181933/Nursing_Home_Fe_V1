import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, Users, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import activityService from '../../services/activity.service';
import residentService from '../../services/resident.service';
import '../../styles/admin/AdminAdmissionRequestsPage.css';

export default function ActivitySchedulePage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [residents, setResidents] = useState({});

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const params = {
        from: monthStart.toISOString(),
        to: monthEnd.toISOString(),
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      };
      
      const res = await activityService.getActivityList(params);
      setActivities(res?.data || []);
      
      // Load resident details
      if (res?.data?.length > 0) {
        const residentIds = new Set();
        res.data.forEach(activity => {
          if (activity.participantResidentIds?.length > 0) {
            activity.participantResidentIds.forEach(id => residentIds.add(id));
          }
        });
        
        if (residentIds.size > 0) {
          const residentList = await residentService.getResidentList({ page: 1, limit: 100 });
          const residentMap = {};
          residentList?.data?.forEach(resident => {
            residentMap[resident._id] = resident;
          });
          setResidents(residentMap);
        }
      }
    } catch (err) {
      console.error('Fetch activities failed:', err);
      setError(err.response?.data?.message || 'Could not load activities.');
    } finally {
      setLoading(false);
    }
  }, [currentDate, statusFilter, searchQuery]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#94a3b8',
      scheduled: '#3b82f6',
      ongoing: '#f59e0b',
      completed: '#10b981',
      cancelled: '#ef4444',
    };
    return colors[status] || '#64748b';
  };

  const getWeekDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getActivitiesForDate = (date) => {
    return activities.filter(activity => {
      const actDate = new Date(activity.scheduledAt);
      return actDate.toDateString() === date.toDateString();
    });
  };

  const ListViewContent = () => (
    <div className="adm-table-card">
      <div className="adm-table-responsive">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Danh mục</th>
              <th>Ngày/Giờ</th>
              <th>Địa điểm</th>
              <th>Trạng thái</th>
              <th>Người tham gia</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                  Đang tải lịch hoạt động...
                </td>
              </tr>
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                  Không tìm thấy hoạt động nào.
                </td>
              </tr>
            ) : (
              activities.map((activity) => (
                <tr 
                  key={activity._id} 
                  className="adm-table-row"
                  onClick={() => setSelectedActivity(activity)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontWeight: 500 }}>{activity.title}</td>
                  <td>{activity.category || '-'}</td>
                  <td>
                    {activity.scheduledAt ? new Date(activity.scheduledAt).toLocaleString('vi-VN') : '-'}
                  </td>
                  <td>{activity.location || '-'}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      backgroundColor: getStatusColor(activity.status),
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      {activity.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {activity.participantResidentIds?.length || 0} cư dân
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const CalendarViewContent = () => {
    const days = getWeekDays();
    const firstDay = days[0].getDay();
    const gridItems = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      gridItems.push(<div key={`empty-${i}`} style={{ backgroundColor: '#f8fafc' }}></div>);
    }
    
    // Add day cells
    days.forEach(day => {
      const dayActivities = getActivitiesForDate(day);
      gridItems.push(
        <div key={day.toISOString()} style={{
          border: '1px solid #e2e8f0',
          padding: '8px',
          minHeight: '100px',
          backgroundColor: day.toDateString() === new Date().toDateString() ? '#f0f9ff' : 'white'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{day.getDate()}</div>
          {dayActivities.map(activity => (
            <div
              key={activity._id}
              onClick={() => setSelectedActivity(activity)}
              style={{
                fontSize: '11px',
                padding: '2px 4px',
                marginBottom: '2px',
                backgroundColor: getStatusColor(activity.status),
                color: 'white',
                borderRadius: '4px',
                cursor: 'pointer',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={activity.title}
            >
              {activity.title}
            </div>
          ))}
        </div>
      );
    });

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '0',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
          <div
            key={day}
            style={{
              backgroundColor: '#f1f5f9',
              padding: '8px',
              textAlign: 'center',
              fontWeight: 600,
              borderBottom: '2px solid #e2e8f0'
            }}
          >
            {day}
          </div>
        ))}
        {gridItems}
      </div>
    );
  };

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div>
          <h1>
            <Calendar size={26} />
            Lịch hoạt động
          </h1>
          <p>Xem lịch hoạt động và chi tiết tham gia của cư dân.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className={`adm-btn-refresh ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            style={{ backgroundColor: viewMode === 'list' ? '#3b82f6' : undefined, color: viewMode === 'list' ? 'white' : undefined }}
          >
            Danh sách
          </button>
          <button
            type="button"
            className={`adm-btn-refresh ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
            style={{ backgroundColor: viewMode === 'calendar' ? '#3b82f6' : undefined, color: viewMode === 'calendar' ? 'white' : undefined }}
          >
            Lịch
          </button>
        </div>
      </div>

      <div className="adm-filter-panel">
        <form className="adm-filter-grid">
          <div>
            <label className="text-sm font-semibold">Tìm kiếm</label>
            <div className="adm-filter-input-wrapper">
              <Search className="adm-filter-input-icon" size={14} />
              <input
                type="text"
                placeholder="Tìm theo tiêu đề..."
                className="adm-filter-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold">Trạng thái</label>
            <select
              className="adm-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="scheduled">Đã lên lịch</option>
              <option value="ongoing">Đang diễn ra</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="cancelled">Đã huỷ</option>
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="adm-btn-refresh" onClick={() => fetchActivities()}>
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>
        </form>
      </div>

      {viewMode === 'calendar' && (
        <div className="adm-filter-panel" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button type="button" className="adm-btn-refresh" onClick={handlePrevMonth}>
              <ChevronLeft size={16} />
            </button>
            <h2 style={{ margin: 0 }}>
              Tháng {currentDate.getMonth() + 1} năm {currentDate.getFullYear()}
            </h2>
            <button type="button" className="adm-btn-refresh" onClick={handleNextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>
          <CalendarViewContent />
        </div>
      )}

      {viewMode === 'list' && <ListViewContent />}

      {selectedActivity && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)'
          }}>
            <h2 style={{ marginTop: 0 }}>{selectedActivity.title}</h2>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Calendar size={16} />
                <span>{new Date(selectedActivity.scheduledAt).toLocaleString('vi-VN')}</span>
              </div>
              {selectedActivity.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MapPin size={16} />
                  <span>{selectedActivity.location}</span>
                </div>
              )}
              {selectedActivity.durationMinutes && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock size={16} />
                  <span>{selectedActivity.durationMinutes} phút</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} />
                <span>{selectedActivity.participantResidentIds?.length || 0} cư dân</span>
              </div>
            </div>
            
            {selectedActivity.description && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <strong>Mô tả:</strong>
                <p style={{ margin: '8px 0 0 0' }}>{selectedActivity.description}</p>
              </div>
            )}

            {selectedActivity.participantResidentIds?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <strong>Người tham gia ({selectedActivity.participantResidentIds.length}):</strong>
                <div style={{ marginTop: '8px', maxHeight: '200px', overflow: 'auto' }}>
                  {selectedActivity.participantResidentIds.map(residentId => (
                    <div
                      key={residentId}
                      style={{
                        padding: '8px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        marginBottom: '4px',
                        fontSize: '14px'
                      }}
                    >
                      {residents[residentId]?.fullName || `Cư dân ${residentId}`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="adm-btn-refresh"
              onClick={() => setSelectedActivity(null)}
              style={{ width: '100%' }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {error && <div style={{ color: '#b91c1c', marginTop: '16px' }}>{error}</div>}
    </div>
  );
}
