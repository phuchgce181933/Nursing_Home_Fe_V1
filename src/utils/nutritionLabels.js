import i18n from '../i18n';

function resolveT(t) {
  return t || ((key, opts) => i18n.t(key, opts));
}

function resolveLocale(language) {
  const lang = language || i18n.language;
  return lang?.startsWith('vi') ? 'vi-VN' : 'en-US';
}

export const careStageLabel = (v, t) => {
  const tt = resolveT(t);
  if (!v) return '—';
  return tt(`common.careStage.${v}`, { defaultValue: v });
};

export const mealTypeLabel = (v, t) => {
  const tt = resolveT(t);
  if (!v) return '—';
  return tt(`common.mealType.${v}`, { defaultValue: v });
};

export const dietTypeLabel = (v, t) => {
  const tt = resolveT(t);
  if (!v) return '—';
  return tt(`common.dietType.${v}`, { defaultValue: v });
};

export const planStatusLabel = (v, t) => {
  const tt = resolveT(t);
  if (!v) return '—';
  return tt(`common.planStatus.${v}`, { defaultValue: v });
};

export const formatLocaleDate = (dateStr, language) => {
  if (!dateStr) return '—';
  return new Date(`${String(dateStr).slice(0, 10)}T00:00:00`).toLocaleDateString(resolveLocale(language));
};

/** @deprecated Use formatLocaleDate */
export const formatVNDate = (dateStr) => formatLocaleDate(dateStr);

export const formatLocaleDateTime = (value, language) => {
  if (!value) return '—';
  return new Date(value).toLocaleString(resolveLocale(language));
};

/** @deprecated Use formatLocaleDateTime */
export const formatVNDateTime = (value) => formatLocaleDateTime(value);

export const intakeStatusLabel = (v, t) => {
  const tt = resolveT(t);
  if (!v) return '—';
  return tt(`common.intakeStatus.${v}`, { defaultValue: v });
};

export const sourceLabel = (v, t) => {
  const tt = resolveT(t);
  if (v === 'template') return tt('nurse.mealPlans.sourceTemplate');
  if (v === 'manual') return tt('nurse.mealPlans.sourceManual');
  if (v === 'catalog') return tt('nurse.mealPlans.sourceCatalog');
  return v || '—';
};
