import axiosClient from '../api/axiosClient';

const getAuditLogs = async (params = {}) => {
  const response = await axiosClient.get('/admin/audit-logs', { params });
  return response.data;
};

const getAuditLogFilters = async (params = {}) => {
  const response = await axiosClient.get('/admin/audit-logs/filters', { params });
  return response.data;
};

const getAuditLog = async (id) => {
  const response = await axiosClient.get(`/admin/audit-logs/${id}`);
  return response.data;
};

export default {
  getAuditLogs,
  getAuditLogFilters,
  getAuditLog,
};
