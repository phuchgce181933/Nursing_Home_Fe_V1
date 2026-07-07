import axiosClient from '../api/axiosClient';

// Residents accessible to the current staff (assigned residents for doctor/nurse)
const getResidents = (params = {}) =>
  axiosClient.get('/residents', { params }).then((r) => r.data);

const listNotes = (params = {}) =>
  axiosClient.get('/care-notes', { params }).then((r) => r.data);

const getMyNotes = (params = {}) =>
  axiosClient.get('/care-notes/my-notes', { params }).then((r) => r.data);

const getNoteHistory = (residentId, params = {}) =>
  axiosClient.get(`/care-notes/history/${residentId}`, { params }).then((r) => r.data);

const getNote = (id) =>
  axiosClient.get(`/care-notes/${id}`).then((r) => r.data);

// Edit history (audit trail) of a single care note
const getNoteAuditHistory = (id) =>
  axiosClient.get(`/care-notes/${id}/audit-log`).then((r) => r.data?.data || r.data);

const createNote = (payload) =>
  axiosClient.post('/care-notes', payload).then((r) => r.data);

const updateNote = (id, payload) =>
  axiosClient.put(`/care-notes/${id}`, payload).then((r) => r.data);

const deleteNote = (id) =>
  axiosClient.delete(`/care-notes/${id}`).then((r) => r.data);

export default {
  getResidents,
  listNotes,
  getMyNotes,
  getNoteHistory,
  getNote,
  getNoteAuditHistory,
  createNote,
  updateNote,
  deleteNote,
};
