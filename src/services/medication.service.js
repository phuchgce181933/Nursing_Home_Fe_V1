import axiosClient from '../api/axiosClient';

const getMyResidents = () =>
  axiosClient.get('/medications/my-residents').then((r) => r.data);

const listPrescriptions = (params = {}) =>
  axiosClient.get('/medications/prescriptions', { params }).then((r) => r.data);

const createPrescription = (payload) =>
  axiosClient.post('/medications/prescriptions', payload).then((r) => r.data);

const updatePrescription = (id, payload) =>
  axiosClient.put(`/medications/prescriptions/${id}`, payload).then((r) => r.data);

const listAdministrations = (params = {}) =>
  axiosClient.get('/medications/administrations', { params }).then((r) => r.data);

const markAdministration = (id, payload) =>
  axiosClient.patch(`/medications/administrations/${id}/status`, payload).then((r) => r.data);

const getAdministrationHistory = (prescriptionId) =>
  axiosClient.get(`/medications/history/${prescriptionId}`).then((r) => r.data);

export default {
  getMyResidents,
  listPrescriptions,
  createPrescription,
  updatePrescription,
  listAdministrations,
  markAdministration,
  getAdministrationHistory,
};
