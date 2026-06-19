export const MEAL_TYPE_VALUES = ['breakfast', 'lunch', 'dinner'];

export const INTAKE_STATUS_VALUES = ['full', 'partial', 'refused', 'assisted'];

export const getMealTypeOptions = (t) =>
  MEAL_TYPE_VALUES.map((value) => ({
    value,
    label: t(`common.mealType.${value}`),
  }));

export const getIntakeStatusOptions = (t) =>
  INTAKE_STATUS_VALUES.map((value) => ({
    value,
    label: t(`common.intakeStatus.${value}`),
  }));
