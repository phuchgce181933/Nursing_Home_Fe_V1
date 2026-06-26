import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import medicationService from '../../services/medication.service';
import residentService from '../../services/resident.service';
import { useAuth } from '../../hooks/useAuth';
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

const ROUTES = ['oral', 'injection', 'topical', 'inhaled'];

const AVATAR_COLORS = ['#3b5bdb', '#e64980', '#0ca678', '#f76707', '#7048e8', '#1098ad', '#d6336c', '#5c7cfa'];
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

// Units chỉ hợp lệ với đường uống (oral)
const ORAL_ONLY_UNITS = ['viên', 'viên nén', 'viên nhộng', 'viên nang', 'tablet', 'capsule', 'pill', 'lozenge'];

const getUnitRouteWarning = (unit, route) => {
  if (!unit || !route) return null;
  const u = unit.trim().toLowerCase();
  const isOralOnly = ORAL_ONLY_UNITS.some((o) => u === o || u.startsWith(o));
  if (isOralOnly && route !== 'oral') return { unit: unit.trim(), route };
  return null;
};

/* statuses uppercase from BE */
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

      {/* Dị ứng thuốc — đỏ, ưu tiên cao nhất */}
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
function MedicationAutocomplete({ value, onSelect, placeholder }) {
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
            (m.name || '').toLowerCase().startsWith(q)
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
function ItemRow({ item, idx, onChange, onRemove, t, canRemove }) {
  const unitRouteWarn = getUnitRouteWarning(item.unit, item.route);

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
              onSelect={({ name, med }) => {
                const updates = { ...item, medicationName: name };
                if (med) {
                  updates.medicationId = med._id;
                  if (!item.unit && med.unit) updates.unit = med.unit;
                } else {
                  updates.medicationId = '';
                }
                onChange(idx, updates);
              }}
            />
          </div>
          <div className="cpf-field">
            <label className="cpf-label">{t('medication.dosage')}</label>
            <input
              type="number"
              className="cpf-input"
              value={item.dosage}
              onChange={(e) => onChange(idx, { ...item, dosage: e.target.value })}
              placeholder={t('medication.dosagePlaceholder')}
              min="0"
            />
          </div>
        </div>

        <div className="cpf-row-4">
          <div className="cpf-field">
            <label className="cpf-label">{t('medication.unit')}</label>
            <input
              className="cpf-input"
              value={item.unit}
              onChange={(e) => onChange(idx, { ...item, unit: e.target.value })}
              placeholder={t('medication.unitPlaceholder')}
            />
          </div>
          <div className="cpf-field">
            <label className="cpf-label">{t('medication.frequencyLabel')}</label>
            <select className="cpf-input" value={item.frequency} onChange={handleFrequencyChange}>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{FREQ_LABELS[n] || `${n}×`}</option>)}
            </select>
          </div>
          <div className="cpf-field">
            <label className="cpf-label">{t('medication.route')}</label>
            <select
              className="cpf-input"
              value={item.route}
              onChange={(e) => onChange(idx, { ...item, route: e.target.value })}
            >
              {ROUTES.map((r) => (
                <option key={r} value={r}>{t(`medication.route${r.charAt(0).toUpperCase() + r.slice(1)}`)}</option>
              ))}
            </select>
          </div>
          <div className="cpf-field">
            <label className="cpf-label">{t('medication.duration')}</label>
            <input
              type="number"
              className="cpf-input"
              value={item.duration}
              onChange={(e) => onChange(idx, { ...item, duration: e.target.value })}
              min="1"
              placeholder="7"
            />
          </div>
        </div>

        {unitRouteWarn && (
          <div className="med-unit-route-warn">
            <span>⚠️</span>
            {t('medication.unitRouteWarning', {
              unit: unitRouteWarn.unit,
              route: t(`medication.route${unitRouteWarn.route.charAt(0).toUpperCase() + unitRouteWarn.route.slice(1)}`),
            })}
          </div>
        )}

        <div className="cpf-field">
          <label className="cpf-label">{t('medication.instructions')}</label>
          <input
            className="cpf-input"
            value={item.instructions || ''}
            onChange={(e) => onChange(idx, { ...item, instructions: e.target.value })}
            placeholder={t('medication.instructionsPlaceholder')}
          />
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
    items: [{ medicationId: '', medicationName: '', dosage: '', unit: '', frequency: 1, times: ['08:00'], route: 'oral', duration: '', startDate: todayStr() }],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const selectedResident = residents.find((r) => r._id === form.residentId);

  const validate = () => {
    const errs = {};
    if (!form.residentId) errs.residentId = t('medication.resident');
    if (!form.diagnosisNote || form.diagnosisNote.trim().length < 10)
      errs.diagnosisNote = t('medication.diagnosisNoteHint');
    if (!form.validUntil) errs.validUntil = t('medication.validUntil');
    form.items.forEach((item, i) => {
      if (!item.medicationName.trim()) errs[`item_${i}_name`] = t('medication.medicationName');
      if (!item.medicationId) errs[`item_${i}_name`] = t('medication.selectFromList');
      if (!item.dosage) errs[`item_${i}_dosage`] = t('medication.dosage');
      const warn = getUnitRouteWarning(item.unit, item.route);
      if (warn) {
        errs[`item_${i}_unitroute`] = t('medication.unitRouteWarning', {
          unit: warn.unit,
          route: t(`medication.route${warn.route.charAt(0).toUpperCase() + warn.route.slice(1)}`),
        });
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
      items: [...p.items, { medicationId: '', medicationName: '', dosage: '', unit: '', frequency: 1, times: ['08:00'], route: 'oral', duration: '', startDate: todayStr() }],
    }));

  const handleRemoveItem = (idx) =>
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        residentId: form.residentId,
        diagnosisNote: form.diagnosisNote.trim(),
        validUntil: form.validUntil,
        items: form.items.map((item) => ({
          medicationId: item.medicationId,
          medicationName: item.medicationName.trim(),
          dosage: parseFloat(item.dosage),
          unit: item.unit.trim(),
          frequency: parseInt(item.frequency, 10),
          times: item.times,
          route: item.route,
          duration: item.duration ? parseInt(item.duration, 10) : undefined,
          startDate: item.startDate || undefined,
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
                      onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
                    />
                    <small className="cpf-hint">{t('medication.validUntilHint')}</small>
                    {errors.validUntil && <span className="cpf-error">{errors.validUntil}</span>}
                  </div>
                  <div className="cpf-field">
                    <label className="cpf-label">{t('medication.startDate')}</label>
                    <input
                      type="date"
                      className="cpf-input"
                      value={form.items[0]?.startDate || ''}
                      onChange={(e) => {
                        const sd = e.target.value;
                        setForm((p) => ({ ...p, items: p.items.map((it) => ({ ...it, startDate: sd })) }));
                      }}
                    />
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
                  <ItemRow key={idx} item={item} idx={idx} onChange={handleItemChange} onRemove={handleRemoveItem} t={t} canRemove={form.items.length > 1} />
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
          <button className="cpf-btn cpf-btn--primary" onClick={handleSubmit} disabled={saving}>
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      .getHistory({ residentId })
      .then((res) => setData(res?.data || res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [prescription]);

  const resident = prescription.residentId;
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
              <p className="cpf-drawer__subtitle">{resident?.fullName} — {resident?.residentCode}</p>
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
                              ? <span className="med-actual-time">{fmtTime(r.actualTimeTaken)}</span>
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

              {/* Bottom stats */}
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
                  <div className="mh-stat-card__icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
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
  const [items, setItems] = useState(
    (prescription.items || []).map((it) => ({
      _id: it._id,
      medicationName: it.medicationName || '',
      dosage: it.dosage || '',
      unit: it.unit || '',
      frequency: it.frequency || 1,
      route: it.route || 'oral',
      times: it.times?.length ? [...it.times] : [],
      instructions: it.instructions || '',
    }))
  );
  const [status, setStatus] = useState(prescription.status || 'ACTIVE');
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

  const resident = prescription.residentId;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(prescription._id, {
        status,
        items: items.map((it) => ({
          _id: it._id,
          times: it.times,
          instructions: it.instructions,
        })),
      });
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
                >
                  <span className="sched-med-tab__dot" />
                  {it.medicationName}
                </button>
              ))}
            </div>
          )}

          {/* Read-only fields */}
          <div className="cpf-row-2">
            <div className="cpf-field">
              <label className="cpf-label">{t('medication.medicationName')} <span className="edit-readonly">READ ONLY</span></label>
              <input className="cpf-input edit-input--readonly" value={current.medicationName} readOnly />
            </div>
            <div className="cpf-field">
              <label className="cpf-label">{t('medication.dosage')} <span className="edit-readonly">READ ONLY</span></label>
              <input className="cpf-input edit-input--readonly" value={`${current.dosage} ${current.unit}`} readOnly />
            </div>
          </div>

          {/* Editable: instructions */}
          <div className="cpf-field">
            <label className="cpf-label">
              {t('medication.instructions')}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
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
            />
            <small className="cpf-hint">{t('medication.editInstructionsHint')}</small>
          </div>

          {/* Editable: times */}
          {current.times.length > 0 && (
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

          {/* Status */}
          <div className="cpf-field">
            <label className="cpf-label">{t('medication.colStatus')}</label>
            <select className="cpf-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.keys(RX_STATUS_KEYS).map((k) => (
                <option key={k} value={k}>{t(`medication.${RX_STATUS_KEYS[k]}`)}</option>
              ))}
            </select>
          </div>

          {/* Info notice */}
          <div className="edit-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <strong>{t('medication.editNoticeTitle')}</strong>
              <p>{t('medication.editNoticeDesc')}</p>
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
function PrescriptionsTab({ prescriptions, residents, loading, selectedResidentId, onResidentChange, onOpenCreate, onOpenSchedule, onOpenHistory, onOpenEdit }) {
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
                    <th>{t('medication.route')}</th>
                    <th>{t('medication.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="med-empty-state">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span>{selectedResidentId ? t('medication.noData') : t('medication.selectResidentHint')}</span>
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
                            <td>
                              {firstItem?.route && <span className="med-route-badge">{t(`medication.route${firstItem.route.charAt(0).toUpperCase() + firstItem.route.slice(1)}`)}</span>}
                            </td>
                            <td><StatusBadge status={p.status} type="rx" /></td>
                          </tr>
                          {isOpen && (p.items || []).length > 0 && (
                            <tr>
                              <td colSpan={5} style={{ padding: 0 }}>
                                <div className="med-rx-card__detail">
                                  <table className="med-table med-table--nested">
                                    <thead>
                                      <tr>
                                        <th>{t('medication.medicationName')}</th>
                                        <th>{t('medication.dosage')}</th>
                                        <th>{t('medication.route')}</th>
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
                                          <td><span className="med-route-badge">{t(`medication.route${it.route ? it.route.charAt(0).toUpperCase() + it.route.slice(1) : ''}`) || '—'}</span></td>
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
                                    <button className="med-action-btn med-action-btn--edit" onClick={() => onOpenEdit(p)}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                      {t('medication.editPrescription')}
                                    </button>
                                    <button className="med-action-btn med-action-btn--schedule" onClick={() => onOpenSchedule(p)}>
                                      {t('medication.editSchedule')}
                                    </button>
                                    <button className="med-action-btn med-action-btn--history" onClick={() => onOpenHistory(p)}>
                                      {t('medication.viewHistory')}
                                    </button>
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

  const rows = useMemo(() => {
    const flat = [];
    groups.forEach((group) => {
      const residentName = group.residentName || group.residentId?.fullName || '—';
      const room = group.room || '';
      (group.schedules || []).forEach((s) => {
        if (!statusFilter || s.status === statusFilter) {
          flat.push({
            ...s,
            _scheduleId: s.id || s._id,
            _residentName: residentName,
            _room: room,
          });
        }
      });
    });
    return flat.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  }, [groups, statusFilter]);

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

      <div className="med-filter">
        <select className="med-filter__select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="med-empty">{t('medication.noDataForDate')}</td></tr>
              ) : (
                rows.map((s) => (
                  <tr key={s._scheduleId}>
                    <td><span className="med-time-badge">{fmtTime(s.scheduledTime)}</span></td>
                    <td>
                      <div className="med-resident-cell">
                        <div className="med-resident-cell__avatar" style={{ background: getAvatarColor(s._residentName) }}>
                          {getInitials(s._residentName)}
                        </div>
                        <div className="med-resident-cell__info">
                          <div className="med-resident-cell__name">{s._residentName}</div>
                          {s._room && <div className="med-resident-cell__code">{s._room}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="med-drug__name">{s.medicationName}</td>
                    <td>{s.dosage}</td>
                    <td>
                      <StatusBadge status={s.status} type="sched" />
                    </td>
                    <td>
                      {s.actualTimeTaken
                        ? `${t('medication.atTime')} ${fmtTime(s.actualTimeTaken)}`
                        : '—'}
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
   Root — DoctorMedicationPage
   ════════════════════════════════════════ */
function DoctorMedicationPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
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

  // Load prescriptions khi chọn cư dân
  const loadPrescriptions = useCallback((resId) => {
    if (!resId) { setPrescriptions([]); return; }
    setLoadingRx(true);
    medicationService
      .listPrescriptions({ residentId: resId, limit: 100 })
      .then((res) => {
        const arr = Array.isArray(res) ? res : (res?.data || []);
        setPrescriptions(arr);
      })
      .catch(() => setPrescriptions([]))
      .finally(() => setLoadingRx(false));
  }, []);

  // Tự động chọn cư dân đầu tiên nếu chỉ có 1
  useEffect(() => {
    if (residents.length === 1 && !selectedResidentId) {
      setSelectedResidentId(residents[0]._id);
      loadPrescriptions(residents[0]._id);
    }
  }, [residents, selectedResidentId, loadPrescriptions]);

  const handleResidentChange = (id) => {
    setSelectedResidentId(id);
    loadPrescriptions(id);
  };

  const closeModal = () => setModal({ type: null, prescription: null });

  const handleCreate = async (payload) => {
    try {
      await medicationService.createPrescription(payload);
      closeModal();
      loadPrescriptions(payload.residentId);
      if (!selectedResidentId) setSelectedResidentId(payload.residentId);
    } catch (err) {
      alert(err.response?.data?.message || t('medication.createError'));
      throw err;
    }
  };

  const handleEditPrescription = async (id, payload) => {
    try {
      await medicationService.updatePrescription(id, payload);
      closeModal();
      if (selectedResidentId) loadPrescriptions(selectedResidentId);
    } catch (err) {
      alert(err.response?.data?.message || t('medication.updateError'));
      throw err;
    }
  };

  const handleSaveSchedule = async (payload) => {
    try {
      await medicationService.setMedicationSchedule(payload);
      closeModal();
      if (selectedResidentId) loadPrescriptions(selectedResidentId);
    } catch (err) {
      alert(err.response?.data?.message || t('medication.scheduleError'));
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
