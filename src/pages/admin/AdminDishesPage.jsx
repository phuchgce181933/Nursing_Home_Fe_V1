import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, RefreshCw, Search, X, UtensilsCrossed } from 'lucide-react';
import dishService from '../../services/dish.service';
import { resolveApiError } from '../../utils/apiMessage';
import '../../styles/admin/AdminCommon.css';
import '../../styles/admin/AdminDishesPage.css';

const EMPTY_FORM = {
  name: '',
  calories: '',
  ingredients: '',
  isActive: true,
};

export default function AdminDishesPage() {
  const { t } = useTranslation();
  const NS = 'admin.dishes';
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const loadDishes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await dishService.listDishes({
        activeOnly: showInactive ? 'false' : 'true',
        search: search.trim() || undefined,
      });
      setDishes(result.data || []);
    } catch (err) {
      setError(resolveApiError(err, t, `${NS}.loadFailed`));
    } finally {
      setLoading(false);
    }
  }, [search, showInactive, t]);

  useEffect(() => {
    loadDishes();
  }, [loadDishes]);

  const clearForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const handleOpenModal = (dish = null) => {
    if (dish) {
      setFormData({
        name: dish.name || '',
        calories: dish.calories ?? '',
        ingredients: Array.isArray(dish.ingredients) ? dish.ingredients.join(', ') : '',
        isActive: dish.isActive !== false,
      });
      setEditingId(dish._id);
    } else {
      clearForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    clearForm();
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    if (!formData.name?.trim()) return t(`${NS}.nameRequired`);
    const calories = Number(formData.calories);
    if (formData.calories === '' || !Number.isFinite(calories) || calories < 0) {
      return t(`${NS}.caloriesInvalid`);
    }
    return '';
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      calories: Number(formData.calories),
      ingredients: String(formData.ingredients || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      isActive: Boolean(formData.isActive),
    };

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      if (editingId) {
        await dishService.updateDish(editingId, payload);
        setSuccess(t(`${NS}.updateSuccess`));
      } else {
        await dishService.createDish(payload);
        setSuccess(t(`${NS}.createSuccess`));
      }
      await loadDishes();
      setTimeout(() => {
        handleCloseModal();
        setSuccess('');
      }, 1200);
    } catch (err) {
      setError(resolveApiError(err, t, `${NS}.saveFailed`));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(`${NS}.confirmDelete`))) return;
    try {
      setError('');
      const result = await dishService.deleteDish(id);
      if (result?.data?.deactivated) {
        setSuccess(t(`${NS}.deactivateSuccess`));
      } else {
        setSuccess(t(`${NS}.deleteSuccess`));
      }
      await loadDishes();
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      setError(resolveApiError(err, t, `${NS}.deleteFailed`));
    }
  };

  const filteredDishes = dishes.filter((d) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return d.name?.toLowerCase().includes(q);
  });

  return (
    <div className="adish-page">
      <header className="adish-header">
        <div className="adish-header__text">
          <h1>
            <UtensilsCrossed size={26} /> {t(`${NS}.title`)}
          </h1>
          <p>{t(`${NS}.subtitle`)}</p>
        </div>
        <div className="adish-header__actions">
          <button className="adish-btn adish-btn--primary" type="button" onClick={() => handleOpenModal()}>
            <Plus size={16} /> {t(`${NS}.addDish`)}
          </button>
          <button className="adish-btn adish-btn--ghost" type="button" onClick={loadDishes}>
            <RefreshCw size={16} /> {t('common.refresh')}
          </button>
        </div>
      </header>

      {error && !showModal && <div className="adish-alert adish-alert--error">{error}</div>}
      {success && !showModal && <div className="adish-alert adish-alert--success">{success}</div>}

      <div className="adish-toolbar">
        <div className="adish-search">
          <Search size={16} />
          <input
            type="text"
            placeholder={t(`${NS}.searchPlaceholder`)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="adish-checkbox">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          {t(`${NS}.showInactive`)}
        </label>
      </div>

      {loading ? (
        <p className="adish-loading">{t('common.loading')}</p>
      ) : (
        <div className="adish-table-card">
          <div className="adish-table-wrapper">
            <table className="adish-table">
              <thead>
                <tr>
                  <th>{t(`${NS}.colName`)}</th>
                  <th>{t(`${NS}.colCalories`)}</th>
                  <th>{t(`${NS}.colIngredients`)}</th>
                  <th>{t('common.colStatus')}</th>
                  <th>{t('common.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDishes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="adish-table__empty">
                      {t(`${NS}.empty`)}
                    </td>
                  </tr>
                )}
                {filteredDishes.map((dish) => (
                  <tr key={dish._id}>
                    <td className="adish-table__name">{dish.name}</td>
                    <td className="adish-table__kcal">{dish.calories}</td>
                    <td className="adish-table__ingredients">
                      {Array.isArray(dish.ingredients) && dish.ingredients.length
                        ? dish.ingredients.join(', ')
                        : '—'}
                    </td>
                    <td>
                      <span
                        className={`adish-badge ${dish.isActive ? 'adish-badge--active' : 'adish-badge--inactive'}`}
                      >
                        {dish.isActive ? t(`${NS}.statusActive`) : t(`${NS}.statusInactive`)}
                      </span>
                    </td>
                    <td>
                      <div className="adish-actions">
                        <button
                          type="button"
                          className="adish-icon-btn"
                          onClick={() => handleOpenModal(dish)}
                          title={t('common.edit')}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="adish-icon-btn adish-icon-btn--danger"
                          onClick={() => handleDelete(dish._id)}
                          title={t('common.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="adm-modal-overlay" onClick={handleCloseModal}>
          <div className="adm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2>{editingId ? t(`${NS}.editTitle`) : t(`${NS}.createTitle`)}</h2>
              <button
                className="adish-modal-close"
                type="button"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                <X size={20} />
              </button>
            </div>
            {(error || success) && (
              <div className="adish-modal-alerts">
                {error && <div className="adish-alert adish-alert--error">{error}</div>}
                {success && <div className="adish-alert adish-alert--success">{success}</div>}
              </div>
            )}
            <div className="adm-modal-body">
              <div className="adm-form-group">
                <label>{t(`${NS}.fieldName`)} *</label>
                <input
                  type="text"
                  className="adm-form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="adm-form-group">
                <label>{t(`${NS}.fieldCalories`)} *</label>
                <input
                  type="number"
                  min="0"
                  className="adm-form-input"
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                />
              </div>
              <div className="adm-form-group">
                <label>{t(`${NS}.fieldIngredients`)}</label>
                <input
                  type="text"
                  className="adm-form-input"
                  placeholder={t(`${NS}.ingredientsPlaceholder`)}
                  value={formData.ingredients}
                  onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                />
              </div>
              <div className="adm-form-group">
                <label className="adish-form-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  {t(`${NS}.fieldActive`)}
                </label>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn-secondary" onClick={handleCloseModal} disabled={submitting}>
                {t('common.cancel')}
              </button>
              <button type="button" className="adm-btn-primary" onClick={handleSave} disabled={submitting}>
                {submitting ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
