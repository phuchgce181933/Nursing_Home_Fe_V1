import i18n from '../i18n';
import { roomLabel, floorLabel } from './residentArea';

function resolveT(t) {
  return t || ((key, opts) => i18n.t(key, opts));
}

/**
 * Format backend `staffAreasSynced` from POST /residents/:id/transfer-room.
 * @param {Array<{ staffProfileId?: string, staffCode?: string, addedFloorIds?: string[], addedRoomIds?: string[] }>} synced
 * @param {{ floors?: object[], transferTargets?: object[] }} context
 * @param {Function} [t] - i18n translate function
 * @returns {{ title: string, lines: string[] } | null}
 */
export function formatStaffAreasSyncedSummary(synced, { floors = [], transferTargets = [] } = {}, t) {
  const tt = resolveT(t);
  const list = Array.isArray(synced) ? synced.filter(Boolean) : [];
  if (!list.length) return null;

  const floorLabels = buildFloorLabelMap(floors, tt);
  const roomLabels = buildRoomLabelMap(transferTargets, tt);

  const lines = list.map((entry) => formatStaffSyncLine(entry, floorLabels, roomLabels, tt));
  const count = list.length;

  return {
    title: tt('admin.residents.transfer.staffSync.title', { count }),
    lines,
  };
}

function buildFloorLabelMap(floors, t) {
  const map = new Map();
  for (const f of floors) {
    if (!f?._id) continue;
    const id = String(f._id);
    map.set(id, floorLabel(f, t) || f.name || id);
  }
  return map;
}

function buildRoomLabelMap(rooms, t) {
  const map = new Map();
  for (const r of rooms) {
    if (!r?._id) continue;
    const id = String(r._id);
    map.set(id, roomLabel(r, t) || r.label || id);
  }
  return map;
}

function formatStaffSyncLine(entry, floorLabels, roomLabels, t) {
  const code = entry.staffCode ? ` (${entry.staffCode})` : '';
  const floorParts = (entry.addedFloorIds || []).map(
    (id) => floorLabels.get(String(id)) || String(id)
  );
  const roomParts = (entry.addedRoomIds || []).map(
    (id) => roomLabels.get(String(id)) || String(id)
  );

  const detail = [];
  if (floorParts.length) {
    detail.push(t('admin.residents.transfer.staffSync.addedFloors', {
      items: floorParts.join(', '),
    }));
  }
  if (roomParts.length) {
    detail.push(t('admin.residents.transfer.staffSync.addedRooms', {
      items: roomParts.join(', '),
    }));
  }

  const label = entry.staffCode || t('admin.residents.transfer.staffSync.defaultStaff');
  if (!detail.length) {
    return t('admin.residents.transfer.staffSync.lineSynced', { label, code });
  }
  return t('admin.residents.transfer.staffSync.lineAdded', {
    label,
    code,
    detail: detail.join('; '),
  });
}
