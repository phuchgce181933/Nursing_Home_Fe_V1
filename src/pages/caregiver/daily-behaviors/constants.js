import {
  BEHAVIOR_TYPE_LABELS,
  MOOD_LEVEL_LABELS,
  OBSERVATION_CATEGORY_LABELS,
  SEVERITY_LABELS,
} from '../../../utils/behaviorLabels';

const toOptions = (labels) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const CATEGORY_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả loại' },
  ...toOptions(OBSERVATION_CATEGORY_LABELS),
];

export const SEVERITY_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả mức độ' },
  ...toOptions(SEVERITY_LABELS),
];

export const OBSERVATION_CATEGORY_OPTIONS = toOptions(OBSERVATION_CATEGORY_LABELS);
export const MOOD_LEVEL_OPTIONS = toOptions(MOOD_LEVEL_LABELS);
export const BEHAVIOR_TYPE_OPTIONS = toOptions(BEHAVIOR_TYPE_LABELS);
export const SEVERITY_OPTIONS = toOptions(SEVERITY_LABELS);

export const ABNORMAL_SEVERITY_OPTIONS = SEVERITY_OPTIONS.filter((o) => o.value !== 'normal');
