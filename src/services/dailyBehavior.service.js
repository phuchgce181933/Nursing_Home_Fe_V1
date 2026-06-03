import axiosClient from '../api/axiosClient';

const unwrap = (r) => r.data?.data ?? r.data;
const BASE = '/caregiver/daily-behaviors';

const listResidents = () => axiosClient.get(`${BASE}/residents`).then(unwrap);

const listRecords = (params = {}) => axiosClient.get(BASE, { params }).then((r) => r.data);

const createRecord = (payload) => axiosClient.post(BASE, payload).then(unwrap);

const getRecord = (id) => axiosClient.get(`${BASE}/${id}`).then(unwrap);

const updateRecord = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then(unwrap);

const deleteRecord = (id) => axiosClient.delete(`${BASE}/${id}`).then(unwrap);

const dailyBehaviorService = {
  listResidents,
  listRecords,
  createRecord,
  getRecord,
  updateRecord,
  deleteRecord,
};

export default dailyBehaviorService;
