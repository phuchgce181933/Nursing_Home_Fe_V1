import axiosClient from '../api/axiosClient';

const createInvoice = async (residentId, body) => {
  const response = await axiosClient.post(`/residents/${residentId}/invoices`, body);
  return response.data;
};

const listInvoices = async (residentId) => {
  const response = await axiosClient.get(`/residents/${residentId}/invoices`);
  return response.data;
};

export default {
  createInvoice,
  listInvoices,
};
