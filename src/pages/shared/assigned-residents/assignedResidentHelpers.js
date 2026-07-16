import { pickDrugAllergiesList } from '../../../utils/residentArea';

export function getAssignedResidentsBasePath(role) {
  if (role === 'doctor') return '/doctor/assigned-residents';
  if (role === 'nurse') return '/nurse/assigned-residents';
  return '/caregiver/assigned-residents';
}

export function getAssignedResidentsI18nNs(role) {
  return `${role}.assignedResidents`;
}

export function formatAllergies(row, t, ns) {
  const drug = pickDrugAllergiesList(row);
  const food = (row.allergies || []).filter(
    (a) => !drug.some((d) => d.toLowerCase() === String(a).toLowerCase())
  );
  const parts = [];
  if (drug.length) parts.push(`${t(`${ns}.allergiesDrug`)}: ${drug.join(', ')}`);
  if (food.length) parts.push(`${t(`${ns}.allergiesOther`)}: ${food.join(', ')}`);
  return parts.length ? parts.join(' · ') : '—';
}

export function formatConditions(row) {
  const list = row.chronicConditions || [];
  return list.length ? list.join(', ') : '—';
}

export function hasMedicalAlerts(row) {
  const drug = pickDrugAllergiesList(row);
  const food = (row.allergies || []).filter(Boolean);
  const conditions = row.chronicConditions || [];
  return drug.length > 0 || food.length > 0 || conditions.length > 0;
}

export function formatAdmittedAt(value, locale) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(locale);
}

export function formatActivityTime(value, locale) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

export function buildActivityMap(activities = []) {
  return activities.reduce((acc, activity) => {
    const residentIds = Array.isArray(activity.participantResidentIds) ? activity.participantResidentIds : [];
    residentIds.forEach((residentId) => {
      const key = String(residentId);
      if (!acc[key]) acc[key] = [];
      acc[key].push(activity);
    });
    return acc;
  }, {});
}
