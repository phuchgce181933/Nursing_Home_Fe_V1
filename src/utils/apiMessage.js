const PHONE_INVALID_DETAIL = 'phone must be exactly 10 digits starting with 0 (e.g. 0912345678)';

const STAFF_VALIDATION_DETAIL_I18N = {
  [PHONE_INVALID_DETAIL]: 'admin.staff.profiles.validation.phoneInvalid',
  'dateOfBirth is required': 'admin.staff.profiles.validation.dateOfBirthRequired',
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

const MEAL_TYPE_ALIASES = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  'bữa sáng': 'breakfast',
  'bua sang': 'breakfast',
  'bữa trưa': 'lunch',
  'bua trua': 'lunch',
  'bữa tối': 'dinner',
  'bua toi': 'dinner',
};

function normalizeMealApiParams(params, t) {
  if (!params || typeof params !== 'object') return params;
  const next = { ...params };
  if (next.mealType) {
    const alias = MEAL_TYPE_ALIASES[String(next.mealType).trim().toLowerCase()];
    next.mealType = alias
      ? t(`common.mealType.${alias}`, { defaultValue: next.mealType })
      : next.mealType;
  }
  return next;
}

function translateMealPublishConflictLine(line, t) {
  const trimmed = String(line || '').trim().replace(/\.$/, '');
  if (!trimmed) return null;

  const mealTypeMatch = trimmed.match(
    /^(?:Cư dân|Resident) (?:đã có|already has) (.+?) (?:trong ngày này|on this date) \((.+?) - (\d{4}-\d{2}-\d{2}), (?:đã đăng|published)\)$/i
  );
  if (mealTypeMatch) {
    const [, rawMealType, planTitle, workDate] = mealTypeMatch;
    const alias = MEAL_TYPE_ALIASES[String(rawMealType).trim().toLowerCase()];
    const mealType = alias ? t(`common.mealType.${alias}`) : rawMealType;
    return t('apiErrors.MEAL_PLAN_PUBLISH_DUPLICATE_MEAL_TYPE', { mealType, planTitle, workDate });
  }

  const mealTimeMatch = trimmed.match(
    /^(?:Cư dân|Resident) (?:đã có bữa lúc|already has a meal at) (\d{2}:\d{2}) (?:trong ngày này|on this date) \((.+?) - (\d{4}-\d{2}-\d{2}), (?:đã đăng|published)\)$/i
  );
  if (mealTimeMatch) {
    const [, mealTime, planTitle, workDate] = mealTimeMatch;
    return t('apiErrors.MEAL_PLAN_PUBLISH_DUPLICATE_MEAL_TIME', { mealTime, planTitle, workDate });
  }

  return null;
}

function translateMealPublishConflictMessage(message, t) {
  if (!message || typeof message !== 'string') return null;
  const chunks = message
    .split(/\.\s+(?=Cư dân|Resident)/)
    .map((part) => part.trim())
    .filter(Boolean);
  const lines = (chunks.length ? chunks : [message.trim()])
    .map((part) => translateMealPublishConflictLine(part, t))
    .filter(Boolean);
  return lines.length ? lines.join(' ') : null;
}

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
  const params = normalizeMealApiParams(data.params, t);
  const translated = t(key, params);
  if (translated && translated !== key) return translated;

  const mealConflict = translateMealPublishConflictMessage(data.message, t);
  if (mealConflict) return mealConflict;

  return data.message || fallback;
}

export function resolveApiSuccess(data, t, fallbackKey) {
  const fallback = fallbackKey ? t(fallbackKey) : (data?.message || '');
  const key = `apiSuccess.${data.messageKey}`;
  const translated = t(key, data.params || {});
  if (translated && translated !== key) return translated;
  return data.message || fallback;
}
