import { useState, useMemo, useEffect, useCallback } from 'react';
import medicationService from '../../services/medication.service';
import '../../styles/medications/MedicationPage.css';

/* ── constants ── */
const ROUTES_LIST = ['Oral', 'IM Injection', 'IV Injection', 'Subcutaneous', 'Sublingual', 'Topical', 'Eye drop', 'Ear drop', 'Inhalation'];
const RX_STATUS_LABELS = { active: 'Active', paused: 'Paused', stopped: 'Stopped', completed: 'Completed' };
const ADMIN_STATUS_LABELS = { pending: 'Pending', taken: 'Taken', missed: 'Missed', overdue: 'Overdue' };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDatetime = (d) => d ? `${fmtDate(d)} ${fmtTime(d)}` : '—';
const fmtDayLabel = (d) =>
  new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
const toDateInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';

/* ── Allergy / condition warning banner ── */
function ResidentWarning({ resident }) {
  if (!resident) return null;
  const hasAllergies = resident.allergies?.length > 0;
  const hasConditions = resident.chronicConditions?.length > 0;
  if (!hasAllergies && !hasConditions) return null;
  return (
    <div className="med-warning-banner">
      {hasAllergies && (
        <div className="med-warning-banner__row">
          <span className="med-warning-banner__icon">⚠️</span>
          <span><strong>Allergies:</strong> {resident.allergies.join(', ')}</span>
        </div>
      )}
      {hasConditions && (
        <div className="med-warning-banner__row">
          <span className="med-warning-banner__icon">🩺</span>
          <span><strong>Chronic conditions:</strong> {resident.chronicConditions.join(', ')}</span>
        </div>
      )}
    </div>
  );
}

/* ── StatusBadge ── */
function StatusBadge({ status, type }) {
  const labels = type === 'admin' ? ADMIN_STATUS_LABELS : RX_STATUS_LABELS;
  return <span className={`med-badge med-badge--${status}`}>{labels[status] || status}</span>;
}

/* ── Modal wrapper ── */
function Modal({ title, onClose, children, footer, size }) {
  return (
    <div className="med-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`med-modal ${size === 'lg' ? 'med-modal--lg' : ''}`}>
        <div className="med-modal__header">
          <h2 className="med-modal__title">{title}</h2>
          <button className="med-modal__close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="med-modal__body">{children}</div>
        {footer && <div className="med-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ── Edit Prescription Modal (Nurse) ── */
function EditPrescriptionModal({ prescription, onSave, onClose }) {
  const [form, setForm] = useState({
    medicationName: prescription.medicationName || '',
    dosage: prescription.dosage || '',
    route: prescription.route || 'Oral',
    frequency: prescription.frequency || '',
    startDate: toDateInput(prescription.startDate),
    endDate: toDateInput(prescription.endDate),
    status: prescription.status || 'active',
    notes: prescription.notes || '',
  });

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = () => {
    if (!form.medicationName.trim() || !form.dosage.trim()) return;
    onSave(prescription._id, { ...form, endDate: form.endDate || null });
  };

  const resident = prescription.residentId;

  return (
    <Modal
      title="Edit Prescription"
      onClose={onClose}
      footer={
        <>
          <button className="med-btn med-btn--secondary" onClick={onClose}>Cancel</button>
          <button className="med-btn med-btn--primary" onClick={handleSubmit}>Save Changes</button>
        </>
      }
    >
      <div className="med-info-card" style={{ marginBottom: 12 }}>
        <div className="med-info-card__row">
          <span className="med-info-card__label">Resident</span>
          <span className="med-info-card__value">{resident?.fullName} ({resident?.residentCode})</span>
        </div>
        <div className="med-info-card__row">
          <span className="med-info-card__label">Prescribed by</span>
          <span className="med-info-card__value">{prescription.prescribedByStaffId?.userId?.fullName || '—'}</span>
        </div>
      </div>

      <ResidentWarning resident={resident} />

      <div className="med-form-row">
        <div className="med-form-group">
          <label className="med-form-label">Medication name <span style={{ color: '#ef4444' }}>*</span></label>
          <input className="med-form-input" value={form.medicationName} onChange={set('medicationName')} />
        </div>
        <div className="med-form-group">
          <label className="med-form-label">Dosage <span style={{ color: '#ef4444' }}>*</span></label>
          <input className="med-form-input" value={form.dosage} onChange={set('dosage')} />
        </div>
      </div>

      <div className="med-form-row">
        <div className="med-form-group">
          <label className="med-form-label">Route</label>
          <select className="med-form-select" value={form.route} onChange={set('route')}>
            {ROUTES_LIST.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="med-form-group">
          <label className="med-form-label">Frequency</label>
          <input className="med-form-input" value={form.frequency} onChange={set('frequency')} />
        </div>
      </div>

      <div className="med-form-row">
        <div className="med-form-group">
          <label className="med-form-label">Start date</label>
          <input type="date" className="med-form-input" value={form.startDate} onChange={set('startDate')} />
        </div>
        <div className="med-form-group">
          <label className="med-form-label">End date</label>
          <input type="date" className="med-form-input" value={form.endDate} onChange={set('endDate')} />
        </div>
      </div>

      <div className="med-form-group">
        <label className="med-form-label">Status</label>
        <select className="med-form-select" value={form.status} onChange={set('status')}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="stopped">Stopped</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="med-form-group">
        <label className="med-form-label">Notes</label>
        <textarea className="med-form-textarea" rows={3} value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
      </div>
    </Modal>
  );
}

/* ── History Modal ── */
function HistoryModal({ prescription, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    medicationService.getAdministrationHistory(prescription._id)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [prescription._id]);

  return (
    <Modal title={`Administration History — ${prescription.medicationName}`} onClose={onClose} size="lg">
      <div className="med-info-card" style={{ marginBottom: 16 }}>
        <div className="med-info-card__row">
          <span className="med-info-card__label">Resident</span>
          <span className="med-info-card__value">{prescription.residentId?.fullName} ({prescription.residentId?.residentCode})</span>
        </div>
        <div className="med-info-card__row">
          <span className="med-info-card__label">Dosage</span>
          <span className="med-info-card__value">{prescription.dosage} — {prescription.route}</span>
        </div>
      </div>

      {loading ? (
        <p className="med-empty">Loading history...</p>
      ) : history.length === 0 ? (
        <p className="med-empty">No administration history yet.</p>
      ) : (
        <div className="med-table-wrap">
          <table className="med-table">
            <thead>
              <tr>
                <th>Scheduled</th>
                <th>Taken at</th>
                <th>Status</th>
                <th>Administered by</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h._id}>
                  <td>{fmtDatetime(h.scheduledAt)}</td>
                  <td>{h.takenAt ? fmtDatetime(h.takenAt) : '—'}</td>
                  <td><StatusBadge status={h.status} type="admin" /></td>
                  <td>{h.administeredByStaffId?.userId?.fullName || '—'}</td>
                  <td>{h.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

/* ── Confirm Mark Modal ── */
function ConfirmMarkModal({ admin, newStatus, onConfirm, onClose, saving }) {
  const [notes, setNotes] = useState('');
  const isMissed = newStatus === 'missed';
  return (
    <Modal
      title={isMissed ? 'Confirm Missed Dose' : 'Confirm Medication Taken'}
      onClose={onClose}
      footer={
        <>
          <button className="med-btn med-btn--secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className={`med-btn ${isMissed ? 'med-btn--danger' : 'med-btn--primary'}`}
            onClick={() => onConfirm(admin._id, newStatus, notes)}
            disabled={saving}
          >
            {saving ? 'Saving...' : isMissed ? 'Confirm Missed' : 'Confirm Taken'}
          </button>
        </>
      }
    >
      <div className="med-info-card" style={{ marginBottom: 16 }}>
        <div className="med-info-card__row">
          <span className="med-info-card__label">Resident</span>
          <span className="med-info-card__value">{admin.residentId?.fullName} ({admin.residentId?.residentCode})</span>
        </div>
        <div className="med-info-card__row">
          <span className="med-info-card__label">Medication</span>
          <span className="med-info-card__value">{admin.prescriptionId?.medicationName} {admin.prescriptionId?.dosage}</span>
        </div>
        <div className="med-info-card__row">
          <span className="med-info-card__label">Scheduled time</span>
          <span className="med-info-card__value">{fmtTime(admin.scheduledAt)}</span>
        </div>
      </div>
      <div className="med-form-group">
        <label className="med-form-label">{isMissed ? 'Reason for missed dose' : 'Notes (optional)'}</label>
        <textarea
          className="med-form-textarea"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isMissed ? 'Enter reason...' : 'Enter notes if any...'}
        />
      </div>
    </Modal>
  );
}

/* ════════════════════════════════════════
   Tab 1 — Today's Schedule
   ════════════════════════════════════════ */
function ScheduleTab() {
  const [date, setDate] = useState(new Date());
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const dateStr = date.toISOString().slice(0, 10);

  const load = useCallback(() => {
    setLoading(true);
    medicationService.listAdministrations({ date: dateStr, limit: 200 })
      .then((res) => setAdmins(res.data || []))
      .catch(() => setAdmins([]))
      .finally(() => setLoading(false));
  }, [dateStr]);

  useEffect(() => { load(); }, [load]);

  const shiftDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  };

  const openConfirm = (admin, newStatus) => setConfirmModal({ admin, newStatus });
  const closeConfirm = () => setConfirmModal(null);

  const handleConfirm = async (id, newStatus, notes) => {
    setSaving(true);
    try {
      await medicationService.markAdministration(id, { status: newStatus, notes });
      closeConfirm();
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(() => ({
    pending: admins.filter((a) => a.status === 'pending').length,
    taken: admins.filter((a) => a.status === 'taken').length,
    missed: admins.filter((a) => a.status === 'missed').length,
    overdue: admins.filter((a) => a.status === 'overdue').length,
  }), [admins]);

  const overdueItems = useMemo(() => admins.filter((a) => a.status === 'overdue'), [admins]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return admins.filter((a) => {
      const match = !q
        || (a.residentId?.fullName || '').toLowerCase().includes(q)
        || (a.prescriptionId?.medicationName || '').toLowerCase().includes(q);
      const st = !statusFilter || a.status === statusFilter;
      return match && st;
    });
  }, [admins, search, statusFilter]);

  return (
    <div className="med-tab-content">
      <div className="med-date-nav">
        <button className="med-date-nav__btn" onClick={() => shiftDate(-1)}>&#8249;</button>
        <span className="med-date-nav__label">{fmtDayLabel(date)}</span>
        <button className="med-date-nav__btn" onClick={() => shiftDate(1)}>&#8250;</button>
      </div>

      <div className="med-stats">
        {[['pending', 'Pending'], ['taken', 'Taken'], ['missed', 'Missed'], ['overdue', 'Overdue']].map(([k, label]) => (
          <div key={k} className={`med-stat-card med-stat-card--${k}`}>
            <div className="med-stat-card__label">{label}</div>
            <div className="med-stat-card__value">{counts[k]}</div>
          </div>
        ))}
      </div>

      {overdueItems.length > 0 && (
        <div className="med-reminder">
          <span className="med-reminder__icon">🔔</span>
          <span className="med-reminder__text">
            <strong>{overdueItems.length} overdue dose{overdueItems.length > 1 ? 's' : ''}</strong> require attention:{' '}
            {overdueItems.map((a) => `${a.residentId?.fullName} — ${a.prescriptionId?.medicationName} (${fmtTime(a.scheduledAt)})`).join(' · ')}
          </span>
        </div>
      )}

      <div className="med-filter">
        <input className="med-filter__search" type="text" placeholder="Search by resident name or medication..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="med-filter__select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="taken">Taken</option>
          <option value="missed">Missed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {loading ? (
        <p className="med-empty">Loading schedule...</p>
      ) : (
        <div className="med-table-wrap">
          <table className="med-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Resident</th>
                <th>Medication</th>
                <th>Dosage</th>
                <th>Route</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="med-empty">No records for this date</td></tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a._id}>
                    <td><span className="med-time">{fmtTime(a.scheduledAt)}</span></td>
                    <td>
                      <div className="med-resident__name">{a.residentId?.fullName}</div>
                      <div className="med-resident__code">{a.residentId?.residentCode}</div>
                    </td>
                    <td>
                      <div className="med-drug__name">{a.prescriptionId?.medicationName}</div>
                      <div className="med-drug__sub">{a.prescriptionId?.frequency}</div>
                    </td>
                    <td>{a.prescriptionId?.dosage}</td>
                    <td>{a.prescriptionId?.route}</td>
                    <td>
                      <StatusBadge status={a.status} type="admin" />
                      {a.status === 'taken' && a.takenAt && (
                        <div className="med-taken-time">at {fmtTime(a.takenAt)}</div>
                      )}
                    </td>
                    <td>
                      {(a.status === 'pending' || a.status === 'overdue') && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="med-action-btn med-action-btn--taken" onClick={() => openConfirm(a, 'taken')}>
                            ✓ Taken
                          </button>
                          <button className="med-action-btn med-action-btn--missed" onClick={() => openConfirm(a, 'missed')}>
                            ✕ Missed
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {confirmModal && (
        <ConfirmMarkModal
          admin={confirmModal.admin}
          newStatus={confirmModal.newStatus}
          onConfirm={handleConfirm}
          onClose={closeConfirm}
          saving={saving}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   Tab 2 — Prescriptions
   ════════════════════════════════════════ */
function PrescriptionsTab() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [modal, setModal] = useState({ type: null, prescription: null });
  // type: null | 'edit' | 'history'

  const load = useCallback(() => {
    setLoading(true);
    medicationService.listPrescriptions({ limit: 100 })
      .then((res) => setPrescriptions(res.data || []))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const closeModal = () => setModal({ type: null, prescription: null });

  const handleSaveEdit = async (id, form) => {
    try {
      await medicationService.updatePrescription(id, form);
      closeModal();
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update prescription');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return prescriptions.filter((p) => {
      const match = !q
        || (p.residentId?.fullName || '').toLowerCase().includes(q)
        || (p.medicationName || '').toLowerCase().includes(q);
      const st = !statusFilter || p.status === statusFilter;
      return match && st;
    });
  }, [prescriptions, search, statusFilter]);

  return (
    <div className="med-tab-content">
      <div className="med-filter">
        <input className="med-filter__search" type="text" placeholder="Search by resident name or medication..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="med-filter__select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="stopped">Stopped</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <p className="med-empty">Loading prescriptions...</p>
      ) : (
        <div className="med-table-wrap">
          <table className="med-table">
            <thead>
              <tr>
                <th>Resident</th>
                <th>Medication</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Schedule</th>
                <th>Route</th>
                <th>Start date</th>
                <th>End date</th>
                <th>Prescribed by</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="med-empty">No prescriptions found</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="med-resident__name">{p.residentId?.fullName}</div>
                      <div className="med-resident__code">{p.residentId?.residentCode}</div>
                    </td>
                    <td>
                      <div className="med-drug__name">{p.medicationName}</div>
                      {p.notes && <div className="med-drug__sub">{p.notes}</div>}
                    </td>
                    <td>{p.dosage}</td>
                    <td>{p.frequency || '—'}</td>
                    <td>
                      {p.scheduleTimes?.length > 0
                        ? p.scheduleTimes.map((t) => <span key={t} className="med-time-chip" style={{ marginRight: 4 }}>{t}</span>)
                        : <span style={{ color: '#94a3b8' }}>Not set</span>}
                    </td>
                    <td>{p.route}</td>
                    <td>{fmtDate(p.startDate)}</td>
                    <td>{fmtDate(p.endDate)}</td>
                    <td>{p.prescribedByStaffId?.userId?.fullName || '—'}</td>
                    <td><StatusBadge status={p.status} type="rx" /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="med-action-btn med-action-btn--edit" onClick={() => setModal({ type: 'edit', prescription: p })}>
                          ✎ Edit
                        </button>
                        <button className="med-action-btn med-action-btn--history" onClick={() => setModal({ type: 'history', prescription: p })}>
                          ⏱ History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal.type === 'edit' && (
        <EditPrescriptionModal prescription={modal.prescription} onSave={handleSaveEdit} onClose={closeModal} />
      )}
      {modal.type === 'history' && (
        <HistoryModal prescription={modal.prescription} onClose={closeModal} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   Root — NurseMedicationPage
   ════════════════════════════════════════ */
function NurseMedicationPage() {
  const [activeTab, setActiveTab] = useState('schedule');

  return (
    <div className="med-page">
      <div className="med-page__header">
        <h1 className="med-page__title">Medication Management</h1>
      </div>

      <div className="med-tabs">
        <button className={`med-tab ${activeTab === 'schedule' ? 'med-tab--active' : ''}`} onClick={() => setActiveTab('schedule')}>
          Today&apos;s Schedule
        </button>
        <button className={`med-tab ${activeTab === 'prescriptions' ? 'med-tab--active' : ''}`} onClick={() => setActiveTab('prescriptions')}>
          Prescriptions
        </button>
      </div>

      {activeTab === 'schedule' ? <ScheduleTab /> : <PrescriptionsTab />}
    </div>
  );
}

export default NurseMedicationPage;
