export const NON_ASSIGNABLE_ROLES = ['admin'];

export const OPERATIONAL_ASSIGNABLE_ROLES = ['doctor', 'nurse', 'caregiver'];

export const STAFF_ROLE_LABELS = {
  doctor: 'Bác sĩ',
  nurse: 'Y tá',
  caregiver: 'Hộ lý',
  pharmacist: 'Dược sĩ',
  family: 'Gia đình',
  admin: 'Admin',
};

export const ALL_STAFF_ROLE_OPTIONS = Object.entries(STAFF_ROLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const isPrivilegedRole = (role) => NON_ASSIGNABLE_ROLES.includes(role);

export const getCreatableRoleOptions = () => ALL_STAFF_ROLE_OPTIONS;

export const getFilterRoleOptions = () => ALL_STAFF_ROLE_OPTIONS;

export const canActorManageStaffMember = (actorRole, targetStaff) => {
  if (!targetStaff) return false;
  return true;
};
