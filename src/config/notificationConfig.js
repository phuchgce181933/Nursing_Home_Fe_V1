export const NOTIFICATION_CATEGORIES = ['incident', 'health', 'appointment', 'activity', 'billing'];

export const CATEGORY_LABELS = {
  incident: 'Sự cố',
  health: 'Sức khỏe',
  appointment: 'Cuộc hẹn',
  activity: 'Hoạt động',
  billing: 'Thanh toán',
};

export const NOTIFICATION_TYPES = [
  {
    key: 'incident',
    label: 'Sự cố',
    description: 'Nhận cảnh báo khi có sự cố liên quan đến người được chăm sóc',
  },
  {
    key: 'health',
    label: 'Sức khỏe',
    description: 'Nhận thông báo khi có thay đổi sức khỏe quan trọng',
  },
  {
    key: 'appointment',
    label: 'Cuộc hẹn',
    description: 'Nhận thông báo về lịch hẹn và thay đổi cuộc hẹn',
  },
  {
    key: 'activity',
    label: 'Hoạt động',
    description: 'Nhận thông báo về hoạt động và lịch sinh hoạt',
  },
  {
    key: 'billing',
    label: 'Thanh toán',
    description: 'Nhận thông báo về hoá đơn và thanh toán',
  },
];

export const ROLE_NOTIFICATION_CONFIG = {
  family: {
    visibleCategories: ['incident', 'health', 'appointment', 'activity', 'billing'],
    canViewList: true,
    canMarkRead: true,
    canDelete: true,
    canFilter: true,
    canConfigureSettings: true,
  },

  admin: {
    visibleCategories: ['incident', 'health', 'appointment', 'activity', 'billing'],
    canViewList: true,
    canMarkRead: true,
    canDelete: true,
    canFilter: true,
    canConfigureSettings: false,
  },

  doctor: {
    visibleCategories: ['incident', 'health', 'appointment', 'activity', 'billing'],
    canViewList: true,
    canMarkRead: true,
    canDelete: true,
    canFilter: true,
    canConfigureSettings: false,
  },
  
  nurse: {
    visibleCategories: ['incident', 'health', 'appointment', 'activity', 'billing'],
    canViewList: true,
    canMarkRead: true,
    canDelete: true,
    canFilter: true,
    canConfigureSettings: false,
  },
};
