import { useState, useEffect, useMemo } from 'react';
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
  Building2,
  Layers,
  BedDouble,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import reportService from '../../services/report.service';
import facilityService from '../../services/facility.service';
import staffService from '../../services/staff.service';
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

const COVERAGE_STATUS = {
  ASSIGNED: 'assigned',
  PARTIAL: 'partial',
  UNASSIGNED: 'unassigned',
};

const formatCurrency = (amount) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString('vi-VN');
};

const toIdString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
};

const buildStaffKey = (id) => String(id || '');

export default function DashboardPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [residentCount, setResidentCount] = useState(null);
  const [incidents, setIncidents] = useState(null);
  const [careActivity, setCareActivity] = useState(null);
  const [timeSeries, setTimeSeries] = useState(null);

  // Coverage state
  const [coverage, setCoverage] = useState({
    buildings: [],
    floorsByBuilding: {},
    roomsByFloor: {},
    assignedFloorIds: new Set(),
    assignedRoomIds: new Set(),
    staffByFloor: {},
    staffByRoom: {},
  });
  const [coverageLoading, setCoverageLoading] = useState(true);
  const [coverageError, setCoverageError] = useState(null);
  const [coverageFilter, setCoverageFilter] = useState('all');
  const [expandedBuildings, setExpandedBuildings] = useState({});

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

  const fetchCoverage = async () => {
    setCoverageLoading(true);
    setCoverageError(null);
    try {
      const [buildings, floors, staffRes] = await Promise.all([
        facilityService.listBuildings({ activeOnly: false }).catch(() => []),
        facilityService.listFloors({ activeOnly: false }).catch(() => []),
        staffService.getAll({ limit: 200 }).catch(() => ({ data: [] })),
      ]);

      const activeBuildings = (buildings || []).filter((b) => b.isActive !== false);
      const activeFloors = (floors || []).filter((f) => f.isActive !== false);
      const staffList = staffRes?.data || staffRes || [];

      // Group floors by building
      const floorsByBuilding = {};
      for (const floor of activeFloors) {
        const buildingId = toIdString(floor.buildingId);
        if (!buildingId) continue;
        if (!floorsByBuilding[buildingId]) floorsByBuilding[buildingId] = [];
        floorsByBuilding[buildingId].push(floor);
      }

      // Fetch rooms for every active floor
      const roomsByFloor = {};
      const roomFetchResults = await Promise.all(
        activeFloors.map((floor) =>
          facilityService
            .listRoomsByFloor(floor._id)
            .then((rooms) => [floor._id, rooms || []])
            .catch(() => [floor._id, []])
        )
      );
      for (const [floorId, rooms] of roomFetchResults) {
        roomsByFloor[floorId] = rooms;
      }

      // Build assigned maps from staff profiles
      const assignedFloorIds = new Set();
      const assignedRoomIds = new Set();
      const staffByFloor = {};
      const staffByRoom = {};

      const addStaffRef = (map, key, staff) => {
        if (!key) return;
        const k = String(key);
        if (!map[k]) map[k] = [];
        if (!map[k].some((s) => buildStaffKey(s._id) === buildStaffKey(staff._id))) {
          map[k].push(staff);
        }
      };

      for (const staff of staffList) {
        if (!staff) continue;
        const profile = staff.staffProfile || {};
        const areas = profile.responsibleAreaIds || [];
        const rooms = profile.responsibleRoomIds || [];

        for (const area of areas) {
          const id = toIdString(area);
          if (!id) continue;
          assignedFloorIds.add(id);
          addStaffRef(staffByFloor, id, staff);
        }
        for (const room of rooms) {
          const id = toIdString(room);
          if (!id) continue;
          assignedRoomIds.add(id);
          addStaffRef(staffByRoom, id, staff);
        }
      }

      setCoverage({
        buildings: activeBuildings,
        floorsByBuilding,
        roomsByFloor,
        assignedFloorIds,
        assignedRoomIds,
        staffByFloor,
        staffByRoom,
      });
    } catch (err) {
      console.error('Coverage fetch failed:', err);
      setCoverageError(t('dashboard.coverage.coverageError'));
    } finally {
      setCoverageLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCoverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coverageSummary = useMemo(() => {
    const { buildings, floorsByBuilding, roomsByFloor, assignedFloorIds, assignedRoomIds } = coverage;

    let totalFloors = 0;
    let totalRooms = 0;
    let assignedFloors = 0;
    let assignedRooms = 0;
    let assignedBuildings = 0;

    const buildingBreakdown = buildings.map((building) => {
      const buildingId = toIdString(building._id);
      const buildingFloors = floorsByBuilding[buildingId] || [];
      const buildingFloorCount = buildingFloors.length;
      const buildingRoomCount = buildingFloors.reduce(
        (sum, floor) => sum + ((roomsByFloor[floor._id] || []).length),
        0
      );
      const assignedFloorCount = buildingFloors.filter((f) =>
        assignedFloorIds.has(toIdString(f._id))
      ).length;
      let assignedRoomCount = 0;
      for (const floor of buildingFloors) {
        for (const room of roomsByFloor[floor._id] || []) {
          if (assignedRoomIds.has(toIdString(room._id))) assignedRoomCount += 1;
        }
      }

      totalFloors += buildingFloorCount;
      totalRooms += buildingRoomCount;
      assignedFloors += assignedFloorCount;
      assignedRooms += assignedRoomCount;

      const floorCoverageRatio =
        buildingFloorCount > 0 ? assignedFloorCount / buildingFloorCount : 1;
      const roomCoverageRatio =
        buildingRoomCount > 0 ? assignedRoomCount / buildingRoomCount : 1;

      let status;
      if (buildingFloorCount === 0 && buildingRoomCount === 0) {
        status = COVERAGE_STATUS.UNASSIGNED;
      } else if (assignedFloorCount === buildingFloorCount && assignedRoomCount === buildingRoomCount) {
        status = COVERAGE_STATUS.ASSIGNED;
      } else if (assignedFloorCount > 0 || assignedRoomCount > 0) {
        status = COVERAGE_STATUS.PARTIAL;
      } else {
        status = COVERAGE_STATUS.UNASSIGNED;
      }

      return {
        building,
        buildingId,
        floors: buildingFloors,
        floorCount: buildingFloorCount,
        roomCount: buildingRoomCount,
        assignedFloorCount,
        assignedRoomCount,
        floorCoverageRatio,
        roomCoverageRatio,
        status,
      };
    });

    for (const b of buildingBreakdown) {
      if (b.status !== COVERAGE_STATUS.UNASSIGNED) assignedBuildings += 1;
    }

    const floorPct = totalFloors > 0 ? Math.round((assignedFloors / totalFloors) * 100) : 100;
    const roomPct = totalRooms > 0 ? Math.round((assignedRooms / totalRooms) * 100) : 100;
    const buildingPct =
      buildings.length > 0 ? Math.round((assignedBuildings / buildings.length) * 100) : 100;

    const unassignedCount =
      (buildings.length - assignedBuildings) +
      (totalFloors - assignedFloors) +
      (totalRooms - assignedRooms);

    return {
      buildingBreakdown,
      totalBuildings: buildings.length,
      totalFloors,
      totalRooms,
      assignedBuildings,
      assignedFloors,
      assignedRooms,
      buildingPct,
      floorPct,
      roomPct,
      unassignedCount,
    };
  }, [coverage]);

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

  const handleRefresh = () => {
    fetchData();
    fetchCoverage();
  };

  const toggleBuilding = (buildingId) => {
    setExpandedBuildings((prev) => ({ ...prev, [buildingId]: !prev[buildingId] }));
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__title">{t('dashboard.title')}</h1>
          <p className="dashboard-page__subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <button onClick={handleRefresh} className="dashboard-refresh-btn" title={t('dashboard.refresh')}>
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

      {/* ─── Manager Assignment Coverage Section ─── */}
      <section className="dashboard-coverage">
        <div className="dashboard-coverage__header">
          <div>
            <h2 className="dashboard-coverage__title">{t('dashboard.coverage.title')}</h2>
            <p className="dashboard-coverage__subtitle">{t('dashboard.coverage.subtitle')}</p>
          </div>
        </div>

        {coverageError && (
          <div className="dashboard-coverage__error">
            <AlertTriangle size={16} />
            <span>{coverageError}</span>
          </div>
        )}

        <div className="dashboard-coverage__kpis">
          <CoverageKpi
            icon={Building2}
            label={t('dashboard.coverage.buildingsKpi')}
            assigned={coverageSummary.assignedBuildings}
            total={coverageSummary.totalBuildings}
            percent={coverageSummary.buildingPct}
            color="#1A365D"
            bg="#EBF0F7"
          />
          <CoverageKpi
            icon={Layers}
            label={t('dashboard.coverage.floorsKpi')}
            assigned={coverageSummary.assignedFloors}
            total={coverageSummary.totalFloors}
            percent={coverageSummary.floorPct}
            color="#0891B2"
            bg="#E0F2FE"
          />
          <CoverageKpi
            icon={BedDouble}
            label={t('dashboard.coverage.roomsKpi')}
            assigned={coverageSummary.assignedRooms}
            total={coverageSummary.totalRooms}
            percent={coverageSummary.roomPct}
            color="#2D6A4F"
            bg="#ECFDF5"
          />
          <CoverageKpi
            icon={UserCheck}
            label={t('dashboard.coverage.unassignedKpi')}
            assigned={Math.max(coverageSummary.unassignedCount, 0)}
            total={coverageSummary.totalBuildings + coverageSummary.totalFloors + coverageSummary.totalRooms}
            percent={
              coverageSummary.unassignedCount === 0
                ? 100
                : Math.max(
                    0,
                    100 -
                      Math.round(
                        (coverageSummary.unassignedCount /
                          Math.max(
                            1,
                            coverageSummary.totalBuildings + coverageSummary.totalFloors + coverageSummary.totalRooms
                          )) * 100
                      )
                )
            }
            color="#B91C1C"
            bg="#FEF2F2"
            invertPercent
          />
        </div>

        <div className="dashboard-coverage__panel">
          <div className="dashboard-coverage__panel-header">
            <h3 className="dashboard-coverage__panel-title">{t('dashboard.coverage.buildingHeading')}</h3>
            <div className="dashboard-coverage__legend">
              <span className="dashboard-coverage__legend-title">{t('dashboard.coverage.legendTitle')}:</span>
              <span className="dashboard-coverage__legend-item">
                <span className="dashboard-coverage__legend-dot" style={{ background: '#2D6A4F' }} />
                {t('dashboard.coverage.assignedLabel')}
              </span>
              <span className="dashboard-coverage__legend-item">
                <span className="dashboard-coverage__legend-dot" style={{ background: '#E07A2F' }} />
                {t('dashboard.coverage.partialLabel')}
              </span>
              <span className="dashboard-coverage__legend-item">
                <span className="dashboard-coverage__legend-dot" style={{ background: '#B91C1C' }} />
                {t('dashboard.coverage.unassignedLabel')}
              </span>
            </div>
          </div>

          {coverageLoading && coverageSummary.totalBuildings === 0 ? (
            <div className="dashboard-coverage__loading">
              <Loader2 size={20} className="dashboard-loading__spinner" />
              <span>{t('dashboard.loadingData')}</span>
            </div>
          ) : coverageSummary.buildingBreakdown.length === 0 ? (
            <div className="dashboard-coverage__empty">{t('dashboard.coverage.noBuildings')}</div>
          ) : (
            <ul className="dashboard-coverage__building-list">
              {coverageSummary.buildingBreakdown
                .filter((entry) =>
                  coverageFilter === 'unassigned'
                    ? entry.status !== COVERAGE_STATUS.ASSIGNED
                    : true
                )
                .map((entry) => {
                  const isExpanded = !!expandedBuildings[entry.buildingId];
                  return (
                    <BuildingCoverageRow
                      key={entry.buildingId}
                      entry={entry}
                      isExpanded={isExpanded}
                      onToggle={() => toggleBuilding(entry.buildingId)}
                      coverage={coverage}
                      t={t}
                    />
                  );
                })}
            </ul>
          )}
        </div>
      </section>

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

function CoverageKpi({ icon: Icon, label, assigned, total, percent, color, bg, invertPercent }) {
  const displayPercent = invertPercent ? Math.max(0, 100 - percent) : percent;
  return (
    <div className="dashboard-coverage-kpi">
      <div className="dashboard-coverage-kpi__icon" style={{ background: bg, color }}>
        <Icon size={22} />
      </div>
      <div className="dashboard-coverage-kpi__content">
        <span className="dashboard-coverage-kpi__label">{label}</span>
        <span className="dashboard-coverage-kpi__value" style={{ color }}>
          {assigned} / {total}
        </span>
        <div className="dashboard-coverage-kpi__bar">
          <div
            className="dashboard-coverage-kpi__bar-fill"
            style={{ width: `${Math.min(100, Math.max(0, displayPercent))}%`, background: color }}
          />
        </div>
        <span className="dashboard-coverage-kpi__percent">{displayPercent}%</span>
      </div>
    </div>
  );
}

function BuildingCoverageRow({ entry, isExpanded, onToggle, coverage, t }) {
  const { building, buildingId, floorCount, roomCount, assignedFloorCount, assignedRoomCount, status, floors } = entry;
  const { roomsByFloor, assignedFloorIds, assignedRoomIds, staffByFloor, staffByRoom } = coverage;

  const statusMeta = (() => {
    if (status === COVERAGE_STATUS.ASSIGNED) {
      return {
        label: t('dashboard.coverage.assignedLabel'),
        color: '#2D6A4F',
        bg: '#ECFDF5',
        Icon: CheckCircle2,
      };
    }
    if (status === COVERAGE_STATUS.PARTIAL) {
      return {
        label: t('dashboard.coverage.partialLabel'),
        color: '#E07A2F',
        bg: '#FFF7ED',
        Icon: AlertCircle,
      };
    }
    return {
      label: t('dashboard.coverage.unassignedLabel'),
      color: '#B91C1C',
      bg: '#FEF2F2',
      Icon: XCircle,
    };
  })();

  const StatusIcon = statusMeta.Icon;

  const floorPct = floorCount > 0 ? Math.round((assignedFloorCount / floorCount) * 100) : 100;
  const roomPct = roomCount > 0 ? Math.round((assignedRoomCount / roomCount) * 100) : 100;

  return (
    <li className="dashboard-coverage__building">
      <div className="dashboard-coverage__building-summary">
        <button
          type="button"
          className="dashboard-coverage__building-toggle"
          onClick={onToggle}
          aria-expanded={isExpanded}
          title={isExpanded ? t('common.close') : t('common.view')}
        >
          <span className="dashboard-coverage__building-info">
            <span className="dashboard-coverage__building-code">{building.code}</span>
            <span className="dashboard-coverage__building-name">{building.name}</span>
          </span>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        <div className="dashboard-coverage__building-stats">
          <span className="dashboard-coverage__stat-chip">
            <Layers size={14} />
            {assignedFloorCount}/{floorCount} {t('dashboard.coverage.floorsKpi').toLowerCase()}
          </span>
          <span className="dashboard-coverage__stat-chip">
            <BedDouble size={14} />
            {assignedRoomCount}/{roomCount} {t('dashboard.coverage.roomsKpi').toLowerCase()}
          </span>
        </div>

        <span
          className="dashboard-coverage__status-badge"
          style={{ color: statusMeta.color, background: statusMeta.bg }}
        >
          <StatusIcon size={14} />
          {statusMeta.label}
        </span>
      </div>

      {isExpanded && (
        <div className="dashboard-coverage__building-detail">
          <div className="dashboard-coverage__progress-row">
            <div className="dashboard-coverage__progress">
              <div className="dashboard-coverage__progress-label">
                <span>{t('dashboard.coverage.floorsKpi')}</span>
                <span>{floorPct}%</span>
              </div>
              <div className="dashboard-coverage__progress-bar">
                <div
                  className="dashboard-coverage__progress-fill"
                  style={{ width: `${floorPct}%`, background: floorPct === 100 ? '#2D6A4F' : floorPct === 0 ? '#B91C1C' : '#E07A2F' }}
                />
              </div>
            </div>
            <div className="dashboard-coverage__progress">
              <div className="dashboard-coverage__progress-label">
                <span>{t('dashboard.coverage.roomsKpi')}</span>
                <span>{roomPct}%</span>
              </div>
              <div className="dashboard-coverage__progress-bar">
                <div
                  className="dashboard-coverage__progress-fill"
                  style={{ width: `${roomPct}%`, background: roomPct === 100 ? '#2D6A4F' : roomPct === 0 ? '#B91C1C' : '#E07A2F' }}
                />
              </div>
            </div>
          </div>

          {floors.length === 0 ? (
            <div className="dashboard-coverage__empty-inline">{t('dashboard.coverage.noFloors')}</div>
          ) : (
            <ul className="dashboard-coverage__floor-list">
              {floors.map((floor) => {
                const floorId = toIdString(floor._id);
                const floorRooms = roomsByFloor[floorId] || [];
                const floorAssigned = assignedFloorIds.has(floorId);
                const roomAssignedCount = floorRooms.filter((r) =>
                  assignedRoomIds.has(toIdString(r._id))
                ).length;
                const floorStaff = staffByFloor[floorId] || [];
                const floorStatus = floorAssigned
                  ? COVERAGE_STATUS.ASSIGNED
                  : roomAssignedCount > 0
                  ? COVERAGE_STATUS.PARTIAL
                  : COVERAGE_STATUS.UNASSIGNED;
                const floorStatusMeta = {
                  [COVERAGE_STATUS.ASSIGNED]: {
                    color: '#2D6A4F',
                    label: t('dashboard.coverage.assignedLabel'),
                  },
                  [COVERAGE_STATUS.PARTIAL]: {
                    color: '#E07A2F',
                    label: t('dashboard.coverage.partialLabel'),
                  },
                  [COVERAGE_STATUS.UNASSIGNED]: {
                    color: '#B91C1C',
                    label: t('dashboard.coverage.unassignedLabel'),
                  },
                }[floorStatus];

                return (
                  <li key={floorId} className="dashboard-coverage__floor">
                    <div className="dashboard-coverage__floor-head">
                      <div className="dashboard-coverage__floor-title">
                        <Layers size={14} />
                        <span>
                          {floor.name ||
                            t('dashboard.coverage.floorNameFallback', { number: floor.floorNumber })}
                        </span>
                      </div>
                      <div className="dashboard-coverage__floor-meta">
                        <span className="dashboard-coverage__floor-count">
                          {roomAssignedCount}/{floorRooms.length} {t('dashboard.coverage.roomsKpi').toLowerCase()}
                        </span>
                        <span
                          className="dashboard-coverage__status-badge dashboard-coverage__status-badge--sm"
                          style={{ color: floorStatusMeta.color, background: '#F8FAFC' }}
                        >
                          {floorStatusMeta.label}
                        </span>
                      </div>
                    </div>

                    {floorStaff.length > 0 && (
                      <div className="dashboard-coverage__floor-staff">
                        <span className="dashboard-coverage__floor-staff-label">
                          {t('dashboard.coverage.managersLabel')}:
                        </span>
                        {floorStaff.map((s) => (
                          <span key={buildStaffKey(s._id)} className="dashboard-coverage__staff-chip">
                            <UserCheck size={12} />
                            {s.fullName || s.username || s.email}
                          </span>
                        ))}
                      </div>
                    )}

                    {floorRooms.length === 0 ? (
                      <div className="dashboard-coverage__empty-inline">{t('dashboard.coverage.noRooms')}</div>
                    ) : (
                      <ul className="dashboard-coverage__room-grid">
                        {floorRooms.map((room) => {
                          const roomId = toIdString(room._id);
                          const roomAssigned = assignedRoomIds.has(roomId);
                          const roomStaff = staffByRoom[roomId] || [];
                          return (
                            <li
                              key={roomId}
                              className={`dashboard-coverage__room ${
                                roomAssigned
                                  ? 'dashboard-coverage__room--assigned'
                                  : 'dashboard-coverage__room--unassigned'
                              }`}
                              title={
                                roomAssigned
                                  ? `${t('dashboard.coverage.assignedLabel')}: ${roomStaff
                                      .map((s) => s.fullName || s.username)
                                      .join(', ')}`
                                  : t('dashboard.coverage.noManager')
                              }
                            >
                              <div className="dashboard-coverage__room-head">
                                <BedDouble size={12} />
                                <span className="dashboard-coverage__room-number">
                                  {room.roomNumber}
                                </span>
                                {roomAssigned ? (
                                  <CheckCircle2 size={12} className="dashboard-coverage__room-icon--ok" />
                                ) : (
                                  <XCircle size={12} className="dashboard-coverage__room-icon--bad" />
                                )}
                              </div>
                              {roomStaff.length > 0 && (
                                <div className="dashboard-coverage__room-staff">
                                  {roomStaff[0].fullName || roomStaff[0].username}
                                  {roomStaff.length > 1 && ` +${roomStaff.length - 1}`}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}