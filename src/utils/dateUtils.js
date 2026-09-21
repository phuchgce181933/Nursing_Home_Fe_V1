const VN_TZ = 'Asia/Ho_Chi_Minh';
const VN_OFFSET = '+07:00';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const getLocalDateString = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** YYYY-MM-DD in UTC — matches backend PAST_DATE (UTC) validation. */
export const getUtcDateString = (d = new Date()) => d.toISOString().slice(0, 10);

/** YYYY-MM-DD in Vietnam timezone — aligns with backend todayVN(). */
export const todayVN = () => new Date().toLocaleDateString('en-CA', { timeZone: VN_TZ });

/** Calendar date YYYY-MM-DD for a stored Date/ISO value in Vietnam. */
export const toVNDateString = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('en-CA', { timeZone: VN_TZ });
};

/** YYYY-MM-DD HH:mm in Vietnam — for displaying server UTC timestamps. */
export const formatDateTimeVN = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const pick = (type) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}`;
};

export const toMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

export const addDaysToDateStr = (dateStr, days) => {
  const base = new Date(`${dateStr}T12:00:00${VN_OFFSET}`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toLocaleDateString('en-CA', { timeZone: VN_TZ });
};

const buildTaskDateTime = (workDateStr, hhmm) => {
  if (!DATE_REGEX.test(workDateStr)) return null;
  const minutes = toMinutes(hhmm);
  if (minutes === null) return null;
  const [h, m] = String(hhmm).trim().split(':');
  return new Date(`${workDateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00${VN_OFFSET}`);
};

const getShiftEndDateTime = (workDateStr, startTime, endTime) => {
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  if (startMinutes === null || endMinutes === null) return null;
  const endDateStr =
    endMinutes <= startMinutes ? addDaysToDateStr(workDateStr, 1) : workDateStr;
  return buildTaskDateTime(endDateStr, endTime);
};

export { getShiftEndDateTime };

const POST_SHIFT_COMPLETE_GRACE_MS = 15 * 60 * 1000;

export const isWithinPostShiftCompleteWindow = (
  workDateStr,
  startTime,
  endTime,
  now = new Date()
) => {
  const endAt = getShiftEndDateTime(workDateStr, startTime, endTime);
  if (!endAt) return false;
  const deadline = new Date(endAt.getTime() + POST_SHIFT_COMPLETE_GRACE_MS);
  return now >= endAt && now <= deadline;
};

export const getPostShiftCompleteMinutesRemaining = (
  workDateStr,
  startTime,
  endTime,
  now = new Date()
) => {
  const endAt = getShiftEndDateTime(workDateStr, startTime, endTime);
  if (!endAt) return 0;
  const deadline = new Date(endAt.getTime() + POST_SHIFT_COMPLETE_GRACE_MS);
  if (now < endAt || now > deadline) return 0;
  return Math.max(1, Math.ceil((deadline - now) / 60000));
};

/** True when shift end instant (VN) is at or before now. */
export const isShiftEnded = (workDateStr, startTime, endTime, now = new Date()) => {
  const endAt = getShiftEndDateTime(workDateStr, startTime, endTime);
  if (!endAt) return true;
  return endAt <= now;
};

/** Mirrors careTaskService.filterShiftsNotEnded — future dates show all shifts. */
export const filterShiftsNotEnded = (shifts, workDateStr, now = new Date()) => {
  const list = shifts || [];
  const today = todayVN();
  if (workDateStr > today) return list;
  return list.filter((s) => !isShiftEnded(workDateStr, s.startTime, s.endTime, now));
};

