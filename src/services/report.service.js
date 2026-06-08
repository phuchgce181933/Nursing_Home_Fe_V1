import axiosClient from '../api/axiosClient';

const getResidentCountReport = async (params = {}) => {
  const response = await axiosClient.get('/admin/reports/resident-count', { params });
  return response.data;
};

const getSummaryReport = async (params = {}) => {
  const response = await axiosClient.get('/admin/reports/summary', { params });
  return response.data;
};

const getHealthStatusReport = async (params = {}) => {
  const response = await axiosClient.get('/admin/reports/health-status', { params });
  return response.data;
};

const getIncidentReport = async (params = {}) => {
  const response = await axiosClient.get('/admin/reports/incidents', { params });
  return response.data;
};

const getCareActivityReport = async (params = {}) => {
  const response = await axiosClient.get('/admin/reports/care-activity', { params });
  return response.data;
};

const getFinancialReport = async (params = {}) => {
  const response = await axiosClient.get('/admin/reports/financial', { params });
  return response.data;
};

const getTimeSeriesReport = async (params = {}) => {
  const response = await axiosClient.get('/admin/reports/time-series', { params });
  return response.data;
};

const getComparisonReport = async (params = {}) => {
  const response = await axiosClient.get('/admin/reports/compare', { params });
  return response.data;
};

const exportReport = async (params = {}) => {
  const response = await axiosClient.get('/admin/reports/export', { params, responseType: 'text' });
  return response.data;
};

const saveReportHistory = async (payload = {}) => {
  const response = await axiosClient.post('/admin/reports/history', payload);
  return response.data;
};

const getReportHistory = async (params = {}) => {
  const response = await axiosClient.get('/admin/reports/history', { params });
  return response.data;
};

export default {
  getResidentCountReport,
  getSummaryReport,
  getHealthStatusReport,
  getIncidentReport,
  getCareActivityReport,
  getFinancialReport,
  getTimeSeriesReport,
  getComparisonReport,
  exportReport,
  saveReportHistory,
  getReportHistory,
};