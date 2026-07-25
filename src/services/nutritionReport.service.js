import axiosClient from '../api/axiosClient';

const unwrap = (r) => r.data?.data ?? r.data;
const BASE = '/nurse/nutrition-reports';

const getSummary = (params = {}) => axiosClient.get(`${BASE}/summary`, { params }).then(unwrap);

const listResidents = (params = {}) => axiosClient.get(`${BASE}/residents`, { params }).then((r) => r.data);

const getResidentReport = (residentId, params = {}) =>
  axiosClient.get(`${BASE}/residents/${residentId}`, { params }).then(unwrap);

const nutritionReportService = {
  getSummary,
  listResidents,
  getResidentReport,
};

export default nutritionReportService;
