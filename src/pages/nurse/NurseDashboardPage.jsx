import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  HeartPulse,
  Users,
  Pill,
  ClipboardList,
  ArrowRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import careNoteService from '../../services/careNote.service';
import residentService from '../../services/resident.service';
import '../../styles/nurse/NurseDashboardPage.css';

/* ------------------------------------------------------------------ */
/*  Donut Chart (SVG)                                                 */
/* ------------------------------------------------------------------ */
const DONUT_COLORS = ['#3b5bdb', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

function DonutChart({ data, t }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="nd-empty">{t('nurseDashboard.noData')}</p>;

  const size = 140;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="nd-donut-wrap">
      <svg
        className="nd-donut-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {data.map((segment, i) => {
          const pct = segment.value / total;
          const dash = circumference * pct;
          const gap = circumference - dash;
          const rotation = (offset / total) * 360 - 90;
          offset += segment.value;
          return (
            <circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            />
          );
        })}
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill="#1e293b"
        >
          {total}
        </text>
      </svg>

      <ul className="nd-donut-legend">
        {data.map((segment, i) => (
          <li key={segment.label}>
            <span
              className="nd-legend-dot"
              style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            {segment.label}
            <span className="nd-legend-count">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bar Chart                                                          */
/* ------------------------------------------------------------------ */
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="nd-bar-chart">
      {data.map((d) => (
        <div key={d.label} className="nd-bar-col">
          <span className="nd-bar-value">{d.value}</span>
          <div
            className="nd-bar"
            style={{ height: `${Math.max((d.value / max) * 100, 4)}%` }}
          />
          <span className="nd-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick action definitions                                           */
/* ------------------------------------------------------------------ */
const getQuickActions = (t) => [
  {
    key: 'careNotes',
    label: t('nurseDashboard.quickAction.careNotes'),
    desc: t('nurseDashboard.quickAction.careNotesDesc'),
    icon: FileText,
    color: '#3b5bdb',
    to: '/nurse/care-notes',
  },
  {
    key: 'activitySchedule',
    label: t('nurseDashboard.quickAction.activitySchedule'),
    desc: t('nurseDashboard.quickAction.activityScheduleDesc'),
    icon: CalendarDays,
    color: '#10b981',
    to: '/nurse/activity-schedule',
  },
  {
    key: 'healthMonitoring',
    label: t('nurseDashboard.quickAction.healthMonitoring'),
    desc: t('nurseDashboard.quickAction.healthMonitoringDesc'),
    icon: HeartPulse,
    color: '#f59e0b',
    to: '/nurse/health-monitoring',
  },
  {
    key: 'medications',
    label: t('nurseDashboard.quickAction.medications'),
    desc: t('nurseDashboard.quickAction.medicationsDesc'),
    icon: Pill,
    color: '#8b5cf6',
    to: '/nurse/medications',
  },
];

/* ------------------------------------------------------------------ */
/*  Note type mapping                                                  */
/* ------------------------------------------------------------------ */
const getNoteTypeLabels = (t) => ({
  general: t('nurseDashboard.noteType.general'),
  health: t('nurseDashboard.noteType.health'),
  medication: t('nurseDashboard.noteType.medication'),
  behavior: t('nurseDashboard.noteType.behavior'),
  incident: t('nurseDashboard.noteType.incident'),
  diet: t('nurseDashboard.noteType.diet'),
});

const NOTE_DOT_COLORS = {
  general: '#3b5bdb',
  health: '#10b981',
  medication: '#8b5cf6',
  behavior: '#f59e0b',
  incident: '#f43f5e',
  diet: '#06b6d4',
};

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function NurseDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);

  /* fetch data */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [noteRes, residentRes] = await Promise.all([
          careNoteService.getMyNotes({ limit: 50 }).catch(() => ({ data: [] })),
          careNoteService.getResidents({ limit: 200 }).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setNotes(Array.isArray(noteRes?.data) ? noteRes.data : []);
        setResidents(Array.isArray(residentRes?.data) ? residentRes.data : []);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  /* derived stats */
  const todayStr = new Date().toDateString();

  const todayNotes = useMemo(
    () => notes.filter((n) => new Date(n.createdAt).toDateString() === todayStr),
    [notes, todayStr],
  );

  const healthNotes = useMemo(
    () => notes.filter((n) => n.type === 'health'),
    [notes],
  );

  /* donut data — notes by type */
  const noteTypeLabels = useMemo(() => getNoteTypeLabels(t), [t]);

  const donutData = useMemo(() => {
    const counts = {};
    notes.forEach((n) => {
      const tp = n.type || 'general';
      counts[tp] = (counts[tp] || 0) + 1;
    });
    return Object.entries(counts).map(([key, value]) => ({
      label: noteTypeLabels[key] || key,
      value,
    }));
  }, [notes, noteTypeLabels]);

  /* bar data — last 7 days */
  const barData = useMemo(() => {
    const days = [];
    const dayNames = [
      t('nurseDashboard.daySun'),
      t('nurseDashboard.dayMon'),
      t('nurseDashboard.dayTue'),
      t('nurseDashboard.dayWed'),
      t('nurseDashboard.dayThu'),
      t('nurseDashboard.dayFri'),
      t('nurseDashboard.daySat'),
    ];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const count = notes.filter((n) => new Date(n.createdAt).toDateString() === ds).length;
      days.push({ label: dayNames[d.getDay()], value: count });
    }
    return days;
  }, [notes, t]);

  /* recent notes — latest 5 */
  const recentNotes = useMemo(
    () =>
      [...notes]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    [notes],
  );

  /* ---- stat cards config ---- */
  const statCards = [
    {
      key: 'myNotes',
      label: t('nurseDashboard.stat.myNotes'),
      value: notes.length,
      icon: FileText,
      colorClass: 'nd-stat-icon--indigo',
      to: '/nurse/care-notes',
    },
    {
      key: 'today',
      label: t('nurseDashboard.stat.today'),
      value: todayNotes.length,
      icon: CalendarDays,
      colorClass: 'nd-stat-icon--emerald',
      to: '/nurse/care-notes',
    },
    {
      key: 'healthNotes',
      label: t('nurseDashboard.stat.healthNotes'),
      value: healthNotes.length,
      icon: HeartPulse,
      colorClass: 'nd-stat-icon--amber',
      to: '/nurse/health-monitoring',
    },
    {
      key: 'trackedResidents',
      label: t('nurseDashboard.stat.trackedResidents'),
      value: residents.length,
      icon: Users,
      colorClass: 'nd-stat-icon--rose',
      to: '/nurse/care-notes',
    },
  ];

  /* ---- render ---- */
  if (loading) {
    return (
      <div className="nd-page">
        <div className="nd-loading">
          <Loader2 size={20} />
          {t('nurseDashboard.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="nd-page">
      {/* Header */}
      <div className="nd-header">
        <h1 className="nd-header-title">
          <LayoutDashboard size={24} />
          {t('nurseDashboard.title')}
        </h1>
        <p className="nd-header-sub">
          {t('nurseDashboard.greeting', { name: user?.fullName || t('nurseDashboard.defaultNurse') })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="nd-stats-grid">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="nd-stat-card"
            onClick={() => navigate(card.to)}
          >
            <div className={`nd-stat-icon ${card.colorClass}`}>
              <card.icon />
            </div>
            <div className="nd-stat-body">
              <div className="nd-stat-value">{card.value}</div>
              <div className="nd-stat-label">{card.label}</div>
            </div>
            <ArrowRight size={16} className="nd-stat-arrow" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="nd-charts-row">
        <div className="nd-chart-card">
          <h3 className="nd-chart-title">{t('nurseDashboard.chart.notesByType')}</h3>
          <DonutChart data={donutData} t={t} />
        </div>
        <div className="nd-chart-card">
          <h3 className="nd-chart-title">{t('nurseDashboard.chart.last7Days')}</h3>
          <BarChart data={barData} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="nd-bottom-row">
        {/* Quick actions */}
        <div className="nd-section-card">
          <h3 className="nd-section-title">{t('nurseDashboard.quickActions')}</h3>
          <div className="nd-quick-grid">
            {getQuickActions(t).map((action) => (
              <div
                key={action.key}
                className="nd-quick-card"
                onClick={() => navigate(action.to)}
              >
                <div
                  className="nd-quick-icon"
                  style={{ background: action.color }}
                >
                  <action.icon />
                </div>
                <div className="nd-quick-body">
                  <div className="nd-quick-label">{action.label}</div>
                  <div className="nd-quick-desc">{action.desc}</div>
                </div>
                <ArrowRight size={14} className="nd-quick-arrow" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent notes */}
        <div className="nd-section-card">
          <h3 className="nd-section-title">{t('nurseDashboard.recentNotes')}</h3>
          {recentNotes.length === 0 ? (
            <p className="nd-empty">{t('nurseDashboard.noNotes')}</p>
          ) : (
            <div className="nd-notes-list">
              {recentNotes.map((note) => (
                <div
                  key={note._id}
                  className="nd-note-item"
                  onClick={() => navigate('/nurse/care-notes')}
                >
                  <span
                    className="nd-note-dot"
                    style={{
                      background: NOTE_DOT_COLORS[note.type] || '#3b5bdb',
                    }}
                  />
                  <div className="nd-note-body">
                    <div className="nd-note-title">
                      {noteTypeLabels[note.type] || note.type || t('nurseDashboard.note')} -{' '}
                      {note.residentId?.fullName || t('nurseDashboard.resident')}
                    </div>
                    <div className="nd-note-preview">
                      {note.content || note.note || t('nurseDashboard.noContent')}
                    </div>
                    <div className="nd-note-meta">
                      <span>
                        <Clock size={12} />
                        {new Date(note.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
