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

const requestEmailChangeOtp = async (payload) => {
  const response = await axiosClient.post('/auth/profile/email-otp', payload);
  return response.data;
};

const verifyEmailChangeOtp = async (payload) => {
  const response = await axiosClient.post('/auth/profile/email-verify', payload);
  return response.data;
};

const requestPhoneChangeOtp = async (payload) => {
  const response = await axiosClient.post('/auth/profile/phone-otp', payload);
  return response.data;
};

const verifyPhoneChangeOtp = async (payload) => {
  const response = await axiosClient.post('/auth/profile/phone-verify', payload);
  return response.data;
};
const changePassword = async (payload) => {
  const response = await axiosClient.put('/auth/change-password', payload);
  return response.data;
};

/**
 * `client: 'web'` nói rõ cho backend biết yêu cầu đến từ trình duyệt, nên email
 * gửi đi là loại có nút "Đặt lại mật khẩu" dẫn về trang /reset-password. Ứng dụng
 * di động gửi 'mobile' và nhận email chỉ có mã để copy. Gửi tường minh thay vì để
 * backend đoán từ User-Agent — cùng một User-Agent có thể là WebView trong app.
 */
const forgotPassword = async (email) => {
  const response = await axiosClient.post('/auth/forgot-password', { email, client: 'web' });
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

const searchFamilyAccounts = async (params = {}) => {
  const response = await axiosClient.get('/auth/family-accounts', { params });
  return response.data;
};

const createStaffAccount = async (payload) => {
  let data = payload;
  const config = {};

  if (payload?.avatarFile || payload?.certificationFiles?.length) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (key === 'avatarFile') {
        formData.append('avatar', value);
        return;
      }
      if (key === 'certificationFiles') {
        value.forEach((file) => formData.append('certificationFiles', file));
        return;
      }
      if (key === 'certificationIssueDates') {
        formData.append(key, JSON.stringify(value));
        return;
      }
      formData.append(key, value);
    });
    data = formData;
    config.headers = { 'Content-Type': 'multipart/form-data' };
  }

  const response = await axiosClient.post('/auth/create-staff', data, config);
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

const getFirebaseToken = async () => {
  try {
    const response = await axiosClient.post('/auth/firebase-token');
    return response.data;
  } catch (err) {
    const message = err.response?.data?.message || err.message || 'Không thể lấy Firebase token';
    const error = new Error(message);
    error.status = err.response?.status;
    throw error;
  }
};

export default {
  login,
  fetchProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getStaffAccounts,
  searchFamilyAccounts,
  createStaffAccount,
  toggleStaffActive,
  updateUserByAdmin,
  logout,
  getFirebaseToken,
  requestEmailChangeOtp,
  verifyEmailChangeOtp,
  requestPhoneChangeOtp,
  verifyPhoneChangeOtp,
};
