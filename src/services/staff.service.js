import axiosClient from '../api/axiosClient';

const listStaffAccounts = async (params) => {
  const response = await axiosClient.get('/auth/staff', { params });
  return response.data;
};

export default {
  listStaffAccounts,
};
