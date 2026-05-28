export const getLocalDateString = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** YYYY-MM-DD in UTC — matches backend PAST_DATE (UTC) validation. */
export const getUtcDateString = (d = new Date()) => d.toISOString().slice(0, 10);

