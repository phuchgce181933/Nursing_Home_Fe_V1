export const mealTypeLabel = (v) => {
  if (v === 'breakfast') return 'Sáng';
  if (v === 'lunch') return 'Trưa';
  if (v === 'dinner') return 'Tối';
  return v;
};

export const dietTypeLabel = (v) => {
  if (v === 'diabetic') return 'Tiểu đường';
  if (v === 'low_sodium') return 'Ít muối';
  if (v === 'renal') return 'Hỗ trợ thận';
  if (v === 'high_protein') return 'Giàu đạm';
  if (v === 'soft_texture') return 'Mềm dễ nuốt';
  if (v === 'liquid_only') return 'Lỏng hoàn toàn';
  if (v === 'custom') return 'Tùy chỉnh';
  return v;
};

export const formatVNDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(`${String(dateStr).slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN');
};

export const formatVNDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
};

export const intakeStatusLabel = (v) => {
  if (v === 'full') return 'Ăn hết';
  if (v === 'partial') return 'Ăn một phần';
  if (v === 'refused') return 'Từ chối ăn';
  if (v === 'assisted') return 'Hỗ trợ ăn';
  return v;
};
