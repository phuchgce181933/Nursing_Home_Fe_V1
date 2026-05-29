import { useLocation } from 'react-router-dom';

/** Base path for admin or manager portal routes (`/admin` | `/manager`). */
export function usePortalPrefix() {
  const { pathname } = useLocation();
  return pathname.startsWith('/manager') ? '/manager' : '/admin';
}

export function useIsManagerPortal() {
  const { pathname } = useLocation();
  return pathname.startsWith('/manager');
}
