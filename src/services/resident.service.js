import axiosClient from '../api/axiosClient';
import facilityService from './facility.service';

const createResident = async (body) => {
  const response = await axiosClient.post('/admin/residents', body);
  return response.data;
};

const getResidentList = async (params = {}) => {
  const response = await axiosClient.get('/admin/residents', { params });
  return response.data;
};

const updateResidentPersonalInfo = async (residentId, body) => {
  const response = await axiosClient.patch(`/admin/residents/${residentId}/personal-info`, body);
  return response.data;
};

const updateResidentFamilyInfo = async (residentId, body) => {
  const response = await axiosClient.patch(`/admin/residents/${residentId}/family-info`, body);
  return response.data;
};

const isAreaRouteMissing = (error) => {
  const status = error?.response?.status;
  const msg = String(error?.response?.data?.message || '').toLowerCase();
  return status === 404 && (msg.includes('route not found') || msg.includes('not found'));
};

/** GET /residents/initial-health bị backend cũ match nhầm thành /:residentId */
const isInitialHealthListRouteMissing = (error) => {
  const status = error?.response?.status;
  const msg = String(error?.response?.data?.message || '').toLowerCase();
  return (
    (status === 400 && msg.includes('invalid resident id')) ||
    isAreaRouteMissing(error)
  );
};

const hasInitialHealthRecord = (value) =>
  Boolean(value && String(value).trim());

const matchBuildingId = (floor, buildingId) => {
  const bid = floor?.buildingId?._id || floor?.buildingId;
  return bid && String(bid) === String(buildingId);
};

const floorLabel = (floor) =>
  floor?.label || floor?.name || (floor?.floorNumber != null ? `Tầng ${floor.floorNumber}` : 'Tầng');

/** GET /api/residents — picker for staff assignment (no page/limit) */
const listForAssignment = (params = {}) =>
  axiosClient.get('/residents', { params }).then((r) => r.data);

/** GET /api/residents?page=&limit= — family management list with pagination */
const listForFamilyManagement = (params = {}) =>
  axiosClient.get('/residents', { params }).then((r) => r.data);

/** GET /api/residents/:id/family */
const getFamilyInfo = (residentId) =>
  axiosClient.get(`/residents/${residentId}/family`).then((r) => r.data);

/** POST /api/residents/:id/emergency-contacts */
const addEmergencyContact = (residentId, contact) =>
  axiosClient.post(`/residents/${residentId}/emergency-contacts`, contact).then((r) => r.data);

/** PUT /api/residents/:id/emergency-contacts/:contactId */
const updateEmergencyContact = (residentId, contactId, patch) =>
  axiosClient
    .put(`/residents/${residentId}/emergency-contacts/${contactId}`, patch)
    .then((r) => r.data);

/** DELETE /api/residents/:id/emergency-contacts/:contactId */
const removeEmergencyContact = (residentId, contactId) =>
  axiosClient
    .delete(`/residents/${residentId}/emergency-contacts/${contactId}`)
    .then((r) => r.data);

/** Fallback when /residents/areas/summary is not deployed yet */
const getAreaSummaryFallback = async ({ buildingId, status = 'admitted' } = {}) => {
  const floors = await facilityService.listFloors({ activeOnly: true });
  const buildingFloors = (Array.isArray(floors) ? floors : []).filter((f) =>
    matchBuildingId(f, buildingId)
  );

  let totalResidents = 0;
  const floorSummaries = [];

  for (const floor of buildingFloors) {
    const [rooms, assignRes] = await Promise.all([
      facilityService.listRoomsByFloor(floor._id),
      listForAssignment({ floorId: floor._id, status }),
    ]);
    const residents = Array.isArray(assignRes?.data) ? assignRes.data : [];
    const countByRoom = {};
    for (const r of residents) {
      const rid = r.roomId?._id || r.roomId;
      if (rid) countByRoom[String(rid)] = (countByRoom[String(rid)] || 0) + 1;
    }

    const roomList = (Array.isArray(rooms) ? rooms : []).map((room) => ({
      _id: room._id,
      roomNumber: room.roomNumber,
      label: room.label || `Phòng ${room.roomNumber}`,
      residentCount: countByRoom[String(room._id)] || 0,
    }));

    const residentCount = residents.length;
    totalResidents += residentCount;

    floorSummaries.push({
      _id: floor._id,
      floorNumber: floor.floorNumber,
      name: floor.name,
      label: floorLabel(floor),
      residentCount,
      rooms: roomList,
    });
  }

  return { totalResidents, floors: floorSummaries, _fallback: true };
};

/** GET /api/residents/areas/summary?buildingId=&status= */
const getAreaSummary = async (params = {}) => {
  try {
    return await axiosClient.get('/residents/areas/summary', { params }).then((r) => r.data);
  } catch (e) {
    if (!isAreaRouteMissing(e) || !params.buildingId) throw e;
    return getAreaSummaryFallback(params);
  }
};

const mapAssignmentToAreaItem = (r) => ({
  _id: r._id,
  residentCode: r.residentCode,
  fullName: r.fullName,
  residencyStatus: r.residencyStatus,
  room: r.roomId
    ? {
        _id: r.roomId._id || r.roomId,
        roomNumber: r.roomId.roomNumber,
        label: r.roomId.roomNumber ? `Phòng ${r.roomId.roomNumber}` : null,
      }
    : null,
});

/** Fallback when /residents/by-area is not deployed yet */
const listByAreaFallback = async ({
  buildingId,
  floorId,
  roomId,
  search,
  status = 'admitted',
  page = 1,
  limit = 20,
} = {}) => {
  let raw = [];

  if (roomId) {
    const res = await listForAssignment({ roomId, search, status });
    raw = Array.isArray(res?.data) ? res.data : [];
  } else if (floorId) {
    const res = await listForAssignment({ floorId, search, status });
    raw = Array.isArray(res?.data) ? res.data : [];
  } else if (buildingId) {
    const floors = await facilityService.listFloors({ activeOnly: true });
    const buildingFloors = (Array.isArray(floors) ? floors : []).filter((f) =>
      matchBuildingId(f, buildingId)
    );
    const results = await Promise.all(
      buildingFloors.map((f) => listForAssignment({ floorId: f._id, search, status }))
    );
    raw = results.flatMap((res) => (Array.isArray(res?.data) ? res.data : []));
    raw.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const total = raw.length;
  const skip = (pageNum - 1) * limitNum;
  const data = raw.slice(skip, skip + limitNum).map(mapAssignmentToAreaItem);

  return {
    data,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 0,
    _fallback: true,
  };
};

/** GET /api/residents/by-area?buildingId|floorId|roomId=&search=&page=&limit= */
const listByArea = async (params = {}) => {
  try {
    return await axiosClient.get('/residents/by-area', { params }).then((r) => r.data);
  } catch (e) {
    if (!isAreaRouteMissing(e)) throw e;
    return listByAreaFallback(params);
  }
};

/** GET /api/residents/:id — full profile; fallback to /family for basic fields */
const getResidentDetail = async (residentId) => {
  try {
    return await axiosClient.get(`/residents/${residentId}`).then((r) => r.data);
  } catch (e) {
    if (!isAreaRouteMissing(e)) throw e;
    const family = await getFamilyInfo(residentId);
    const r = family.resident;
    return {
      resident: {
        _id: r._id,
        residentCode: r.residentCode,
        fullName: r.fullName,
        dateOfBirth: r.dateOfBirth,
        gender: r.gender,
        residencyStatus: r.residencyStatus,
        emergencyContactCount: family.emergencyContacts?.length ?? 0,
        area: {
          room: r.roomId
            ? {
                roomNumber: r.roomId.roomNumber,
                label: r.roomId.roomNumber ? `Phòng ${r.roomId.roomNumber}` : null,
              }
            : null,
          floor: r.roomId?.floorId
            ? {
                name: r.roomId.floorId.name,
                floorNumber: r.roomId.floorId.floorNumber,
                label: r.roomId.floorId.name || `Tầng ${r.roomId.floorId.floorNumber}`,
              }
            : null,
          building: null,
          bed: null,
        },
      },
      _fallback: true,
    };
  }
};

/** GET /api/residents/initial-health?search=&status=&recorded=&page=&limit= */
const listInitialHealthFallback = async ({
  search,
  status = 'admitted',
  recorded,
  page = 1,
  limit = 20,
} = {}) => {
  const res = await listForFamilyManagement({
    search,
    status,
    page,
    limit,
  });

  let data = (Array.isArray(res.data) ? res.data : []).map((r) => ({
    _id: r._id,
    residentCode: r.residentCode,
    fullName: r.fullName,
    hasInitialHealthRecord: false,
  }));

  const details = await Promise.all(
    data.map((r) => getResidentDetail(r._id).catch(() => null))
  );

  data = data.map((item, i) => {
    const detail = details[i]?.resident;
    return {
      ...item,
      hasInitialHealthRecord: hasInitialHealthRecord(detail?.initialHealthCondition),
    };
  });

  if (recorded === true || recorded === 'true') {
    data = data.filter((r) => r.hasInitialHealthRecord);
  } else if (recorded === false || recorded === 'false') {
    data = data.filter((r) => !r.hasInitialHealthRecord);
  }

  return {
    data,
    total: res.total ?? data.length,
    page: res.page ?? page,
    limit: res.limit ?? limit,
    totalPages: res.totalPages ?? 1,
    _fallback: true,
  };
};

const listInitialHealth = async (params = {}) => {
  try {
    return await axiosClient.get('/residents/initial-health', { params }).then((r) => r.data);
  } catch (e) {
    if (!isInitialHealthListRouteMissing(e)) throw e;
    return listInitialHealthFallback(params);
  }
};

const listPreExistingFallback = async ({
  search,
  status = 'admitted',
  recorded,
  page = 1,
  limit = 20,
} = {}) => {
  const res = await listForFamilyManagement({
    search,
    status,
    page,
    limit,
  });

  let data = (Array.isArray(res.data) ? res.data : []).map((r) => ({
    _id: r._id,
    residentCode: r.residentCode,
    fullName: r.fullName,
    hasPreExistingRecord: false,
    chronicConditionsCount: 0,
    medicalHistoryCount: 0,
  }));

  const details = await Promise.all(
    data.map((r) => getPreExistingConditions(r._id).catch(() => null))
  );

  data = data.map((item, i) => {
    const pre = details[i]?.preExistingConditions;
    const chronicCount = pre?.chronicConditions?.length ?? 0;
    const historyCount = pre?.medicalHistory?.length ?? 0;
    return {
      ...item,
      hasPreExistingRecord: chronicCount + historyCount > 0,
      chronicConditionsCount: chronicCount,
      medicalHistoryCount: historyCount,
    };
  });

  if (recorded === true || recorded === 'true') {
    data = data.filter((r) => r.hasPreExistingRecord);
  } else if (recorded === false || recorded === 'false') {
    data = data.filter((r) => !r.hasPreExistingRecord);
  }

  return {
    data,
    total: res.total ?? data.length,
    page: res.page ?? page,
    limit: res.limit ?? limit,
    totalPages: res.totalPages ?? 1,
    _fallback: true,
  };
};

const listPreExistingConditions = async (params = {}) => {
  try {
    return await axiosClient.get('/residents/pre-existing-conditions', { params }).then((r) => r.data);
  } catch (e) {
    if (!isAreaRouteMissing(e)) throw e;
    return listPreExistingFallback(params);
  }
};

const listDrugAllergiesFallback = async ({
  search,
  status = 'admitted',
  recorded,
  page = 1,
  limit = 20,
} = {}) => {
  const res = await listForFamilyManagement({
    search,
    status,
    page,
    limit,
  });

  let data = (Array.isArray(res.data) ? res.data : []).map((r) => ({
    _id: r._id,
    residentCode: r.residentCode,
    fullName: r.fullName,
    hasDrugAllergiesRecord: false,
    drugAllergiesCount: 0,
  }));

  const details = await Promise.all(
    data.map((r) => getDrugAllergies(r._id).catch(() => null))
  );

  data = data.map((item, i) => {
    const count = details[i]?.drugAllergies?.drugAllergies?.length ?? 0;
    return {
      ...item,
      hasDrugAllergiesRecord: count > 0,
      drugAllergiesCount: count,
    };
  });

  if (recorded === true || recorded === 'true') {
    data = data.filter((r) => r.hasDrugAllergiesRecord);
  } else if (recorded === false || recorded === 'false') {
    data = data.filter((r) => !r.hasDrugAllergiesRecord);
  }

  return {
    data,
    total: res.total ?? data.length,
    page: res.page ?? page,
    limit: res.limit ?? limit,
    totalPages: res.totalPages ?? 1,
    _fallback: true,
  };
};

const listDrugAllergies = async (params = {}) => {
  try {
    return await axiosClient.get('/residents/drug-allergies', { params }).then((r) => r.data);
  } catch (e) {
    if (!isAreaRouteMissing(e)) throw e;
    return listDrugAllergiesFallback(params);
  }
};

const getInitialHealthFallback = async (residentId) => {
  const detail = await getResidentDetail(residentId);
  const r = detail?.resident;
  if (!r) throw new Error('Resident not found');

  const initialHealthCondition = r.initialHealthCondition || '';
  return {
    resident: {
      _id: r._id,
      residentCode: r.residentCode,
      fullName: r.fullName,
      age: r.age,
      gender: r.gender,
      residencyStatus: r.residencyStatus,
    },
    initialHealth: {
      bloodType: r.bloodType,
      initialHealthCondition,
      hasInitialHealthRecord: hasInitialHealthRecord(initialHealthCondition),
      updatedAt: r.updatedAt,
    },
    _fallback: true,
  };
};

/** GET /api/residents/:id/initial-health */
const getInitialHealth = async (residentId) => {
  try {
    return await axiosClient.get(`/residents/${residentId}/initial-health`).then((r) => r.data);
  } catch (e) {
    if (!isInitialHealthListRouteMissing(e) && e?.response?.status !== 404) throw e;
    return getInitialHealthFallback(residentId);
  }
};

/** PUT /api/residents/:id/initial-health */
const recordInitialHealth = (residentId, body) =>
  axiosClient.put(`/residents/${residentId}/initial-health`, body).then((r) => r.data);

export const RESIDENT_AREA_ROUTE_HINT =
  'Backend chưa có route /api/residents/areas/summary hoặc /by-area. ' +
  'Cập nhật backend, mount resident routes, rồi khởi động lại API. ' +
  'Trang đang dùng dữ liệu dự phòng từ API phân công.';

export const RESIDENT_INITIAL_HEALTH_ROUTE_HINT =
  'Backend chưa có route GET /api/residents/initial-health (hoặc route bị khai báo sau /:residentId). ' +
  'Cập nhật backend, đặt router.get(\'/initial-health\', ...) trước /:residentId, rồi khởi động lại API. ' +
  'Trang đang dùng danh sách dự phòng; PUT /:id/initial-health chỉ nhận bloodType và initialHealthCondition (không gửi dị ứng/bệnh nền).';

export const RESIDENT_PRE_EXISTING_ROUTE_HINT =
  'Backend chưa có route /api/residents/pre-existing-conditions hoặc /api/residents/:residentId/pre-existing-conditions. ' +
  'Cập nhật backend và khởi động lại API để dùng đầy đủ tính năng bệnh lý nền.';

export const RESIDENT_DRUG_ALLERGIES_ROUTE_HINT =
  'Backend chưa có route /api/residents/drug-allergies hoặc /api/residents/:residentId/drug-allergies. ' +
  'Cập nhật backend và khởi động lại API để dùng đầy đủ tính năng quản lý dị ứng thuốc.';

export const RESIDENT_TRANSFER_ROUTE_HINT =
  'Backend chưa có route chuyển phòng cư dân (/transfer-room). ' +
  'Cập nhật backend và khởi động lại API để dùng tính năng chuyển phòng.';

/** GET /api/residents/:id/pre-existing-conditions */
const getPreExistingConditions = (residentId) =>
  axiosClient.get(`/residents/${residentId}/pre-existing-conditions`).then((r) => r.data);

/** PUT /api/residents/:id/pre-existing-conditions */
const updatePreExistingConditions = (residentId, body) =>
  axiosClient.put(`/residents/${residentId}/pre-existing-conditions`, body).then((r) => r.data);

/** GET /api/residents/:id/drug-allergies */
const getDrugAllergies = (residentId) =>
  axiosClient.get(`/residents/${residentId}/drug-allergies`).then((r) => r.data);

/** PUT /api/residents/:id/drug-allergies */
const updateDrugAllergies = (residentId, body) =>
  axiosClient.put(`/residents/${residentId}/drug-allergies`, body).then((r) => r.data);

/** GET /api/residents/:id/transfer-room/targets?floorId= */
const getTransferTargets = (residentId, params) =>
  axiosClient.get(`/residents/${residentId}/transfer-room/targets`, { params }).then((r) => r.data);

/** POST /api/residents/:id/transfer-room */
const transferResidentToRoom = (residentId, body) =>
  axiosClient.post(`/residents/${residentId}/transfer-room`, body).then((r) => r.data);

const residentService = {
  createResident,
  getResidentList,
  updateResidentPersonalInfo,
  updateResidentFamilyInfo,
  listForAssignment,
  listForFamilyManagement,
  getFamilyInfo,
  addEmergencyContact,
  updateEmergencyContact,
  removeEmergencyContact,
  getAreaSummary,
  listByArea,
  getResidentDetail,
  listInitialHealth,
  listPreExistingConditions,
  listDrugAllergies,
  getInitialHealth,
  recordInitialHealth,
  getPreExistingConditions,
  updatePreExistingConditions,
  getDrugAllergies,
  updateDrugAllergies,
  getTransferTargets,
  transferResidentToRoom,
};

export default residentService;
