import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const ENDPOINT = '/nutrition/dishes';

const createHeaders = () => {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

const dishService = {
  listDishes: async (params = {}) => {
    const response = await axios.get(`${API_BASE_URL}${ENDPOINT}`, {
      params,
      headers: createHeaders(),
    });
    return response.data;
  },

  getDish: async (id) => {
    const response = await axios.get(`${API_BASE_URL}${ENDPOINT}/${id}`, {
      headers: createHeaders(),
    });
    return response.data;
  },

  createDish: async (data) => {
    const response = await axios.post(`${API_BASE_URL}${ENDPOINT}`, data, {
      headers: createHeaders(),
    });
    return response.data;
  },

  updateDish: async (id, data) => {
    const response = await axios.put(`${API_BASE_URL}${ENDPOINT}/${id}`, data, {
      headers: createHeaders(),
    });
    return response.data;
  },

  deleteDish: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}${ENDPOINT}/${id}`, {
      headers: createHeaders(),
    });
    return response.data;
  },
};

export default dishService;
