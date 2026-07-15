export const DISH_NAME_PATTERN = /^[\p{L}\s]+$/u;
export const DISH_CALORIES_PATTERN = /^\d+$/;
export const DISH_INGREDIENTS_STRING_PATTERN = /^[\p{L}\s,]*$/u;
export const DISH_INGREDIENT_ITEM_PATTERN = /^[\p{L}\s]+$/u;

export const filterDishNameInput = (value) =>
  String(value || '')
    .replace(/[^\p{L}\s]/gu, '')
    .replace(/\s{2,}/g, ' ');

export const filterDishIngredientsInput = (value) =>
  String(value || '').replace(/[^\p{L}\s,]/gu, '');

export const filterDishCaloriesInput = (value) => String(value || '').replace(/\D/g, '');

export const validateDishForm = ({ name, calories, ingredients }) => {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) return 'nameRequired';
  if (!DISH_NAME_PATTERN.test(trimmedName)) return 'nameInvalid';

  const caloriesRaw = calories == null ? '' : String(calories).trim();
  if (!caloriesRaw || !DISH_CALORIES_PATTERN.test(caloriesRaw)) return 'caloriesInvalid';
  const caloriesNum = Number(caloriesRaw);
  if (!Number.isInteger(caloriesNum) || caloriesNum < 0) return 'caloriesInvalid';

  const ingredientsText = String(ingredients || '').trim();
  if (ingredientsText) {
    if (!DISH_INGREDIENTS_STRING_PATTERN.test(ingredientsText)) return 'ingredientsInvalid';
    const items = ingredientsText
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (items.some((item) => !DISH_INGREDIENT_ITEM_PATTERN.test(item))) {
      return 'ingredientsInvalid';
    }
  }

  return '';
};

export const parseDishIngredients = (ingredients) =>
  String(ingredients || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
