import axiosClient from '../api/axiosClient';

const unwrap = (r) => r.data?.data ?? r.data;

/**
 * Submit a leave request (Doctor/Nurse/Staff).
 * Response may include balanceWarning and/or shiftWarning.
 */
const submit = (data) =>
  axiosClient.post('/leave-requests', data).then(unwrap);

/**
 * List leave requests.
 * Admin/Manager → sees all (filter by staffId).
 * Others → sees own.
 */
const getAll = (params = {}) =>
  axiosClient.get('/leave-requests', { params }).then((r) => r.data);

const getById = (id) =>
  axiosClient.get(`/leave-requests/${id}`).then(unwrap);

/**
 * Approve a leave request. Auto-cancels shifts in leave period.
 * Response includes cancelledShifts { count, shifts } when shifts were cancelled.
 */
const approve = (id, reviewNote = '') =>
  axiosClient.put(`/leave-requests/${id}/approve`, { reviewNote }).then(unwrap);

/**
 * Reject a leave request. reviewNote is REQUIRED by backend.
 */
const reject = (id, reviewNote) =>
  axiosClient.put(`/leave-requests/${id}/reject`, { reviewNote }).then(unwrap);

/**
 * Cancel own pending leave request. DELETE /api/leave-requests/:id
 */
const cancel = (id) =>
  axiosClient.delete(`/leave-requests/${id}`).then(unwrap);

const leaveRequestService = { submit, getAll, getById, approve, reject, cancel };
export default leaveRequestService;
