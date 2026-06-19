import { useTranslation } from 'react-i18next';

function MealIntakePlannedMealBanner({ context }) {
  const { t } = useTranslation();
  const ns = 'caregiver.mealIntake.plannedMealBanner';

  if (!context) return null;

  if (context.hasExistingRecord) {
    return (
      <p className="meal-intake-page__context meal-intake-page__context--warn">
        {t(`${ns}.duplicate`)}
      </p>
    );
  }

  if (context.plannedMeal) {
    const time = context.plannedMeal.mealTime || context.scheduledMealTime;
    return (
      <p className="meal-intake-page__context">
        {t(`${ns}.published`, { mealName: context.plannedMeal.mealName })}
        {context.plannedMeal.calories != null &&
          t(`${ns}.kcal`, { calories: context.plannedMeal.calories })}
        {time && t(`${ns}.time`, { time })}
      </p>
    );
  }

  return (
    <p className="meal-intake-page__context meal-intake-page__context--warn">
      {t(`${ns}.noMenu`)}
      {context.scheduledMealTime && t(`${ns}.scheduledTime`, { time: context.scheduledMealTime })}
      {t(`${ns}.contactNurse`)}
    </p>
  );
}

export default MealIntakePlannedMealBanner;
