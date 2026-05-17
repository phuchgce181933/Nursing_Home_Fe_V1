import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ProfilePage from '../pages/ProfilePage';
import PlaceholderPage from '../pages/PlaceholderPage';
import AdminLayout from '../layouts/AdminLayout';
import RoleLayout from '../layouts/RoleLayout';
import DashboardPage from '../pages/admin/DashboardPage';
import ResidentPage from '../pages/admin/ResidentPage';
import DoctorDashboardPage from '../pages/doctor/DoctorDashboardPage';
import NurseDashboardPage from '../pages/nurse/NurseDashboardPage';
import FamilyDashboardPage from '../pages/family/FamilyDashboardPage';
import ProtectedRoute from '../components/ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="residents" element={<ResidentPage />} />
      </Route>
      <Route
        path="/doctor/*"
        element={
          <ProtectedRoute requiredRole="doctor">
            <RoleLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DoctorDashboardPage />} />
        <Route path="appointments" element={<PlaceholderPage title="Lịch khám" />} />
        <Route path="patients" element={<PlaceholderPage title="Danh sách bệnh nhân" />} />
        <Route path="messages" element={<PlaceholderPage title="Tin nhắn" />} />
      </Route>
      <Route
        path="/nurse/*"
        element={
          <ProtectedRoute requiredRole="nurse">
            <RoleLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<NurseDashboardPage />} />
        <Route path="care-notes" element={<PlaceholderPage title="Ghi chú chăm sóc" />} />
        <Route path="medications" element={<PlaceholderPage title="Thuốc" />} />
        <Route path="messages" element={<PlaceholderPage title="Tin nhắn" />} />
      </Route>
      <Route
        path="/family/*"
        element={
          <ProtectedRoute requiredRole="family">
            <RoleLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<FamilyDashboardPage />} />
        <Route path="resident" element={<PlaceholderPage title="Hồ sơ người thân" />} />
        <Route path="notifications" element={<PlaceholderPage title="Thông báo" />} />
        <Route path="messages" element={<PlaceholderPage title="Tin nhắn" />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;