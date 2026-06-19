import { useTranslation } from 'react-i18next';
import {
  blockingCareTasksMessage,
  careTaskTypeLabel,
  careTaskStatusLabel,
  formatBlockingWorkDate,
} from '../../utils/blockingCareTasks';

export default function BlockingCareTasksAlert({ message, tasks = [], hint }) {
  const { t, i18n } = useTranslation();

  if (!message && !tasks.length) return null;

  return (
    <div className="blocking-tasks-alert" role="alert">
      {message && (
        <p className="blocking-tasks-alert__message">{blockingCareTasksMessage(message, t)}</p>
      )}
      {hint && <p className="blocking-tasks-alert__hint">{hint}</p>}
      {tasks.length > 0 && (
        <ul className="blocking-tasks-alert__list">
          {tasks.map((task) => (
            <li key={task._id}>
              <strong>{task.residentName || t('admin.staff.blockingTasks.defaultResident')}</strong>
              {' · '}
              {careTaskTypeLabel(task.taskType, t)}
              {' · '}
              {careTaskStatusLabel(task.status, t)}
              {task.workDate ? ` · ${formatBlockingWorkDate(task.workDate, i18n.language)}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
