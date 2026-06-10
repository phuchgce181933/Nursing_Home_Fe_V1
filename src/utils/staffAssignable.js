/** Matches backend NON_ASSIGNABLE_ROLES */
export const NON_ASSIGNABLE_ROLES = ['admin', 'manager'];

/** Matches backend CARE_TASK_ASSIGNEE_ROLES */
export const CARE_TASK_ASSIGNEE_ROLES = ['nurse', 'doctor'];

export const canReceiveCareTask = (staff) =>
  CARE_TASK_ASSIGNEE_ROLES.includes(String(staff?.role || '').toLowerCase());

const fallbackAssignable = (role) => !NON_ASSIGNABLE_ROLES.includes(String(role || '').toLowerCase());

/** @param {{ assignable?: { shift?: boolean }, role?: string }} staff */
export const canAssignShift = (staff) =>
  staff?.assignable ? staff.assignable.shift !== false : fallbackAssignable(staff?.role);

export const canAssignAreas = (staff) =>
  staff?.assignable ? staff.assignable.areas !== false : fallbackAssignable(staff?.role);

export const canAssignResidents = (staff) =>
  staff?.assignable ? staff.assignable.residents !== false : fallbackAssignable(staff?.role);

export const canAssignCareTask = (staff) => canReceiveCareTask(staff);
