import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Users, CheckCircle, Activity as ActivityIcon } from 'lucide-react';
import activityService from '../../services/activity.service';
import '../../styles/admin/AdminAdmissionRequestsPage.css';

export default function ManagerActivityDashboard() {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); // 'week', 'month', 'year'

  const getDateRange = () => {
    const now = new Date();
    const from = new Date();
    
    if (timeRange === 'week') {
      from.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      from.setMonth(now.getMonth() - 1);
    } else if (timeRange === 'year') {
      from.setFullYear(now.getFullYear() - 1);
    }
    
    return { from: from.toISOString(), to: now.toISOString() };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const dateRange = getDateRange();
      
      const [statsRes, listRes] = await Promise.all([
        activityService.getActivityStatistics({ ...dateRange }),
        activityService.getActivityList({ 
          ...dateRange, 
          limit: 10,
          status: 'scheduled,ongoing,completed'
        })
      ]);
      
      setStats(statsRes);
      setActivities(listRes?.data || []);
    } catch (err) {
      console.error('Fetch failed:', err);
      setError(err.response?.data?.message || 'Could not load statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      border: `2px solid ${color}`,
      flex: 1,
      minWidth: '200px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <Icon size={24} color={color} />
        <span style={{ fontSize: '14px', color: '#64748b' }}>{label}</span>
      </div>
      <div style={{ fontSize: '32px', fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div>
          <h1>
            <ActivityIcon size={26} />
            Dashboard Hoạt động
          </h1>
          <p>Thống kê và quản lý hoạt động của cơ sở.</p>
        </div>
        <div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="adm-filter-select"
            style={{ width: 'auto' }}
          >
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="year">Năm này</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Đang tải dữ liệu...
        </div>
      ) : error ? (
        <div style={{ color: '#b91c1c', padding: '20px', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
          {error}
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}>
            <StatCard
              icon={Calendar}
              label="Tổng hoạt động"
              value={stats?.totalActivities || 0}
              color="#3b82f6"
            />
            <StatCard
              icon={Users}
              label="Tổng người tham gia"
              value={stats?.totalParticipants || 0}
              color="#10b981"
            />
            <StatCard
              icon={CheckCircle}
              label="Hoạt động hoàn thành"
              value={stats?.statusCounts?.completed || 0}
              color="#f59e0b"
            />
            <StatCard
              icon={TrendingUp}
              label="Hoạt động sắp tới"
              value={stats?.statusCounts?.scheduled || 0}
              color="#8b5cf6"
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div className="adm-filter-panel">
              <h3 style={{ marginTop: 0 }}>Trạng thái hoạt động</h3>
              {stats?.statusCounts && Object.entries(stats.statusCounts).map(([status, count]) => (
                <div key={status} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <span style={{ textTransform: 'capitalize' }}>{status}</span>
                  <span style={{ fontWeight: 600, fontSize: '16px' }}>{count}</span>
                </div>
              ))}
            </div>

            <div className="adm-filter-panel">
              <h3 style={{ marginTop: 0 }}>Phân loại hoạt động</h3>
              {stats?.categoryCounts && Object.entries(stats.categoryCounts).length > 0 ? (
                Object.entries(stats.categoryCounts).map(([category, count]) => (
                  <div key={category} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <span>{category || 'Không phân loại'}</span>
                    <span style={{ fontWeight: 600, fontSize: '16px' }}>{count}</span>
                  </div>
                ))
              ) : (
                <p style={{ color: '#94a3b8', marginBottom: 0 }}>Chưa có dữ liệu</p>
              )}
            </div>
          </div>

          <div className="adm-filter-panel">
            <h3 style={{ marginTop: 0 }}>Hoạt động gần đây</h3>
            {activities.length === 0 ? (
              <p style={{ color: '#94a3b8', marginBottom: 0 }}>Không có hoạt động nào.</p>
            ) : (
              <div style={{ overflow: 'auto', maxHeight: '400px' }}>
                {activities.map((activity) => (
                  <div key={activity._id} style={{
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    borderLeft: '4px solid #3b82f6'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                      {activity.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      {new Date(activity.scheduledAt).toLocaleString('vi-VN')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {activity.participantResidentIds?.length || 0} cư dân tham gia
                    </div>
                    <div style={{
                      marginTop: '4px',
                      display: 'inline-block',
                      padding: '2px 8px',
                      backgroundColor: '#e0f2fe',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#0369a1',
                      fontWeight: 500
                    }}>
                      {activity.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
