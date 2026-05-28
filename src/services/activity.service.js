import axiosClient from '../api/axiosClient';

const createActivity = async (body) => {
  const response = await axiosClient.post('/admin/activities', body);
  return response.data;
};

const getActivityList = async (params = {}) => {
  const response = await axiosClient.get('/admin/activities', { params });
  return response.data;
};

const getActivityById = async (activityId) => {
  const response = await axiosClient.get(`/admin/activities/${activityId}`);
  return response.data;
};

const updateActivity = async (activityId, body) => {
  const response = await axiosClient.put(`/admin/activities/${activityId}`, body);
  return response.data;
};

const deleteActivity = async (activityId) => {
  const response = await axiosClient.delete(`/admin/activities/${activityId}`);
  return response.data;
};

const updateActivityStatus = async (activityId, status) => {
  const response = await axiosClient.patch(`/admin/activities/${activityId}/status`, { status });
  return response.data;
};

const setParticipantList = async (activityId, participantResidentIds) => {
  const response = await axiosClient.put(`/admin/activities/${activityId}/participants`, { participantResidentIds });
  return response.data;
};

const registerResident = async (activityId, residentId) => {
  const response = await axiosClient.post(`/admin/activities/${activityId}/register`, { residentId });
  return response.data;
};

const recordParticipationResult = async (activityId, body) => {
  const response = await axiosClient.post(`/admin/activities/${activityId}/record-result`, body);
  return response.data;
};

const getActivityStatistics = async (params = {}) => {
  const response = await axiosClient.get('/admin/activities/statistics', { params });
  return response.data;
};

const getActivityStatisticsById = async (activityId) => {
  const response = await axiosClient.get(`/admin/activities/${activityId}/statistics`);
  return response.data;
};

export default {
  createActivity,
  getActivityList,
  getActivityById,
  updateActivity,
  deleteActivity,
  updateActivityStatus,
  setParticipantList,
  registerResident,
  recordParticipationResult,
  getActivityStatistics,
  getActivityStatisticsById,
};
