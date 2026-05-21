import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  HeartPulse,
  Pill,
  Activity,
  Bell,
  Building2,
  FileText,
  Shield,
  ClipboardList,
  Settings,
} from "lucide-react";

export const sidebarData = {
  admin: [
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
          title: "Accounts",
          path: "/admin/profile",
        },
        {
          title: "Edit Profile Account",
          path: "/admin/profile/edit",
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
        {
          title: "Add Resident",
          path: "/admin/residents/create",
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
      path: "/admin/staff",
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
  ],

  doctor: [
    {
      title: "Dashboard Bác sĩ",
      icon: LayoutDashboard,
      path: "/doctor/dashboard",
    },
    {
      title: "Lịch khám",
      icon: Calendar,
      path: "/doctor/appointments",
    },
    {
      title: "Bệnh nhân",
      icon: Users,
      path: "/doctor/patients",
    },
    {
      title: "Tin nhắn",
      icon: MessageSquare,
      path: "/doctor/messages",
    },
  ],

  nurse: [
    {
      title: "Dashboard Điều dưỡng",
      icon: LayoutDashboard,
      path: "/nurse/dashboard",
    },
    {
      title: "Ghi chú chăm sóc",
      icon: Activity,
      path: "/nurse/care-notes",
    },
    {
      title: "Thuốc",
      icon: Pill,
      path: "/nurse/medications",
    },
    {
      title: "Tin nhắn",
      icon: MessageSquare,
      path: "/nurse/messages",
    },
  ],

  family: [
    {
      title: "Trang Gia đình",
      icon: LayoutDashboard,
      path: "/family/dashboard",
    },
    {
      title: "Người thân",
      icon: Users,
      path: "/family/resident",
    },
    {
      title: "Thông báo",
      icon: Bell,
      path: "/family/notifications",
    },
    {
      title: "Tin nhắn",
      icon: MessageSquare,
      path: "/family/messages",
    },
  ],
};