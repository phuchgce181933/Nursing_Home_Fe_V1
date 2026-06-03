export const REHAB_SESSION_TYPE_LABELS = {
  physical_therapy: 'Vật lý trị liệu',
  occupational_therapy: 'Lao động trị liệu',
  speech_therapy: 'Âm ngữ trị liệu',
  mobility_training: 'Tập vận động / đi lại',
  balance_training: 'Tập thăng bằng',
  group_exercise: 'Tập thể dục nhóm',
  other: 'Khác',
};

export function rehabSessionTypeLabel(type) {
  return REHAB_SESSION_TYPE_LABELS[type] || type || '—';
}
