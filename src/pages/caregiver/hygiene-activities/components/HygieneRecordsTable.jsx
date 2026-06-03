import { formatVNDateTime } from '../../../../utils/nutritionLabels';
import {
  completionStatusLabel,
  hygieneActivityLabel,
  hygieneCategoryLabel,
} from '../../../../utils/hygieneLabels';

function HygieneRecordsTable({ records, loading, onEdit, onDelete }) {
  return (
    <div className="hygiene-page__panel">
      <h3 className="hygiene-page__panel-title">Danh sách ghi nhận</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Cư dân</th>
            <th>Nhóm</th>
            <th>Hoạt động</th>
            <th>Kết quả</th>
            <th>Thời gian</th>
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
                <td>{hygieneCategoryLabel(row.activityCategory)}</td>
                <td>{hygieneActivityLabel(row.activityType)}</td>
                <td>
                  <span className={`hygiene-page__status hygiene-page__status--${row.completionStatus}`}>
                    {completionStatusLabel(row.completionStatus)}
                  </span>
                </td>
                <td>{formatVNDateTime(row.recordedAt)}</td>
                <td className="hygiene-page__row-actions">
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

export default HygieneRecordsTable;
