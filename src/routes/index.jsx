import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import ServicesPage from '../pages/ServicesPage';
import ProfilePage from '../pages/ProfilePage';
import PlaceholderPage from '../pages/PlaceholderPage';
import NotificationsPage from '../pages/shared/NotificationsPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import AdminLayout from '../layouts/AdminLayout';
import RoleLayout from '../layouts/RoleLayout';
import DashboardPage from '../pages/admin/DashboardPage';
import ResidentPage from '../pages/admin/residents';
import BuildingsPage from '../pages/admin/facilities/BuildingsPage';
import FloorsPage from '../pages/admin/facilities/FloorsPage';
import RoomsPage from '../pages/admin/facilities/RoomsPage';
import BedsPage from '../pages/admin/facilities/BedsPage';
import EquipmentPage from '../pages/admin/facilities/EquipmentPage';
import FamilyManagementPage from '../pages/admin/residents/family';
import ResidentsByAreaPage from '../pages/admin/residents/by-area';
import InitialHealthPage from '../pages/admin/residents/initial-health';
import PreExistingConditionsPage from '../pages/admin/residents/pre-existing-conditions';
import DrugAllergiesPage from '../pages/admin/residents/drug-allergies';
import TransferResidentPage from '../pages/admin/residents/transfer';
import ShiftManagementPage from '../pages/admin/staff/shifts';
import StaffAssignmentPage from '../pages/admin/staff/assignments';
import AreaAssignmentDetailPage from '../pages/admin/staff/assignments/AreaAssignmentDetailPage';
import ResidentAssignmentDetailPage from '../pages/admin/staff/assignments/ResidentAssignmentDetailPage';
import EmergencyAvailabilityPage from '../pages/admin/staff/emergency';
import LeaveRequestAdminPage from '../pages/admin/staff/leave-requests';
import LeaveRequestDetailPage from '../pages/admin/staff/leave-requests/LeaveRequestDetailPage';
import LeaveRequestPage from '../pages/shared/LeaveRequestPage';
import MyShiftsPage from '../pages/shared/MyShiftsPage';
import AdminProfile from '../pages/admin/AdminProfile';
import AdminAccountsPage from '../pages/admin/AdminAccountsPage';
import AdminAdmissionRequestsPage from '../pages/admin/AdminAdmissionRequestsPage';
import AdminConsultationRequestsPage from '../pages/admin/AdminConsultationRequestsPage';
import AdminTourRequestsPage from '../pages/admin/AdminTourRequestsPage';
import ServicePackagesPage from '../pages/admin/ServicePackagesPage';
import PharmacyPage from '../pages/pharmacist/PharmacyPage';
import PharmacistProfile from '../pages/pharmacist/PharmacistProfile';
import AdminActivitiesPage from '../pages/admin/AdminActivitiesPage';
import AuditLogsPage from '../pages/admin/AuditLogsPage';
import ActivityStatisticsPage from '../pages/admin/ActivityStatisticsPage';
import ActivityParticipationResultsPage from '../pages/admin/ActivityParticipationResultsPage';
import CareAppointmentsPage from '../pages/admin/appointments';
import AdminContractManagementPage from '../pages/admin/AdminContractManagementPage';
import AdminInvoiceManagementPage from '../pages/admin/AdminInvoiceManagementPage';
import AdminClinicalServicesPage from '../pages/admin/AdminClinicalServicesPage';
import AdminDishesPage from '../pages/admin/dishes';
import AdminMealIntakeNotesPage from '../pages/admin/meal-intake-notes';
import AdminHygieneActivitiesPage from '../pages/admin/hygiene-activities';
import AdminDailyBehaviorsPage from '../pages/admin/daily-behaviors';
import AdminMedicalChargesPage from '../pages/admin/AdminMedicalChargesPage';
import DoctorDashboardPage from '../pages/doctor/DoctorDashboardPage';
import DoctorInitialHealthPage from '../pages/doctor/residents/initial-health';
import DoctorDrugAllergiesPage from '../pages/doctor/residents/drug-allergies';
import DoctorAssignedResidentsPage from '../pages/doctor/AssignedResidentsPage';
import DoctorProfile from '../pages/doctor/DoctorProfile';
import DoctorSchedulePage from '../pages/doctor/DoctorSchedulePage';
import NurseDashboardPage from '../pages/nurse/NurseDashboardPage';
import NurseInitialHealthPage from '../pages/nurse/residents/initial-health';
import NurseAssignedResidentsPage from '../pages/nurse/AssignedResidentsPage';
import NurseProfile from '../pages/nurse/NurseProfile';
import MedicationPage from '../pages/nurse/MedicationPage';

import MealPlansPage from '../pages/nurse/MealPlansPage';
import CaregiverDashboardPage from '../pages/caregiver/CaregiverDashboardPage';
import CaregiverProfile from '../pages/caregiver/CaregiverProfile';
import AssignedResidentsPage from '../pages/caregiver/AssignedResidentsPage';
import CaregiverAssignedResidentDetailPage from '../pages/caregiver/AssignedResidentDetailPage';
import DoctorAssignedResidentDetailPage from '../pages/doctor/AssignedResidentDetailPage';
import NurseAssignedResidentDetailPage from '../pages/nurse/AssignedResidentDetailPage';
import DailyCareSchedulePage from '../pages/caregiver/daily-care-schedule/DailyCareSchedulePage';
import HygieneActivitiesPage from '../pages/caregiver/hygiene-activities/HygieneActivitiesPage';
import DailyBehaviorsPage from '../pages/caregiver/daily-behaviors/DailyBehaviorsPage';
import DietPlansPage from '../pages/caregiver/diet-plans/DietPlansPage';
import MealIntakeNotesPage from '../pages/caregiver/meal-intake/MealIntakeNotesPage';
import RehabilitationSchedulePage from '../pages/caregiver/rehabilitation-schedule/RehabilitationSchedulePage';

import ActivitySchedulePage from '../pages/nurse/ActivitySchedulePage';

import DoctorMedicationPage from '../pages/doctor/MedicationPage';
import FamilyDashboardPage from '../pages/family/FamilyDashboardPage';
import SubmitAdmissionPage from '../pages/family/SubmitAdmissionPage';
import AdmissionRequestsHistoryPage from '../pages/family/AdmissionRequestsHistoryPage';
import SubmitFacilityTourPage from '../pages/family/SubmitFacilityTourPage';
import FacilityTourHistoryPage from '../pages/family/FacilityTourHistoryPage';
import FamilyActivityPage from '../pages/family/ActivityPage';
import ResidentHealthPage from '../pages/family/ResidentHealthPage';
import FamilyAppointmentsPage from '../pages/family/FamilyAppointmentsPage';
import IncidentManagementPage from '../pages/IncidentManagementPage';
import HealthMonitoringPage from '../pages/shared/HealthMonitoringPage';
import CareNotesPage from '../pages/shared/CareNotesPage';
import ProtectedRoute from '../components/ProtectedRoute';
import MessagesPage from '../pages/shared/MessagesPage';
import IntroPage from '../pages/IntroPage';
import TechPage from '../pages/TechPage';
import LivingPage from '../pages/LivingPage';
import PricingPage from '../pages/PricingPage';
import NewsPage from '../pages/NewsPage';
import ContactPage from '../pages/ContactPage';

function AppRoutes() {
  const { t } = useTranslation();
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
        <Route path="buildings" element={<BuildingsPage />} />
        <Route path="floors" element={<FloorsPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="beds" element={<BedsPage />} />
        <Route path="equipment" element={<EquipmentPage />} />
        <Route path="staff/shifts" element={<ShiftManagementPage />} />
        <Route path="staff/assignments" element={<StaffAssignmentPage />} />
        <Route path="staff/assignments/area/:staffId" element={<AreaAssignmentDetailPage />} />
        <Route path="staff/assignments/residents/:staffId" element={<ResidentAssignmentDetailPage />} />
        <Route path="staff/emergency" element={<EmergencyAvailabilityPage />} />
        <Route path="staff/leave-requests" element={<LeaveRequestAdminPage />} />
        <Route path="staff/leave-requests/:id" element={<LeaveRequestDetailPage />} />
        <Route path="residents/create" element={<ResidentPage defaultMode="create" />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="notifications" element={<NotificationsPage role="admin" />} />
        <Route path="accounts" element={<AdminAccountsPage />} />
        <Route path="admission-requests" element={<AdminAdmissionRequestsPage />} />
        <Route path="consultation-requests" element={<AdminConsultationRequestsPage />} />
        <Route path="appointments" element={<CareAppointmentsPage />} />
        <Route path="tour-requests" element={<AdminTourRequestsPage />} />
        <Route path="service-packages" element={<ServicePackagesPage />} />
        <Route path="medications" element={<PharmacyPage defaultTab="medications" />} />
        <Route path="activities" element={<AdminActivitiesPage />} />
        <Route path="activities/statistics" element={<ActivityStatisticsPage />} />
        <Route path="activities/participation-results" element={<ActivityParticipationResultsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="contracts" element={<AdminContractManagementPage />} />
        <Route path="invoices" element={<AdminInvoiceManagementPage />} />
        <Route path="services" element={<AdminClinicalServicesPage />} />
        <Route path="dishes" element={<AdminDishesPage />} />
        <Route path="meal-intake-notes" element={<AdminMealIntakeNotesPage />} />
        <Route path="hygiene-activities" element={<AdminHygieneActivitiesPage />} />
        <Route path="daily-behaviors" element={<AdminDailyBehaviorsPage />} />
        <Route path="medical-charges" element={<AdminMedicalChargesPage />} />
        <Route path="incidents" element={<IncidentManagementPage />} />
        <Route path="*" element={<PlaceholderPage title={t('common.placeholderAdminTitle')} />} />
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
        <Route path="schedule" element={<DoctorSchedulePage />} />
        <Route path="patients" element={<PlaceholderPage title={t('common.placeholderPatientsListTitle')} />} />
        <Route path="assigned-residents" element={<DoctorAssignedResidentsPage />} />
        <Route path="health-monitoring" element={<HealthMonitoringPage />} />
        <Route path="residents/initial-health" element={<DoctorInitialHealthPage />} />
        <Route path="assigned-residents/:id" element={<DoctorAssignedResidentDetailPage />} />
        <Route path="residents/drug-allergies" element={<DoctorDrugAllergiesPage />} />
        <Route path="medications" element={<DoctorMedicationPage />} />
        <Route path="care-notes" element={<CareNotesPage />} />
        <Route path="my-shifts" element={<MyShiftsPage />} />
        <Route path="care-tasks" element={<DailyCareSchedulePage />} />
        <Route path="activity-schedule" element={<ActivitySchedulePage />} />
        <Route path="leave" element={<LeaveRequestPage />} />
        <Route path="notifications" element={<NotificationsPage role="doctor" />} />
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

        <Route path="assigned-residents" element={<NurseAssignedResidentsPage />} />
        <Route path="health-monitoring" element={<HealthMonitoringPage />} />
        <Route path="residents/initial-health" element={<NurseInitialHealthPage />} />
        <Route path="assigned-residents/:id" element={<NurseAssignedResidentDetailPage />} />
        <Route path="care-notes" element={<CareNotesPage />} />
        <Route path="appointments" element={<CareAppointmentsPage />} />

        <Route path="medications" element={<MedicationPage />} />
        <Route path="my-shifts" element={<MyShiftsPage />} />
        <Route path="care-tasks" element={<DailyCareSchedulePage />} />
        <Route path="activity-schedule" element={<ActivitySchedulePage />} />
        <Route path="leave" element={<LeaveRequestPage />} />
        <Route path="notifications" element={<NotificationsPage role="nurse" />} />
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
        <Route path="assigned-residents/:id" element={<CaregiverAssignedResidentDetailPage />} />
        <Route path="care-notes" element={<CareNotesPage />} />
        <Route path="my-shifts" element={<MyShiftsPage />} />
        <Route path="leave" element={<LeaveRequestPage />} />
        <Route path="daily-care-schedule" element={<DailyCareSchedulePage />} />
        <Route path="activity-schedule" element={<ActivitySchedulePage />} />
        <Route path="meal-intake-notes" element={<MealIntakeNotesPage />} />
        <Route path="hygiene-activities" element={<HygieneActivitiesPage />} />
        <Route path="daily-behaviors" element={<DailyBehaviorsPage />} />
        <Route path="diet-plans" element={<DietPlansPage />} />
        <Route path="rehabilitation-schedule" element={<RehabilitationSchedulePage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="notifications" element={<NotificationsPage role="caregiver" />} />
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
        <Route path="my-shifts" element={<MyShiftsPage />} />
        <Route path="leave" element={<LeaveRequestPage />} />
        <Route path="profile" element={<PharmacistProfile />} />
        <Route path="medications" element={<PharmacyPage defaultTab="medications" />} />
        <Route path="suppliers" element={<PharmacyPage defaultTab="suppliers" />} />
        <Route path="stocks" element={<PharmacyPage defaultTab="stocks" />} />
        <Route path="priceList" element={<PharmacyPage defaultTab="priceList" />} />
        <Route path="notifications" element={<NotificationsPage role="pharmacist" />} />
        <Route path="incidents" element={<IncidentManagementPage />} />
        <Route path="dispense" element={<PharmacyPage defaultTab="dispense" />} />
        <Route path="reports" element={<PharmacyPage defaultTab="reports" />} />
        <Route path="*" element={<PlaceholderPage title={t('common.placeholderPharmacistTitle')} />} />
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
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admission-requests" element={<AdmissionRequestsHistoryPage />} />
        <Route path="facility-tours" element={<FacilityTourHistoryPage />} />
        <Route path="activities" element={<FamilyActivityPage />} />
        <Route path="resident" element={<ResidentHealthPage />} />
        <Route path="appointments" element={<FamilyAppointmentsPage />} />
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
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
