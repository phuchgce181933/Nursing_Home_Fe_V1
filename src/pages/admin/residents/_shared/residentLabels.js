export const getResidencyLabel = (t, status) =>
  status ? t(`common.residency.${status}`, { defaultValue: status }) : '—';

export const getGenderLabel = (t, gender) =>
  gender ? t(`common.gender.${gender}`, { defaultValue: gender }) : '—';

