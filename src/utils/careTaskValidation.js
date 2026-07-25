const BLOCKING_TASK_STATUSES = ['pending', 'in_progress'];
export const MIN_STAFF_DUTY_GAP_MINUTES = 5;

export const toMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

export const findStaffDutyGapConflict = (scheduledTime, tasks, staffProfileId) => {
  const newMinutes = toMinutes(scheduledTime);
  if (newMinutes === null) return null;

  for (const task of tasks || []) {
    const taskStaffId = String(task.staffProfileId?._id || task.staffProfileId || '');
    if (taskStaffId !== String(staffProfileId)) continue;
    if (!BLOCKING_TASK_STATUSES.includes(task.status)) continue;
    const existingMinutes = toMinutes(task.scheduledTime);
    if (existingMinutes === null) continue;
    if (Math.abs(newMinutes - existingMinutes) < MIN_STAFF_DUTY_GAP_MINUTES) {
      return task.scheduledTime;
    }
  }
  return null;
};
