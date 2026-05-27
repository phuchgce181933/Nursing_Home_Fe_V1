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

export function roomLabel(room) {
  if (!room) return null;
  if (room.label) return room.label;
  if (room.roomNumber != null && room.roomNumber !== '') {
    return `Phòng ${room.roomNumber}`;
  }
  return null;
}

export function bedLabel(bed) {
  if (!bed?.bedCode) return null;
  return bed.bedType ? `${bed.bedCode} (${bed.bedType})` : bed.bedCode;
}

export function formatResidentArea(resident) {
  const { room, floor, building, bed } = pickAreaSource(resident) || {};
  return {
    building: building?.name || building?.code || null,
    floor: floor?.label || floor?.name || (floor?.floorNumber != null ? `Tầng ${floor.floorNumber}` : null),
    room: roomLabel(room),
    bed: bedLabel(bed),
  };
}

export function hasAssignedArea(resident) {
  const { building, floor, room } = formatResidentArea(resident);
  return Boolean(building || floor || room);
}

export function formatResidentAreaLine(resident) {
  const { building, floor, room, bed } = formatResidentArea(resident);
  const parts = [];
  if (building) parts.push(`Tòa ${building}`);
  if (floor) parts.push(floor);
  if (room) parts.push(room);
  if (bed) parts.push(`Giường ${bed}`);
  return parts.length ? parts.join(' · ') : null;
}
