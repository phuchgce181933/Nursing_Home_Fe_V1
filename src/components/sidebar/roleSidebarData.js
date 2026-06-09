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
  Soup,
  BarChart3,
  Droplets,
  Brain,
  Apple,
  Dumbbell,
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
      title: 'Theo dõi Sức khỏe',
      icon: HeartPulse,
      path: '/doctor/health-monitoring',
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
  caregiver: [
    {
      title: 'Dashboard Caregiver',
      icon: LayoutDashboard,
      path: '/caregiver/dashboard',
    },
    {
      title: 'Hồ sơ cá nhân',
      icon: UserCircle,
      path: '/caregiver/profile',
    },
    {
      title: 'Cư dân phụ trách',
      icon: Users,
      path: '/caregiver/assigned-residents',
    },
    {
      title: 'Lịch chăm sóc',
      icon: ClipboardList,
      path: '/caregiver/daily-care-schedule',
    },
    {
      title: 'Ghi nhận bữa ăn',
      icon: Soup,
      path: '/caregiver/meal-intake-notes',
    },
    {
      title: 'Chế độ ăn uống',
      icon: Apple,
      path: '/caregiver/diet-plans',
    },
    {
      title: 'Lịch phục hồi',
      icon: Dumbbell,
      path: '/caregiver/rehabilitation-schedule',
    },
    {
      title: 'Hoạt động vệ sinh',
      icon: Droplets,
      path: '/caregiver/hygiene-activities',
    },
    {
      title: 'Hành vi hằng ngày',
      icon: Brain,
      path: '/caregiver/daily-behaviors',
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
      title: 'Lịch hoạt động',
      icon: Calendar,
      path: '/nurse/activity-schedule',
    },
    {
      title: 'Ghi chú chăm sóc',
      icon: Activity,
      path: '/nurse/care-notes',
    },
    {
      title: 'Theo dõi Sức khỏe',
      icon: HeartPulse,
      path: '/nurse/health-monitoring',
    },
    {
      title: 'Kế hoạch bữa ăn',
      icon: Soup,
      path: '/nurse/meal-plans',
    },
    {
      title: 'Báo cáo dinh dưỡng',
      icon: BarChart3,
      path: '/nurse/nutrition-reports',
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
