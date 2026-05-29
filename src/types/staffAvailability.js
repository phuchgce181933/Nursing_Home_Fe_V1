/**
 * @typedef {'ready'|'caring'|'off_duty'|'on_leave'} ReadinessLevel
 */

/**
 * @typedef {Object} StaffAvailabilityRow
 * @property {string} _id
 * @property {string} fullName
 * @property {string} email
 * @property {'doctor'|'nurse'} role
 * @property {string|null} [avatarUrl]
 * @property {string|null} phone
 * @property {string|null} staffCode
 * @property {string|null} specialty
 * @property {string[]} certifications
 * @property {ReadinessLevel} readinessLevel
 * @property {string} readinessLabelVi
 * @property {string} availabilityStatus
 * @property {boolean} isOnShift
 * @property {boolean} onLeave
 * @property {boolean} onShift
 * @property {boolean} hasTasks
 * @property {Object|null} currentShift
 * @property {Object|null} [staffProfile]
 */

/**
 * @typedef {Object} StaffAvailabilityResponse
 * @property {string|Date} date
 * @property {string|null} checkedAt
 * @property {string|null} floorId
 * @property {{ ready: number, caring: number, offDuty: number, onLeave: number }} summary
 * @property {StaffAvailabilityRow[]} data
 */

export {};
