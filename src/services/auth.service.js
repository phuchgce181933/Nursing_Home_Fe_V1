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

export default {
  login,
  fetchProfile,
  logout,
};
