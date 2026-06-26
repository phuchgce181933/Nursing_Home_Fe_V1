import {
  LayoutDashboard,
  Users,
  ClipboardList,
  UserCircle,
  Activity,
  Heart,
  MapPin,
  HeartPulse,
  FileText,
  Pill,
  DoorOpen,
  UserCog,
  Clock,
  AlertTriangle,
  CalendarClock,
  Briefcase,
} from 'lucide-react';

export const managerSidebarData = [
  {
    title: 'sidebar.dashboard',
    icon: LayoutDashboard,
    path: '/manager/dashboard',
  },
  {
    title: 'sidebar.myProfile',
    icon: UserCircle,
    path: '/manager/profile',
  },
  {
    title: 'sidebar.residents',
    icon: Users,
    children: [
      { title: 'sidebar.residents', icon: Users, path: '/manager/residents' },
      { title: 'sidebar.familyInfo', icon: Heart, path: '/manager/residents/family' },
      { title: 'sidebar.residentsByArea', icon: MapPin, path: '/manager/residents/by-area' },
      { title: 'sidebar.initialHealth', icon: HeartPulse, path: '/manager/residents/initial-health' },
      { title: 'sidebar.preExistingConditions', icon: FileText, path: '/manager/residents/pre-existing-conditions' },
      { title: 'sidebar.drugAllergies', icon: Pill, path: '/manager/residents/drug-allergies' },
      { title: 'sidebar.transferResident', icon: DoorOpen, path: '/manager/residents/transfer-room' },
    ],
  },
  {
    title: 'sidebar.staffManagement',
    icon: Briefcase,
    children: [
      { title: 'sidebar.staffProfiles', icon: UserCog, path: '/manager/staff/profiles' },
      { title: 'sidebar.shifts', icon: Clock, path: '/manager/staff/shifts' },
      { title: 'sidebar.assignments', icon: MapPin, path: '/manager/staff/assignments' },
      { title: 'sidebar.emergencyAvailability', icon: AlertTriangle, path: '/manager/staff/emergency' },
      { title: 'sidebar.leaveRequests', icon: CalendarClock, path: '/manager/staff/leave-requests' },
    ],
  },
  {
    title: 'sidebar.activityManagement',
    icon: Activity,
    path: '/manager/activity-dashboard',
  },
];
