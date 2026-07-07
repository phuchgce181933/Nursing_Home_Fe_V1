import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Pill, CalendarCheck, FileText,
  Clock, RefreshCw, Loader2,
  ChevronRight, Stethoscope, Activity,
  CheckCircle2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import careAppointmentService from '../../services/careAppointment.service';
import medicationService from '../../services/medication.service';
import careNoteService from '../../services/careNote.service';
import useAuth from '../../hooks/useAuth';
import '../../styles/doctor/DoctorDashboardPage.css';

const todayISO = new Date().toISOString().split('T')[0];

const MED_COLORS = {
  taken: '#10b981',
  late_taken: '#f59e0b',
  pending: '#3b82f6',
  missed: '#ef4444',
};

const APPT_STATUS_VI = {
  scheduled: 'Chờ khám',
  in_progress: 'Đang khám',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const APPT_STATUS_COLORS = {
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#10b981',
  cancelled: '#94a3b8',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function formatTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [medStats, setMedStats] = useState(null);
  const [recentNotes, setRecentNotes] = useState([]);
  const [notesTotal, setNotesTotal] = useState(0);

  const assignedResidentCount = user?.staffProfile?.assignedResidentIds?.length ?? 0;

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const from = new Date();
    from.setDate(from.getDate() - 30);
    const to = new Date();
    to.setDate(to.getDate() + 7);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // 1 API lỗi (VD chưa có staffProfile) không được làm trắng cả trang
    const results = await Promise.allSettled([
      careAppointmentService.getMyAppointments({
        from: from.toISOString(),
        to: to.toISOString(),
        limit: 100,
      }),
      medicationService.getDailySchedule({ date: todayISO }),
      careNoteService.getMyNotes({
        from: weekAgo.toISOString(),
        to: new Date().toISOString(),
        limit: 5,
      }),
    ]);

    const [apptR, medR, notesR] = results;

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

    if (notesR.status === 'fulfilled') {
      const d = notesR.value;
      const arr = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
      setRecentNotes(arr.slice(0, 5));
      setNotesTotal(d?.total ?? arr.length);
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
          name: k === 'taken' ? 'Đã dùng' : k === 'late_taken' ? 'Muộn' : k === 'pending' ? 'Chờ phát' : 'Bỏ lỡ',
          value: v,
          fill: MED_COLORS[k],
        }))
    : [];

  if (loading) {
    return (
      <div className="dd-loading-screen">
        <Loader2 size={32} className="dd-spin" />
        <span>Đang tải dữ liệu...</span>
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
              {greeting()}, <span>BS. {user?.fullName?.split(' ').pop() || ''}</span>
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
          Làm mới
        </button>
      </div>

      {/* ═══════════════ KPI GRID ═══════════════ */}
      <div className="dd-kpi-grid">
        <KpiCard
          icon={Users} color="#3b5bdb" bg="#eef2ff"
          label="Bệnh nhân phụ trách"
          value={assignedResidentCount}
          sub="Cư dân được phân công"
          onClick={() => navigate('/doctor/care-notes')}
        />
        <KpiCard
          icon={CalendarCheck} color="#0891b2" bg="#e0f2fe"
          label="Cuộc hẹn hôm nay"
          value={todayAppointments.length}
          sub={`${todayPendingCount} chưa hoàn thành`}
          onClick={() => navigate('/doctor/appointments')}
        />
        <KpiCard
          icon={Pill} color="#10b981" bg="#d1fae5"
          label="Liều thuốc chờ hôm nay"
          value={medStats?.pending ?? 0}
          sub={`Tổng hôm nay: ${totalDoses} liều`}
          onClick={() => navigate('/doctor/medications')}
        />
        <KpiCard
          icon={FileText} color="#f59e0b" bg="#fef3c7"
          label="Ghi chú chăm sóc tuần này"
          value={notesTotal}
          sub="Do bạn ghi nhận, 7 ngày qua"
          onClick={() => navigate('/doctor/care-notes')}
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
              <h3 className="dd-chart-card__title">Cuộc hẹn khám (30 ngày)</h3>
              <p className="dd-chart-card__sub">Phân loại theo trạng thái</p>
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
                  <Bar dataKey="value" name="Số lượng" radius={[6, 6, 0, 0]}>
                    {apptStatusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="dd-empty-chart">Không có cuộc hẹn nào trong 30 ngày qua</div>
            )}
          </div>
        </div>

        <div className="dd-chart-card">
          <div className="dd-chart-card__head">
            <div className="dd-chart-icon" style={{ background: '#d1fae5', color: '#10b981' }}>
              <Pill size={17} />
            </div>
            <div>
              <h3 className="dd-chart-card__title">Trạng thái thuốc hôm nay</h3>
              <p className="dd-chart-card__sub">Tổng {totalDoses} liều cho bệnh nhân phụ trách</p>
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
              <div className="dd-empty-chart">Chưa có lịch thuốc hôm nay</div>
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
            <h3 className="dd-list-card__title">Lịch khám hôm nay</h3>
            <button className="dd-see-all" onClick={() => navigate('/doctor/appointments')}>
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>
          <div className="dd-list-body">
            {todayAppointments.length === 0 ? (
              <div className="dd-empty-list">
                <CheckCircle2 size={32} color="#10b981" />
                <span>Không có cuộc hẹn nào hôm nay</span>
              </div>
            ) : (
              todayAppointments.map((a, i) => (
                <div key={a._id || i} className="dd-appt-item" onClick={() => navigate('/doctor/appointments')}>
                  <div className="dd-appt-item__time">
                    <Clock size={12} />
                    {formatTime(a.scheduledStartAt)}
                  </div>
                  <div className="dd-appt-item__body">
                    <span className="dd-appt-item__resident">{a.residentId?.fullName || 'Cư dân'}</span>
                    <span className="dd-appt-item__type">{a.appointmentType || 'Khám bệnh'}</span>
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

        {/* Recent care notes */}
        <div className="dd-list-card">
          <div className="dd-list-card__head">
            <div className="dd-chart-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>
              <Activity size={17} />
            </div>
            <h3 className="dd-list-card__title">Ghi chú chăm sóc gần đây</h3>
            <button className="dd-see-all" onClick={() => navigate('/doctor/care-notes')}>
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>
          <div className="dd-list-body">
            {recentNotes.length === 0 ? (
              <div className="dd-empty-list">
                <FileText size={32} color="#94a3b8" />
                <span>Bạn chưa ghi chú nào trong 7 ngày qua</span>
              </div>
            ) : (
              recentNotes.map((n, i) => (
                <div key={n._id || i} className="dd-note-item" onClick={() => navigate('/doctor/care-notes')}>
                  <div className="dd-note-item__body">
                    <span className="dd-note-item__resident">{n.residentId?.fullName || 'Cư dân'}</span>
                    <span className="dd-note-item__content">{n.content}</span>
                  </div>
                  <span className="dd-note-item__date">{formatDate(n.noteAt || n.createdAt)}</span>
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
