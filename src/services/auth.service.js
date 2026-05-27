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
  logout,
  getFirebaseToken,
};
