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

const listAvailableBedsByRoom = (roomId) =>
  axiosClient.get(`/facilities/rooms/${roomId}/beds`).then(unwrap);

const createBuilding = (data) =>
  axiosClient.post('/facilities/buildings', data).then(unwrap);

const updateBuilding = (id, data) =>
  axiosClient.put(`/facilities/buildings/${id}`, data).then(unwrap);

const deleteBuilding = (id) =>
  axiosClient.delete(`/facilities/buildings/${id}`).then(unwrap);

const createFloor = (data) =>
  axiosClient.post('/facilities/floors', data).then(unwrap);

const updateFloor = (id, data) =>
  axiosClient.put(`/facilities/floors/${id}`, data).then(unwrap);

const deleteFloor = (id) =>
  axiosClient.delete(`/facilities/floors/${id}`).then(unwrap);

const createRoom = (data) =>
  axiosClient.post('/facilities/rooms', data).then(unwrap);

const updateRoom = (id, data) =>
  axiosClient.put(`/facilities/rooms/${id}`, data).then(unwrap);

const deleteRoom = (id) =>
  axiosClient.delete(`/facilities/rooms/${id}`).then(unwrap);

const listBedsByRoom = (roomId, params = {}) =>
  axiosClient.get(`/facilities/rooms/${roomId}/beds`, { params }).then(unwrap);

const createBed = (data) =>
  axiosClient.post('/facilities/beds', data).then(unwrap);

const updateBed = (id, data) =>
  axiosClient.put(`/facilities/beds/${id}`, data).then(unwrap);

const deleteBed = (id) =>
  axiosClient.delete(`/facilities/beds/${id}`).then(unwrap);

const listEquipment = (params = {}) =>
  axiosClient.get('/facilities/equipment', { params }).then(unwrap);

const createEquipment = (data) =>
  axiosClient.post('/facilities/equipment', data).then(unwrap);

const updateEquipment = (id, data) =>
  axiosClient.put(`/facilities/equipment/${id}`, data).then(unwrap);

const deleteEquipment = (id) =>
  axiosClient.delete(`/facilities/equipment/${id}`).then(unwrap);

const facilityService = {
  listBuildings,
  listFloors,
  getFloor,
  listRoomsByFloor,
  listAvailableBedsByRoom,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  createFloor,
  updateFloor,
  deleteFloor,
  createRoom,
  updateRoom,
  deleteRoom,
  listBedsByRoom,
  createBed,
  updateBed,
  deleteBed,
  listEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
};

export default facilityService;
