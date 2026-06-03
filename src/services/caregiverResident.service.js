import axiosClient from '../api/axiosClient';

const unwrap = (r) => r.data?.data ?? r.data;
const BASE = '/caregiver/residents';

const listResidents = (params = {}) =>
  axiosClient.get(BASE, { params }).then((r) => ({
    data: r.data?.data ?? [],
    total: r.data?.total ?? 0,
    message: r.data?.message,
  }));

const getResident = (id) => axiosClient.get(`${BASE}/${id}`).then(unwrap);

const caregiverResidentService = {
  listResidents,
  getResident,
};

export default caregiverResidentService;
