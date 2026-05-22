import { Outlet } from 'react-router-dom';
import Sidebar from '../components/sidebar/Sidebar';
import { useAuth } from '../hooks/useAuth';
import { sidebarData } from '../components/sidebar/roleSidebarData';

function RoleLayout() {
  const { user } = useAuth();
  const roleKey = user?.role?.toLowerCase();
  const items = sidebarData[roleKey] ?? [];

  return (
    <div className="admin-layout">
      <Sidebar items={items} />
      <main className="admin-layout__main">
        <div className="admin-layout__panel">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default RoleLayout;
