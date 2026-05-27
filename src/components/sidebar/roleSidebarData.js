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
} from 'lucide-react';

export const roleSidebarData = {
  doctor: [
    {
      title: 'Dashboard Bác sĩ',
      icon: LayoutDashboard,
      path: '/doctor/dashboard',
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
    {
      title: 'Dashboard Điều dưỡng',
      icon: LayoutDashboard,
      path: '/nurse/dashboard',
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
      title: 'Nghỉ phép',
      icon: CalendarOff,
      path: '/nurse/leave',
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
