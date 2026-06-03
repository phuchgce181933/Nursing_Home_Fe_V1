import axiosClient from '../api/axiosClient';

const unwrap = (r) => r.data?.data ?? r.data;
const BASE = '/caregiver/care-tasks';

const listTasks = (params = {}) =>
  axiosClient.get(BASE, { params }).then((r) => ({
    data: r.data?.data ?? [],
    total: r.data?.total ?? 0,
    page: r.data?.page,
    limit: r.data?.limit,
    totalPages: r.data?.totalPages,
  }));

const getTask = (id) => axiosClient.get(`${BASE}/${id}`).then(unwrap);

const updateStatus = (id, status, notes = '') =>
  axiosClient.put(`${BASE}/${id}/status`, { status, notes }).then(unwrap);

const caregiverCareTaskService = {
  listTasks,
  getTask,
  updateStatus,
};

export default caregiverCareTaskService;
