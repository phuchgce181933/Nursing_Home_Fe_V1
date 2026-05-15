import Sidebar from "../components/sidebar/Sidebar";
import { Outlet } from "react-router-dom";

function AdminLayout() {
  return (
    <div className="admin-layout">
      <Sidebar />

      <main className="admin-layout__main">
        <div className="admin-layout__panel">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;