import axiosClient from '../api/axiosClient';

// Admitted residents (for prescription resident picker)
const listResidents = (params = {}) =>
  axiosClient.get('/residents', { params }).then((r) => r.data);

// Medications from pharmacy DB (autocomplete when writing prescription)
const listAvailableMedications = (params = {}) =>
  axiosClient.get('/medications/available', { params }).then((r) => r.data);

// --- Prescriptions ---
const listPrescriptions = (params = {}) =>
  axiosClient.get('/prescriptions', { params }).then((r) => r.data);

const getPrescription = (id) =>
  axiosClient.get(`/prescriptions/${id}`).then((r) => r.data);

const createPrescription = (payload) =>
  axiosClient.post('/prescriptions', payload).then((r) => r.data);

const updatePrescription = (id, payload) =>
  axiosClient.put(`/prescriptions/${id}`, payload).then((r) => r.data);

const estimatePrescriptionCost = (prescriptionId, residentId) =>
  axiosClient.get(`/prescriptions/${prescriptionId}/estimate-cost`, { params: { residentId } }).then((r) => r.data);

// --- Medication Schedules (MedicationSchedule model) ---

// Grouped by resident — for daily view
const getDailySchedule = (params = {}) =>
  axiosClient.get('/medications/schedule/daily', { params }).then((r) => r.data);

// Flat list for one resident
const getSchedules = (params = {}) =>
  axiosClient.get('/medications/schedule', { params }).then((r) => r.data);

// Doctor: set startDate/endDate/times per prescription item
const setMedicationSchedule = (payload) =>
  axiosClient.put('/medications/schedule/set', payload).then((r) => r.data);

// Nurse: mark taken (TAKEN or LATE_TAKEN if >2h late)
const markTaken = (id, payload = {}) =>
  axiosClient.patch(`/medications/schedule/${id}/taken`, payload).then((r) => r.data);

// Nurse: mark missed — reason required (refused/asleep/vomiting/hospitalized/other)
const markMissed = (id, payload) =>
  axiosClient.patch(`/medications/schedule/${id}/missed`, payload).then((r) => r.data);

// Nurse: mark refused
const markRefused = (id, payload) =>
  axiosClient.patch(`/medications/schedule/${id}/refused`, payload).then((r) => r.data);

// Nurse: mark held
const markHeld = (id, payload) =>
  axiosClient.patch(`/medications/schedule/${id}/held`, payload).then((r) => r.data);

// Nurse: mark not available
const markNotAvailable = (id, payload) =>
  axiosClient.patch(`/medications/schedule/${id}/not-available`, payload).then((r) => r.data);

// Nurse: PRN administration
const administerPRN = (payload) =>
  axiosClient.post('/medications/prn-administration', payload).then((r) => r.data);

// Doctor: activate DRAFT prescription
const activatePrescription = (id) =>
  axiosClient.patch(`/prescriptions/${id}/activate`).then((r) => r.data);

// Doctor: suspend ACTIVE prescription
const suspendPrescription = (id, payload) =>
  axiosClient.patch(`/prescriptions/${id}/suspend`, payload).then((r) => r.data);

// Doctor: resume SUSPENDED prescription
const resumePrescription = (id) =>
  axiosClient.patch(`/prescriptions/${id}/resume`).then((r) => r.data);

// History + compliance stats per resident
const getHistory = (params = {}) =>
  axiosClient.get('/medications/history', { params }).then((r) => r.data);

export default {
  listResidents,
  listAvailableMedications,
  listPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription,
  estimatePrescriptionCost,
  getDailySchedule,
  getSchedules,
  setMedicationSchedule,
  markTaken,
  markMissed,
  markRefused,
  markHeld,
  markNotAvailable,
  administerPRN,
  activatePrescription,
  suspendPrescription,
  resumePrescription,
  getHistory,
};
