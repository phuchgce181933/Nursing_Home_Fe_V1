import axiosClient from '../api/axiosClient';

const base = () => `/family/support-requests`;

// Family: submit a new support/consultation request.
const createSupportRequest = async (payload) => {
  const response = await axiosClient.post(`${base()}`, payload);
  return response.data;
};

// Family sees only their own requests; manager/admin can list all (optionally filter by status).
const listSupportRequests = async (params = {}) => {
  const response = await axiosClient.get(`${base()}`, { params });
  return response.data;
};

const getSupportRequest = async (requestId) => {
  const response = await axiosClient.get(`${base()}/${requestId}`);
  return response.data;
};

const addMessage = async (requestId, text) => {
  const response = await axiosClient.post(`${base()}/${requestId}/messages`, { text });
  return response.data;
};

const closeSupportRequest = async (requestId, action = 'close', closingNote) => {
  const response = await axiosClient.patch(`${base()}/${requestId}/close`, { action, closingNote });
  return response.data;
};

export default {
  createSupportRequest,
  listSupportRequests,
  getSupportRequest,
  addMessage,
  closeSupportRequest,
};
