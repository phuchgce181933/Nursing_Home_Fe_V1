import axiosClient from '../api/axiosClient';

const unwrap = (r) => r.data?.data ?? r.data;
const BASE = '/nurse/nutrition/coverage';

const getCoverage = (params = {}) => axiosClient.get(BASE, { params }).then(unwrap);

const nutritionCoverageService = {
  getCoverage,
};

export default nutritionCoverageService;
