import {
  COMPLETION_STATUS_LABELS,
  HYGIENE_ACTIVITY_LABELS,
  HYGIENE_CATEGORY_LABELS,
} from '../../../utils/hygieneLabels';

export const COMPLETION_STATUS_OPTIONS = Object.entries(COMPLETION_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const ACTIVITY_TYPE_OPTIONS = Object.entries(HYGIENE_ACTIVITY_LABELS).map(
  ([value, label]) => ({
    value,
    label,
    category: ['bathing', 'oral_care', 'grooming', 'toileting', 'diaper_change'].includes(value)
      ? 'personal'
      : 'environment',
  })
);

export const CATEGORY_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả loại' },
  ...Object.entries(HYGIENE_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

export const ACTIVITY_TYPES_BY_CATEGORY = {
  personal: ACTIVITY_TYPE_OPTIONS.filter((o) => o.category === 'personal'),
  environment: ACTIVITY_TYPE_OPTIONS.filter((o) => o.category === 'environment'),
};
