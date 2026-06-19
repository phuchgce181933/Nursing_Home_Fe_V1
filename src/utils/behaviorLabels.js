import i18n from '../i18n';

const NS = 'caregiver.dailyBehaviors.labels';

function resolveT(t) {
  return t || ((key, opts) => i18n.t(key, opts));
}

export function observationCategoryLabel(cat, t) {
  const tt = resolveT(t);
  if (!cat) return '—';
  return tt(`${NS}.category.${cat}`, { defaultValue: cat });
}

export function moodLevelLabel(level, t) {
  const tt = resolveT(t);
  if (!level) return '—';
  return tt(`${NS}.mood.${level}`, { defaultValue: level });
}

export function behaviorTypeLabel(type, t) {
  const tt = resolveT(t);
  if (!type) return '—';
  return tt(`${NS}.behaviorType.${type}`, { defaultValue: type });
}

export function severityLabel(severity, t) {
  const tt = resolveT(t);
  if (!severity) return '—';
  return tt(`${NS}.severity.${severity}`, { defaultValue: severity });
}

/** @deprecated */
export const OBSERVATION_CATEGORY_LABELS = {};
export const MOOD_LEVEL_LABELS = {};
export const BEHAVIOR_TYPE_LABELS = {};
export const SEVERITY_LABELS = {};
