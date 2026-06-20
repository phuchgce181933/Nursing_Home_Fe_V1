import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlusCircle, Search, Eye, Pencil, Trash2, History,
  FileText, AlertTriangle, CheckCircle2, Clock,
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

function MetaFormSection({ noteType, meta, setMeta }) {
  const { t } = useTranslation();
  const setM = (f) => (e) => setMeta((p) => ({ ...p, [f]: e.target ? e.target.value : e }));

  const SelectField = ({ label, field, options }) => (
    <div className="cn-form-group">
      <label className="cn-form-label">{label}</label>
      <select className="cn-form-input" value={meta[field] || ''} onChange={setM(field)}>
        <option value="">{t('careNotes.selectPlaceholder')}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const NumberField = ({ label, field, placeholder, min, max, step }) => (
    <div className="cn-form-group">
      <label className="cn-form-label">{label}</label>
      <input type="number" className="cn-form-input" min={min} max={max} step={step} placeholder={placeholder} value={meta[field] ?? ''} onChange={setM(field)} />
    </div>
  );

  const TextField = ({ label, field, placeholder, rows }) => (
    <div className="cn-form-group">
      <label className="cn-form-label">{label}</label>
      {rows ? (
        <textarea className="cn-form-input" rows={rows} placeholder={placeholder} value={meta[field] || ''} onChange={setM(field)} />
      ) : (
        <input type="text" className="cn-form-input" placeholder={placeholder} value={meta[field] || ''} onChange={setM(field)} />
      )}
    </div>
  );

  if (noteType === 'meal') return (
    <div className="cn-meta-section">
      <div className="cn-meta-section__title">{t('careNotes.mealDetails')}</div>
      <div className="cn-meta-grid">
        <SelectField label={t('careNotes.mealTypeLabel')} field="mealType" options={getMealTypes(t)} />
        <SelectField label={t('careNotes.intakeAmountLabel')} field="intakeAmount" options={getIntakeAmounts(t)} />
        <SelectField label={t('careNotes.appetiteLabel')} field="appetite" options={getAppetiteOpts(t)} />
      </div>
    </div>
  );

  if (noteType === 'activity') return (
    <div className="cn-meta-section">
      <div className="cn-meta-section__title">{t('careNotes.activityDetails')}</div>
      <div className="cn-meta-grid">
        <SelectField label={t('careNotes.activityTypeLabel')} field="activityType" options={getActivityTypes(t)} />
        <NumberField label={t('careNotes.durationMinutes')} field="duration" placeholder={t('careNotes.egThirty')} min={0} />
        <SelectField label={t('careNotes.participationLabel')} field="participationLevel" options={getParticipation(t)} />
        <SelectField label={t('careNotes.moodLabel')} field="mood" options={getMoodOpts(t)} />
      </div>
    </div>
  );

  if (noteType === 'daily_living') return (
    <div className="cn-meta-section">
      <div className="cn-meta-section__title">{t('careNotes.dailyLivingDetails')}</div>
      <div className="cn-meta-grid">
        <SelectField label={t('careNotes.activityTypeLabel')} field="activityType" options={getDailyLivingTypes(t)} />
        <SelectField label={t('careNotes.assistanceLevelLabel')} field="assistanceLevel" options={getAssistanceLevels(t)} />
        <SelectField label={t('careNotes.statusLabel')} field="completionStatus" options={getCompletionStatuses(t)} />
        <NumberField label={t('careNotes.durationMinutes')} field="duration" placeholder={t('careNotes.egTwenty')} min={0} />
        <SelectField label={t('careNotes.moodLabel')} field="mood" options={getMoodOpts(t)} />
      </div>
    </div>
  );

  if (noteType === 'health') return (
    <div className="cn-meta-section">
      <div className="cn-meta-section__title">{t('careNotes.healthDetails')}</div>
      <div className="cn-meta-grid">
        <TextField label={t('careNotes.symptomsLabel')} field="symptomsText" placeholder={t('careNotes.symptomsPlaceholder')} />
        <SelectField label={t('careNotes.consciousnessLabel')} field="consciousness" options={getConsciousness(t)} />
        <SelectField label={t('careNotes.fallRiskLabel')} field="fallRisk" options={getFallRisks(t)} />
        <NumberField label={t('careNotes.painLevelLabel')} field="painLevel" placeholder="0–10" min={0} max={10} />
        <NumberField label={t('careNotes.temperatureLabel')} field="temperature" placeholder={t('careNotes.egTemp')} min={30} max={45} step={0.1} />
        <NumberField label={t('careNotes.pulseLabel')} field="pulse" placeholder={t('careNotes.egPulse')} min={20} max={300} />
        <TextField label={t('careNotes.skinConditionLabel')} field="skinCondition" placeholder={t('careNotes.describePlaceholder')} />
        <TextField label={t('careNotes.physicalChangesLabel')} field="physicalChanges" placeholder={t('careNotes.physicalChangesPlaceholder')} rows={2} />
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

  const setF = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target ? e.target.value : e }));

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

  const validate = () => {
    const errs = {};
    if (!form.residentId) errs.residentId = t('careNotes.errSelectResident');
    if (!form.content || form.content.trim().length < 5) errs.content = t('careNotes.errContentMin');
    if (form.noteAt && new Date(form.noteAt) > new Date()) errs.noteAt = t('careNotes.errFutureTime');
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
      <div className="cn-modal cn-modal--lg">
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
          <MetaFormSection noteType={form.noteType} meta={meta} setMeta={setMeta} />
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

function HistoryModal({ resident, onClose }) {
  const { t } = useTranslation();
  const NOTE_TYPE_LABELS = getNoteTypeLabels(t);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    if (!resident) return;
    let active = true;
    setLoading(true);
    careNoteService.getNoteHistory(resId(resident), typeFilter ? { noteType: typeFilter } : {})
      .then((data) => { if (active) setHistory(Array.isArray(data) ? data : (data?.data || [])); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [resident, typeFilter]);

  return (
    <div className="cn-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cn-modal cn-modal--lg">
        <div className="cn-modal__header">
          <div className="cn-modal__header-text">
            <h2 className="cn-modal__title">{t('careNotes.historyTitle')} — {resName(resident)}</h2>
          </div>
          <button className="cn-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cn-modal__body">
          <div className="cn-history-filter">
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{t('careNotes.filterType')}:</span>
            <select className="cn-filter-select" style={{ width: 160 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">{t('careNotes.noteTypeAll')}</option>
              {Object.entries(NOTE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {loading ? (
            <div className="cn-loading"><div className="cn-loading__spinner" /><div className="cn-loading__text">{t('careNotes.loadingHistory')}</div></div>
          ) : history.length === 0 ? (
            <div className="cn-empty"><div className="cn-empty__icon"><FileText size={28} /></div><div className="cn-empty__text">{t('careNotes.noNotes')}</div></div>
          ) : (
            <div className="cn-history-table-wrap">
              <table className="cn-history-table">
                <thead><tr><th>{t('careNotes.colType')}</th><th>{t('careNotes.colContent')}</th><th>{t('careNotes.colAuthor')}</th><th>{t('careNotes.colTime')}</th></tr></thead>
                <tbody>
                  {history.map((n) => (
                    <tr key={n._id}>
                      <td><span className={`cn-badge cn-badge--${n.noteType}`}>{NOTE_TYPE_LABELS[n.noteType]}</span></td>
                      <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</td>
                      <td>{authorNm(n.authorStaffId)}</td>
                      <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>{fmtDateTime(n.noteAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <button className="cn-action-btn cn-action-btn--history" title={t('careNotes.residentHistory')} onClick={() => onHistory(note.residentId)}><History size={16} /></button>
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
  const [modal, setModal] = useState({ type: null, data: null });

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 400); return () => clearTimeout(t); }, [search]);

  const closeModal = () => setModal({ type: null, data: null });

  const canModify = useCallback((note) => {
    if (!user) return false;
    if (user.role === 'doctor' || user.role === 'admin') return true;
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
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(typeFilter ? { noteType: typeFilter } : {}),
        ...(residentFilter ? { residentId: residentFilter } : {}),
        ...(dateFrom ? { from: new Date(dateFrom).toISOString() } : {}),
        ...(dateTo ? { to: new Date(`${dateTo}T23:59:59`).toISOString() } : {}),
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
  }, [tab, page, debouncedSearch, typeFilter, priorityFilter, residentFilter, dateFrom, dateTo]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleTabChange = (t) => { setTab(t); setPage(1); };
  const clearFilters = () => { setSearch(''); setTypeFilter(''); setPriorityFilter(''); setResidentFilter(''); setDateFrom(''); setDateTo(''); setPage(1); };
  const hasFilters = search || typeFilter || priorityFilter || residentFilter || dateFrom || dateTo;

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

  if (!user) return <div className="cn-loading"><div className="cn-loading__spinner" /><div className="cn-loading__text">{t('careNotes.loading')}</div></div>;

  return (
    <div className="cn-page">
      {/* Header */}
      <div className="cn-header">
        <div className="cn-header__left">
          <h1 className="cn-header__title">{t('careNotes.pageTitle')}</h1>
          <p className="cn-header__subtitle">{t('careNotes.pageSubtitle')}</p>
        </div>
        <button className="cn-btn cn-btn--primary" onClick={() => setModal({ type: 'create', data: null })}>
          <PlusCircle size={16} /> {t('careNotes.createNote')}
        </button>
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
          <div className="cn-filters__group">
            <span className="cn-filters__label">{t('careNotes.author')}</span>
            <select className="cn-filter-select" value={residentFilter} disabled>
              <option>{t('careNotes.noteTypeAll')}</option>
            </select>
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
            <select><option>{t('careNotes.newest')}</option></select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="cn-tabs">
        <button className={`cn-tab${tab === 'all' ? ' cn-tab--active' : ''}`} onClick={() => handleTabChange('all')}>
          {t('careNotes.tabAll')} {tab === 'all' && total > 0 ? `(${total})` : ''}
        </button>
        <button className={`cn-tab${tab === 'mine' ? ' cn-tab--active' : ''}`} onClick={() => handleTabChange('mine')}>
          {t('careNotes.tabMine')} {tab === 'mine' && total > 0 ? `(${total})` : ''}
        </button>
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
              onHistory={(r) => setModal({ type: 'history', data: r })}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

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
          <div className="cn-stat-card__icon cn-stat-card__icon--complete"><CheckCircle2 size={20} /></div>
          <div>
            <div className="cn-stat-card__value">{notes.length > 0 ? Math.round((notes.filter((n) => (n.metadata?.priority || 'normal') === 'normal').length / notes.length) * 100) : 0}%</div>
            <div className="cn-stat-card__label">{t('careNotes.statNormal')}</div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal.type === 'create' && <NoteFormModal mode="create" note={null} residents={residents} onSave={handleCreate} onClose={closeModal} />}
      {modal.type === 'edit' && modal.data && <NoteFormModal mode="edit" note={modal.data} residents={residents} onSave={handleEdit} onClose={closeModal} />}
      {modal.type === 'view' && modal.data && <NoteViewModal note={modal.data} onEdit={openEdit} onClose={closeModal} canModify={canModify(modal.data)} />}
      {modal.type === 'delete' && modal.data && <DeleteConfirmModal note={modal.data} saving={saving} onConfirm={handleDelete} onClose={closeModal} />}
      {modal.type === 'history' && modal.data && <HistoryModal resident={modal.data} onClose={closeModal} />}
    </div>
  );
}

export default CareNotesPage;
