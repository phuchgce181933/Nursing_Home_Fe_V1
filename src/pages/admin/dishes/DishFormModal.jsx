import { useTranslation } from 'react-i18next';
import {
  filterDishCaloriesInput,
  filterDishIngredientsInput,
  filterDishNameInput,
} from '../../../utils/dishValidation';

export default function DishFormModal({
  editingId,
  formData,
  onChange,
  onSave,
  onClose,
  error,
  success,
  submitting,
}) {
  const { t } = useTranslation();
  const ns = 'admin.dishes';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal staff-profile-modal dish-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title">
          {editingId ? t(`${ns}.editTitle`) : t(`${ns}.createTitle`)}
        </h2>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <div className="form-grid">
          <div className="form-group form-grid--full">
            <label htmlFor="dish-name">{t(`${ns}.fieldName`)} *</label>
            <input
              id="dish-name"
              type="text"
              value={formData.name}
              onChange={(e) => onChange({ ...formData, name: filterDishNameInput(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="dish-calories">{t(`${ns}.fieldCalories`)} *</label>
            <input
              id="dish-calories"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.calories}
              onChange={(e) => onChange({ ...formData, calories: filterDishCaloriesInput(e.target.value) })}
            />
          </div>
          <div className="form-group form-grid--full">
            <label htmlFor="dish-ingredients">{t(`${ns}.fieldIngredients`)}</label>
            <input
              id="dish-ingredients"
              type="text"
              placeholder={t(`${ns}.ingredientsPlaceholder`)}
              value={formData.ingredients}
              onChange={(e) =>
                onChange({ ...formData, ingredients: filterDishIngredientsInput(e.target.value) })
              }
            />
          </div>
          <div className="form-group form-grid--full form-group--checkbox">
            <input
              id="dish-active"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => onChange({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="dish-active">{t(`${ns}.fieldActive`)}</label>
          </div>
        </div>

        <div className="modal__actions">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn-save" onClick={onSave} disabled={submitting}>
            {submitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
