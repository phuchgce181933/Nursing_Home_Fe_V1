import axiosClient from '../api/axiosClient';

const submitConsultationRequest = async (body) => {
  const response = await axiosClient.post('/consultation-requests', body);
  return response.data;
};

const adminGetConsultationRequestList = async (params = {}) => {
  const response = await axiosClient.get('/admin/consultation-requests', { params });
  return response.data;
};

const adminGetConsultationRequestDetail = async (requestId) => {
  const response = await axiosClient.get(`/admin/consultation-requests/${requestId}`);
  return response.data;
};

const adminUpdateConsultationRequest = async (requestId, body = {}) => {
  const response = await axiosClient.patch(`/admin/consultation-requests/${requestId}`, body);
  return response.data;
};

export default {
  submitConsultationRequest,
  adminGetConsultationRequestList,
  adminGetConsultationRequestDetail,
  adminUpdateConsultationRequest,
};
