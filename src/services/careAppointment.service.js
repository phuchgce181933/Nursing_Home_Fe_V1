import axiosClient from '../api/axiosClient';

const listAppointments = async (params = {}) => {
  const response = await axiosClient.get('/care-appointments', { params });
  return response.data;
};

const getAppointment = async (id) => {
  const response = await axiosClient.get(`/care-appointments/${id}`);
  return response.data;
};

const createAppointment = async (body) => {
  const response = await axiosClient.post('/care-appointments', body);
  return response.data;
};

const updateAppointment = async (id, body) => {
  const response = await axiosClient.put(`/care-appointments/${id}`, body);
  return response.data;
};

const deleteAppointment = async (id) => {
  const response = await axiosClient.delete(`/care-appointments/${id}`);
  return response.data;
};

const assignDoctor = async (id, doctorStaffId) => {
  const response = await axiosClient.put(`/care-appointments/${id}/assign-doctor`, { doctorStaffId });
  return response.data;
};

const assignNurse = async (id, nurseStaffId) => {
  const response = await axiosClient.put(`/care-appointments/${id}/assign-nurse`, { nurseStaffId });
  return response.data;
};

const updateStatus = async (id, status) => {
  const response = await axiosClient.patch(`/care-appointments/${id}/status`, { status });
  return response.data;
};

const getMyAppointments = async (params = {}) => {
  const response = await axiosClient.get('/care-appointments/my', { params });
  return response.data;
};

export default {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  assignDoctor,
  assignNurse,
  updateStatus,
  getMyAppointments,
};
