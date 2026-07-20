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

const assignHandlers = async (id, payload) => {
  const response = await axiosClient.patch(`/incidents/${id}/handlers`, payload);
  return response.data;
};

const updateIncidentResolution = async (id, payload = {}, files = []) => {
  const form = new FormData();
  Object.keys(payload || {}).forEach((key) => {
    const val = payload[key];
    if (val === undefined || val === null) return;
    if (typeof val === 'object' && !(val instanceof File) && !(val instanceof Blob)) {
      form.append(key, JSON.stringify(val));
    } else {
      form.append(key, String(val));
    }
  });
  (files || []).forEach((file) => {
    form.append('resolutionFiles', file);
  });

  const response = await axiosClient.patch(`/incidents/${id}/resolution`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export default {
  listIncidents,
  getIncident,
  createIncident,
  updateIncidentStatus,
  assignHandlers,
  updateIncidentResolution,
  exportIncidents,
};
