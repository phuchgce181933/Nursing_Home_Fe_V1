import axiosClient from '../api/axiosClient';

const recordVitals = async (residentId, body) => {
  const response = await axiosClient.post(`/residents/${residentId}/medical-records`, body);
  return response.data;
};

const getVitalsHistory = async (residentId, params = {}) => {
  const response = await axiosClient.get(`/residents/${residentId}/medical-records`, { params });
  return response.data;
};

const getLatestVitals = async (residentId) => {
  try {
    const response = await axiosClient.get(`/residents/${residentId}/medical-records`, { params: { limit: 1, page: 1 } });
    const records = response.data?.data || [];
    return records[0] || null;
  } catch (err) {
    console.error('Error fetching latest vitals:', err);
    return null;
  }
};

const medicalRecordService = {
  recordVitals,
  getVitalsHistory,
  getLatestVitals,
};

export default medicalRecordService;
