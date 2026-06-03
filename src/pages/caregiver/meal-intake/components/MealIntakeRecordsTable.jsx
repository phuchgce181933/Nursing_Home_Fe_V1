import { formatVNDateTime, intakeStatusLabel, mealTypeLabel } from '../../../../utils/nutritionLabels';

function MealIntakeRecordsTable({ records, loading, onEdit, onDelete }) {
  return (
    <div className="meal-intake-page__panel">
      <h3 className="meal-intake-page__panel-title">Danh sách ghi nhận</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Cư dân</th>
            <th>Bữa</th>
            <th>Món</th>
            <th>Tình trạng</th>
            <th>%</th>
            <th>Thời gian</th>
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
          {!loading && records.length === 0 && (
            <tr>
              <td colSpan={7} className="empty-state">
                Chưa có ghi nhận trong bộ lọc này
              </td>
            </tr>
          )}
          {!loading &&
            records.map((row) => (
              <tr key={row._id}>
                <td>{row.residentId?.fullName || row.residentId?.residentCode || '—'}</td>
                <td>{mealTypeLabel(row.mealType)}</td>
                <td>{row.plannedMealName || '—'}</td>
                <td>{intakeStatusLabel(row.intakeStatus)}</td>
                <td>{row.intakeStatus === 'partial' ? `${row.portionPercent ?? '—'}%` : '—'}</td>
                <td>{formatVNDateTime(row.recordedAt)}</td>
                <td className="meal-intake-page__row-actions">
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

export default MealIntakeRecordsTable;
