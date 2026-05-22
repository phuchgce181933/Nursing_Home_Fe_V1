export const ROLE_HOME_PATHS = {
  admin: '/admin/dashboard',
  doctor: '/doctor/dashboard',
  nurse: '/nurse/dashboard',
  family: '/family/dashboard',
};

export function getHomePath(role) {
  const normalizedRole = role?.toLowerCase();
  return ROLE_HOME_PATHS[normalizedRole] ?? '/login';
}
