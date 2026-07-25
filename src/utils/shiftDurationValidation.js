export const FLEXIBLE_SHIFT_MIN_HOURS = 1;
export const FLEXIBLE_SHIFT_MAX_HOURS = 12;

const toMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

/**
 * Validates split shift duration. Returns i18n key under admin.staff.shifts.createModal, or null.
 */
export const validateSplitShiftDuration = (startTime, endTime) => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) return 'splitTimeRequired';
  if (end <= start) return 'splitEndBeforeStart';
  const hours = (end - start) / 60;
  if (hours < FLEXIBLE_SHIFT_MIN_HOURS) return 'splitDurationMin';
  if (hours > FLEXIBLE_SHIFT_MAX_HOURS) return 'splitDurationMax';
  return null;
};
