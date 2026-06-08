export const HYGIENE_CATEGORY_LABELS = {
  personal: 'Vệ sinh cá nhân',
  environment: 'Dọn dẹp / môi trường',
};

export const HYGIENE_ACTIVITY_LABELS = {
  bathing: 'Tắm / rửa người',
  oral_care: 'Vệ sinh răng miệng',
  grooming: 'Chải tóc, thay quần áo',
  toileting: 'Hỗ trợ vệ sinh WC',
  diaper_change: 'Thay tã / băng vệ sinh',
  room_tidy: 'Dọn phòng, sắp xếp',
  bathroom_clean: 'Vệ sinh phòng tắm',
  linen_change: 'Thay ga, gối, khăn',
  laundry: 'Giặt / phơi đồ (hỗ trợ)',
};

export const COMPLETION_STATUS_LABELS = {
  completed: 'Hoàn thành',
  partial: 'Một phần',
  refused: 'Không hợp tác / từ chối',
  assisted: 'Hỗ trợ hoàn thành',
};

export function hygieneActivityLabel(type) {
  return HYGIENE_ACTIVITY_LABELS[type] || type || '—';
}

export function hygieneCategoryLabel(cat) {
  return HYGIENE_CATEGORY_LABELS[cat] || cat || '—';
}

export function completionStatusLabel(status) {
  return COMPLETION_STATUS_LABELS[status] || status || '—';
}
