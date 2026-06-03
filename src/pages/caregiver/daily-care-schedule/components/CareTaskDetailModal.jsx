import { useCallback, useEffect, useState } from 'react';
import caregiverCareTaskService from '../../../../services/caregiverCareTask.service';
import {
  CARE_TASK_STATUS_LABELS,
  careTaskTypeLabel,
} from '../../../../utils/blockingCareTasks';
import {
  CARE_LEVEL_LABELS,
  STATUS_ACTION_LABELS,
  TASK_STATUS_NEXT,
} from '../constants';

function shiftDetail(shift) {
  if (!shift) return '—';
  return `${shift.name || 'Ca'} · ${shift.startTime || '—'} – ${shift.endTime || '—'} (${shift.status || '—'})`;
}

function CareTaskDetailModal({ taskId, onClose, onUpdated }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError('');
    try {
      const data = await caregiverCareTaskService.getTask(taskId);
      setTask(data);
      setNotes(data.notes || '');
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được chi tiết nhiệm vụ');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleStatus = async (status) => {
    setSaving(true);
    setError('');
    try {
      await caregiverCareTaskService.updateStatus(taskId, status, notes.trim());
      onUpdated();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (!taskId) return null;

  const nextStatuses = task ? TASK_STATUS_NEXT[task.status] || [] : [];
  const resident = task?.residentId;
  const roomNum = resident?.roomId?.roomNumber;

  return (
    <div className="daily-care-page__modal-overlay" onClick={saving ? undefined : onClose}>
      <div
        className="daily-care-page__modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="daily-care-page__modal-header">
          <h3 className="daily-care-page__modal-title">Chi tiết nhiệm vụ</h3>
          <button type="button" className="daily-care-page__modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>
        <div className="daily-care-page__modal-body">
          {loading && <p>Đang tải...</p>}
          {error && <p className="form-error">{error}</p>}
          {!loading && task && (
            <>
              <div className="daily-care-page__detail-grid">
                <p>
                  <strong>Giờ:</strong> {task.scheduledTime}
                </p>
                <p>
                  <strong>Cư dân:</strong> {resident?.fullName || resident?.residentCode || '—'}
                  {roomNum != null && roomNum !== '' && <> · Phòng {roomNum}</>}
                </p>
                <p>
                  <strong>Loại:</strong> {careTaskTypeLabel(task.taskType)}
                </p>
                <p>
                  <strong>Mức độ:</strong> {CARE_LEVEL_LABELS[task.careLevel] || task.careLevel}
                </p>
                <p>
                  <strong>Ca:</strong> {shiftDetail(task.shiftId)}
                </p>
                <p>
                  <strong>Trạng thái:</strong>{' '}
                  <span className={`daily-care-page__status daily-care-page__status--${task.status}`}>
                    {CARE_TASK_STATUS_LABELS[task.status] || task.status}
                  </span>
                </p>
              </div>
              <label className="daily-care-page__notes-field">
                Ghi chú
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={saving || !nextStatuses.length}
                />
              </label>
              {nextStatuses.length > 0 && (
                <div className="daily-care-page__actions">
                  {nextStatuses.map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={st === 'skipped' ? 'btn-secondary' : 'btn-primary'}
                      disabled={saving}
                      onClick={() => handleStatus(st)}
                    >
                      {saving ? 'Đang lưu...' : STATUS_ACTION_LABELS[st] || st}
                    </button>
                  ))}
                </div>
              )}
              {!nextStatuses.length && (
                <p className="daily-care-page__hint">
                  Nhiệm vụ đã kết thúc. Trạng thái &quot;bỏ lỡ&quot; do hệ thống tự gán khi hết ca.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CareTaskDetailModal;
