import { useTranslation } from 'react-i18next';
import { dietTypeLabel, formatLocaleDate, mealTypeLabel } from '../../../../utils/nutritionLabels';

function DietPlanDetailModal({ open, loading, detail, workDate, onClose }) {
  const { t, i18n } = useTranslation();
  const ns = 'caregiver.dietPlans.detailModal';
  const c = 'caregiver.common';

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
            {t(`${ns}.title`, { name: resident?.fullName || '...' })}
          </h3>
          <button type="button" className="diet-plans-page__modal-close" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>
        <div className="diet-plans-page__modal-body">
          {loading && <p>{t(`${c}.loadingDetail`)}</p>}
          {!loading && detail && (
            <>
              <p className="diet-plans-page__day-banner">
                <strong>{t(`${c}.dayLabel`)}:</strong> {formatLocaleDate(workDate, i18n.language)} ·{' '}
                <strong>{t(`${c}.residentCodeLabel`)}:</strong> {resident?.residentCode || '—'}
              </p>

              {(resident?.allergies?.length > 0 || resident?.drugAllergies?.length > 0) && (
                <div className="diet-plans-page__alert">
                  {resident.allergies?.length > 0 && (
                    <p>
                      <strong>{t(`${ns}.foodAllergies`)}:</strong> {resident.allergies.join(', ')}
                    </p>
                  )}
                  {resident.drugAllergies?.length > 0 && (
                    <p>
                      <strong>{t(`${ns}.drugAllergies`)}:</strong> {resident.drugAllergies.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {resident?.chronicConditions?.length > 0 && (
                <p className="diet-plans-page__meal-meta" style={{ marginBottom: 12 }}>
                  <strong>{t(`${ns}.chronicConditions`)}:</strong> {resident.chronicConditions.join(', ')}
                </p>
              )}

              <div className="diet-plans-page__section">
                <h4>{t(`${ns}.mealTimes`)}</h4>
                <p className="diet-plans-page__meal-meta">
                  {t(`${ns}.breakfast`)} {mealTimes?.breakfast || '—'} · {t(`${ns}.lunch`)}{' '}
                  {mealTimes?.lunch || '—'} · {t(`${ns}.dinner`)} {mealTimes?.dinner || '—'}
                  {mealTimes?.source === 'published_schedule'
                    ? t(`${ns}.sourcePublished`)
                    : t(`${ns}.sourceDefault`)}
                </p>
              </div>

              <div className="diet-plans-page__section">
                <h4>
                  {t(`${ns}.mealPlan`)}
                  {mealPlan?.planTitle ? ` — ${mealPlan.planTitle}` : ''}
                  {mealPlan?.careStage ? ` (${mealPlan.careStage})` : ''}
                </h4>
                {!mealPlan?.meals?.length && (
                  <p className="diet-plans-page__empty">{t(`${ns}.noMealPlan`)}</p>
                )}
                {mealPlan?.meals?.map((m) => (
                  <div key={m.mealType} className="diet-plans-page__meal-card">
                    <strong>
                      {mealTypeLabel(m.mealType, t)} — {m.mealName}
                    </strong>
                    <p className="diet-plans-page__meal-meta">
                      {t(`${ns}.time`)}: {m.mealTime || '—'}
                      {m.calories != null ? ` · ${m.calories} kcal` : ''}
                    </p>
                    {m.ingredients?.length > 0 && (
                      <p className="diet-plans-page__meal-meta">
                        {t(`${ns}.ingredients`)}: {m.ingredients.join(', ')}
                      </p>
                    )}
                    {(m.nutritionNote || m.stageNote) && (
                      <p className="diet-plans-page__meal-meta">{m.nutritionNote || m.stageNote}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="diet-plans-page__section">
                <h4>
                  {t(`${ns}.specialDiet`)}
                  {specialDiets?.planTitle ? ` — ${specialDiets.planTitle}` : ''}
                </h4>
                {!specialDiets?.entries?.length && (
                  <p className="diet-plans-page__empty">{t(`${ns}.noSpecialDiet`)}</p>
                )}
                {specialDiets?.entries?.map((d, idx) => (
                  <div key={`${d.dietType}-${idx}`} className="diet-plans-page__diet-card">
                    <strong>{dietTypeLabel(d.dietType, t)}</strong>
                    {d.effectiveTime && (
                      <p className="diet-plans-page__meal-meta">
                        {t(`${ns}.effectiveTime`)}: {d.effectiveTime}
                      </p>
                    )}
                    {d.restrictions?.length > 0 && (
                      <p className="diet-plans-page__meal-meta">
                        {t(`${ns}.restrictions`)}: {d.restrictions.join(', ')}
                      </p>
                    )}
                    {d.nutritionGoal && (
                      <p className="diet-plans-page__meal-meta">
                        {t(`${ns}.goal`)}: {d.nutritionGoal}
                      </p>
                    )}
                    {d.notes && <p className="diet-plans-page__meal-meta">{d.notes}</p>}
                  </div>
                ))}
              </div>

              {!hasAnyData && <p className="diet-plans-page__empty">{t(`${ns}.noData`)}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DietPlanDetailModal;
