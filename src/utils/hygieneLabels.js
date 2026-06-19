import i18n from '../i18n';

const NS = 'caregiver.hygiene.labels';

function resolveT(t) {
  return t || ((key, opts) => i18n.t(key, opts));
}

export function hygieneCategoryLabel(cat, t) {
  const tt = resolveT(t);
  if (!cat) return '—';
  return tt(`${NS}.category.${cat}`, { defaultValue: cat });
}

export function hygieneActivityLabel(type, t) {
  const tt = resolveT(t);
  if (!type) return '—';
  return tt(`${NS}.activity.${type}`, { defaultValue: type });
}

export function completionStatusLabel(status, t) {
  const tt = resolveT(t);
  if (!status) return '—';
  return tt(`${NS}.completion.${status}`, { defaultValue: status });
}

/** @deprecated Use hygieneCategoryLabel(cat, t) */
export const HYGIENE_CATEGORY_LABELS = {};

/** @deprecated Use hygieneActivityLabel(type, t) */
export const HYGIENE_ACTIVITY_LABELS = {};

/** @deprecated Use completionStatusLabel(status, t) */
export const COMPLETION_STATUS_LABELS = {};
