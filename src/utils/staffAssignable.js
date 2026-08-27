/** Matches backend NON_ASSIGNABLE_ROLES */
export const NON_ASSIGNABLE_ROLES = ['admin'];

/** Matches backend CARE_TASK_ASSIGNEE_ROLES */
export const CARE_TASK_ASSIGNEE_ROLES = ['nurse', 'doctor', 'caregiver'];

export const canReceiveCareTask = (staff) =>
  CARE_TASK_ASSIGNEE_ROLES.includes(String(staff?.role || '').toLowerCase());

const fallbackAssignable = (role) => !NON_ASSIGNABLE_ROLES.includes(String(role || '').toLowerCase());

const isStaffAccountAssignable = (staff) =>
  staff?.isBanned !== true && staff?.isActive !== false;

/** @param {{ assignable?: { shift?: boolean }, role?: string, isBanned?: boolean, isActive?: boolean }} staff */
export const canAssignShift = (staff) => {
  if (!isStaffAccountAssignable(staff)) return false;
  return staff?.assignable ? staff.assignable.shift !== false : fallbackAssignable(staff?.role);
};

export const canAssignAreas = (staff) => {
  if (!isStaffAccountAssignable(staff)) return false;
  return staff?.assignable ? staff.assignable.areas !== false : fallbackAssignable(staff?.role);
};

export const canAssignResidents = (staff) => {
  if (!isStaffAccountAssignable(staff)) return false;
  return staff?.assignable ? staff.assignable.residents !== false : fallbackAssignable(staff?.role);
};

export const canAssignCareTask = (staff) => canReceiveCareTask(staff);
