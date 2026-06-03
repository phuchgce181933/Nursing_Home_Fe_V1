import {
  CARE_TASK_STATUS_LABELS,
  careTaskTypeLabel,
} from '../../../../utils/blockingCareTasks';
import { CARE_LEVEL_LABELS } from '../constants';

function shiftLabel(shift) {
  if (!shift) return '—';
  const name = shift.name || 'Ca';
  return `${name} · ${shift.startTime || '—'}–${shift.endTime || '—'}`;
}

function CareTasksTable({ tasks, loading, onView, onQuickStatus }) {
  return (
    <div className="daily-care-page__panel">
      <h3 className="daily-care-page__panel-title">Nhiệm vụ trong ngày</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Giờ</th>
            <th>Cư dân</th>
            <th>Loại nhiệm vụ</th>
            <th>Mức độ</th>
            <th>Ca</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={7} className="empty-state">
                Đang tải...
              </td>
            </tr>
          )}
          {!loading && tasks.length === 0 && (
            <tr>
              <td colSpan={7} className="empty-state">
                Không có nhiệm vụ chăm sóc trong ngày này. Nếu bạn kỳ vọng có lịch, vui lòng liên hệ
                quản lý để publish lịch chăm sóc.
              </td>
            </tr>
          )}
          {!loading &&
            tasks.map((t) => (
              <tr key={t._id}>
                <td>
                  <strong>{t.scheduledTime || '—'}</strong>
                </td>
                <td>{t.residentId?.fullName || t.residentId?.residentCode || '—'}</td>
                <td>{careTaskTypeLabel(t.taskType)}</td>
                <td>{CARE_LEVEL_LABELS[t.careLevel] || t.careLevel || '—'}</td>
                <td>
                  <small>{shiftLabel(t.shiftId)}</small>
                </td>
                <td>
                  <span className={`daily-care-page__status daily-care-page__status--${t.status}`}>
                    {CARE_TASK_STATUS_LABELS[t.status] || t.status}
                  </span>
                </td>
                <td className="daily-care-page__row-actions">
                  <button type="button" className="btn btn--sm btn--edit" onClick={() => onView(t)}>
                    Xem
                  </button>
                  {(t.status === 'pending' || t.status === 'in_progress') && (
                    <button
                      type="button"
                      className="btn btn--sm btn-secondary"
                      onClick={() => onQuickStatus(t)}
                    >
                      Cập nhật
                    </button>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default CareTasksTable;
