/**
 * pharmacy.service.js
 * API client for Pharmacy module
 *
 * Base URL: /api/pharmacy
 * Auth: Bearer Token via axiosClient
 */

import axiosClient from '../api/axiosClient';

const createMedication = async (body) => {
  const response = await axiosClient.post('/pharmacy/medications', body);
  return response.data;
};

const updateMedication = async (medicationId, body) => {
  const response = await axiosClient.put(`/pharmacy/medications/${medicationId}`, body);
  return response.data;
};

const listMedications = async (params = {}) => {
  const response = await axiosClient.get('/pharmacy/medications', { params });
  return response.data;
};

const getMedication = async (medicationId) => {
  const response = await axiosClient.get(`/pharmacy/medications/${medicationId}`);
  return response.data;
};

const addMedicationNote = async (medicationId, body) => {
  const response = await axiosClient.post(`/pharmacy/medications/${medicationId}/notes`, body);
  return response.data;
};

const listMedicationNotes = async (medicationId, params = {}) => {
  const response = await axiosClient.get(`/pharmacy/medications/${medicationId}/notes`, { params });
  return response.data;
};

const createSupplier = async (body) => {
  const response = await axiosClient.post('/pharmacy/suppliers', body);
  return response.data;
};

const updateSupplier = async (supplierId, body) => {
  const response = await axiosClient.put(`/pharmacy/suppliers/${supplierId}`, body);
  return response.data;
};

const deleteSupplier = async (supplierId) => {
  const response = await axiosClient.delete(`/pharmacy/suppliers/${supplierId}`);
  return response.data;
};

const listSuppliers = async (params = {}) => {
  const response = await axiosClient.get('/pharmacy/suppliers', { params });
  return response.data;
};

const getSupplier = async (supplierId) => {
  const response = await axiosClient.get(`/pharmacy/suppliers/${supplierId}`);
  return response.data;
};

const createStock = async (body) => {
  const response = await axiosClient.post('/pharmacy/stocks', body);
  return response.data;
};

const updateStock = async (stockId, body) => {
  const response = await axiosClient.put(`/pharmacy/stocks/${stockId}`, body);
  return response.data;
};

const listStocks = async (params = {}) => {
  const response = await axiosClient.get('/pharmacy/stocks', { params });
  return response.data;
};

const dispenseMedication = async (body) => {
  const response = await axiosClient.post('/pharmacy/dispenses', body);
  return response.data;
};

const verifyPrescription = async (prescriptionId) => {
  const response = await axiosClient.patch(`/pharmacy/prescriptions/${prescriptionId}/verify`);
  return response.data;
};

const getLowStockAlerts = async (params = {}) => {
  const response = await axiosClient.get('/pharmacy/alerts/low-stock', { params });
  return response.data;
};

const trackExpiry = async (params = {}) => {
  const response = await axiosClient.get('/pharmacy/expiry', { params });
  return response.data;
};

const getUsageStats = async (params = {}) => {
  const response = await axiosClient.get('/pharmacy/stats/usage', { params });
  return response.data;
};

const getReportSummary = async (params = {}) => {
  const response = await axiosClient.get('/pharmacy/reports/summary', { params });
  return response.data;
};

export default {
  createMedication,
  updateMedication,
  listMedications,
  getMedication,
  addMedicationNote,
  listMedicationNotes,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listSuppliers,
  getSupplier,
  createStock,
  updateStock,
  listStocks,
  dispenseMedication,
  verifyPrescription,
  getLowStockAlerts,
  trackExpiry,
  getUsageStats,
  getReportSummary,
};
