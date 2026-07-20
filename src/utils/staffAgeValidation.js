const STAFF_DOB_GENDERS = ['male', 'female'];

const ERROR_KEYS = {
  invalid: 'dateOfBirthInvalid',
  genderRequired: 'genderRequiredForDob',
  minAge: 'dateOfBirthMinAge',
};

/**
 * Validates staff date of birth against age rules.
 * Returns an i18n key under admin.staff.profiles.validation, or null if valid.
 */
export const validateStaffDateOfBirth = (dob, { gender } = {}) => {
  if (!dob) return null;

  const d = new Date(dob);
  if (Number.isNaN(d.getTime()) || d > new Date()) {
    return ERROR_KEYS.invalid;
  }

  if (!STAFF_DOB_GENDERS.includes(gender)) {
    return ERROR_KEYS.genderRequired;
  }

  const minBirthDate = new Date();
  minBirthDate.setFullYear(minBirthDate.getFullYear() - 18);
  if (d > minBirthDate) {
    return ERROR_KEYS.minAge;
  }

  return null;
};

export const staffDateOfBirthValidationKey = (errorKey, t) => {
  if (!errorKey) return null;
  return t(`admin.staff.profiles.validation.${errorKey}`);
};
