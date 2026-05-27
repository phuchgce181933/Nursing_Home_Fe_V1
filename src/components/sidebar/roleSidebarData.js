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
      title: 'Bệnh nhân',
      icon: Users,
      path: '/doctor/patients',
    },
    { title: 'Yêu cầu Nhập viện', icon: ClipboardList, path: '/doctor/admission-requests' },
    { title: 'Gói Dịch vụ', icon: HeartPulse, path: '/doctor/service-packages' },
    { title: 'Sự cố', icon: FileText, path: '/doctor/incidents' },
    { title: 'Nghỉ phép', icon: CalendarOff, path: '/doctor/leave' },
    {
      title: 'Tin nhắn',
      icon: MessageSquare,
      path: '/doctor/messages',
    },
  ],
  nurse: [
    {
      title: 'Dashboard Điều dưỡng',
      icon: LayoutDashboard,
      path: '/nurse/dashboard',
    },
    {
      title: 'Hồ sơ cá nhân',
      icon: UserCircle,
      path: '/nurse/profile',
    },
    {
      title: 'Ghi chú chăm sóc',
      icon: Activity,
      path: '/nurse/care-notes',
    },
    {
      title: 'Thuốc',
      icon: Pill,
      path: '/nurse/medications',
    },
    { title: 'Yêu cầu Nhập viện', icon: ClipboardList, path: '/nurse/admission-requests' },
    { title: 'Gói Dịch vụ', icon: HeartPulse, path: '/nurse/service-packages' },
    { title: 'Sự cố', icon: FileText, path: '/nurse/incidents' },
    { title: 'Nghỉ phép', icon: CalendarOff, path: '/nurse/leave' },
    {
      title: 'Tin nhắn',
      icon: MessageSquare,
      path: '/nurse/messages',
    },
  ],
  family: [
    {
      title: 'Trang Gia đình',
      icon: LayoutDashboard,
      path: '/family/dashboard',
    },
    {
      title: 'Lịch sử yêu cầu',
      icon: History,
      path: '/family/admission-requests',
    },
    {
      title: 'Facility Tour History',
      icon: Calendar,
      path: '/family/facility-tours',
    },
    {
      title: 'Người thân',
      icon: Users,
      path: '/family/resident',
    },
    {
      title: 'Thông báo',
      icon: Bell,
      path: '/family/notifications',
    },
    {
      title: 'Tin nhắn',
      icon: MessageSquare,
      path: '/family/messages',
    },
  ],
  pharmacist: [
    {
      title: 'Tổng quan nhà thuốc',
      icon: LayoutDashboard,
      path: '/pharmacist/overview',
    },
    {
      title: 'Hồ sơ cá nhân',
      icon: UserCircle,
      path: '/pharmacist/profile',
    },
    {
      title: 'Quản lý thuốc',
      icon: Pill,
      path: '/pharmacist/medications',
    },
    {
      title: 'Nhà cung cấp',
      icon: Truck,
      path: '/pharmacist/suppliers',
    },
    {
      title: 'Tồn kho',
      icon: PackageOpen,
      path: '/pharmacist/stocks',
    },
    {
      title: 'Cấp phát thuốc',
      icon: ShieldCheck,
      path: '/pharmacist/dispense',
    },
    {
      title: 'Báo cáo',
      icon: FileText,
      path: '/pharmacist/reports',
    },
  ],
};
