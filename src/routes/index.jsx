import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import PlaceholderPage from '../pages/PlaceholderPage';
import RoleLayout from '../layouts/RoleLayout';
import DashboardPage from '../pages/admin/DashboardPage';
import ResidentPage from '../pages/admin/ResidentPage';
import StaffPage from '../pages/admin/StaffPage';
import AdminProfile from '../pages/admin/AdminProfile';
import DoctorDashboardPage from '../pages/doctor/DoctorDashboardPage';
import NurseDashboardPage from '../pages/nurse/NurseDashboardPage';
import FamilyDashboardPage from '../pages/family/FamilyDashboardPage';
import ProtectedRoute from '../components/ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <RoleLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="residents" element={<ResidentPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="*" element={<PlaceholderPage title="Trang quản trị" />} />
      </Route>

      <Route
        path="/doctor/*"
        element={
          <ProtectedRoute requiredRole="doctor">
            <RoleLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
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
        <Route index element={<Navigate to="dashboard" replace />} />
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
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<FamilyDashboardPage />} />
        <Route path="resident" element={<PlaceholderPage title="Hồ sơ người thân" />} />
        <Route path="notifications" element={<PlaceholderPage title="Thông báo" />} />
        <Route path="messages" element={<PlaceholderPage title="Tin nhắn" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
