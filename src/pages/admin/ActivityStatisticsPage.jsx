import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp, Users, Calendar, PieChart as PieChartIcon } from 'lucide-react';
import activityService from '../../services/activity.service';
import '../../styles/admin/AdminAdmissionRequestsPage.css';

export default function ActivityStatisticsPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalParticipants: 0,
    statusCounts: {},
    categoryCounts: {},
    participationRate: 0,
  });
  const [activities, setActivities] = useState([]);
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

      const [statsRes, listRes] = await Promise.all([
        activityService.getActivityStatistics(params),
        activityService.getActivityList({ ...dateRange, limit: 10, status: 'scheduled,ongoing,completed' }),
      ]);
      setStats(statsRes);
      setActivities(listRes?.data || []);
    } catch (err) {
      console.error('Fetch statistics failed:', err);
      setError(err.response?.data?.message || t('activityStatistics.loadError'));
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
        <p style={{ color: '#94a3b8', marginBottom: 0 }}>{t('activityStatistics.noData')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(data).map(([key, value]) => {
            const maxValue = Math.max(...Object.values(data));
            const percentage = (value / maxValue) * 100;
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                    {key || t('activityStatistics.unknown')}
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
                    backgroundColor: '#0f766e',
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
            {t('activityStatistics.title')}
          </h1>
          <p>{t('activityStatistics.subtitle')}</p>
        </div>
      </div>

      <div className="adm-filter-panel">
        <form className="adm-filter-grid">
          <div>
            <label className="text-sm font-semibold">{t('activityStatistics.filter.timeRange')}</label>
            <select
              className="adm-filter-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="week">{t('activityStatistics.filter.week')}</option>
              <option value="month">{t('activityStatistics.filter.month')}</option>
              <option value="quarter">{t('activityStatistics.filter.quarter')}</option>
              <option value="year">{t('activityStatistics.filter.year')}</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">{t('activityStatistics.filter.category')}</label>
            <input
              type="text"
              className="adm-filter-input"
              placeholder={t('activityStatistics.filter.categoryPlaceholder')}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">{t('activityStatistics.filter.status')}</label>
            <select
              className="adm-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t('activityStatistics.filter.all')}</option>
              <option value="scheduled">{t('activityStatistics.filter.scheduled')}</option>
              <option value="ongoing">{t('activityStatistics.filter.ongoing')}</option>
              <option value="completed">{t('activityStatistics.filter.completed')}</option>
              <option value="cancelled">{t('activityStatistics.filter.cancelled')}</option>
            </select>
          </div>
        </form>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          {t('activityStatistics.loading')}
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
              label={t('activityStatistics.stats.totalActivities')}
              value={stats?.totalActivities || 0}
              color="#0f766e"
            />
            <StatBox
              icon={Users}
              label={t('activityStatistics.stats.totalParticipants')}
              value={stats?.totalParticipants || 0}
              color="#10b981"
            />
            <StatBox
              icon={PieChartIcon}
              label={t('activityStatistics.stats.participationRate')}
              value={`${stats?.participationRate || 0}%`}
              color="#8b5cf6"
              subtext={t('activityStatistics.stats.participationRateSubtext')}
            />
            <StatBox
              icon={TrendingUp}
              label={t('activityStatistics.stats.avgPerActivity')}
              value={stats?.totalActivities > 0
                ? Math.round((stats?.totalParticipants || 0) / (stats?.totalActivities || 1))
                : 0
              }
              color="#f59e0b"
              subtext={t('activityStatistics.stats.avgSubtext')}
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
                title={t('activityStatistics.charts.byStatus')}
                data={stats.statusCounts}
              />
            )}

            {stats?.categoryCounts && Object.keys(stats.categoryCounts).length > 0 && (
              <ChartData
                title={t('activityStatistics.charts.byCategory')}
                data={stats.categoryCounts}
              />
            )}
          </div>

          {stats && (
            <div className="adm-filter-panel">
              <h3 style={{ marginTop: 0 }}>{t('activityStatistics.summary.title')}</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: '12px', color: '#065f46', fontWeight: 500 }}>{t('activityStatistics.summary.completed')}</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                    {stats?.statusCounts?.completed || 0}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#fefce8', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 500 }}>{t('activityStatistics.summary.ongoing')}</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                    {stats?.statusCounts?.ongoing || 0}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'rgba(15, 118, 110, 0.08)', borderRadius: '8px', borderLeft: '4px solid #0f766e' }}>
                  <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 500 }}>{t('activityStatistics.summary.upcoming')}</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f766e' }}>
                    {stats?.statusCounts?.scheduled || 0}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 500 }}>{t('activityStatistics.summary.cancelled')}</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
                    {stats?.statusCounts?.cancelled || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="adm-filter-panel">
            <h3 style={{ marginTop: 0 }}>{t('activityStatistics.recentActivities.title')}</h3>
            {activities.length === 0 ? (
              <p style={{ color: '#94a3b8', marginBottom: 0 }}>{t('activityStatistics.recentActivities.noActivities')}</p>
            ) : (
              <div style={{ overflow: 'auto', maxHeight: '400px' }}>
                {activities.map((activity) => (
                  <div key={activity._id} style={{
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    borderLeft: '4px solid #0f766e'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                      {activity.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      {new Date(activity.scheduledAt).toLocaleString('vi-VN')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {t('activityStatistics.recentActivities.participantsCount', { count: activity.participantResidentIds?.length || 0 })}
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
