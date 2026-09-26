import axiosClient from '../api/axiosClient';
import staffService from './staff.service';
import staffResidentService from './staffResident.service';

const unwrap = (r) => r.data?.data ?? r.data;

const listCaregiverResidents = (params = {}) =>
  axiosClient.get('/caregiver/residents', { params }).then((r) => ({
    data: r.data?.data ?? [],
    total: r.data?.total ?? 0,
    message: r.data?.message,
  }));

const getCaregiverResident = (id) =>
  axiosClient.get(`/caregiver/residents/${id}`).then(unwrap);

const listStaffResidents = (params = {}) =>
  staffService.listAssignedResidents(params.userId).then((r) => ({
    data: Array.isArray(r?.data) ? r.data : [],
    total: r?.total ?? 0,
    message: r?.message,
  }));

const getStaffResident = async (id) => {
  return staffResidentService.getResident(id);
};

const listResidents = (role, params = {}) => {
  if (role === 'caregiver') return listCaregiverResidents(params);
  return listStaffResidents(params);
};

const getResident = (role, id) => {
  if (role === 'caregiver') return getCaregiverResident(id);
  return getStaffResident(id);
};

const listCaregiverActivities = (params = {}) =>
  axiosClient.get('/caregiver/residents/activities', { params }).then((r) => ({
    data: r.data?.data ?? [],
    total: r.data?.total ?? 0,
  }));

const staffAssignedResidentService = {
  listResidents,
  getResident,
  listCaregiverActivities,
};

export default staffAssignedResidentService;
