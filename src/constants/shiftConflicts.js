/** Aligns with backend CONFLICT_TYPES / CONFLICT_SEVERITIES. */
export const CONFLICT_SEVERITIES = ['ERROR', 'WARNING', 'INFO'];

export const CONFLICT_LABEL = {
  INVALID_TIME: 'Giờ ca không hợp lệ',
  OVERLAP: 'Trùng ca',
  LEAVE_CONFLICT: 'Trùng ngày nghỉ',
  MAX_DAILY_HOURS: 'Vượt 12h/ngày',
  MULTIPLE_AREAS: 'Trùng giờ khác khu vực',
  ROLE_MISMATCH: 'Vai trò không phù hợp',
  STAFF_NOT_ASSIGNABLE: 'Không phân công ca (Admin/Quản lý)',
  PAST_DATE: 'Ngày trong quá khứ',
  ROOM_FLOOR_MISMATCH: 'Phòng không thuộc tầng',
  OVERTIME: 'Vượt 48h/tuần',
  REST_VIOLATION: 'Thiếu nghỉ giữa ca',
  UNDERSTAFFED: 'Thiếu nhân viên',
};

export const CONFLICT_ICON = { ERROR: '🔴', WARNING: '🟠', INFO: '🟡' };

const SEVERITY_RANK = { ERROR: 0, WARNING: 1, INFO: 2 };

export const sortConflicts = (conflicts = []) =>
  [...conflicts].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
  );

export const hasBlockingConflicts = (conflicts = []) =>
  conflicts.some((c) => c.severity === 'ERROR');

export const conflictsFromError = (err) => err?.response?.data?.conflicts || [];
