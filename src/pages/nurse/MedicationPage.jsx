import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import medicationService from '../../services/medication.service';
import '../../styles/medications/MedicationPage.css';

/* -- helpers -- */
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

const STAT_ICONS = {
  PENDING: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  TAKEN: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  MISSED: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  OVERDUE: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
};

/* -- StatusBadge -- */
function StatusBadge({ status, type }) {
  const { t } = useTranslation();
  const keyMap = type === 'sched' ? SCHED_STATUS_KEYS : RX_STATUS_KEYS;
  const label = keyMap[status] ? t(`medication.${keyMap[status]}`) : status;
  return (
    <span className={`med-badge med-badge--${status.toLowerCase()}`}>{label}</span>
  );
}

/* -- Drawer Modal (slides from right for forms) -- */
function DrawerModal({ title, onClose, children, footer }) {
  return (
    <div className="med-drawer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="med-drawer">
        <div className="med-drawer__header">
          <h2 className="med-drawer__title">{title}</h2>
          <button className="med-drawer__close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="med-drawer__body">{children}</div>
        {footer && <div className="med-drawer__footer">{footer}</div>}
      </div>
    </div>
  );
}

/* -- Center Modal (for confirmations) -- */
function Modal({ title, onClose, children, footer, size }) {
  return (
    <div className="med-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`med-modal ${size === 'lg' ? 'med-modal--lg' : ''}`}>
        <div className="med-modal__header">
          <h2 className="med-modal__title">{title}</h2>
          <button className="med-modal__close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="med-modal__body">{children}</div>
        {footer && <div className="med-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

/* -- Mark Modal (taken or missed) -- */
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
      <div className="med-confirm-info">
        <div className="med-confirm-info__row">
          <span className="med-confirm-info__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          <div className="med-confirm-info__content">
            <span className="med-confirm-info__label">{t('medication.colResident')}</span>
            <span className="med-confirm-info__value">{resident.fullName} ({resident.residentCode})</span>
          </div>
        </div>
        <div className="med-confirm-info__row">
          <span className="med-confirm-info__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </span>
          <div className="med-confirm-info__content">
            <span className="med-confirm-info__label">{t('medication.colMedication')}</span>
            <span className="med-confirm-info__value">{schedule.medicationName} — {schedule.dosage}</span>
          </div>
        </div>
        <div className="med-confirm-info__row">
          <span className="med-confirm-info__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </span>
          <div className="med-confirm-info__content">
            <span className="med-confirm-info__label">{t('medication.colTime')}</span>
            <span className="med-confirm-info__value">{fmtTime(schedule.scheduledTime)}</span>
          </div>
        </div>
      </div>

      {isMissed && (
        <div className="med-form-group">
          <label className="med-form-label">
            {t('medication.missedReasonLabel')} <span className="med-form-required-star">*</span>
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

/* ================================================================
   Tab 1 -- Daily Schedule
   ================================================================ */
function ScheduleTab() {
  const { t } = useTranslation();
  const [date, setDate] = useState(new Date());
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [markModal, setMarkModal] = useState(null);
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
      {/* Date navigation */}
      <div className="med-date-nav">
        <button className="med-date-nav__btn" onClick={() => shiftDate(-1)} aria-label="Previous day">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="med-date-nav__center">
          <svg className="med-date-nav__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="med-date-nav__label">{fmtDayLabel(date)}</span>
        </div>
        <button className="med-date-nav__btn" onClick={() => shiftDate(1)} aria-label="Next day">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Stats grid */}
      <div className="med-stats">
        {[
          ['PENDING', 'schedPending'],
          ['TAKEN', 'schedTaken'],
          ['MISSED', 'schedMissed'],
          ['OVERDUE', 'schedOverdue'],
        ].map(([k, labelKey], idx) => (
          <div key={k} className={`med-stat-card med-stat-card--${k.toLowerCase()}`} style={{ animationDelay: `${idx * 0.07}s` }}>
            <div className="med-stat-card__icon-box">
              {STAT_ICONS[k]}
            </div>
            <div className="med-stat-card__info">
              <div className="med-stat-card__value">{counts[k]}</div>
              <div className="med-stat-card__label">{t(`medication.${labelKey}`)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdueRows.length > 0 && (
        <div className="med-alert">
          <div className="med-alert__icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div className="med-alert__content">
            <strong>{t('medication.overdueAlert_other', { count: overdueRows.length })}</strong>
            <span className="med-alert__detail">
              {overdueRows
                .map((s) => `${s._resident?.fullName} — ${s.medicationName} (${fmtTime(s.scheduledTime)})`)
                .join(' | ')}
            </span>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="med-filter-bar">
        <div className="med-filter-bar__search-wrap">
          <svg className="med-filter-bar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="med-filter-bar__search"
            type="text"
            placeholder={t('medication.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="med-filter-bar__pills">
          <button
            className={`med-pill ${!statusFilter ? 'med-pill--active' : ''}`}
            onClick={() => setStatusFilter('')}
          >
            {t('medication.allStatuses')}
          </button>
          {Object.keys(SCHED_STATUS_KEYS).map((k) => (
            <button
              key={k}
              className={`med-pill med-pill--${k.toLowerCase()} ${statusFilter === k ? 'med-pill--active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === k ? '' : k)}
            >
              {t(`medication.${SCHED_STATUS_KEYS[k]}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="med-loading">
          <div className="med-loading__spinner" />
          <span>{t('medication.loading')}</span>
        </div>
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
                <tr>
                  <td colSpan={7}>
                    <div className="med-empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span>{t('medication.noDataForDate')}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s, idx) => (
                  <tr key={s._id} className="med-table__row-animated" style={{ animationDelay: `${idx * 0.03}s` }}>
                    <td>
                      <span className="med-time-badge">{fmtTime(s.scheduledTime)}</span>
                    </td>
                    <td>
                      <div className="med-resident-cell">
                        <div className="med-resident-cell__name">{s._resident?.fullName}</div>
                        <div className="med-resident-cell__code">{s._resident?.residentCode}</div>
                      </div>
                    </td>
                    <td><span className="med-drug-name">{s.medicationName}</span></td>
                    <td><span className="med-dosage">{s.dosage}</span></td>
                    <td>
                      <StatusBadge status={s.status} type="sched" />
                      {s.status === 'MISSED' && s.reason && (
                        <div className="med-reason-note">
                          ({t(`medication.reason${s.reason.charAt(0).toUpperCase() + s.reason.slice(1)}`)})
                        </div>
                      )}
                    </td>
                    <td>
                      {s.actualTimeTaken
                        ? <span className="med-actual-time">{t('medication.atTime')} {fmtTime(s.actualTimeTaken)}</span>
                        : <span className="med-no-data">—</span>}
                    </td>
                    <td>
                      {(s.status === 'PENDING' || s.status === 'OVERDUE') && (
                        <div className="med-action-group">
                          <button
                            className="med-action-btn med-action-btn--taken"
                            onClick={() => setMarkModal({ schedule: s, action: 'taken' })}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            {t('medication.schedTaken')}
                          </button>
                          <button
                            className="med-action-btn med-action-btn--missed"
                            onClick={() => setMarkModal({ schedule: s, action: 'missed' })}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            {t('medication.schedMissed')}
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

/* ================================================================
   Tab 2 -- Prescriptions (read-only reference)
   ================================================================ */
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
      {/* Filter bar */}
      <div className="med-filter-bar">
        <div className="med-filter-bar__search-wrap">
          <svg className="med-filter-bar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="med-filter-bar__search"
            type="text"
            placeholder={t('medication.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="med-filter-bar__select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">{t('medication.allStatuses')}</option>
          {Object.keys(RX_STATUS_KEYS).map((k) => (
            <option key={k} value={k}>{t(`medication.${RX_STATUS_KEYS[k]}`)}</option>
          ))}
        </select>
      </div>

      {/* Prescription cards */}
      {loading ? (
        <div className="med-loading">
          <div className="med-loading__spinner" />
          <span>{t('medication.loading')}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="med-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
          <span>{t('medication.noData')}</span>
        </div>
      ) : (
        <div className="med-rx-list">
          {filtered.map((p, idx) => {
            const isOpen = expanded.has(p._id);
            return (
              <div
                key={p._id}
                className={`med-rx-card ${isOpen ? 'med-rx-card--expanded' : ''}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="med-rx-card__header" onClick={() => toggleExpand(p._id)}>
                  <div className="med-rx-card__main">
                    <div className="med-rx-card__resident">
                      <div className="med-resident-cell__name">{p.residentId?.fullName}</div>
                      <div className="med-resident-cell__code">{p.residentId?.residentCode}</div>
                    </div>
                    <div className="med-rx-card__meta">
                      <div className="med-rx-card__meta-item">
                        <span className="med-rx-card__meta-label">{t('medication.colDiagnosis')}</span>
                        <span className="med-rx-card__meta-value">{p.diagnosisNote || '—'}</span>
                      </div>
                      <div className="med-rx-card__meta-item">
                        <span className="med-rx-card__meta-label">{t('medication.colValidUntil')}</span>
                        <span className="med-rx-card__meta-value">{fmtDate(p.validUntil)}</span>
                      </div>
                      <div className="med-rx-card__meta-item">
                        <span className="med-rx-card__meta-label">{t('medication.colPrescribedBy')}</span>
                        <span className="med-rx-card__meta-value">{p.prescribedByStaffId?.userId?.fullName || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="med-rx-card__right">
                    <StatusBadge status={p.status} type="rx" />
                    <div className="med-rx-card__items-count">
                      {(p.items || []).length} {t('medication.items')}
                    </div>
                    <span className={`med-rx-card__chevron ${isOpen ? 'med-rx-card__chevron--open' : ''}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </span>
                  </div>
                </div>

                {isOpen && (p.items || []).length > 0 && (
                  <div className="med-rx-card__detail">
                    <table className="med-table med-table--nested">
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
                            <td><span className="med-drug-name">{it.medicationName}</span></td>
                            <td>{it.dosage}</td>
                            <td>{it.unit || '—'}</td>
                            <td>{it.frequency}</td>
                            <td>
                              <div className="med-time-chips">
                                {(it.times || []).map((tm) => (
                                  <span key={tm} className="med-time-chip">{tm}</span>
                                ))}
                              </div>
                            </td>
                            <td>{it.startDate ? fmtDate(it.startDate) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Root -- NurseMedicationPage
   ================================================================ */
function NurseMedicationPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('schedule');

  return (
    <div className="med-page">
      <div className="med-page__header">
        <div className="med-page__title-group">
          <h1 className="med-page__title">{t('medication.pageTitle')}</h1>
          <p className="med-page__subtitle">{t('medication.tabDailySchedule')} & {t('medication.tabPrescriptions')}</p>
        </div>
      </div>

      <div className="med-tabs">
        <button
          className={`med-tab ${activeTab === 'schedule' ? 'med-tab--active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {t('medication.tabDailySchedule')}
        </button>
        <button
          className={`med-tab ${activeTab === 'prescriptions' ? 'med-tab--active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          {t('medication.tabPrescriptions')}
        </button>
      </div>

      {activeTab === 'schedule' ? <ScheduleTab /> : <PrescriptionsTab />}
    </div>
  );
}

export default NurseMedicationPage;
