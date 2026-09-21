import { useTranslation } from 'react-i18next';
import { FaEye, FaPen } from 'react-icons/fa';
import { careTaskTypeLabel } from '../../../../utils/blockingCareTasks';
import '../../../../styles/admin/residentActionIcons.css';
import '../../../../styles/caregiver/DailyCareSchedulePage.css';

function shiftLabel(shift, shiftFallback) {
  if (!shift) return '—';
  const name = shift.name || shiftFallback;
  return `${name} · ${shift.startTime || '—'}–${shift.endTime || '—'}`;
}

function CareTasksTable({ tasks, loading, onView, onQuickStatus, ns = 'caregiver.dailyCareSchedule' }) {
  const { t } = useTranslation();

  return (
    <>
      <h3 className="daily-care-page__section-title">{t(`${ns}.tasksToday`)}</h3>
      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('common.colTime')}</th>
              <th>{t('common.colResident')}</th>
              <th>{t(`${ns}.colTaskType`)}</th>
              <th>{t(`${ns}.colCareLevel`)}</th>
              <th>{t(`${ns}.colShift`)}</th>
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
                  {t(`${ns}.emptyTasks`)}
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
                  <td>{careTaskTypeLabel(task.taskType, t)}</td>
                  <td>{t(`common.careLevel.${task.careLevel}`, { defaultValue: task.careLevel || '—' })}</td>
                  <td>
                    <small>{shiftLabel(task.shiftId, t(`${ns}.colShift`))}</small>
                  </td>
                  <td>
                    <span className={`daily-care-page__status daily-care-page__status--${task.status}`}>
                      {t(`common.careTaskStatus.${task.status}`, { defaultValue: task.status })}
                    </span>
                  </td>
                  <td className="resident-action-cell">
                    <div className="resident-action-group">
                      <button
                        type="button"
                        className="resident-icon-btn resident-icon-btn--view"
                        title={t(`${ns}.viewAction`)}
                        onClick={() => onView(task)}
                      >
                        <FaEye />
                      </button>
                      {(task.status === 'pending' || task.status === 'in_progress') && (
                        <button
                          type="button"
                          className="resident-icon-btn resident-icon-btn--edit"
                          title={t(`${ns}.editAction`)}
                          onClick={() => onQuickStatus(task)}
                        >
                          <FaPen />
                        </button>
                      )}
                    </div>
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
