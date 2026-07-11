export const PHONE_REGEX = /^0\d{9}$/;

export const validatePhoneFormat = (phone) => {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return null;
  if (!PHONE_REGEX.test(trimmed)) return 'phoneInvalid';
  return null;
};
