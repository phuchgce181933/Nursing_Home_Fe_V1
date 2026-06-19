export const getResidencyLabel = (t, status) =>
  status ? t(`common.residency.${status}`, { defaultValue: status }) : '—';

export const getGenderLabel = (t, gender) =>
  gender ? t(`common.gender.${gender}`, { defaultValue: gender }) : '—';

/** @deprecated Use getResidencyLabel(t, status) */
export const RESIDENCY_LABELS = {
  pending: 'Chờ nhập viện',
  admitted: 'Đang điều trị',
  discharged: 'Đã xuất viện',
  transferred: 'Chuyển viện',
  deceased: 'Đã qua đời',
};

/** @deprecated Use getGenderLabel(t, gender) */
export const GENDER_LABELS = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
  unknown: 'Không rõ',
};
