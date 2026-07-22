export const isFlexibleShift = (shift) => {
  const tpl = shift?.shiftTemplateId;
  return Boolean(tpl?.isFlexibleTime || tpl?.shiftCode === 'SPLIT');
};

export const resolveShiftDisplayTimes = (shift) => ({
  startTime: shift?.startTime || shift?.shiftTemplateId?.startTime || '',
  endTime: shift?.endTime || shift?.shiftTemplateId?.endTime || '',
});

export const resolveShiftDisplayName = (shift, fallback = '') => {
  if (isFlexibleShift(shift) && shift?.name) return shift.name;
  return shift?.shiftTemplateId?.name || shift?.templateName || shift?.name || fallback;
};
