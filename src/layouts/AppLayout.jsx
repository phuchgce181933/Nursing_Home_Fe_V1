import { Outlet } from 'react-router-dom';
import Sidebar from '../components/sidebar/Sidebar';
import NotificationBell from '../components/shared/NotificationBell';

function AppLayout({ items }) {
  return (
    <div className="admin-layout">
      <Sidebar items={items} />
      <main className="admin-layout__main">
        <div className="mb-3 flex justify-end">
          <NotificationBell />
        </div>
        <div className="admin-layout__panel">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
