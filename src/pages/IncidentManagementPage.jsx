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
import { useAuth } from '../hooks/useAuth';
import incidentService from '../services/incident.service';
import '../styles/shared/IncidentManagementPage.css';

const initialForm = {
  incidentType: '',
  severity: 'medium',
  incidentAt: '',
  location: '',
  description: '',
  residentId: '',
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

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

  /* ── Data loading ──────────────────────────────────────────── */
  const loadIncidents = async () => {
    setLoading(true);
    try {
      const payload = {
        page: 1,
        limit: 20,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(isAdmin ? {} : { reporterRole: user?.role }),
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
    if (!user) return;
    loadIncidents();
  }, [user, search, statusFilter]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadFormOptions = async () => {
      setOptionsLoading(true);
      try {
        const [residentResponse, staffResponse] = await Promise.all([
          residentService.getResidentList({ page: 1, limit: 200 }),
          authService.getStaffAccounts({ page: 1, limit: 500 }),
        ]);
        if (!active) return;
        setResidents(residentResponse?.data || []);
        setStaffAccounts(staffResponse?.data || []);
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
  }, [user]);

  /* ── Handlers ──────────────────────────────────────────────── */
  const handleCreate = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const payload = {
        ...form,
        incidentAt: toIsoDatetime(form.incidentAt),
        residentId: form.residentId || undefined,
        assignedStaffIds: form.assignedStaffIds.length ? form.assignedStaffIds : undefined,
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

  const handleExport = async () => {
    try {
      const csv = await incidentService.exportIncidents({
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(isAdmin ? {} : { reporterRole: user?.role }),
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
          <button type="button" className="ic-btn ic-btn--primary" onClick={() => setDrawerOpen(true)}>
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
                      {incident.residentId?.fullName || incident.residentId || t('incidents.unknownResident')}
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

                <div className="ic-field">
                  <label className="ic-field__label">{t('incidents.form.resident')}</label>
                  <select
                    className="ic-field__select"
                    value={form.residentId}
                    onChange={(e) => setForm((c) => ({ ...c, residentId: e.target.value }))}
                    disabled={optionsLoading}
                  >
                    <option value="">{t('incidents.form.noResident')}</option>
                    {residents.map((r) => (
                      <option key={r._id} value={r._id}>{formatResidentLabel(r)}</option>
                    ))}
                  </select>
                </div>

                <div className="ic-field">
                  <label className="ic-field__label">{t('incidents.form.assignedStaff')}</label>
                  <select
                    className="ic-field__select"
                    multiple
                    size={4}
                    value={form.assignedStaffIds}
                    onChange={(e) =>
                      setForm((c) => ({
                        ...c,
                        assignedStaffIds: Array.from(e.target.selectedOptions, (o) => o.value),
                      }))
                    }
                    disabled={optionsLoading}
                  >
                    {staffAccounts.map((s) => (
                      <option key={s._id} value={s._id}>{formatStaffLabel(s)}</option>
                    ))}
                  </select>
                </div>

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
    </div>
  );
}

export default IncidentManagementPage;
