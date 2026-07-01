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

export default {
  getFamilyResidents,
  getResidentBillingSummary,
  getWalletBalance,
  generateWalletTopupUrl,
  getResidentInvoices,
  createInvoice,
  payInvoice,
  initiateWalletPayment,
  verifyWalletPayment,
  batchPayment,
};
