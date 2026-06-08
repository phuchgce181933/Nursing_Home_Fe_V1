import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import medicationService from '../../services/medication.service';
import '../../styles/medications/MedicationPage.css';

/* ── helpers ── */
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDatetime = (d) => (d ? `${fmtDate(d)} ${fmtTime(d)}` : '—');
const fmtDayLabel = (d) =>
  new Date(d).toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  });

const MISSED_REASONS = ['refused', 'asleep', 'vomiting', 'hospitalized', 'other'];

const RX_STATUS_KEYS = { ACTIVE: 'statusActive', COMPLETED: 'statusCompleted', CANCELLED: 'statusCancelled' };
const SCHED_STATUS_KEYS = {
  PENDING: 'schedPending', TAKEN: 'schedTaken', LATE_TAKEN: 'schedLateTaken',
  MISSED: 'schedMissed', SKIPPED: 'schedSkipped', OVERDUE: 'schedOverdue',
};

/* ── StatusBadge ── */
function StatusBadge({ status, type }) {
  const { t } = useTranslation();
  const keyMap = type === 'sched' ? SCHED_STATUS_KEYS : RX_STATUS_KEYS;
  const label = keyMap[status] ? t(`medication.${keyMap[status]}`) : status;
  return (
    <span className={`med-badge med-badge--${status.toLowerCase()}`}>{label}</span>
  );
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

/* ── Mark Modal (taken or missed) ── */
function MarkModal({ schedule, action, onConfirm, onClose, saving }) {
  const { t } = useTranslation();
  const isMissed = action === 'missed';
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (isMissed && !reason) return;
    onConfirm(schedule._id, action, reason, notes);
  };

  const resident = schedule._resident || {};

  return (
    <Modal
      title={isMissed ? t('medication.confirmMissed') : t('medication.confirmTaken')}
      onClose={onClose}
      footer={
        <>
          <button className="med-btn med-btn--secondary" onClick={onClose} disabled={saving}>
            {t('medication.cancelBtn')}
          </button>
          <button
            className={`med-btn ${isMissed ? 'med-btn--danger' : 'med-btn--primary'}`}
            onClick={handleConfirm}
            disabled={saving || (isMissed && !reason)}
          >
            {saving ? t('medication.loading') : t('medication.confirmBtn')}
          </button>
        </>
      }
    >
      <div className="med-info-card" style={{ marginBottom: 16 }}>
        <div className="med-info-card__row">
          <span className="med-info-card__label">{t('medication.colResident')}</span>
          <span className="med-info-card__value">{resident.fullName} ({resident.residentCode})</span>
        </div>
        <div className="med-info-card__row">
          <span className="med-info-card__label">{t('medication.colMedication')}</span>
          <span className="med-info-card__value">{schedule.medicationName} — {schedule.dosage}</span>
        </div>
        <div className="med-info-card__row">
          <span className="med-info-card__label">{t('medication.colTime')}</span>
          <span className="med-info-card__value">{fmtTime(schedule.scheduledTime)}</span>
        </div>
      </div>

      {isMissed && (
        <div className="med-form-group">
          <label className="med-form-label">
            {t('medication.missedReasonLabel')} <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            className="med-form-select"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">—</option>
            {MISSED_REASONS.map((r) => (
              <option key={r} value={r}>
                {t(`medication.reason${r.charAt(0).toUpperCase() + r.slice(1)}`)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="med-form-group">
        <label className="med-form-label">{t('medication.optionalNotes')}</label>
        <textarea
          className="med-form-textarea"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}

/* ════════════════════════════════════════
   Tab 1 — Today's Schedule
   ════════════════════════════════════════ */
function ScheduleTab() {
  const { t } = useTranslation();
  const [date, setDate] = useState(new Date());
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [markModal, setMarkModal] = useState(null); // { schedule, action }
  const [saving, setSaving] = useState(false);

  const dateStr = date.toISOString().slice(0, 10);

  const load = useCallback(() => {
    setLoading(true);
    medicationService
      .getDailySchedule({ date: dateStr })
      .then((res) => {
        const arr = Array.isArray(res) ? res : (res?.data || res?.groups || []);
        setGroups(arr);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [dateStr]);

  useEffect(() => { load(); }, [load]);

  const shiftDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  };

  // Flatten groups → rows
  const allRows = useMemo(() => {
    const flat = [];
    groups.forEach((group) => {
      const resident = group.residentId || group.resident || {};
      (group.schedules || []).forEach((s) => {
        flat.push({ ...s, _resident: resident });
      });
    });
    return flat.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  }, [groups]);

  const counts = useMemo(() => ({
    PENDING: allRows.filter((s) => s.status === 'PENDING').length,
    TAKEN: allRows.filter((s) => s.status === 'TAKEN' || s.status === 'LATE_TAKEN').length,
    MISSED: allRows.filter((s) => s.status === 'MISSED').length,
    OVERDUE: allRows.filter((s) => s.status === 'OVERDUE').length,
  }), [allRows]);

  const overdueRows = useMemo(() => allRows.filter((s) => s.status === 'OVERDUE'), [allRows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allRows.filter((s) => {
      const matchSearch =
        !q ||
        (s._resident?.fullName || '').toLowerCase().includes(q) ||
        (s.medicationName || '').toLowerCase().includes(q);
      const matchStatus = !statusFilter || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allRows, search, statusFilter]);

  const handleConfirm = async (id, action, reason, notes) => {
    setSaving(true);
    try {
      if (action === 'taken') {
        await medicationService.markTaken(id, notes ? { notes } : {});
      } else {
        await medicationService.markMissed(id, { reason, notes: notes || undefined });
      }
      setMarkModal(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('medication.markError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="med-tab-content">
      <div className="med-date-nav">
        <button className="med-date-nav__btn" onClick={() => shiftDate(-1)}>&#8249;</button>
        <span className="med-date-nav__label">{fmtDayLabel(date)}</span>
        <button className="med-date-nav__btn" onClick={() => shiftDate(1)}>&#8250;</button>
      </div>

      <div className="med-stats">
        {[
          ['PENDING', 'schedPending'],
          ['TAKEN', 'schedTaken'],
          ['MISSED', 'schedMissed'],
          ['OVERDUE', 'schedOverdue'],
        ].map(([k, labelKey]) => (
          <div key={k} className={`med-stat-card med-stat-card--${k.toLowerCase()}`}>
            <div className="med-stat-card__label">{t(`medication.${labelKey}`)}</div>
            <div className="med-stat-card__value">{counts[k]}</div>
          </div>
        ))}
      </div>

      {overdueRows.length > 0 && (
        <div className="med-reminder">
          <span className="med-reminder__icon">🔔</span>
          <span className="med-reminder__text">
            <strong>{t('medication.overdueAlert_other', { count: overdueRows.length })}</strong>
            {': '}
            {overdueRows
              .map((s) => `${s._resident?.fullName} — ${s.medicationName} (${fmtTime(s.scheduledTime)})`)
              .join(' · ')}
          </span>
        </div>
      )}

      <div className="med-filter">
        <input
          className="med-filter__search"
          type="text"
          placeholder={t('medication.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="med-filter__select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">{t('medication.allStatuses')}</option>
          {Object.keys(SCHED_STATUS_KEYS).map((k) => (
            <option key={k} value={k}>{t(`medication.${SCHED_STATUS_KEYS[k]}`)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="med-empty">{t('medication.loading')}</p>
      ) : (
        <div className="med-table-wrap">
          <table className="med-table">
            <thead>
              <tr>
                <th>{t('medication.colTime')}</th>
                <th>{t('medication.colResident')}</th>
                <th>{t('medication.colMedication')}</th>
                <th>{t('medication.colDosage')}</th>
                <th>{t('medication.colStatus')}</th>
                <th>{t('medication.colActualTime')}</th>
                <th>{t('medication.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="med-empty">{t('medication.noDataForDate')}</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s._id}>
                    <td><span className="med-time">{fmtTime(s.scheduledTime)}</span></td>
                    <td>
                      <div className="med-resident__name">{s._resident?.fullName}</div>
                      <div className="med-resident__code">{s._resident?.residentCode}</div>
                    </td>
                    <td className="med-drug__name">{s.medicationName}</td>
                    <td>{s.dosage}</td>
                    <td>
                      <StatusBadge status={s.status} type="sched" />
                      {s.status === 'MISSED' && s.reason && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          ({t(`medication.reason${s.reason.charAt(0).toUpperCase() + s.reason.slice(1)}`)})
                        </div>
                      )}
                    </td>
                    <td>
                      {s.actualTimeTaken
                        ? `${t('medication.atTime')} ${fmtTime(s.actualTimeTaken)}`
                        : '—'}
                    </td>
                    <td>
                      {(s.status === 'PENDING' || s.status === 'OVERDUE') && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="med-action-btn med-action-btn--taken"
                            onClick={() => setMarkModal({ schedule: s, action: 'taken' })}
                          >
                            ✓ {t('medication.schedTaken')}
                          </button>
                          <button
                            className="med-action-btn med-action-btn--missed"
                            onClick={() => setMarkModal({ schedule: s, action: 'missed' })}
                          >
                            ✕ {t('medication.schedMissed')}
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

      {markModal && (
        <MarkModal
          schedule={markModal.schedule}
          action={markModal.action}
          onConfirm={handleConfirm}
          onClose={() => setMarkModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   Tab 2 — Prescriptions (read-only reference)
   ════════════════════════════════════════ */
function PrescriptionsTab() {
  const { t } = useTranslation();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [expanded, setExpanded] = useState(new Set());

  const load = useCallback(() => {
    setLoading(true);
    medicationService
      .listPrescriptions({ limit: 100 })
      .then((res) => {
        const arr = Array.isArray(res) ? res : (res?.data || []);
        setPrescriptions(arr);
      })
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return prescriptions.filter((p) => {
      const matchSearch =
        !q ||
        (p.residentId?.fullName || '').toLowerCase().includes(q) ||
        (p.diagnosisNote || '').toLowerCase().includes(q) ||
        (p.items || []).some((it) => (it.medicationName || '').toLowerCase().includes(q));
      const matchStatus = !statusFilter || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [prescriptions, search, statusFilter]);

  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="med-tab-content">
      <div className="med-filter">
        <input
          className="med-filter__search"
          type="text"
          placeholder={t('medication.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="med-filter__select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">{t('medication.allStatuses')}</option>
          {Object.keys(RX_STATUS_KEYS).map((k) => (
            <option key={k} value={k}>{t(`medication.${RX_STATUS_KEYS[k]}`)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="med-empty">{t('medication.loading')}</p>
      ) : (
        <div className="med-table-wrap">
          <table className="med-table">
            <thead>
              <tr>
                <th>{t('medication.colResident')}</th>
                <th>{t('medication.colDiagnosis')}</th>
                <th>{t('medication.colValidUntil')}</th>
                <th>{t('medication.colMedications')}</th>
                <th>{t('medication.colPrescribedBy')}</th>
                <th>{t('medication.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="med-empty">{t('medication.noData')}</td></tr>
              ) : (
                filtered.map((p) => {
                  const isOpen = expanded.has(p._id);
                  return (
                    <>
                      <tr key={p._id} style={{ cursor: 'pointer' }} onClick={() => toggleExpand(p._id)}>
                        <td>
                          <div className="med-resident__name">{p.residentId?.fullName}</div>
                          <div className="med-resident__code">{p.residentId?.residentCode}</div>
                        </td>
                        <td style={{ maxWidth: 200, fontSize: 13 }}>{p.diagnosisNote}</td>
                        <td>{fmtDate(p.validUntil)}</td>
                        <td>
                          {(p.items || []).length} {t('medication.items')} {isOpen ? '▲' : '▼'}
                        </td>
                        <td>{p.prescribedByStaffId?.userId?.fullName || '—'}</td>
                        <td><StatusBadge status={p.status} type="rx" /></td>
                      </tr>
                      {isOpen && (p.items || []).length > 0 && (
                        <tr key={`${p._id}-items`}>
                          <td colSpan={6} style={{ padding: 0, background: '#f8fafc' }}>
                            <div style={{ padding: '8px 16px' }}>
                              <table className="med-table" style={{ margin: 0 }}>
                                <thead>
                                  <tr>
                                    <th>{t('medication.medicationName')}</th>
                                    <th>{t('medication.dosage')}</th>
                                    <th>{t('medication.unit')}</th>
                                    <th>{t('medication.frequencyLabel')}</th>
                                    <th>{t('medication.times')}</th>
                                    <th>{t('medication.startDate')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.items.map((it) => (
                                    <tr key={it._id}>
                                      <td className="med-drug__name">{it.medicationName}</td>
                                      <td>{it.dosage}</td>
                                      <td>{it.unit || '—'}</td>
                                      <td>{it.frequency}</td>
                                      <td>
                                        {(it.times || []).map((tm) => (
                                          <span key={tm} className="med-time-chip" style={{ marginRight: 4 }}>{tm}</span>
                                        ))}
                                      </td>
                                      <td>{it.startDate ? fmtDate(it.startDate) : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   Root — NurseMedicationPage
   ════════════════════════════════════════ */
function NurseMedicationPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('schedule');

  return (
    <div className="med-page">
      <div className="med-page__header">
        <h1 className="med-page__title">{t('medication.pageTitle')}</h1>
      </div>

      <div className="med-tabs">
        <button
          className={`med-tab ${activeTab === 'schedule' ? 'med-tab--active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          {t('medication.tabDailySchedule')}
        </button>
        <button
          className={`med-tab ${activeTab === 'prescriptions' ? 'med-tab--active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
        >
          {t('medication.tabPrescriptions')}
        </button>
      </div>

      {activeTab === 'schedule' ? <ScheduleTab /> : <PrescriptionsTab />}
    </div>
  );
}

export default NurseMedicationPage;
