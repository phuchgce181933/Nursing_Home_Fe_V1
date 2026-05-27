/** Mirrors backend rolePolicy — manager cannot create/assign admin or manager. */

export const NON_ASSIGNABLE_ROLES = ['admin', 'manager'];

export const OPERATIONAL_ASSIGNABLE_ROLES = ['doctor', 'nurse', 'staff'];

export const STAFF_ROLE_LABELS = {
  doctor: 'Bác sĩ',
  nurse: 'Y tá',
  staff: 'Chăm sóc viên',
  manager: 'Quản lý',
  admin: 'Admin',
};

export const ALL_STAFF_ROLE_OPTIONS = Object.entries(STAFF_ROLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const isPrivilegedRole = (role) => NON_ASSIGNABLE_ROLES.includes(role);

export const isManagerActor = (actorRole) => actorRole === 'manager';

export const getCreatableRoleOptions = (actorRole) =>
  isManagerActor(actorRole)
    ? ALL_STAFF_ROLE_OPTIONS.filter((r) => OPERATIONAL_ASSIGNABLE_ROLES.includes(r.value))
    : ALL_STAFF_ROLE_OPTIONS;

export const getFilterRoleOptions = (actorRole) => getCreatableRoleOptions(actorRole);

/** Manager may view privileged accounts in list but cannot edit, ban, or change role. */
export const canActorManageStaffMember = (actorRole, targetStaff) => {
  if (!targetStaff) return false;
  if (!isManagerActor(actorRole)) return true;
  return !isPrivilegedRole(targetStaff.role);
};
