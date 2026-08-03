import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlusCircle, Search, Eye, Pencil, Trash2, History,
  FileText, AlertTriangle, AlertCircle, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, User, Calendar, X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import careNoteService from '../../services/careNote.service';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/shared/CareNotesPage.css';

const getNoteTypes = (t) => [
  { value: '',              label: t('careNotes.noteTypeAll') },
  { value: 'activity',      label: t('careNotes.noteTypeActivity') },
  { value: 'meal',          label: t('careNotes.noteTypeMeal') },
  { value: 'daily_living',  label: t('careNotes.noteTypeDailyLiving') },
  { value: 'health',        label: t('careNotes.noteTypeHealth') },
  { value: 'general',       label: t('careNotes.noteTypeGeneral') },
];

const getNoteTypeLabels = (t) => ({
  meal: t('careNotes.noteTypeMeal'),
  activity: t('careNotes.noteTypeActivity'),
  daily_living: t('careNotes.noteTypeDailyLiving'),
  health: t('careNotes.noteTypeHealth'),
  general: t('careNotes.noteTypeGeneral'),
});

const PRIORITIES = ['normal', 'important', 'urgent'];
const getPriorityLabels = (t) => ({ normal: t('careNotes.priorityNormal'), important: t('careNotes.priorityImportant'), urgent: t('careNotes.priorityUrgent') });

const getMealTypes = (t) => [{ value: 'breakfast', label: t('careNotes.mealBreakfast') }, { value: 'lunch', label: t('careNotes.mealLunch') }, { value: 'dinner', label: t('careNotes.mealDinner') }, { value: 'snack', label: t('careNotes.mealSnack') }];
const getIntakeAmounts = (t) => [{ value: 'none', label: t('careNotes.intakeNone') }, { value: 'little', label: t('careNotes.intakeLittle') }, { value: 'half', label: t('careNotes.intakeHalf') }, { value: 'most', label: t('careNotes.intakeMost') }, { value: 'all', label: t('careNotes.intakeAll') }];
const getAppetiteOpts = (t) => [{ value: 'poor', label: t('careNotes.appetitePoor') }, { value: 'fair', label: t('careNotes.appetiteFair') }, { value: 'good', label: t('careNotes.appetiteGood') }, { value: 'excellent', label: t('careNotes.appetiteExcellent') }];

const getActivityTypes = (t) => [
  { value: 'walking', label: t('careNotes.actWalking') }, { value: 'exercise', label: t('careNotes.actExercise') },
  { value: 'physiotherapy', label: t('careNotes.actPhysiotherapy') }, { value: 'reading', label: t('careNotes.actReading') },
  { value: 'socializing', label: t('careNotes.actSocializing') }, { value: 'entertainment', label: t('careNotes.actEntertainment') },
  { value: 'other', label: t('careNotes.actOther') },
];
const getParticipation = (t) => [{ value: 'refused', label: t('careNotes.participationRefused') }, { value: 'assisted', label: t('careNotes.participationAssisted') }, { value: 'supervised', label: t('careNotes.participationSupervised') }, { value: 'independent', label: t('careNotes.participationIndependent') }];
const getMoodOpts = (t) => [{ value: 'happy', label: t('careNotes.moodHappy') }, { value: 'neutral', label: t('careNotes.moodNeutral') }, { value: 'sad', label: t('careNotes.moodSad') }, { value: 'agitated', label: t('careNotes.moodAgitated') }, { value: 'anxious', label: t('careNotes.moodAnxious') }];

const getDailyLivingTypes = (t) => [
  { value: 'bathing', label: t('careNotes.dlBathing') }, { value: 'grooming', label: t('careNotes.dlGrooming') },
  { value: 'dressing', label: t('careNotes.dlDressing') }, { value: 'eating', label: t('careNotes.dlEating') },
  { value: 'mobility', label: t('careNotes.dlMobility') }, { value: 'toileting', label: t('careNotes.dlToileting') },
  { value: 'sleeping', label: t('careNotes.dlSleeping') }, { value: 'other', label: t('careNotes.dlOther') },
];
const getAssistanceLevels = (t) => [
  { value: 'independent', label: t('careNotes.assistIndependent') }, { value: 'supervised', label: t('careNotes.assistSupervised') },
  { value: 'assisted', label: t('careNotes.assistAssisted') }, { value: 'total_care', label: t('careNotes.assistTotalCare') },
];
const getCompletionStatuses = (t) => [
  { value: 'completed', label: t('careNotes.completionCompleted') }, { value: 'partial', label: t('careNotes.completionPartial') },
  { value: 'refused', label: t('careNotes.completionRefused') },
];
const getConsciousness = (t) => [{ value: 'alert', label: t('careNotes.consciousnessAlert') }, { value: 'confused', label: t('careNotes.consciousnessConfused') }, { value: 'drowsy', label: t('careNotes.consciousnessDrowsy') }, { value: 'unresponsive', label: t('careNotes.consciousnessUnresponsive') }];
const getFallRisks = (t) => [{ value: 'low', label: t('careNotes.fallRiskLow') }, { value: 'medium', label: t('careNotes.fallRiskMedium') }, { value: 'high', label: t('careNotes.fallRiskHigh') }];

const LIMIT = 10;

const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const todayStr = () => toLocalDateStr(new Date());
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateStr(d);
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const fmtTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};
const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const toDatetimeLocal = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};
const resName   = (r) => (r && typeof r === 'object' ? r.fullName : '') || '—';
const resCode   = (r) => (r && typeof r === 'object' ? r.residentCode || '' : '');
const resRoom   = (r, t) => {
  if (!r || typeof r !== 'object') return '';
  if (r.roomId && typeof r.roomId === 'object' && r.roomId.roomCode) return `${t('careNotes.room')} ${r.roomId.roomCode}`;
  return r.residentCode ? `${t('careNotes.code')}: ${r.residentCode}` : '';
};
const resId     = (r) => (r && typeof r === 'object' ? r._id : r) || '';
const authorNm  = (s) => s?.userId?.fullName || '—';
const authorRole = (s, t) => {
  const r = s?.userId?.role;
  if (r === 'nurse') return t('careNotes.roleNurse');
  if (r === 'doctor') return t('careNotes.roleDoctor');
  return r || '';
};
const initials = (name) => {
  if (!name || name === '—') return '?';
  const parts = name.split(' ').filter(Boolean);
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};
const labelOf = (list, value) => list.find((o) => o.value === value)?.label || value || '—';
const getPriority = (note) => note?.metadata?.priority || 'normal';

/* ═══════ Meta Form Section ═══════ */

function MetaFormSection({ noteType, meta, setMeta, errors = {}, onFieldChange }) {
  const { t } = useTranslation();
  const setM = (f) => (e) => {
    const value = e.target ? e.target.value : e;
    setMeta((p) => ({ ...p, [f]: value }));
    onFieldChange?.(f, value);
  };

  const SelectField = ({ label, field, options }) => (
    <div className="cn-form-group">
      <label className="cn-form-label">{label}</label>
      <select
        className={`cn-form-input${errors[field] ? ' cn-form-input--error' : ''}`}
        value={meta[field] || ''}
        onChange={setM(field)}
      >
        <option value="">{t('careNotes.selectPlaceholder')}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {errors[field] && <span className="cn-form-error">{errors[field]}</span>}
    </div>
  );

  const NumberField = ({ label, field, placeholder, min, max, step }) => (
    <div className="cn-form-group">
      <label className="cn-form-label">{label}</label>
      <input
        type="number"
        className={`cn-form-input${errors[field] ? ' cn-form-input--error' : ''}`}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={meta[field] ?? ''}
        onChange={setM(field)}
      />
      {errors[field] && <span className="cn-form-error">{errors[field]}</span>}
    </div>
  );

  const TextField = ({ label, field, placeholder, rows }) => (
    <div className="cn-form-group">
      <label className="cn-form-label">{label}</label>
      {rows ? (
        <textarea
          className={`cn-form-input${errors[field] ? ' cn-form-input--error' : ''}`}
          rows={rows}
          placeholder={placeholder}
          value={meta[field] || ''}
          onChange={setM(field)}
        />
      ) : (
        <input
          type="text"
          className={`cn-form-input${errors[field] ? ' cn-form-input--error' : ''}`}
          placeholder={placeholder}
          value={meta[field] || ''}
          onChange={setM(field)}
        />
      )}
      {errors[field] && <span className="cn-form-error">{errors[field]}</span>}
    </div>
  );

  // NOTE: SelectField/NumberField/TextField are invoked as plain function calls
  // below (SelectField({...}) not <SelectField .../>) — never as JSX component
  // tags. If used as tags, React would treat the fresh function identity created
  // on every MetaFormSection re-render as a brand-new component type, unmounting
  // and remounting the underlying <input>/<select> on every keystroke and
  // dropping focus after a single character. Calling them as functions just
  // inlines their returned JSX, so React reconciles the actual <input>/<select>
  // elements normally and focus is preserved.
  if (noteType === 'meal') return (
    <div className="cn-meta-section">
      <div className="cn-meta-section__title">{t('careNotes.mealDetails')}</div>
      <div className="cn-meta-grid">
        {SelectField({ label: t('careNotes.mealTypeLabel'), field: 'mealType', options: getMealTypes(t) })}
        {SelectField({ label: t('careNotes.intakeAmountLabel'), field: 'intakeAmount', options: getIntakeAmounts(t) })}
        {SelectField({ label: t('careNotes.appetiteLabel'), field: 'appetite', options: getAppetiteOpts(t) })}
      </div>
    </div>
  );

  if (noteType === 'activity') return (
    <div className="cn-meta-section">
      <div className="cn-meta-section__title">{t('careNotes.activityDetails')}</div>
      <div className="cn-meta-grid">
        {SelectField({ label: t('careNotes.activityTypeLabel'), field: 'activityType', options: getActivityTypes(t) })}
        {NumberField({ label: t('careNotes.durationMinutes'), field: 'duration', placeholder: t('careNotes.egThirty'), min: 0 })}
        {SelectField({ label: t('careNotes.participationLabel'), field: 'participationLevel', options: getParticipation(t) })}
        {SelectField({ label: t('careNotes.moodLabel'), field: 'mood', options: getMoodOpts(t) })}
      </div>
    </div>
  );

  if (noteType === 'daily_living') return (
    <div className="cn-meta-section">
      <div className="cn-meta-section__title">{t('careNotes.dailyLivingDetails')}</div>
      <div className="cn-meta-grid">
        {SelectField({ label: t('careNotes.activityTypeLabel'), field: 'activityType', options: getDailyLivingTypes(t) })}
        {SelectField({ label: t('careNotes.assistanceLevelLabel'), field: 'assistanceLevel', options: getAssistanceLevels(t) })}
        {SelectField({ label: t('careNotes.statusLabel'), field: 'completionStatus', options: getCompletionStatuses(t) })}
        {NumberField({ label: t('careNotes.durationMinutes'), field: 'duration', placeholder: t('careNotes.egTwenty'), min: 0 })}
        {SelectField({ label: t('careNotes.moodLabel'), field: 'mood', options: getMoodOpts(t) })}
      </div>
    </div>
  );

  if (noteType === 'health') return (
    <div className="cn-meta-section">
      <div className="cn-meta-section__title">{t('careNotes.healthDetails')}</div>
      <div className="cn-meta-grid">
        {TextField({ label: t('careNotes.symptomsLabel'), field: 'symptomsText', placeholder: t('careNotes.symptomsPlaceholder') })}
        {SelectField({ label: t('careNotes.consciousnessLabel'), field: 'consciousness', options: getConsciousness(t) })}
        {SelectField({ label: t('careNotes.fallRiskLabel'), field: 'fallRisk', options: getFallRisks(t) })}
        {NumberField({ label: t('careNotes.painLevelLabel'), field: 'painLevel', placeholder: '0–10', min: 0, max: 10 })}
        {NumberField({ label: t('careNotes.temperatureLabel'), field: 'temperature', placeholder: t('careNotes.egTemp'), min: 30, max: 45, step: 0.1 })}
        {NumberField({ label: t('careNotes.pulseLabel'), field: 'pulse', placeholder: t('careNotes.egPulse'), min: 20, max: 300 })}
        {TextField({ label: t('careNotes.skinConditionLabel'), field: 'skinCondition', placeholder: t('careNotes.describePlaceholder') })}
        {TextField({ label: t('careNotes.physicalChangesLabel'), field: 'physicalChanges', placeholder: t('careNotes.physicalChangesPlaceholder'), rows: 2 })}
      </div>
    </div>
  );

  return null;
}

/* ═══════ Note Form Modal (Create/Edit — Drawer) ═══════ */

function NoteFormModal({ mode, note, residents, onSave, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    residentId: resId(note?.residentId) || '',
    noteType: note?.noteType || 'general',
    content: note?.content || '',
    noteAt: toDatetimeLocal(note?.noteAt || new Date()),
    priority: note?.metadata?.priority || 'normal',
  });

  const [meta, setMeta] = useState({
    mealType: note?.metadata?.mealType || '', intakeAmount: note?.metadata?.intakeAmount || '', appetite: note?.metadata?.appetite || '',
    activityType: note?.metadata?.activityType || '', duration: note?.metadata?.duration ?? '', participationLevel: note?.metadata?.participationLevel || '', mood: note?.metadata?.mood || '',
    assistanceLevel: note?.metadata?.assistanceLevel || '', completionStatus: note?.metadata?.completionStatus || '',
    symptomsText: (note?.metadata?.symptoms || []).join(', '),
    consciousness: note?.metadata?.consciousness || '', fallRisk: note?.metadata?.fallRisk || '',
    painLevel: note?.metadata?.painLevel ?? '', temperature: note?.metadata?.temperature ?? '',
    pulse: note?.metadata?.pulse ?? '', skinCondition: note?.metadata?.skinCondition || '',
    physicalChanges: note?.metadata?.physicalChanges || '',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const selectedResident = useMemo(() => residents.find((r) => r._id === form.residentId), [residents, form.residentId]);

  // Single source of truth for one top-level field's validity — used both on submit
  // and live (as-you-type / as-you-select) so the error shows right at that field
  // immediately, not just after clicking Save.
  const validateTopField = (field, value) => {
    if (field === 'residentId') return !value ? t('careNotes.errSelectResident') : undefined;
    if (field === 'content') return (!value || value.trim().length < 5) ? t('careNotes.errContentMin') : undefined;
    if (field === 'noteAt') return (value && new Date(value) > new Date()) ? t('careNotes.errFutureTime') : undefined;
    return undefined;
  };

  const setF = (f) => (e) => {
    const value = e.target ? e.target.value : e;
    setForm((p) => ({ ...p, [f]: value }));
    setErrors((prev) => ({ ...prev, [f]: validateTopField(f, value) }));
  };

  const buildMetadata = () => {
    const nt = form.noteType;
    const base = { priority: form.priority };
    if (nt === 'meal') {
      if (meta.mealType) base.mealType = meta.mealType;
      if (meta.intakeAmount) base.intakeAmount = meta.intakeAmount;
      if (meta.appetite) base.appetite = meta.appetite;
    } else if (nt === 'activity') {
      if (meta.activityType) base.activityType = meta.activityType;
      if (meta.duration !== '') base.duration = Number(meta.duration);
      if (meta.participationLevel) base.participationLevel = meta.participationLevel;
      if (meta.mood) base.mood = meta.mood;
    } else if (nt === 'daily_living') {
      if (meta.activityType) base.activityType = meta.activityType;
      if (meta.assistanceLevel) base.assistanceLevel = meta.assistanceLevel;
      if (meta.completionStatus) base.completionStatus = meta.completionStatus;
      if (meta.duration !== '') base.duration = Number(meta.duration);
      if (meta.mood) base.mood = meta.mood;
    } else if (nt === 'health') {
      const symptoms = meta.symptomsText?.split(',').map((s) => s.trim()).filter(Boolean);
      if (symptoms?.length) base.symptoms = symptoms;
      if (meta.consciousness) base.consciousness = meta.consciousness;
      if (meta.fallRisk) base.fallRisk = meta.fallRisk;
      if (meta.painLevel !== '') base.painLevel = Number(meta.painLevel);
      if (meta.temperature !== '') base.temperature = Number(meta.temperature);
      if (meta.pulse !== '') base.pulse = Number(meta.pulse);
      if (meta.skinCondition) base.skinCondition = meta.skinCondition.trim();
      if (meta.physicalChanges) base.physicalChanges = meta.physicalChanges.trim();
    }
    return base;
  };

// Numeric metadata fields validated by range; every other metadata field is a required text/select.
  const NUMERIC_META_RANGES = {
    duration: { min: 0, max: Infinity, errorKey: 'careNotes.errDurationNegative' },
    painLevel: { min: 0, max: 10, errorKey: 'careNotes.errPainLevelRange' },
    temperature: { min: 30, max: 45, errorKey: 'careNotes.errTemperatureRange' },
    pulse: { min: 20, max: 300, errorKey: 'careNotes.errPulseRange' },
  };

  // Single source of truth for one metadata field's validity — used both on submit
  // and live (as-you-type / as-you-select) so errors show immediately, not just on save.
  const validateMetaField = (field, value) => {
    const range = NUMERIC_META_RANGES[field];
    if (range) {
      if (value === '' || value === undefined || value === null) return t('careNotes.errFieldRequired');
      const num = Number(value);
      if (!Number.isFinite(num) || num < range.min || num > range.max) return t(range.errorKey);
      return undefined;
    }
    if (!value || !String(value).trim()) return t('careNotes.errFieldRequired');
    return undefined;
  };

  // Every field shown in the selected category's metadata form is required —
  // no field within that category may be left blank.
  const META_FIELDS_BY_TYPE = {
    meal: ['mealType', 'intakeAmount', 'appetite'],
    activity: ['activityType', 'duration', 'participationLevel', 'mood'],
    daily_living: ['activityType', 'assistanceLevel', 'completionStatus', 'duration', 'mood'],
    health: ['symptomsText', 'consciousness', 'fallRisk', 'painLevel', 'temperature', 'pulse', 'skinCondition', 'physicalChanges'],
  };

  const handleMetaFieldChange = (field, value) => {
    if (!(META_FIELDS_BY_TYPE[form.noteType] || []).includes(field)) return;
    setErrors((prev) => ({ ...prev, [field]: validateMetaField(field, value) }));
  };

  const validate = () => {
    const errs = {};
    ['residentId', 'content', 'noteAt'].forEach((field) => {
      const err = validateTopField(field, form[field]);
      if (err) errs[field] = err;
    });

    (META_FIELDS_BY_TYPE[form.noteType] || []).forEach((field) => {
      const err = validateMetaField(field, meta[field]);
      if (err) errs[field] = err;
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        residentId: form.residentId,
        noteType: form.noteType,
        content: form.content.trim(),
        noteAt: form.noteAt ? new Date(form.noteAt).toISOString() : undefined,
        metadata: buildMetadata(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cn-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cn-modal cn-modal--popup cn-modal--lg">
        <div className="cn-modal__header">
          <div className="cn-modal__header-text">
            <h2 className="cn-modal__title">{mode === 'create' ? t('careNotes.createTitle') : t('careNotes.editTitle')}</h2>
            <p className="cn-modal__subtitle">
              {mode === 'create' ? t('careNotes.createSubtitle') : t('careNotes.editSubtitle')}
            </p>
          </div>
          <button className="cn-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="cn-modal__body">
          {/* Resident select */}
          <div className="cn-form-section">
            <div className="cn-form-section__title">{t('careNotes.selectResident')}</div>
            <div className="cn-form-group">
              <select
                className={`cn-form-input${errors.residentId ? ' cn-form-input--error' : ''}`}
                value={form.residentId}
                onChange={setF('residentId')}
                disabled={mode === 'edit'}
              >
                <option value="">{t('careNotes.searchResidentPlaceholder')}</option>
                {residents.map((r) => (
                  <option key={r._id} value={r._id}>{r.fullName}{r.residentCode ? ` — ${r.residentCode}` : ''}</option>
                ))}
              </select>
              {errors.residentId && <span className="cn-form-error">{errors.residentId}</span>}
            </div>
          </div>

          {selectedResident && (
            <div className="cn-resident-card">
              <div className="cn-resident-card__avatar">{initials(selectedResident.fullName)}</div>
              <div className="cn-resident-card__info">
                <div className="cn-resident-card__name">{selectedResident.fullName}</div>
                <div className="cn-resident-card__detail">
                  {resRoom(selectedResident, t)}
                  {selectedResident.residentCode && ` · ${t('careNotes.code')}: ${selectedResident.residentCode}`}
                </div>
              </div>
            </div>
          )}

          {mode === 'edit' && note && (
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Clock size={14} />
              {t('careNotes.createdAt')}: {fmtDateTime(note.createdAt)}
              {note.updatedAt !== note.createdAt && <span className="cn-edited-label">{t('careNotes.edited')}</span>}
            </div>
          )}

          {/* Care Category */}
          <div className="cn-form-section">
            <div className="cn-form-section__title">{t('careNotes.noteTypeSection')}</div>
            <div className="cn-category-pills">
              {getNoteTypes(t).filter((nt) => nt.value).map((nt) => (
                <button
                  key={nt.value}
                  type="button"
                  className={`cn-category-pill${form.noteType === nt.value ? ' cn-category-pill--active' : ''}`}
                  data-type={nt.value}
                  onClick={() => setForm((p) => ({ ...p, noteType: nt.value }))}
                >
                  {nt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note content */}
          <div className="cn-form-section">
            <div className="cn-form-group">
              <label className="cn-form-label">{t('careNotes.contentLabel')} <span className="cn-required">*</span></label>
              <textarea
                className={`cn-form-input${errors.content ? ' cn-form-input--error' : ''}`}
                rows={4}
                placeholder={t('careNotes.contentPlaceholder')}
                value={form.content}
                onChange={setF('content')}
              />
              {errors.content && <span className="cn-form-error">{errors.content}</span>}
            </div>
          </div>

          {/* Priority */}
          <div className="cn-form-section">
            <div className="cn-form-section__title">{t('careNotes.prioritySection')}</div>
            <div className="cn-priority-pills">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`cn-priority-pill cn-priority-pill--${p}${form.priority === p ? ' cn-priority-pill--selected' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                >
                  <span className={`cn-priority-dot cn-priority-dot--${p}`} />
                  {getPriorityLabels(t)[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="cn-form-section">
            <div className="cn-form-group">
              <label className="cn-form-label">{t('careNotes.recordTimeLabel')}</label>
              <input
                type="datetime-local"
                className={`cn-form-input${errors.noteAt ? ' cn-form-input--error' : ''}`}
                value={form.noteAt}
                onChange={setF('noteAt')}
              />
              {errors.noteAt && <span className="cn-form-error">{errors.noteAt}</span>}
            </div>
          </div>

          {/* Metadata */}
          <MetaFormSection noteType={form.noteType} meta={meta} setMeta={setMeta} errors={errors} onFieldChange={handleMetaFieldChange} />
        </div>

        <div className="cn-modal__footer">
          <button className="cn-btn cn-btn--secondary" onClick={onClose} disabled={saving}>{t('careNotes.cancel')}</button>
          <button className="cn-btn cn-btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? t('careNotes.saving') : mode === 'create' ? t('careNotes.saveNote') : t('careNotes.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════ View Detail Modal (Drawer) ═══════ */

function NoteViewModal({ note, onEdit, onClose, canModify }) {
  const { t } = useTranslation();
  const meta = note.metadata || {};
  const nt = note.noteType;
  const NOTE_TYPE_LABELS = getNoteTypeLabels(t);
  const PRIORITY_LABELS = getPriorityLabels(t);
  const ViewRow = ({ label, value }) => value ? (
    <div className="cn-view-row"><span className="cn-view-label">{label}</span><span className="cn-view-value">{value}</span></div>
  ) : null;

  return (
    <div className="cn-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cn-modal cn-modal--lg">
        <div className="cn-modal__header">
          <div className="cn-modal__header-text">
            <h2 className="cn-modal__title">{t('careNotes.viewTitle')}</h2>
          </div>
          <button className="cn-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="cn-modal__body">
          <div className="cn-resident-card">
            <div className="cn-resident-card__avatar">{initials(resName(note.residentId))}</div>
            <div className="cn-resident-card__info">
              <div className="cn-resident-card__name">{resName(note.residentId)}</div>
              <div className="cn-resident-card__detail">
                {resRoom(note.residentId, t)}
                {resCode(note.residentId) && ` · ${t('careNotes.code')}: ${resCode(note.residentId)}`}
              </div>
            </div>
            <span className={`cn-badge cn-badge--${nt}`}>{NOTE_TYPE_LABELS[nt] || nt}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <span className={`cn-badge cn-badge--${getPriority(note)}`}>{PRIORITY_LABELS[getPriority(note)]}</span>
            {note.updatedAt !== note.createdAt && <span className="cn-edited-label">{t('careNotes.edited')}</span>}
          </div>

          <div className="cn-view-section">
            <div className="cn-view-section__title">{t('careNotes.contentSection')}</div>
            <div className="cn-view-content">{note.content}</div>
          </div>

          {/* Meal */}
          {nt === 'meal' && (meta.mealType || meta.intakeAmount || meta.appetite) && (
            <div className="cn-view-section">
              <div className="cn-view-section__title">{t('careNotes.mealDetails')}</div>
              <ViewRow label={t('careNotes.mealTypeLabel')} value={labelOf(getMealTypes(t), meta.mealType)} />
              <ViewRow label={t('careNotes.intakeAmountLabel')} value={labelOf(getIntakeAmounts(t), meta.intakeAmount)} />
              <ViewRow label={t('careNotes.appetiteLabel')} value={labelOf(getAppetiteOpts(t), meta.appetite)} />
            </div>
          )}

          {/* Activity */}
          {nt === 'activity' && (
            <div className="cn-view-section">
              <div className="cn-view-section__title">{t('careNotes.activityDetails')}</div>
              <ViewRow label={t('careNotes.activityTypeLabel')} value={labelOf(getActivityTypes(t), meta.activityType)} />
              <ViewRow label={t('careNotes.timeLabel')} value={meta.duration != null ? `${meta.duration} ${t('careNotes.minutes')}` : null} />
              <ViewRow label={t('careNotes.participationLabel')} value={labelOf(getParticipation(t), meta.participationLevel)} />
              <ViewRow label={t('careNotes.moodLabel')} value={labelOf(getMoodOpts(t), meta.mood)} />
            </div>
          )}

          {/* Daily living */}
          {nt === 'daily_living' && (
            <div className="cn-view-section">
              <div className="cn-view-section__title">{t('careNotes.dailyLivingDetailsShort')}</div>
              <ViewRow label={t('careNotes.typeLabel')} value={labelOf(getDailyLivingTypes(t), meta.activityType)} />
              <ViewRow label={t('careNotes.assistanceLevelLabel')} value={labelOf(getAssistanceLevels(t), meta.assistanceLevel)} />
              <ViewRow label={t('careNotes.statusLabel')} value={labelOf(getCompletionStatuses(t), meta.completionStatus)} />
              <ViewRow label={t('careNotes.timeLabel')} value={meta.duration != null ? `${meta.duration} ${t('careNotes.minutes')}` : null} />
              <ViewRow label={t('careNotes.moodLabel')} value={labelOf(getMoodOpts(t), meta.mood)} />
            </div>
          )}

          {/* Health */}
          {nt === 'health' && (
            <div className="cn-view-section">
              <div className="cn-view-section__title">{t('careNotes.healthDetails')}</div>
              {Array.isArray(meta.symptoms) && meta.symptoms.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <span className="cn-view-label">{t('careNotes.symptomsLabel')}</span>
                  <div className="cn-chips" style={{ marginTop: 6 }}>
                    {meta.symptoms.map((s, i) => <span key={i} className="cn-chip">{s}</span>)}
                  </div>
                </div>
              )}
              <ViewRow label={t('careNotes.consciousnessLabel')} value={labelOf(getConsciousness(t), meta.consciousness)} />
              <ViewRow label={t('careNotes.fallRiskLabel')} value={labelOf(getFallRisks(t), meta.fallRisk)} />
              <ViewRow label={t('careNotes.painLevelLabelShort')} value={meta.painLevel != null && meta.painLevel !== '' ? `${meta.painLevel}/10` : null} />
              <ViewRow label={t('careNotes.temperatureLabelShort')} value={meta.temperature != null && meta.temperature !== '' ? `${meta.temperature}°C` : null} />
              <ViewRow label={t('careNotes.pulseLabelShort')} value={meta.pulse != null && meta.pulse !== '' ? `${meta.pulse} bpm` : null} />
              <ViewRow label={t('careNotes.skinConditionLabel')} value={meta.skinCondition} />
              <ViewRow label={t('careNotes.physicalChangesLabel')} value={meta.physicalChanges} />
            </div>
          )}

          <div className="cn-view-section">
            <div className="cn-view-section__title">{t('careNotes.recordInfoSection')}</div>
            <ViewRow label={t('careNotes.recordedBy')} value={`${authorNm(note.authorStaffId)} (${authorRole(note.authorStaffId, t)})`} />
            <ViewRow label={t('careNotes.recordTimeLabel')} value={fmtDateTime(note.noteAt)} />
            <ViewRow label={t('careNotes.createdDate')} value={fmtDateTime(note.createdAt)} />
            {note.updatedAt !== note.createdAt && <ViewRow label={t('careNotes.lastUpdated')} value={fmtDateTime(note.updatedAt)} />}
          </div>
        </div>

        <div className="cn-modal__footer">
          <button className="cn-btn cn-btn--secondary" onClick={onClose}>{t('careNotes.close')}</button>
          {canModify && <button className="cn-btn cn-btn--primary" onClick={() => onEdit(note)}>
            <Pencil size={14} /> {t('careNotes.edit')}
          </button>}
        </div>
      </div>
    </div>
  );
}

/* ═══════ Delete Confirm Modal (Center) ═══════ */

function DeleteConfirmModal({ note, onConfirm, onClose, saving }) {
  const { t } = useTranslation();
  const NOTE_TYPE_LABELS = getNoteTypeLabels(t);
  return (
    <div className="cn-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cn-modal cn-modal--center">
        <div className="cn-modal__body" style={{ padding: '32px 28px' }}>
          <div className="cn-delete-body">
            <div className="cn-delete-icon"><Trash2 size={26} /></div>
            <div className="cn-delete-title">{t('careNotes.deleteTitle')}</div>
            <p className="cn-delete-text">
              {t('careNotes.deleteConfirmText')}<br />{t('careNotes.deleteIrreversible')}
            </p>
            <div className="cn-delete-preview">
              <div className="cn-delete-preview__top">
                <div>
                  <div className="cn-delete-preview__name">{resName(note.residentId)}</div>
                  <div className="cn-delete-preview__room">{resRoom(note.residentId, t)}</div>
                </div>
                <span className={`cn-badge cn-badge--${note.noteType}`}>{NOTE_TYPE_LABELS[note.noteType]}</span>
              </div>
              <div className="cn-delete-preview__content">
                "{note.content?.slice(0, 120)}{note.content?.length > 120 ? '...' : ''}"
              </div>
              <div className="cn-delete-preview__meta">
                <Calendar size={12} />
                {fmtDateTime(note.noteAt)} · {authorNm(note.authorStaffId)}
              </div>
            </div>
          </div>
        </div>
        <div className="cn-modal__footer">
          <button className="cn-btn cn-btn--secondary" onClick={onClose} disabled={saving}>{t('careNotes.cancel')}</button>
          <button className="cn-btn cn-btn--danger" onClick={onConfirm} disabled={saving}>
            {saving ? t('careNotes.deleting') : t('careNotes.deleteNote')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════ History Modal ═══════ */

// Renders one full note snapshot (content + all fields for its noteType) — used to
// show the complete "before" and "after" state of an edit, not just which fields changed.
// `other` is the opposite snapshot (after when rendering before, and vice versa) — any
// field that differs from `other` is visually highlighted so it's obvious at a glance
// which fields actually changed vs. which stayed the same (e.g. an unchanged record time
// should not be mistaken for a bug just because it looks identical on both sides).
function NoteSnapshotDetail({ data, other, t }) {
  if (!data) return <div className="cn-audit-snapshot__empty">—</div>;
  const meta = data.metadata || {};
  const otherMeta = other?.metadata || {};
  const nt = data.noteType;
  const NOTE_TYPE_LABELS = getNoteTypeLabels(t);
  const PRIORITY_LABELS = getPriorityLabels(t);
  const priority = meta.priority || 'normal';
  const otherPriority = otherMeta.priority || 'normal';

  const metaChanged = (key) => !!other && (meta[key] ?? '') !== (otherMeta[key] ?? '');
  const contentChanged = !!other && (data.content || '') !== (other.content || '');
  const noteTypeChanged = !!other && nt !== other.noteType;
  const priorityChanged = !!other && priority !== otherPriority;
  const noteAtChanged = !!other && data.noteAt && other.noteAt && new Date(data.noteAt).getTime() !== new Date(other.noteAt).getTime();
  const symptomsChanged = !!other && JSON.stringify(meta.symptoms || []) !== JSON.stringify(otherMeta.symptoms || []);

  const ViewRow = ({ label, value, changed }) => value ? (
    <div className={`cn-view-row${changed ? ' cn-view-row--changed' : ''}`}>
      <span className="cn-view-label">{label}</span><span className="cn-view-value">{value}</span>
    </div>
  ) : null;

  return (
    <div className="cn-audit-snapshot">
      <div className="cn-audit-snapshot__badges">
        {nt && <span className={`cn-badge cn-badge--${nt}${noteTypeChanged ? ' cn-badge--changed' : ''}`}>{NOTE_TYPE_LABELS[nt] || nt}</span>}
        <span className={`cn-badge cn-badge--${priority}${priorityChanged ? ' cn-badge--changed' : ''}`}>{PRIORITY_LABELS[priority]}</span>
      </div>
      <div className={`cn-audit-snapshot__content${contentChanged ? ' cn-audit-snapshot__content--changed' : ''}`}>{data.content}</div>

      {nt === 'meal' && (
        <div className="cn-audit-snapshot__meta">
          <ViewRow label={t('careNotes.mealTypeLabel')} value={labelOf(getMealTypes(t), meta.mealType)} changed={metaChanged('mealType')} />
          <ViewRow label={t('careNotes.intakeAmountLabel')} value={labelOf(getIntakeAmounts(t), meta.intakeAmount)} changed={metaChanged('intakeAmount')} />
          <ViewRow label={t('careNotes.appetiteLabel')} value={labelOf(getAppetiteOpts(t), meta.appetite)} changed={metaChanged('appetite')} />
        </div>
      )}
      {nt === 'activity' && (
        <div className="cn-audit-snapshot__meta">
          <ViewRow label={t('careNotes.activityTypeLabel')} value={labelOf(getActivityTypes(t), meta.activityType)} changed={metaChanged('activityType')} />
          <ViewRow label={t('careNotes.timeLabel')} value={meta.duration != null ? `${meta.duration} ${t('careNotes.minutes')}` : null} changed={metaChanged('duration')} />
          <ViewRow label={t('careNotes.participationLabel')} value={labelOf(getParticipation(t), meta.participationLevel)} changed={metaChanged('participationLevel')} />
          <ViewRow label={t('careNotes.moodLabel')} value={labelOf(getMoodOpts(t), meta.mood)} changed={metaChanged('mood')} />
        </div>
      )}
      {nt === 'daily_living' && (
        <div className="cn-audit-snapshot__meta">
          <ViewRow label={t('careNotes.typeLabel')} value={labelOf(getDailyLivingTypes(t), meta.activityType)} changed={metaChanged('activityType')} />
          <ViewRow label={t('careNotes.assistanceLevelLabel')} value={labelOf(getAssistanceLevels(t), meta.assistanceLevel)} changed={metaChanged('assistanceLevel')} />
          <ViewRow label={t('careNotes.statusLabel')} value={labelOf(getCompletionStatuses(t), meta.completionStatus)} changed={metaChanged('completionStatus')} />
          <ViewRow label={t('careNotes.timeLabel')} value={meta.duration != null ? `${meta.duration} ${t('careNotes.minutes')}` : null} changed={metaChanged('duration')} />
          <ViewRow label={t('careNotes.moodLabel')} value={labelOf(getMoodOpts(t), meta.mood)} changed={metaChanged('mood')} />
        </div>
      )}
      {nt === 'health' && (
        <div className="cn-audit-snapshot__meta">
          {Array.isArray(meta.symptoms) && meta.symptoms.length > 0 && (
            <div className={`cn-view-row${symptomsChanged ? ' cn-view-row--changed' : ''}`}><span className="cn-view-label">{t('careNotes.symptomsLabel')}</span><span className="cn-view-value">{meta.symptoms.join(', ')}</span></div>
          )}
          <ViewRow label={t('careNotes.consciousnessLabel')} value={labelOf(getConsciousness(t), meta.consciousness)} changed={metaChanged('consciousness')} />
          <ViewRow label={t('careNotes.fallRiskLabel')} value={labelOf(getFallRisks(t), meta.fallRisk)} changed={metaChanged('fallRisk')} />
          <ViewRow label={t('careNotes.painLevelLabelShort')} value={meta.painLevel != null && meta.painLevel !== '' ? `${meta.painLevel}/10` : null} changed={metaChanged('painLevel')} />
          <ViewRow label={t('careNotes.temperatureLabelShort')} value={meta.temperature != null && meta.temperature !== '' ? `${meta.temperature}°C` : null} changed={metaChanged('temperature')} />
          <ViewRow label={t('careNotes.pulseLabelShort')} value={meta.pulse != null && meta.pulse !== '' ? `${meta.pulse} bpm` : null} changed={metaChanged('pulse')} />
          <ViewRow label={t('careNotes.skinConditionLabel')} value={meta.skinCondition} changed={metaChanged('skinCondition')} />
          <ViewRow label={t('careNotes.physicalChangesLabel')} value={meta.physicalChanges} changed={metaChanged('physicalChanges')} />
        </div>
      )}
      <div className="cn-audit-snapshot__meta">
        <ViewRow label={t('careNotes.recordTimeLabel')} value={fmtDateTime(data.noteAt)} changed={noteAtChanged} />
      </div>
    </div>
  );
}

// Shows the edit history (audit trail) of a single care note — not the resident's
// overall note history — since each nurse only ever deals with one note at a time.
function NoteAuditHistoryModal({ note, onClose }) {
  const { t } = useTranslation();
  const NOTE_TYPE_LABELS = getNoteTypeLabels(t);
  const PRIORITY_LABELS = getPriorityLabels(t);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!note?._id) return;
    let active = true;
    setLoading(true);
    careNoteService.getNoteAuditHistory(note._id)
      .then((data) => { if (active) setLogs(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setLogs([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [note]);

  const stripPriority = (m) => { const c = { ...(m || {}) }; delete c.priority; return c; };

  const diffEntry = (entry) => {
    const before = entry.beforeData || {};
    const after = entry.afterData || {};
    const changes = [];
    if ((before.content || '') !== (after.content || '')) {
      changes.push({ label: t('careNotes.contentLabel'), before: before.content, after: after.content });
    }
    if ((before.noteType || '') !== (after.noteType || '')) {
      changes.push({
        label: t('careNotes.noteTypeSection'),
        before: NOTE_TYPE_LABELS[before.noteType] || before.noteType,
        after: NOTE_TYPE_LABELS[after.noteType] || after.noteType,
      });
    }
    if (before.noteAt && after.noteAt && new Date(before.noteAt).getTime() !== new Date(after.noteAt).getTime()) {
      changes.push({ label: t('careNotes.recordTimeLabel'), before: fmtDateTime(before.noteAt), after: fmtDateTime(after.noteAt) });
    }
    const beforePriority = before.metadata?.priority || 'normal';
    const afterPriority = after.metadata?.priority || 'normal';
    if (beforePriority !== afterPriority) {
      changes.push({ label: t('careNotes.prioritySection'), before: PRIORITY_LABELS[beforePriority], after: PRIORITY_LABELS[afterPriority] });
    }
    if (JSON.stringify(stripPriority(before.metadata)) !== JSON.stringify(stripPriority(after.metadata))) {
      changes.push({ label: t('careNotes.auditFieldOtherDetails'), generic: true });
    }
    return changes;
  };

  return (
    <div className="cn-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cn-modal cn-modal--lg">
        <div className="cn-modal__header">
          <div className="cn-modal__header-text">
            <h2 className="cn-modal__title">{t('careNotes.noteAuditHistoryTitle')}</h2>
            <p className="cn-modal__subtitle">{resName(note.residentId)} · {fmtDateTime(note.noteAt)}</p>
          </div>
          <button className="cn-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cn-modal__body">
          {loading ? (
            <div className="cn-loading"><div className="cn-loading__spinner" /><div className="cn-loading__text">{t('careNotes.loadingHistory')}</div></div>
          ) : logs.length === 0 ? (
            <div className="cn-empty"><div className="cn-empty__icon"><History size={28} /></div><div className="cn-empty__text">{t('careNotes.auditNoChanges')}</div></div>
          ) : (
            <div className="cn-audit-timeline">
              {logs.map((log) => {
                const isCreate = log.action === 'CREATE';
                const changes = isCreate ? [] : diffEntry(log);
                return (
                  <div key={log._id} className="cn-audit-entry">
                    <div className="cn-audit-entry__head">
                      <span className={`cn-badge ${isCreate ? 'cn-badge--audit-create' : 'cn-badge--audit-update'}`}>
                        {isCreate ? t('careNotes.auditActionCreate') : t('careNotes.auditActionUpdate')}
                      </span>
                      <span className="cn-audit-entry__actor">{log.actor?.fullName || '—'}</span>
                      <span className="cn-audit-entry__time">{fmtDateTime(log.createdAt)}</span>
                    </div>
                    {!isCreate && (
                      changes.length === 0 ? (
                        <div className="cn-audit-entry__body cn-audit-entry__body--muted">{t('careNotes.auditNoFieldChange')}</div>
                      ) : (
                        <div className="cn-audit-entry__changes">
                          {changes.map((c, i) => (
                            <div key={i} className="cn-audit-change">
                              <span className="cn-audit-change__label">{c.label}:</span>
                              {c.generic ? (
                                <span className="cn-audit-change__generic">{t('careNotes.auditGenericChanged')}</span>
                              ) : (
                                <>
                                  <span className="cn-audit-change__before">{c.before || '—'}</span>
                                  <span className="cn-audit-change__arrow">→</span>
                                  <span className="cn-audit-change__after">{c.after || '—'}</span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* Full before/after snapshot, not just the diffed fields */}
                    <div className="cn-audit-entry__snapshots" style={isCreate ? { gridTemplateColumns: '1fr' } : undefined}>
                      {!isCreate && (
                        <div className="cn-audit-snapshot-col">
                          <div className="cn-audit-snapshot-col__title">{t('careNotes.auditBefore')}</div>
                          <NoteSnapshotDetail data={log.beforeData} other={log.afterData} t={t} />
                        </div>
                      )}
                      <div className="cn-audit-snapshot-col">
                        <div className="cn-audit-snapshot-col__title">{isCreate ? t('careNotes.contentSection') : t('careNotes.auditAfter')}</div>
                        <NoteSnapshotDetail data={log.afterData} other={isCreate ? null : log.beforeData} t={t} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="cn-modal__footer"><button className="cn-btn cn-btn--secondary" onClick={onClose}>{t('careNotes.close')}</button></div>
      </div>
    </div>
  );
}

/* ═══════ Note Card ═══════ */

function NoteCard({ note, index, canModify, onView, onEdit, onDelete, onHistory }) {
  const { t } = useTranslation();
  const NOTE_TYPE_LABELS = getNoteTypeLabels(t);
  const PRIORITY_LABELS = getPriorityLabels(t);
  const [expanded, setExpanded] = useState(false);
  const priority = getPriority(note);
  const isLong = note.content?.length > 150;

  return (
    <div className="cn-note-card" data-priority={priority} style={{ animationDelay: `${index * 0.04}s`, animation: `cnCardEnter 0.4s cubic-bezier(0.22,1,0.36,1) ${index * 0.04}s both` }}>
      <div className="cn-note-card__avatar">{initials(resName(note.residentId))}</div>
      <div className="cn-note-card__body">
        <div className="cn-note-card__top">
          <span className="cn-note-card__resident-name">{resName(note.residentId)}</span>
          <span className="cn-note-card__resident-room">{resRoom(note.residentId, t)}</span>
          <div className="cn-note-card__badges">
            <span className={`cn-badge cn-badge--${note.noteType}`}>{NOTE_TYPE_LABELS[note.noteType]}</span>
            <span className={`cn-badge cn-badge--${priority}`}>{PRIORITY_LABELS[priority]}</span>
          </div>
        </div>
        <div className={`cn-note-card__content${expanded ? ' cn-note-card__content--expanded' : ''}`}>
          {note.content}
        </div>
        {isLong && (
          <button className="cn-note-card__readmore" onClick={() => setExpanded(!expanded)}>
            {expanded ? t('careNotes.collapse') : t('careNotes.readMore')}
          </button>
        )}
        <div className="cn-note-card__footer">
          <span className="cn-note-card__author">
            <User size={13} />
            {authorNm(note.authorStaffId)}
            <span style={{ color: '#94a3b8' }}>({authorRole(note.authorStaffId, t)})</span>
          </span>
          <span className="cn-note-card__date"><Calendar size={13} />{fmtDate(note.noteAt)} · {fmtTime(note.noteAt)}</span>
        </div>
      </div>
      <div className="cn-note-card__right">
        <div className="cn-note-card__actions">
          <button className="cn-action-btn cn-action-btn--view" title={t('careNotes.viewDetail')} onClick={() => onView(note)}><Eye size={16} /></button>
          {canModify && (
            <>
              <button className="cn-action-btn cn-action-btn--edit" title={t('careNotes.edit')} onClick={() => onEdit(note)}><Pencil size={16} /></button>
              <button className="cn-action-btn cn-action-btn--delete" title={t('careNotes.delete')} onClick={() => onDelete(note)}><Trash2 size={16} /></button>
            </>
          )}
          <button className="cn-action-btn cn-action-btn--history" title={t('careNotes.noteAuditHistoryTooltip')} onClick={() => onHistory(note)}><History size={16} /></button>
        </div>
      </div>
    </div>
  );
}

/* ═══════ Pagination ═══════ */

function Pagination({ page, totalPages, total, onPageChange }) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) { if (end < totalPages - 1) pages.push('...'); pages.push(totalPages); }

  return (
    <div className="cn-pagination">
      <span className="cn-pagination__info">{t('careNotes.showing')} {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total} {t('careNotes.notes')}</span>
      <button className="cn-pagination__btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={16} /></button>
      {pages.map((p, i) =>
        p === '...' ? <span key={`e${i}`} className="cn-pagination__ellipsis">…</span> : (
          <button key={p} className={`cn-pagination__btn${p === page ? ' cn-pagination__btn--active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
        )
      )}
      <button className="cn-pagination__btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}><ChevronRight size={16} /></button>
    </div>
  );
}

/* ═══════ Main Page ═══════ */

function CareNotesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notes, setNotes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [residents, setResidents] = useState([]);
  const [msg, setMsg]             = useState({ text: '', type: '' });
  const [tab, setTab]             = useState('all');
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [residentFilter, setResidentFilter] = useState('');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');
  const [sortBy, setSortBy]               = useState('newest');
  const [modal, setModal] = useState({ type: null, data: null });

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 400); return () => clearTimeout(t); }, [search]);

  const closeModal = () => setModal({ type: null, data: null });

  const canModify = useCallback((note) => {
    if (!user) return false;
    // Backend only ever authorizes the `nurse` role to write (create/edit/delete) care
    // notes — doctor/caregiver get read-only access, so this must match exactly or the
    // Edit/Delete buttons would show for roles that always get a 403 from the API.
    if (user.role !== 'nurse') return false;
    const noteUserId = note.authorStaffId?.userId?._id ?? note.authorStaffId?.userId;
    return String(noteUserId) === String(user._id);
  }, [user]);

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 4000); };

  useEffect(() => {
    careNoteService.getResidents()
      .then((data) => setResidents(Array.isArray(data) ? data : (data?.data || data?.residents || [])))
      .catch(() => setResidents([]));
  }, []);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page, limit: LIMIT,
        sortOrder: sortBy === 'oldest' ? 'asc' : 'desc',
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(typeFilter ? { noteType: typeFilter } : {}),
        ...(residentFilter ? { residentId: residentFilter } : {}),
        // "Trong hôm nay"/"Hôm qua" pin the list to that single day, taking
        // priority over the manual from/to range (backend prefers `date` too).
        ...(sortBy === 'today' ? { date: todayStr() }
          : sortBy === 'yesterday' ? { date: yesterdayStr() }
          : {
            ...(dateFrom ? { from: new Date(dateFrom).toISOString() } : {}),
            ...(dateTo ? { to: new Date(`${dateTo}T23:59:59`).toISOString() } : {}),
          }),
      };
      const result = tab === 'mine' ? await careNoteService.getMyNotes(params) : await careNoteService.listNotes(params);
      let data = result?.data || [];
      if (priorityFilter) {
        data = data.filter((n) => (n.metadata?.priority || 'normal') === priorityFilter);
      }
      setNotes(data);
      setTotal(result?.total || 0);
      setTotalPages(result?.totalPages || 1);
    } catch (err) {
      showMsg(err?.response?.data?.message || t('careNotes.errLoadNotes'), 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, page, debouncedSearch, typeFilter, priorityFilter, residentFilter, dateFrom, dateTo, sortBy]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleTabChange = (t) => { setTab(t); setPage(1); };
  const clearFilters = () => { setSearch(''); setTypeFilter(''); setPriorityFilter(''); setResidentFilter(''); setDateFrom(''); setDateTo(''); setSortBy('newest'); setPage(1); };
  const hasFilters = search || typeFilter || priorityFilter || residentFilter || dateFrom || dateTo || sortBy !== 'newest';

  const handleCreate = async (payload) => {
    try { await careNoteService.createNote(payload); showMsg(t('careNotes.msgCreated')); closeModal(); await loadNotes(); } catch (err) { showMsg(err?.response?.data?.message || t('careNotes.errCreate'), 'error'); throw err; }
  };
  const handleEdit = async (payload) => {
    try { await careNoteService.updateNote(modal.data._id, payload); showMsg(t('careNotes.msgUpdated')); closeModal(); await loadNotes(); } catch (err) { showMsg(err?.response?.data?.message || t('careNotes.errUpdate'), 'error'); throw err; }
  };
  const handleDelete = async () => {
    setSaving(true);
    try { await careNoteService.deleteNote(modal.data._id); showMsg(t('careNotes.msgDeleted')); closeModal(); await loadNotes(); } catch (err) { showMsg(err?.response?.data?.message || t('careNotes.errDelete'), 'error'); } finally { setSaving(false); }
  };

  const openEdit = (note) => { closeModal(); setTimeout(() => setModal({ type: 'edit', data: note }), 50); };

  const urgentCount = useMemo(() => notes.filter((n) => n.metadata?.priority === 'urgent').length, [notes]);
  const importantCount = useMemo(() => notes.filter((n) => n.metadata?.priority === 'important').length, [notes]);

  if (!user) return <div className="cn-loading"><div className="cn-loading__spinner" /><div className="cn-loading__text">{t('careNotes.loading')}</div></div>;

  return (
    <div className="cn-page">
      {/* Header */}
      <div className="cn-header">
        <div className="cn-header__left">
          <h1 className="cn-header__title">{t('careNotes.pageTitle')}</h1>
          <p className="cn-header__subtitle">{t('careNotes.pageSubtitle')}</p>
        </div>
        {user.role === 'nurse' && (
          <button className="cn-btn cn-btn--primary" onClick={() => setModal({ type: 'create', data: null })}>
            <PlusCircle size={16} /> {t('careNotes.createNote')}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="cn-stats">
        <div className="cn-stat-card">
          <div className="cn-stat-card__icon cn-stat-card__icon--notes"><FileText size={20} /></div>
          <div>
            <div className="cn-stat-card__value">{total}</div>
            <div className="cn-stat-card__label">{t('careNotes.statTotal')}</div>
          </div>
        </div>
        <div className="cn-stat-card">
          <div className="cn-stat-card__icon cn-stat-card__icon--urgent"><AlertTriangle size={20} /></div>
          <div>
            <div className="cn-stat-card__value">{urgentCount}</div>
            <div className="cn-stat-card__label">{t('careNotes.statUrgent')}</div>
          </div>
        </div>
        <div className="cn-stat-card">
          <div className="cn-stat-card__icon cn-stat-card__icon--important"><AlertCircle size={20} /></div>
          <div>
            <div className="cn-stat-card__value">{importantCount}</div>
            <div className="cn-stat-card__label">{t('careNotes.statImportant')}</div>
          </div>
        </div>
        <div className="cn-stat-card">
          <div className="cn-stat-card__icon cn-stat-card__icon--complete"><CheckCircle2 size={20} /></div>
          <div>
            <div className="cn-stat-card__value">{notes.length > 0 ? Math.round((notes.filter((n) => (n.metadata?.priority || 'normal') === 'normal').length / notes.length) * 100) : 0}%</div>
            <div className="cn-stat-card__label">{t('careNotes.statNormal')}</div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {msg.text && <div className={`cn-toast cn-toast--${msg.type}`}>
        {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        {msg.text}
      </div>}

      {/* Filters */}
      <div className="cn-filters">
        <div className="cn-filters__search">
          <Search size={16} className="cn-filters__search-icon" />
          <input placeholder={t('careNotes.searchPlaceholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>

        <div className="cn-filters__row">
          <div className="cn-filters__group">
            <span className="cn-filters__label">{t('careNotes.resident')}</span>
            <select className="cn-filter-select" value={residentFilter} onChange={(e) => { setResidentFilter(e.target.value); setPage(1); }}>
              <option value="">{t('careNotes.allResidents')}</option>
              {residents.map((r) => <option key={r._id} value={r._id}>{r.fullName}</option>)}
            </select>
          </div>
          <div className="cn-filters__group">
            <span className="cn-filters__label">{t('careNotes.fromDate')}</span>
            <input type="date" className="cn-filter-date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="cn-filters__group">
            <span className="cn-filters__label">{t('careNotes.toDate')}</span>
            <input type="date" className="cn-filter-date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div className="cn-filters__row">
          <div className="cn-filters__group">
            <span className="cn-filters__label">{t('careNotes.noteTypeSection')}</span>
            <div className="cn-category-pills">
              {getNoteTypes(t).map((nt) => (
                <button
                  key={nt.value}
                  type="button"
                  className={`cn-category-pill${typeFilter === nt.value ? ' cn-category-pill--active' : ''}`}
                  data-type={nt.value}
                  onClick={() => { setTypeFilter(nt.value); setPage(1); }}
                >
                  {nt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="cn-filters__group">
            <span className="cn-filters__label">{t('careNotes.prioritySection')}</span>
            <div className="cn-priority-pills">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`cn-priority-pill cn-priority-pill--${p}${priorityFilter === p ? ' cn-priority-pill--selected' : ''}`}
                  onClick={() => { setPriorityFilter(priorityFilter === p ? '' : p); setPage(1); }}
                >
                  <span className={`cn-priority-dot cn-priority-dot--${p}`} />
                  {getPriorityLabels(t)[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="cn-filters__row" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {hasFilters && <button className="cn-btn cn-btn--ghost" onClick={clearFilters}><X size={14} /> {t('careNotes.clearFilters')}</button>}
            <span className="cn-filters__result-count">{t('careNotes.found')} <strong>{total}</strong> {t('careNotes.notes')}</span>
          </div>
          <div className="cn-filters__sort">
            <span>{t('careNotes.sortBy')}:</span>
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
              <option value="newest">{t('careNotes.newest')}</option>
              <option value="oldest">{t('careNotes.oldest')}</option>
              <option value="today">{t('careNotes.sortToday')}</option>
              <option value="yesterday">{t('careNotes.sortYesterday')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="cn-tabs">
        <button className={`cn-tab${tab === 'all' ? ' cn-tab--active' : ''}`} onClick={() => handleTabChange('all')}>
          {t('careNotes.tabAll')} {tab === 'all' && total > 0 ? `(${total})` : ''}
        </button>
        {user.role === 'nurse' && (
          <button className={`cn-tab${tab === 'mine' ? ' cn-tab--active' : ''}`} onClick={() => handleTabChange('mine')}>
            {t('careNotes.tabMine')} {tab === 'mine' && total > 0 ? `(${total})` : ''}
          </button>
        )}
      </div>

      {/* Note Cards */}
      {loading ? (
        <div className="cn-loading"><div className="cn-loading__spinner" /><div className="cn-loading__text">{t('careNotes.loadingNotes')}</div></div>
      ) : notes.length === 0 ? (
        <div className="cn-empty">
          <div className="cn-empty__icon"><FileText size={28} /></div>
          <div className="cn-empty__text">{hasFilters ? t('careNotes.emptyFiltered') : t('careNotes.emptyNoNotes')}</div>
          <div className="cn-empty__hint">{hasFilters ? t('careNotes.emptyFilteredHint') : t('careNotes.emptyNoNotesHint')}</div>
        </div>
      ) : (
        <div className="cn-notes-list">
          {notes.map((note, i) => (
            <NoteCard
              key={note._id}
              note={note}
              index={i}
              canModify={canModify(note)}
              onView={(n) => setModal({ type: 'view', data: n })}
              onEdit={(n) => setModal({ type: 'edit', data: n })}
              onDelete={(n) => setModal({ type: 'delete', data: n })}
              onHistory={(n) => setModal({ type: 'history', data: n })}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      {/* Modals */}
      {modal.type === 'create' && <NoteFormModal mode="create" note={null} residents={residents} onSave={handleCreate} onClose={closeModal} />}
      {modal.type === 'edit' && modal.data && <NoteFormModal mode="edit" note={modal.data} residents={residents} onSave={handleEdit} onClose={closeModal} />}
      {modal.type === 'view' && modal.data && <NoteViewModal note={modal.data} onEdit={openEdit} onClose={closeModal} canModify={canModify(modal.data)} />}
      {modal.type === 'delete' && modal.data && <DeleteConfirmModal note={modal.data} saving={saving} onConfirm={handleDelete} onClose={closeModal} />}
      {modal.type === 'history' && modal.data && <NoteAuditHistoryModal note={modal.data} onClose={closeModal} />}
    </div>
  );
}

export default CareNotesPage;
