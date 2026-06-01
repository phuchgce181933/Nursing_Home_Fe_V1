import axiosClient from '../api/axiosClient';

const listNotes = (params = {}) =>
  axiosClient.get('/care-notes', { params }).then((r) => r.data);

const getMyNotes = (params = {}) =>
  axiosClient.get('/care-notes/my-notes', { params }).then((r) => r.data);

const getNoteHistory = (residentId, params = {}) =>
  axiosClient.get(`/care-notes/history/${residentId}`, { params }).then((r) => r.data);

const getNote = (id) =>
  axiosClient.get(`/care-notes/${id}`).then((r) => r.data);

const createNote = (payload) =>
  axiosClient.post('/care-notes', payload).then((r) => r.data);

const updateNote = (id, payload) =>
  axiosClient.put(`/care-notes/${id}`, payload).then((r) => r.data);

const deleteNote = (id) =>
  axiosClient.delete(`/care-notes/${id}`).then((r) => r.data);

export default {
  listNotes,
  getMyNotes,
  getNoteHistory,
  getNote,
  createNote,
  updateNote,
  deleteNote,
};
