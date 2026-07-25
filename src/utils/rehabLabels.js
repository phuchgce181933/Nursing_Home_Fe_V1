import i18n from '../i18n';

const NS = 'caregiver.rehabSchedule.labels.sessionType';

function resolveT(t) {
  return t || ((key, opts) => i18n.t(key, opts));
}

export function rehabSessionTypeLabel(type, t) {
  const tt = resolveT(t);
  if (!type) return '—';
  return tt(`${NS}.${type}`, { defaultValue: type });
}

/** @deprecated Use rehabSessionTypeLabel(type, t) */
export const REHAB_SESSION_TYPE_LABELS = {};
