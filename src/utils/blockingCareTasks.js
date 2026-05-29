/** Parse 409 blockingTasks from staff/shift assignment APIs */
export function getApiErrorPayload(error, fallbackMessage = 'Thao tác thất bại') {
  const data = error?.response?.data;
  return {
    status: error?.response?.status,
    message: data?.message || fallbackMessage,
    blockingTasks: Array.isArray(data?.blockingTasks) ? data.blockingTasks : [],
  };
}

export const CARE_TASK_TYPE_LABELS = {
  morning_care: 'Chăm sóc buổi sáng',
  medication: 'Cho thuốc',
  physical_therapy: 'Vật lý trị liệu',
  meal_assistance: 'Hỗ trợ bữa ăn',
  evening_check: 'Kiểm tra buổi tối',
  emergency_response: 'Ứng phó khẩn cấp',
};

export const CARE_TASK_STATUS_LABELS = {
  pending: 'Chờ',
  in_progress: 'Đang làm',
  completed: 'Hoàn thành',
  skipped: 'Bỏ qua',
};

export function careTaskTypeLabel(value) {
  return CARE_TASK_TYPE_LABELS[value] || value || '—';
}

export function formatBlockingWorkDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('vi-VN');
}

/** User-facing message when backend returns English guard text */
export function blockingCareTasksMessage(apiMessage) {
  if (!apiMessage) {
    return 'Còn nhiệm vụ chăm sóc chưa kết thúc. Hoàn thành, bỏ qua hoặc xóa các nhiệm vụ bên dưới trước khi tiếp tục.';
  }
  if (/complete,\s*skip,\s*or\s*delete/i.test(apiMessage)) {
    return 'Còn nhiệm vụ chăm sóc chưa kết thúc (chờ / đang làm). Hoàn thành, bỏ qua hoặc xóa các nhiệm vụ bên dưới trước khi tiếp tục.';
  }
  return apiMessage;
}
