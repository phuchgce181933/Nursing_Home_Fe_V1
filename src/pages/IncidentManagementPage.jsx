import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  PlusCircle,
  Search,
  AlertTriangle,
  ShieldAlert,
  Eye,
  CheckCircle2,
  X,
  MapPin,
  Clock,
  User,
  FileWarning,
  BarChart3,
} from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import authService from '../services/auth.service';
import residentService from '../services/resident.service';
import facilityService from '../services/facility.service';
import { useAuth } from '../hooks/useAuth';
import incidentService from '../services/incident.service';
import { floorLabel } from '../utils/residentArea';
import '../styles/shared/IncidentManagementPage.css';

const initialForm = {
  incidentType: '',
  severity: 'medium',
  incidentAt: '',
  location: '',
  description: '',
  residentIds: [],
  assignedStaffIds: [],
};

const statusOptions = ['open', 'investigating', 'resolved', 'closed'];

const getStatusDisplay = (t) => ({
  open: t('incidents.status.open'),
  investigating: t('incidents.status.investigating'),
  resolved: t('incidents.status.resolved'),
  closed: t('incidents.status.closed'),
});

const getSeverityDisplay = (t) => ({
  low: t('incidents.severity.low'),
  medium: t('incidents.severity.medium'),
  high: t('incidents.severity.high'),
  critical: t('incidents.severity.critical'),
});

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

function toIsoDatetime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function IncidentManagementPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const STATUS_DISPLAY = useMemo(() => getStatusDisplay(t), [t]);
  const SEVERITY_DISPLAY = useMemo(() => getSeverityDisplay(t), [t]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [residents, setResidents] = useState([]);
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [residentAreaFilter, setResidentAreaFilter] = useState('');
  const [residentSearch, setResidentSearch] = useState('');
  const [floors, setFloors] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIncident, setDetailIncident] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assignHandlersOpen, setAssignHandlersOpen] = useState(false);
  const [selectedHandlers, setSelectedHandlers] = useState([]);
  const [assigningHandlers, setAssigningHandlers] = useState(false);
  const [drawerJustOpened, setDrawerJustOpened] = useState(false);

  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const isCaregiver = String(user?.role || '').toLowerCase() === 'caregiver';
  const canAssignHandlers = isAdmin;

  const formatResidentLabel = (resident) => {
    const baseName = resident?.fullName || t('incidents.unnamedResident');
    const code = resident?.residentCode ? ` (${resident.residentCode})` : '';
    return `${baseName}${code}`;
  };

  const formatStaffLabel = (staff) => {
    const name = staff?.fullName || staff?.email || t('incidents.unnamedStaff');
    const role = staff?.role ? ` — ${staff.role.toUpperCase()}` : '';
    const email = staff?.email ? ` • ${staff.email}` : '';
    return `${name}${role}${email}`;
  };

  const floorLabelMap = useMemo(
    () => Object.fromEntries(floors.map((floor) => [String(floor._id), floorLabel(floor, t) || floor.name || floor.label || String(floor._id)])),
    [floors, t]
  );

  const getAreaKey = (area) => {
    if (!area) return '';
    if (typeof area === 'object' && area !== null) {
      return String(area._id || area.id || area.name || area.floorNumber || area.label || '');
    }
    return String(area);
  };

  const getAreaLabel = (area) => {
    if (!area) return null;
    const key = getAreaKey(area);
    return floorLabelMap[key] || floorLabel(area, t) || area?.name || area?.label || String(key);
  };

  const areaOptions = useMemo(() => {
    const map = new Map();
    staffAccounts.forEach((staff) => {
      const areas = staff?.staffProfile?.responsibleAreaIds ?? staff?.responsibleAreaIds;
      if (!Array.isArray(areas)) return;
      areas.forEach((area) => {
        if (!area) return;
        const key = getAreaKey(area);
        const label = getAreaLabel(area);
        if (key && label && !map.has(key)) {
          map.set(key, label);
        }
      });
    });
    return Array.from(map, ([id, label]) => ({ id, label }));
  }, [staffAccounts, floorLabelMap, t]);

  const getResidentArea = (resident) => resident?.roomId?.floorId ?? resident?.area?.floor ?? resident?.floor;

  const residentAreaOptions = useMemo(() => {
    const map = new Map();
    residents.forEach((resident) => {
      const area = getResidentArea(resident);
      if (!area) return;
      const key = getAreaKey(area);
      const label = getAreaLabel(area);
      if (key && label && !map.has(key)) {
        map.set(key, label);
      }
    });
    return Array.from(map, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [residents, floorLabelMap, t]);

  const filteredResidents = useMemo(() => {
    let list = residents;
    if (residentAreaFilter) {
      list = list.filter((resident) => {
        const area = getResidentArea(resident);
        if (!area) return false;
        const key = getAreaKey(area);
        return key === residentAreaFilter;
      });
    }
    const query = residentSearch.trim().toLowerCase();
    if (!query) return list;
    return list.filter((resident) => formatResidentLabel(resident).toLowerCase().includes(query));
  }, [residents, residentAreaFilter, residentSearch, t]);

  const filteredStaff = useMemo(() => {
    let list = staffAccounts;
    if (areaFilter) {
      list = list.filter((staff) => {
        const areas = staff?.staffProfile?.responsibleAreaIds ?? staff?.responsibleAreaIds;
        if (!Array.isArray(areas)) return false;
        return areas.some((area) => {
          const key = typeof area === 'object' && area !== null
            ? String(area._id || area.id || area.name || area.floorNumber || area.label || '')
            : String(area);
          return key === areaFilter;
        });
      });
    }
    const query = staffSearch.trim().toLowerCase();
    if (!query) return list;
    return list.filter((staff) => formatStaffLabel(staff).toLowerCase().includes(query));
  }, [staffAccounts, staffSearch, areaFilter]);

  const toggleResident = (residentId) => {
    setForm((current) => {
      const alreadySelected = current.residentIds.includes(residentId);
      return {
        ...current,
        residentIds: alreadySelected
          ? current.residentIds.filter((id) => id !== residentId)
          : [...current.residentIds, residentId],
      };
    });
  };

  const toggleAssignedStaff = (staffId) => {
    setForm((current) => {
      const alreadyAssigned = current.assignedStaffIds.includes(staffId);
      return {
        ...current,
        assignedStaffIds: alreadyAssigned
          ? current.assignedStaffIds.filter((id) => id !== staffId)
          : [...current.assignedStaffIds, staffId],
      };
    });
  };

  const getReporterStaffSelectionId = (incident) => {
    if (!incident || !staffAccounts.length) return null;

    const reporterEmail = incident?.reporterEmail?.toLowerCase?.();
    const reporterName = incident?.reporterName?.trim();
    const reportedByUser = incident?.reportedByUserId;
    const reportedByUserId = reportedByUser?._id || reportedByUser?.id || reportedByUser;

    const matchedStaff = staffAccounts.find((staff) => {
      const staffId = staff?._id || staff?.id;
      const staffUserId = staff?.userId?._id || staff?.userId || staff?.userId?.id;
      const staffEmail = staff?.email?.toLowerCase?.() || staff?.userId?.email?.toLowerCase?.();
      const staffName = staff?.fullName || staff?.userId?.fullName || '';

      if (staffId && reportedByUserId && String(staffId) === String(reportedByUserId)) return true;
      if (staffUserId && reportedByUserId && String(staffUserId) === String(reportedByUserId)) return true;
      if (reporterEmail && staffEmail && reporterEmail === staffEmail) return true;
      if (reporterName && staffName && reporterName.trim().toLowerCase() === staffName.trim().toLowerCase()) return true;
      return false;
    });

    return matchedStaff?._id || matchedStaff?.id || null;
  };

  /* ── Data loading ──────────────────────────────────────────── */
  const loadIncidents = async () => {
    setLoading(true);
    try {
      const payload = {
        page: 1,
        limit: 20,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(isAdmin || isCaregiver ? {} : { reporterRole: user?.role }),
      };
      const data = await incidentService.listIncidents(payload);
      setIncidents(data.items || []);
      setMessage('');
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('incidents.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-select current user as assigned staff when drawer opens and staff accounts are loaded
    if (drawerJustOpened && staffAccounts.length > 0 && !optionsLoading) {
      console.log('[DEBUG] Auto-selecting current user. User:', user?._id, 'StaffAccounts:', staffAccounts.length);
      
      // Find current user's staff profile - try multiple match strategies
      let currentUserStaff = staffAccounts.find((staff) => {
        const staffUserId = staff.userId?._id || staff.userId;
        const match = staffUserId === user?._id;
        console.log(`[DEBUG] Checking staff ${staff._id}: staffUserId=${staffUserId}, user._id=${user?._id}, match=${match}`);
        return match;
      });

      // If not found, try matching by email
      if (!currentUserStaff && user?.email) {
        currentUserStaff = staffAccounts.find((staff) => staff.email === user.email || staff.userId?.email === user.email);
        console.log('[DEBUG] Found by email:', currentUserStaff?._id);
      }

      if (currentUserStaff) {
        const staffId = currentUserStaff._id || currentUserStaff.id;
        console.log('[DEBUG] Setting assigned staff to:', staffId);
        setForm((prev) => ({
          ...prev,
          assignedStaffIds: [staffId],
        }));
      }
      
      setDrawerJustOpened(false);
    }
  }, [drawerJustOpened, staffAccounts, optionsLoading, user]);

  useEffect(() => {
    if (!assignHandlersOpen || !detailIncident || !staffAccounts.length) return;

    const preselectedReporterStaffId = getReporterStaffSelectionId(detailIncident);
    if (!preselectedReporterStaffId) return;

    setSelectedHandlers((current) => {
      const next = current.includes(preselectedReporterStaffId)
        ? current
        : [...current, preselectedReporterStaffId];
      return next;
    });
  }, [assignHandlersOpen, detailIncident, staffAccounts]);

  useEffect(() => {
    // Reset drawerJustOpened when drawer closes
    if (!drawerOpen) {
      setDrawerJustOpened(false);
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!user) return;
    loadIncidents();
  }, [user, search, statusFilter]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadFormOptions = async () => {
      setOptionsLoading(true);
      try {
        const residentPromise = residentService.getResidentList({ page: 1, limit: 1000 });
        const floorPromise = facilityService.listFloors({ activeOnly: true });
        const staffPromise = isAdmin
          ? authService.getStaffAccounts({ page: 1, limit: 500 })
          : Promise.resolve([]);

        const [residentResponse, staffResponse, floorResponse] = await Promise.all([
          residentPromise,
          staffPromise,
          floorPromise,
        ]);
        if (!active) return;
        setResidents(Array.isArray(residentResponse) ? residentResponse : residentResponse?.data || []);
        setStaffAccounts(Array.isArray(staffResponse) ? staffResponse : staffResponse?.data || []);
        setFloors(Array.isArray(floorResponse) ? floorResponse : []);
      } catch (error) {
        if (!active) return;
        setMessageType('error');
        setMessage(error?.response?.data?.message || t('incidents.error.loadOptionsFailed'));
      } finally {
        if (active) setOptionsLoading(false);
      }
    };
    loadFormOptions();
    return () => { active = false; };
  }, [user, t]);

  /* ── Handlers ──────────────────────────────────────────────── */
  const handleCreate = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const payload = {
        ...form,
        incidentAt: toIsoDatetime(form.incidentAt),
        residentIds: form.residentIds.length ? form.residentIds : undefined,
        assignedStaffIds: canAssignHandlers && form.assignedStaffIds.length ? form.assignedStaffIds : undefined,
      };
      await incidentService.createIncident(payload);
      setMessageType('success');
      setMessage(t('incidents.success.created'));
      setForm(initialForm);
      setDrawerOpen(false);
      await loadIncidents();
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('incidents.error.createFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (incidentId, status) => {
    setIsSaving(true);
    setMessage('');
    try {
      await incidentService.updateIncidentStatus(incidentId, { status });
      setMessageType('success');
      setMessage(t('incidents.success.statusUpdated'));
      await loadIncidents();
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('incidents.error.updateStatusFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDetail = async (incidentId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailIncident(null);
    try {
      const data = await incidentService.getIncident(incidentId);
      setDetailIncident(data);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('incidents.error.loadFailed'));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const csv = await incidentService.exportIncidents({
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(isAdmin || isCaregiver ? {} : { reporterRole: user?.role }),
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `incidents-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setMessageType('success');
      setMessage(t('incidents.success.exportStarted'));
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('incidents.error.exportFailed'));
    }
  };

  const handleAssignHandlers = async () => {
    if (!detailIncident || !selectedHandlers.length) {
      setMessage(t('incidents.error.selectHandlers'));
      setMessageType('error');
      return;
    }
    setAssigningHandlers(true);
    try {
      await incidentService.assignHandlers(detailIncident._id, { assignedStaffIds: selectedHandlers });
      setMessageType('success');
      setMessage(t('incidents.success.handlersAssigned'));
      setAssignHandlersOpen(false);
      setSelectedHandlers([]);
      await loadIncidents();
      // Reload the detail incident
      if (detailIncident) {
        await handleViewDetail(detailIncident._id);
      }
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('incidents.error.assignHandlersFailed'));
    } finally {
      setAssigningHandlers(false);
    }
  };

  const handleOpenDrawer = () => {
    setForm(initialForm);
    setDrawerJustOpened(true);
    setDrawerOpen(true);
  };

  /* ── Computed ──────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total: incidents.length,
    open: incidents.filter((i) => i.status === 'open').length,
    investigating: incidents.filter((i) => i.status === 'investigating').length,
    resolved: incidents.filter((i) => i.status === 'resolved').length,
  }), [incidents]);

  if (!user) {
    return <LoadingSpinner label={t('incidents.loadingPage')} />;
  }

  return (
    <div className="ic-page">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="ic-header">
        <div className="ic-header__info">
          <h1 className="ic-header__title">{t('incidents.title')}</h1>
          <p className="ic-header__subtitle">{t('incidents.subtitle')}</p>
        </div>
        <div className="ic-header__actions">
          <button type="button" className="ic-btn ic-btn--secondary" onClick={handleExport}>
            <Download size={16} />
            {t('incidents.exportCsv')}
          </button>
          <button type="button" className="ic-btn ic-btn--primary" onClick={handleOpenDrawer}>
            <PlusCircle size={16} />
            {t('incidents.createIncident')}
          </button>
        </div>
      </header>

      {/* ── Toast ──────────────────────────────────────────── */}
      {message && (
        <div className={`ic-toast ic-toast--${messageType}`}>
          {messageType === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {message}
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="ic-stats">
        <div className="ic-stat-card">
          <div className="ic-stat-card__icon ic-stat-card__icon--total">
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="ic-stat-card__value">{stats.total}</div>
            <div className="ic-stat-card__label">{t('incidents.stat.total')}</div>
          </div>
        </div>
        <div className="ic-stat-card">
          <div className="ic-stat-card__icon ic-stat-card__icon--open">
            <FileWarning size={22} />
          </div>
          <div>
            <div className="ic-stat-card__value">{stats.open}</div>
            <div className="ic-stat-card__label">{t('incidents.stat.open')}</div>
          </div>
        </div>
        <div className="ic-stat-card">
          <div className="ic-stat-card__icon ic-stat-card__icon--invest">
            <Eye size={22} />
          </div>
          <div>
            <div className="ic-stat-card__value">{stats.investigating}</div>
            <div className="ic-stat-card__label">{t('incidents.stat.investigating')}</div>
          </div>
        </div>
        <div className="ic-stat-card">
          <div className="ic-stat-card__icon ic-stat-card__icon--resolve">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="ic-stat-card__value">{stats.resolved}</div>
            <div className="ic-stat-card__label">{t('incidents.stat.resolved')}</div>
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="ic-filters">
        <div className="ic-search">
          <Search size={16} className="ic-search__icon" />
          <input
            className="ic-search__input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('incidents.searchPlaceholder')}
          />
        </div>
        <div className="ic-status-pills">
          <button
            type="button"
            className={`ic-pill ${statusFilter === '' ? 'ic-pill--active' : ''}`}
            onClick={() => setStatusFilter('')}
          >
            {t('incidents.filter.all')}
          </button>
          {statusOptions.map((s) => (
            <button
              key={s}
              type="button"
              className={`ic-pill ${statusFilter === s ? 'ic-pill--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_DISPLAY[s]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Incident card list ─────────────────────────────── */}
      {loading ? (
        <LoadingSpinner label={t('incidents.loading')} />
      ) : incidents.length === 0 ? (
        <div className="ic-empty">
          <div className="ic-empty__icon"><ShieldAlert size={42} /></div>
          <p>{t('incidents.noIncidents')}</p>
        </div>
      ) : (
        <div className="ic-list">
          {incidents.map((incident, idx) => (
            <div
              key={incident._id}
              className="ic-card"
              style={{ animationDelay: `${0.05 * (idx % 8)}s` }}
            >
              <div className={`ic-card__severity-bar ic-card__severity-bar--${incident.severity}`} />
              <div className="ic-card__body">
                <div className="ic-card__top">
                  <div>
                    <span className="ic-card__type">{incident.incidentType}</span>
                    <p className="ic-card__resident">
                      {Array.isArray(incident.residentIds) && incident.residentIds.length > 0
                        ? incident.residentIds.map((resident) => resident?.fullName || resident).join(', ')
                        : incident.residentId?.fullName || incident.residentId || t('incidents.unknownResident')}
                    </p>
                  </div>
                  <span className={`ic-badge ic-badge--${incident.status}`}>
                    {STATUS_DISPLAY[incident.status] || incident.status}
                  </span>
                </div>

                <p className="ic-card__description">{incident.description}</p>

                <div className="ic-card__meta">
                  <span className="ic-card__meta-item">
                    <MapPin size={13} /> {incident.location || '—'}
                  </span>
                  <span className="ic-card__meta-item">
                    <Clock size={13} /> {formatDate(incident.incidentAt)}
                  </span>
                  <span className="ic-card__meta-item">
                    <User size={13} /> {incident.reporterName || incident.reporterEmail || t('incidents.unknown')}
                  </span>
                </div>

                <div className="ic-card__meta">
                  <span className={`ic-severity ic-severity--${incident.severity}`}>
                    {SEVERITY_DISPLAY[incident.severity] || incident.severity}
                  </span>
                </div>

                <div className="ic-card__actions">
                  <button
                    type="button"
                    className="ic-btn ic-btn--small ic-btn--secondary"
                    onClick={() => handleViewDetail(incident._id)}
                  >
                    <Eye size={14} />
                    {t('incidents.viewDetail')}
                  </button>
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`ic-btn ic-btn--small ${status === incident.status ? 'ic-btn--primary' : 'ic-btn--secondary'}`}
                      onClick={() => handleStatusUpdate(incident._id, status)}
                      disabled={isSaving || status === incident.status}
                    >
                      {STATUS_DISPLAY[status]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail drawer ─────────────────────────────────── */}
      {detailOpen && (
        <>
          <div className="ic-drawer-overlay" onClick={() => { setDetailOpen(false); setDetailIncident(null); }} />
          <div className="ic-drawer">
            <div className="ic-drawer__header">
              <h2 className="ic-drawer__title">{t('incidents.detail.title')}</h2>
              <button type="button" className="ic-drawer__close" onClick={() => { setDetailOpen(false); setDetailIncident(null); }}>
                <X size={20} />
              </button>
            </div>
            <div className="ic-drawer__body">
              {detailLoading ? (
                <LoadingSpinner label={t('incidents.loading')} />
              ) : detailIncident ? (
                <>
                  <div className="ic-form-grid">
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.incidentType')}</label>
                      <div className="ic-field__input" style={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>{detailIncident.incidentType}</div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.severity')}</label>
                      <div className="ic-field__input" style={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>{SEVERITY_DISPLAY[detailIncident.severity] || detailIncident.severity}</div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.status')}</label>
                      <div className="ic-field__input" style={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>{STATUS_DISPLAY[detailIncident.status] || detailIncident.status}</div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.incidentAt')}</label>
                      <div className="ic-field__input" style={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>{formatDate(detailIncident.incidentAt)}</div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.location')}</label>
                      <div className="ic-field__input" style={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>{detailIncident.location || '—'}</div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.resident')}</label>
                      <div className="ic-field__input" style={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>
                        {Array.isArray(detailIncident.residentIds) && detailIncident.residentIds.length > 0
                          ? detailIncident.residentIds.map((resident) => resident?.fullName || resident).join(', ')
                          : detailIncident.residentId?.fullName || detailIncident.residentId || t('incidents.unknownResident')}
                      </div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.assignedStaff')}</label>
                      <div className="ic-field__input" style={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>
                        {Array.isArray(detailIncident.assignedStaffIds) && detailIncident.assignedStaffIds.length > 0
                          ? detailIncident.assignedStaffIds.map((staff) => staff?.userId?.fullName || staff?.fullName || staff?.userId?.email || staff?.email || '—').join(', ')
                          : '—'}
                      </div>
                    </div>
                    <div className="ic-field ic-form-full">
                      <label className="ic-field__label">{t('incidents.form.description')}</label>
                      <div className="ic-field__textarea" style={{ minHeight: 100, whiteSpace: 'pre-wrap' }}>{detailIncident.description || '—'}</div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.reporter')}</label>
                      <div className="ic-field__input" style={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>{detailIncident.reporterName || detailIncident.reporterEmail || t('incidents.unknown')}</div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.reporterRole')}</label>
                      <div className="ic-field__input" style={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>{detailIncident.reporterRole || '—'}</div>
                    </div>
                  </div>
                  {/* Assign Handlers Button for Admins */}
                  {isAdmin && (!detailIncident.assignedStaffIds || detailIncident.assignedStaffIds.length === 0) && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
                      <button
                        type="button"
                        className="ic-btn ic-btn--primary"
                        onClick={() => {
                          setSelectedHandlers([]);
                          setAssignHandlersOpen(true);
                        }}
                      >
                        {t('incidents.assignHandlers')}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="ic-empty">
                  <p>{t('incidents.error.loadFailed')}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Create drawer ──────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="ic-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="ic-drawer">
            <div className="ic-drawer__header">
              <h2 className="ic-drawer__title">{t('incidents.drawer.title')}</h2>
              <button type="button" className="ic-drawer__close" onClick={() => setDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="ic-drawer__body">
              <div className="ic-form-grid">
                <div className="ic-field">
                  <label className="ic-field__label">{t('incidents.form.incidentType')} *</label>
                  <input
                    className="ic-field__input"
                    value={form.incidentType}
                    onChange={(e) => setForm((c) => ({ ...c, incidentType: e.target.value }))}
                    required
                  />
                </div>

                <div className="ic-field">
                  <label className="ic-field__label">{t('incidents.form.severity')}</label>
                  <select
                    className="ic-field__select"
                    value={form.severity}
                    onChange={(e) => setForm((c) => ({ ...c, severity: e.target.value }))}
                  >
                    <option value="low">{t('incidents.severity.low')}</option>
                    <option value="medium">{t('incidents.severity.medium')}</option>
                    <option value="high">{t('incidents.severity.high')}</option>
                    <option value="critical">{t('incidents.severity.critical')}</option>
                  </select>
                </div>

                <div className="ic-field">
                  <label className="ic-field__label">{t('incidents.form.incidentAt')} *</label>
                  <input
                    className="ic-field__input"
                    type="datetime-local"
                    value={form.incidentAt}
                    onChange={(e) => setForm((c) => ({ ...c, incidentAt: e.target.value }))}
                    required
                  />
                </div>

                <div className="ic-field">
                  <label className="ic-field__label">{t('incidents.form.location')}</label>
                  <input
                    className="ic-field__input"
                    value={form.location}
                    onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))}
                  />
                </div>

                <div className="ic-field ic-field--multi-select">
                  <label className="ic-field__label">{t('incidents.form.resident')}</label>
                  <div className="ic-multi-select-filters">
                    <select
                      className="ic-field__select"
                      value={residentAreaFilter}
                      onChange={(e) => setResidentAreaFilter(e.target.value)}
                      disabled={optionsLoading}
                    >
                      <option value="">{t('incidents.form.filterResidentAreaAll')}</option>
                      {residentAreaOptions.map((area) => (
                        <option key={area.id} value={area.id}>{area.label}</option>
                      ))}
                    </select>
                    <input
                      type="search"
                      className="ic-multi-select-search"
                      placeholder={t('incidents.form.searchResident')}
                      value={residentSearch}
                      onChange={(e) => setResidentSearch(e.target.value)}
                      disabled={optionsLoading}
                    />
                  </div>
                  <div className="ic-multi-select-list">
                    {filteredResidents.length === 0 ? (
                      <div className="ic-multi-select-empty">{t('incidents.form.noResidents')}</div>
                    ) : (
                      filteredResidents.map((resident) => {
                        const isSelected = form.residentIds.includes(resident._id);
                        return (
                          <label key={resident._id} className="ic-multi-select-item">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleResident(resident._id)}
                              disabled={optionsLoading}
                            />
                            <div className="ic-multi-select-item__label">
                              <span className="ic-multi-select-item__name">{formatResidentLabel(resident)}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {canAssignHandlers && (
                  <div className="ic-field ic-field--multi-select">
                    <label className="ic-field__label">{t('incidents.form.assignedStaff')}</label>
                    <div className="ic-multi-select-filters">
                      <select
                        className="ic-field__select"
                        value={areaFilter}
                        onChange={(e) => setAreaFilter(e.target.value)}
                        disabled={optionsLoading}
                      >
                        <option value="">{t('incidents.form.filterAreaAll')}</option>
                        {areaOptions.map((area) => (
                          <option key={area.id} value={area.id}>{area.label}</option>
                        ))}
                      </select>
                      <input
                        type="search"
                        className="ic-multi-select-search"
                        placeholder={t('incidents.form.searchStaff')}
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        disabled={optionsLoading}
                      />
                    </div>
                    <div className="ic-multi-select-list">
                      {filteredStaff.length === 0 ? (
                        <div className="ic-multi-select-empty">{t('incidents.form.noStaff')}</div>
                      ) : (
                        filteredStaff.map((staff) => {
                          const isChecked = form.assignedStaffIds.includes(staff._id);
                          return (
                            <label key={staff._id} className="ic-multi-select-item">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleAssignedStaff(staff._id)}
                                disabled={optionsLoading}
                              />
                              <div className="ic-multi-select-item__label">
                                <span className="ic-multi-select-item__name">{formatStaffLabel(staff)}</span>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="ic-field ic-form-full">
                  <label className="ic-field__label">{t('incidents.form.description')} *</label>
                  <textarea
                    className="ic-field__textarea"
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="ic-drawer__footer" style={{ padding: 0, border: 'none', marginTop: 20 }}>
                <button type="button" className="ic-btn ic-btn--secondary" onClick={() => setDrawerOpen(false)}>
                  {t('incidents.form.cancel')}
                </button>
                <button type="submit" className="ic-btn ic-btn--primary" disabled={isSaving}>
                  <PlusCircle size={16} />
                  {isSaving ? t('incidents.form.saving') : t('incidents.createIncident')}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Assign Handlers Modal ─────────────────────────────── */}
      {assignHandlersOpen && (
        <>
          <div className="ic-drawer-overlay" onClick={() => { setAssignHandlersOpen(false); setSelectedHandlers([]); }} />
          <div className="ic-drawer">
            <div className="ic-drawer__header">
              <h2 className="ic-drawer__title">{t('incidents.assignHandlers')}</h2>
              <button type="button" className="ic-drawer__close" onClick={() => { setAssignHandlersOpen(false); setSelectedHandlers([]); }}>
                <X size={20} />
              </button>
            </div>
            <div className="ic-drawer__body">
              <div className="ic-form-grid">
                <div className="ic-field ic-form-full">
                  <label className="ic-field__label">{t('incidents.form.assignedStaff')} *</label>
                  <div className="ic-multi-select">
                    {staffAccounts.length > 0 ? (
                      staffAccounts.map((staff) => (
                        <label key={staff._id || staff.id} className="ic-multi-select-item">
                          <input
                            type="checkbox"
                            checked={selectedHandlers.includes(staff._id || staff.id)}
                            onChange={(e) => {
                              const id = staff._id || staff.id;
                              if (e.target.checked) {
                                setSelectedHandlers([...selectedHandlers, id]);
                              } else {
                                setSelectedHandlers(selectedHandlers.filter((s) => s !== id));
                              }
                            }}
                          />
                          <div className="ic-multi-select-item__label">
                            <span className="ic-multi-select-item__name">{formatStaffLabel(staff)}</span>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p style={{ color: '#666', padding: '10px' }}>{t('incidents.noStaff')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="ic-drawer__footer" style={{ padding: 0, border: 'none', marginTop: 20 }}>
              <button type="button" className="ic-btn ic-btn--secondary" onClick={() => { setAssignHandlersOpen(false); setSelectedHandlers([]); }}>
                {t('incidents.form.cancel')}
              </button>
              <button
                type="button"
                className="ic-btn ic-btn--primary"
                disabled={assigningHandlers || selectedHandlers.length === 0}
                onClick={handleAssignHandlers}
              >
                {assigningHandlers ? t('incidents.form.saving') : t('incidents.assignHandlers')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default IncidentManagementPage;
