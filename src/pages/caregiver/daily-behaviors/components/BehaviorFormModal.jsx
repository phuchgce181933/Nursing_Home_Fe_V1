import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import dailyBehaviorService from '../../../../services/dailyBehavior.service';
import { resolveApiError } from '../../../../utils/apiMessage';
import { observationCategoryLabel } from '../../../../utils/behaviorLabels';
import {
  getAbnormalSeverityOptions,
  getBehaviorTypeOptions,
  getMoodLevelOptions,
  getObservationCategoryOptions,
  getSeverityOptions,
} from '../constants';

const toDatetimeLocalValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function BehaviorFormModal({ open, mode, recordId, residents, defaultWorkDate, maxDate, onClose, onSuccess }) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';
  const ns = 'caregiver';
  const c = `${ns}.common`;

  const observationCategoryOptions = useMemo(() => getObservationCategoryOptions(t), [t]);
  const moodLevelOptions = useMemo(() => getMoodLevelOptions(t), [t]);
  const behaviorTypeOptions = useMemo(() => getBehaviorTypeOptions(t), [t]);
  const severityOptions = useMemo(() => getSeverityOptions(t), [t]);
  const abnormalSeverityOptions = useMemo(() => getAbnormalSeverityOptions(t), [t]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [workDate, setWorkDate] = useState(defaultWorkDate || '');
  const [residentId, setResidentId] = useState('');
  const [observationCategory, setObservationCategory] = useState('mood');
  const [moodLevel, setMoodLevel] = useState('neutral');
  const [behaviorType, setBehaviorType] = useState('');
  const [severity, setSeverity] = useState('normal');
  const [observedAtLocal, setObservedAtLocal] = useState('');
  const [notes, setNotes] = useState('');
  const [readOnlyMeta, setReadOnlyMeta] = useState(null);

  const handleCategoryChange = (cat) => {
    setObservationCategory(cat);
    if (cat === 'abnormal' && severity === 'normal') {
      setSeverity('mild');
    }
    if (cat === 'mood' && !moodLevel) {
      setMoodLevel('neutral');
    }
  };

  const loadRecord = useCallback(async () => {
    if (!open || !isEdit || !recordId) return;
    setLoading(true);
    setError('');
    try {
      const data = await dailyBehaviorService.getRecord(recordId);
      const rid = String(data.residentId?._id || data.residentId || '');
      const wd = (data.workDate || '').slice(0, 10);
      setWorkDate(wd);
      setResidentId(rid);
      setObservationCategory(data.observationCategory);
      setMoodLevel(data.moodLevel || 'neutral');
      setBehaviorType(data.behaviorType || '');
      setSeverity(data.severity || 'normal');
      setObservedAtLocal(toDatetimeLocalValue(data.observedAt));
      setNotes(data.notes || '');
      setReadOnlyMeta({
        residentName: data.residentId?.fullName || data.residentId?.residentCode,
        workDate: wd,
      });
    } catch (e) {
      setError(resolveApiError(e, t, `${c}.detailLoadFailed`));
    } finally {
      setLoading(false);
    }
  }, [open, isEdit, recordId, t, c]);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (isEdit) {
      loadRecord();
    } else {
      setWorkDate(defaultWorkDate || maxDate);
      setResidentId(residents[0] ? String(residents[0]._id) : '');
      setObservationCategory('mood');
      setMoodLevel('neutral');
      setBehaviorType('');
      setSeverity('normal');
      setObservedAtLocal('');
      setNotes('');
      setReadOnlyMeta(null);
      setLoading(false);
    }
  }, [open, isEdit, defaultWorkDate, maxDate, residents, loadRecord]);

  const buildPayload = () => {
    const payload = {
      observationCategory,
      notes: notes.trim(),
    };
    if (observationCategory === 'mood') {
      payload.moodLevel = moodLevel;
    } else {
      payload.moodLevel = moodLevel || undefined;
    }
    if (behaviorType) payload.behaviorType = behaviorType;
    if (observationCategory === 'abnormal') {
      payload.severity = severity === 'normal' ? 'mild' : severity;
    } else if (severity && severity !== 'normal') {
      payload.severity = severity;
    } else if (isEdit) {
      payload.severity = severity;
    }
    if (observedAtLocal) {
      payload.observedAt = new Date(observedAtLocal).toISOString();
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && !residentId) return setError(t(`${c}.selectResidentRequired`));
    if (observationCategory === 'mood' && !moodLevel) {
      return setError(t(`${c}.selectMoodRequired`));
    }
    if (notes.trim().length < 5) {
      return setError(t(`${c}.descriptionMinLength`));
    }

    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await dailyBehaviorService.updateRecord(recordId, buildPayload());
      } else {
        await dailyBehaviorService.createRecord({
          residentId,
          workDate,
          ...buildPayload(),
        });
      }
      onSuccess();
    } catch (err) {
      setError(resolveApiError(err, t, `${c}.saveFailed`));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const title = isEdit
    ? t(`${ns}.dailyBehaviors.formModal.titleEdit`)
    : t(`${ns}.dailyBehaviors.formModal.titleCreate`);
  const activeSeverityOptions =
    observationCategory === 'abnormal' ? abnormalSeverityOptions : severityOptions;

  return (
    <div className="behavior-page__modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="behavior-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="behavior-page__modal-header">
          <h3 className="behavior-page__modal-title">{title}</h3>
          <button type="button" className="behavior-page__modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>
        <div className="behavior-page__modal-body">
          {loading && <p>{t('common.loading')}</p>}
          {!loading && (
            <form onSubmit={handleSubmit}>
              {isEdit && readOnlyMeta && (
                <div className="behavior-page__readonly-meta">
                  <p>
                    <strong>{t(`${c}.residentLabel`)}:</strong> {readOnlyMeta.residentName || '—'} ·{' '}
                    <strong>{t(`${c}.dateLabel`)}:</strong> {readOnlyMeta.workDate}
                  </p>
                </div>
              )}

              <div className="behavior-page__form-grid">
                {!isEdit && (
                  <>
                    <label>
                      {t(`${c}.dateLabel`)} *
                      <input
                        type="date"
                        max={maxDate}
                        required
                        value={workDate}
                        onChange={(e) => setWorkDate(e.target.value)}
                      />
                    </label>
                    <label>
                      {t(`${c}.residentLabel`)} *
                      <select required value={residentId} onChange={(e) => setResidentId(e.target.value)}>
                        <option value="">{t(`${c}.selectOption`)}</option>
                        {residents.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.fullName || r.residentCode}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                <label>
                  {t(`${c}.observationTypeLabel`)} *
                  <select
                    required
                    value={observationCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    {observationCategoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t(`${c}.observedAtLabel`)}
                  <input
                    type="datetime-local"
                    value={observedAtLocal}
                    onChange={(e) => setObservedAtLocal(e.target.value)}
                  />
                </label>
                {observationCategory === 'mood' && (
                  <label>
                    {t(`${c}.moodLabel`)} *
                    <select required value={moodLevel} onChange={(e) => setMoodLevel(e.target.value)}>
                      {moodLevelOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {(observationCategory === 'behavior' || observationCategory === 'abnormal') && (
                  <label>
                    {t(`${c}.behaviorTypeLabel`)}
                    <select value={behaviorType} onChange={(e) => setBehaviorType(e.target.value)}>
                      <option value="">{t(`${c}.selectNone`)}</option>
                      {behaviorTypeOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  {t(`${c}.severityLabel`)} {observationCategory === 'abnormal' ? '*' : ''}
                  <select
                    required={observationCategory === 'abnormal'}
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    {activeSeverityOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                {!isEdit && observationCategory && (
                  <p className="behavior-page__field-hint behavior-page__field-full">
                    {t(`${ns}.dailyBehaviors.formModal.recordingHint`, {
                      category: observationCategoryLabel(observationCategory, t),
                    })}
                  </p>
                )}
                <label className="behavior-page__field-full">
                  {t(`${c}.descriptionLabel`)}
                  <textarea
                    rows={3}
                    required
                    minLength={5}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t(`${c}.descriptionPlaceholder`)}
                  />
                </label>
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="behavior-page__actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? t(`${c}.savingRecord`) : isEdit ? t(`${c}.update`) : t(`${c}.saveRecord`)}
                </button>
                <button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default BehaviorFormModal;
