import { useState, useMemo, useEffect, useCallback } from 'react';
import medicationService from '../../services/medication.service';
import '../../styles/medications/MedicationPage.css';

/* ── constants ── */
const ROUTES_LIST = ['Oral', 'IM Injection', 'IV Injection', 'Subcutaneous', 'Sublingual', 'Topical', 'Eye drop', 'Ear drop', 'Inhalation'];

const RX_STATUS_LABELS = { active: 'Active', paused: 'Paused', stopped: 'Stopped', completed: 'Completed' };
const ADMIN_STATUS_LABELS = { pending: 'Pending', taken: 'Taken', missed: 'Missed', overdue: 'Overdue' };

const toDateInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDayLabel = (d) =>
  new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

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
          <span className="med-warning-banner__icon"></span>
          <span><strong>Allergies:</strong> {resident.allergies.join(', ')}</span>
        </div>
      )}
      {hasConditions && (
        <div className="med-warning-banner__row">
          <span className="med-warning-banner__icon"></span>
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

/* ── Create / Edit Prescription Modal ── */
function PrescriptionModal({ mode, prescription, residents, onSave, onClose }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    residentId: prescription?.residentId?._id || prescription?.residentId || '',
    medicationName: prescription?.medicationName || '',
    dosage: prescription?.dosage || '',
    route: prescription?.route || 'Oral',
    frequency: prescription?.frequency || '',
    startDate: toDateInput(prescription?.startDate),
    endDate: toDateInput(prescription?.endDate),
    status: prescription?.status || 'active',
    notes: prescription?.notes || '',
  });
  const [errors, setErrors] = useState({});

  const selectedResident = useMemo(
    () => residents.find((r) => r._id === form.residentId) || null,
    [residents, form.residentId]
  );

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.residentId) errs.residentId = 'Required';
    if (!form.medicationName.trim()) errs.medicationName = 'Required';
    if (!form.dosage.trim()) errs.dosage = 'Required';
    if (!form.startDate) errs.startDate = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      ...(isEdit ? { _id: prescription._id } : {}),
      ...form,
      endDate: form.endDate || null,
    });
  };

  return (
    <Modal
      title={isEdit ? 'Edit Prescription' : 'Create Prescription'}
      onClose={onClose}
      footer={
        <>
          <button className="med-btn med-btn--secondary" onClick={onClose}>Cancel</button>
          <button className="med-btn med-btn--primary" onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Create'}
          </button>
        </>
      }
    >
      {/* Resident selector — read-only when editing */}
      <div className="med-form-group">
        <label className="med-form-label">Resident <span style={{ color: '#ef4444' }}>*</span></label>
        {isEdit ? (
          <div className="med-form-input" style={{ background: '#f8fafc', color: '#64748b' }}>
            {prescription.residentId?.fullName} ({prescription.residentId?.residentCode})
          </div>
        ) : (
          <select className={`med-form-select${errors.residentId ? ' med-form-select--err' : ''}`} value={form.residentId} onChange={set('residentId')}>
            <option value="">-- Select resident --</option>
            {residents.map((r) => (
              <option key={r._id} value={r._id}>{r.fullName} ({r.residentCode})</option>
            ))}
          </select>
        )}
        {errors.residentId && <span className="med-form-error">{errors.residentId}</span>}
      </div>

      <ResidentWarning resident={isEdit ? prescription.residentId : selectedResident} />

      <div className="med-form-row">
        <div className="med-form-group">
          <label className="med-form-label">Medication name <span style={{ color: '#ef4444' }}>*</span></label>
          <input className={`med-form-input${errors.medicationName ? ' med-form-input--err' : ''}`} value={form.medicationName} onChange={set('medicationName')} placeholder="e.g. Metformin" />
          {errors.medicationName && <span className="med-form-error">{errors.medicationName}</span>}
        </div>
        <div className="med-form-group">
          <label className="med-form-label">Dosage <span style={{ color: '#ef4444' }}>*</span></label>
          <input className={`med-form-input${errors.dosage ? ' med-form-input--err' : ''}`} value={form.dosage} onChange={set('dosage')} placeholder="e.g. 500mg" />
          {errors.dosage && <span className="med-form-error">{errors.dosage}</span>}
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
          <input className="med-form-input" value={form.frequency} onChange={set('frequency')} placeholder="e.g. Twice daily" />
        </div>
      </div>

      <div className="med-form-row">
        <div className="med-form-group">
          <label className="med-form-label">Start date <span style={{ color: '#ef4444' }}>*</span></label>
          <input type="date" className={`med-form-input${errors.startDate ? ' med-form-input--err' : ''}`} value={form.startDate} onChange={set('startDate')} />
          {errors.startDate && <span className="med-form-error">{errors.startDate}</span>}
        </div>
        <div className="med-form-group">
          <label className="med-form-label">End date</label>
          <input type="date" className="med-form-input" value={form.endDate} onChange={set('endDate')} />
        </div>
      </div>

      {isEdit && (
        <div className="med-form-group">
          <label className="med-form-label">Status</label>
          <select className="med-form-select" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="stopped">Stopped</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      )}

      <div className="med-form-group">
        <label className="med-form-label">Notes</label>
        <textarea className="med-form-textarea" rows={3} value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
      </div>
    </Modal>
  );
}

/* ── Schedule Times Modal ── */
function ScheduleModal({ prescription, onSave, onClose }) {
  const [times, setTimes] = useState([...(prescription.scheduleTimes || [])]);
  const [newTime, setNewTime] = useState('');

  const addTime = () => {
    if (!newTime || times.includes(newTime)) return;
    setTimes((prev) => [...prev, newTime].sort());
    setNewTime('');
  };

  const removeTime = (t) => setTimes((prev) => prev.filter((x) => x !== t));

  return (
    <Modal
      title={`Medication Schedule — ${prescription.medicationName}`}
      onClose={onClose}
      footer={
        <>
          <button className="med-btn med-btn--secondary" onClick={onClose}>Cancel</button>
          <button className="med-btn med-btn--primary" onClick={() => onSave(prescription._id, times)}>Save Schedule</button>
        </>
      }
    >
      <div className="med-info-card" style={{ marginBottom: 16 }}>
        <div className="med-info-card__grid">
          <div className="med-info-card__item">
            <span className="med-info-card__label">Resident</span>
            <span className="med-info-card__value">{prescription.residentId?.fullName}</span>
          </div>
          <div className="med-info-card__item">
            <span className="med-info-card__label">Dosage</span>
            <span className="med-info-card__value">{prescription.dosage} — {prescription.route}</span>
          </div>
          <div className="med-info-card__item">
            <span className="med-info-card__label">Frequency</span>
            <span className="med-info-card__value">{prescription.frequency || '—'}</span>
          </div>
        </div>
      </div>

      <div className="med-section-head">
        <h3>Scheduled times</h3>
      </div>

      <div className="med-times-list">
        {times.length === 0 && <span style={{ color: '#94a3b8', fontSize: 14 }}>No times set yet.</span>}
        {times.map((t) => (
          <span key={t} className="med-time-chip">
            {t}
            <button className="med-time-chip__del" onClick={() => removeTime(t)}>&#10005;</button>
          </span>
        ))}
      </div>

      <div className="med-time-add">
        <input
          type="time"
          className="med-time-add__input"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
        />
        <button className="med-time-add__btn" onClick={addTime}>+ Add time</button>
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
        <div className="med-info-card__grid">
          <div className="med-info-card__item">
            <span className="med-info-card__label">Resident</span>
            <span className="med-info-card__value">{prescription.residentId?.fullName} ({prescription.residentId?.residentCode})</span>
          </div>
          <div className="med-info-card__item">
            <span className="med-info-card__label">Dosage</span>
            <span className="med-info-card__value">{prescription.dosage} — {prescription.route}</span>
          </div>
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
                  <td>{fmtDate(h.scheduledAt)} {fmtTime(h.scheduledAt)}</td>
                  <td>{h.takenAt ? `${fmtDate(h.takenAt)} ${fmtTime(h.takenAt)}` : '—'}</td>
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

/* ════════════════════════════════════════
   Tab 1 — Prescriptions
   ════════════════════════════════════════ */
function PrescriptionsTab({ prescriptions, residents, loading, onOpenCreate, onOpenEdit, onOpenSchedule, onOpenHistory }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

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
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="med-action-btn med-action-btn--edit" onClick={() => onOpenEdit(p)}> Edit</button>
                        <button className="med-action-btn med-action-btn--schedule" onClick={() => onOpenSchedule(p)}> Schedule</button>
                        <button className="med-action-btn med-action-btn--history" onClick={() => onOpenHistory(p)}> History</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   Tab 2 — Daily Schedule (read-only for doctor)
   ════════════════════════════════════════ */
function DailyTab() {
  const [date, setDate] = useState(new Date());
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  const counts = useMemo(() => ({
    pending: admins.filter((a) => a.status === 'pending').length,
    taken: admins.filter((a) => a.status === 'taken').length,
    missed: admins.filter((a) => a.status === 'missed').length,
    overdue: admins.filter((a) => a.status === 'overdue').length,
  }), [admins]);

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
                <th>Administered by</th>
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
                    <td>{a.administeredByStaffId?.userId?.fullName || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   Root — DoctorMedicationPage
   ════════════════════════════════════════ */
function DoctorMedicationPage() {
  const [activeTab, setActiveTab] = useState('prescriptions');
  const [prescriptions, setPrescriptions] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loadingRx, setLoadingRx] = useState(true);
  const [modal, setModal] = useState({ type: null, prescription: null });
  // type: null | 'create' | 'edit' | 'schedule' | 'history'

  const loadPrescriptions = useCallback(() => {
    setLoadingRx(true);
    medicationService.listPrescriptions({ limit: 100 })
      .then((res) => setPrescriptions(res.data || []))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoadingRx(false));
  }, []);

  useEffect(() => {
    loadPrescriptions();
    medicationService.getMyResidents()
      .then((data) => setResidents(Array.isArray(data) ? data : []))
      .catch(() => setResidents([]));
  }, [loadPrescriptions]);

  const closeModal = () => setModal({ type: null, prescription: null });

  const handleCreate = async (form) => {
    try {
      await medicationService.createPrescription(form);
      closeModal();
      loadPrescriptions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create prescription');
    }
  };

  const handleEdit = async (form) => {
    try {
      await medicationService.updatePrescription(form._id, form);
      closeModal();
      loadPrescriptions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update prescription');
    }
  };

  const handleSaveSchedule = async (prescriptionId, scheduleTimes) => {
    try {
      await medicationService.updatePrescription(prescriptionId, { scheduleTimes });
      closeModal();
      loadPrescriptions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save schedule');
    }
  };

  return (
    <div className="med-page">
      <div className="med-page__header">
        <h1 className="med-page__title">Medication Management</h1>
        {activeTab === 'prescriptions' && (
          <button className="med-btn med-btn--primary" onClick={() => setModal({ type: 'create', prescription: null })}>
            + Create Prescription
          </button>
        )}
      </div>

      <div className="med-tabs">
        <button className={`med-tab ${activeTab === 'prescriptions' ? 'med-tab--active' : ''}`} onClick={() => setActiveTab('prescriptions')}>
          Prescriptions
        </button>
        <button className={`med-tab ${activeTab === 'daily' ? 'med-tab--active' : ''}`} onClick={() => setActiveTab('daily')}>
          Daily Schedule
        </button>
      </div>

      {activeTab === 'prescriptions' ? (
        <PrescriptionsTab
          prescriptions={prescriptions}
          residents={residents}
          loading={loadingRx}
          onOpenCreate={() => setModal({ type: 'create', prescription: null })}
          onOpenEdit={(p) => setModal({ type: 'edit', prescription: p })}
          onOpenSchedule={(p) => setModal({ type: 'schedule', prescription: p })}
          onOpenHistory={(p) => setModal({ type: 'history', prescription: p })}
        />
      ) : (
        <DailyTab />
      )}

      {modal.type === 'create' && (
        <PrescriptionModal mode="create" prescription={null} residents={residents} onSave={handleCreate} onClose={closeModal} />
      )}
      {modal.type === 'edit' && (
        <PrescriptionModal mode="edit" prescription={modal.prescription} residents={residents} onSave={handleEdit} onClose={closeModal} />
      )}
      {modal.type === 'schedule' && (
        <ScheduleModal prescription={modal.prescription} onSave={handleSaveSchedule} onClose={closeModal} />
      )}
      {modal.type === 'history' && (
        <HistoryModal prescription={modal.prescription} onClose={closeModal} />
      )}
    </div>
  );
}

export default DoctorMedicationPage;
