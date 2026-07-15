import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Search, UtensilsCrossed } from 'lucide-react';
import AdminPageShell from '../../../components/admin/AdminPageShell';
import ListPagination from '../../../components/ui/ListPagination';
import useClientPagination from '../../../hooks/useClientPagination';
import useDebouncedSearch from '../../../hooks/useDebouncedSearch';
import { ADMIN_LIST_PAGE_SIZE } from '../../../constants/adminListPage';
import dishService from '../../../services/dish.service';
import { validateDishForm, parseDishIngredients } from '../../../utils/dishValidation';
import { resolveApiError } from '../../../utils/apiMessage';
import DishTable from './DishTable';
import DishFormModal from './DishFormModal';
import './dishes.css';

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
  const [pageError, setPageError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const resetPageOnSearch = useCallback(() => {}, []);
  const { search, setSearch, debouncedSearch } = useDebouncedSearch({
    onDebouncedChange: resetPageOnSearch,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  const loadDishes = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');
      const result = await dishService.listDishes({
        activeOnly: 'false',
        search: debouncedSearch.trim() || undefined,
      });
      setDishes(result.data || []);
    } catch (err) {
      setPageError(resolveApiError(err, t, `${NS}.loadFailed`));
      setDishes([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, t]);

  useEffect(() => {
    loadDishes();
  }, [loadDishes]);

  const filteredDishes = useMemo(() => {
    if (statusFilter === 'active') return dishes.filter((d) => d.isActive !== false);
    if (statusFilter === 'inactive') return dishes.filter((d) => d.isActive === false);
    return dishes;
  }, [dishes, statusFilter]);

  const {
    paginatedItems: paginatedDishes,
    page,
    setPage,
    totalPages,
    total,
    resetPage,
  } = useClientPagination(filteredDishes, ADMIN_LIST_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, statusFilter, resetPage]);

  const activeCount = dishes.filter((d) => d.isActive !== false).length;
  const inactiveCount = dishes.filter((d) => d.isActive === false).length;

  const clearForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const handleOpenModal = (dish = null) => {
    setModalError('');
    setModalSuccess('');
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
    setModalError('');
    setModalSuccess('');
  };

  const validateForm = () => {
    const errorKey = validateDishForm(formData);
    return errorKey ? t(`${NS}.${errorKey}`) : '';
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setModalError(validationError);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      calories: Number(formData.calories),
      ingredients: parseDishIngredients(formData.ingredients),
      isActive: Boolean(formData.isActive),
    };

    try {
      setSubmitting(true);
      setModalError('');
      setModalSuccess('');
      if (editingId) {
        await dishService.updateDish(editingId, payload);
        setModalSuccess(t(`${NS}.updateSuccess`));
      } else {
        await dishService.createDish(payload);
        setModalSuccess(t(`${NS}.createSuccess`));
      }
      await loadDishes();
      setTimeout(() => {
        handleCloseModal();
        setSuccess(editingId ? t(`${NS}.updateSuccess`) : t(`${NS}.createSuccess`));
        setTimeout(() => setSuccess(''), 1500);
      }, 1200);
    } catch (err) {
      setModalError(resolveApiError(err, t, `${NS}.saveFailed`));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(`${NS}.confirmDelete`))) return;
    try {
      setPageError('');
      const result = await dishService.deleteDish(id);
      if (result?.data?.deactivated) {
        setSuccess(t(`${NS}.deactivateSuccess`));
      } else {
        setSuccess(t(`${NS}.deleteSuccess`));
      }
      await loadDishes();
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      setPageError(resolveApiError(err, t, `${NS}.deleteFailed`));
    }
  };

  return (
    <AdminPageShell
      title={t(`${NS}.title`)}
      subtitle={t(`${NS}.subtitle`)}
      actions={
        <>
          <button
            type="button"
            className="resident-page__button resident-page__button--ghost"
            onClick={loadDishes}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {t('common.refresh')}
          </button>
          <button
            type="button"
            className="resident-page__button resident-page__button--primary"
            onClick={() => handleOpenModal()}
          >
            <Plus size={16} />
            {t(`${NS}.addDish`)}
          </button>
        </>
      }
      stats={[
        {
          label: t(`${NS}.statTotal`),
          value: String(dishes.length).padStart(2, '0'),
          icon: <UtensilsCrossed size={20} />,
        },
        {
          label: t(`${NS}.statActive`),
          value: String(activeCount).padStart(2, '0'),
          icon: <UtensilsCrossed size={20} />,
          iconClass: 'resident-stat__icon--admitted',
        },
        {
          label: t(`${NS}.statInactive`),
          value: String(inactiveCount).padStart(2, '0'),
          icon: <UtensilsCrossed size={20} />,
          iconClass: 'resident-stat__icon--inactive',
        },
      ]}
    >
      <div className="resident-page__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t('common.search')}</span>
            <div className="resident-page__filter-input">
              <Search size={16} />
              <input
                type="search"
                placeholder={t(`${NS}.searchPlaceholder`)}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
          <label className="resident-page__filter">
            <span>{t('common.colStatus')}</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">{t('common.allStatuses')}</option>
              <option value="active">{t(`${NS}.statusActive`)}</option>
              <option value="inactive">{t(`${NS}.statusInactive`)}</option>
            </select>
          </label>
        </div>
      </div>

      {pageError && <div className="resident-page__error">{pageError}</div>}
      {success && !showModal && <div className="form-success">{success}</div>}

      <DishTable
        dishes={paginatedDishes}
        loading={loading}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
      />

      {!loading && filteredDishes.length > 0 && (
        <ListPagination
          page={page}
          totalPages={Math.max(totalPages, 1)}
          total={total}
          onPageChange={setPage}
        />
      )}

      {showModal && (
        <DishFormModal
          editingId={editingId}
          formData={formData}
          onChange={setFormData}
          onSave={handleSave}
          onClose={handleCloseModal}
          error={modalError}
          success={modalSuccess}
          submitting={submitting}
        />
      )}
    </AdminPageShell>
  );
}
