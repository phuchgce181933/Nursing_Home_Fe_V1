import { TASK_STATUS_OPTIONS } from '../constants';

function ScheduleFilters({
  workDate,
  status,
  residentId,
  residents,
  loading,
  onWorkDateChange,
  onStatusChange,
  onResidentIdChange,
  onReload,
}) {
  return (
    <div className="daily-care-page__panel daily-care-page__filters">
      <h3 className="daily-care-page__panel-title">Bộ lọc</h3>
      <div className="daily-care-page__form-grid">
        <label>
          Ngày *
          <input
            type="date"
            required
            value={workDate}
            onChange={(e) => onWorkDateChange(e.target.value)}
          />
        </label>
        <label>
          Trạng thái
          <select value={status} onChange={(e) => onStatusChange(e.target.value)}>
            {TASK_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cư dân
          <select value={residentId} onChange={(e) => onResidentIdChange(e.target.value)}>
            <option value="">Tất cả</option>
            {residents.map((r) => (
              <option key={r._id} value={r._id}>
                {r.fullName || r.residentCode}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="daily-care-page__actions">
        <button type="button" className="btn-secondary" disabled={loading} onClick={onReload}>
          {loading ? 'Đang tải...' : 'Tải lại'}
        </button>
      </div>
    </div>
  );
}

export default ScheduleFilters;
