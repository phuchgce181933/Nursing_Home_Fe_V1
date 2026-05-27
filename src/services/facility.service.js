import axiosClient from '../api/axiosClient';

const unwrap = (r) => r.data?.data ?? r.data;

/** Human-readable message when facilities API fails (e.g. route not mounted on backend). */
export const getFacilityErrorMessage = (error, fallback = 'Không tải được dữ liệu facilities') => {
  const status = error?.response?.status;
  if (status === 404) {
    return (
      'API /api/facilities chưa có trên backend (404). ' +
      'Thêm app.use(\'/api/facilities\', facilityRoutes) trong server và khởi động lại API.'
    );
  }
  return error?.response?.data?.message || fallback;
};

const listBuildings = (params = {}) =>
  axiosClient.get('/facilities/buildings', { params }).then(unwrap);

const listFloors = (params = {}) =>
  axiosClient.get('/facilities/floors', { params }).then(unwrap);

const getFloor = (floorId) =>
  axiosClient.get(`/facilities/floors/${floorId}`).then(unwrap);

const listRoomsByFloor = (floorId) =>
  axiosClient.get(`/facilities/floors/${floorId}/rooms`).then(unwrap);

const facilityService = {
  listBuildings,
  listFloors,
  getFloor,
  listRoomsByFloor,
};

export default facilityService;
