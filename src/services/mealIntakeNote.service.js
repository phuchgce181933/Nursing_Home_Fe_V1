import axiosClient from '../api/axiosClient';

const unwrap = (r) => r.data?.data ?? r.data;
const BASE = '/caregiver/meal-intake-notes';
const ADMIN_BASE = '/admin/meal-intake-notes';

const listResidents = () => axiosClient.get(`${BASE}/residents`).then(unwrap);

const getContext = (params) => axiosClient.get(`${BASE}/context`, { params }).then(unwrap);

const listNotes = (params = {}) => axiosClient.get(BASE, { params }).then((r) => r.data);

const adminListNotes = (params = {}) => axiosClient.get(ADMIN_BASE, { params }).then((r) => r.data);

const createNote = (payload) => axiosClient.post(BASE, payload).then(unwrap);

const updateNote = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then(unwrap);

const getNote = (id) => axiosClient.get(`${BASE}/${id}`).then(unwrap);

const deleteNote = (id) => axiosClient.delete(`${BASE}/${id}`).then(unwrap);

const mealIntakeNoteService = {
  listResidents,
  getContext,
  getNote,
  listNotes,
  adminListNotes,
  createNote,
  updateNote,
  deleteNote,
};

export default mealIntakeNoteService;
