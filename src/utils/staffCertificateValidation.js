const ROLES_REQUIRING_CERT = ['doctor', 'nurse'];
const CERTIFICATE_MAX_AGE_YEARS = 5;

export const ERROR_KEYS = {
  certRequired: 'certRequired',
  certIssueDateRequired: 'certIssueDateRequired',
  certIssueDateInvalid: 'certIssueDateInvalid',
  certIssueDateExpired: 'certIssueDateExpired',
};

/**
 * Validates certification documents for doctor/nurse roles.
 * @param {string} role
 * @param {{ issueDate?: string|Date }[]} docs
 * @returns {string|null} i18n key under admin.staff.profiles.validation
 */
export const validateStaffCertifications = (role, docs = []) => {
  if (!ROLES_REQUIRING_CERT.includes(role)) return null;

  if (!docs.length) return ERROR_KEYS.certRequired;

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - CERTIFICATE_MAX_AGE_YEARS);
  minDate.setHours(0, 0, 0, 0);

  for (const doc of docs) {
    if (!doc?.issueDate) return ERROR_KEYS.certIssueDateRequired;

    const d = new Date(doc.issueDate);
    if (Number.isNaN(d.getTime()) || d > now) {
      return ERROR_KEYS.certIssueDateInvalid;
    }
    if (d < minDate) return ERROR_KEYS.certIssueDateExpired;
  }

  return null;
};

export const staffCertificationValidationKey = (errorKey, t) => {
  if (!errorKey) return null;
  return t(`admin.staff.profiles.validation.${errorKey}`);
};

export const requiresStaffCertification = (role) => ROLES_REQUIRING_CERT.includes(role);
