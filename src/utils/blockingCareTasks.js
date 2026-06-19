import i18n from '../i18n';

function resolveT(t) {
  return t || ((key, opts) => i18n.t(key, opts));
}

function resolveLocale(language) {
  const lang = language || i18n.language;
  return lang?.startsWith('vi') ? 'vi-VN' : 'en-US';
}

/** Parse 409 blockingTasks from staff/shift assignment APIs */
export function getApiErrorPayload(error, fallbackMessage) {
  const data = error?.response?.data;
  const fallback = fallbackMessage || i18n.t('admin.staff.blockingTasks.operationFailed');
  return {
    status: error?.response?.status,
    message: data?.message || fallback,
    blockingTasks: Array.isArray(data?.blockingTasks) ? data.blockingTasks : [],
  };
}

export function careTaskTypeLabel(value, t) {
  const tt = resolveT(t);
  if (!value) return '—';
  return tt(`admin.staff.assignments.taskTypes.${value}`, { defaultValue: value });
}

export function careTaskStatusLabel(value, t) {
  const tt = resolveT(t);
  if (!value) return '—';
  return tt(`common.careTaskStatus.${value}`, { defaultValue: value });
}

/** @deprecated Use careTaskStatusLabel */
export const CARE_TASK_STATUS_LABELS = {
  pending: 'Chờ',
  in_progress: 'Đang làm',
  completed: 'Hoàn thành',
  skipped: 'Bỏ qua',
  missed: 'Bỏ lỡ',
};

/** @deprecated Use careTaskTypeLabel */
export const CARE_TASK_TYPE_LABELS = {
  morning_care: 'Chăm sóc buổi sáng',
  medication: 'Cho thuốc',
  physical_therapy: 'Vật lý trị liệu',
  meal_assistance: 'Hỗ trợ bữa ăn',
  evening_check: 'Kiểm tra buổi tối',
  emergency_response: 'Ứng phó khẩn cấp',
};

export function formatBlockingWorkDate(value, language) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(resolveLocale(language));
}

/** User-facing message when backend returns English guard text */
export function blockingCareTasksMessage(apiMessage, t) {
  const tt = resolveT(t);
  if (!apiMessage) {
    return tt('admin.staff.blockingTasks.message');
  }
  if (/complete,\s*skip,\s*or\s*delete/i.test(apiMessage)) {
    return tt('admin.staff.blockingTasks.messageEnglishGuard');
  }
  return apiMessage;
}
