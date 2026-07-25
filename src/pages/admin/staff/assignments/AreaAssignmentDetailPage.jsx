import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import staffService from '../../../../services/staff.service';
import facilityService from '../../../../services/facility.service';
import { floorLabel, roomLabel } from '../../../../components/facility/FloorRoomSelect';
import { canAssignAreas } from '../../../../utils/staffAssignable';
import { isStaffOnLeaveForAssignment } from '../../../../utils/leaveUtils';
import { getApiErrorPayload, blockingCareTasksMessage } from '../../../../utils/blockingCareTasks';
import BlockingCareTasksAlert from '../../../../components/staff/BlockingCareTasksAlert';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import { useAuth } from '../../../../hooks/useAuth';
import { todayVN } from '../../../../utils/dateUtils';
import {
  areaIdsFromProfile,
  getAssignmentBasePath,
  getAssignmentListUrl,
} from './assignmentHelpers';
import { Alert, ShiftDetailPanel, useMinuteNow } from './assignmentShared';
import '../../../../styles/admin/StaffAssignmentPage.css';

export default function AreaAssignmentDetailPage() {
  const { t } = useTranslation();
  const { staffId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = getAssignmentBasePath(user?.role);
  const assignmentDate = searchParams.get('date') || todayVN();
  const displayNow = useMinuteNow(assignmentDate === todayVN());

  const [staff, setStaff] = useState(null);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selectedFloorIds, setSelectedFloorIds] = useState([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingFloors, setLoadingFloors] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [blockingTasks, setBlockingTasks] = useState([]);
  const [infos, setInfos] = useState([]);

  const listUrl = getAssignmentListUrl(basePath, { tab: 'area', date: assignmentDate });

  useEffect(() => {
    let cancelled = false;
    setLoadingStaff(true);
    staffService
      .getAll({ limit: 100, assignmentDate })
      .then((res) => {
        if (cancelled) return;
        const list = res.data || res || [];
        const found = list.find((s) => String(s._id) === String(staffId));
        setStaff(found || null);
        if (found?.staffProfile) {
          const { floorIds, roomIds } = areaIdsFromProfile(found.staffProfile);
          setSelectedFloorIds(floorIds);
          setSelectedRoomIds(roomIds);
        }
      })
      .catch(() => {
        if (!cancelled) setStaff(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingStaff(false);
      });
    return () => {
      cancelled = true;
    };
  }, [staffId, assignmentDate]);

  useEffect(() => {
    facilityService
      .listFloors({ activeOnly: true })
      .then((data) => setFloors(Array.isArray(data) ? data : []))
      .catch(() => setFloors([]))
      .finally(() => setLoadingFloors(false));
  }, []);

  useEffect(() => {
    if (!selectedFloorIds.length) {
      setRooms([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingRooms(true);
    Promise.all(selectedFloorIds.map((id) => facilityService.listRoomsByFloor(id)))
      .then((results) => {
        if (!cancelled) setRooms(results.flat());
      })
      .catch(() => {
        if (!cancelled) setRooms([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRooms(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFloorIds]);

  const toggleFloor = (id) => {
    setSelectedFloorIds((prev) => {
      const removing = prev.includes(id);
      const next = removing ? prev.filter((x) => x !== id) : [...prev, id];
      if (removing) {
        setSelectedRoomIds((roomPrev) =>
          roomPrev.filter((rid) => {
            const room = rooms.find((r) => r._id === rid);
            return !room || String(room.floorId) !== String(id);
          })
        );
      }
      return next;
    });
  };

  const toggleRoom = (id) => {
    setSelectedRoomIds((prev) =>
      (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    );
  };

  const handleSave = async () => {
    if (!staff) return;
    setSaving(true);
    setError('');
    setBlockingTasks([]);
    setSuccess('');
    setInfos([]);
    try {
      const res = await staffService.assignAreas(staff._id, {
        floorIds: selectedFloorIds,
        roomIds: selectedRoomIds,
      });
      setSuccess(t('admin.staff.assignments.area.areaUpdated'));
      const hints = res.info || res.warnings || [];
      if (hints.length) setInfos(hints);

      if (res.staffProfile) {
        const { floorIds, roomIds } = areaIdsFromProfile(res.staffProfile);
        setStaff((prev) => (prev ? { ...prev, staffProfile: res.staffProfile } : prev));
        setSelectedFloorIds(floorIds);
        setSelectedRoomIds(roomIds);
      }

      const pruned = res.residentsPruned;
      if (pruned?.count > 0) {
        const names = (pruned.removed || [])
          .map((r) => {
            const room = r.roomNumber ? `${t('admin.staff.assignments.residents.roomPrefix')}${r.roomNumber}` : '';
            const label = r.fullName || r.residentCode || '';
            return [label, room].filter(Boolean).join(' · ');
          })
          .filter(Boolean)
          .join(', ');
        setInfos((prev) => [
          ...prev,
          t('admin.staff.assignments.area.residentsPruned', {
            count: pruned.count,
            names: names ? t('admin.staff.assignments.area.residentsPrunedNames', { names }) : '',
          }),
        ]);
      }
    } catch (e) {
      const { message, blockingTasks: blocked } = getApiErrorPayload(e, t('common.saveFailed'));
      setBlockingTasks(blocked);
      setError(blocked.length ? blockingCareTasksMessage(message) : message);
    } finally {
      setSaving(false);
    }
  };

  const panelTitle = useMemo(() => {
    if (!staff) return t('admin.staff.assignments.areaDetailTitle');
    return t('admin.staff.assignments.area.panelTitle', { name: staff.fullName });
  }, [staff, t]);

  const renderContent = () => {
    if (loadingStaff) {
      return <p className="empty-state">{t('admin.staff.assignments.area.loading')}</p>;
    }
    if (!staff) {
      return <p className="empty-state empty-state--warn">{t('common.loadFailed')}</p>;
    }
    if (!canAssignAreas(staff)) {
      return (
        <p className="empty-state empty-state--warn">
          {t('admin.staff.assignments.area.adminManagerWarn')}
        </p>
      );
    }
    if (!staff.staffProfile) {
      return (
        <p className="empty-state empty-state--warn">{t('admin.staff.assignments.area.noProfileWarn')}</p>
      );
    }
    if (isStaffOnLeaveForAssignment(staff)) {
      return (
        <p className="empty-state empty-state--warn">
          {t('admin.staff.assignments.area.onLeaveWarn')}
        </p>
      );
    }

    return (
      <>
        <Alert type="success" msg={success} />
        {blockingTasks.length > 0 ? (
          <BlockingCareTasksAlert
            message={error}
            tasks={blockingTasks}
            hint={t('admin.staff.assignments.careTaskTabHint')}
          />
        ) : (
          <Alert type="error" msg={error} />
        )}
        {infos.map((msg, i) => (
          <Alert key={i} type="warning" msg={`ℹ️ ${msg}`} />
        ))}

        <ShiftDetailPanel
          summary={staff.shiftSummary}
          assignmentDate={assignmentDate}
          displayNow={displayNow}
        />

        <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12, lineHeight: 1.45 }}>
          {t('admin.staff.assignments.area.masterDataHint')}
        </p>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>{t('admin.staff.assignments.area.floorsLabel')}</label>
          {loadingFloors ? (
            <p className="field-hint">{t('admin.staff.assignments.area.loadingFloors')}</p>
          ) : (
            <div className="area-multi-select">
              {floors.length === 0 && <p className="field-hint">{t('admin.staff.assignments.area.noFloors')}</p>}
              {floors.map((f) => (
                <label key={f._id} className="area-multi-select__item">
                  <input
                    type="checkbox"
                    checked={selectedFloorIds.includes(f._id)}
                    onChange={() => toggleFloor(f._id)}
                  />
                  <span>{floorLabel(f)}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label>{t('admin.staff.assignments.area.roomsLabel')}</label>
          {!selectedFloorIds.length ? (
            <p className="field-hint">{t('admin.staff.assignments.area.selectFloorFirst')}</p>
          ) : loadingRooms ? (
            <p className="field-hint">{t('admin.staff.assignments.area.loadingRooms')}</p>
          ) : (
            <div className="area-multi-select">
              {rooms.length === 0 && <p className="field-hint">{t('admin.staff.assignments.area.noRooms')}</p>}
              {rooms.map((r) => (
                <label key={r._id} className="area-multi-select__item">
                  <input
                    type="checkbox"
                    checked={selectedRoomIds.includes(r._id)}
                    onChange={() => toggleRoom(r._id)}
                  />
                  <span>{roomLabel(r)}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? t('common.saving') : t('admin.staff.assignments.area.saveArea')}
        </button>
      </>
    );
  };

  return (
    <AdminPageShell title={panelTitle} subtitle={t('admin.staff.assignments.subtitle')}>
      <button type="button" className="assignment-detail-back" onClick={() => navigate(listUrl)}>
        <ArrowLeft size={16} />
        {t('admin.staff.assignments.backToList')}
      </button>
      <div className="assignment-panel assignment-detail-panel">{renderContent()}</div>
    </AdminPageShell>
  );
}
