import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, PieChart as PieChartIcon } from 'lucide-react';
import activityService from '../../services/activity.service';
import '../../styles/admin/AdminAdmissionRequestsPage.css';

export default function ActivityStatisticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('month');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const getDateRange = () => {
    const now = new Date();
    const from = new Date();

    if (timeRange === 'week') {
      from.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      from.setMonth(now.getMonth() - 1);
    } else if (timeRange === 'quarter') {
      from.setMonth(now.getMonth() - 3);
    } else if (timeRange === 'year') {
      from.setFullYear(now.getFullYear() - 1);
    }

    return { from: from.toISOString(), to: now.toISOString() };
  };

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const dateRange = getDateRange();
      const params = {
        ...dateRange,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      };

      const res = await activityService.getActivityStatistics(params);
      setStats(res);
    } catch (err) {
      console.error('Fetch statistics failed:', err);
      setError(err.response?.data?.message || 'Could not load statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [timeRange, categoryFilter, statusFilter]);

  const StatBox = ({ icon: Icon, label, value, color, subtext }) => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      border: `3px solid ${color}`,
      flex: 1,
      minWidth: '200px',
      textAlign: 'center'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
        <Icon size={32} color={color} />
      </div>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '36px', fontWeight: 700, color }}>
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
          {subtext}
        </div>
      )}
    </div>
  );

  const ChartData = ({ title, data }) => (
    <div className="adm-filter-panel">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {Object.keys(data).length === 0 ? (
        <p style={{ color: '#94a3b8', marginBottom: 0 }}>Không có dữ liệu</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(data).map(([key, value]) => {
            const maxValue = Math.max(...Object.values(data));
            const percentage = (value / maxValue) * 100;
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                    {key || 'Không xác định'}
                  </span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
                <div style={{
                  height: '8px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: '#3b82f6',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div>
          <h1>
            <BarChart3 size={26} />
            Thống kê hoạt động
          </h1>
          <p>Phân tích chi tiết về hoạt động và sự tham gia của cư dân.</p>
        </div>
      </div>

      <div className="adm-filter-panel">
        <form className="adm-filter-grid">
          <div>
            <label className="text-sm font-semibold">Khoảng thời gian</label>
            <select
              className="adm-filter-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="week">Tuần này</option>
              <option value="month">Tháng này</option>
              <option value="quarter">Quý này</option>
              <option value="year">Năm này</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Danh mục</label>
            <input
              type="text"
              className="adm-filter-input"
              placeholder="Lọc theo danh mục"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Trạng thái</label>
            <select
              className="adm-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="scheduled">Đã lên lịch</option>
              <option value="ongoing">Đang diễn ra</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="cancelled">Đã huỷ</option>
            </select>
          </div>
        </form>
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
            <StatBox
              icon={Calendar}
              label="Tổng hoạt động"
              value={stats?.totalActivities || 0}
              color="#3b82f6"
            />
            <StatBox
              icon={Users}
              label="Tổng người tham gia"
              value={stats?.totalParticipants || 0}
              color="#10b981"
            />
            <StatBox
              icon={TrendingUp}
              label="Trung bình/hoạt động"
              value={stats?.totalActivities > 0 
                ? Math.round((stats?.totalParticipants || 0) / (stats?.totalActivities || 1))
                : 0
              }
              color="#f59e0b"
              subtext="cư dân tham gia"
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '24px'
          }}>
            {stats?.statusCounts && Object.keys(stats.statusCounts).length > 0 && (
              <ChartData
                title="Hoạt động theo trạng thái"
                data={stats.statusCounts}
              />
            )}

            {stats?.categoryCounts && Object.keys(stats.categoryCounts).length > 0 && (
              <ChartData
                title="Hoạt động theo danh mục"
                data={stats.categoryCounts}
              />
            )}
          </div>

          {stats && (
            <div className="adm-filter-panel">
              <h3 style={{ marginTop: 0 }}>Tóm tắt</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: '12px', color: '#065f46', fontWeight: 500 }}>Hoạt động hoàn thành</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                    {stats?.statusCounts?.completed || 0}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#fefce8', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 500 }}>Hoạt động đang diễn ra</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                    {stats?.statusCounts?.ongoing || 0}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 500 }}>Hoạt động sắp tới</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
                    {stats?.statusCounts?.scheduled || 0}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 500 }}>Hoạt động đã huỷ</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
                    {stats?.statusCounts?.cancelled || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
