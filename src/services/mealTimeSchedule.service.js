import axiosClient from '../api/axiosClient';

const unwrap = (r) => r.data?.data ?? r.data;
const BASE = '/nurse/meal-time-schedules';

const getTemplates = () => axiosClient.get(`${BASE}/templates`).then(unwrap);
const listResidents = (params = {}) => axiosClient.get(`${BASE}/residents`, { params }).then(unwrap);
const getPublishedTimes = (params = {}) => axiosClient.get(`${BASE}/published-times`, { params }).then(unwrap);
const createDraft = (payload) => axiosClient.post(`${BASE}/drafts`, payload).then(unwrap);
const updateDraft = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then(unwrap);
const listSchedules = (params = {}) => axiosClient.get(BASE, { params }).then((r) => r.data);
const getSchedule = (id) => axiosClient.get(`${BASE}/${id}`).then(unwrap);
const deleteDraft = (id) => axiosClient.delete(`${BASE}/${id}`).then(unwrap);
const publishSchedule = (id) => axiosClient.post(`${BASE}/${id}/publish`).then(unwrap);

const mealTimeScheduleService = {
  getTemplates,
  listResidents,
  getPublishedTimes,
  createDraft,
  updateDraft,
  listSchedules,
  getSchedule,
  deleteDraft,
  publishSchedule,
};

export default mealTimeScheduleService;
