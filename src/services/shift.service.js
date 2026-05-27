import axiosClient from '../api/axiosClient';

// ── Shift Templates  /api/shift-templates ────────────────────────────────────

const getTemplates = (params = {}) =>
  axiosClient.get('/shift-templates', { params }).then((r) => r.data);

const createTemplate = (data) =>
  axiosClient.post('/shift-templates', data).then((r) => r.data);

const updateTemplate = (id, data) =>
  axiosClient.put(`/shift-templates/${id}`, data).then((r) => r.data);

const updateTemplateStatus = (id, status) =>
  axiosClient.put(`/shift-templates/${id}/status`, { status }).then((r) => r.data);

const deleteTemplate = (id) =>
  axiosClient.delete(`/shift-templates/${id}`).then((r) => r.data);

// ── Shifts  /api/shifts ───────────────────────────────────────────────────────

const listShifts = (params = {}) =>
  axiosClient.get('/shifts', { params }).then((r) => r.data);

const getShift = (id) =>
  axiosClient.get(`/shifts/${id}`).then((r) => r.data);

/**
 * Schedule view — returns shifts in a date range.
 * GET /api/shifts/schedule?fromDate=...&toDate=...
 */
const getSchedule = (fromDate, toDate) =>
  axiosClient
    .get('/shifts/schedule', { params: { fromDate, toDate } })
    .then((r) => r.data);

/**
 * Preview validation conflicts before create/update.
 * GET /api/shifts/check-conflicts
 * Requires assignedStaffId, workDate, startTime, endTime, floorId.
 * Returns { conflicts, hasErrors }
 */
const checkConflicts = (params) =>
  axiosClient.get('/shifts/check-conflicts', { params }).then((r) => {
    const body = r.data;
    return body.data ?? body;
  });

/**
 * Create a shift (status = draft). floorId is required.
 * Blocked on ERROR-level conflicts (400).
 * On success: { shift, conflicts[], areaSync?: { synced, addedFloorIds, addedRoomIds } }
 */
const createShift = (data) =>
  axiosClient.post('/shifts', data).then((r) => r.data);

/**
 * Publish a draft shift. Blocks if ERROR-level conflicts exist.
 * Response: { success, shift, conflicts[] }
 */
const publishShift = (id) =>
  axiosClient.put(`/shifts/${id}/publish`).then((r) => r.data);

/**
 * Confirm a published shift.
 */
const confirmShift = (id) =>
  axiosClient.put(`/shifts/${id}/confirm`).then((r) => r.data);

/**
 * Update a shift. changeReason is required; floorId cannot be removed once set.
 * Blocked on ERROR-level conflicts (400).
 * On success: { shift, conflicts[], areaSync? }
 */
const updateShift = (id, data) =>
  axiosClient.put(`/shifts/${id}`, data).then((r) => r.data);

/**
 * Cancel a shift.
 */
const cancelShift = (id, reason = '') =>
  axiosClient.put(`/shifts/${id}/cancel`, { reason }).then((r) => r.data);

/**
 * Delete a draft shift.
 */
const deleteShift = (id) =>
  axiosClient.delete(`/shifts/${id}`).then((r) => r.data);

const shiftService = {
  // templates
  getTemplates,
  createTemplate,
  updateTemplate,
  updateTemplateStatus,
  deleteTemplate,
  // shifts
  listShifts,
  getShift,
  getSchedule,
  checkConflicts,
  createShift,
  publishShift,
  confirmShift,
  updateShift,
  cancelShift,
  deleteShift,
};

export default shiftService;
