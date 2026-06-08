import axiosClient from '../api/axiosClient';

const unwrap = (r) => r.data?.data ?? r.data;
const BASE = '/nurse/special-diets';

const getTemplates = () => axiosClient.get(`${BASE}/templates`).then(unwrap);
const listResidents = (params = {}) => axiosClient.get(`${BASE}/residents`, { params }).then(unwrap);
const createDraft = (payload) => axiosClient.post(`${BASE}/drafts`, payload).then(unwrap);
const updateDraft = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then(unwrap);
const listPlans = (params = {}) => axiosClient.get(BASE, { params }).then((r) => r.data);
const getPlan = (id) => axiosClient.get(`${BASE}/${id}`).then(unwrap);
const deleteDraft = (id) => axiosClient.delete(`${BASE}/${id}`).then(unwrap);
const publishPlan = (id) => axiosClient.post(`${BASE}/${id}/publish`).then(unwrap);

const specialDietService = {
  getTemplates,
  listResidents,
  createDraft,
  updateDraft,
  listPlans,
  getPlan,
  deleteDraft,
  publishPlan,
};

export default specialDietService;
