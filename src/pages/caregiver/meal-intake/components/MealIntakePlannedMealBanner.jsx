function MealIntakePlannedMealBanner({ context }) {
  if (!context) return null;

  if (context.hasExistingRecord) {
    return (
      <p className="meal-intake-page__context meal-intake-page__context--warn">
        Đã có ghi nhận cho bữa này trong ngày. Vui lòng đóng và chọn <strong>Sửa</strong> từ danh sách.
      </p>
    );
  }

  if (context.plannedMeal) {
    return (
      <p className="meal-intake-page__context">
        Thực đơn publish: <strong>{context.plannedMeal.mealName}</strong>
        {context.plannedMeal.calories != null && <> · {context.plannedMeal.calories} kcal</>}
        {(context.plannedMeal.mealTime || context.scheduledMealTime) && (
          <> · Giờ {context.plannedMeal.mealTime || context.scheduledMealTime}</>
        )}
      </p>
    );
  }

  return (
    <p className="meal-intake-page__context meal-intake-page__context--warn">
      Chưa có thực đơn publish cho bữa này — không thể ghi nhận.
      {context.scheduledMealTime && <> Giờ dự kiến: {context.scheduledMealTime}.</>}
      {' '}Vui lòng liên hệ điều dưỡng để publish thực đơn trước.
    </p>
  );
}

export default MealIntakePlannedMealBanner;
