import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import medicationService from '../../services/medication.service';
import residentService from '../../services/resident.service';
import { useAuth } from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import '../../styles/medications/MedicationPage.css';

/* ── helpers ── */
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDayLabel = (d) =>
  new Date(d).toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  });

const localDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const todayStr = () => localDateStr(new Date());
const maxValidUntil = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return localDateStr(d);
};

// startDate ("YYYY-MM-DD") + duration (days) -> endDate ("YYYY-MM-DD").
// Matches the backend's own endDate = startDate + duration validation exactly.
const addDaysStr = (dateStr, days) => {
  if (!dateStr || !days) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + Number(days));
  return localDateStr(d);
};

const AVATAR_COLORS = ['#0f766e', '#e64980', '#0ca678', '#f76707', '#7048e8', '#1098ad', '#d6336c', '#5c7cfa'];
const getAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
};
const MISSED_REASONS = ['refused', 'asleep', 'vomiting', 'hospitalized', 'other'];

// Live (as-you-type) dosage validation — mirrors the backend's specific messages.
const getDosageError = (dosage, t) => {
  if (dosage === '' || dosage === null || dosage === undefined) return null;
  const n = Number(dosage);
  if (Number.isNaN(n)) return t('medication.dosageNotNumber');
  if (n < 0) return t('medication.dosageNegative');
  if (n === 0) return t('medication.dosageZero');
  return null;
};

/* statuses uppercase from BE */
const RX_STATUS_KEYS = {
  DRAFT: 'statusDraft', ACTIVE: 'statusActive', SUSPENDED: 'statusSuspended',
  COMPLETED: 'statusCompleted', CANCELLED: 'statusCancelled', EXPIRED: 'statusExpired',
};
const MANUAL_RX_STATUS_KEYS = { ACTIVE: 'statusActive', CANCELLED: 'statusCancelled' };
const SCHED_STATUS_KEYS = {
  PENDING: 'schedPending', TAKEN: 'schedTaken', LATE_TAKEN: 'schedLateTaken',
  MISSED: 'schedMissed', SKIPPED: 'schedSkipped', OVERDUE: 'schedOverdue',
  REFUSED: 'schedRefused', HELD: 'schedHeld', NOT_AVAILABLE: 'schedNotAvailable',
  DISCONTINUED: 'schedDiscontinued',
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

// Whole calendar days between today and validUntil (can be negative if already past).
const daysUntil = (validUntil) => {
  if (!validUntil) return null;
  const today = new Date(`${todayStr()}T00:00:00`);
  const end = new Date(`${localDateStr(new Date(validUntil))}T00:00:00`);
  return Math.round((end - today) / (24 * 60 * 60 * 1000));
};

// For an ACTIVE prescription, show remaining days instead of a static "in use" label —
// COMPLETED/CANCELLED still fall back to the plain StatusBadge.
function RxStatusCell({ prescription }) {
  const { t } = useTranslation();
  const discontinuedCount = (prescription.items || []).filter((it) => it.isActive === false).length;

  if (prescription.status === 'DRAFT') {
    return <span className="med-badge med-badge--draft">{t('medication.statusDraft')}</span>;
  }
  if (prescription.status === 'SUSPENDED') {
    return <span className="med-badge med-badge--suspended">{t('medication.statusSuspended')}</span>;
  }
  if (prescription.status === 'EXPIRED') {
    return <span className="med-badge med-badge--expired">{t('medication.statusExpired')}</span>;
  }
  if (prescription.status !== 'ACTIVE') {
    return <StatusBadge status={prescription.status} type="rx" />;
  }
  if (discontinuedCount > 0) {
    return (
      <span className="med-badge med-badge--stopped">
        {t('medication.discontinuedLabel')}
        {discontinuedCount > 1 ? ` (${discontinuedCount})` : ''}
      </span>
    );
  }

  const days = daysUntil(prescription.validUntil);
  if (days === null) return <StatusBadge status="ACTIVE" type="rx" />;
  if (days < 0) return <span className="med-badge med-badge--missed">{t('medication.rxExpired')}</span>;
  if (days === 0) return <span className="med-badge med-badge--overdue">{t('medication.rxExpiresToday')}</span>;
  const urgent = days <= 7;
  return (
    <span className={`med-badge ${urgent ? 'med-badge--overdue' : 'med-badge--active'}`}>
      {t('medication.rxDaysLeft', { count: days })}
    </span>
  );
}

/* ── Modal wrapper ── */
function Modal({ title, onClose, children, footer, size }) {
  return (
    <div className="med-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`med-modal ${size === 'lg' ? 'med-modal--lg' : ''} ${size === 'xl' ? 'med-modal--xl' : ''}`}>
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

/* ── Health Warning Panel — fetch đầy đủ hồ sơ sức khỏe khi chọn cư dân ── */
function HealthWarningPanel({ residentId }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!residentId) { setProfile(null); return; }
    setLoading(true);
    setProfile(null);
    residentService
      .getResidentDetail(residentId)
      .then((res) => setProfile(res?.resident ?? null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [residentId]);

  if (!residentId) return null;

  if (loading) {
    return (
      <div className="med-health-panel med-health-panel--loading">
        <span className="med-health-panel__spinner" />
        {t('medication.healthDataLoading')}
      </div>
    );
  }

  if (!profile) return null;

  const allergies = profile.drugAllergies || profile.allergies || [];
  const chronic = profile.chronicConditions || [];
  const history = profile.medicalHistory || [];
  const initHealth = profile.initialHealthCondition || '';
  const bloodType = profile.bloodType || '';
  const hasAny = allergies.length || chronic.length || history.length || initHealth || bloodType;

  if (!hasAny) {
    return (
      <div className="med-health-panel med-health-panel--empty">
        <span>✓</span> {t('medication.noHealthWarnings')}
      </div>
    );
  }

  return (
    <div className="med-health-panel">
      <div className="med-health-panel__title">{t('medication.healthProfile')}</div>

      {/* Dị ứng — đỏ, ưu tiên cao nhất */}
      {allergies.length > 0 && (
        <div className="med-health-section med-health-section--danger">
          <div className="med-health-section__head">
            <span className="med-health-section__icon">⛔</span>
            <span className="med-health-section__label">{t('medication.drugAllergyWarning')}</span>
          </div>
          <div className="med-health-section__tags">
            {allergies.map((a) => (
              <span key={a} className="med-health-tag med-health-tag--danger">{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Bệnh nền mãn tính — cam, cần kiểm tra khi kê đơn */}
      {chronic.length > 0 && (
        <div className="med-health-section med-health-section--warning">
          <div className="med-health-section__head">
            <span className="med-health-section__icon">⚠️</span>
            <span className="med-health-section__label">{t('medication.chronicConditionWarning')}</span>
          </div>
          <div className="med-health-section__tags">
            {chronic.map((c) => (
              <span key={c} className="med-health-tag med-health-tag--warning">{c}</span>
            ))}
          </div>
          <p className="med-health-section__note">{t('medication.chronicWarningNote')}</p>
        </div>
      )}

      {/* Tiền sử bệnh — xanh dương */}
      {history.length > 0 && (
        <div className="med-health-section med-health-section--info">
          <div className="med-health-section__head">
            <span className="med-health-section__icon">📋</span>
            <span className="med-health-section__label">{t('medication.medicalHistoryLabel')}</span>
          </div>
          <div className="med-health-section__tags">
            {history.map((h) => (
              <span key={h} className="med-health-tag med-health-tag--info">{h}</span>
            ))}
          </div>
        </div>
      )}

      {/* Sức khỏe ban đầu + Nhóm máu */}
      {(initHealth || bloodType) && (
        <div className="med-health-section med-health-section--neutral">
          <div className="med-health-section__head">
            <span className="med-health-section__icon">🏥</span>
            <span className="med-health-section__label">{t('medication.initialHealthLabel')}</span>
            {bloodType && (
              <span className="med-health-tag med-health-tag--neutral" style={{ marginLeft: 8 }}>
                {t('medication.bloodTypeLabel')}: {bloodType}
              </span>
            )}
          </div>
          {initHealth && (
            <p className="med-health-section__text">{initHealth}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Medication Autocomplete ── */
function MedicationAutocomplete({ value, onSelect, placeholder, excludeIds = [] }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync khi value thay đổi từ bên ngoài
  useEffect(() => { setQuery(value || ''); }, [value]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const search = (val) => {
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(() => {
      setFetching(true);
      medicationService
        .listAvailableMedications({ search: val.trim(), limit: 50 })
        .then((res) => {
          const arr = Array.isArray(res) ? res : (res?.data || res?.medications || []);
          // BE searches name+code+manufacturer (substring), nên filter client-side
          // chỉ giữ thuốc có NAME bắt đầu bằng query (prefix match)
          const q = val.trim().toLowerCase();
          const filtered = arr.filter((m) =>
            (m.name || '').toLowerCase().startsWith(q) && !excludeIds.includes(m._id)
          ).slice(0, 10);
          setResults(filtered);
          setOpen(filtered.length > 0);
        })
        .catch(() => { setResults([]); setOpen(false); })
        .finally(() => setFetching(false));
    }, 280);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onSelect({ name: val, med: null }); // cập nhật text ngay, chưa chọn từ dropdown
    search(val);
  };

  const handlePick = (med) => {
    setQuery(med.name);
    setOpen(false);
    setResults([]);
    onSelect({ name: med.name, med });
  };

  return (
    <div ref={containerRef} className="med-autocomplete">
      <div className="med-autocomplete__wrap">
        <input
          className="med-form-input"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {fetching && <span className="med-autocomplete__spin" />}
      </div>
      {open && results.length > 0 && (
        <ul className="med-autocomplete__list">
          {results.map((med) => (
            <li
              key={med._id}
              className="med-autocomplete__item"
              onMouseDown={(e) => { e.preventDefault(); handlePick(med); }}
            >
              <span className="med-autocomplete__name">{med.name}</span>
              {(med.medicationCode || med.form || med.strength) && (
                <span className="med-autocomplete__meta">
                  {[med.medicationCode, med.form, med.strength].filter(Boolean).join(' · ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Empty time slots based on frequency ── */
function buildTimesForFrequency(freq) {
  const defaults = ['08:00', '12:00', '18:00', '22:00'];
  return defaults.slice(0, freq);
}

/* ── Single prescription item form card ── */
function ItemRow({ item, idx, onChange, onRemove, t, canRemove, errors = {}, excludeIds = [], isDuplicate = false }) {
  const dosageError = getDosageError(item.dosage, t);

  const handleFrequencyChange = (e) => {
    const f = parseInt(e.target.value, 10);
    const times = buildTimesForFrequency(f);
    onChange(idx, { ...item, frequency: f, times });
  };

  const handleTimeChange = (tIdx, val) => {
    const times = [...item.times];
    times[tIdx] = val;
    onChange(idx, { ...item, times });
  };

  const FREQ_LABELS = {
    1: t('medication.freqOnce'),
    2: t('medication.freqTwice'),
    3: t('medication.freqThrice'),
    4: t('medication.freqFour'),
  };

  return (
    <div className="cpf-med-card">
      <div className="cpf-med-card__header">
        <span className="cpf-med-card__num">{idx + 1}</span>
        <span className="cpf-med-card__title">{item.medicationName || t('medication.itemNumber', { n: idx + 1 })}</span>
        {canRemove && (
          <button type="button" className="cpf-med-card__remove" onClick={() => onRemove(idx)} title={t('medication.removeMedication')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="cpf-med-card__body">
        <div className="cpf-row-3">
          <div className="cpf-field" style={{ gridColumn: '1 / 3' }}>
            <label className="cpf-label">{t('medication.medicationName')}</label>
            <MedicationAutocomplete
              value={item.medicationName}
              placeholder={t('medication.medicationNamePlaceholder')}
              excludeIds={excludeIds}
              onSelect={({ name, med }) => {
                const updates = { ...item, medicationName: name };
                if (med) {
                  updates.medicationId = med._id;
                  // Unit always tracks the selected medication — never user-editable.
                  updates.unit = med.unit || '';
                } else {
                  updates.medicationId = '';
                  updates.unit = '';
                }
                onChange(idx, updates);
              }}
            />
            {(errors[`item_${idx}_name`] || isDuplicate) && (
              <span className="cpf-error">{errors[`item_${idx}_name`] || t('medication.duplicateMedication')}</span>
            )}
          </div>
          <div className="cpf-field">
            <label className="cpf-label">{t('medication.dosage')}</label>
            <input
              type="number"
              className={`cpf-input${dosageError ? ' cpf-input--err' : ''}`}
              value={item.dosage}
              onChange={(e) => onChange(idx, { ...item, dosage: e.target.value })}
              placeholder={t('medication.dosagePlaceholder')}
              min="0"
            />
            {dosageError && <span className="cpf-error">{dosageError}</span>}
          </div>
        </div>

        <div className="cpf-row-3">
          <div className="cpf-field">
            <label className="cpf-label">{t('medication.unit')}</label>
            <input
              className="cpf-input edit-input--readonly"
              value={item.unit}
              readOnly
              placeholder={t('medication.unitPlaceholder')}
            />
            <small className="cpf-hint">{t('medication.unitAutoHint')}</small>
          </div>
          <div className="cpf-field">
            <label className="cpf-label">{t('medication.frequencyLabel')}</label>
            <select className="cpf-input" value={item.frequency} onChange={handleFrequencyChange}>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{FREQ_LABELS[n] || `${n}×`}</option>)}
            </select>
          </div>
          <div className="cpf-field">
            <label className="cpf-label">{t('medication.duration')}</label>
            <input
              type="number"
              className={`cpf-input${errors[`item_${idx}_duration`] ? ' cpf-input--err' : ''}`}
              value={item.duration}
              onChange={(e) => onChange(idx, { ...item, duration: e.target.value })}
              min="1"
              placeholder="7"
            />
            <small className="cpf-hint">{t('medication.durationAutoScheduleHint')}</small>
            {errors[`item_${idx}_duration`] && <span className="cpf-error">{errors[`item_${idx}_duration`]}</span>}
          </div>
        </div>

        <div className="cpf-field">
          <label className="cpf-label">{t('medication.instructions')}</label>
          <input
            className="cpf-input"
            value={item.instructions || ''}
            onChange={(e) => onChange(idx, { ...item, instructions: e.target.value })}
            placeholder={t('medication.instructionsPlaceholder')}
          />
        </div>

        {/* PRN Toggle */}
        <div className="cpf-prn-row">
          <label className="cpf-prn-toggle">
            <input
              type="checkbox"
              checked={!!item.isPRN}
              onChange={(e) => onChange(idx, { ...item, isPRN: e.target.checked })}
            />
            <span className="cpf-prn-toggle__label">{t('medication.prnLabel')}</span>
            <span className="cpf-prn-toggle__desc">{t('medication.prnDesc')}</span>
          </label>
          {item.isPRN && (
            <div className="cpf-row-2" style={{ marginTop: 8 }}>
              <div className="cpf-field">
                <label className="cpf-label">{t('medication.prnReason')}</label>
                <input
                  className="cpf-input"
                  value={item.prnReason || ''}
                  onChange={(e) => onChange(idx, { ...item, prnReason: e.target.value })}
                  placeholder={t('medication.prnReasonPlaceholder')}
                />
                {errors[`item_${idx}_prnReason`] && <span className="cpf-error">{errors[`item_${idx}_prnReason`]}</span>}
              </div>
              <div className="cpf-field">
                <label className="cpf-label">{t('medication.maxDailyDoses')}</label>
                <input
                  type="number"
                  className="cpf-input"
                  value={item.maxDailyDoses || ''}
                  onChange={(e) => onChange(idx, { ...item, maxDailyDoses: e.target.value })}
                  min="1"
                  max="12"
                  placeholder="4"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Resident Info Card (shown after selecting resident) ── */
function ResidentInfoCard({ resident, t }) {
  if (!resident) return null;
  return (
    <div className="cpf-resident-card">
      <div className="cpf-resident-card__avatar" style={{ background: getAvatarColor(resident.fullName) }}>
        {getInitials(resident.fullName)}
      </div>
      <div className="cpf-resident-card__info">
        <div className="cpf-resident-card__name">{resident.fullName}</div>
        <div className="cpf-resident-card__meta">
          {resident.residentCode && <span>{resident.residentCode}</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Create Prescription Modal ── */
function CreatePrescriptionModal({ residents, onSave, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    residentId: '',
    diagnosisNote: '',
    validUntil: '',
    items: [{ medicationId: '', medicationName: '', dosage: '', unit: '', frequency: 1, times: ['08:00'], route: 'oral', duration: '', startDate: todayStr(), isPRN: false, prnReason: '', maxDailyDoses: '' }],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const selectedResident = residents.find((r) => r._id === form.residentId);

  // Live (as-you-type) duplicate detection — medicationIds used by more than one item.
  const duplicateMedicationIds = useMemo(() => {
    const counts = new Map();
    form.items.forEach((it) => {
      if (!it.medicationId) return;
      counts.set(it.medicationId, (counts.get(it.medicationId) || 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id));
  }, [form.items]);

  const validate = () => {
    const errs = {};
    if (!form.residentId) errs.residentId = t('medication.resident');
    if (!form.diagnosisNote || form.diagnosisNote.trim().length < 10)
      errs.diagnosisNote = t('medication.diagnosisNoteHint');
    const today = todayStr();
    if (!form.validUntil) errs.validUntil = t('medication.validUntil');
    else if (form.validUntil < today) errs.validUntil = t('medication.validUntilPast');
    else if (form.validUntil > maxValidUntil()) errs.validUntil = t('medication.validUntilTooFar');

    const seenMedicationIds = new Set();

    form.items.forEach((item, i) => {
      if (!item.medicationName.trim()) errs[`item_${i}_name`] = t('medication.medicationName');
      if (!item.medicationId) errs[`item_${i}_name`] = t('medication.selectFromList');

      if (item.medicationId) {
        if (seenMedicationIds.has(item.medicationId)) {
          errs[`item_${i}_duplicate`] = t('medication.duplicateMedication');
        }
        seenMedicationIds.add(item.medicationId);
      }

      if (item.dosage === '' || item.dosage === null || item.dosage === undefined) {
        errs[`item_${i}_dosage`] = t('medication.dosageRequired');
      } else {
        const dosageNum = Number(item.dosage);
        if (Number.isNaN(dosageNum)) errs[`item_${i}_dosage`] = t('medication.dosageNotNumber');
        else if (dosageNum < 0) errs[`item_${i}_dosage`] = t('medication.dosageNegative');
        else if (dosageNum === 0) errs[`item_${i}_dosage`] = t('medication.dosageZero');
      }

      // PRN items don't need schedule fields
      if (item.isPRN) {
        if (!item.prnReason && !item.instructions) {
          errs[`item_${i}_prnReason`] = t('medication.prnReasonRequired');
        }
        return;
      }

      if (!item.startDate) errs[`item_${i}_startDate`] = t('medication.startDateRequired');
      else if (item.startDate < today) errs[`item_${i}_startDate`] = t('medication.startDatePast');
      else if (form.validUntil && item.startDate > form.validUntil) errs[`item_${i}_startDate`] = t('medication.startDateAfterValidUntil');

      if (item.duration === '' || item.duration === null || item.duration === undefined) {
        errs[`item_${i}_duration`] = t('medication.durationRequired');
      } else {
        const durationValue = Number(item.duration);
        if (Number.isNaN(durationValue)) {
          errs[`item_${i}_duration`] = t('medication.durationNotNumber');
        } else if (!Number.isInteger(durationValue) || durationValue < 1) {
          errs[`item_${i}_duration`] = t('medication.durationPositive');
        } else if (form.validUntil && item.startDate) {
          const endDateStr = addDaysStr(item.startDate, durationValue);
          const effectiveEnd = new Date(`${endDateStr}T00:00:00`);
          const validUntilDate = new Date(`${form.validUntil}T00:00:00`);
          if (effectiveEnd > validUntilDate) {
            errs[`item_${i}_duration`] = t('medication.durationExceedsValidUntil');
          }
        }
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleItemChange = (idx, updated) => {
    setForm((p) => {
      const items = [...p.items];
      items[idx] = updated;
      return { ...p, items };
    });
  };

  const handleAddItem = () =>
    setForm((p) => ({
      ...p,
      items: [...p.items, { medicationId: '', medicationName: '', dosage: '', unit: '', frequency: 1, times: ['08:00'], route: 'oral', duration: '', startDate: todayStr(), isPRN: false, prnReason: '', maxDailyDoses: '' }],
    }));

  const handleRemoveItem = (idx) =>
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const handleSubmit = async (saveAsDraft = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        residentId: form.residentId,
        diagnosisNote: form.diagnosisNote.trim(),
        validUntil: form.validUntil,
        saveAsDraft,
        items: form.items.map((item) => ({
          medicationId: item.medicationId,
          medicationName: item.medicationName.trim(),
          dosage: parseFloat(item.dosage),
          unit: item.unit.trim(),
          frequency: parseInt(item.frequency, 10),
          times: item.isPRN ? [] : item.times,
          route: item.route,
          duration: item.duration ? parseInt(item.duration, 10) : undefined,
          startDate: item.isPRN ? undefined : (item.startDate || undefined),
          endDate: item.isPRN ? undefined : (item.duration ? addDaysStr(item.startDate, item.duration) : undefined),
          isPRN: item.isPRN || false,
          prnReason: item.isPRN ? item.prnReason : undefined,
          maxDailyDoses: item.isPRN && item.maxDailyDoses ? parseInt(item.maxDailyDoses, 10) : undefined,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cpf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cpf-drawer">
        {/* Drawer header */}
        <div className="cpf-drawer__header">
          <div className="cpf-drawer__header-left">
            <div className="cpf-drawer__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </div>
            <div>
              <h2 className="cpf-drawer__title">{t('medication.createPrescription')}</h2>
              <p className="cpf-drawer__subtitle">{t('medication.createPrescriptionDesc')}</p>
            </div>
          </div>
          <button className="cpf-drawer__close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body — 2-column layout */}
        <div className="cpf-drawer__body">
          <div className="cpf-grid">
            {/* Left column: Resident + Diagnosis */}
            <div className="cpf-grid__left">
              <div className="cpf-section">
                <div className="cpf-section__head">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>{t('medication.sectionResident')}</span>
                </div>
                <div className="cpf-field">
                  <label className="cpf-label">{t('medication.selectResident')}</label>
                  <select
                    className={`cpf-input${errors.residentId ? ' cpf-input--err' : ''}`}
                    value={form.residentId}
                    onChange={(e) => setForm((p) => ({ ...p, residentId: e.target.value }))}
                  >
                    <option value="">{t('medication.selectResident')}</option>
                    {residents.map((r) => (
                      <option key={r._id} value={r._id}>{r.fullName} ({r.residentCode})</option>
                    ))}
                  </select>
                  {errors.residentId && <span className="cpf-error">{errors.residentId}</span>}
                </div>
                <ResidentInfoCard resident={selectedResident} t={t} />
                <HealthWarningPanel residentId={form.residentId} />
              </div>

              <div className="cpf-section">
                <div className="cpf-section__head">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>{t('medication.sectionDiagnosis')}</span>
                </div>
                <div className="cpf-field">
                  <label className="cpf-label">{t('medication.diagnosisNote')} <span className="cpf-req">*</span></label>
                  <input
                    className={`cpf-input${errors.diagnosisNote ? ' cpf-input--err' : ''}`}
                    value={form.diagnosisNote}
                    onChange={(e) => setForm((p) => ({ ...p, diagnosisNote: e.target.value }))}
                    placeholder={t('medication.diagnosisNoteHint')}
                  />
                  {errors.diagnosisNote && <span className="cpf-error">{errors.diagnosisNote}</span>}
                </div>
                <div className="cpf-row-2">
                  <div className="cpf-field">
                    <label className="cpf-label">{t('medication.validUntil')} <span className="cpf-req">*</span></label>
                    <input
                      type="date"
                      className={`cpf-input${errors.validUntil ? ' cpf-input--err' : ''}`}
                      value={form.validUntil}
                      min={todayStr()}
                      max={maxValidUntil()}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((p) => ({ ...p, validUntil: v }));
                        let err;
                        if (!v) err = t('medication.validUntil');
                        else if (v < todayStr()) err = t('medication.validUntilPast');
                        else if (v > maxValidUntil()) err = t('medication.validUntilTooFar');
                        setErrors((p) => {
                          const sd = form.items[0]?.startDate;
                          let startDateErr = p.item_0_startDate;
                          if (sd) {
                            if (sd < todayStr()) startDateErr = t('medication.startDatePast');
                            else if (v && sd > v) startDateErr = t('medication.startDateAfterValidUntil');
                            else startDateErr = undefined;
                          }
                          return { ...p, validUntil: err, item_0_startDate: startDateErr };
                        });
                      }}
                    />
                    <small className="cpf-hint">{t('medication.validUntilHint')}</small>
                    {errors.validUntil && <span className="cpf-error">{errors.validUntil}</span>}
                  </div>
                  <div className="cpf-field">
                    <label className="cpf-label">{t('medication.startDate')} <span className="cpf-req">*</span></label>
                    <input
                      type="date"
                      className={`cpf-input${errors.item_0_startDate ? ' cpf-input--err' : ''}`}
                      value={form.items[0]?.startDate || ''}
                      min={todayStr()}
                      max={form.validUntil || undefined}
                      onChange={(e) => {
                        const sd = e.target.value;
                        setForm((p) => ({ ...p, items: p.items.map((it) => ({ ...it, startDate: sd })) }));
                        let err;
                        if (!sd) err = t('medication.startDateRequired');
                        else if (sd < todayStr()) err = t('medication.startDatePast');
                        else if (form.validUntil && sd > form.validUntil) err = t('medication.startDateAfterValidUntil');
                        setErrors((p) => ({ ...p, item_0_startDate: err }));
                      }}
                    />
                    {errors.item_0_startDate && <span className="cpf-error">{errors.item_0_startDate}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Medications */}
            <div className="cpf-grid__right">
              <div className="cpf-section">
                <div className="cpf-section__head">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.5 1.5H8A6.5 6.5 0 0 0 1.5 8v0A6.5 6.5 0 0 0 8 14.5h0a6.5 6.5 0 0 0 6.5-6.5V5.5" /><path d="M14 10l5.5-5.5" /><path d="M17 1.5L22.5 7" />
                  </svg>
                  <span>{t('medication.sectionMedications')}</span>
                </div>
                <p className="cpf-section__desc">{t('medication.sectionMedicationsDesc')}</p>

                {form.items.map((item, idx) => (
                  <ItemRow
                    key={idx}
                    item={item}
                    idx={idx}
                    onChange={handleItemChange}
                    onRemove={handleRemoveItem}
                    t={t}
                    canRemove={form.items.length > 1}
                    errors={errors}
                    excludeIds={form.items.filter((_, i) => i !== idx).map((it) => it.medicationId).filter(Boolean)}
                    isDuplicate={item.medicationId && duplicateMedicationIds.has(item.medicationId)}
                  />
                ))}

                <button type="button" className="cpf-add-btn" onClick={handleAddItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {t('medication.addMedication')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer footer */}
        <div className="cpf-drawer__footer">
          <button className="cpf-btn cpf-btn--ghost" onClick={onClose} disabled={saving}>{t('medication.cancelBtn')}</button>
          <button className="cpf-btn cpf-btn--outline" onClick={() => handleSubmit(true)} disabled={saving}>
            {saving ? t('medication.loading') : t('medication.saveAsDraft')}
          </button>
          <button className="cpf-btn cpf-btn--primary" onClick={() => handleSubmit(false)} disabled={saving}>
            {saving ? t('medication.loading') : t('medication.createPrescription')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Set Schedule Modal (per prescription items) ── */
function SetScheduleModal({ prescription, onSave, onClose }) {
  const { t } = useTranslation();
  const [activeIdx, setActiveIdx] = useState(0);
  const [itemStates, setItemStates] = useState(
    (prescription.items || []).map((it) => ({
      prescriptionItemId: it._id,
      medicationName: it.medicationName,
      dosage: it.dosage,
      unit: it.unit,
      route: it.route,
      frequency: it.frequency || 1,
      startDate: it.startDate ? new Date(it.startDate).toISOString().slice(0, 10) : todayStr(),
      endDate: it.endDate ? new Date(it.endDate).toISOString().slice(0, 10) : '',
      times: it.times?.length ? [...it.times] : buildTimesForFrequency(it.frequency || 1),
      mealTiming: it.mealTiming || '',
      notes: '',
    }))
  );
  const [saving, setSaving] = useState(false);

  const current = itemStates[activeIdx];

  const handleTimeChange = (tIdx, val) => {
    setItemStates((prev) => prev.map((s, i) => {
      if (i !== activeIdx) return s;
      const times = [...s.times];
      times[tIdx] = val;
      return { ...s, times };
    }));
  };

  const handleFieldChange = (field, val) => {
    setItemStates((prev) => prev.map((s, i) => (i === activeIdx ? { ...s, [field]: val } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        prescriptionId: prescription._id,
        items: itemStates.map((s) => ({
          prescriptionItemId: s.prescriptionItemId,
          startDate: s.startDate || undefined,
          endDate: s.endDate || undefined,
          times: s.times,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  const resident = prescription.residentId;

  return (
    <div className="med-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="med-modal med-modal--lg sched-modal">
        {/* Header */}
        <div className="med-modal__header">
          <div className="sched-header">
            <div className="cpf-drawer__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <h2 className="med-modal__title">{t('medication.scheduleModalTitle')}</h2>
              <p className="sched-header__sub">{resident?.fullName} — {resident?.residentCode}</p>
            </div>
          </div>
          <button className="med-modal__close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="med-modal__body">
          {/* Medication tabs if multiple items */}
          {itemStates.length > 1 && (
            <div className="sched-med-tabs">
              {itemStates.map((s, idx) => (
                <button
                  key={s.prescriptionItemId}
                  className={`sched-med-tab ${activeIdx === idx ? 'sched-med-tab--active' : ''}`}
                  onClick={() => setActiveIdx(idx)}
                >
                  <span className="sched-med-tab__dot" />
                  {s.medicationName}
                </button>
              ))}
            </div>
          )}

          {/* Current medication info */}
          <div className="sched-drug-info">
            <div className="sched-drug-info__name">{current.medicationName}</div>
            <div className="sched-drug-info__meta">
              {current.dosage && <span>{current.dosage}{current.unit ? ` ${current.unit}` : ''}</span>}
              {current.route && <span className="med-route-badge">{t(`medication.route${current.route.charAt(0).toUpperCase() + current.route.slice(1)}`)}</span>}
              <span>{current.frequency}×/{t('medication.day')}</span>
            </div>
          </div>

          {/* Schedule Times */}
          <div className="cpf-field">
            <label className="cpf-label">{t('medication.times')}</label>
            <div className="sched-times">
              {current.times.map((tm, tIdx) => (
                <div key={tIdx} className="sched-time-slot">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <input
                    type="time"
                    className="sched-time-input"
                    value={tm}
                    onChange={(e) => handleTimeChange(tIdx, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Meal timing */}
          <div className="sched-meal-timing">
            <div className="sched-meal-timing__left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
              </svg>
              <div>
                <span className="sched-meal-timing__label">{t('medication.mealTiming')}</span>
                <span className="sched-meal-timing__desc">{t('medication.mealTimingDesc')}</span>
              </div>
            </div>
            <div className="sched-meal-btns">
              {['before_meal', 'after_meal', 'with_meal', 'empty_stomach'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`sched-meal-btn ${current.mealTiming === opt ? 'sched-meal-btn--active' : ''}`}
                  onClick={() => handleFieldChange('mealTiming', current.mealTiming === opt ? '' : opt)}
                >
                  {t(`medication.meal_${opt}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Start / End Date */}
          <div className="cpf-row-2">
            <div className="cpf-field">
              <label className="cpf-label">{t('medication.startDate')}</label>
              <input type="date" className="cpf-input" value={current.startDate}
                onChange={(e) => handleFieldChange('startDate', e.target.value)} />
            </div>
            <div className="cpf-field">
              <label className="cpf-label">{t('medication.endDate')}</label>
              <input type="date" className="cpf-input" value={current.endDate}
                onChange={(e) => handleFieldChange('endDate', e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="cpf-field">
            <label className="cpf-label">{t('medication.clinicalNotes')}</label>
            <textarea
              className="cpf-input"
              rows={3}
              value={current.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder={t('medication.clinicalNotesPlaceholder')}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="med-modal__footer">
          <button className="cpf-btn cpf-btn--ghost" onClick={onClose} disabled={saving}>{t('medication.cancelBtn')}</button>
          <button className="cpf-btn cpf-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? t('medication.loading') : t('medication.scheduleModalTitle')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── History Full-Screen (compliance stats + records table) ── */
function HistoryModal({ prescription, onClose }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [medFilter, setMedFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const residentId = prescription.residentId?._id || prescription.residentId;
    medicationService
      .getHistory({ residentId, prescriptionId: prescription._id })
      .then((res) => setData(res?.data || res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [prescription]);

  const resident = prescription.residentId;
  const prescriptionMedNames = useMemo(
    () => [...new Set((prescription.items || []).map((it) => it.medicationName).filter(Boolean))].join(', '),
    [prescription]
  );
  const summary = data?.summary || {};
  const records = data?.records || [];

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchMed = !medFilter || (r.medicationName || '').toLowerCase().includes(medFilter.toLowerCase());
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchMed && matchStatus;
    });
  }, [records, medFilter, statusFilter]);

  return (
    <div className="cpf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cpf-drawer">
        {/* Header */}
        <div className="cpf-drawer__header">
          <div className="cpf-drawer__header-left">
            <div className="cpf-drawer__icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <h2 className="cpf-drawer__title">{t('medication.historyTitle')}</h2>
              <p className="cpf-drawer__subtitle">
                {resident?.fullName} — {resident?.residentCode}
                {prescriptionMedNames && <> · {prescriptionMedNames}</>}
              </p>
            </div>
          </div>
          <button className="cpf-drawer__close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="cpf-drawer__body">
          {loading ? (
            <div className="med-loading"><div className="med-loading__spinner" /><span>{t('medication.loading')}</span></div>
          ) : !data ? (
            <div className="med-empty-state"><span>{t('medication.noData')}</span></div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="mh-bottom-stats">
                <div className="mh-stat-card mh-stat-card--compliance">
                  <div className="mh-stat-card__icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div className="mh-stat-card__content">
                    <span className="mh-stat-card__label">{t('medication.complianceRate')}</span>
                    <span className="mh-stat-card__value" style={{ color: data.lowCompliance ? '#dc2626' : '#16a34a' }}>
                      {summary.complianceRate != null ? `${summary.complianceRate.toFixed(1)}%` : '—'}
                    </span>
                    {data.lowCompliance && <span className="mh-stat-card__sub" style={{ color: '#dc2626' }}>{t('medication.lowCompliance')}</span>}
                  </div>
                </div>
                <div className="mh-stat-card">
                  <div className="mh-stat-card__icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </div>
                  <div className="mh-stat-card__content">
                    <span className="mh-stat-card__label">{t('medication.missed')}</span>
                    <span className="mh-stat-card__value">{summary.missed ?? 0}</span>
                    {summary.missed > 0 && <span className="mh-stat-card__sub" style={{ color: '#dc2626' }}>{t('medication.needsAttention')}</span>}
                  </div>
                </div>
                <div className="mh-stat-card">
                  <div className="mh-stat-card__icon" style={{ background: 'rgba(15, 118, 110, 0.12)', color: '#0f766e' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div className="mh-stat-card__content">
                    <span className="mh-stat-card__label">{t('medication.totalDoses')}</span>
                    <span className="mh-stat-card__value">{summary.total ?? 0}</span>
                    <span className="mh-stat-card__sub">{t('medication.taken')}: {(summary.taken || 0) + (summary.lateTaken || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="mh-filters">
                <div className="med-filter-bar__search-wrap" style={{ flex: 1 }}>
                  <svg className="med-filter-bar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className="med-filter-bar__search"
                    placeholder={t('medication.searchPlaceholder')}
                    value={medFilter}
                    onChange={(e) => setMedFilter(e.target.value)}
                  />
                </div>
                <select className="med-filter-bar__select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: 140 }}>
                  <option value="">{t('medication.allStatuses')}</option>
                  {Object.keys(SCHED_STATUS_KEYS).map((k) => (
                    <option key={k} value={k}>{t(`medication.${SCHED_STATUS_KEYS[k]}`)}</option>
                  ))}
                </select>
              </div>

              {/* Records table */}
              <div className="med-table-wrap">
                <table className="med-table">
                  <thead>
                    <tr>
                      <th>{t('medication.colMedication')}</th>
                      <th>{t('medication.colDosage')}</th>
                      <th>{t('medication.colTime')}</th>
                      <th>{t('medication.colActualTime')}</th>
                      <th>{t('medication.colStatus')}</th>
                      <th>{t('medication.colProvider')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6}><div className="med-empty-state"><span>{t('medication.noData')}</span></div></td></tr>
                    ) : (
                      filtered.map((r) => (
                        <tr key={r._id} className="med-table__row-animated">
                          <td>
                            <span className="med-drug-name">{r.medicationName}</span>
                            {r.route && <div className="med-resident-cell__code">{r.route}</div>}
                          </td>
                          <td>{r.dosage || '—'}</td>
                          <td><span className="med-time-badge">{fmtTime(r.scheduledTime)}</span></td>
                          <td>
                            {r.actualTimeTaken
                              ? (
                                <>
                                  <span className="med-actual-time">{fmtTime(r.actualTimeTaken)}</span>
                                  {r.administrationTiming && (
                                    <div className="med-reason-note">
                                      ({t(`medication.timing${r.administrationTiming === 'early' ? 'Early' : r.administrationTiming === 'late' ? 'Late' : 'OnTime'}`)})
                                    </div>
                                  )}
                                </>
                              )
                              : <span className="med-no-data">—</span>}
                          </td>
                          <td>
                            <StatusBadge status={r.status} type="sched" />
                            {r.missedReason && <div className="med-reason-note">({t(`medication.reason${r.missedReason.charAt(0).toUpperCase() + r.missedReason.slice(1)}`)})</div>}
                          </td>
                          <td>
                            {r.markedBy
                              ? <span className="med-dosage">{r.markedBy.fullName}</span>
                              : <span className="med-no-data">—</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Edit Prescription Modal ── */
function EditPrescriptionModal({ prescription, onSave, onClose }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const [items, setItems] = useState(
    (prescription.items || []).map((it) => ({
      _id: it._id,
      medicationId: it.medicationId?._id || it.medicationId,
      medicationName: it.medicationName || '',
      dosage: it.dosage || '',
      unit: it.unit || '',
      frequency: it.frequency || 1,
      route: it.route || 'oral',
      duration: it.duration,
      startDate: it.startDate ? it.startDate.slice(0, 10) : '',
      endDate: it.endDate ? it.endDate.slice(0, 10) : '',
      times: it.times?.length ? [...it.times] : [],
      instructions: it.instructions || '',
      isActive: it.isActive !== false,
    }))
  );
  const [saving, setSaving] = useState(false);

  const [activeIdx, setActiveIdx] = useState(0);
  const current = items[activeIdx];

  const handleChange = (field, val) => {
    setItems((prev) => prev.map((it, i) => (i === activeIdx ? { ...it, [field]: val } : it)));
  };

  const handleTimeChange = (tIdx, val) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== activeIdx) return it;
      const times = [...it.times];
      times[tIdx] = val;
      return { ...it, times };
    }));
  };

  const handleDiscontinue = () => {
    if (!isDoctor) return;
    if (!window.confirm(t('medication.discontinueConfirm', { name: current.medicationName }))) return;
    setItems((prev) => prev.map((it, i) => (i === activeIdx ? { ...it, isActive: false } : it)));
  };

  const resident = prescription.residentId;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // This modal only ever touches instructions (+ discontinue for doctors).
      // Dosage, frequency, route, and dates aren't editable here, so we must not
      // echo them back. Re-sending an item's original (often past) startDate trips
      // the backend's "startDate cannot be in the past" check on every edit.
      const payload = {
        items: items.map((it) => (
          it.isActive === false
            ? { _id: it._id, isActive: false }
            : { _id: it._id, times: it.times, instructions: it.instructions }
        )),
      };
      await onSave(prescription._id, payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="med-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="med-modal med-modal--lg sched-modal">
        <div className="med-modal__header">
          <div className="sched-header">
            <div className="cpf-drawer__icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div>
              <h2 className="med-modal__title">{t('medication.editPrescription')}</h2>
              <p className="sched-header__sub">#{prescription._id?.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button className="med-modal__close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="med-modal__body">
          {/* Resident info */}
          <div className="cpf-resident-card">
            <div className="cpf-resident-card__avatar" style={{ background: getAvatarColor(resident?.fullName) }}>
              {getInitials(resident?.fullName)}
            </div>
            <div className="cpf-resident-card__info">
              <div className="cpf-resident-card__name">{resident?.fullName}</div>
              <div className="cpf-resident-card__meta">{resident?.residentCode}</div>
            </div>
          </div>

          {/* Medication tabs */}
          {items.length > 1 && (
            <div className="sched-med-tabs">
              {items.map((it, idx) => (
                <button
                  key={it._id}
                  className={`sched-med-tab ${activeIdx === idx ? 'sched-med-tab--active' : ''}`}
                  onClick={() => setActiveIdx(idx)}
                  style={it.isActive === false ? { opacity: 0.55, textDecoration: 'line-through' } : undefined}
                >
                  <span className="sched-med-tab__dot" />
                  {it.medicationName}
                  {it.isActive === false && <em style={{ marginLeft: 4, fontStyle: 'normal', fontSize: 11 }}>({t('medication.discontinuedLabel')})</em>}
                </button>
              ))}
            </div>
          )}

          {/* Read-only fields */}
          <div className="cpf-row-2">
            <div className="cpf-field">
              <label className="cpf-label">{t('medication.medicationName')} <span className="edit-readonly">{t('medication.readOnly')}</span></label>
              <input className="cpf-input edit-input--readonly" value={current.medicationName} readOnly />
            </div>
            <div className="cpf-field">
              <label className="cpf-label">{t('medication.dosage')} <span className="edit-readonly">{t('medication.readOnly')}</span></label>
              <input className="cpf-input edit-input--readonly" value={`${current.dosage} ${current.unit}`} readOnly />
            </div>
          </div>

          {current.isActive === false ? (
            <div className="edit-notice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <div>
                <strong>{t('medication.discontinuedLabel')}</strong>
                <p>{t('medication.discontinuedNotice')}</p>
              </div>
            </div>
          ) : (
            isDoctor && (
              <button
                type="button"
                className="cpf-btn cpf-btn--ghost"
                style={{ color: '#b91c1c', borderColor: '#fca5a5', marginBottom: 12 }}
                onClick={handleDiscontinue}
              >
                {t('medication.discontinueMedication')}
              </button>
            )
          )}

          {/* Editable: instructions */}
          <div className="cpf-field">
            <label className="cpf-label">
              {t('medication.instructions')}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </label>
            <textarea
              className="cpf-input"
              rows={3}
              value={current.instructions}
              onChange={(e) => handleChange('instructions', e.target.value)}
              placeholder={t('medication.instructionsPlaceholder')}
              style={{ resize: 'vertical' }}
              disabled={current.isActive === false}
            />
            <small className="cpf-hint">{t('medication.editInstructionsHint')}</small>
          </div>

          {/* Editable: times */}
          {current.isActive !== false && current.times.length > 0 && (
            <div className="cpf-field">
              <label className="cpf-label">{t('medication.times')}</label>
              <div className="sched-times">
                {current.times.map((tm, tIdx) => (
                  <div key={tIdx} className="sched-time-slot">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <input type="time" className="sched-time-input" value={tm} onChange={(e) => handleTimeChange(tIdx, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info notice */}
          <div className="edit-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <strong>{t('medication.editNoticeTitle')}</strong>
              <p>{isDoctor ? t('medication.editNoticeDescDoctor') : t('medication.editNoticeDescNurse')}</p>
            </div>
          </div>
        </div>

        <div className="med-modal__footer">
          <button className="cpf-btn cpf-btn--ghost" onClick={onClose} disabled={saving}>{t('medication.cancelBtn')}</button>
          <button className="cpf-btn cpf-btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? t('medication.loading') : t('medication.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   Tab 1 — Prescriptions (2-column dashboard)
   ════════════════════════════════════════ */
function PrescriptionsTab({ prescriptions, residents, loading, selectedResidentId, onResidentChange, onOpenCreate, onOpenSchedule, onOpenHistory, onOpenEdit, onActivate, onSuspend, onResume }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [expanded, setExpanded] = useState(new Set());

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

  const pendingRenewals = useMemo(() => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    return prescriptions.filter(
      (p) => p.status === 'ACTIVE' && p.validUntil && new Date(p.validUntil) <= soon
    );
  }, [prescriptions]);

  return (
    <div className="med-dashboard-layout">
      {/* ── Left: prescriptions table ── */}
      <div className="med-dashboard-main">
        <div className="med-card">
          <div className="med-card__header">
            <h2 className="med-card__title">{t('medication.recentPrescriptions')}</h2>
            <div className="med-card__header-actions">
              <select
                className="med-filter-bar__select"
                value={selectedResidentId}
                onChange={(e) => onResidentChange(e.target.value)}
              >
                <option value="">{t('medication.allResidents')}</option>
                {residents.map((r) => (
                  <option key={r._id} value={r._id}>{r.fullName}</option>
                ))}
              </select>
              <div className="med-filter-bar__search-wrap" style={{ minWidth: 180 }}>
                <svg className="med-filter-bar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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
          </div>

          {loading ? (
            <div className="med-loading">
              <div className="med-loading__spinner" />
              <span>{t('medication.loading')}</span>
            </div>
          ) : (
            <div className="med-table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="med-table">
                <thead>
                  <tr>
                    <th>{t('medication.colResident')}</th>
                    <th>{t('medication.colMedication')}</th>
                    <th>{t('medication.colDosage')}</th>
                    <th>{t('medication.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="med-empty-state">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span>{residents.length ? t('medication.noData') : t('medication.selectResidentHint')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => {
                      const isOpen = expanded.has(p._id);
                      const firstItem = (p.items || [])[0];
                      const itemCount = (p.items || []).length;
                      return (
                        <React.Fragment key={p._id}>
                          <tr className="med-table__row-animated" onClick={() => toggleExpand(p._id)} style={{ cursor: 'pointer' }}>
                            <td>
                              <div className="med-resident-cell">
                                <div className="med-resident-cell__avatar" style={{ background: getAvatarColor(p.residentId?.fullName) }}>
                                  {getInitials(p.residentId?.fullName)}
                                </div>
                                <div className="med-resident-cell__info">
                                  <div className="med-resident-cell__name">{p.residentId?.fullName}</div>
                                  <div className="med-resident-cell__code">{p.residentId?.residentCode}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="med-drug-name">{firstItem?.medicationName || '—'}</span>
                              {itemCount > 1 && <div className="med-resident-cell__code">+{itemCount - 1} {t('medication.more')}</div>}
                            </td>
                            <td>
                              <span className="med-dosage">{firstItem?.dosage || '—'}</span>
                              {firstItem?.unit && <span className="med-resident-cell__code">{firstItem.unit}</span>}
                            </td>
                            <td><RxStatusCell prescription={p} /></td>
                          </tr>
                          {isOpen && (p.items || []).length > 0 && (
                            <tr>
                              <td colSpan={4} style={{ padding: 0 }}>
                                <div className="med-rx-card__detail">
                                  <table className="med-table med-table--nested">
                                    <thead>
                                      <tr>
                                        <th>{t('medication.medicationName')}</th>
                                        <th>{t('medication.dosage')}</th>
                                        <th>{t('medication.frequencyLabel')}</th>
                                        <th>{t('medication.times')}</th>
                                        <th>{t('medication.startDate')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {p.items.map((it) => (
                                        <tr key={it._id}>
                                          <td><span className="med-drug-name">{it.medicationName}</span></td>
                                          <td>{it.dosage} {it.unit || ''}</td>
                                          <td>{it.frequency}×/{t('medication.day')}</td>
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
                                  <div className="med-rx-detail-actions">
                                    {['ACTIVE', 'DRAFT'].includes(p.status) && (
                                      <button className="med-action-btn med-action-btn--edit" onClick={() => onOpenEdit(p)}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                        {t('medication.editPrescription')}
                                      </button>
                                    )}
                                    <button className="med-action-btn med-action-btn--history" onClick={() => onOpenHistory(p)}>
                                      {t('medication.viewHistory')}
                                    </button>
                                    {p.status === 'DRAFT' && onActivate && (
                                      <button className="med-action-btn med-action-btn--activate" onClick={() => onActivate(p._id)}>
                                        {t('medication.activatePrescription')}
                                      </button>
                                    )}
                                    {p.status === 'ACTIVE' && onSuspend && (
                                      <button className="med-action-btn med-action-btn--suspend" onClick={() => onSuspend(p._id)}>
                                        {t('medication.suspendPrescription')}
                                      </button>
                                    )}
                                    {p.status === 'SUSPENDED' && onResume && (
                                      <button className="med-action-btn med-action-btn--activate" onClick={() => onResume(p._id)}>
                                        {t('medication.resumePrescription')}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: sidebar cards ── */}
      <div className="med-dashboard-sidebar">
        {/* Pending Renewals */}
        <div className="med-sidebar-card med-sidebar-card--renewals">
          <div className="med-sidebar-card__accent" />
          <div className="med-sidebar-card__body">
            <h3 className="med-sidebar-card__title">{t('medication.pendingRenewals')}</h3>
            <div className="med-sidebar-card__big-num">{pendingRenewals.length}</div>
            <p className="med-sidebar-card__desc">{t('medication.pendingRenewalsDesc')}</p>
          </div>
        </div>

        {/* Clinical Alerts */}
        <div className="med-sidebar-card">
          <h3 className="med-sidebar-card__title" style={{ padding: '18px 20px 12px' }}>{t('medication.clinicalAlerts')}</h3>
          <div className="med-sidebar-alerts">
            {pendingRenewals.length > 0 ? (
              pendingRenewals.slice(0, 3).map((p) => (
                <div key={p._id} className="med-sidebar-alert med-sidebar-alert--warning">
                  <div className="med-sidebar-alert__icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div className="med-sidebar-alert__content">
                    <span className="med-sidebar-alert__label">{t('medication.expiringPrescription')}</span>
                    <span className="med-sidebar-alert__detail">
                      {p.residentId?.fullName} — {fmtDate(p.validUntil)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="med-sidebar-alert med-sidebar-alert--ok">
                <div className="med-sidebar-alert__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div className="med-sidebar-alert__content">
                  <span className="med-sidebar-alert__label">{t('medication.noAlerts')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   Tab 2 — Daily Schedule (read-only for doctor)
   ════════════════════════════════════════ */
function DailyTab() {
  const { t } = useTranslation();
  const [date, setDate] = useState(new Date());
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const dateStr = localDateStr(date);

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

  const goToday = () => setDate(new Date());
  const isToday = dateStr === todayStr();

  // Group rows by resident so a doctor can scan one patient's full day at a glance,
  // instead of hunting through one long list sorted only by time.
  const residentGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups
      .map((group) => {
        const residentName = group.residentName || group.residentId?.fullName || '—';
        const schedules = (group.schedules || [])
          .filter((s) => !statusFilter || s.status === statusFilter)
          .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
        return {
          key: group.residentId || residentName,
          residentName,
          room: group.room || '',
          hasOverdue: schedules.some((s) => s.status === 'OVERDUE'),
          schedules,
        };
      })
      .filter((g) => g.schedules.length > 0 && (!q || g.residentName.toLowerCase().includes(q)))
      .sort((a, b) => a.residentName.localeCompare(b.residentName));
  }, [groups, statusFilter, search]);

  const counts = useMemo(() => {
    const all = groups.flatMap((g) => g.schedules || []);
    return {
      PENDING: all.filter((s) => s.status === 'PENDING').length,
      TAKEN: all.filter((s) => s.status === 'TAKEN' || s.status === 'LATE_TAKEN').length,
      MISSED: all.filter((s) => s.status === 'MISSED').length,
      OVERDUE: all.filter((s) => s.status === 'OVERDUE').length,
    };
  }, [groups]);

  return (
    <div className="med-tab-content">
      <div className="med-date-nav-row">
        <div className="med-date-nav">
          <button className="med-date-nav__btn" onClick={() => shiftDate(-1)} title={t('medication.previousDay')}>&#8249;</button>
          <span className="med-date-nav__label">{fmtDayLabel(date)}</span>
          <button className="med-date-nav__btn" onClick={() => shiftDate(1)} title={t('medication.nextDay')}>&#8250;</button>
        </div>
        <div className="med-date-nav__tools">
          {!isToday && (
            <button className="cpf-btn cpf-btn--ghost" onClick={goToday}>{t('medication.today')}</button>
          )}
          <input
            type="date"
            className="med-filter-bar__select"
            value={dateStr}
            onChange={(e) => e.target.value && setDate(new Date(`${e.target.value}T00:00:00`))}
          />
        </div>
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

      <div className="med-card__header-actions" style={{ padding: '0' }}>
        <div className="med-filter-bar__search-wrap" style={{ minWidth: 220 }}>
          <svg className="med-filter-bar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="med-filter-bar__search"
            type="text"
            placeholder={t('medication.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="med-filter-bar__select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t('medication.allStatuses')}</option>
          {Object.keys(SCHED_STATUS_KEYS).map((k) => (
            <option key={k} value={k}>{t(`medication.${SCHED_STATUS_KEYS[k]}`)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="med-empty">{t('medication.loading')}</p>
      ) : residentGroups.length === 0 ? (
        <p className="med-empty">{t('medication.noDataForDate')}</p>
      ) : (
        <div className="med-daily-groups">
          {residentGroups.map((group) => (
            <div key={group.key} className="med-card">
              <div className="med-card__header">
                <div className="med-resident-cell">
                  <div className="med-resident-cell__avatar" style={{ background: getAvatarColor(group.residentName) }}>
                    {getInitials(group.residentName)}
                  </div>
                  <div className="med-resident-cell__info">
                    <div className="med-resident-cell__name">{group.residentName}</div>
                    {group.room && <div className="med-resident-cell__code">{group.room}</div>}
                  </div>
                </div>
                <span className={`med-badge ${group.hasOverdue ? 'med-badge--overdue' : 'med-badge--pending'}`}>
                  {group.schedules.length} {t('medication.items')}
                </span>
              </div>
              <div className="med-table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="med-table med-table--nested">
                  <thead>
                    <tr>
                      <th>{t('medication.colTime')}</th>
                      <th>{t('medication.colMedication')}</th>
                      <th>{t('medication.colDosage')}</th>
                      <th>{t('medication.colStatus')}</th>
                      <th>{t('medication.colActualTime')}</th>
                      <th>{t('medication.colNotes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.schedules.map((s) => (
                      <tr key={s.id || s._id} className={s.status === 'OVERDUE' ? 'med-row--overdue' : ''}>
                        <td><span className="med-time-badge">{fmtTime(s.scheduledTime)}</span></td>
                        <td className="med-drug__name">{s.medicationName}</td>
                        <td>{s.dosage}</td>
                        <td>
                          <StatusBadge status={s.status} type="sched" />
                          {s.status === 'MISSED' && s.missedReason && (
                            <div className="med-reason-note">
                              ({t(`medication.reason${s.missedReason.charAt(0).toUpperCase() + s.missedReason.slice(1)}`)})
                            </div>
                          )}
                        </td>
                        <td>
                          {s.actualTimeTaken ? (
                            <>
                              {`${t('medication.atTime')} ${fmtTime(s.actualTimeTaken)}`}
                              {s.administrationTiming && (
                                <div className="med-reason-note">
                                  ({t(`medication.timing${s.administrationTiming === 'early' ? 'Early' : s.administrationTiming === 'late' ? 'Late' : 'OnTime'}`)})
                                </div>
                              )}
                            </>
                          ) : '—'}
                        </td>
                        <td>{s.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   Root — DoctorMedicationPage
   ════════════════════════════════════════ */
function DoctorMedicationPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('prescriptions');
  const [residents, setResidents] = useState([]);        // assigned residents only
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingRx, setLoadingRx] = useState(false);
  const [modal, setModal] = useState({ type: null, prescription: null });

  // Assigned resident IDs từ staffProfile
  const assignedIds = useMemo(
    () => user?.staffProfile?.assignedResidentIds || [],
    [user]
  );

  // Load danh sách cư dân được giao — dùng cho resident picker và filter
  useEffect(() => {
    if (!assignedIds.length) { setResidents([]); return; }
    medicationService
      .listResidents({ status: 'admitted', page: 1, limit: 200 })
      .then((res) => {
        const all = Array.isArray(res) ? res : (res?.data || []);
        // Chỉ giữ cư dân được bác sĩ này phụ trách
        const ids = new Set(assignedIds.map(String));
        setResidents(all.filter((r) => ids.has(String(r._id))));
      })
      .catch(() => setResidents([]));
  }, [assignedIds]);

  // Load prescriptions — cho 1 cư dân, hoặc tất cả cư dân được giao nếu resId rỗng
  const loadPrescriptions = useCallback((resId) => {
    setLoadingRx(true);
    medicationService
      .listPrescriptions({ residentId: resId || undefined, limit: 100 })
      .then((res) => {
        const arr = Array.isArray(res) ? res : (res?.data || []);
        setPrescriptions(arr);
      })
      .catch(() => setPrescriptions([]))
      .finally(() => setLoadingRx(false));
  }, []);

  // Load lần đầu khi có danh sách cư dân — mặc định "Tất cả cư dân"
  useEffect(() => {
    if (!residents.length) { setPrescriptions([]); return; }
    if (residents.length === 1 && !selectedResidentId) {
      setSelectedResidentId(residents[0]._id);
      loadPrescriptions(residents[0]._id);
    } else if (!selectedResidentId) {
      loadPrescriptions('');
    }
  }, [residents, selectedResidentId, loadPrescriptions]);

  const handleResidentChange = (id) => {
    setSelectedResidentId(id);
    loadPrescriptions(id);
  };

  const closeModal = () => setModal({ type: null, prescription: null });

  // Informational-only stock warnings never block save — just let the doctor know so
  // they can flag it to the pharmacist (who also gets a system notification).
  const showStockWarnings = (warnings) => {
    const stockWarnings = (warnings || []).filter((w) => w.type === 'INSUFFICIENT_STOCK');
    if (!stockWarnings.length) return;
    const names = stockWarnings.map((w) => w.medicationName).join(', ');
    showToast(
      t('medication.insufficientStockWarning', { names }),
      'info',
      8000
    );
  };

  const handleCreate = async (payload) => {
    try {
      const result = await medicationService.createPrescription(payload);
      closeModal();
      loadPrescriptions(payload.residentId);
      if (!selectedResidentId) setSelectedResidentId(payload.residentId);
      showToast(t('medication.createSuccess'), 'success');
      showStockWarnings(result?.warnings);
    } catch (err) {
      showToast(err.response?.data?.message || t('medication.createError'), 'error');
      throw err;
    }
  };

  const handleEditPrescription = async (id, payload) => {
    try {
      const result = await medicationService.updatePrescription(id, payload);
      closeModal();
      loadPrescriptions(selectedResidentId);
      showToast(t('medication.updateSuccess'), 'success');
      showStockWarnings(result?.warnings);
    } catch (err) {
      showToast(err.response?.data?.message || t('medication.updateError'), 'error');
      throw err;
    }
  };

  const handleActivate = async (id) => {
    try {
      await medicationService.activatePrescription(id);
      loadPrescriptions(selectedResidentId);
      showToast(t('medication.activateSuccess'), 'success');
    } catch (err) {
      showToast(err.response?.data?.message || t('medication.activateError'), 'error');
    }
  };

  const handleSuspend = async (id) => {
    const reason = window.prompt(t('medication.suspendReasonPrompt'));
    if (!reason || reason.trim().length < 5) {
      showToast(t('medication.suspendReasonRequired'), 'error');
      return;
    }
    try {
      await medicationService.suspendPrescription(id, { reason: reason.trim() });
      loadPrescriptions(selectedResidentId);
      showToast(t('medication.suspendSuccess'), 'success');
    } catch (err) {
      showToast(err.response?.data?.message || t('medication.suspendError'), 'error');
    }
  };

  const handleResume = async (id) => {
    try {
      await medicationService.resumePrescription(id);
      loadPrescriptions(selectedResidentId);
      showToast(t('medication.resumeSuccess'), 'success');
    } catch (err) {
      showToast(err.response?.data?.message || t('medication.resumeError'), 'error');
    }
  };

  const handleSaveSchedule = async (payload) => {
    try {
      await medicationService.setMedicationSchedule(payload);
      closeModal();
      loadPrescriptions(selectedResidentId);
      showToast(t('medication.scheduleSuccess'), 'success');
    } catch (err) {
      showToast(err.response?.data?.message || t('medication.scheduleError'), 'error');
      throw err;
    }
  };

  return (
    <div className="med-page">
      <div className="med-page__header">
        <div className="med-page__title-group">
          <h1 className="med-page__title">{t('medication.pageTitle')}</h1>
          <div className="med-page__breadcrumb">
            <span className="med-page__breadcrumb-item">{t('medication.clinicalStaff')}</span>
            <span className="med-page__breadcrumb-sep">›</span>
            <span className="med-page__breadcrumb-active">{t('medication.tabPrescriptions')}</span>
          </div>
        </div>
        {activeTab === 'prescriptions' && (
          <button
            className="med-btn med-btn--create"
            onClick={() => setModal({ type: 'create', prescription: null })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('medication.createPrescription')}
          </button>
        )}
      </div>

      <div className="med-tabs">
        <button
          className={`med-tab ${activeTab === 'prescriptions' ? 'med-tab--active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          {t('medication.tabPrescriptions')}
        </button>
        <button
          className={`med-tab ${activeTab === 'daily' ? 'med-tab--active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {t('medication.tabDailySchedule')}
        </button>
      </div>

      {activeTab === 'prescriptions' ? (
        <PrescriptionsTab
          prescriptions={prescriptions}
          residents={residents}
          loading={loadingRx}
          selectedResidentId={selectedResidentId}
          onResidentChange={handleResidentChange}
          onOpenCreate={() => setModal({ type: 'create', prescription: null })}
          onOpenSchedule={(p) => setModal({ type: 'schedule', prescription: p })}
          onOpenHistory={(p) => setModal({ type: 'history', prescription: p })}
          onOpenEdit={(p) => setModal({ type: 'edit', prescription: p })}
          onActivate={handleActivate}
          onSuspend={handleSuspend}
          onResume={handleResume}
        />
      ) : (
        <DailyTab />
      )}

      {modal.type === 'create' && (
        <CreatePrescriptionModal
          residents={residents}
          onSave={handleCreate}
          onClose={closeModal}
        />
      )}
      {modal.type === 'schedule' && (
        <SetScheduleModal
          prescription={modal.prescription}
          onSave={handleSaveSchedule}
          onClose={closeModal}
        />
      )}
      {modal.type === 'history' && (
        <HistoryModal prescription={modal.prescription} onClose={closeModal} />
      )}
      {modal.type === 'edit' && (
        <EditPrescriptionModal
          prescription={modal.prescription}
          onSave={handleEditPrescription}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

export default DoctorMedicationPage;
