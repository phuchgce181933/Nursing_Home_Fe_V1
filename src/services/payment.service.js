import axiosClient from '../api/axiosClient';

const createInvoice = async (residentId, body) => {
  const response = await axiosClient.post(`/residents/${residentId}/invoices`, body);
  return response.data;
};

export default {
  createInvoice,
};
