import axiosClient from '../api/axiosClient';

const unwrap = (r) => r.data?.data ?? r.data;
const BASE = '/caregiver/rehabilitation-schedules';

const listResidents = () => axiosClient.get(`${BASE}/residents`).then(unwrap);

const listOverview = (params) => axiosClient.get(BASE, { params }).then((r) => r.data);

const getResidentSchedule = (residentId, params) =>
  axiosClient.get(`${BASE}/${residentId}`, { params }).then(unwrap);

const caregiverRehabilitationScheduleService = {
  listResidents,
  listOverview,
  getResidentSchedule,
};

export default caregiverRehabilitationScheduleService;
