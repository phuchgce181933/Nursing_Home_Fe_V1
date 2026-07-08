const STAFF_DOB_GENDERS = ['male', 'female'];

const ERROR_KEYS = {
  invalid: 'dateOfBirthInvalid',
  genderRequired: 'genderRequiredForDob',
  minAge: 'dateOfBirthMinAge',
  doctorMinAge: 'dateOfBirthDoctorMinAge',
  maxAgeMale: 'dateOfBirthMaxAgeMale',
  maxAgeFemale: 'dateOfBirthMaxAgeFemale',
};

/**
 * Validates staff date of birth against role/gender age rules.
 * Returns an i18n key under admin.staff.profiles.validation, or null if valid.
 */
export const validateStaffDateOfBirth = (dob, { role, gender } = {}) => {
  if (!dob) return null;

  const d = new Date(dob);
  if (Number.isNaN(d.getTime()) || d > new Date()) {
    return ERROR_KEYS.invalid;
  }

  if (!STAFF_DOB_GENDERS.includes(gender)) {
    return ERROR_KEYS.genderRequired;
  }

  const minYears = role === 'doctor' ? 24 : 18;
  const minBirthDate = new Date();
  minBirthDate.setFullYear(minBirthDate.getFullYear() - minYears);
  if (d > minBirthDate) {
    return role === 'doctor' ? ERROR_KEYS.doctorMinAge : ERROR_KEYS.minAge;
  }

  const maxYears = gender === 'male' ? 60 : 55;
  const maxBirthDate = new Date();
  maxBirthDate.setFullYear(maxBirthDate.getFullYear() - maxYears);
  if (d < maxBirthDate) {
    return gender === 'male' ? ERROR_KEYS.maxAgeMale : ERROR_KEYS.maxAgeFemale;
  }

  return null;
};

export const staffDateOfBirthValidationKey = (errorKey, t) => {
  if (!errorKey) return null;
  return t(`admin.staff.profiles.validation.${errorKey}`);
};
