import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import hygieneActivityService from '../../../../services/hygieneActivity.service';
import {
  hygieneActivityLabel,
  hygieneCategoryLabel,
} from '../../../../utils/hygieneLabels';
import {
  ACTIVITY_TYPES_BY_CATEGORY,
  getActivityTypeOptions,
  getCompletionStatusOptions,
} from '../constants';
import HygieneContextBanner from './HygieneContextBanner';

function HygieneFormModal({ open, mode, recordId, residents, defaultWorkDate, maxDate, onClose, onSuccess }) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';
  const ns = 'caregiver';
  const c = `${ns}.common`;

  const activityTypeOptions = useMemo(() => getActivityTypeOptions(t), [t]);
  const completionStatusOptions = useMemo(() => getCompletionStatusOptions(t), [t]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState(null);

  const [workDate, setWorkDate] = useState(defaultWorkDate || '');
  const [residentId, setResidentId] = useState('');
  const [activityType, setActivityType] = useState('bathing');
  const [completionStatus, setCompletionStatus] = useState('completed');
  const [notes, setNotes] = useState('');
  const [readOnlyMeta, setReadOnlyMeta] = useState(null);

  const selectedActivity = useMemo(
    () => activityTypeOptions.find((o) => o.value === activityType),
    [activityType, activityTypeOptions]
  );

  const loadContext = useCallback(async () => {
    if (!residentId || !activityType || !workDate || isEdit) return;
    setContext(null);
    try {
      const data = await hygieneActivityService.getContext({ residentId, workDate, activityType });
      setContext(data);
    } catch {
      setContext(null);
    }
  }, [residentId, workDate, activityType, isEdit]);

  const loadRecord = useCallback(async () => {
    if (!open || !isEdit || !recordId) return;
    setLoading(true);
    setError('');
    try {
      const data = await hygieneActivityService.getRecord(recordId);
      const rid = String(data.residentId?._id || data.residentId || '');
      const wd = (data.workDate || '').slice(0, 10);
      setWorkDate(wd);
      setResidentId(rid);
      setActivityType(data.activityType);
      setCompletionStatus(data.completionStatus);
      setNotes(data.notes || '');
      setReadOnlyMeta({
        residentName: data.residentId?.fullName || data.residentId?.residentCode,
        workDate: wd,
        activityType: data.activityType,
        activityCategory: data.activityCategory,
      });
    } catch (e) {
      setError(e?.response?.data?.message || t(`${c}.detailLoadFailed`));
    } finally {
      setLoading(false);
    }
  }, [open, isEdit, recordId, t, c]);

  useEffect(() => {
    if (!open) return;
    setError('');
    setContext(null);
    if (isEdit) {
      loadRecord();
    } else {
      setWorkDate(defaultWorkDate || maxDate);
      setResidentId(residents[0] ? String(residents[0]._id) : '');
      setActivityType('bathing');
      setCompletionStatus('completed');
      setNotes('');
      setReadOnlyMeta(null);
      setLoading(false);
    }
  }, [open, isEdit, defaultWorkDate, maxDate, residents, loadRecord]);

  useEffect(() => {
    if (open && !isEdit) loadContext();
  }, [open, isEdit, loadContext]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && !residentId) return setError(t(`${c}.selectResidentRequired`));
    if (!isEdit && context?.hasExistingRecord) {
      return setError(t(`${c}.duplicateActivityRecord`));
    }
    if (!isEdit && !context) {
      return setError(t(`${c}.waitForActivityContext`));
    }

    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await hygieneActivityService.updateRecord(recordId, {
          completionStatus,
          notes: notes.trim() || undefined,
        });
      } else {
        await hygieneActivityService.createRecord({
          residentId,
          workDate,
          activityType,
          completionStatus,
          notes: notes.trim() || undefined,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || t(`${c}.saveFailed`));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const title = isEdit
    ? t(`${ns}.hygiene.formModal.titleEdit`)
    : t(`${ns}.hygiene.formModal.titleCreate`);
  const saveDisabled = saving || loading || (!isEdit && (context?.hasExistingRecord || !context));

  return (
    <div className="hygiene-page__modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="hygiene-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="hygiene-page__modal-header">
          <h3 className="hygiene-page__modal-title">{title}</h3>
          <button type="button" className="hygiene-page__modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>
        <div className="hygiene-page__modal-body">
          {loading && <p>{t('common.loading')}</p>}
          {!loading && (
            <form onSubmit={handleSubmit}>
              {isEdit && readOnlyMeta && (
                <div className="hygiene-page__readonly-meta">
                  <p>
                    <strong>{t(`${c}.residentLabel`)}:</strong> {readOnlyMeta.residentName || '—'} ·{' '}
                    <strong>{t(`${c}.dateLabel`)}:</strong> {readOnlyMeta.workDate}
                  </p>
                  <p>
                    <strong>{t(`${c}.activityLabel`)}:</strong>{' '}
                    {hygieneActivityLabel(readOnlyMeta.activityType, t)} (
                    {hygieneCategoryLabel(readOnlyMeta.activityCategory, t)})
                  </p>
                </div>
              )}

              {!isEdit && <HygieneContextBanner context={context} />}

              <div className="hygiene-page__form-grid">
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
                    <label>
                      {t(`${c}.activityLabel`)} *
                      <select required value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                        <optgroup label={t(`${ns}.hygiene.formModal.optgroupPersonal`)}>
                          {ACTIVITY_TYPES_BY_CATEGORY.personal.map((o) => (
                            <option key={o.value} value={o.value}>
                              {hygieneActivityLabel(o.value, t)}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label={t(`${ns}.hygiene.formModal.optgroupEnvironment`)}>
                          {ACTIVITY_TYPES_BY_CATEGORY.environment.map((o) => (
                            <option key={o.value} value={o.value}>
                              {hygieneActivityLabel(o.value, t)}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </label>
                    {selectedActivity && (
                      <p className="hygiene-page__field-hint hygiene-page__field-full">
                        {t(`${ns}.hygiene.formModal.groupHint`, {
                          category: hygieneCategoryLabel(selectedActivity.category, t),
                        })}
                      </p>
                    )}
                  </>
                )}
                <label>
                  {t(`${c}.resultLabel`)} *
                  <select
                    required
                    value={completionStatus}
                    onChange={(e) => setCompletionStatus(e.target.value)}
                  >
                    {completionStatusOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="hygiene-page__field-full">
                  {t(`${c}.notesLabel`)}
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="hygiene-page__actions">
                <button type="submit" className="btn-primary" disabled={saveDisabled}>
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

export default HygieneFormModal;
