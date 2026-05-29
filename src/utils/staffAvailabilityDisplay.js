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
  const certs = person?.certifications ?? person?.staffProfile?.certifications ?? [];
  const certPart = Array.isArray(certs) && certs.length ? certs.join(', ') : '';

  if (specialty && certPart) return `${specialty} · ${certPart}`;
  return specialty || certPart || '—';
};

/** Human-readable floor names from staffProfile.responsibleAreaIds */
export const formatResponsibleFloorLabels = (person) => {
  const areas = person?.staffProfile?.responsibleAreaIds ?? person?.responsibleAreaIds;
  if (!Array.isArray(areas) || !areas.length) return '—';

  const labels = areas
    .map((a) => {
      if (typeof a === 'object' && a !== null) {
        return a.name || (a.floorNumber != null ? `Tầng ${a.floorNumber}` : null);
      }
      return null;
    })
    .filter(Boolean);

  return labels.length ? labels.join(', ') : '—';
};

export const formatTaskSummary = (person) =>
  person?.hasTasks ? 'Có nhiệm vụ' : '—';
