import {
  blockingCareTasksMessage,
  careTaskTypeLabel,
  formatBlockingWorkDate,
  CARE_TASK_STATUS_LABELS,
} from '../../utils/blockingCareTasks';

export default function BlockingCareTasksAlert({ message, tasks = [], hint }) {
  if (!message && !tasks.length) return null;

  return (
    <div className="blocking-tasks-alert" role="alert">
      {message && (
        <p className="blocking-tasks-alert__message">{blockingCareTasksMessage(message)}</p>
      )}
      {hint && <p className="blocking-tasks-alert__hint">{hint}</p>}
      {tasks.length > 0 && (
        <ul className="blocking-tasks-alert__list">
          {tasks.map((t) => (
            <li key={t._id}>
              <strong>{t.residentName || 'Cư dân'}</strong>
              {' · '}
              {careTaskTypeLabel(t.taskType)}
              {' · '}
              {CARE_TASK_STATUS_LABELS[t.status] || t.status}
              {t.workDate ? ` · ${formatBlockingWorkDate(t.workDate)}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
