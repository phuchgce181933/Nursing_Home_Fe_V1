import { useTranslation } from 'react-i18next';

function StatusBadge({ isActive, t, ns }) {
  if (isActive) {
    return <span className="status-badge status-badge--active">{t(`${ns}.statusActive`)}</span>;
  }
  return <span className="status-badge status-badge--inactive">{t(`${ns}.statusInactive`)}</span>;
}

export default function DishTable({ dishes, loading, onEdit, onDelete }) {
  const { t } = useTranslation();
  const ns = 'admin.dishes';

  return (
    <div className="resident-page__table">
      <table className="resident-page__table-element">
        <thead>
          <tr className="resident-page__table-header">
            <th>{t(`${ns}.colName`)}</th>
            <th>{t(`${ns}.colCalories`)}</th>
            <th>{t(`${ns}.colIngredients`)}</th>
            <th>{t('common.colStatus')}</th>
            <th>{t('common.colActions')}</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={5} className="resident-page__empty">
                {t('common.loading')}
              </td>
            </tr>
          )}
          {!loading && dishes.length === 0 && (
            <tr>
              <td colSpan={5} className="resident-page__empty">
                {t(`${ns}.empty`)}
              </td>
            </tr>
          )}
          {!loading &&
            dishes.map((dish) => (
              <tr key={dish._id} className="resident-page__table-row">
                <td>
                  <strong>{dish.name}</strong>
                </td>
                <td>{dish.calories}</td>
                <td className="dish-table__ingredients">
                  {Array.isArray(dish.ingredients) && dish.ingredients.length
                    ? dish.ingredients.join(', ')
                    : '—'}
                </td>
                <td>
                  <StatusBadge isActive={dish.isActive !== false} t={t} ns={ns} />
                </td>
                <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="resident-page__action"
                    onClick={() => onEdit(dish)}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    className="resident-page__action"
                    style={{ background: 'rgba(220, 38, 38, 0.12)', color: '#b91c1c' }}
                    onClick={() => onDelete(dish._id)}
                  >
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
