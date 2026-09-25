import axiosClient from '../api/axiosClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api` : '/api';
const ENDPOINT = '/nutrition/dishes';

const dishService = {
  listDishes: async (params = {}) => {
    const response = await axiosClient.get(ENDPOINT, {
      params,
    });
    return response.data;
  },

  getDish: async (id) => {
    const response = await axiosClient.get(`${ENDPOINT}/${id}`);
    return response.data;
  },

  createDish: async (data) => {
    const response = await axiosClient.post(ENDPOINT, data);
    return response.data;
  },

  updateDish: async (id, data) => {
    const response = await axiosClient.put(`${ENDPOINT}/${id}`, data);
    return response.data;
  },

  deleteDish: async (id) => {
    const response = await axiosClient.delete(`${ENDPOINT}/${id}`);
    return response.data;
  },
};

export default dishService;
