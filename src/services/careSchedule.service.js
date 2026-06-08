import axiosClient from '../api/axiosClient';

const unwrapData = (r) => r.data?.data ?? r.data;
const BASE = '/staff/care-schedules';

const getTemplates = () => axiosClient.get(`${BASE}/templates`).then(unwrapData);

const createDraft = (payload) => axiosClient.post(`${BASE}/drafts`, payload).then(unwrapData);

const updateDraft = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then(unwrapData);

const listSchedules = (params = {}) => axiosClient.get(BASE, { params }).then((r) => r.data);

const getSchedule = (id) => axiosClient.get(`${BASE}/${id}`).then(unwrapData);

const deleteDraft = (id) => axiosClient.delete(`${BASE}/${id}`).then(unwrapData);

const publishSchedule = (id) => axiosClient.post(`${BASE}/${id}/publish`).then(unwrapData);

const careScheduleService = {
  getTemplates,
  createDraft,
  updateDraft,
  listSchedules,
  getSchedule,
  deleteDraft,
  publishSchedule,
};

export default careScheduleService;

