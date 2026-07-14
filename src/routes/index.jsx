import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import ServicesPage from '../pages/ServicesPage';
import ProfilePage from '../pages/ProfilePage';
import PlaceholderPage from '../pages/PlaceholderPage';
import NotificationsPage from '../pages/shared/NotificationsPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import AdminLayout from '../layouts/AdminLayout';
import ManagerLayout from '../layouts/ManagerLayout';
import ManagerDashboardPage from '../pages/manager/DashboardPage';
import ManagerProfile from '../pages/manager/ManagerProfile';
import ManagerResidentsPage from '../pages/manager/residents';
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
import FacilitiesPage from '../pages/admin/facilities/FacilitiesPage';
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
import MyShiftsPage from '../pages/shared/MyShiftsPage';
import AdminProfile from '../pages/admin/AdminProfile';
import AdminAccountsPage from '../pages/admin/AdminAccountsPage';
import AdminAdmissionRequestsPage from '../pages/admin/AdminAdmissionRequestsPage';
import AdminTourRequestsPage from '../pages/admin/AdminTourRequestsPage';
import ServicePackagesPage from '../pages/admin/ServicePackagesPage';
import PharmacyPage from '../pages/pharmacist/PharmacyPage';
import PharmacistProfile from '../pages/pharmacist/PharmacistProfile';
import AdminActivitiesPage from '../pages/admin/AdminActivitiesPage';
import AdminReportsPage from '../pages/admin/AdminReportsPage';
import AuditLogsPage from '../pages/admin/AuditLogsPage';
import ActivityStatisticsPage from '../pages/admin/ActivityStatisticsPage';
import ActivityParticipationResultsPage from '../pages/admin/ActivityParticipationResultsPage';
import CareAppointmentsPage from '../pages/admin/appointments';
import AdminContractManagementPage from '../pages/admin/AdminContractManagementPage';
import AdminInvoiceManagementPage from '../pages/admin/AdminInvoiceManagementPage';
import AdminClinicalServicesPage from '../pages/admin/AdminClinicalServicesPage';
import AdminMedicalChargesPage from '../pages/admin/AdminMedicalChargesPage';
import DoctorDashboardPage from '../pages/doctor/DoctorDashboardPage';
import DoctorProfile from '../pages/doctor/DoctorProfile';
import NurseDashboardPage from '../pages/nurse/NurseDashboardPage';
import NurseProfile from '../pages/nurse/NurseProfile';
import MedicationPage from '../pages/nurse/MedicationPage';

import MealPlansPage from '../pages/nurse/MealPlansPage';
import NutritionReportsPage from '../pages/nurse/NutritionReportsPage';
import CaregiverDashboardPage from '../pages/caregiver/CaregiverDashboardPage';
import CaregiverProfile from '../pages/caregiver/CaregiverProfile';
import AssignedResidentsPage from '../pages/caregiver/AssignedResidentsPage';
import DailyCareSchedulePage from '../pages/caregiver/daily-care-schedule/DailyCareSchedulePage';
import HygieneActivitiesPage from '../pages/caregiver/hygiene-activities/HygieneActivitiesPage';
import DailyBehaviorsPage from '../pages/caregiver/daily-behaviors/DailyBehaviorsPage';
import DietPlansPage from '../pages/caregiver/diet-plans/DietPlansPage';
import RehabilitationSchedulePage from '../pages/caregiver/rehabilitation-schedule/RehabilitationSchedulePage';
import MealIntakeNotesPage from '../pages/caregiver/meal-intake/MealIntakeNotesPage';

import ActivitySchedulePage from '../pages/nurse/ActivitySchedulePage';

import DoctorMedicationPage from '../pages/doctor/MedicationPage';
import FamilyDashboardPage from '../pages/family/FamilyDashboardPage';
import SubmitAdmissionPage from '../pages/family/SubmitAdmissionPage';
import AdmissionRequestsHistoryPage from '../pages/family/AdmissionRequestsHistoryPage';
import SubmitFacilityTourPage from '../pages/family/SubmitFacilityTourPage';
import FacilityTourHistoryPage from '../pages/family/FacilityTourHistoryPage';
import FamilyActivityPage from '../pages/family/ActivityPage';
import ResidentHealthPage from '../pages/family/ResidentHealthPage';
import IncidentManagementPage from '../pages/IncidentManagementPage';
import HealthMonitoringPage from '../pages/shared/HealthMonitoringPage';
import CareNotesPage from '../pages/shared/CareNotesPage';
import ManagerActivityDashboard from '../pages/manager/ActivityDashboard';
import ProtectedRoute from '../components/ProtectedRoute';
import MessagesPage from '../pages/shared/MessagesPage';
import GuestContact from '../pages/shared/GuestContact';
import IntroPage from '../pages/IntroPage';
import TechPage from '../pages/TechPage';
import LivingPage from '../pages/LivingPage';
import PricingPage from '../pages/PricingPage';
import NewsPage from '../pages/NewsPage';
import ContactPage from '../pages/ContactPage';

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
        <Route path="buildings" element={<FacilitiesPage defaultTab="buildings" />} />
        <Route path="floors" element={<FacilitiesPage defaultTab="floors" />} />
        <Route path="rooms" element={<FacilitiesPage defaultTab="rooms" />} />
        <Route path="beds" element={<FacilitiesPage defaultTab="beds" />} />
        <Route path="equipment" element={<FacilitiesPage defaultTab="equipment" />} />
        <Route path="staff/profiles" element={<StaffProfilesPage />} />
        <Route path="staff/shifts" element={<ShiftManagementPage />} />
        <Route path="staff/assignments" element={<StaffAssignmentPage />} />
        <Route path="staff/emergency" element={<EmergencyAvailabilityPage />} />
        <Route path="staff/leave-requests" element={<LeaveRequestAdminPage />} />
        <Route path="residents/create" element={<ResidentPage defaultMode="create" />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="notifications" element={<NotificationsPage role="admin" />} />
        <Route path="accounts" element={<AdminAccountsPage />} />
        <Route path="admission-requests" element={<AdminAdmissionRequestsPage />} />
        <Route path="appointments" element={<CareAppointmentsPage />} />
        <Route path="tour-requests" element={<AdminTourRequestsPage />} />
        <Route path="service-packages" element={<ServicePackagesPage />} />
        <Route path="medications" element={<PharmacyPage defaultTab="medications" />} />
        <Route path="activities" element={<AdminActivitiesPage />} />
        <Route path="activities/statistics" element={<ActivityStatisticsPage />} />
        <Route path="activities/participation-results" element={<ActivityParticipationResultsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="contracts" element={<AdminContractManagementPage />} />
        <Route path="invoices" element={<AdminInvoiceManagementPage />} />
        <Route path="services" element={<AdminClinicalServicesPage />} />
        <Route path="medical-charges" element={<AdminMedicalChargesPage />} />
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
        <Route path="residents" element={<ManagerResidentsPage />} />
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
        <Route path="activity-dashboard" element={<ManagerActivityDashboard />} />
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
        <Route path="profile" element={<DoctorProfile />} />
        <Route path="admission-requests" element={<AdminAdmissionRequestsPage />} />
        <Route path="service-packages" element={<ServicePackagesPage />} />
        <Route path="appointments" element={<CareAppointmentsPage />} />
        <Route path="patients" element={<PlaceholderPage title="Danh sách bệnh nhân" />} />
        <Route path="health-monitoring" element={<HealthMonitoringPage />} />
        <Route path="medications" element={<DoctorMedicationPage />} />
        <Route path="care-notes" element={<CareNotesPage />} />
        <Route path="my-shifts" element={<MyShiftsPage />} />
        <Route path="care-tasks" element={<DailyCareSchedulePage />} />
        <Route path="leave" element={<LeaveRequestPage />} />
        <Route path="notifications" element={<NotificationsPage role="doctor" />} />
        <Route path="messages" element={<MessagesPage />} />
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
        <Route path="profile" element={<NurseProfile />} />
        <Route path="admission-requests" element={<AdminAdmissionRequestsPage />} />
        <Route path="service-packages" element={<ServicePackagesPage />} />

        <Route path="meal-plans" element={<MealPlansPage />} />
        <Route path="nutrition-reports" element={<NutritionReportsPage />} />

        <Route path="health-monitoring" element={<HealthMonitoringPage />} />
        <Route path="care-notes" element={<CareNotesPage />} />
        <Route path="appointments" element={<CareAppointmentsPage />} />

        <Route path="medications" element={<MedicationPage />} />
        <Route path="my-shifts" element={<MyShiftsPage />} />
        <Route path="care-tasks" element={<DailyCareSchedulePage />} />
        <Route path="activity-schedule" element={<ActivitySchedulePage />} />
        <Route path="leave" element={<LeaveRequestPage />} />
        <Route path="notifications" element={<NotificationsPage role="nurse" />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="incidents" element={<IncidentManagementPage />} />
      </Route>

      <Route
        path="/caregiver/*"
        element={
          <ProtectedRoute requiredRole="caregiver">
            <RoleLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CaregiverDashboardPage />} />
        <Route path="profile" element={<CaregiverProfile />} />
        <Route path="assigned-residents" element={<AssignedResidentsPage />} />
        <Route path="my-shifts" element={<MyShiftsPage />} />
        <Route path="leave" element={<LeaveRequestPage />} />
        <Route path="daily-care-schedule" element={<DailyCareSchedulePage />} />
        <Route path="meal-intake-notes" element={<MealIntakeNotesPage />} />
        <Route path="hygiene-activities" element={<HygieneActivitiesPage />} />
        <Route path="daily-behaviors" element={<DailyBehaviorsPage />} />
        <Route path="diet-plans" element={<DietPlansPage />} />
        <Route path="rehabilitation-schedule" element={<RehabilitationSchedulePage />} />
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
        <Route path="profile" element={<PharmacistProfile />} />
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
        <Route path="activities" element={<FamilyActivityPage />} />
        <Route path="resident" element={<ResidentHealthPage />} />
        <Route path="notifications" element={<NotificationsPage role="family" />} />
        <Route path="messages" element={<MessagesPage />} />
      </Route>

      <Route path="/services" element={<ServicesPage />} />
      <Route path="/intro" element={<IntroPage />} />
      <Route path="/tech" element={<TechPage />} />
      <Route path="/living" element={<LivingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/guest-contact" element={<GuestContact />} />
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
