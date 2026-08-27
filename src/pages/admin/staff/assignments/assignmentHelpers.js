import { NON_ASSIGNABLE_ROLES, canReceiveCareTask } from '../../../../utils/staffAssignable';
import { filterShiftsNotEnded } from '../../../../utils/dateUtils';

export const ELIGIBLE_SHIFT_STATUSES = ['published', 'confirmed'];

export const TASK_TYPE_VALUES = [
  'morning_care',
  'medication',
  'physical_therapy',
  'meal_assistance',
  'evening_check',
  'emergency_response',
];

export const CARE_LEVEL_VALUES = ['low', 'medium', 'high'];

export const CARE_LEVEL_EMOJI = { low: '🟢', medium: '🟠', high: '🔴' };

export const ASSIGNMENT_TABS = ['area', 'residents', 'tasks'];

export function getAssignmentBasePath(role) {
  return '/admin/staff/assignments';
}

export function getAssignmentListUrl(basePath, { tab = 'area', date } = {}) {
  const params = new URLSearchParams();
  if (tab) params.set('tab', tab);
  if (date) params.set('date', date);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export const dateLocale = (language) => (language === 'vi' ? 'vi-VN' : 'en-US');

export function formatAssignmentDate(iso, language) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(dateLocale(language), {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const roleLabel = (t, role) => t(`common.roles.${role}`, { defaultValue: role });

export const shiftStatusLabel = (t, status) =>
  t(`common.shiftStatus.${status}`, { defaultValue: status });

export const filterAssignableStaff = (list) =>
  (list || []).filter(
    (s) => !NON_ASSIGNABLE_ROLES.includes(String(s.role || '').toLowerCase())
  );

export const filterEligibleShifts = (shifts) =>
  (shifts || []).filter((s) => ELIGIBLE_SHIFT_STATUSES.includes(s.status));

export const buildShiftTimeLabel = (shifts) =>
  shifts.length ? shifts.map((s) => `${s.startTime} – ${s.endTime}`).join(', ') : '';

export const resolveShiftSummaryForDisplay = (summary, assignmentDate, now = new Date()) => {
  if (!summary) return null;
  const active = filterShiftsNotEnded(
    filterEligibleShifts(summary.shiftsOnDate),
    assignmentDate,
    now
  );
  return {
    ...summary,
    shiftsOnDate: active,
    hasShiftOnDate: active.length > 0,
    shiftTimeLabel: buildShiftTimeLabel(active),
  };
};

export const hasActiveShiftOnDate = (staff, assignmentDate, displayNow) => {
  const resolved = resolveShiftSummaryForDisplay(staff?.shiftSummary, assignmentDate, displayNow);
  return Boolean(resolved?.hasShiftOnDate);
};

export const isStaffVisibleForAreaResidentTabs = (staff, assignmentDate, displayNow) =>
  canReceiveCareTask(staff) || hasActiveShiftOnDate(staff, assignmentDate, displayNow);

export function areaIdsFromProfile(profile) {
  const floorIds = (profile?.responsibleAreaIds || []).map((f) =>
    String(typeof f === 'object' ? f._id : f)
  );
  const roomIds = (profile?.responsibleRoomIds || []).map((r) =>
    String(typeof r === 'object' ? r._id : r)
  );
  return { floorIds, roomIds };
}

export function assignedResidentIdsFromProfile(profile) {
  return (profile?.assignedResidentIds || []).map((r) =>
    String(typeof r === 'object' ? r._id : r)
  );
}

export const taskTypeLabel = (t, value) =>
  t(`admin.staff.assignments.taskTypes.${value}`, { defaultValue: value });

export const careLevelLabel = (t, value) => {
  const emoji = CARE_LEVEL_EMOJI[value] || '';
  const label = t(`common.careLevel.${value}`, { defaultValue: value });
  return emoji ? `${emoji} ${label}` : label;
};

export function residentPickerLabel(r, t) {
  const room = r.roomId;
  const roomNum = typeof room === 'object' ? room?.roomNumber : '';
  const code = r.residentCode ? ` (${r.residentCode})` : '';
  const roomPrefix = t('admin.staff.assignments.residents.roomPrefix');
  return `${r.fullName || t('admin.staff.assignments.residents.defaultResidentLabel')}${code}${roomNum ? ` · ${roomPrefix}${roomNum}` : ''}`;
}

export function formatAssignedResidentRoom(resident, t) {
  const room = resident?.roomId;
  const roomNum = typeof room === 'object' ? room?.roomNumber : '';
  if (roomNum == null || roomNum === '') return null;
  const roomPrefix = t('admin.staff.assignments.residents.roomPrefix');
  return `${roomPrefix}${roomNum}`;
}
