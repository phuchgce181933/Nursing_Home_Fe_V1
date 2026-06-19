import i18n from '../i18n';

/** Normalize resident or list-row shape (flat or nested under area). */
function pickAreaSource(resident) {
  if (!resident) return null;
  if (resident.area && typeof resident.area === 'object') {
    return {
      room: resident.area.room ?? resident.room,
      floor: resident.area.floor ?? resident.floor,
      building: resident.area.building ?? resident.building,
      bed: resident.area.bed ?? resident.bed,
    };
  }
  return {
    room: resident.room,
    floor: resident.floor,
    building: resident.building,
    bed: resident.bed,
  };
}

function resolveT(t) {
  return t || ((key, opts) => i18n.t(key, opts));
}

export function roomLabel(room, t) {
  if (!room) return null;
  if (room.label) return room.label;
  if (room.roomNumber != null && room.roomNumber !== '') {
    const tt = resolveT(t);
    return `${tt('admin.residents.common.room')} ${room.roomNumber}`;
  }
  return null;
}

export function floorLabel(floor, t) {
  if (!floor) return null;
  if (floor.label) return floor.label;
  if (floor.name) return floor.name;
  if (floor.floorNumber != null) {
    const tt = resolveT(t);
    return `${tt('admin.residents.common.floor')} ${floor.floorNumber}`;
  }
  return null;
}

export function bedLabel(bed) {
  if (!bed?.bedCode) return null;
  return bed.bedType ? `${bed.bedCode} (${bed.bedType})` : bed.bedCode;
}

export function formatResidentArea(resident, t) {
  const { room, floor, building, bed } = pickAreaSource(resident) || {};
  return {
    building: building?.name || building?.code || null,
    floor: floorLabel(floor, t),
    room: roomLabel(room, t),
    bed: bedLabel(bed),
  };
}

export function hasAssignedArea(resident) {
  const src = pickAreaSource(resident);
  if (!src) return false;
  const { room, floor, building } = src;
  return Boolean(
    building?.name
    || building?.code
    || floor?.label
    || floor?.name
    || floor?.floorNumber != null
    || room?.label
    || (room?.roomNumber != null && room?.roomNumber !== '')
  );
}

export function formatResidentAreaLine(resident, t) {
  const tt = resolveT(t);
  const { building, floor, room, bed } = formatResidentArea(resident, t);
  const parts = [];
  if (floor) {
    parts.push(floor);
  } else if (building) {
    const b = String(building).trim();
    const buildingWord = tt('admin.residents.common.building');
    parts.push(new RegExp(`^${buildingWord}\\b`, 'i').test(b) || /^tòa\b/i.test(b) ? b : `${buildingWord} ${b}`);
  }
  if (room) parts.push(room);
  if (bed) parts.push(`${tt('admin.residents.common.bed')} ${bed}`);
  return parts.length ? parts.join(' · ') : null;
}

/** drugAllergies column first; legacy allergies field as fallback */
export function pickDrugAllergiesList(resident) {
  if (!resident) return [];
  if (Array.isArray(resident.drugAllergies)) {
    return resident.drugAllergies.map((s) => String(s).trim()).filter(Boolean);
  }
  if (Array.isArray(resident.allergies)) {
    return resident.allergies.map((s) => String(s).trim()).filter(Boolean);
  }
  return [];
}
