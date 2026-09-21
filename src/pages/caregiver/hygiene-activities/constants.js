import { hygieneActivityLabel, hygieneCategoryLabel } from '../../../utils/hygieneLabels';

export const ACTIVITY_TYPE_DEFS = [
  { value: 'bathing', category: 'personal' },
  { value: 'oral_care', category: 'personal' },
  { value: 'grooming', category: 'personal' },
  { value: 'toileting', category: 'personal' },
  { value: 'diaper_change', category: 'personal' },
  { value: 'room_tidy', category: 'environment' },
  { value: 'bathroom_clean', category: 'environment' },
  { value: 'linen_change', category: 'environment' },
  { value: 'laundry', category: 'environment' },
];

export const COMPLETION_STATUS_VALUES = ['completed', 'partial', 'refused', 'assisted'];

export const getActivityTypeOptions = (t) =>
  ACTIVITY_TYPE_DEFS.map(({ value, category }) => ({
    value,
    category,
    label: hygieneActivityLabel(value, t),
  }));

export const getCompletionStatusOptions = (t) =>
  COMPLETION_STATUS_VALUES.map((value) => ({
    value,
    label: t(`caregiver.hygiene.labels.completion.${value}`),
  }));

export const getCategoryFilterOptions = (t) => [
  { value: '', label: t('caregiver.hygiene.filterAllCategories') },
  ...['personal', 'environment'].map((value) => ({
    value,
    label: hygieneCategoryLabel(value, t),
  })),
];

export const ACTIVITY_TYPES_BY_CATEGORY = {
  personal: ACTIVITY_TYPE_DEFS.filter((d) => d.category === 'personal'),
  environment: ACTIVITY_TYPE_DEFS.filter((d) => d.category === 'environment'),
};
