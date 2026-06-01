import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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

const todayStr = () => new Date().toISOString().slice(0, 10);
const maxValidUntil = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

const ROUTES = ['oral', 'injection', 'topical', 'inhaled'];
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

  const allergies   = profile.drugAllergies || profile.allergies || [];
  const chronic     = profile.chronicConditions || [];
  const history     = profile.medicalHistory || [];
  const initHealth  = profile.initialHealthCondition || '';
  const bloodType   = profile.bloodType || '';
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

/* ── Single prescription item form row ── */
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

  return (
    <div className="med-item-row">
      <div className="med-item-row__header">
        <span className="med-item-row__label">{t('medication.itemNumber', { n: idx + 1 })}</span>
        {canRemove && (
          <button type="button" className="med-action-btn med-action-btn--danger" onClick={() => onRemove(idx)}>
            {t('medication.removeMedication')}
          </button>
        )}
      </div>

      <div className="med-form-row">
        <div className="med-form-group" style={{ flex: 2 }}>
          <label className="med-form-label">{t('medication.medicationName')} <span style={{ color: '#ef4444' }}>*</span></label>
          <MedicationAutocomplete
            value={item.medicationName}
            placeholder={t('medication.medicationNamePlaceholder')}
            onSelect={({ name, med }) => {
              const updates = { ...item, medicationName: name };
              if (med) {
                updates.medicationId = med._id;          // required by BE
                if (!item.unit && med.unit) updates.unit = med.unit;
              } else {
                updates.medicationId = '';               // cleared khi user tự gõ
              }
              onChange(idx, updates);
            }}
          />
        </div>
        <div className="med-form-group">
          <label className="med-form-label">{t('medication.dosage')} <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="number"
            className="med-form-input"
            value={item.dosage}
            onChange={(e) => onChange(idx, { ...item, dosage: e.target.value })}
            placeholder={t('medication.dosagePlaceholder')}
            min="0"
          />
        </div>
        <div className="med-form-group">
          <label className="med-form-label">{t('medication.unit')}</label>
          <input
            className="med-form-input"
            value={item.unit}
            onChange={(e) => onChange(idx, { ...item, unit: e.target.value })}
            placeholder={t('medication.unitPlaceholder')}
          />
        </div>
      </div>

      <div className="med-form-row">
        <div className="med-form-group">
          <label className="med-form-label">{t('medication.route')}</label>
          <select
            className="med-form-select"
            value={item.route}
            onChange={(e) => onChange(idx, { ...item, route: e.target.value })}
          >
            {ROUTES.map((r) => (
              <option key={r} value={r}>{t(`medication.route${r.charAt(0).toUpperCase() + r.slice(1)}`)}</option>
            ))}
          </select>
        </div>
        <div className="med-form-group">
          <label className="med-form-label">{t('medication.frequencyLabel')} <span style={{ color: '#ef4444' }}>*</span></label>
          <select className="med-form-select" value={item.frequency} onChange={handleFrequencyChange}>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="med-form-group">
          <label className="med-form-label">{t('medication.duration')}</label>
          <input
            type="number"
            className="med-form-input"
            value={item.duration}
            onChange={(e) => onChange(idx, { ...item, duration: e.target.value })}
            min="1"
          />
        </div>
        <div className="med-form-group">
          <label className="med-form-label">{t('medication.startDate')}</label>
          <input
            type="date"
            className="med-form-input"
            value={item.startDate}
            onChange={(e) => onChange(idx, { ...item, startDate: e.target.value })}
          />
        </div>
      </div>

      {/* Cảnh báo unit ↔ route không hợp lệ */}
      {unitRouteWarn && (
        <div className="med-unit-route-warn">
          <span>⚠️</span>
          {t('medication.unitRouteWarning', {
            unit: unitRouteWarn.unit,
            route: t(`medication.route${unitRouteWarn.route.charAt(0).toUpperCase() + unitRouteWarn.route.slice(1)}`),
          })}
        </div>
      )}

      <div className="med-form-group">
        <label className="med-form-label">{t('medication.times')}</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {item.times.map((tm, tIdx) => (
            <input
              key={tIdx}
              type="time"
              className="med-time-add__input"
              value={tm}
              onChange={(e) => handleTimeChange(tIdx, e.target.value)}
            />
          ))}
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
      // Chặn submit nếu unit không tương thích với route
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
    <Modal
      title={t('medication.createPrescription')}
      onClose={onClose}
      size="xl"
      footer={
        <>
          <button className="med-btn med-btn--secondary" onClick={onClose} disabled={saving}>{t('medication.cancelBtn')}</button>
          <button className="med-btn med-btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? t('medication.loading') : t('medication.createPrescription')}
          </button>
        </>
      }
    >
      {/* Resident */}
      <div className="med-form-group">
        <label className="med-form-label">{t('medication.resident')} <span style={{ color: '#ef4444' }}>*</span></label>
        <select
          className={`med-form-select${errors.residentId ? ' med-form-select--err' : ''}`}
          value={form.residentId}
          onChange={(e) => setForm((p) => ({ ...p, residentId: e.target.value }))}
        >
          <option value="">{t('medication.selectResident')}</option>
          {residents.map((r) => (
            <option key={r._id} value={r._id}>{r.fullName} ({r.residentCode})</option>
          ))}
        </select>
        {errors.residentId && <span className="med-form-error">{errors.residentId}</span>}
      </div>

      <HealthWarningPanel residentId={form.residentId} />

      <div className="med-form-row">
        <div className="med-form-group" style={{ flex: 2 }}>
          <label className="med-form-label">{t('medication.diagnosisNote')} <span style={{ color: '#ef4444' }}>*</span></label>
          <textarea
            className={`med-form-textarea${errors.diagnosisNote ? ' med-form-input--err' : ''}`}
            rows={2}
            value={form.diagnosisNote}
            onChange={(e) => setForm((p) => ({ ...p, diagnosisNote: e.target.value }))}
            placeholder={t('medication.diagnosisNoteHint')}
          />
          {errors.diagnosisNote && <span className="med-form-error">{errors.diagnosisNote}</span>}
        </div>
        <div className="med-form-group">
          <label className="med-form-label">{t('medication.validUntil')} <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="date"
            className={`med-form-input${errors.validUntil ? ' med-form-input--err' : ''}`}
            value={form.validUntil}
            min={todayStr()}
            max={maxValidUntil()}
            onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
          />
          <small className="med-form-hint">{t('medication.validUntilHint')}</small>
          {errors.validUntil && <span className="med-form-error">{errors.validUntil}</span>}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', margin: '16px 0 12px' }} />

      {form.items.map((item, idx) => (
        <ItemRow
          key={idx}
          item={item}
          idx={idx}
          onChange={handleItemChange}
          onRemove={handleRemoveItem}
          t={t}
          canRemove={form.items.length > 1}
        />
      ))}

      <button type="button" className="med-btn med-btn--secondary" onClick={handleAddItem}>
        {t('medication.addMedication')}
      </button>
    </Modal>
  );
}

/* ── Set Schedule Modal (per prescription items) ── */
function SetScheduleModal({ prescription, onSave, onClose }) {
  const { t } = useTranslation();
  const [itemStates, setItemStates] = useState(
    (prescription.items || []).map((it) => ({
      prescriptionItemId: it._id,
      medicationName: it.medicationName,
      frequency: it.frequency || 1,
      startDate: it.startDate ? new Date(it.startDate).toISOString().slice(0, 10) : todayStr(),
      endDate: it.endDate ? new Date(it.endDate).toISOString().slice(0, 10) : '',
      times: it.times?.length ? [...it.times] : buildTimesForFrequency(it.frequency || 1),
    }))
  );
  const [saving, setSaving] = useState(false);

  const handleTimeChange = (iIdx, tIdx, val) => {
    setItemStates((prev) => {
      const updated = prev.map((s, i) => {
        if (i !== iIdx) return s;
        const times = [...s.times];
        times[tIdx] = val;
        return { ...s, times };
      });
      return updated;
    });
  };

  const handleFieldChange = (iIdx, field, val) => {
    setItemStates((prev) => prev.map((s, i) => (i === iIdx ? { ...s, [field]: val } : s)));
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

  return (
    <Modal
      title={`${t('medication.scheduleModalTitle')} — ${prescription.residentId?.fullName}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="med-btn med-btn--secondary" onClick={onClose} disabled={saving}>{t('medication.cancelBtn')}</button>
          <button className="med-btn med-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? t('medication.loading') : t('medication.saveBtn')}
          </button>
        </>
      }
    >
      {itemStates.map((s, iIdx) => (
        <div key={s.prescriptionItemId} className="med-item-row">
          <div className="med-item-row__header">
            <span className="med-item-row__label">{s.medicationName}</span>
          </div>
          <div className="med-form-row">
            <div className="med-form-group">
              <label className="med-form-label">{t('medication.startDate')}</label>
              <input type="date" className="med-form-input" value={s.startDate}
                onChange={(e) => handleFieldChange(iIdx, 'startDate', e.target.value)} />
            </div>
            <div className="med-form-group">
              <label className="med-form-label">{t('medication.endDate')}</label>
              <input type="date" className="med-form-input" value={s.endDate}
                onChange={(e) => handleFieldChange(iIdx, 'endDate', e.target.value)} />
            </div>
          </div>
          <div className="med-form-group">
            <label className="med-form-label">{t('medication.times')}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {s.times.map((tm, tIdx) => (
                <input
                  key={tIdx}
                  type="time"
                  className="med-time-add__input"
                  value={tm}
                  onChange={(e) => handleTimeChange(iIdx, tIdx, e.target.value)}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </Modal>
  );
}

/* ── History Modal (compliance stats per resident) ── */
function HistoryModal({ prescription, onClose }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const residentId =
      prescription.residentId?._id || prescription.residentId;
    medicationService
      .getHistory({ residentId })
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [prescription]);

  const resident = prescription.residentId;

  return (
    <Modal
      title={`${t('medication.historyTitle')} — ${resident?.fullName || ''} (${resident?.residentCode || ''})`}
      onClose={onClose}
      size="lg"
    >
      {loading ? (
        <p className="med-empty">{t('medication.loading')}</p>
      ) : !data ? (
        <p className="med-empty">{t('medication.noData')}</p>
      ) : (
        <>
          <div className="med-stats" style={{ marginBottom: 20 }}>
            {[
              ['totalDoses', data.summary?.total],
              ['taken', (data.summary?.taken || 0) + (data.summary?.lateTaken || 0)],
              ['lateTaken', data.summary?.lateTaken],
              ['missed', data.summary?.missed],
              ['skipped', data.summary?.skipped],
            ].map(([key, val]) => (
              <div key={key} className={`med-stat-card med-stat-card--${key === 'totalDoses' ? 'pending' : key}`}>
                <div className="med-stat-card__label">{t(`medication.${key}`)}</div>
                <div className="med-stat-card__value">{val ?? '—'}</div>
              </div>
            ))}
          </div>

          <div className="med-info-card" style={{ marginBottom: 16 }}>
            <div className="med-info-card__row">
              <span className="med-info-card__label">{t('medication.complianceRate')}</span>
              <span className="med-info-card__value" style={{ fontWeight: 700, color: data.lowCompliance ? '#ef4444' : '#10b981' }}>
                {data.summary?.complianceRate != null ? `${data.summary.complianceRate.toFixed(1)}%` : '—'}
                {data.lowCompliance && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#ef4444' }}>
                    ⚠ {t('medication.lowCompliance')}
                  </span>
                )}
              </span>
            </div>
          </div>

          {data.weeklyCompliance?.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t('medication.weeklyCompliance')}</h3>
              <div className="med-table-wrap">
                <table className="med-table">
                  <thead>
                    <tr>
                      <th>{t('medication.week')}</th>
                      <th>{t('medication.complianceRate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.weeklyCompliance.map((w, i) => (
                      <tr key={i}>
                        <td>{w.week}</td>
                        <td style={{ color: w.rate < 80 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                          {w.rate?.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

/* ════════════════════════════════════════
   Tab 1 — Prescriptions
   ════════════════════════════════════════ */
function PrescriptionsTab({ prescriptions, residents, loading, selectedResidentId, onResidentChange, onOpenCreate, onOpenSchedule, onOpenHistory }) {
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

  return (
    <div className="med-tab-content">
      {/* Resident selector — bác sĩ chỉ xem đơn của cư dân được giao */}
      <div className="med-filter" style={{ marginBottom: 8 }}>
        <select
          className="med-filter__select"
          value={selectedResidentId}
          onChange={(e) => onResidentChange(e.target.value)}
          style={{ minWidth: 240 }}
        >
          <option value="">{t('medication.selectResident')}</option>
          {residents.map((r) => (
            <option key={r._id} value={r._id}>{r.fullName} ({r.residentCode})</option>
          ))}
        </select>
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

      {!selectedResidentId ? (
        <p className="med-empty">{t('medication.selectResident')}</p>
      ) : loading ? (
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
                <th>{t('medication.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="med-empty">{t('medication.noData')}</td></tr>
              ) : (
                filtered.map((p) => {
                  const isOpen = expanded.has(p._id);
                  return (
                    <>
                      <tr key={p._id}>
                        <td>
                          <div className="med-resident__name">{p.residentId?.fullName}</div>
                          <div className="med-resident__code">{p.residentId?.residentCode}</div>
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          <div style={{ fontSize: 13 }}>{p.diagnosisNote}</div>
                        </td>
                        <td>{fmtDate(p.validUntil)}</td>
                        <td>
                          <button
                            className="med-action-btn med-action-btn--schedule"
                            onClick={() => toggleExpand(p._id)}
                          >
                            {(p.items || []).length} {t('medication.items')} {isOpen ? '▲' : '▼'}
                          </button>
                        </td>
                        <td>{p.prescribedByStaffId?.userId?.fullName || '—'}</td>
                        <td><StatusBadge status={p.status} type="rx" /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <button className="med-action-btn med-action-btn--schedule" onClick={() => onOpenSchedule(p)}>
                              {t('medication.editSchedule')}
                            </button>
                            <button className="med-action-btn med-action-btn--history" onClick={() => onOpenHistory(p)}>
                              {t('medication.viewHistory')}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (p.items || []).length > 0 && (
                        <tr key={`${p._id}-items`}>
                          <td colSpan={7} style={{ padding: 0, background: '#f8fafc' }}>
                            <div style={{ padding: '8px 16px' }}>
                              <table className="med-table" style={{ margin: 0 }}>
                                <thead>
                                  <tr>
                                    <th>{t('medication.medicationName')}</th>
                                    <th>{t('medication.dosage')}</th>
                                    <th>{t('medication.unit')}</th>
                                    <th>{t('medication.route')}</th>
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
                                      <td>{t(`medication.route${it.route ? it.route.charAt(0).toUpperCase() + it.route.slice(1) : ''}`) || it.route || '—'}</td>
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
   Tab 2 — Daily Schedule (read-only for doctor)
   ════════════════════════════════════════ */
function DailyTab() {
  const { t } = useTranslation();
  const [date, setDate] = useState(new Date());
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

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

  // Flatten groups → rows for display
  const rows = useMemo(() => {
    const flat = [];
    groups.forEach((group) => {
      const resident = group.residentId || group.resident || {};
      (group.schedules || []).forEach((s) => {
        if (!statusFilter || s.status === statusFilter) {
          flat.push({ ...s, _resident: resident });
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

  const handleSaveSchedule = async (payload) => {
    try {
      await medicationService.setMedicationSchedule(payload);
      closeModal();
    } catch (err) {
      alert(err.response?.data?.message || t('medication.scheduleError'));
      throw err;
    }
  };

  return (
    <div className="med-page">
      <div className="med-page__header">
        <h1 className="med-page__title">{t('medication.pageTitle')}</h1>
        {activeTab === 'prescriptions' && (
          <button
            className="med-btn med-btn--primary"
            onClick={() => setModal({ type: 'create', prescription: null })}
          >
            + {t('medication.createPrescription')}
          </button>
        )}
      </div>

      <div className="med-tabs">
        <button
          className={`med-tab ${activeTab === 'prescriptions' ? 'med-tab--active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
        >
          {t('medication.tabPrescriptions')}
        </button>
        <button
          className={`med-tab ${activeTab === 'daily' ? 'med-tab--active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
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
    </div>
  );
}

export default DoctorMedicationPage;
