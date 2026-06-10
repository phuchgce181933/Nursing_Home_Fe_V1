import { useTranslation } from 'react-i18next';
import { careTaskTypeLabel } from '../../../../utils/blockingCareTasks';
import '../../../../styles/caregiver/DailyCareSchedulePage.css';

function shiftLabel(shift, shiftFallback) {
  if (!shift) return '—';
  const name = shift.name || shiftFallback;
  return `${name} · ${shift.startTime || '—'}–${shift.endTime || '—'}`;
}

function CareTasksTable({ tasks, loading, onView, onQuickStatus }) {
  const { t } = useTranslation();

  return (
    <>
      <h3 className="daily-care-page__section-title">{t('caregiver.dailyCareSchedule.tasksToday')}</h3>
      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('common.colTime')}</th>
              <th>{t('common.colResident')}</th>
              <th>{t('caregiver.dailyCareSchedule.colTaskType')}</th>
              <th>{t('caregiver.dailyCareSchedule.colCareLevel')}</th>
              <th>{t('caregiver.dailyCareSchedule.colShift')}</th>
              <th>{t('common.colStatus')}</th>
              <th>{t('common.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="empty-state">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading && tasks.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state">
                  {t('caregiver.dailyCareSchedule.emptyTasks')}
                </td>
              </tr>
            )}
            {!loading &&
              tasks.map((task) => (
                <tr key={task._id}>
                  <td>
                    <strong>{task.scheduledTime || '—'}</strong>
                  </td>
                  <td>{task.residentId?.fullName || task.residentId?.residentCode || '—'}</td>
                  <td>{careTaskTypeLabel(task.taskType)}</td>
                  <td>{t(`common.careLevel.${task.careLevel}`, { defaultValue: task.careLevel || '—' })}</td>
                  <td>
                    <small>{shiftLabel(task.shiftId, t('caregiver.dailyCareSchedule.colShift'))}</small>
                  </td>
                  <td>
                    <span className={`daily-care-page__status daily-care-page__status--${task.status}`}>
                      {t(`common.careTaskStatus.${task.status}`, { defaultValue: task.status })}
                    </span>
                  </td>
                  <td className="daily-care-page__row-actions">
                    <button
                      type="button"
                      className="resident-page__button resident-page__button--ghost"
                      onClick={() => onView(task)}
                    >
                      {t('common.view')}
                    </button>
                    {(task.status === 'pending' || task.status === 'in_progress') && (
                      <button
                        type="button"
                        className="resident-page__button resident-page__button--primary"
                        onClick={() => onQuickStatus(task)}
                      >
                        {t('caregiver.dailyCareSchedule.update')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default CareTasksTable;
