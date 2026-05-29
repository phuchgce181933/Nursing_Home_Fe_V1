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
 * GET /api/leave-requests/:id/replacement-candidates (pending only, admin/manager)
 * Returns { requester, shiftsToCover, candidates[] }
 */
const getReplacementCandidates = (id) =>
  axiosClient.get(`/leave-requests/${id}/replacement-candidates`).then(unwrap);

/**
 * Approve — replacementStaffProfileId required when requester has shifts in leave period.
 * Response: reassignedShifts, reassignedCareTasks, request (with replacement populated)
 */
const approve = (id, { reviewNote = '', replacementStaffProfileId } = {}) => {
  const body = { reviewNote };
  if (replacementStaffProfileId) {
    body.replacementStaffProfileId = replacementStaffProfileId;
  }
  return axiosClient.put(`/leave-requests/${id}/approve`, body).then(unwrap);
};

/**
 * Reject — reviewNote is REQUIRED.
 */
const reject = (id, reviewNote) =>
  axiosClient.put(`/leave-requests/${id}/reject`, { reviewNote }).then(unwrap);

const cancel = (id) =>
  axiosClient.delete(`/leave-requests/${id}`).then(unwrap);

const leaveRequestService = {
  submit,
  getAll,
  getById,
  getReplacementCandidates,
  approve,
  reject,
  cancel,
};
export default leaveRequestService;
