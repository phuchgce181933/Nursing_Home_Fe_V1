import { useEffect, useMemo, useState } from 'react';
import { Download, PlusCircle } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import authService from '../services/auth.service';
import residentService from '../services/resident.service';
import { useAuth } from '../hooks/useAuth';
import incidentService from '../services/incident.service';

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
  const { user } = useAuth();
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

  const isAdmin = user?.role === 'admin';

  const formatResidentLabel = (resident) => {
    const baseName = resident?.fullName || 'Unnamed resident';
    const code = resident?.residentCode ? ` (${resident.residentCode})` : '';
    return `${baseName}${code}`;
  };

  const formatStaffLabel = (staff) => {
    const name = staff?.fullName || staff?.email || 'Unnamed staff';
    const role = staff?.role ? ` — ${staff.role.toUpperCase()}` : '';
    const email = staff?.email ? ` • ${staff.email}` : '';
    return `${name}${role}${email}`;
  };

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
      setMessage(error?.response?.data?.message || 'Unable to load incidents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    loadIncidents();
  }, [user, search, statusFilter]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    const loadFormOptions = async () => {
      setOptionsLoading(true);

      try {
        const [residentResponse, staffResponse] = await Promise.all([
          residentService.getResidentList({ page: 1, limit: 200 }),
          authService.getStaffAccounts({ page: 1, limit: 500 }),
        ]);

        if (!active) {
          return;
        }

        setResidents(residentResponse?.data || []);
        setStaffAccounts(staffResponse?.data || []);
      } catch (error) {
        if (!active) {
          return;
        }

        setMessageType('error');
        setMessage(error?.response?.data?.message || 'Unable to load resident and staff options.');
      } finally {
        if (active) {
          setOptionsLoading(false);
        }
      }
    };

    loadFormOptions();

    return () => {
      active = false;
    };
  }, [user]);

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
      setMessage('Incident created successfully.');
      setForm(initialForm);
      await loadIncidents();
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Unable to create incident.');
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
      setMessage('Incident status updated.');
      await loadIncidents();
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Unable to update incident status.');
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
      setMessage('Incident export started.');
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Unable to export incidents.');
    }
  };

  const stats = useMemo(() => ({
    total: incidents.length,
    open: incidents.filter((incident) => incident.status === 'open').length,
    investigating: incidents.filter((incident) => incident.status === 'investigating').length,
    resolved: incidents.filter((incident) => incident.status === 'resolved').length,
  }), [incidents]);

  if (!user) {
    return <LoadingSpinner label="Loading incident page..." />;
  }

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <div>
          <h1 className="profile-page__title">Incident Management</h1>
          <p className="profile-page__subtitle">Manage incidents for admin, doctor, and nurse workflows.</p>
        </div>
        <button type="button" className="button button--primary" onClick={handleExport}>
          <Download size={16} />
          Export CSV
        </button>
      </header>

      {message && (
        <div className={`message ${messageType === 'success' ? 'message--success' : 'message--error'}`}>
          {message}
        </div>
      )}

      <section className="profile-card">
        <h2 className="profile-card__heading">Create Incident</h2>
        <form className="profile-form" onSubmit={handleCreate}>
          <div
            className="profile-form__grid"
            style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
          >
              <label className="profile-form__field">
                <span className="profile-form__label">Incident Type</span>
                <input
                  className="profile-form__input"
                  value={form.incidentType}
                  onChange={(event) => setForm((current) => ({ ...current, incidentType: event.target.value }))}
                  required
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Severity</span>
                <select
                  className="profile-form__input"
                  value={form.severity}
                  onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Incident Time</span>
                <input
                  className="profile-form__input"
                  type="datetime-local"
                  value={form.incidentAt}
                  onChange={(event) => setForm((current) => ({ ...current, incidentAt: event.target.value }))}
                  required
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Location</span>
                <input
                  className="profile-form__input"
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Resident</span>
                <select
                  className="profile-form__input"
                  value={form.residentId}
                  onChange={(event) => setForm((current) => ({ ...current, residentId: event.target.value }))}
                  disabled={optionsLoading}
                >
                  <option value="">No resident selected</option>
                  {residents.map((resident) => (
                    <option key={resident._id} value={resident._id}>
                      {formatResidentLabel(resident)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">Assigned Staff</span>
                <select
                  className="profile-form__input"
                  multiple
                  size={5}
                  value={form.assignedStaffIds}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      assignedStaffIds: Array.from(event.target.selectedOptions, (option) => option.value),
                    }))
                  }
                  disabled={optionsLoading}
                >
                  <option value="">No staff selected</option>
                  {staffAccounts.map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {formatStaffLabel(staff)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="profile-form__field" style={{ gridColumn: '1 / -1' }}>
                <span className="profile-form__label">Description</span>
                <textarea
                  className="profile-form__input"
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  required
                />
              </label>
            </div>

          <div className="profile-page__actions">
            <button type="submit" className="button button--primary" disabled={isSaving}>
              <PlusCircle size={16} />
              {isSaving ? 'Saving...' : 'Create Incident'}
            </button>
          </div>
        </form>
      </section>
      
      <section className="profile-card profile-card--accent" style={{ marginTop: '1.5rem' }}>
        <h2 className="profile-card__heading">Overview</h2>
        <div className="profile-form__grid">
          <div>
            <p className="profile-card__empty">Total incidents</p>
            <strong>{stats.total}</strong>
          </div>
          <div>
            <p className="profile-card__empty">Open</p>
            <strong>{stats.open}</strong>
          </div>
          <div>
            <p className="profile-card__empty">Investigating</p>
            <strong>{stats.investigating}</strong>
          </div>
          <div>
            <p className="profile-card__empty">Resolved</p>
            <strong>{stats.resolved}</strong>
          </div>
        </div>
      </section>

      <section className="profile-card" style={{ marginTop: '1.5rem' }}>
        <div className="profile-page__header">
          <div>
            <h2 className="profile-card__heading">Incident List</h2>
            <p className="profile-card__empty">Filter and review current incidents.</p>
          </div>
          <div className="profile-form__grid" style={{ width: '100%', maxWidth: 720 }}>
            <label className="profile-form__field">
              <span className="profile-form__label">Search</span>
              <input
                className="profile-form__input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search incident, location, reporter"
              />
            </label>
            <label className="profile-form__field">
              <span className="profile-form__label">Status</span>
              <select
                className="profile-form__input"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner label="Loading incidents..." />
        ) : incidents.length === 0 ? (
          <p className="profile-card__empty">No incidents found.</p>
        ) : (
          <div className="profile-form__grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {incidents.map((incident) => (
              <div key={incident._id} className="profile-card" style={{ margin: 0 }}>
                <div className="profile-page__header" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <p className="profile-card__role">{incident.incidentType}</p>
                    <h3>{incident.residentId?.fullName || incident.residentId || 'Resident not specified'}</h3>
                  </div>
                  <span className="profile-card__role">{incident.status}</span>
                </div>

                <p className="profile-card__empty">{incident.description}</p>
                <p className="profile-card__empty">Location: {incident.location || '—'}</p>
                <p className="profile-card__empty">Severity: {incident.severity}</p>
                <p className="profile-card__empty">Reported by: {incident.reporterName || incident.reporterEmail || 'Unknown'}</p>
                <p className="profile-card__empty">Time: {formatDate(incident.incidentAt)}</p>

                <div className="profile-page__actions">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={status === incident.status ? 'button button--primary' : 'button button--secondary'}
                      onClick={() => handleStatusUpdate(incident._id, status)}
                      disabled={isSaving || status === incident.status}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default IncidentManagementPage;
