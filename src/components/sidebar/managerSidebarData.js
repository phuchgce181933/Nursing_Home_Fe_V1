import {
  LayoutDashboard,
  Users,
  ClipboardList,
  UserCircle,
  Activity,
} from 'lucide-react';

/** Sidebar cho role manager — vận hành cư dân + quản lý nhân sự (trừ tạo admin/manager). */
export const managerSidebarData = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/manager/dashboard',
  },
  {
    title: 'Hồ sơ cá nhân',
    icon: UserCircle,
    path: '/manager/profile',
  },
  {
    title: 'Cư dân',
    icon: Users,
    children: [
      {
        title: 'Thông tin thân nhân',
        path: '/manager/residents/family',
      },
      {
        title: 'Cư dân theo khu vực',
        path: '/manager/residents/by-area',
      },
      {
        title: 'Sức khỏe ban đầu',
        path: '/manager/residents/initial-health',
      },
      {
        title: 'Bệnh lý nền & tiền sử',
        path: '/manager/residents/pre-existing-conditions',
      },
      {
        title: 'Dị ứng thuốc',
        path: '/manager/residents/drug-allergies',
      },
      {
        title: 'Chuyển phòng cư dân',
        path: '/manager/residents/transfer-room',
      },
    ],
  },
  {
    title: 'Quản lý nhân sự',
    icon: ClipboardList,
    children: [
      {
        title: 'Hồ sơ nhân viên',
        path: '/manager/staff/profiles',
      },
      {
        title: 'Ca làm việc',
        path: '/manager/staff/shifts',
      },
      {
        title: 'Phân công khu vực',
        path: '/manager/staff/assignments',
      },
      {
        title: 'Sẵn sàng khẩn cấp',
        path: '/manager/staff/emergency',
      },
      {
        title: 'Đơn nghỉ phép',
        path: '/manager/staff/leave-requests',
      },
    ],
  },
  {
    title: 'Quản lý Hoạt động',
    icon: Activity,
    path: '/manager/activity-dashboard',
  },
];
