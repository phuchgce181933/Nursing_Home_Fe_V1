import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import caregiverCareTaskService from '../../../../services/caregiverCareTask.service';
import { careTaskTypeLabel } from '../../../../utils/blockingCareTasks';
import { resolveApiError } from '../../../../utils/apiMessage';
import { TASK_STATUS_NEXT } from '../constants';

function shiftDetail(shift, shiftFallback, t) {
  if (!shift) return '—';
  const name = shift.name || shiftFallback;
  const statusLabel = shift.status
    ? t(`common.shiftStatus.${shift.status}`, { defaultValue: shift.status })
    : '—';
  return `${name} · ${shift.startTime || '—'} – ${shift.endTime || '—'} (${statusLabel})`;
}

function CareTaskDetailModal({ taskId, mode = 'view', ns, onClose, onUpdated }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');

  const isViewMode = mode === 'view';

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError('');
    try {
      const data = await caregiverCareTaskService.getTask(taskId);
      setTask(data);
      setNotes(data.notes || '');
    } catch (e) {
      setError(resolveApiError(e, t, `${ns}.taskDetailLoadFailed`));
    } finally {
      setLoading(false);
    }
  }, [taskId, t, ns]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleStatus = async (status) => {
    if (status === 'skipped' && !notes.trim()) {
      setError(t(`${ns}.skipNotesRequired`, { defaultValue: 'Vui lòng nhập lý do trước khi đánh dấu bỏ qua công việc này.' }));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await caregiverCareTaskService.updateStatus(taskId, status, notes.trim());
      onUpdated();
      onClose();
    } catch (e) {
      setError(resolveApiError(e, t, `${ns}.updateFailed`));
    } finally {
      setSaving(false);
    }
  };

  if (!taskId) return null;

  const nextStatuses = task ? TASK_STATUS_NEXT[task.status] || [] : [];
  const resident = task?.residentId;
  const roomNum = resident?.roomId?.roomNumber;
  const modalTitle = isViewMode ? t(`${ns}.detailTitle`) : t(`${ns}.updateTitle`);
  const modalClass = isViewMode
    ? 'daily-care-page__modal daily-care-page__modal--view'
    : 'daily-care-page__modal daily-care-page__modal--edit';

  const updateContext =
    task &&
    [
      task.scheduledTime || '—',
      resident?.fullName || resident?.residentCode || '—',
      careTaskTypeLabel(task.taskType, t),
    ].join(' · ');

  return (
    <div className="daily-care-page__modal-overlay" onClick={saving ? undefined : onClose}>
      <div
        className={modalClass}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="daily-care-page__modal-header">
          <h3 className="daily-care-page__modal-title">{modalTitle}</h3>
          <button type="button" className="daily-care-page__modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>
        <div className="daily-care-page__modal-body">
          {loading && <p>{t('common.loading')}</p>}
          {error && <p className="form-error">{error}</p>}
          {!loading && task && isViewMode && (
            <>
              <div className="daily-care-page__detail-grid">
                <p>
                  <strong>{t(`${ns}.colTime`)}:</strong> {task.scheduledTime || '—'}
                </p>
                <p>
                  <strong>{t('common.colResident')}:</strong>{' '}
                  {resident?.fullName || resident?.residentCode || '—'}
                  {roomNum != null && roomNum !== '' && (
                    <>
                      {' '}
                      · {t(`${ns}.colRoom`)} {roomNum}
                    </>
                  )}
                </p>
                <p>
                  <strong>{t(`${ns}.colTaskType`)}:</strong> {careTaskTypeLabel(task.taskType, t)}
                </p>
                <p>
                  <strong>{t(`${ns}.colCareLevel`)}:</strong>{' '}
                  {t(`common.careLevel.${task.careLevel}`, { defaultValue: task.careLevel || '—' })}
                </p>
                <p>
                  <strong>{t(`${ns}.colShift`)}:</strong>{' '}
                  {shiftDetail(task.shiftId, t(`${ns}.colShift`), t)}
                </p>
                <p>
                  <strong>{t('common.colStatus')}:</strong>{' '}
                  <span className={`daily-care-page__status daily-care-page__status--${task.status}`}>
                    {t(`common.careTaskStatus.${task.status}`, { defaultValue: task.status })}
                  </span>
                </p>
                <p>
                  <strong>{t(`${ns}.notes`)}:</strong> {task.notes?.trim() ? task.notes : t(`${ns}.noNotes`)}
                </p>
              </div>
              <div className="daily-care-page__actions">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  {t('common.close')}
                </button>
              </div>
            </>
          )}
          {!loading && task && !isViewMode && (
            <>
              <p className="daily-care-page__update-context">{updateContext}</p>
              <label className="daily-care-page__notes-field">
                {t(`${ns}.notes`)}
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={saving || !nextStatuses.length}
                />
              </label>
              {!nextStatuses.length && (
                <p className="daily-care-page__hint">{t(`${ns}.taskEndedHint`)}</p>
              )}
              <div className="daily-care-page__actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
                  {t('common.close')}
                </button>
                {nextStatuses.map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={st === 'skipped' ? 'btn-secondary' : 'btn-primary'}
                    disabled={saving}
                    onClick={() => handleStatus(st)}
                  >
                    {saving ? t('common.saving') : t(`${ns}.statusAction.${st}`, { defaultValue: st })}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CareTaskDetailModal;
