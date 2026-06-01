import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  HeartPulse,
  Pill,
  Activity,
  Bell,
  CalendarOff,
  History,
  ClipboardList,
  FileText,
  UserCircle,
  PackageOpen,
  Truck,
  ShieldCheck,
} from 'lucide-react';

export const roleSidebarData = {
  doctor: [

    {
      title: 'Dashboard Bác sĩ',
      icon: LayoutDashboard,
      path: '/doctor/dashboard',
    },
    {
      title: 'Hồ sơ cá nhân',
      icon: UserCircle,
      path: '/doctor/profile',
    },
    {
      title: 'Lịch khám',
      icon: Calendar,
      path: '/doctor/appointments',
    },
    {
      title: 'Theo dõi Sức khỏe',
      icon: HeartPulse,
      path: '/doctor/health-monitoring',
    },
    {
      title: 'Bệnh nhân',
      icon: Users,
      path: '/doctor/patients',
    },
    {
      title: 'Thuốc',
      icon: Pill,
      path: '/doctor/medications',
    },
    {
      title: 'Ghi chú chăm sóc',
      icon: Activity,
      path: '/doctor/care-notes',
    },
    {
      title: 'Yêu cầu Nhập viện',
      icon: ClipboardList,
      path: '/doctor/admission-requests',
    },
    {
      title: 'Gói Dịch vụ',
      icon: HeartPulse,
      path: '/doctor/service-packages',
    },
    {
      title: 'Sự cố',
      icon: FileText,
      path: '/doctor/incidents',
    },
    {
      title: 'Nghỉ phép',
      icon: CalendarOff,
      path: '/doctor/leave',
    },
    {
      title: 'Tin nhắn',
      icon: MessageSquare,
      path: '/doctor/messages',
    },

  ],
  nurse: [
    { title: 'sidebar.nurseDashboard', icon: LayoutDashboard, path: '/nurse/dashboard' },
    { title: 'sidebar.myProfile', icon: UserCircle, path: '/nurse/profile' },
    { title: 'sidebar.careNotes', icon: Activity, path: '/nurse/care-notes' },
    { title: 'Theo dõi Sức khỏe', icon: HeartPulse, path: '/nurse/health-monitoring' },
    { title: 'sidebar.medication', icon: Pill, path: '/nurse/medications' },
    { title: 'sidebar.admissionRequests', icon: ClipboardList, path: '/nurse/admission-requests' },
    { title: 'sidebar.servicePackages', icon: HeartPulse, path: '/nurse/service-packages' },
    { title: 'sidebar.incidents', icon: FileText, path: '/nurse/incidents' },
    { title: 'sidebar.leaveRequests', icon: CalendarOff, path: '/nurse/leave' },
    { title: 'sidebar.messages', icon: MessageSquare, path: '/nurse/messages' },
  ],
  family: [
    { title: 'sidebar.familyDashboard', icon: LayoutDashboard, path: '/family/dashboard' },
    { title: 'sidebar.admissionRequests', icon: History, path: '/family/admission-requests' },
    { title: 'sidebar.facilityTourHistory', icon: Calendar, path: '/family/facility-tours' },
    { title: 'sidebar.residentInfo', icon: Users, path: '/family/resident' },
    { title: 'sidebar.notifications', icon: Bell, path: '/family/notifications' },
    { title: 'sidebar.messages', icon: MessageSquare, path: '/family/messages' },
  ],
  pharmacist: [
    { title: 'sidebar.pharmacyOverview', icon: LayoutDashboard, path: '/pharmacist/overview' },
    { title: 'sidebar.myProfile', icon: UserCircle, path: '/pharmacist/profile' },
    { title: 'sidebar.medication', icon: Pill, path: '/pharmacist/medications' },
    { title: 'sidebar.pharmacySuppliers', icon: Truck, path: '/pharmacist/suppliers' },
    { title: 'sidebar.pharmacyStocks', icon: PackageOpen, path: '/pharmacist/stocks' },
    { title: 'sidebar.pharmacyDispense', icon: ShieldCheck, path: '/pharmacist/dispense' },
    { title: 'sidebar.pharmacyReports', icon: FileText, path: '/pharmacist/reports' },
  ],
};
