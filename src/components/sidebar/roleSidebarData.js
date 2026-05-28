import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  HeartPulse,
  Pill,
  Activity,
  Bell,
  History,
  ClipboardList,
  FileText,
  UserCircle,
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
    {
      title: 'Thuốc',
      icon: Pill,
      path: '/doctor/medications',
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
    {
      title: 'Yêu cầu Nhập viện',
      icon: ClipboardList,
      path: '/nurse/admission-requests',
    },
    {
      title: 'Gói Dịch vụ',
      icon: HeartPulse,
      path: '/nurse/service-packages',
    },
    {
      title: 'Sự cố',
      icon: FileText,
      path: '/nurse/incidents',
    },
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
};
