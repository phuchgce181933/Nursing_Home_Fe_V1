import axiosClient from '../api/axiosClient';
import facilityService from './facility.service';
import { getAuthRole } from '../utils/auth';

const createResident = async (body) => {
  const response = await axiosClient.post('/admin/residents', body);
  return response.data;
};

const getResidentList = async (params = {}) => {
  const response = await axiosClient.get('/residents', { params });
  return response.data;
};

const getFamilyResidentList = async () => {
  const response = await axiosClient.get('/family/residents');
  return response.data;
};

const updateResidentPersonalInfo = async (residentId, body) => {
  const response = await axiosClient.patch(`/admin/residents/${residentId}/personal-info`, body);
  return response.data;
};

const adminUploadAvatar = async (residentId, file) => {
  const id = residentPathId(residentId);
  const fd = new FormData();
  fd.append('avatar', file);
  const response = await axiosClient.post(`/admin/residents/${id}/avatar`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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

const shouldUseInitialHealthDetailFallback = (error) => {
  const status = error?.response?.status;
  return (
    status === 404 ||
    status === 403 ||
    status === 405 ||
    isInitialHealthListRouteMissing(error)
  );
};

/** GET /residents/pre-existing-conditions may be matched as /:residentId */
const isPreExistingListRouteMissing = (error) => {
  const status = error?.response?.status;
  const msg = String(error?.response?.data?.message || '').toLowerCase();
  return (
    (status === 400 && msg.includes('invalid resident id')) ||
    isAreaRouteMissing(error)
  );
};

const shouldUsePreExistingDetailFallback = (error) =>
  status404403405(error) || isPreExistingListRouteMissing(error);

/** GET /residents/drug-allergies may be matched as /:residentId */
const isDrugAllergiesListRouteMissing = (error) => {
  const status = error?.response?.status;
  const msg = String(error?.response?.data?.message || '').toLowerCase();
  return (
    (status === 400 && msg.includes('invalid resident id')) ||
    isAreaRouteMissing(error)
  );
};

const shouldUseDrugAllergiesDetailFallback = (error) =>
  status404403405(error) || isDrugAllergiesListRouteMissing(error);

const pickDrugAllergiesArray = (resident) => {
  if (!resident) return [];
  if (Array.isArray(resident.drugAllergies)) return resident.drugAllergies;
  if (Array.isArray(resident.allergies)) return resident.allergies;
  return [];
};

const mapDrugAllergiesFromResident = (resident) => {
  const drugAllergies = pickDrugAllergiesArray(resident);
  return {
    drugAllergies,
    hasDrugAllergiesRecord: drugAllergies.length > 0,
    drugAllergiesCount: drugAllergies.length,
    updatedAt: resident?.updatedAt,
  };
};

const status404403405 = (error) => {
  const status = error?.response?.status;
  return status === 404 || status === 403 || status === 405;
};

const hasPreExistingRecord = (chronic = [], history = []) =>
  (Array.isArray(chronic) ? chronic.length : 0) + (Array.isArray(history) ? history.length : 0) > 0;

const residentPathId = (residentId) => encodeURIComponent(String(residentId || '').trim());

const unwrapResidentApiBody = (response) => {
  const raw = response?.data;
  if (!raw || typeof raw !== 'object') return raw;
  if (
    raw.data &&
    typeof raw.data === 'object' &&
    !Array.isArray(raw.data) &&
    (Array.isArray(raw.data.data) || raw.data.total != null)
  ) {
    return raw.data;
  }
  return raw;
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
    const body = await axiosClient.get('/residents/by-area', { params }).then(unwrapResidentApiBody);
    return {
      data: Array.isArray(body?.data) ? body.data : [],
      total: body?.total ?? 0,
      page: body?.page ?? 1,
      limit: body?.limit ?? 20,
      totalPages: body?.totalPages ?? 0,
    };
  } catch (e) {
    if (!isAreaRouteMissing(e)) throw e;
    return listByAreaFallback(params);
  }
};

const BY_AREA_EXPORT_PAGE_SIZE = 100;

/** Fetch all residents by area matching filters for client-side export (paginated). */
const fetchAllResidentsByAreaForExport = async (filters = {}) => {
  const params = {
    buildingId: filters.buildingId || undefined,
    floorId: filters.floorId || undefined,
    roomId: filters.roomId || undefined,
    search: filters.search || undefined,
    status: filters.status || undefined,
    limit: BY_AREA_EXPORT_PAGE_SIZE,
    page: 1,
  };

  const first = await listByArea(params);
  const all = [...(first?.data || [])];
  const totalPages = first?.totalPages || 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await listByArea({ ...params, page });
    all.push(...(next?.data || []));
  }

  return all;
};

const buildResidentFromFamily = (family) => {
  const r = family.resident;
  return {
    _id: r._id,
    residentCode: r.residentCode,
    fullName: r.fullName,
    dateOfBirth: r.dateOfBirth,
    gender: r.gender,
    residencyStatus: r.residencyStatus,
    emergencyContactCount: family.emergencyContacts?.length ?? 0,
    emergencyContacts: family.emergencyContacts || [],
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
  };
};

/** GET /residents/:id without secondary health fetches (avoids enrich ↔ fallback loops) */
const getResidentDetailRaw = async (residentIdOrCode) => {
  const id = residentPathId(residentIdOrCode);
  try {
    const body = await axiosClient.get(`/residents/${id}`).then(unwrapResidentApiBody);
    return body?.resident ?? null;
  } catch (e) {
    if (!isAreaRouteMissing(e) && e?.response?.status !== 404) throw e;
    try {
      const family = await getFamilyInfo(residentIdOrCode);
      return family?.resident ? buildResidentFromFamily(family) : null;
    } catch {
      return null;
    }
  }
};

const enrichResidentDetail = async (residentIdOrCode, resident) => {
  if (!resident) return resident;
  const merged = { ...resident };
  const tasks = [];

  if (!Array.isArray(merged.drugAllergies)) {
    tasks.push(
      getDrugAllergies(residentIdOrCode)
        .then((data) => {
          const list = pickDrugAllergiesArray(data.resident) || data.drugAllergies?.drugAllergies || [];
          merged.drugAllergies = list;
          merged.hasDrugAllergiesRecord =
            data.drugAllergies?.hasDrugAllergiesRecord ?? list.length > 0;
          merged.drugAllergiesCount = data.drugAllergies?.drugAllergiesCount ?? list.length;
        })
        .catch(() => {
          merged.drugAllergies = pickDrugAllergiesArray(merged);
        })
    );
  }

  if (!Array.isArray(merged.chronicConditions) || !Array.isArray(merged.medicalHistory)) {
    tasks.push(
      getPreExistingConditions(residentIdOrCode)
        .then((data) => {
          const pre = data.preExistingConditions;
          if (!Array.isArray(merged.chronicConditions)) {
            merged.chronicConditions = pre?.chronicConditions ?? [];
          }
          if (!Array.isArray(merged.medicalHistory)) {
            merged.medicalHistory = pre?.medicalHistory ?? [];
          }
        })
        .catch(() => {})
    );
  }

  if (merged.initialHealthCondition === undefined && merged.bloodType === undefined) {
    tasks.push(
      getInitialHealth(residentIdOrCode)
        .then((data) => {
          if (data.initialHealth) {
            if (merged.bloodType === undefined) merged.bloodType = data.initialHealth.bloodType;
            if (merged.initialHealthCondition === undefined) {
              merged.initialHealthCondition = data.initialHealth.initialHealthCondition;
            }
          }
        })
        .catch(() => {})
    );
  }

  if (tasks.length) await Promise.all(tasks);
  return merged;
};

/** GET /api/residents/:id — full profile; enriches drugAllergies / pre-existing / initial health if missing */
const getResidentDetail = async (residentIdOrCode) => {
  const base = await getResidentDetailRaw(residentIdOrCode);
  if (!base) throw new Error('Resident not found');
  const resident = await enrichResidentDetail(residentIdOrCode, base);
  return { resident };
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
    const body = await axiosClient
      .get('/residents/initial-health', { params })
      .then(unwrapResidentApiBody);
    return {
      data: Array.isArray(body?.data) ? body.data : [],
      total: body?.total ?? 0,
      page: body?.page ?? 1,
      limit: body?.limit ?? 20,
      totalPages: body?.totalPages ?? 1,
    };
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
    const body = await axiosClient
      .get('/residents/pre-existing-conditions', { params })
      .then(unwrapResidentApiBody);
    return {
      data: Array.isArray(body?.data) ? body.data : [],
      total: body?.total ?? 0,
      page: body?.page ?? 1,
      limit: body?.limit ?? 20,
      totalPages: body?.totalPages ?? 1,
    };
  } catch (e) {
    if (!isPreExistingListRouteMissing(e)) throw e;
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
    const body = await axiosClient
      .get('/residents/drug-allergies', { params })
      .then(unwrapResidentApiBody);
    return {
      data: Array.isArray(body?.data) ? body.data : [],
      total: body?.total ?? 0,
      page: body?.page ?? 1,
      limit: body?.limit ?? 20,
      totalPages: body?.totalPages ?? 1,
    };
  } catch (e) {
    if (!isDrugAllergiesListRouteMissing(e)) throw e;
    return listDrugAllergiesFallback(params);
  }
};

const getInitialHealthFallback = async (residentId) => {
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
  const id = residentPathId(residentId);
  try {
    return await axiosClient
      .get(`/residents/${id}/initial-health`)
      .then(unwrapResidentApiBody);
  } catch (e) {
    if (!shouldUseInitialHealthDetailFallback(e)) throw e;
    return getInitialHealthFallback(residentId);
  }
};

const recordInitialHealthViaAdmin = async (residentId, body) => {
  const update = {
    initialHealthCondition: body.initialHealthCondition,
  };
  if (body.bloodType) update.bloodType = body.bloodType;
  const res = await updateResidentPersonalInfo(residentId, update);
  const r = res?.resident;
  const initialHealthCondition = r?.initialHealthCondition || body.initialHealthCondition || '';
  return {
    message: 'Initial health condition recorded',
    resident: r,
    initialHealth: {
      bloodType: r?.bloodType,
      initialHealthCondition,
      hasInitialHealthRecord: hasInitialHealthRecord(initialHealthCondition),
      updatedAt: r?.updatedAt,
    },
    _fallback: true,
  };
};

/** PUT /api/residents/:id/initial-health (fallback: POST, PATCH admin personal-info) */
const recordInitialHealth = async (residentId, body) => {
  const id = residentPathId(residentId);
  const payload = {
    initialHealthCondition: body.initialHealthCondition,
    ...(body.bloodType ? { bloodType: body.bloodType } : {}),
  };

  const tryPut = () =>
    axiosClient.put(`/residents/${id}/initial-health`, payload).then(unwrapResidentApiBody);

  const tryPost = () =>
    axiosClient.post(`/residents/${id}/initial-health`, payload).then(unwrapResidentApiBody);

  try {
    return await tryPut();
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404 || status === 405) {
      try {
        return await tryPost();
      } catch (postErr) {
        const postStatus = postErr?.response?.status;
        if (postStatus === 404 || postStatus === 405) {
          return recordInitialHealthViaAdmin(residentId, payload);
        }
        throw postErr;
      }
    }
    if (status === 403 && shouldUseInitialHealthDetailFallback(e)) {
      return recordInitialHealthViaAdmin(residentId, payload);
    }
    throw e;
  }
};

export const RESIDENT_AREA_ROUTE_HINT =
  'Backend chưa có route /api/residents/areas/summary hoặc /by-area. ' +
  'Cập nhật backend, mount resident routes, rồi khởi động lại API. ' +
  'Trang đang dùng dữ liệu dự phòng từ API phân công.';

export const RESIDENT_INITIAL_HEALTH_ROUTE_HINT =
  'Đang dùng API dự phòng (danh sách hoặc lưu qua PATCH /admin/residents/:id/personal-info). ' +
  'Để dùng API chuyên dụng: đặt GET /residents/initial-health trước /:residentId và mount PUT|POST /:id/initial-health.';

export const RESIDENT_PRE_EXISTING_ROUTE_HINT =
  'Đang dùng API dự phòng (danh sách hoặc lưu một phần qua PATCH personal-info). ' +
  'Đặt GET /residents/pre-existing-conditions trước /:residentId và mount PUT|POST /:id/pre-existing-conditions.';

export const RESIDENT_DRUG_ALLERGIES_ROUTE_HINT =
  'Đang dùng API dự phòng (danh sách hoặc lưu qua PATCH personal-info trường allergies). ' +
  'Đặt GET /residents/drug-allergies trước /:residentId và mount PUT|POST /:id/drug-allergies.';

export const RESIDENT_TRANSFER_ROUTE_HINT =
  'Backend chưa có route chuyển phòng cư dân (/transfer-room). ' +
  'Cập nhật backend và khởi động lại API để dùng tính năng chuyển phòng.';

const getPreExistingConditionsFallback = async (residentId) => {
  const r = await getResidentDetailRaw(residentId);
  if (!r) throw new Error('Resident not found');
  const chronic = r.chronicConditions || [];
  const history = r.medicalHistory || [];
  return {
    resident: r,
    preExistingConditions: {
      chronicConditions: chronic,
      medicalHistory: history,
      hasPreExistingRecord: hasPreExistingRecord(chronic, history),
      chronicConditionsCount: chronic.length,
      medicalHistoryCount: history.length,
      updatedAt: r.updatedAt,
    },
    _fallback: true,
  };
};

/** GET /api/residents/:id/pre-existing-conditions */
const getPreExistingConditions = async (residentId) => {
  const id = residentPathId(residentId);
  try {
    return await axiosClient
      .get(`/residents/${id}/pre-existing-conditions`)
      .then(unwrapResidentApiBody);
  } catch (e) {
    if (!shouldUsePreExistingDetailFallback(e)) throw e;
    return getPreExistingConditionsFallback(residentId);
  }
};

const updatePreExistingConditionsViaAdmin = async (residentId, body) => {
  const update = {};
  if (body.chronicConditions !== undefined) update.chronicConditions = body.chronicConditions;
  if (!Object.keys(update).length) {
    const err = new Error(
      'Không thể lưu tiền sử bệnh qua API dự phòng — cần PUT /residents/:id/pre-existing-conditions trên backend.'
    );
    err.response = { status: 503, data: { message: err.message } };
    throw err;
  }
  const res = await updateResidentPersonalInfo(residentId, update);
  const r = res?.resident;
  const chronic = r?.chronicConditions || body.chronicConditions || [];
  const history = r?.medicalHistory || [];
  const partialMedicalHistory = body.medicalHistory !== undefined;
  const displayHistory = partialMedicalHistory ? body.medicalHistory : history;
  return {
    message: partialMedicalHistory
      ? 'Đã lưu bệnh lý nền; tiền sử bệnh cần API pre-existing-conditions trên backend.'
      : 'Pre-existing medical conditions updated',
    resident: r,
    preExistingConditions: {
      chronicConditions: chronic,
      medicalHistory: displayHistory,
      hasPreExistingRecord: hasPreExistingRecord(chronic, displayHistory),
      chronicConditionsCount: chronic.length,
      medicalHistoryCount: displayHistory.length,
      updatedAt: r?.updatedAt,
    },
    _fallback: true,
    _partialMedicalHistory: partialMedicalHistory,
  };
};

/** PUT /api/residents/:id/pre-existing-conditions (fallback: POST, PATCH chronicConditions) */
const updatePreExistingConditions = async (residentId, body) => {
  const id = residentPathId(residentId);
  const payload = { ...body };
  if (body.preExistingConditions && typeof body.preExistingConditions === 'object') {
    const nested = body.preExistingConditions;
    if (nested.chronicConditions !== undefined) payload.chronicConditions = nested.chronicConditions;
    if (nested.medicalHistory !== undefined) payload.medicalHistory = nested.medicalHistory;
  }

  const tryPut = () =>
    axiosClient.put(`/residents/${id}/pre-existing-conditions`, payload).then(unwrapResidentApiBody);

  const tryPost = () =>
    axiosClient.post(`/residents/${id}/pre-existing-conditions`, payload).then(unwrapResidentApiBody);

  try {
    return await tryPut();
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404 || status === 405) {
      try {
        return await tryPost();
      } catch (postErr) {
        const postStatus = postErr?.response?.status;
        if (postStatus === 404 || postStatus === 405) {
          return updatePreExistingConditionsViaAdmin(residentId, payload);
        }
        throw postErr;
      }
    }
    if (status === 403 && shouldUsePreExistingDetailFallback(e)) {
      return updatePreExistingConditionsViaAdmin(residentId, payload);
    }
    throw e;
  }
};

const getDrugAllergiesFallback = async (residentId) => {
  const r = await getResidentDetailRaw(residentId);
  if (!r) throw new Error('Resident not found');
  return {
    resident: r,
    drugAllergies: mapDrugAllergiesFromResident(r),
    _fallback: true,
  };
};

/** GET /api/residents/:id/drug-allergies */
const getDrugAllergies = async (residentId) => {
  const id = residentPathId(residentId);
  try {
    return await axiosClient.get(`/residents/${id}/drug-allergies`).then(unwrapResidentApiBody);
  } catch (e) {
    if (!shouldUseDrugAllergiesDetailFallback(e)) throw e;
    return getDrugAllergiesFallback(residentId);
  }
};

const buildDrugAllergiesPayload = (body) => {
  if (!body || typeof body !== 'object') return {};
  if (Array.isArray(body.drugAllergies)) return { drugAllergies: body.drugAllergies };
  if (body.drugAllergies && typeof body.drugAllergies === 'object' && !Array.isArray(body.drugAllergies)) {
    const nested = body.drugAllergies.drugAllergies ?? body.drugAllergies.items;
    if (nested !== undefined) return { drugAllergies: nested };
  }
  if (body.allergies !== undefined) return { drugAllergies: body.allergies };
  return { drugAllergies: body.drugAllergies };
};

const updateDrugAllergiesViaAdmin = async (residentId, payload) => {
  const drugAllergies = payload.drugAllergies ?? [];
  const res = await updateResidentPersonalInfo(residentId, { allergies: drugAllergies });
  const r = res?.resident;
  const saved = pickDrugAllergiesArray(r).length ? pickDrugAllergiesArray(r) : drugAllergies;
  return {
    message:
      'Drug allergies updated (legacy allergies field — enable PUT /residents/:id/drug-allergies for drugAllergies column)',
    resident: r,
    drugAllergies: mapDrugAllergiesFromResident({ ...r, drugAllergies: saved, allergies: saved }),
    _fallback: true,
    _legacyAllergiesField: true,
  };
};

/** PUT /api/residents/:id/drug-allergies (fallback: POST, PATCH allergies — doctor only) */
const updateDrugAllergies = async (residentId, body) => {
  const id = residentPathId(residentId);
  const payload = buildDrugAllergiesPayload(body);
  const role = getAuthRole();
  const canUseAdminFallback = role === 'doctor';

  const tryPut = () =>
    axiosClient.put(`/residents/${id}/drug-allergies`, payload).then(unwrapResidentApiBody);

  const tryPost = () =>
    axiosClient.post(`/residents/${id}/drug-allergies`, payload).then(unwrapResidentApiBody);

  try {
    return await tryPut();
  } catch (e) {
    const status = e?.response?.status;
    if (canUseAdminFallback && (status === 404 || status === 405)) {
      try {
        return await tryPost();
      } catch (postErr) {
        const postStatus = postErr?.response?.status;
        if (postStatus === 404 || postStatus === 405) {
          return updateDrugAllergiesViaAdmin(residentId, payload);
        }
        throw postErr;
      }
    }
    throw e;
  }
};

/** GET /api/residents/:id/transfer-room/targets?floorId= */
const getTransferTargets = (residentId, params) =>
  axiosClient.get(`/residents/${residentId}/transfer-room/targets`, { params }).then((r) => r.data);

/**
 * POST /api/residents/:id/transfer-room
 * @param {string} residentId - MongoDB _id or residentCode
 * @param {{ targetRoomId: string, targetBedId: string }} body
 * @returns {Promise<{
 *   message: string,
 *   resident: object,
 *   from: object,
 *   to: object,
 *   staffAreasSynced?: Array<{
 *     staffProfileId: string,
 *     staffCode?: string,
 *     addedFloorIds: string[],
 *     addedRoomIds: string[]
 *   }>
 * }>}
 * When staff have the resident in assignedResidentIds, backend expands responsibleAreaIds
 * (and responsibleRoomIds when room-scoped) to include the destination floor/room.
 */
const transferResidentToRoom = (residentId, body) =>
  axiosClient.post(`/residents/${residentId}/transfer-room`, body).then((r) => r.data);

const residentService = {
  createResident,
  getResidentList,
  fetchAllResidentsByAreaForExport,
  getFamilyResidentList,
  updateResidentPersonalInfo,
  adminUploadAvatar,
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
