const PHONE_INVALID_DETAIL = 'phone must be exactly 10 digits starting with 0 (e.g. 0912345678)';

const STAFF_VALIDATION_DETAIL_I18N = {
  [PHONE_INVALID_DETAIL]: 'admin.staff.profiles.validation.phoneInvalid',
  'staff must be at least 18 years old': 'admin.staff.profiles.validation.dateOfBirthMinAge',
  'dateOfBirth is not a valid date': 'admin.staff.profiles.validation.dateOfBirthInvalid',
  'dateOfBirth cannot be in the future': 'admin.staff.profiles.validation.dateOfBirthInvalid',
  'gender must be male or female when date of birth is provided':
    'admin.staff.profiles.validation.genderRequiredForDob',
};

const RESIDENT_VALIDATION_DETAIL_I18N = {
  [PHONE_INVALID_DETAIL]: 'admin.residents.family.validation.phoneInvalid',
};

const VALIDATION_DETAIL_I18N_BY_CODE = {
  RESIDENT_VALIDATION_FAILED: RESIDENT_VALIDATION_DETAIL_I18N,
  AUTH_VALIDATION_FAILED: STAFF_VALIDATION_DETAIL_I18N,
  STAFF_VALIDATION_FAILED: STAFF_VALIDATION_DETAIL_I18N,
};

const VALIDATION_ERROR_CODES = new Set([
  'AUTH_VALIDATION_FAILED',
  'STAFF_VALIDATION_FAILED',
  'RESIDENT_VALIDATION_FAILED',
]);

function translateValidationPart(part, t, errorCode) {
  const trimmed = part.trim();
  const colonIdx = trimmed.indexOf(': ');
  const messagePart = colonIdx >= 0 ? trimmed.slice(colonIdx + 2).trim() : trimmed;
  const map = VALIDATION_DETAIL_I18N_BY_CODE[errorCode] || STAFF_VALIDATION_DETAIL_I18N;
  const key = map[messagePart];
  return key ? t(key) : trimmed;
}

function translateValidationDetail(detail, t, errorCode) {
  if (!detail) return null;
  return detail
    .split('; ')
    .map((part) => translateValidationPart(part, t, errorCode))
    .join('; ');
}

export function resolveApiError(err, t, fallbackKey) {
  const data = err?.response?.data;
  const fallback = fallbackKey ? t(fallbackKey) : (data?.message || '');
  if (!data) return fallback;

  if (VALIDATION_ERROR_CODES.has(data.errorCode) && data.params?.detail) {
    const mapped = translateValidationDetail(data.params.detail, t, data.errorCode);
    if (mapped) return mapped;
  }

  const key = `apiErrors.${data.errorCode}`;
  const translated = t(key, data.params || {});
  if (translated && translated !== key) return translated;
  return data.message || fallback;
}

export function resolveApiSuccess(data, t, fallbackKey) {
  const fallback = fallbackKey ? t(fallbackKey) : (data?.message || '');
  const key = `apiSuccess.${data.messageKey}`;
  const translated = t(key, data.params || {});
  if (translated && translated !== key) return translated;
  return data.message || fallback;
}
