import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  Activity,
  FileText,
  Bell,
  Shield,
  HeartPulse,
  Pill,
  ClipboardList,
  MessageSquare,
  Settings,
  FileCheck,
} from 'lucide-react';

export const sidebarData = [
  {
    title: 'sidebar.dashboard',
    icon: LayoutDashboard,
    path: '/admin/dashboard',
  },
  {
    title: 'sidebar.authentication',
    icon: Shield,
    children: [
      { title: 'sidebar.myProfile', path: '/admin/profile' },
      { title: 'sidebar.accounts', path: '/admin/accounts' },
    ],
  },
  {
    title: 'sidebar.residents',
    icon: Users,
    children: [
      { title: 'sidebar.residents', path: '/admin/residents' },
    ],
  },
  {
    title: 'sidebar.admissionManagement',
    icon: ClipboardList,
    children: [
      { title: 'sidebar.admissionRequests', path: '/admin/admission-requests' },
      { title: 'sidebar.tourRequests', path: '/admin/tour-requests' },
      { title: 'sidebar.servicePackages', path: '/admin/service-packages' },
      { title: 'sidebar.familyInfo', path: '/admin/residents/family' },
      { title: 'sidebar.residentsByArea', path: '/admin/residents/by-area' },
      { title: 'sidebar.initialHealth', path: '/admin/residents/initial-health' },
      { title: 'sidebar.preExistingConditions', path: '/admin/residents/pre-existing-conditions' },
      { title: 'sidebar.drugAllergies', path: '/admin/residents/drug-allergies' },
      { title: 'sidebar.transferResident', path: '/admin/residents/transfer-room' },
    ],
  },
  {
    title: 'sidebar.buildingsFacilities',
    icon: Building2,
    children: [
      { title: 'sidebar.floors', path: '/admin/floors' },
      { title: 'sidebar.rooms', path: '/admin/rooms' },
      { title: 'sidebar.beds', path: '/admin/beds' },
    ],
  },
  {
    title: 'sidebar.staffManagement',
    icon: ClipboardList,
    children: [
      { title: 'sidebar.staffProfiles', path: '/admin/staff/profiles' },
      { title: 'sidebar.shifts', path: '/admin/staff/shifts' },
      { title: 'sidebar.assignments', path: '/admin/staff/assignments' },
      { title: 'sidebar.emergencyAvailability', path: '/admin/staff/emergency' },
      { title: 'sidebar.leaveRequests', path: '/admin/staff/leave-requests' },
    ],
  },
  {
    title: 'sidebar.healthMonitoring',
    icon: HeartPulse,
    path: '/admin/health',
  },
  {
    title: 'sidebar.medication',
    icon: Pill,
    path: '/admin/medications',
  },
  {
    title: 'sidebar.appointments',
    icon: Calendar,
    path: '/admin/appointments',
  },
  {
    title: 'sidebar.activities',
    icon: Activity,
    children: [
      { title: 'Quản lý hoạt động', path: '/admin/activities' },
      { title: 'Thống kê hoạt động', path: '/admin/activities/statistics' },
      { title: 'Kết quả tham gia', path: '/admin/activities/participation-results' },
    ],
  },
  {
    title: 'sidebar.incidents',
    icon: FileText,
    path: '/admin/incidents',
  },
  {
    title: 'Báo cáo',
    icon: FileText,
    path: '/admin/reports',
  },
  {
    title: 'sidebar.contractManagement',
    icon: FileCheck,
    path: '/admin/contracts',
  },
  {
    title: 'sidebar.notifications',
    icon: Bell,
    path: '/admin/notifications',
  },
  {
    title: 'sidebar.communication',
    icon: MessageSquare,
    path: '/admin/messages',
  },
  {
    title: 'sidebar.settings',
    icon: Settings,
    path: '/admin/settings',
  },
];
