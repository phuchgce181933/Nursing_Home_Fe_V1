/**
 * Format backend `staffAreasSynced` from POST /residents/:id/transfer-room.
 * @param {Array<{ staffProfileId?: string, staffCode?: string, addedFloorIds?: string[], addedRoomIds?: string[] }>} synced
 * @param {{ floors?: object[], transferTargets?: object[] }} context
 * @returns {{ title: string, lines: string[] } | null}
 */
export function formatStaffAreasSyncedSummary(synced, { floors = [], transferTargets = [] } = {}) {
  const list = Array.isArray(synced) ? synced.filter(Boolean) : [];
  if (!list.length) return null;

  const floorLabels = buildFloorLabelMap(floors);
  const roomLabels = buildRoomLabelMap(transferTargets);

  const lines = list.map((entry) => formatStaffSyncLine(entry, floorLabels, roomLabels));
  const count = list.length;

  return {
    title:
      count === 1
        ? 'Đã cập nhật khu vực phụ trách cho 1 nhân viên'
        : `Đã cập nhật khu vực phụ trách cho ${count} nhân viên`,
    lines,
  };
}

function buildFloorLabelMap(floors) {
  const map = new Map();
  for (const f of floors) {
    if (!f?._id) continue;
    const id = String(f._id);
    map.set(id, f.name || (f.floorNumber != null ? `Tầng ${f.floorNumber}` : id));
  }
  return map;
}

function buildRoomLabelMap(rooms) {
  const map = new Map();
  for (const r of rooms) {
    if (!r?._id) continue;
    const id = String(r._id);
    map.set(
      id,
      r.roomNumber != null && r.roomNumber !== ''
        ? `Phòng ${r.roomNumber}`
        : r.label || id
    );
  }
  return map;
}

function formatStaffSyncLine(entry, floorLabels, roomLabels) {
  const code = entry.staffCode ? ` (${entry.staffCode})` : '';
  const floorParts = (entry.addedFloorIds || []).map(
    (id) => floorLabels.get(String(id)) || String(id)
  );
  const roomParts = (entry.addedRoomIds || []).map(
    (id) => roomLabels.get(String(id)) || String(id)
  );

  const detail = [];
  if (floorParts.length) detail.push(`thêm ${floorParts.join(', ')}`);
  if (roomParts.length) detail.push(`thêm ${roomParts.join(', ')}`);

  const label = entry.staffCode || 'Nhân viên';
  if (!detail.length) return `${label}${code}: đã đồng bộ khu vực`;
  return `${label}${code}: ${detail.join('; ')}`;
}
