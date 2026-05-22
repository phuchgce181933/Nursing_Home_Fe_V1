import AppLayout from './AppLayout';
import { useAuth } from '../hooks/useAuth';
import { roleSidebarData } from '../components/sidebar/roleSidebarData';

function RoleLayout() {
  const { user } = useAuth();
  const items = roleSidebarData[user?.role] ?? [];

  return <AppLayout items={items} />;
}

export default RoleLayout;
