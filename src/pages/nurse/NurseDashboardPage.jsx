import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Pill, ClipboardCheck, AlertTriangle,
  Clock, Utensils, RefreshCw, Loader2,
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
import nutritionReportService from '../../services/nutritionReport.service';
import careTaskService from '../../services/careTask.service';
import useAuth from '../../hooks/useAuth';
import '../../styles/nurse/NurseDashboardPage.css';

const todayISO = new Date().toISOString().split('T')[0];

const MED_COLORS = {
  taken: '#10b981',
  late_taken: '#f59e0b',
  pending: '#3b82f6',
  missed: '#ef4444',
};

const TASK_COLORS = {
  completed: '#10b981',
  in_progress: '#3b5bdb',
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

const SEVERITY_VI = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Nghiêm trọng',
};

const STATUS_VI = {
  open: 'Đang mở',
  in_progress: 'Đang xử lý',
  resolved: 'Đã giải quyết',
};

const STATUS_COLORS = {
  open: '#ef4444',
  in_progress: '#f59e0b',
  resolved: '#10b981',
};

const TASK_VI = {
  completed: 'Hoàn thành',
  in_progress: 'Đang làm',
  pending: 'Chờ',
  skipped: 'Bỏ qua',
  missed: 'Bỏ lỡ',
};

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [allIncidents, setAllIncidents] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [myShifts, setMyShifts] = useState([]);
  const [medStats, setMedStats] = useState(null);
  const [nutritionSummary, setNutritionSummary] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);

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
      // Nutrition summary — nurse-only, returns totalAdmittedResidents etc.
      nutritionReportService.getSummary(),
      // Today's care tasks
      careTaskService.listCareTasks({ workDate: todayISO }),
      // Today's medication schedule
      medicationService.getDailySchedule({ date: todayISO }),
    ]);

    const [allIncR, recentIncR, shiftsR, nutritionR, tasksR, medR] = results;

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

    // nutritionSummary.totalAdmittedResidents — assigned residents for this nurse
    if (nutritionR.status === 'fulfilled') setNutritionSummary(nutritionR.value);

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
          name: k === 'taken' ? 'Đã dùng' : k === 'late_taken' ? 'Muộn' : k === 'pending' ? 'Chờ phát' : 'Bỏ lỡ',
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
    .map(([period, value]) => ({ period, 'Sự cố': value }));

  // ── Derived: shifts ───────────────────────────────────────────
  const todayShifts = myShifts.filter(s => s.workDate?.startsWith(todayISO));
  const upcomingShifts = myShifts.filter(s => !s.workDate?.startsWith(todayISO)).slice(0, 4);
  const completedTasks = todayTasks.filter(t => t.status === 'completed').length;
  const openIncidentCount = allIncidents.filter(i => i.status === 'open' || i.status === 'investigating').length;

  if (loading) {
    return (
      <div className="nd2-loading-screen">
        <Loader2 size={32} className="nd2-spin" />
        <span>Đang tải dữ liệu...</span>
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
              {greeting()}, <span>{user?.fullName?.split(' ').pop() || 'Y tá'}</span>
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
          Làm mới
        </button>
      </div>

      {/* ═══════════════ KPI GRID ═══════════════ */}
      <div className="nd2-kpi-grid">
        <KpiCard
          icon={Users} color="#3b5bdb" bg="#eef2ff"
          label="Bệnh nhân phụ trách"
          value={nutritionSummary?.totalAdmittedResidents ?? 0}
          sub={`${nutritionSummary?.residentsWithMealPlan ?? 0} có kế hoạch dinh dưỡng`}
          onClick={() => navigate('/nurse/meal-plans')}
        />
        <KpiCard
          icon={Pill} color="#10b981" bg="#d1fae5"
          label="Liều thuốc chờ hôm nay"
          value={medStats?.pending ?? 0}
          sub={`Tổng hôm nay: ${totalDoses} liều · ${medCompletePct}% hoàn thành`}
          onClick={() => navigate('/nurse/medications')}
        />
        <KpiCard
          icon={ClipboardCheck} color="#f59e0b" bg="#fef3c7"
          label="Nhiệm vụ chăm sóc hôm nay"
          value={`${completedTasks}/${todayTasks.length}`}
          sub={`${todayTasks.length - completedTasks} nhiệm vụ chưa hoàn thành`}
          onClick={() => navigate('/nurse/activity-schedule')}
        />
        <KpiCard
          icon={AlertTriangle} color="#ef4444" bg="#fee2e2"
          label="Sự cố đang mở"
          value={openIncidentCount}
          sub={`Tổng sự cố 8 tuần: ${allIncidents.length}`}
          onClick={() => navigate('/incidents')}
        />
        <KpiCard
          icon={Clock} color="#8b5cf6" bg="#ede9fe"
          label="Ca làm việc hôm nay"
          value={todayShifts.length}
          sub={todayShifts[0]
            ? `${todayShifts[0].shiftTemplate?.name || todayShifts[0].templateName || 'Ca làm việc'}`
            : 'Không có ca hôm nay'}
          onClick={() => navigate('/my-shifts')}
        />
        <KpiCard
          icon={Utensils} color="#0891b2" bg="#e0f2fe"
          label="Ghi chú bữa ăn"
          value={nutritionSummary?.totalMealNotes ?? '—'}
          sub={`${nutritionSummary?.residentsWithSpecialDiet ?? 0} bệnh nhân chế độ đặc biệt`}
          onClick={() => navigate('/nurse/nutrition-reports')}
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
              <h3 className="nd2-progress-card__title">Tiến độ phát thuốc hôm nay</h3>
              <p className="nd2-progress-card__sub">
                Hoàn thành <strong>{doneCount}</strong> / {totalDoses} liều
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
              <h3 className="nd2-chart-card__title">Trạng thái thuốc hôm nay</h3>
              <p className="nd2-chart-card__sub">Tổng {totalDoses} liều</p>
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
              <div className="nd2-empty-chart">Chưa có lịch thuốc hôm nay</div>
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
              <h3 className="nd2-chart-card__title">Nhiệm vụ chăm sóc</h3>
              <p className="nd2-chart-card__sub">Phân loại theo trạng thái</p>
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
                  <Bar dataKey="value" name="Số lượng" radius={[6, 6, 0, 0]}>
                    {careTaskData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="nd2-empty-chart">Không có dữ liệu nhiệm vụ</div>
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
              <h3 className="nd2-chart-card__title">Sự cố theo mức độ</h3>
              <p className="nd2-chart-card__sub">Phân loại mức độ nghiêm trọng</p>
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
                  <Bar dataKey="value" name="Số lượng" radius={[6, 6, 0, 0]}>
                    {severityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="nd2-empty-chart">Không có dữ liệu sự cố</div>
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
            <h3 className="nd2-chart-card__title">Xu hướng sự cố theo tuần</h3>
            <p className="nd2-chart-card__sub">Biến động số lượng sự cố qua các tuần</p>
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
                  type="monotone" dataKey="Sự cố"
                  stroke="#8b5cf6" strokeWidth={2.5}
                  fill="url(#nd2TrendGrad)"
                  dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="nd2-empty-chart">Không có dữ liệu xu hướng</div>
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
            <h3 className="nd2-list-card__title">Sự cố đang mở gần đây</h3>
            <button className="nd2-see-all" onClick={() => navigate('/incidents')}>
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>
          <div className="nd2-list-body">
            {recentIncidents.length === 0 ? (
              <div className="nd2-empty-list">
                <CheckCircle2 size={32} color="#10b981" />
                <span>Không có sự cố nào đang mở</span>
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
                    <span className="nd2-incident-item__title">{inc.incidentType || inc.title || 'Sự cố'}</span>
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
            <h3 className="nd2-list-card__title">Ca làm việc của tôi</h3>
            <button className="nd2-see-all" onClick={() => navigate('/my-shifts')}>
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>
          <div className="nd2-list-body">
            {todayShifts.length === 0 && upcomingShifts.length === 0 ? (
              <div className="nd2-empty-list">
                <Clock size={32} color="#94a3b8" />
                <span>Không có ca làm trong 7 ngày tới</span>
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
  const name = shift.shiftTemplate?.name || shift.templateName || 'Ca làm việc';
  const start = shift.startTime || shift.shiftTemplate?.startTime || '';
  const end = shift.endTime || shift.shiftTemplate?.endTime || '';
  return (
    <div className={`nd2-shift-row ${isToday ? 'nd2-shift-row--today' : ''}`}>
      <div className="nd2-shift-row__left">
        <span className={`nd2-shift-badge ${isToday ? 'nd2-shift-badge--today' : ''}`}>
          {isToday ? 'Hôm nay' : formatDate(shift.workDate)}
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
