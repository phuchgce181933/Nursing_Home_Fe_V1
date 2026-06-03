function MealIntakeListFilters({
  workDate,
  residentId,
  residents,
  loading,
  maxDate,
  onWorkDateChange,
  onResidentIdChange,
  onOpenCreate,
  onReload,
}) {
  return (
    <div className="meal-intake-page__panel meal-intake-page__filters">
      <h3 className="meal-intake-page__panel-title">Bộ lọc</h3>
      <div className="meal-intake-page__form-grid">
        <label>
          Ngày
          <input type="date" max={maxDate} value={workDate} onChange={(e) => onWorkDateChange(e.target.value)} />
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
      <div className="meal-intake-page__actions">
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

export default MealIntakeListFilters;
