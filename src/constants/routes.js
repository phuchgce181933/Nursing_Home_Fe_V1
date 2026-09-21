export const ROLE_HOME_PATHS = {
  admin: '/admin/dashboard',
  doctor: '/doctor/dashboard',
  nurse: '/nurse/dashboard',
  caregiver: '/caregiver/dashboard',
  family: '/family/dashboard',
  pharmacist: '/pharmacist/overview',
};

export function getHomePath(role) {
  return ROLE_HOME_PATHS[role] ?? '/profile';
}
