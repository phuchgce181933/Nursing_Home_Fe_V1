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
        title: "Accounts",
        path: "/admin/profile",
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
];