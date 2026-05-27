import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ProfilePage from '../pages/ProfilePage';
import PlaceholderPage from '../pages/PlaceholderPage';
import AdminLayout from '../layouts/AdminLayout';
import RoleLayout from '../layouts/RoleLayout';
import DashboardPage from '../pages/admin/DashboardPage';
import ResidentPage from '../pages/admin/residents';
import FamilyManagementPage from '../pages/admin/residents/family';
import ResidentsByAreaPage from '../pages/admin/residents/by-area';
import InitialHealthPage from '../pages/admin/residents/initial-health';
import PreExistingConditionsPage from '../pages/admin/residents/pre-existing-conditions';
import DrugAllergiesPage from '../pages/admin/residents/drug-allergies';
import TransferResidentPage from '../pages/admin/residents/transfer';
import StaffProfilesPage from '../pages/admin/staff/profiles';
import ShiftManagementPage from '../pages/admin/staff/shifts';
import StaffAssignmentPage from '../pages/admin/staff/assignments';
import EmergencyAvailabilityPage from '../pages/admin/staff/emergency';
import LeaveRequestAdminPage from '../pages/admin/staff/leave-requests';
import LeaveRequestPage from '../pages/shared/LeaveRequestPage';
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
        <Route path="residents/family" element={<FamilyManagementPage />} />
        <Route path="residents/by-area" element={<ResidentsByAreaPage />} />
        <Route path="residents/initial-health" element={<InitialHealthPage />} />
        <Route path="residents/pre-existing-conditions" element={<PreExistingConditionsPage />} />
        <Route path="residents/drug-allergies" element={<DrugAllergiesPage />} />
        <Route path="residents/transfer-room" element={<TransferResidentPage />} />
        <Route path="staff/profiles" element={<StaffProfilesPage />} />
        <Route path="staff/shifts" element={<ShiftManagementPage />} />
        <Route path="staff/assignments" element={<StaffAssignmentPage />} />
        <Route path="staff/emergency" element={<EmergencyAvailabilityPage />} />
        <Route path="staff/leave-requests" element={<LeaveRequestAdminPage />} />
      </Route>
      <Route
        path="/manager/*"
        element={
          <ProtectedRoute requiredRole="manager">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="residents/family" element={<FamilyManagementPage />} />
        <Route path="residents/by-area" element={<ResidentsByAreaPage />} />
        <Route path="residents/initial-health" element={<InitialHealthPage />} />
        <Route path="residents/pre-existing-conditions" element={<PreExistingConditionsPage />} />
        <Route path="residents/drug-allergies" element={<DrugAllergiesPage />} />
        <Route path="residents/transfer-room" element={<TransferResidentPage />} />
        <Route path="staff/profiles" element={<StaffProfilesPage />} />
        <Route path="staff/shifts" element={<ShiftManagementPage />} />
        <Route path="staff/assignments" element={<StaffAssignmentPage />} />
        <Route path="staff/emergency" element={<EmergencyAvailabilityPage />} />
        <Route path="staff/leave-requests" element={<LeaveRequestAdminPage />} />
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
        <Route path="leave" element={<LeaveRequestPage />} />
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
        <Route path="leave" element={<LeaveRequestPage />} />
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