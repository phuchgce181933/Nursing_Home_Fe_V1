import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users, Pill, CalendarCheck,
  Clock, RefreshCw, Loader2,
  ChevronRight, Stethoscope,
  CheckCircle2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import careAppointmentService from '../../services/careAppointment.service';
import medicationService from '../../services/medication.service';
import useAuth from '../../hooks/useAuth';
import '../../styles/doctor/DoctorDashboardPage.css';

const todayISO = new Date().toISOString().split('T')[0];

const MED_COLORS = {
  taken: '#10b981',
  late_taken: '#f59e0b',
  pending: '#0f766e',
  missed: '#ef4444',
};

const getApptStatusVI = (t) => ({
  scheduled: t('doctorDashboard.apptStatus.scheduled'),
  in_progress: t('doctorDashboard.apptStatus.inProgress'),
  completed: t('doctorDashboard.apptStatus.completed'),
  cancelled: t('doctorDashboard.apptStatus.cancelled'),
});

const APPT_STATUS_COLORS = {
  scheduled: '#0f766e',
  in_progress: '#f59e0b',
  completed: '#10b981',
  cancelled: '#94a3b8',
};

function greeting(t) {
  const h = new Date().getHours();
  if (h < 12) return t('doctorDashboard.greetingMorning');
  if (h < 18) return t('doctorDashboard.greetingAfternoon');
  return t('doctorDashboard.greetingEvening');
}

function formatTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="dd-tooltip">
      {label && <p className="dd-tooltip__label">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="dd-tooltip__row">
          <span className="dd-tooltip__dot" style={{ background: p.color || p.fill }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function DoctorDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const APPT_STATUS_VI = getApptStatusVI(t);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [medStats, setMedStats] = useState(null);

  const assignedResidentCount = user?.staffProfile?.assignedResidentIds?.length ?? 0;

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const from = new Date();
    from.setDate(from.getDate() - 30);
    const to = new Date();
    to.setDate(to.getDate() + 7);

    // 1 API lỗi (VD chưa có staffProfile) không được làm trắng cả trang
    const results = await Promise.allSettled([
      careAppointmentService.getMyAppointments({
        from: from.toISOString(),
        to: to.toISOString(),
        limit: 100,
      }),
      medicationService.getDailySchedule({ date: todayISO }),
    ]);

    const [apptR, medR] = results;

    if (apptR.status === 'fulfilled') {
      const d = apptR.value;
      const arr = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
      setAppointments(arr);
    }

    if (medR.status === 'fulfilled') {
      const d = medR.value;
      const items = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
      let schedules = [];
      items.forEach((item) => {
        if (Array.isArray(item.schedules)) schedules.push(...item.schedules);
        else schedules.push(item);
      });
      const counts = { taken: 0, late_taken: 0, pending: 0, missed: 0 };
      schedules.forEach((s) => {
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

  // ── Derived: today's appointments ──────────────────────────────
  const todayAppointments = appointments
    .filter((a) => a.scheduledStartAt?.slice(0, 10) === todayISO)
    .sort((a, b) => new Date(a.scheduledStartAt) - new Date(b.scheduledStartAt));
  const todayPendingCount = todayAppointments.filter((a) => a.status === 'scheduled' || a.status === 'in_progress').length;

  // ── Derived: appointment status breakdown (30 ngày) ────────────
  const apptStatusData = Object.entries(
    appointments.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({
    name: APPT_STATUS_VI[status] || status,
    value: count,
    fill: APPT_STATUS_COLORS[status] || '#94a3b8',
  }));

  // ── Derived: medication ─────────────────────────────────────────
  const totalDoses = medStats ? Object.values(medStats).reduce((a, b) => a + b, 0) : 0;
  const medPieData = medStats
    ? Object.entries(medStats)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({
          name: k === 'taken' ? t('doctorDashboard.medTaken') : k === 'late_taken' ? t('doctorDashboard.medLate') : k === 'pending' ? t('doctorDashboard.medPending') : t('doctorDashboard.medMissed'),
          value: v,
          fill: MED_COLORS[k],
        }))
    : [];

  if (loading) {
    return (
      <div className="dd-loading-screen">
        <Loader2 size={32} className="dd-spin" />
        <span>{t('doctorDashboard.loading')}</span>
      </div>
    );
  }

  return (
    <div className="dd-page">

      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="dd-header">
        <div className="dd-header__left">
          <div className="dd-header__icon">
            <Stethoscope size={22} />
          </div>
          <div>
            <h1 className="dd-header__title">
              {greeting(t)}, <span>BS. {user?.fullName?.split(' ').pop() || ''}</span>
            </h1>
            <p className="dd-header__date">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <button
          className="dd-refresh-btn"
          onClick={() => fetchAll(true)}
          disabled={refreshing}
        >
          <RefreshCw size={15} className={refreshing ? 'dd-spin' : ''} />
          {t('doctorDashboard.refresh')}
        </button>
      </div>

      {/* ═══════════════ KPI GRID ═══════════════ */}
      <div className="dd-kpi-grid">
        <KpiCard
          icon={Users} color="#0f766e" bg="rgba(15, 118, 110, 0.08)"
          label={t('doctorDashboard.kpi.assignedResidents')}
          value={assignedResidentCount}
          sub={t('doctorDashboard.kpi.assignedResidentsSub')}
          onClick={() => navigate('/doctor/health-monitoring')}
        />
        <KpiCard
          icon={CalendarCheck} color="#0891b2" bg="#e0f2fe"
          label={t('doctorDashboard.kpi.todayAppointments')}
          value={todayAppointments.length}
          sub={t('doctorDashboard.kpi.pendingCount', { count: todayPendingCount })}
          onClick={() => navigate('/doctor/appointments')}
        />
        <KpiCard
          icon={Pill} color="#10b981" bg="#d1fae5"
          label={t('doctorDashboard.kpi.pendingDoses')}
          value={medStats?.pending ?? 0}
          sub={t('doctorDashboard.kpi.totalDoses', { total: totalDoses })}
          onClick={() => navigate('/doctor/medications')}
        />
      </div>

      {/* ═══════════════ CHARTS ROW ═══════════════ */}
      <div className="dd-charts-row-2">

        <div className="dd-chart-card">
          <div className="dd-chart-card__head">
            <div className="dd-chart-icon" style={{ background: '#e0f2fe', color: '#0891b2' }}>
              <CalendarCheck size={17} />
            </div>
            <div>
              <h3 className="dd-chart-card__title">{t('doctorDashboard.apptChart.title')}</h3>
              <p className="dd-chart-card__sub">{t('doctorDashboard.apptChart.sub')}</p>
            </div>
          </div>
          <div className="dd-chart-body">
            {apptStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={apptStatusData} barSize={34} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name={t('doctorDashboard.quantity')} radius={[6, 6, 0, 0]}>
                    {apptStatusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="dd-empty-chart">{t('doctorDashboard.apptChart.empty')}</div>
            )}
          </div>
        </div>

        <div className="dd-chart-card">
          <div className="dd-chart-card__head">
            <div className="dd-chart-icon" style={{ background: '#d1fae5', color: '#10b981' }}>
              <Pill size={17} />
            </div>
            <div>
              <h3 className="dd-chart-card__title">{t('doctorDashboard.medChart.title')}</h3>
              <p className="dd-chart-card__sub">{t('doctorDashboard.medChart.sub', { total: totalDoses })}</p>
            </div>
          </div>
          <div className="dd-chart-body">
            {medPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={medPieData}
                    cx="50%" cy="42%"
                    innerRadius={54} outerRadius={80}
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
              <div className="dd-empty-chart">{t('doctorDashboard.medChart.empty')}</div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════ BOTTOM ROW: appointments + notes ═══════════════ */}
      <div className="dd-bottom-row">

        {/* Today's appointments */}
        <div className="dd-list-card">
          <div className="dd-list-card__head">
            <div className="dd-chart-icon" style={{ background: '#e0f2fe', color: '#0891b2' }}>
              <Clock size={17} />
            </div>
            <h3 className="dd-list-card__title">{t('doctorDashboard.todayAppt.title')}</h3>
            <button className="dd-see-all" onClick={() => navigate('/doctor/appointments')}>
              {t('doctorDashboard.todayAppt.seeAll')} <ChevronRight size={14} />
            </button>
          </div>
          <div className="dd-list-body">
            {todayAppointments.length === 0 ? (
              <div className="dd-empty-list">
                <CheckCircle2 size={32} color="#10b981" />
                <span>{t('doctorDashboard.todayAppt.empty')}</span>
              </div>
            ) : (
              todayAppointments.map((a, i) => (
                <div key={a._id || i} className="dd-appt-item" onClick={() => navigate('/doctor/appointments')}>
                  <div className="dd-appt-item__time">
                    <Clock size={12} />
                    {formatTime(a.scheduledStartAt)}
                  </div>
                  <div className="dd-appt-item__body">
                    <span className="dd-appt-item__resident">{a.residentId?.fullName || t('doctorDashboard.todayAppt.resident')}</span>
                    <span className="dd-appt-item__type">{a.appointmentType || t('doctorDashboard.todayAppt.examination')}</span>
                  </div>
                  <span
                    className="dd-status-badge"
                    style={{ background: (APPT_STATUS_COLORS[a.status] || '#94a3b8') + '18', color: APPT_STATUS_COLORS[a.status] || '#64748b' }}
                  >
                    {APPT_STATUS_VI[a.status] || a.status}
                  </span>
                </div>
              ))
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
    <div className="dd-kpi-card" onClick={onClick}>
      <div className="dd-kpi-card__icon" style={{ background: bg, color }}>
        <Icon size={22} />
      </div>
      <div className="dd-kpi-card__body">
        <span className="dd-kpi-card__label">{label}</span>
        <span className="dd-kpi-card__value" style={{ color }}>{value}</span>
        <span className="dd-kpi-card__sub">{sub}</span>
      </div>
      <ChevronRight size={15} className="dd-kpi-card__arrow" />
    </div>
  );
}
