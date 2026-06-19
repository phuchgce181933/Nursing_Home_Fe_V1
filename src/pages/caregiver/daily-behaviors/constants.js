import {
  behaviorTypeLabel,
  moodLevelLabel,
  observationCategoryLabel,
  severityLabel,
} from '../../../utils/behaviorLabels';

const mapOptions = (values, labelFn, t) =>
  values.map((value) => ({ value, label: labelFn(value, t) }));

export const OBSERVATION_CATEGORY_VALUES = ['mood', 'behavior', 'abnormal'];
export const MOOD_LEVEL_VALUES = ['calm', 'happy', 'neutral', 'anxious', 'sad', 'agitated', 'confused', 'irritable'];
export const BEHAVIOR_TYPE_VALUES = [
  'cooperative', 'withdrawn', 'restless', 'wandering', 'verbal_outburst',
  'physical_resistance', 'sleep_disturbance', 'appetite_change', 'social_withdrawal',
  'repetitive_behavior', 'other',
];
export const SEVERITY_VALUES = ['normal', 'mild', 'moderate', 'urgent'];

export const getCategoryFilterOptions = (t) => [
  { value: '', label: t('caregiver.dailyBehaviors.filterAllTypes') },
  ...mapOptions(OBSERVATION_CATEGORY_VALUES, observationCategoryLabel, t),
];

export const getSeverityFilterOptions = (t) => [
  { value: '', label: t('caregiver.dailyBehaviors.filterAllSeverity') },
  ...mapOptions(SEVERITY_VALUES, severityLabel, t),
];

export const getObservationCategoryOptions = (t) =>
  mapOptions(OBSERVATION_CATEGORY_VALUES, observationCategoryLabel, t);

export const getMoodLevelOptions = (t) => mapOptions(MOOD_LEVEL_VALUES, moodLevelLabel, t);

export const getBehaviorTypeOptions = (t) => mapOptions(BEHAVIOR_TYPE_VALUES, behaviorTypeLabel, t);

export const getSeverityOptions = (t) => mapOptions(SEVERITY_VALUES, severityLabel, t);

export const getAbnormalSeverityOptions = (t) =>
  mapOptions(['mild', 'moderate', 'urgent'], severityLabel, t);
