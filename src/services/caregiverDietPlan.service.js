import axiosClient from '../api/axiosClient';

const unwrap = (r) => r.data?.data ?? r.data;
const BASE = '/caregiver/diet-plans';

const listResidents = () => axiosClient.get(`${BASE}/residents`).then(unwrap);

const listOverview = (params) => axiosClient.get(BASE, { params }).then((r) => r.data);

const getResidentPlan = (residentId, params) =>
  axiosClient.get(`${BASE}/${residentId}`, { params }).then(unwrap);

const caregiverDietPlanService = {
  listResidents,
  listOverview,
  getResidentPlan,
};

export default caregiverDietPlanService;
