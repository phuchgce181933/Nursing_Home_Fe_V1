import axiosClient from '../api/axiosClient';
import { setAuthToken, removeAuthToken } from '../utils/auth';

const login = async ({ email, password }) => {
  const response = await axiosClient.post('/auth/login', { email, password });
  setAuthToken(response.data.token);
  return response.data;
};

const fetchProfile = async () => {
  const response = await axiosClient.get('/auth/me');
  return response.data;
};

const updateProfile = async (payload) => {
  const response = await axiosClient.put('/auth/profile', payload);
  return response.data;
};

const changePassword = async (payload) => {
  const response = await axiosClient.put('/auth/change-password', payload);
  return response.data;
};

const forgotPassword = async (email) => {
  const response = await axiosClient.post('/auth/forgot-password', { email });
  return response.data;
};

const resetPassword = async ({ token, newPassword }) => {
  const response = await axiosClient.post('/auth/reset-password', { token, newPassword });
  return response.data;
};

const getStaffAccounts = async (params = {}) => {
  const response = await axiosClient.get('/auth/staff', { params });
  return response.data;
};

const createStaffAccount = async (payload) => {
  const response = await axiosClient.post('/auth/create-staff', payload);
  return response.data;
};

const toggleStaffActive = async (id) => {
  const response = await axiosClient.put(`/auth/staff/${id}/toggle-active`);
  return response.data;
};

const updateUserByAdmin = async (id, payload) => {
  const response = await axiosClient.put(`/auth/users/${id}`, payload);
  return response.data;
};

const logout = () => {
  removeAuthToken();
};

export default {
  login,
  fetchProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getStaffAccounts,
  createStaffAccount,
  toggleStaffActive,
  updateUserByAdmin,
  logout,
};
