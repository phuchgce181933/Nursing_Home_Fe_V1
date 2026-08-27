import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  AlertTriangle,
  Activity,
  DollarSign,
  TrendingUp,
  Heart,
  ShieldCheck,
  ClipboardList,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import reportService from '../../services/report.service';
import '../../styles/admin/DashboardPage.css';

const COLORS = ['#1A365D', '#2D6A4F', '#E07A2F', '#B91C1C', '#7C3AED', '#0891B2', '#94A3B8'];

const SEVERITY_COLORS = {
  low: '#2D6A4F',
  medium: '#E07A2F',
  high: '#B91C1C',
  critical: '#7C3AED',
};

const CARE_TASK_COLORS = {
  completed: '#2D6A4F',
  in_progress: '#0891B2',
  pending: '#E07A2F',
  skipped: '#94A3B8',
  missed: '#B91C1C',
};

const formatCurrency = (amount) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString('vi-VN');
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [residentCount, setResidentCount] = useState(null);
  const [incidents, setIncidents] = useState(null);
  const [careActivity, setCareActivity] = useState(null);
  const [timeSeries, setTimeSeries] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, residentRes, incidentRes, careRes, timeSeriesRes] = await Promise.all([
        reportService.getSummaryReport().catch(() => null),
        reportService.getResidentCountReport().catch(() => null),
        reportService.getIncidentReport().catch(() => null),
        reportService.getCareActivityReport().catch(() => null),
        reportService.getTimeSeriesReport({ metric: 'incidents', granularity: 'month' }).catch(() => null),
      ]);
      setSummary(summaryRes);
      setResidentCount(residentRes);
      setIncidents(incidentRes);
      setCareActivity(careRes);
      setTimeSeries(timeSeriesRes);
    } catch {
      setError(t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Loader2 size={32} className="dashboard-loading__spinner" />
        <span>{t('dashboard.loadingData')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <AlertTriangle size={24} />
        <span>{error}</span>
        <button onClick={fetchData} className="dashboard-error__retry">{t('dashboard.retry')}</button>
      </div>
    );
  }

  const kpiCards = [
    {
      title: t('dashboard.kpi.totalResidents'),
      value: summary?.totalResidents ?? 0,
      sub: t('dashboard.kpi.residentsSub', { count: summary?.activeResidents ?? 0 }),
      icon: Users,
      color: '#1A365D',
      bg: '#EBF0F7',
    },
    {
      title: t('dashboard.kpi.incidents'),
      value: summary?.totalIncidents ?? 0,
      sub: t('dashboard.kpi.incidentsSub', { count: summary?.openIncidents ?? 0 }),
      icon: AlertTriangle,
      color: '#B91C1C',
      bg: '#FEF2F2',
    },
    {
      title: t('dashboard.kpi.activities'),
      value: summary?.totalActivities ?? 0,
      sub: t('dashboard.kpi.activitiesSub', { count: summary?.completedActivities ?? 0 }),
      icon: Activity,
      color: '#2D6A4F',
      bg: '#ECFDF5',
    },
    {
      title: t('dashboard.kpi.revenue'),
      value: formatCurrency(summary?.invoiceSummary?.totalAmount ?? 0),
      sub: t('dashboard.kpi.revenueSub', { amount: formatCurrency(summary?.invoiceSummary?.outstandingAmount ?? 0) + '₫' }),
      icon: DollarSign,
      color: '#E07A2F',
      bg: '#FFF7ED',
      isCurrency: true,
    },
  ];

  const residentStatusData = (residentCount?.statuses || []).map((s) => ({
    name: t(`dashboard.status.${s.residencyStatus}`, s.residencyStatus),
    value: s.count,
  }));

  const severityData = (incidents?.severityBreakdown || []).map((s) => ({
    name: t(`dashboard.severity.${s.severity}`, s.severity),
    value: s.count,
    fill: SEVERITY_COLORS[s.severity] || '#94A3B8',
  }));

  const careTaskData = (careActivity?.tasksByStatus || []).map((s) => ({
    name: t(`dashboard.taskStatus.${s.status}`, s.status),
    value: s.count,
    fill: CARE_TASK_COLORS[s.status] || '#94A3B8',
  }));

  const incidentTimeData = (timeSeries?.series || []).map((s) => ({
    period: s.period,
    value: s.value,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="dashboard-tooltip">
        {label && <div className="dashboard-tooltip__label">{label}</div>}
        {payload.map((p, i) => (
          <div key={i} className="dashboard-tooltip__row">
            <span className="dashboard-tooltip__dot" style={{ background: p.color || p.fill }} />
            <span>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString('vi-VN') : p.value}</strong></span>
          </div>
        ))}
      </div>
    );
  };

  const renderPieLegend = ({ payload }) => (
    <ul className="dashboard-pie-legend">
      {payload.map((entry, index) => (
        <li key={index} className="dashboard-pie-legend__item">
          <span className="dashboard-pie-legend__dot" style={{ background: entry.color }} />
          <span className="dashboard-pie-legend__text">{entry.value}</span>
        </li>
      ))}
    </ul>
  );

  const quantityLabel = t('dashboard.charts.quantity');

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__title">{t('dashboard.title')}</h1>
          <p className="dashboard-page__subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <button onClick={fetchData} className="dashboard-refresh-btn" title={t('dashboard.refresh')}>
          <RefreshCw size={16} />
          {t('dashboard.refresh')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-kpi-grid">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="dashboard-kpi-card">
              <div className="dashboard-kpi-card__icon" style={{ background: card.bg, color: card.color }}>
                <Icon size={22} />
              </div>
              <div className="dashboard-kpi-card__content">
                <span className="dashboard-kpi-card__title">{card.title}</span>
                <span className="dashboard-kpi-card__value" style={{ color: card.color }}>
                  {card.isCurrency ? `${card.value}₫` : card.value}
                </span>
                <span className="dashboard-kpi-card__sub">{card.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="dashboard-charts-grid">
        <div className="dashboard-chart-card">
          <div className="dashboard-chart-card__header">
            <div className="dashboard-chart-card__icon" style={{ background: '#EBF0F7', color: '#1A365D' }}>
              <Users size={18} />
            </div>
            <h3 className="dashboard-chart-card__title">{t('dashboard.charts.residentStatus')}</h3>
          </div>
          <div className="dashboard-chart-card__body">
            {residentStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={residentStatusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {residentStatusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderPieLegend} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-chart-empty">{t('dashboard.noData')}</div>
            )}
          </div>
        </div>

        <div className="dashboard-chart-card">
          <div className="dashboard-chart-card__header">
            <div className="dashboard-chart-card__icon" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
              <ShieldCheck size={18} />
            </div>
            <h3 className="dashboard-chart-card__title">{t('dashboard.charts.incidentSeverity')}</h3>
          </div>
          <div className="dashboard-chart-card__body">
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={severityData} barSize={36} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name={quantityLabel} radius={[6, 6, 0, 0]}>
                    {severityData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-chart-empty">{t('dashboard.noData')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="dashboard-charts-grid">
        <div className="dashboard-chart-card">
          <div className="dashboard-chart-card__header">
            <div className="dashboard-chart-card__icon" style={{ background: '#ECFDF5', color: '#2D6A4F' }}>
              <ClipboardList size={18} />
            </div>
            <h3 className="dashboard-chart-card__title">{t('dashboard.charts.careTasks')}</h3>
          </div>
          <div className="dashboard-chart-card__body">
            {careTaskData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={careTaskData} barSize={36} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name={quantityLabel} radius={[6, 6, 0, 0]}>
                    {careTaskData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-chart-empty">{t('dashboard.noData')}</div>
            )}
          </div>
        </div>

        <div className="dashboard-chart-card">
          <div className="dashboard-chart-card__header">
            <div className="dashboard-chart-card__icon" style={{ background: '#F0F9FF', color: '#0891B2' }}>
              <TrendingUp size={18} />
            </div>
            <h3 className="dashboard-chart-card__title">{t('dashboard.charts.incidentTrend')}</h3>
          </div>
          <div className="dashboard-chart-card__body">
            {incidentTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={incidentTimeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1A365D" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1A365D" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name={t('dashboard.kpi.incidents')}
                    stroke="#1A365D"
                    strokeWidth={2.5}
                    fill="url(#areaGradient)"
                    dot={{ r: 4, fill: '#1A365D', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#1A365D', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-chart-empty">{t('dashboard.noData')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="dashboard-summary-grid">
        <SummaryItem
          icon={Heart}
          label={t('dashboard.summary.abnormalHealth')}
          value={summary?.openIncidents ?? 0}
          total={summary?.totalIncidents ?? 0}
          color="#B91C1C"
          bg="#FEF2F2"
        />
        <SummaryItem
          icon={Activity}
          label={t('dashboard.summary.scheduledActivities')}
          value={summary?.scheduledActivities ?? 0}
          total={summary?.totalActivities ?? 0}
          color="#2D6A4F"
          bg="#ECFDF5"
        />
        <SummaryItem
          icon={DollarSign}
          label={t('dashboard.summary.confirmedPayments')}
          value={summary?.paymentSummary?.totalPayments ?? 0}
          total={summary?.invoiceSummary?.totalInvoices ?? 0}
          color="#E07A2F"
          bg="#FFF7ED"
        />
      </div>
    </div>
  );
}

function SummaryItem({ icon: Icon, label, value, total, color, bg }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="dashboard-summary-item">
      <div className="dashboard-summary-item__icon" style={{ background: bg, color }}>
        <Icon size={18} />
      </div>
      <div className="dashboard-summary-item__content">
        <span className="dashboard-summary-item__label">{label}</span>
        <div className="dashboard-summary-item__row">
          <span className="dashboard-summary-item__value">{value} / {total}</span>
          <span className="dashboard-summary-item__pct" style={{ color }}>{pct}%</span>
        </div>
        <div className="dashboard-summary-item__bar">
          <div className="dashboard-summary-item__bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}
