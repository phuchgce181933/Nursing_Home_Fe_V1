import axiosClient from '../api/axiosClient';

const getFamilyResidents = async () => {
  const response = await axiosClient.get('/family/residents');
  return response.data;
};

const getResidentBillingSummary = async (residentId) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/billing-summary`);
  return response.data;
};

const getWalletBalance = async () => {
  const response = await axiosClient.get('/family/wallet/balance');
  return response.data.data || response.data;
};

const generateWalletTopupUrl = async (amount) => {
  const response = await axiosClient.post('/family/wallet/topup', { amount });
  return response.data.data || response.data;
};

const getResidentInvoices = async (residentId, params = {}) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/invoices`, { params });
  return response.data;
};

const createInvoice = async (residentId, body) => {
  const response = await axiosClient.post(`/residents/${residentId}/invoices`, body);
  return response.data.data || response.data;
};

const payInvoice = async (residentId, invoiceId, body) => {
  const response = await axiosClient.post(`/residents/${residentId}/invoices/${invoiceId}/pay`, body);
  return response.data.data || response.data;
};

// Returns a checksum-signed PayOS checkout URL for this invoice — safe to open directly,
// unlike embedding the auth token itself in a query string.
const getInvoicePaymentUrl = async (residentId, invoiceId) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/invoices/${invoiceId}/payment-url`);
  return response.data.data || response.data;
};

// Get invoice detail for preview
const getInvoiceDetail = async (residentId, invoiceId) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/invoices/${invoiceId}`);
  return response.data.data || response.data;
};

const initiateWalletPayment = async (payload) => {
  const response = await axiosClient.post('/family/wallet/payments/initiate', payload);
  return response.data.data || response.data;
};

const verifyWalletPayment = async (payload) => {
  const response = await axiosClient.post('/family/wallet/payments/verify', payload);
  return response.data.data || response.data;
};

const batchPayment = async (residentId, body) => {
  const response = await axiosClient.post(`/residents/${residentId}/invoices/batch-pay`, body);
  return response.data.data || response.data;
};

// Latest recorded vitals for a resident (or null if none yet)
const getVitals = async (residentId) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/vitals`);
  return response.data;
};

// Paginated medical record history, supports search/from/to/page/limit
const getHealthHistory = async (residentId, params = {}) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/health-history`, { params });
  return response.data;
};

// Daily care log: careTasks, hygieneRecords, mealIntakeNotes, behaviorRecords
const getDailyActivities = async (residentId, params = {}) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/daily-activities`, { params });
  return response.data;
};

// Published care schedule days (with entries) for a date/range
const getCareSchedule = async (residentId, params = {}) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/care-schedule`, { params });
  return response.data;
};

// Medication administration history + compliance stats (taken/missed/complianceRate, weeklyCompliance)
const getMedicationHistory = async (residentId, params = {}) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/medication-history`, { params });
  return response.data.data || response.data;
};

// Daily medication schedule (defaults to today) — list of doses due for the resident
const getDailyMedicationSchedule = async (residentId, params = {}) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/daily-medication-schedule`, { params });
  return response.data.data || response.data;
};

// Paginated care notes (meal/activity/daily_living/health/general), supports noteType/search/from/to/page/limit
const getCareNotes = async (residentId, params = {}) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/care-notes`, { params });
  return response.data;
};

// Payment history — wallet topups + paid invoices for a resident
const getPaymentHistory = async (residentId) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/payment-history`);
  return response.data;
};

export default {
  getFamilyResidents,
  getResidentBillingSummary,
  getWalletBalance,
  generateWalletTopupUrl,
  getResidentInvoices,
  createInvoice,
  payInvoice,
  getInvoicePaymentUrl,
  getInvoiceDetail,
  initiateWalletPayment,
  verifyWalletPayment,
  batchPayment,
  getVitals,
  getHealthHistory,
  getDailyActivities,
  getCareSchedule,
  getMedicationHistory,
  getDailyMedicationSchedule,
  getCareNotes,
  getPaymentHistory,
};
