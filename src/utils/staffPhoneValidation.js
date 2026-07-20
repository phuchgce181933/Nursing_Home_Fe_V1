export const STAFF_PHONE_REGEX = /^0\d{9}$/;

export const isValidStaffPhone = (phone) => {
  if (!phone?.trim()) return true;
  return STAFF_PHONE_REGEX.test(phone.trim());
};
