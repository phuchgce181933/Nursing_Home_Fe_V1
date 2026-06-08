import axiosClient from '../api/axiosClient';

const listIncidents = async (params = {}) => {
  const response = await axiosClient.get('/incidents', { params });
  return response.data;
};

const getIncident = async (id) => {
  const response = await axiosClient.get(`/incidents/${id}`);
  return response.data;
};

const createIncident = async (payload) => {
  const response = await axiosClient.post('/incidents', payload);
  return response.data;
};

const updateIncidentStatus = async (id, payload) => {
  const response = await axiosClient.patch(`/incidents/${id}/status`, payload);
  return response.data;
};

const exportIncidents = async (params = {}) => {
  const response = await axiosClient.get('/incidents/export', { params, responseType: 'text' });
  return response.data;
};

export default {
  listIncidents,
  getIncident,
  createIncident,
  updateIncidentStatus,
  exportIncidents,
};
