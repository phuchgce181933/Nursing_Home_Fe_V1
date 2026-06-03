import { CATEGORY_FILTER_OPTIONS, SEVERITY_FILTER_OPTIONS } from '../constants';

function BehaviorListFilters({
  workDate,
  observationCategory,
  severity,
  residentId,
  residents,
  loading,
  maxDate,
  onWorkDateChange,
  onObservationCategoryChange,
  onSeverityChange,
  onResidentIdChange,
  onOpenCreate,
  onReload,
}) {
  return (
    <div className="behavior-page__panel behavior-page__filters">
      <h3 className="behavior-page__panel-title">Bộ lọc</h3>
      <div className="behavior-page__form-grid">
        <label>
          Ngày
          <input
            type="date"
            max={maxDate}
            value={workDate}
            onChange={(e) => onWorkDateChange(e.target.value)}
          />
        </label>
        <label>
          Loại quan sát
          <select value={observationCategory} onChange={(e) => onObservationCategoryChange(e.target.value)}>
            {CATEGORY_FILTER_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mức độ
          <select value={severity} onChange={(e) => onSeverityChange(e.target.value)}>
            {SEVERITY_FILTER_OPTIONS.map((o) => (
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
      <div className="behavior-page__actions">
        <button type="button" className="btn-primary" onClick={onOpenCreate}>
          + Ghi nhận mới
        </button>
        <button type="button" className="btn-secondary" disabled={loading} onClick={onReload}>
          {loading ? 'Đang tải...' : 'Tải lại'}
        </button>
      </div>
    </div>
  );
}

export default BehaviorListFilters;
