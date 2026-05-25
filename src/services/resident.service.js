/**
 * resident.service.js
 * API client for Resident Management (Admin)
 *
 * Base URL: /api
 * Auth: Bearer Token via axiosClient
 */

import axiosClient from '../api/axiosClient';

const createResident = async (body) => {
  const response = await axiosClient.post('/admin/residents', body);
  return response.data;
};

const getResidentList = async (params = {}) => {
  const response = await axiosClient.get('/admin/residents', { params });
  return response.data;
};

const getResidentDetail = async (residentId) => {
  const response = await axiosClient.get(`/admin/residents/${residentId}`);
  return response.data;
};

const updateResidentPersonalInfo = async (residentId, body) => {
  const response = await axiosClient.patch(`/admin/residents/${residentId}/personal-info`, body);
  return response.data;
};

const updateResidentFamilyInfo = async (residentId, body) => {
  const response = await axiosClient.patch(`/admin/residents/${residentId}/family-info`, body);
  return response.data;
};

export default {
  createResident,
  getResidentList,
  getResidentDetail,
  updateResidentPersonalInfo,
  updateResidentFamilyInfo,
};
