import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api` : 'http://localhost:3000/api';
const ENDPOINT = '/clinical/charges';

const createHeaders = () => {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

const medicalChargeService = {
  // List all medical charges with filters
  listCharges: async (params = {}) => {
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

  // Get single medical charge
  getCharge: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}${ENDPOINT}/${id}`, {
        headers: createHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // List charges by resident
  getChargesByResident: async (residentId, params = {}) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}${ENDPOINT}/resident/${residentId}`,
        {
          params,
          headers: createHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get pending charges (not billed)
  getPendingCharges: async (params = {}) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}${ENDPOINT}/status/pending`,
        {
          params,
          headers: createHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update charge status
  updateChargeStatus: async (id, status) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}${ENDPOINT}/${id}/status`,
        { status },
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bulk update charges status
  bulkUpdateStatus: async (chargeIds, status) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}${ENDPOINT}/bulk/status`,
        { chargeIds, status },
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default medicalChargeService;
