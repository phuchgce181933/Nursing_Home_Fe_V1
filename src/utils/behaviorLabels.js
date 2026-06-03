export const OBSERVATION_CATEGORY_LABELS = {
  mood: 'Tâm trạng',
  behavior: 'Hành vi',
  abnormal: 'Biểu hiện bất thường',
};

export const MOOD_LEVEL_LABELS = {
  calm: 'Bình tĩnh',
  happy: 'Vui vẻ',
  neutral: 'Trung tính',
  anxious: 'Lo âu',
  sad: 'Buồn',
  agitated: 'Kích động',
  confused: 'Lú lẫn',
  irritable: 'Cáu gắt',
};

export const BEHAVIOR_TYPE_LABELS = {
  cooperative: 'Hợp tác',
  withdrawn: 'Thu mình',
  restless: 'Bồn chồn',
  wandering: 'Đi lang thang',
  verbal_outburst: 'La hét / nói to',
  physical_resistance: 'Chống đối thể chất',
  sleep_disturbance: 'Rối loạn giấc ngủ',
  appetite_change: 'Thay đổi ăn uống',
  social_withdrawal: 'Tránh giao tiếp',
  repetitive_behavior: 'Lặp lại hành vi',
  other: 'Khác',
};

export const SEVERITY_LABELS = {
  normal: 'Bình thường',
  mild: 'Nhẹ',
  moderate: 'Trung bình',
  urgent: 'Cần xử lý gấp',
};

export function observationCategoryLabel(cat) {
  return OBSERVATION_CATEGORY_LABELS[cat] || cat || '—';
}

export function moodLevelLabel(level) {
  return MOOD_LEVEL_LABELS[level] || level || '—';
}

export function behaviorTypeLabel(type) {
  return BEHAVIOR_TYPE_LABELS[type] || type || '—';
}

export function severityLabel(severity) {
  return SEVERITY_LABELS[severity] || severity || '—';
}
