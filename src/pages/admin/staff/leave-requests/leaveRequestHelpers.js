import { calcInclusiveLeaveDays, formatLeaveDate } from '../../../../utils/leaveUtils';

export const STATUS_LABELS = (t, status) => {
  if (status === 'draft') return t('common.planStatus.draft');
  return t(`common.leaveStatus.${status}`, { defaultValue: status });
};

export const TYPE_LABEL = (t, type) =>
  t(`admin.staff.leaveRequests.types.${type}`, { defaultValue: type });

export const ROLE_LABEL = (t, role) => t(`common.roles.${role}`, { defaultValue: role });

export const SHIFT_STATUS_LABEL = (t, status) => {
  if (status === 'draft') return t('common.planStatus.draft');
  return t(`common.shiftStatus.${status}`, { defaultValue: status });
};

export function replacementDisplay(replacement) {
  if (!replacement) return '—';
  const user = replacement.userId;
  const name = typeof user === 'object' ? user?.fullName : null;
  const code = replacement.staffCode;
  return [name, code ? `(${code})` : ''].filter(Boolean).join(' ') || '—';
}

export function getLeaveDays(request) {
  if (request?.daysRequested != null) return request.daysRequested;
  if (request?.startDate && request?.endDate) {
    return calcInclusiveLeaveDays(
      formatLeaveDate(request.startDate),
      formatLeaveDate(request.endDate)
    );
  }
  return '—';
}

export function getLeaveListPath(role) {
  return role === 'manager' ? '/manager/staff/leave-requests' : '/admin/staff/leave-requests';
}
