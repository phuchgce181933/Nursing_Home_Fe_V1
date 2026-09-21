import axiosClient from '../api/axiosClient';

const listInvoices = async (params = {}) => {
  const response = await axiosClient.get('/admin/invoices', { params });
  return response.data;
};

const getInvoice = async (invoiceId) => {
  const response = await axiosClient.get(`/admin/invoices/${invoiceId}`);
  return response.data;
};

const createInvoice = async (residentId, body) => {
  const response = await axiosClient.post(`/residents/${residentId}/invoices`, body);
  return response.data;
};

export default {
  listInvoices,
  getInvoice,
  createInvoice,
};
