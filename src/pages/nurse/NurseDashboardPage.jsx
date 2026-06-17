import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, HeartPulse, Pill, Users, CalendarClock,
  TrendingUp, ArrowRight, FileText, Activity, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import careNoteService from '../../services/careNote.service';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/nurse/NurseDashboardPage.css';
import '../../styles/shared/animations.css';

const NOTE_COLORS = {
  meal: '#f97316',
  activity: '#22c55e',
  daily_living: '#8b5cf6',
  health: '#ef4444',
  general: '#3b82f6',
};
const NOTE_LABELS = {
  meal: 'Bữa ăn',
  activity: 'Hoạt động',
  daily_living: 'Sinh hoạt',
  health: 'Sức khỏe',
  general: 'Chung',
};

const fmtDate = (d) => new Date(d).toLocaleString('vi-VN', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

function DonutChart({ data, size = 140 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="nd-chart-empty">Chưa có dữ liệu</div>;

  const cx = size / 2, cy = size / 2, r = size / 2 - 12;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="nd-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.filter(d => d.value > 0).map((d, i) => {
          const pct = d.value / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="20"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
              className="nd-donut-segment"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" className="nd-donut-total">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="nd-donut-label">ghi chú</text>
      </svg>
      <div className="nd-donut-legend">
        {data.filter(d => d.value > 0).map((d, i) => (
          <div key={i} className="nd-legend-item">
            <span className="nd-legend-dot" style={{ background: d.color }} />
            <span className="nd-legend-text">{d.label}</span>
            <span className="nd-legend-count">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data, height = 160 }) {
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="nd-bar-chart" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="nd-bar-col">
          <div className="nd-bar-track">
            <div
              className="nd-bar-fill animate-fade-in-up"
              style={{
                height: `${(d.value / max) * 100}%`,
                animationDelay: `${i * 0.08}s`,
                background: d.value > 0 ? 'linear-gradient(180deg, #3b82f6, #2563eb)' : '#e2e8f0',
              }}
            >
              {d.value > 0 && <span className="nd-bar-val">{d.value}</span>}
            </div>
          </div>
          <span className="nd-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick, delay }) {
  return (
    <div
      className={`nd-stat-card animate-fade-in-up delay-${delay} ${onClick ? 'nd-stat-card--clickable' : ''}`}
      onClick={onClick}
      style={{ '--accent': color }}
    >
      <div className="nd-stat-icon" style={{ background: `${color}14`, color }}>
        <Icon size={22} />
      </div>
      <div className="nd-stat-body">
        <span className="nd-stat-value">{value}</span>
        <span className="nd-stat-label">{label}</span>
      </div>
      {onClick && <ArrowRight size={16} className="nd-stat-arrow" />}
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, onClick, delay }) {
  return (
    <button className={`nd-quick-action animate-fade-in-up delay-${delay}`} onClick={onClick}>
      <div className="nd-quick-icon"><Icon size={20} /></div>
      <div className="nd-quick-body">
        <span className="nd-quick-label">{label}</span>
        <span className="nd-quick-desc">{desc}</span>
      </div>
      <ArrowRight size={16} className="nd-quick-arrow" />
    </button>
  );
}

function NurseDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allNotes, setAllNotes] = useState([]);
  const [myNotes, setMyNotes] = useState([]);
  const [residents, setResidents] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [allRes, myRes, residentRes] = await Promise.all([
          careNoteService.listNotes({ limit: 100 }),
          careNoteService.getMyNotes({ limit: 100 }),
          careNoteService.getResidents(),
        ]);
        setAllNotes(allRes?.data || []);
        setMyNotes(myRes?.data || []);
        setResidents(Array.isArray(residentRes) ? residentRes : (residentRes?.data || []));
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const notesByType = useMemo(() => {
    const counts = { meal: 0, activity: 0, daily_living: 0, health: 0, general: 0 };
    myNotes.forEach(n => { if (counts[n.noteType] !== undefined) counts[n.noteType]++; });
    return Object.entries(counts).map(([key, value]) => ({
      label: NOTE_LABELS[key], value, color: NOTE_COLORS[key],
    }));
  }, [myNotes]);

  const last7Days = useMemo(() => {
    const days = [];
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = myNotes.filter(n => {
        const t = new Date(n.noteAt);
        return t >= d && t < next;
      }).length;
      days.push({ label: dayLabels[d.getDay()], value: count });
    }
    return days;
  }, [myNotes]);

  const todayNotes = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return myNotes.filter(n => new Date(n.noteAt) >= today).length;
  }, [myNotes]);

  const healthNotes = useMemo(() =>
    myNotes.filter(n => n.noteType === 'health').length
  , [myNotes]);

  const recentNotes = useMemo(() =>
    allNotes.slice(0, 5)
  , [allNotes]);

  if (loading) return <LoadingSpinner label="Đang tải dashboard..." />;

  return (
    <div className="nd-page">
      {/* Header */}
      <div className="nd-header animate-fade-in-up">
        <div>
          <h1 className="nd-header__title">
            Xin chào, {user?.fullName || 'Điều dưỡng'}
          </h1>
          <p className="nd-header__subtitle">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="nd-stats-grid">
        <StatCard
          icon={ClipboardList} label="Ghi chú của tôi" value={myNotes.length}
          color="#3b82f6" onClick={() => navigate('/nurse/care-notes')} delay={1}
        />
        <StatCard
          icon={CalendarClock} label="Hôm nay" value={todayNotes}
          color="#22c55e" delay={2}
        />
        <StatCard
          icon={HeartPulse} label="Ghi chú sức khỏe" value={healthNotes}
          color="#ef4444" onClick={() => navigate('/nurse/health-monitoring')} delay={3}
        />
        <StatCard
          icon={Users} label="Cư dân phụ trách" value={residents.length}
          color="#8b5cf6" delay={4}
        />
      </div>

      {/* Charts row */}
      <div className="nd-charts-row">
        <div className="nd-chart-card animate-fade-in-up delay-3">
          <h3 className="nd-chart-title">
            <Activity size={18} />
            Phân bổ ghi chú theo loại
          </h3>
          <DonutChart data={notesByType} />
        </div>
        <div className="nd-chart-card animate-fade-in-up delay-4">
          <h3 className="nd-chart-title">
            <TrendingUp size={18} />
            Ghi chú 7 ngày qua
          </h3>
          <BarChart data={last7Days} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="nd-actions-card animate-fade-in-up delay-4">
        <h3 className="nd-chart-title">
          <AlertTriangle size={18} />
          Thao tác nhanh
        </h3>
        <div className="nd-actions-grid">
          <QuickAction
            icon={ClipboardList} label="Tạo ghi chú" desc="Ghi nhận tình trạng cư dân"
            onClick={() => navigate('/nurse/care-notes')} delay={1}
          />
          <QuickAction
            icon={HeartPulse} label="Theo dõi sức khỏe" desc="Ghi vital signs"
            onClick={() => navigate('/nurse/health-monitoring')} delay={2}
          />
          <QuickAction
            icon={Pill} label="Quản lý thuốc" desc="Lịch dùng thuốc hôm nay"
            onClick={() => navigate('/nurse/medications')} delay={3}
          />
          <QuickAction
            icon={FileText} label="Sự cố" desc="Báo cáo sự cố mới"
            onClick={() => navigate('/nurse/incidents')} delay={4}
          />
        </div>
      </div>

      {/* Recent notes */}
      <div className="nd-recent-card animate-fade-in-up delay-5">
        <div className="nd-recent-header">
          <h3 className="nd-chart-title">
            <FileText size={18} />
            Ghi chú gần đây
          </h3>
          <button className="nd-see-all" onClick={() => navigate('/nurse/care-notes')}>
            Xem tất cả <ArrowRight size={14} />
          </button>
        </div>
        {recentNotes.length === 0 ? (
          <p className="nd-empty">Chưa có ghi chú nào.</p>
        ) : (
          <div className="nd-recent-list">
            {recentNotes.map((note, i) => (
              <div key={note._id} className={`nd-recent-item animate-fade-in-up delay-${i + 1}`}>
                <span
                  className="nd-recent-dot"
                  style={{ background: NOTE_COLORS[note.noteType] || '#94a3b8' }}
                />
                <div className="nd-recent-body">
                  <span className="nd-recent-content">{note.content}</span>
                  <span className="nd-recent-meta">
                    {note.residentId?.fullName || '—'} · {fmtDate(note.noteAt)}
                  </span>
                </div>
                <span className="nd-recent-badge" style={{
                  background: `${NOTE_COLORS[note.noteType]}14`,
                  color: NOTE_COLORS[note.noteType],
                }}>
                  {NOTE_LABELS[note.noteType] || note.noteType}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NurseDashboardPage;
