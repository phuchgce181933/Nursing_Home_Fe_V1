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
} from "lucide-react";

export const sidebarData = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin/dashboard",
  },

  {
    title: "Authentication",
    icon: Shield,
    children: [
      {
        title: "My Profile",
        path: "/admin/profile",
      },
      {
        title: "Accounts",
        path: "/admin/accounts",
      },
    ],
  },

  {
    title: "Residents",
    icon: Users,
    children: [
      {
        title: "Resident List",
        path: "/admin/residents",
      },
    ],
  },

  {
    title: "Admission Management",
    icon: ClipboardList,
    children: [
      {
        title: "Admission Requests",
        path: "/admin/admission-requests",
      },
      {
        title: "Tour Requests",
        path: "/admin/tour-requests",
      },
      {
        title: "Service Packages",
        path: "/admin/service-packages",
      },
      {
        title: "Thông tin thân nhân",
        path: "/admin/residents/family",
      },
      {
        title: "Cư dân theo khu vực",
        path: "/admin/residents/by-area",
      },
      {
        title: "Sức khỏe ban đầu",
        path: "/admin/residents/initial-health",
      },
      {
        title: "Bệnh lý nền & tiền sử",
        path: "/admin/residents/pre-existing-conditions",
      },
      {
        title: "Dị ứng thuốc",
        path: "/admin/residents/drug-allergies",
      },
      {
        title: "Chuyển phòng cư dân",
        path: "/admin/residents/transfer-room",
      },
    ],
  },


  {
    title: "Buildings & Facilities",
    icon: Building2,
    children: [
      {
        title: "Floors",
        path: "/admin/floors",
      },
      {
        title: "Rooms",
        path: "/admin/rooms",
      },
      {
        title: "Beds",
        path: "/admin/beds",
      },
    ],
  },

  {
    title: "Staff Management",
    icon: ClipboardList,
    children: [
      {
        title: "Hồ sơ nhân viên",
        path: "/admin/staff/profiles",
      },
      {
        title: "Ca làm việc",
        path: "/admin/staff/shifts",
      },
      {
        title: "Phân công khu vực",
        path: "/admin/staff/assignments",
      },
      {
        title: "Sẵn sàng khẩn cấp",
        path: "/admin/staff/emergency",
      },
      {
        title: "Đơn nghỉ phép",
        path: "/admin/staff/leave-requests",
      },
    ],
  },

  {
    title: "Health Monitoring",
    icon: HeartPulse,
    path: "/admin/health",
  },

  {
    title: "Medication",
    icon: Pill,
    path: "/admin/medications",
  },

  {
    title: "Appointments",
    icon: Calendar,
    path: "/admin/appointments",
  },

  {
    title: "Activities",
    icon: Activity,
    path: "/admin/activities",
  },

  {
    title: "Incidents",
    icon: FileText,
    path: "/admin/incidents",
  },

  {
    title: "Reports",
    icon: FileText,
    path: "/admin/reports",
  },

  {
    title: "Notifications",
    icon: Bell,
    path: "/admin/notifications",
  },

  {
    title: "Communication",
    icon: MessageSquare,
    path: "/admin/messages",
  },

  {
    title: "Settings",
    icon: Settings,
    path: "/admin/settings",
  },
];