import axiosClient from '../api/axiosClient';

const unwrapData = (r) => r.data?.data ?? r.data;

const BASE = '/staff/care-tasks';

/** GET /api/staff/care-tasks/assignment-context?workDate=YYYY-MM-DD (optional — may 404) */
const getAssignmentContext = (workDate) =>
  axiosClient
    .get(`${BASE}/assignment-context`, { params: { workDate } })
    .then(unwrapData);

/** GET /api/staff/care-tasks?workDate=YYYY-MM-DD */
const listCareTasks = (params = {}) =>
  axiosClient.get(BASE, { params }).then(unwrapData);

/** GET /api/staff/care-tasks/:id */
const getCareTask = (id) =>
  axiosClient.get(`${BASE}/${id}`).then(unwrapData);

/** GET /api/staff/care-tasks/by-shift/:shiftId */
const getCareTasksByShift = (shiftId) =>
  axiosClient.get(`${BASE}/by-shift/${shiftId}`).then(unwrapData);

/** POST /api/staff/care-tasks */
const createCareTask = (data) =>
  axiosClient.post(BASE, data).then(unwrapData);

/** PUT /api/staff/care-tasks/:id/status */
const updateCareTaskStatus = (id, status, notes = '') =>
  axiosClient.put(`${BASE}/${id}/status`, { status, notes }).then(unwrapData);

/** DELETE /api/staff/care-tasks/:id */
const deleteCareTask = (id) =>
  axiosClient.delete(`${BASE}/${id}`).then(unwrapData);

const careTaskService = {
  getAssignmentContext,
  listCareTasks,
  getCareTask,
  getCareTasksByShift,
  createCareTask,
  updateCareTaskStatus,
  deleteCareTask,
};
export default careTaskService;
