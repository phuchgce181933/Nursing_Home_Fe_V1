import { dietTypeLabel, formatVNDate, mealTypeLabel } from '../../../../utils/nutritionLabels';

function DietPlanDetailModal({ open, loading, detail, workDate, onClose }) {
  if (!open) return null;

  const resident = detail?.resident;
  const mealPlan = detail?.mealPlan;
  const specialDiets = detail?.specialDiets;
  const mealTimes = detail?.mealTimes;

  const hasAnyData =
    mealPlan?.meals?.length > 0 ||
    specialDiets?.entries?.length > 0 ||
    mealTimes?.breakfast;

  return (
    <div className="diet-plans-page__modal-overlay" onClick={loading ? undefined : onClose}>
      <div className="diet-plans-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="diet-plans-page__modal-header">
          <h3 className="diet-plans-page__modal-title">
            Chế độ ăn — {resident?.fullName || '...'}
          </h3>
          <button type="button" className="diet-plans-page__modal-close" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>
        <div className="diet-plans-page__modal-body">
          {loading && <p>Đang tải chi tiết...</p>}
          {!loading && detail && (
            <>
              <p className="diet-plans-page__day-banner">
                <strong>Ngày:</strong> {formatVNDate(workDate)} · <strong>Mã cư dân:</strong>{' '}
                {resident?.residentCode || '—'}
              </p>

              {(resident?.allergies?.length > 0 || resident?.drugAllergies?.length > 0) && (
                <div className="diet-plans-page__alert">
                  {resident.allergies?.length > 0 && (
                    <p>
                      <strong>Dị ứng thực phẩm:</strong> {resident.allergies.join(', ')}
                    </p>
                  )}
                  {resident.drugAllergies?.length > 0 && (
                    <p>
                      <strong>Dị ứng thuốc:</strong> {resident.drugAllergies.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {resident?.chronicConditions?.length > 0 && (
                <p className="diet-plans-page__meal-meta" style={{ marginBottom: 12 }}>
                  <strong>Bệnh nền:</strong> {resident.chronicConditions.join(', ')}
                </p>
              )}

              <div className="diet-plans-page__section">
                <h4>Giờ ăn</h4>
                <p className="diet-plans-page__meal-meta">
                  Sáng {mealTimes?.breakfast || '—'} · Trưa {mealTimes?.lunch || '—'} · Tối{' '}
                  {mealTimes?.dinner || '—'}
                  {mealTimes?.source === 'published_schedule' ? ' (lịch đã publish)' : ' (mặc định hệ thống)'}
                </p>
              </div>

              <div className="diet-plans-page__section">
                <h4>
                  Thực đơn
                  {mealPlan?.planTitle ? ` — ${mealPlan.planTitle}` : ''}
                  {mealPlan?.careStage ? ` (${mealPlan.careStage})` : ''}
                </h4>
                {!mealPlan?.meals?.length && (
                  <p className="diet-plans-page__empty">Chưa có thực đơn publish cho cư dân này trong ngày.</p>
                )}
                {mealPlan?.meals?.map((m) => (
                  <div key={m.mealType} className="diet-plans-page__meal-card">
                    <strong>
                      {mealTypeLabel(m.mealType)} — {m.mealName}
                    </strong>
                    <p className="diet-plans-page__meal-meta">
                      Giờ: {m.mealTime || '—'}
                      {m.calories != null ? ` · ${m.calories} kcal` : ''}
                    </p>
                    {m.ingredients?.length > 0 && (
                      <p className="diet-plans-page__meal-meta">Nguyên liệu: {m.ingredients.join(', ')}</p>
                    )}
                    {(m.nutritionNote || m.stageNote) && (
                      <p className="diet-plans-page__meal-meta">
                        {m.nutritionNote || m.stageNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="diet-plans-page__section">
                <h4>
                  Chế độ ăn đặc biệt
                  {specialDiets?.planTitle ? ` — ${specialDiets.planTitle}` : ''}
                </h4>
                {!specialDiets?.entries?.length && (
                  <p className="diet-plans-page__empty">
                    Không có chế độ ăn đặc biệt publish cho cư dân này trong ngày.
                  </p>
                )}
                {specialDiets?.entries?.map((d, idx) => (
                  <div key={`${d.dietType}-${idx}`} className="diet-plans-page__diet-card">
                    <strong>{dietTypeLabel(d.dietType)}</strong>
                    {d.effectiveTime && (
                      <p className="diet-plans-page__meal-meta">Giờ áp dụng: {d.effectiveTime}</p>
                    )}
                    {d.restrictions?.length > 0 && (
                      <p className="diet-plans-page__meal-meta">Hạn chế: {d.restrictions.join(', ')}</p>
                    )}
                    {d.nutritionGoal && (
                      <p className="diet-plans-page__meal-meta">Mục tiêu: {d.nutritionGoal}</p>
                    )}
                    {d.notes && <p className="diet-plans-page__meal-meta">{d.notes}</p>}
                  </div>
                ))}
              </div>

              {!hasAnyData && (
                <p className="diet-plans-page__empty">
                  Điều dưỡng chưa publish thực đơn hoặc chế độ ăn cho ngày này. Vui lòng liên hệ bộ phận dinh dưỡng.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DietPlanDetailModal;
