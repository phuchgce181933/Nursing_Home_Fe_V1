import { Outlet } from 'react-router-dom';
import Sidebar from '../components/sidebar/Sidebar';

function AppLayout({ items }) {
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

export default AppLayout;
