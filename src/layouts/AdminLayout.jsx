import AppLayout from './AppLayout';
import { sidebarData } from '../components/sidebar/sidebarData';

function AdminLayout() {
  return <AppLayout items={sidebarData} />;
}

export default AdminLayout;
