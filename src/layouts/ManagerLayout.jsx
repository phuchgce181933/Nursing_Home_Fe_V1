import Sidebar from '../components/sidebar/Sidebar';
import { managerSidebarData } from '../components/sidebar/managerSidebarData';
import { Outlet } from 'react-router-dom';

function ManagerLayout() {
  return (
    <div className="manager-layout">
      <Sidebar
        items={managerSidebarData}
        brandTitle="Nursing Home"
        brandSubtitle="Quản lý vận hành"
      />

      <main className="manager-layout__main">
        <div className="manager-layout__panel">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default ManagerLayout;
