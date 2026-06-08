import { formatVNDateTime } from '../../../../utils/nutritionLabels';
import {
  behaviorTypeLabel,
  moodLevelLabel,
  observationCategoryLabel,
  severityLabel,
} from '../../../../utils/behaviorLabels';

function detailText(row) {
  if (row.observationCategory === 'mood' && row.moodLevel) {
    return moodLevelLabel(row.moodLevel);
  }
  if (row.behaviorType) {
    return behaviorTypeLabel(row.behaviorType);
  }
  if (row.notes) {
    const short = row.notes.length > 48 ? `${row.notes.slice(0, 48)}…` : row.notes;
    return short;
  }
  return '—';
}

function BehaviorRecordsTable({ records, loading, onEdit, onDelete }) {
  return (
    <div className="behavior-page__panel">
      <h3 className="behavior-page__panel-title">Danh sách ghi nhận</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Cư dân</th>
            <th>Loại</th>
            <th>Chi tiết</th>
            <th>Mức độ</th>
            <th>Thời điểm quan sát</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={6} className="empty-state">
                Đang tải...
              </td>
            </tr>
          )}
          {!loading && records.length === 0 && (
            <tr>
              <td colSpan={6} className="empty-state">
                Chưa có ghi nhận trong bộ lọc này
              </td>
            </tr>
          )}
          {!loading &&
            records.map((row) => (
              <tr key={row._id}>
                <td>{row.residentId?.fullName || row.residentId?.residentCode || '—'}</td>
                <td>
                  <span className={`behavior-page__category behavior-page__category--${row.observationCategory}`}>
                    {observationCategoryLabel(row.observationCategory)}
                  </span>
                </td>
                <td>
                  <span className="behavior-page__detail">{detailText(row)}</span>
                </td>
                <td>
                  <span className={`behavior-page__severity behavior-page__severity--${row.severity || 'normal'}`}>
                    {severityLabel(row.severity)}
                  </span>
                </td>
                <td>{formatVNDateTime(row.observedAt)}</td>
                <td className="behavior-page__row-actions">
                  <button type="button" className="btn btn--sm btn--edit" onClick={() => onEdit(row)}>
                    Sửa
                  </button>
                  <button type="button" className="btn btn--sm btn--delete" onClick={() => onDelete(row)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default BehaviorRecordsTable;
