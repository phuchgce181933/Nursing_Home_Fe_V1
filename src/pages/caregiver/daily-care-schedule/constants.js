export const CARE_LEVEL_LABELS = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
};

export const TASK_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ' },
  { value: 'in_progress', label: 'Đang làm' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'skipped', label: 'Bỏ qua' },
  { value: 'missed', label: 'Bỏ lỡ' },
];

export const TASK_STATUS_NEXT = {
  pending: ['in_progress', 'skipped'],
  in_progress: ['completed', 'skipped'],
};

export const STATUS_ACTION_LABELS = {
  in_progress: 'Bắt đầu',
  completed: 'Hoàn thành',
  skipped: 'Bỏ qua',
};
