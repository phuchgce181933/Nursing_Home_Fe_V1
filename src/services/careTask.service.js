import axiosClient from '../api/axiosClient';

const unwrapData = (r) => r.data?.data ?? r.data;

/** GET /api/care-tasks/assignment-context?workDate=YYYY-MM-DD */
const getAssignmentContext = (workDate) =>
  axiosClient
    .get('/care-tasks/assignment-context', { params: { workDate } })
    .then(unwrapData);

// GET /api/care-tasks
const listCareTasks = (params = {}) =>
  axiosClient.get('/care-tasks', { params }).then((r) => r.data);

// GET /api/care-tasks/:id
const getCareTask = (id) =>
  axiosClient.get(`/care-tasks/${id}`).then((r) => r.data);

// GET /api/care-tasks/by-shift/:shiftId
const getCareTasksByShift = (shiftId) =>
  axiosClient.get(`/care-tasks/by-shift/${shiftId}`).then((r) => r.data);

// POST /api/care-tasks
// Required: staffProfileId, residentId, taskType, careLevel, workDate
const createCareTask = (data) =>
  axiosClient.post('/care-tasks', data).then(unwrapData);

// PUT /api/care-tasks/:id/status
// status: in_progress | completed | skipped
const updateCareTaskStatus = (id, status, notes = '') =>
  axiosClient.put(`/care-tasks/${id}/status`, { status, notes }).then((r) => r.data);

// DELETE /api/care-tasks/:id  (only pending tasks)
const deleteCareTask = (id) =>
  axiosClient.delete(`/care-tasks/${id}`).then((r) => r.data);

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
