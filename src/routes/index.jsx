import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import ServicesPage from '../pages/ServicesPage';
import ProfilePage from '../pages/ProfilePage';
import PlaceholderPage from '../pages/PlaceholderPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import AdminLayout from '../layouts/AdminLayout';
import ManagerLayout from '../layouts/ManagerLayout';
import ManagerDashboardPage from '../pages/manager/DashboardPage';
import ManagerProfile from '../pages/manager/ManagerProfile';
import ManagerFamilyManagementPage from '../pages/manager/residents/family';
import ManagerResidentsByAreaPage from '../pages/manager/residents/by-area';
import ManagerInitialHealthPage from '../pages/manager/residents/initial-health';
import ManagerPreExistingConditionsPage from '../pages/manager/residents/pre-existing-conditions';
import ManagerDrugAllergiesPage from '../pages/manager/residents/drug-allergies';
import ManagerTransferResidentPage from '../pages/manager/residents/transfer';
import ManagerStaffProfilesPage from '../pages/manager/staff/profiles';
import ManagerShiftManagementPage from '../pages/manager/staff/shifts';
import ManagerStaffAssignmentPage from '../pages/manager/staff/assignments';
import ManagerEmergencyAvailabilityPage from '../pages/manager/staff/emergency';
import ManagerLeaveRequestAdminPage from '../pages/manager/staff/leave-requests';
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
import AdminProfile from '../pages/admin/AdminProfile';
import AdminAccountsPage from '../pages/admin/AdminAccountsPage';
import AdminAdmissionRequestsPage from '../pages/admin/AdminAdmissionRequestsPage';
import AdminTourRequestsPage from '../pages/admin/AdminTourRequestsPage';
import ServicePackagesPage from '../pages/admin/ServicePackagesPage';
import PharmacyPage from '../pages/pharmacist/PharmacyPage';
import AdminActivitiesPage from '../pages/admin/AdminActivitiesPage';
import DoctorDashboardPage from '../pages/doctor/DoctorDashboardPage';
import NurseDashboardPage from '../pages/nurse/NurseDashboardPage';
import MedicationPage from '../pages/nurse/MedicationPage';
import DoctorMedicationPage from '../pages/doctor/MedicationPage';
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
        <Route path="residents/create" element={<ResidentPage defaultMode="create" />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="accounts" element={<AdminAccountsPage />} />
        <Route path="admission-requests" element={<AdminAdmissionRequestsPage />} />
        <Route path="tour-requests" element={<AdminTourRequestsPage />} />
        <Route path="service-packages" element={<ServicePackagesPage />} />
        <Route path="medications" element={<PharmacyPage />} />
        <Route path="activities" element={<AdminActivitiesPage />} />
        <Route path="incidents" element={<IncidentManagementPage />} />
        <Route path="*" element={<PlaceholderPage title="Trang quản trị" />} />
      </Route>
      <Route
        path="/manager/*"
        element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ManagerDashboardPage />} />
        <Route path="profile" element={<ManagerProfile />} />
        <Route path="residents/family" element={<ManagerFamilyManagementPage />} />
        <Route path="residents/by-area" element={<ManagerResidentsByAreaPage />} />
        <Route path="residents/initial-health" element={<ManagerInitialHealthPage />} />
        <Route path="residents/pre-existing-conditions" element={<ManagerPreExistingConditionsPage />} />
        <Route path="residents/drug-allergies" element={<ManagerDrugAllergiesPage />} />
        <Route path="residents/transfer-room" element={<ManagerTransferResidentPage />} />
        <Route path="staff/profiles" element={<ManagerStaffProfilesPage />} />
        <Route path="staff/shifts" element={<ManagerShiftManagementPage />} />
        <Route path="staff/assignments" element={<ManagerStaffAssignmentPage />} />
        <Route path="staff/emergency" element={<ManagerEmergencyAvailabilityPage />} />
        <Route path="staff/leave-requests" element={<ManagerLeaveRequestAdminPage />} />
        <Route path="*" element={<PlaceholderPage title="Trang quản lý vận hành" />} />
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
        <Route path="medications" element={<DoctorMedicationPage />} />
        <Route path="leave" element={<LeaveRequestPage />} />
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
        <Route path="medications" element={<MedicationPage />} />
        <Route path="leave" element={<LeaveRequestPage />} />
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
