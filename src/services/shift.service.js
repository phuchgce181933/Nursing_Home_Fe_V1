import axiosClient from '../api/axiosClient';

// ── Shift Templates  /api/shift-templates (read-only: system shifts incl. SPLIT) ─

/** GET /shift-templates → { data: Template[], totalHoursPerDay } */
const getTemplates = (params = {}) =>
  axiosClient.get('/shift-templates', { params }).then((r) => r.data);

// ── Shifts  /api/shifts ───────────────────────────────────────────────────────

/** GET /shifts → { data: Shift[], total, totalHours, page, limit, totalPages } */
const listShifts = (params = {}) =>
  axiosClient.get('/shifts', { params }).then((r) => r.data);

/** GET /shifts/my → shifts assigned to the logged-in staff member */
const getMyShifts = (params = {}) =>
  axiosClient.get('/shifts/my', { params }).then((r) => r.data);

const getShift = (id) =>
  axiosClient.get(`/shifts/${id}`).then((r) => r.data);

/**
 * Schedule view — returns shifts in a date range.
 * GET /api/shifts/schedule?fromDate=...&toDate=...
 * Response: { data: Shift[], totalHours }
 */
const getSchedule = (fromDate, toDate) =>
  axiosClient
    .get('/shifts/schedule', { params: { fromDate, toDate } })
    .then((r) => r.data);

/**
 * Preview validation conflicts before create/update.
 * GET /api/shifts/check-conflicts
 * Requires assignedStaffId, workDate, shiftTemplateId. For SPLIT (ca gãy), also pass startTime and endTime.
 * Returns { conflicts, hasErrors }
 */
const checkConflicts = (params) =>
  axiosClient.get('/shifts/check-conflicts', { params }).then((r) => {
    const body = r.data;
    return body.data ?? body;
  });

/**
 * Create a shift (status = draft). Times from template, or startTime/endTime for SPLIT.
 * Required: shiftTemplateId, workDate, assignedStaffId.
 * Blocked on ERROR-level conflicts (400).
 * On success: { shift, conflicts[] }
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
 * Mark a confirmed shift as completed (within 15 min after shift end).
 */
const completeShift = (id) =>
  axiosClient.put(`/shifts/${id}/complete`).then((r) => r.data);

/**
 * Update a shift. changeReason is optional.
 * Allowed fields: workDate, assignedStaffId, shiftTemplateId, taskDescription, notes.
 * Blocked on ERROR-level conflicts (400).
 * On success: { shift, conflicts[] }
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
  getTemplates,
  listShifts,
  getMyShifts,
  getShift,
  getSchedule,
  checkConflicts,
  createShift,
  publishShift,
  confirmShift,
  completeShift,
  updateShift,
  cancelShift,
  deleteShift,
};

export default shiftService;
