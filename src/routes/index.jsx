import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import ServicesPage from '../pages/ServicesPage';
import ProfilePage from '../pages/ProfilePage';
import PlaceholderPage from '../pages/PlaceholderPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import AdminLayout from '../layouts/AdminLayout';
import RoleLayout from '../layouts/RoleLayout';
import DashboardPage from '../pages/admin/DashboardPage';
import ResidentPage from '../pages/admin/ResidentPage';
import AdminProfile from '../pages/admin/AdminProfile';
import AdminAccountsPage from '../pages/admin/AdminAccountsPage';
import AdminAdmissionRequestsPage from '../pages/admin/AdminAdmissionRequestsPage';
import AdminTourRequestsPage from '../pages/admin/AdminTourRequestsPage';
import ServicePackagesPage from '../pages/admin/ServicePackagesPage';
import PharmacyPage from '../pages/pharmacist/PharmacyPage';
import DoctorDashboardPage from '../pages/doctor/DoctorDashboardPage';
import NurseDashboardPage from '../pages/nurse/NurseDashboardPage';
import FamilyDashboardPage from '../pages/family/FamilyDashboardPage';
import SubmitAdmissionPage from '../pages/family/SubmitAdmissionPage';
import AdmissionRequestsHistoryPage from '../pages/family/AdmissionRequestsHistoryPage';
import SubmitFacilityTourPage from '../pages/family/SubmitFacilityTourPage';
import FacilityTourHistoryPage from '../pages/family/FacilityTourHistoryPage';
import IncidentManagementPage from '../pages/IncidentManagementPage';
import ProtectedRoute from '../components/ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

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
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="residents" element={<ResidentPage />} />
        <Route path="residents/create" element={<ResidentPage defaultMode="create" />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="accounts" element={<AdminAccountsPage />} />
        <Route path="admission-requests" element={<AdminAdmissionRequestsPage />} />
        <Route path="tour-requests" element={<AdminTourRequestsPage />} />
        <Route path="service-packages" element={<ServicePackagesPage />} />
        <Route path="medications" element={<PharmacyPage />} />
        <Route path="incidents" element={<IncidentManagementPage />} />
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
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admission-requests" element={<AdminAdmissionRequestsPage />} />
        <Route path="service-packages" element={<ServicePackagesPage />} />
        <Route path="appointments" element={<PlaceholderPage title="Lịch khám" />} />
        <Route path="patients" element={<PlaceholderPage title="Danh sách bệnh nhân" />} />
        <Route path="messages" element={<PlaceholderPage title="Tin nhắn" />} />
        <Route path="incidents" element={<IncidentManagementPage />} />
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
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admission-requests" element={<AdminAdmissionRequestsPage />} />
        <Route path="service-packages" element={<ServicePackagesPage />} />
        <Route path="care-notes" element={<PlaceholderPage title="Ghi chú chăm sóc" />} />
        <Route path="medications" element={<PharmacyPage />} />
        <Route path="messages" element={<PlaceholderPage title="Tin nhắn" />} />
        <Route path="incidents" element={<IncidentManagementPage />} />
      </Route>

      <Route
        path="/pharmacist/*"
        element={
          <ProtectedRoute requiredRole="pharmacist">
            <RoleLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<PharmacyPage defaultTab="overview" />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="medications" element={<PharmacyPage defaultTab="medications" />} />
        <Route path="suppliers" element={<PharmacyPage defaultTab="suppliers" />} />
        <Route path="stocks" element={<PharmacyPage defaultTab="stocks" />} />
        <Route path="dispense" element={<PharmacyPage defaultTab="dispense" />} />
        <Route path="reports" element={<PharmacyPage defaultTab="reports" />} />
        <Route path="*" element={<PlaceholderPage title="Trang dược sĩ" />} />
      </Route>

      <Route
        path="/family/admission-requests/new"
        element={
          <ProtectedRoute requiredRole="family">
            <SubmitAdmissionPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/family/facility-tours/new"
        element={
          <ProtectedRoute requiredRole="family">
            <SubmitFacilityTourPage />
          </ProtectedRoute>
        }
      />

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
        <Route path="admission-requests" element={<AdmissionRequestsHistoryPage />} />
        <Route path="facility-tours" element={<FacilityTourHistoryPage />} />
        <Route path="resident" element={<PlaceholderPage title="Hồ sơ người thân" />} />
        <Route path="notifications" element={<PlaceholderPage title="Thông báo" />} />
        <Route path="messages" element={<PlaceholderPage title="Tin nhắn" />} />
      </Route>

      <Route path="/services" element={<ServicesPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
