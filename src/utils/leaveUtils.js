import { getLocalDateString } from './dateUtils';

/** Format API date (UTC midnight) without timezone shift — prefer YYYY-MM-DD slice. */
export const formatLeaveDate = (value) => {
  if (!value) return '—';
  if (typeof value === 'string' && value.length >= 10) return value.slice(0, 10);
  return getLocalDateString(new Date(value));
};

/**
 * Inclusive day count (matches backend calcDays).
 * e.g. 2026-05-29 → 2026-05-30 = 2 days
 */
export const calcInclusiveLeaveDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

export const isStaffOnLeaveForAssignment = (staffMember) =>
  Boolean(staffMember?.shiftSummary?.onLeave);
