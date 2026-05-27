import Sidebar from "../components/sidebar/Sidebar";
import { sidebarData } from "../components/sidebar/sidebarData";
import { managerSidebarData } from "../components/sidebar/managerSidebarData";
import useAuth from "../hooks/useAuth";
import { Outlet } from "react-router-dom";

function AdminLayout() {
  const { user } = useAuth();
  const navItems = user?.role === "manager" ? managerSidebarData : sidebarData;

  return (
    <div className="admin-layout">
      <Sidebar items={navItems} />

      <main className="admin-layout__main">
        <div className="admin-layout__panel">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;