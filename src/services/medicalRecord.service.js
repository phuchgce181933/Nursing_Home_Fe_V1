import axiosClient from '../api/axiosClient';

const recordVitals = async (residentId, body) => {
  const response = await axiosClient.post(`/residents/${residentId}/medical-records`, body);
  return response.data;
};

const getVitalsHistory = async (residentId, params = {}) => {
  const response = await axiosClient.get(`/residents/${residentId}/medical-records`, { params });
  return response.data;
};

const medicalRecordService = {
  recordVitals,
  getVitalsHistory,
};

export default medicalRecordService;
