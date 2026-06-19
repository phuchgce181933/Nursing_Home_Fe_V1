import i18n from '../i18n';

/** Aligns with backend CONFLICT_TYPES / CONFLICT_SEVERITIES. */
export const CONFLICT_SEVERITIES = ['ERROR', 'WARNING', 'INFO'];

const CONFLICT_TYPES = [
  'INVALID_TIME',
  'OVERLAP',
  'LEAVE_CONFLICT',
  'MAX_DAILY_HOURS',
  'MULTIPLE_AREAS',
  'ROLE_MISMATCH',
  'STAFF_NOT_ASSIGNABLE',
  'PAST_DATE',
  'ROOM_FLOOR_MISMATCH',
  'OVERTIME',
  'REST_VIOLATION',
  'UNDERSTAFFED',
];

function resolveT(t) {
  return t || ((key, opts) => i18n.t(key, opts));
}

export function getConflictLabel(type, t) {
  const tt = resolveT(t);
  return tt(`admin.staff.shifts.conflicts.${type}`, { defaultValue: type });
}

/** @deprecated Use getConflictLabel(type, t) */
export const CONFLICT_LABEL = Object.fromEntries(
  CONFLICT_TYPES.map((type) => [type, getConflictLabel(type)])
);

export const CONFLICT_ICON = { ERROR: '🔴', WARNING: '🟠', INFO: '🟡' };

const SEVERITY_RANK = { ERROR: 0, WARNING: 1, INFO: 2 };

export const sortConflicts = (conflicts = []) =>
  [...conflicts].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
  );

export const hasBlockingConflicts = (conflicts = []) =>
  conflicts.some((c) => c.severity === 'ERROR');

export const conflictsFromError = (err) => err?.response?.data?.conflicts || [];
