import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users, Pill, ClipboardCheck, AlertTriangle,
  Clock, RefreshCw, Loader2,
  ChevronRight, Calendar, TrendingUp,
  Activity, CheckCircle2, AlertCircle,
  Heart, Stethoscope,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import medicationService from '../../services/medication.service';
import incidentService from '../../services/incident.service';
import shiftService from '../../services/shift.service';
import careTaskService from '../../services/careTask.service';
import useAuth from '../../hooks/useAuth';
import '../../styles/nurse/NurseDashboardPage.css';

const todayISO = new Date().toISOString().split('T')[0];

const MED_COLORS = {
  taken: '#10b981',
  late_taken: '#f59e0b',
  pending: '#0f766e',
  missed: '#ef4444',
};

const TASK_COLORS = {
  completed: '#10b981',
  in_progress: '#0f766e',
  pending: '#f59e0b',
  skipped: '#94a3b8',
  missed: '#ef4444',
};

const SEVERITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7c3aed',
};

const getSeverityVI = (t) => ({
  low: t('nurseDashboard.severity.low'),
  medium: t('nurseDashboard.severity.medium'),
  high: t('nurseDashboard.severity.high'),
  critical: t('nurseDashboard.severity.critical'),
});

const getStatusVI = (t) => ({
  open: t('nurseDashboard.status.open'),
  in_progress: t('nurseDashboard.status.inProgress'),
  resolved: t('nurseDashboard.status.resolved'),
});

const STATUS_COLORS = {
  open: '#ef4444',
  in_progress: '#f59e0b',
  resolved: '#10b981',
};

const getTaskVI = (t) => ({
  completed: t('nurseDashboard.taskStatus.completed'),
  in_progress: t('nurseDashboard.taskStatus.inProgress'),
  pending: t('nurseDashboard.taskStatus.pending'),
  skipped: t('nurseDashboard.taskStatus.skipped'),
  missed: t('nurseDashboard.taskStatus.missed'),
});

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function greeting(t) {
  const h = new Date().getHours();
  if (h < 12) return t('nurseDashboard.greetingMorning');
  if (h < 18) return t('nurseDashboard.greetingAfternoon');
  return t('nurseDashboard.greetingEvening');
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="nd2-tooltip">
      {label && <p className="nd2-tooltip__label">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="nd2-tooltip__row">
          <span className="nd2-tooltip__dot" style={{ background: p.color || p.fill }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

function getWeekLabel(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  return monday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function NurseDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const SEVERITY_VI = getSeverityVI(t);
  const STATUS_VI = getStatusVI(t);
  const TASK_VI = getTaskVI(t);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [allIncidents, setAllIncidents] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [myShifts, setMyShifts] = useState([]);
  const [medStats, setMedStats] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);

  const assignedResidentCount = user?.staffProfile?.assignedResidentIds?.length ?? 0;

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const toDate = nextWeek.toISOString().split('T')[0];

    // 8 weeks ago — backend uses incidentFrom/incidentTo
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const trendFromDate = eightWeeksAgo.toISOString().split('T')[0];

    const results = await Promise.allSettled([
      // All incidents last 8 weeks — backend: items[], total, incidentAt field
      incidentService.listIncidents({ limit: 200, incidentFrom: trendFromDate }),
      // Recent open incidents for list
      incidentService.listIncidents({ status: 'open', limit: 5 }),
      // My upcoming shifts — backend: data[]
      shiftService.getMyShifts({ fromDate: todayISO, toDate }),
      // Today's care tasks
      careTaskService.listCareTasks({ workDate: todayISO }),
      // Today's medication schedule
      medicationService.getDailySchedule({ date: todayISO }),
    ]);

    const [allIncR, recentIncR, shiftsR, tasksR, medR] = results;

    // incidents: backend returns { items: [...], total, page, limit, totalPages }
    if (allIncR.status === 'fulfilled') {
      const d = allIncR.value;
      const arr = Array.isArray(d) ? d
        : Array.isArray(d?.items) ? d.items
        : Array.isArray(d?.data) ? d.data : [];
      setAllIncidents(arr);
    }

    if (recentIncR.status === 'fulfilled') {
      const d = recentIncR.value;
      const arr = Array.isArray(d) ? d
        : Array.isArray(d?.items) ? d.items
        : Array.isArray(d?.data) ? d.data : [];
      setRecentIncidents(arr.slice(0, 5));
    }

    if (shiftsR.status === 'fulfilled') {
      const d = shiftsR.value;
      const arr = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
      setMyShifts(arr);
    }

    if (tasksR.status === 'fulfilled') {
      const d = tasksR.value;
      const arr = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
      setTodayTasks(arr);
    }

    if (medR.status === 'fulfilled') {
      const d = medR.value;
      const items = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
      let schedules = [];
      items.forEach(item => {
        if (Array.isArray(item.schedules)) schedules.push(...item.schedules);
        else schedules.push(item);
      });
      // Backend uses UPPERCASE statuses: PENDING, OVERDUE, TAKEN, LATE_TAKEN, MISSED
      const counts = { taken: 0, late_taken: 0, pending: 0, missed: 0 };
      schedules.forEach(s => {
        const st = (s.status || '').toUpperCase();
        if (st === 'TAKEN') counts.taken++;
        else if (st === 'LATE_TAKEN') counts.late_taken++;
        else if (st === 'PENDING' || st === 'OVERDUE' || st === 'SCHEDULED') counts.pending++;
        else if (st === 'MISSED') counts.missed++;
      });
      setMedStats(counts);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Derived: medication ────────────────────────────────────────
  const totalDoses = medStats ? Object.values(medStats).reduce((a, b) => a + b, 0) : 0;
  const doneCount = (medStats?.taken ?? 0) + (medStats?.late_taken ?? 0);
  const medCompletePct = totalDoses > 0 ? Math.round((doneCount / totalDoses) * 100) : 0;

  const medPieData = medStats
    ? Object.entries(medStats)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({
          name: k === 'taken' ? t('nurseDashboard.medChart.taken') : k === 'late_taken' ? t('nurseDashboard.medChart.lateTaken') : k === 'pending' ? t('nurseDashboard.medChart.pending') : t('nurseDashboard.medChart.missed'),
          value: v,
          fill: MED_COLORS[k],
        }))
    : [];

  // ── Derived: care tasks (aggregate today) ─────────────────────
  const careTaskData = Object.entries(
    todayTasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({
    name: TASK_VI[status] || status,
    value: count,
    fill: TASK_COLORS[status] || '#94a3b8',
  }));

  // ── Derived: incidents severity ───────────────────────────────
  const severityData = Object.entries(
    allIncidents.reduce((acc, inc) => {
      if (inc.severity) acc[inc.severity] = (acc[inc.severity] || 0) + 1;
      return acc;
    }, {})
  ).map(([sev, count]) => ({
    name: SEVERITY_VI[sev] || sev,
    value: count,
    fill: SEVERITY_COLORS[sev] || '#94a3b8',
  }));

  // ── Derived: incident trend by week (use incidentAt field) ───
  const weekMap = {};
  allIncidents.forEach(inc => {
    const dateField = inc.incidentAt || inc.createdAt;
    if (dateField) {
      const label = getWeekLabel(dateField);
      weekMap[label] = (weekMap[label] || 0) + 1;
    }
  });
  const trendData = Object.entries(weekMap)
    .sort(([a], [b]) => {
      const [da, ma] = a.split('/').map(Number);
      const [db, mb] = b.split('/').map(Number);
      return ma !== mb ? ma - mb : da - db;
    })
    .slice(-8)
    .map(([period, value]) => ({ period, incidents: value }));

  // ── Derived: shifts ───────────────────────────────────────────
  const todayShifts = myShifts.filter(s => s.workDate?.startsWith(todayISO));
  const upcomingShifts = myShifts.filter(s => !s.workDate?.startsWith(todayISO)).slice(0, 4);
  const completedTasks = todayTasks.filter(t => t.status === 'completed').length;
  const openIncidentCount = allIncidents.filter(i => i.status === 'open' || i.status === 'investigating').length;

  if (loading) {
    return (
      <div className="nd2-loading-screen">
        <Loader2 size={32} className="nd2-spin" />
        <span>{t('nurseDashboard.loading')}</span>
      </div>
    );
  }

  return (
    <div className="nd2-page">

      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="nd2-header">
        <div className="nd2-header__left">
          <div className="nd2-header__icon">
            <Stethoscope size={22} />
          </div>
          <div>
            <h1 className="nd2-header__title">
              {greeting(t)}, <span>{user?.fullName?.split(' ').pop() || t('nurseDashboard.defaultNurse')}</span>
            </h1>
            <p className="nd2-header__date">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <button
          className="nd2-refresh-btn"
          onClick={() => fetchAll(true)}
          disabled={refreshing}
        >
          <RefreshCw size={15} className={refreshing ? 'nd2-spin' : ''} />
          {t('nurseDashboard.refresh')}
        </button>
      </div>

      {/* ═══════════════ KPI GRID ═══════════════ */}
      <div className="nd2-kpi-grid">
        <KpiCard
          icon={Users} color="#0f766e" bg="rgba(15, 118, 110, 0.08)"
          label={t('nurseDashboard.kpi.assignedResidents')}
          value={assignedResidentCount}
          sub={t('nurseDashboard.kpi.assignedResidentsSub')}
          onClick={() => navigate('/nurse/meal-plans')}
        />
        <KpiCard
          icon={Pill} color="#10b981" bg="#d1fae5"
          label={t('nurseDashboard.kpi.pendingDoses')}
          value={medStats?.pending ?? 0}
          sub={t('nurseDashboard.kpi.dosesTodaySub', { total: totalDoses, pct: medCompletePct })}
          onClick={() => navigate('/nurse/medications')}
        />
        <KpiCard
          icon={ClipboardCheck} color="#f59e0b" bg="#fef3c7"
          label={t('nurseDashboard.kpi.careTasks')}
          value={`${completedTasks}/${todayTasks.length}`}
          sub={t('nurseDashboard.kpi.careTasksSub', { count: todayTasks.length - completedTasks })}
          onClick={() => navigate('/nurse/activity-schedule')}
        />
        <KpiCard
          icon={AlertTriangle} color="#ef4444" bg="#fee2e2"
          label={t('nurseDashboard.kpi.openIncidents')}
          value={openIncidentCount}
          sub={t('nurseDashboard.kpi.incidentsSub', { count: allIncidents.length })}
          onClick={() => navigate('/incidents')}
        />
        <KpiCard
          icon={Clock} color="#8b5cf6" bg="#ede9fe"
          label={t('nurseDashboard.kpi.shiftToday')}
          value={todayShifts.length}
          sub={todayShifts[0]
            ? `${todayShifts[0].shiftTemplate?.name || todayShifts[0].templateName || t('nurseDashboard.kpi.shiftDefault')}`
            : t('nurseDashboard.kpi.noShiftToday')}
          onClick={() => navigate('/my-shifts')}
        />
      </div>

      {/* ═══════════════ MEDICATION PROGRESS BAR ═══════════════ */}
      {totalDoses > 0 && (
        <div className="nd2-progress-card">
          <div className="nd2-progress-card__header">
            <div className="nd2-chart-icon" style={{ background: '#d1fae5', color: '#10b981' }}>
              <Activity size={17} />
            </div>
            <div className="nd2-progress-card__info">
              <h3 className="nd2-progress-card__title">{t('nurseDashboard.medProgress.title')}</h3>
              <p className="nd2-progress-card__sub">
                {t('nurseDashboard.medProgress.completed', { done: doneCount, total: totalDoses })}
              </p>
            </div>
            <span className="nd2-progress-card__pct" style={{ color: medCompletePct >= 80 ? '#10b981' : medCompletePct >= 50 ? '#f59e0b' : '#ef4444' }}>
              {medCompletePct}%
            </span>
          </div>
          <div className="nd2-stacked-bar">
            {medPieData.map((d, i) => (
              <div
                key={i}
                className="nd2-stacked-bar__seg"
                style={{ width: `${(d.value / totalDoses) * 100}%`, background: d.fill }}
                title={`${d.name}: ${d.value}`}
              />
            ))}
          </div>
          <div className="nd2-stacked-bar__legend">
            {medPieData.map((d, i) => (
              <div key={i} className="nd2-stacked-bar__legend-item">
                <span className="nd2-stacked-bar__dot" style={{ background: d.fill }} />
                <span>{d.name}: <strong>{d.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ CHARTS ROW 1 (3 columns) ═══════════════ */}
      <div className="nd2-charts-row-3">

        {/* Medication Donut */}
        <div className="nd2-chart-card">
          <div className="nd2-chart-card__head">
            <div className="nd2-chart-icon" style={{ background: '#d1fae5', color: '#10b981' }}>
              <Pill size={17} />
            </div>
            <div>
              <h3 className="nd2-chart-card__title">{t('nurseDashboard.medChart.title')}</h3>
              <p className="nd2-chart-card__sub">{t('nurseDashboard.medChart.sub', { total: totalDoses })}</p>
            </div>
          </div>
          <div className="nd2-chart-body">
            {medPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={medPieData}
                    cx="50%" cy="42%"
                    innerRadius={58} outerRadius={88}
                    paddingAngle={3} dataKey="value" stroke="none"
                  >
                    {medPieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle" iconSize={9}
                    formatter={(val, entry) => (
                      <span style={{ color: '#475569', fontSize: 12 }}>
                        {val} <strong style={{ color: '#1e293b' }}>({entry.payload.value})</strong>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="nd2-empty-chart">{t('nurseDashboard.medChart.empty')}</div>
            )}
          </div>
        </div>

        {/* Care Task Bar */}
        <div className="nd2-chart-card">
          <div className="nd2-chart-card__head">
            <div className="nd2-chart-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>
              <ClipboardCheck size={17} />
            </div>
            <div>
              <h3 className="nd2-chart-card__title">{t('nurseDashboard.careChart.title')}</h3>
              <p className="nd2-chart-card__sub">{t('nurseDashboard.careChart.sub')}</p>
            </div>
          </div>
          <div className="nd2-chart-body">
            {careTaskData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={careTaskData} barSize={34} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name={t('nurseDashboard.careChart.quantity')} radius={[6, 6, 0, 0]}>
                    {careTaskData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="nd2-empty-chart">{t('nurseDashboard.careChart.empty')}</div>
            )}
          </div>
        </div>

        {/* Incident Severity Bar */}
        <div className="nd2-chart-card">
          <div className="nd2-chart-card__head">
            <div className="nd2-chart-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>
              <AlertTriangle size={17} />
            </div>
            <div>
              <h3 className="nd2-chart-card__title">{t('nurseDashboard.incidentChart.title')}</h3>
              <p className="nd2-chart-card__sub">{t('nurseDashboard.incidentChart.sub')}</p>
            </div>
          </div>
          <div className="nd2-chart-body">
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={severityData} barSize={34} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name={t('nurseDashboard.careChart.quantity')} radius={[6, 6, 0, 0]}>
                    {severityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="nd2-empty-chart">{t('nurseDashboard.incidentChart.empty')}</div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════ INCIDENT TREND (full width) ═══════════════ */}
      <div className="nd2-chart-card nd2-chart-card--full">
        <div className="nd2-chart-card__head">
          <div className="nd2-chart-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}>
            <TrendingUp size={17} />
          </div>
          <div>
            <h3 className="nd2-chart-card__title">{t('nurseDashboard.trendChart.title')}</h3>
            <p className="nd2-chart-card__sub">{t('nurseDashboard.trendChart.sub')}</p>
          </div>
        </div>
        <div className="nd2-chart-body">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="nd2TrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone" dataKey="incidents" name={t('nurseDashboard.trendChart.incidents')}
                  stroke="#8b5cf6" strokeWidth={2.5}
                  fill="url(#nd2TrendGrad)"
                  dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="nd2-empty-chart">{t('nurseDashboard.trendChart.empty')}</div>
          )}
        </div>
      </div>

      {/* ═══════════════ BOTTOM ROW: incidents + shifts ═══════════════ */}
      <div className="nd2-bottom-row">

        {/* Recent open incidents */}
        <div className="nd2-list-card">
          <div className="nd2-list-card__head">
            <div className="nd2-chart-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>
              <AlertCircle size={17} />
            </div>
            <h3 className="nd2-list-card__title">{t('nurseDashboard.recentIncidents.title')}</h3>
            <button className="nd2-see-all" onClick={() => navigate('/incidents')}>
              {t('nurseDashboard.recentIncidents.seeAll')} <ChevronRight size={14} />
            </button>
          </div>
          <div className="nd2-list-body">
            {recentIncidents.length === 0 ? (
              <div className="nd2-empty-list">
                <CheckCircle2 size={32} color="#10b981" />
                <span>{t('nurseDashboard.recentIncidents.noOpen')}</span>
              </div>
            ) : (
              recentIncidents.map((inc, i) => (
                <div key={inc._id || i} className="nd2-incident-item" onClick={() => navigate('/incidents')}>
                  <div
                    className="nd2-severity-badge"
                    style={{ background: (SEVERITY_COLORS[inc.severity] || '#94a3b8') + '20', color: SEVERITY_COLORS[inc.severity] || '#64748b' }}
                  >
                    {SEVERITY_VI[inc.severity] || inc.severity || '—'}
                  </div>
                  <div className="nd2-incident-item__body">
                    <span className="nd2-incident-item__title">{inc.incidentType || inc.title || t('nurseDashboard.recentIncidents.defaultType')}</span>
                    <span className="nd2-incident-item__resident">
                      <Heart size={11} /> {inc.residentId?.fullName || inc.residentName || '—'}
                    </span>
                  </div>
                  <div className="nd2-incident-item__right">
                    <span
                      className="nd2-status-badge"
                      style={{ background: (STATUS_COLORS[inc.status] || '#94a3b8') + '18', color: STATUS_COLORS[inc.status] || '#64748b' }}
                    >
                      {STATUS_VI[inc.status] || inc.status || '—'}
                    </span>
                    <span className="nd2-incident-item__date">{formatDate(inc.incidentAt || inc.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* My shifts */}
        <div className="nd2-list-card">
          <div className="nd2-list-card__head">
            <div className="nd2-chart-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}>
              <Calendar size={17} />
            </div>
            <h3 className="nd2-list-card__title">{t('nurseDashboard.myShifts.title')}</h3>
            <button className="nd2-see-all" onClick={() => navigate('/my-shifts')}>
              {t('nurseDashboard.myShifts.seeAll')} <ChevronRight size={14} />
            </button>
          </div>
          <div className="nd2-list-body">
            {todayShifts.length === 0 && upcomingShifts.length === 0 ? (
              <div className="nd2-empty-list">
                <Clock size={32} color="#94a3b8" />
                <span>{t('nurseDashboard.myShifts.noShifts')}</span>
              </div>
            ) : (
              <>
                {todayShifts.map((s, i) => <ShiftRow key={s._id || i} shift={s} isToday />)}
                {upcomingShifts.map((s, i) => <ShiftRow key={s._id || i} shift={s} />)}
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function KpiCard({ icon: Icon, color, bg, label, value, sub, onClick }) {
  return (
    <div className="nd2-kpi-card" onClick={onClick}>
      <div className="nd2-kpi-card__icon" style={{ background: bg, color }}>
        <Icon size={22} />
      </div>
      <div className="nd2-kpi-card__body">
        <span className="nd2-kpi-card__label">{label}</span>
        <span className="nd2-kpi-card__value" style={{ color }}>{value}</span>
        <span className="nd2-kpi-card__sub">{sub}</span>
      </div>
      <ChevronRight size={15} className="nd2-kpi-card__arrow" />
    </div>
  );
}

function ShiftRow({ shift, isToday }) {
  const { t } = useTranslation();
  const name = shift.shiftTemplate?.name || shift.templateName || t('nurseDashboard.kpi.shiftDefault');
  const start = shift.startTime || shift.shiftTemplate?.startTime || '';
  const end = shift.endTime || shift.shiftTemplate?.endTime || '';
  return (
    <div className={`nd2-shift-row ${isToday ? 'nd2-shift-row--today' : ''}`}>
      <div className="nd2-shift-row__left">
        <span className={`nd2-shift-badge ${isToday ? 'nd2-shift-badge--today' : ''}`}>
          {isToday ? t('nurseDashboard.myShifts.today') : formatDate(shift.workDate)}
        </span>
        <span className="nd2-shift-row__name">{name}</span>
      </div>
      {(start || end) && (
        <div className="nd2-shift-row__time">
          <Clock size={12} />
          <span>{start}{end ? ` – ${end}` : ''}</span>
        </div>
      )}
    </div>
  );
}
