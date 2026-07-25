import i18n from '../i18n';
import { formatFloorWithBuilding } from './residentArea';

/**
 * @param {import('../types/staffAvailability').StaffAvailabilityRow} person
 */
export const resolveStaffPhone = (person) => person?.phone?.trim() || null;

/**
 * @param {import('../types/staffAvailability').StaffAvailabilityRow} person
 */
export const resolveStaffCode = (person) =>
  person?.staffCode || person?.staffProfile?.staffCode || null;

/**
 * @param {import('../types/staffAvailability').StaffAvailabilityRow} person
 */
export const formatExpertiseLabel = (person) => {
  const specialty = person?.specialty || person?.staffProfile?.specialty;
  return specialty?.trim() || '—';
};

function resolveT(t) {
  return t || ((key, opts) => i18n.t(key, opts));
}

/** Human-readable floor names (with building) from staffProfile.responsibleAreaIds */
export const formatResponsibleFloorLabels = (person, t, { floorById, buildingById } = {}) => {
  const tt = resolveT(t);
  const areas = person?.staffProfile?.responsibleAreaIds ?? person?.responsibleAreaIds;
  if (!Array.isArray(areas) || !areas.length) return '—';

  const lookup = { floorById, buildingById };
  const labels = areas
    .map((area) => {
      if (typeof area === 'object' && area !== null) {
        return formatFloorWithBuilding(area, tt, lookup);
      }
      if (typeof area === 'string') {
        return formatFloorWithBuilding(area, tt, lookup);
      }
      return null;
    })
    .filter(Boolean);

  return labels.length ? labels.join(', ') : '—';
};

export const formatTaskSummary = (person, t) => {
  const tt = resolveT(t);
  return person?.hasTasks ? tt('admin.staff.emergency.hasTasks') : '—';
};
