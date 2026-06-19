import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const ENDPOINT = '/clinical/services';

const createHeaders = () => {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

const clinicalServiceService = {
  // List all clinical services
  listServices: async (params = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}${ENDPOINT}`, {
        params,
        headers: createHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get single clinical service
  getService: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}${ENDPOINT}/${id}`, {
        headers: createHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new clinical service
  createService: async (data) => {
    try {
      const response = await axios.post(`${API_BASE_URL}${ENDPOINT}`, data, {
        headers: createHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update clinical service
  updateService: async (id, data) => {
    try {
      const response = await axios.put(`${API_BASE_URL}${ENDPOINT}/${id}`, data, {
        headers: createHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete clinical service
  deleteService: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}${ENDPOINT}/${id}`, {
        headers: createHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bulk update pricing
  updatePricing: async (services) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}${ENDPOINT}/bulk/pricing`,
        { services },
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default clinicalServiceService;
