import { Outlet, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Sidebar from '../components/sidebar/Sidebar';
import { roleSidebarData } from '../components/sidebar/roleSidebarData';

function RoleLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const items = roleSidebarData[user.role] || [];

  return (
    <div className="admin-layout role-layout">
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
