import axiosClient from '../api/axiosClient';

const unwrap = (payload) => payload?.data ?? payload;

const getAll = (params = {}) =>
  axiosClient.get('/staff', { params }).then((r) => r.data);

const getById = (id) =>
  axiosClient.get(`/staff/${id}`).then((r) => r.data);

/**
 * Update basic profile. Accepts plain object; wraps in FormData if avatar file is present.
 * @param {string} id
 * @param {object} data - { fullName, phone, gender, specialty, address, avatarFile?, password? }
 */
const update = (id, data) => {
  const { avatarFile, certificationFiles, removedCertPublicIds, ...rest } = data;
  const hasRemovals = Array.isArray(removedCertPublicIds) && removedCertPublicIds.length > 0;
  const hasFiles = avatarFile || (Array.isArray(certificationFiles) && certificationFiles.length > 0);
  if (hasFiles || hasRemovals) {
    const form = new FormData();
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== undefined && v !== '') form.append(k, v);
    });
    if (avatarFile) form.append('avatar', avatarFile);
    if (Array.isArray(certificationFiles)) {
      certificationFiles.forEach((file) => form.append('certificationFiles', file));
    }
    if (hasRemovals) {
      form.append('removedCertPublicIds', JSON.stringify(removedCertPublicIds));
    }
    return axiosClient.put(`/staff/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  }
  return axiosClient.put(`/staff/${id}`, rest).then((r) => r.data);
};

const updateRole = (id, data) =>
  axiosClient.put(`/staff/${id}/role`, data).then((r) => r.data);

const ban = (id, banReason) =>
  axiosClient.put(`/staff/${id}/ban`, { banReason }).then((r) => r.data);

const unban = (id) =>
  axiosClient.put(`/staff/${id}/unban`).then((r) => r.data);

/**
 * Create new staff account via POST /api/auth/create-staff (multipart/form-data).
 * @param {object} data - { fullName, email, password, role, phone?, gender?, specialty?, certifications?, username?, avatarFile? }
 */
const create = (data) => {
  const { avatarFile, certifications, certificationFiles, ...rest } = data;
  const form = new FormData();
  Object.entries(rest).forEach(([k, v]) => {
    if (v !== undefined && v !== '') form.append(k, v);
  });
  if (Array.isArray(certifications)) {
    certifications.forEach((c) => form.append('certifications', c));
  }
  if (Array.isArray(certificationFiles)) {
    certificationFiles.forEach((file) => form.append('certificationFiles', file));
  }
  if (avatarFile) form.append('avatar', avatarFile);
  return axiosClient.post('/auth/create-staff', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

/**
 * Master-data area assignment. Response may include info[] (e.g. suggest creating a shift).
 * Blocks removing a floor when staff has upcoming shifts on that floor.
 */
const assignAreas = (id, data) =>
  axiosClient.put(`/staff/${id}/areas`, data).then((r) => unwrap(r.data));

/**
 * PUT /api/staff/:id/residents — residentIds: string[] or comma-separated string.
 */
const assignResidents = (id, data) => {
  const { residentIds } = data;
  const payload = {
    residentIds: Array.isArray(residentIds)
      ? residentIds
      : typeof residentIds === 'string'
        ? residentIds
        : [],
  };
  return axiosClient.put(`/staff/${id}/residents`, payload).then((r) => unwrap(r.data));
};

/**
 * GET /api/staff/:id/residents/available
 * Respects responsibleRoomIds (specific rooms) before responsibleAreaIds (whole floors).
 */
const listResidentsAvailable = (userId, params = {}) =>
  axiosClient.get(`/staff/${userId}/residents/available`, { params }).then((r) => r.data);

/** GET /api/staff/:id/residents/assigned — cư dân đã giao ở tab Cư dân phụ trách */
const listAssignedResidents = (userId) =>
  axiosClient.get(`/staff/${userId}/residents/assigned`).then((r) => r.data);

/** Alias for care schedule / assignment UIs */
const getAssignedResidents = listAssignedResidents;

/**
 * @param {Object} [params]
 * @param {string} [params.date] YYYY-MM-DD
 * @param {'doctor'|'nurse'} [params.role]
 * @param {string} [params.floorId]
 * @returns {Promise<import('../types/staffAvailability').StaffAvailabilityResponse>}
 */
const getAvailability = (params = {}) =>
  axiosClient.get('/staff/availability', { params }).then((r) => r.data);

/**
 * GET /api/staff/availability?date= — readinessLevel, hasTasks, phone, staffCode, specialty, certifications.
 * GET area coverage — confirmed shifts on floor for today.
 */
const getAreaCoverageStatus = (floorId) =>
  axiosClient.get(`/staff/floors/${floorId}/coverage`).then((r) => r.data);

const staffService = {
  getAll,
  getById,
  create,
  update,
  updateRole,
  ban,
  unban,
  assignAreas,
  assignResidents,
  listResidentsAvailable,
  listAssignedResidents,
  getAssignedResidents,
  getAvailability,
  getAreaCoverageStatus,
};
export default staffService;
