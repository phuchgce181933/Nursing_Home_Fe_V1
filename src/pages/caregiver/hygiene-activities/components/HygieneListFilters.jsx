import { CATEGORY_FILTER_OPTIONS } from '../constants';

function HygieneListFilters({
  workDate,
  activityCategory,
  residentId,
  residents,
  loading,
  maxDate,
  onWorkDateChange,
  onActivityCategoryChange,
  onResidentIdChange,
  onOpenCreate,
  onReload,
}) {
  return (
    <div className="hygiene-page__panel hygiene-page__filters">
      <h3 className="hygiene-page__panel-title">Bộ lọc</h3>
      <div className="hygiene-page__form-grid">
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
          Nhóm hoạt động
          <select value={activityCategory} onChange={(e) => onActivityCategoryChange(e.target.value)}>
            {CATEGORY_FILTER_OPTIONS.map((o) => (
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
      <div className="hygiene-page__actions">
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

export default HygieneListFilters;
