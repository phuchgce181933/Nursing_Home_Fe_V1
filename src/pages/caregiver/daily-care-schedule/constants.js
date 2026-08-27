export const CARE_LEVEL_LABELS = {
  low: 'careSchedule.level.low',
  medium: 'careSchedule.level.medium',
  high: 'careSchedule.level.high',
};

export const TASK_STATUS_OPTIONS = [
  { value: '', i18nKey: 'common.all' },
  { value: 'pending', i18nKey: 'careSchedule.status.pending' },
  { value: 'in_progress', i18nKey: 'careSchedule.status.inProgress' },
  { value: 'completed', i18nKey: 'careSchedule.status.completed' },
  { value: 'skipped', i18nKey: 'careSchedule.status.skipped' },
  { value: 'missed', i18nKey: 'careSchedule.status.missed' },
];

export const TASK_STATUS_NEXT = {
  pending: ['in_progress', 'skipped'],
  in_progress: ['completed', 'skipped'],
};

export const STATUS_ACTION_LABELS = {
  in_progress: 'careSchedule.action.start',
  completed: 'careSchedule.action.complete',
  skipped: 'careSchedule.action.skip',
};
