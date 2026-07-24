import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import staffService from '../../../../services/staff.service';
import { canAssignResidents } from '../../../../utils/staffAssignable';
import { isStaffOnLeaveForAssignment } from '../../../../utils/leaveUtils';
import { resolveApiError, resolveApiSuccess } from '../../../../utils/apiMessage';
import { getApiErrorPayload, blockingCareTasksMessage } from '../../../../utils/blockingCareTasks';
import BlockingCareTasksAlert from '../../../../components/staff/BlockingCareTasksAlert';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import { useAuth } from '../../../../hooks/useAuth';
import { todayVN } from '../../../../utils/dateUtils';
import {
  assignedResidentIdsFromProfile,
  getAssignmentBasePath,
  getAssignmentListUrl,
  residentPickerLabel,
} from './assignmentHelpers';
import { Alert, ShiftDetailPanel, useMinuteNow } from './assignmentShared';
import '../../../../styles/admin/StaffAssignmentPage.css';

export default function ResidentAssignmentDetailPage() {
  const { t, i18n } = useTranslation();
  const { staffId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = getAssignmentBasePath(user?.role);
  const assignmentDate = searchParams.get('date') || todayVN();
  const displayNow = useMinuteNow(assignmentDate === todayVN());

  const [staff, setStaff] = useState(null);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selectedResidentIds, setSelectedResidentIds] = useState([]);
  const [residentOptions, setResidentOptions] = useState([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [residentHint, setResidentHint] = useState('');
  const [residentFilterMode, setResidentFilterMode] = useState(null);
  const [residentSearch, setResidentSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [blockingTasks, setBlockingTasks] = useState([]);

  const listUrl = getAssignmentListUrl(basePath, { tab: 'residents', date: assignmentDate });

  const areaScopeKey = useMemo(() => {
    if (!staff?.staffProfile) return '';
    const p = staff.staffProfile;
    const rooms = (p.responsibleRoomIds || []).map((r) => String(r._id || r)).sort().join(',');
    const floors = (p.responsibleAreaIds || []).map((f) => String(f._id || f)).sort().join(',');
    if (!rooms && !floors) return '_none_';
    return `${rooms}|${floors}`;
  }, [staff?.staffProfile]);

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
          setSelectedResidentIds(assignedResidentIdsFromProfile(found.staffProfile));
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

  const loadResidentsForStaff = async (member) => {
    if (!member?._id) return;
    if (!member.staffProfile) {
      setResidentOptions([]);
      setResidentFilterMode(null);
      setResidentHint(t('admin.staff.assignments.residents.noProfileHint'));
      return;
    }

    setLoadingResidents(true);
    setResidentHint('');
    setResidentFilterMode(null);
    try {
      const res = await staffService.listResidentsAvailable(member._id, { status: 'admitted' });
      const list = Array.isArray(res.data) ? res.data : [];
      setResidentFilterMode(res.filterMode || null);
      setResidentOptions(
        [...list].sort((a, b) =>
          (a.fullName || '').localeCompare(b.fullName || '', i18n.language === 'vi' ? 'vi' : 'en')
        )
      );
      if (res.message) {
        setResidentHint(resolveApiSuccess(res, t));
      } else if (!list.length) {
        setResidentHint(
          res.filterMode === 'rooms'
            ? t('admin.staff.assignments.residents.noResidentsRooms')
            : t('admin.staff.assignments.residents.noResidentsFloors')
        );
      }
    } catch (e) {
      setResidentOptions([]);
      setResidentFilterMode(null);
      setResidentHint(resolveApiError(e, t, 'admin.staff.assignments.residents.loadResidentsFailed'));
    } finally {
      setLoadingResidents(false);
    }
  };

  const syncAssignedResidents = async (member) => {
    try {
      const res = await staffService.listAssignedResidents(member._id);
      const assigned = Array.isArray(res.data) ? res.data : [];
      const ids = assigned.map((r) => String(r._id));
      setSelectedResidentIds(ids);
      setStaff((prev) =>
        prev?._id === member._id
          ? {
              ...prev,
              staffProfile: {
                ...prev.staffProfile,
                assignedResidentIds: assigned,
              },
            }
          : prev
      );
    } catch {
      const ids = assignedResidentIdsFromProfile(member.staffProfile);
      setSelectedResidentIds(ids);
    }
  };

  useEffect(() => {
    if (!staff?._id) return undefined;
    let cancelled = false;

    (async () => {
      await syncAssignedResidents(staff);
      if (!cancelled) await loadResidentsForStaff(staff);
    })();

    return () => {
      cancelled = true;
    };
  }, [staff?._id, areaScopeKey]);

  const toggleResident = (id) => {
    const sid = String(id);
    setSelectedResidentIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );
  };

  const filteredResidents = useMemo(() => {
    const q = residentSearch.trim().toLowerCase();
    if (!q) return residentOptions;
    return residentOptions.filter((r) => {
      const name = (r.fullName || '').toLowerCase();
      const code = (r.residentCode || '').toLowerCase();
      const room = r.roomId?.roomNumber?.toLowerCase?.() || '';
      return name.includes(q) || code.includes(q) || room.includes(q);
    });
  }, [residentOptions, residentSearch]);

  const handleSave = async () => {
    if (!staff) return;
    if (!staff.staffProfile) {
      setError(t('admin.staff.assignments.residents.noProfileWarn'));
      return;
    }
    setSaving(true);
    setError('');
    setBlockingTasks([]);
    setSuccess('');
    try {
      const res = await staffService.assignResidents(staff._id, {
        residentIds: selectedResidentIds,
      });
      setSuccess(t('admin.staff.assignments.residents.residentsUpdated'));
      if (res.staffProfile) {
        setStaff((prev) => (prev ? { ...prev, staffProfile: res.staffProfile } : prev));
        setSelectedResidentIds(assignedResidentIdsFromProfile(res.staffProfile));
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
    if (!staff) return t('admin.staff.assignments.residentsDetailTitle');
    return t('admin.staff.assignments.residents.panelTitle', { name: staff.fullName });
  }, [staff, t]);

  const renderContent = () => {
    if (loadingStaff) {
      return <p className="empty-state">{t('admin.staff.assignments.area.loading')}</p>;
    }
    if (!staff) {
      return <p className="empty-state empty-state--warn">{t('common.loadFailed')}</p>;
    }
    if (!canAssignResidents(staff)) {
      return (
        <p className="empty-state empty-state--warn">
          {t('admin.staff.assignments.residents.adminManagerWarn')}
        </p>
      );
    }
    if (!staff.staffProfile) {
      return (
        <p className="empty-state empty-state--warn">{t('admin.staff.assignments.residents.noProfileWarn')}</p>
      );
    }
    if (isStaffOnLeaveForAssignment(staff)) {
      return (
        <p className="empty-state empty-state--warn">
          {t('admin.staff.assignments.residents.onLeaveWarn')}
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

        <ShiftDetailPanel
          summary={staff.shiftSummary}
          assignmentDate={assignmentDate}
          displayNow={displayNow}
        />

        <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12, lineHeight: 1.45 }}>
          {residentFilterMode === 'rooms'
            ? t('admin.staff.assignments.residents.filterRoomsHint')
            : residentFilterMode === 'floors'
              ? t('admin.staff.assignments.residents.filterFloorsHint')
              : t('admin.staff.assignments.residents.filterDefaultHint')}
          {' '}
          {t('admin.staff.assignments.residents.clearAllHint')}
        </p>

        {residentHint && (
          <p className="field-hint field-hint--warn" style={{ marginBottom: 10 }}>
            {residentHint}
          </p>
        )}

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>{t('admin.staff.assignments.residents.searchLabel')}</label>
          <input
            type="search"
            value={residentSearch}
            onChange={(e) => setResidentSearch(e.target.value)}
            placeholder={t('admin.staff.assignments.residents.searchPlaceholder')}
            disabled={loadingResidents || !residentOptions.length}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>
            {t('admin.staff.assignments.residents.selectResidents', { count: selectedResidentIds.length })}
          </label>
          {loadingResidents ? (
            <p className="field-hint">{t('admin.staff.assignments.residents.loadingResidents')}</p>
          ) : (
            <div className="area-multi-select resident-picker">
              {filteredResidents.length === 0 && !residentHint && (
                <p className="field-hint">{t('admin.staff.assignments.residents.noMatchingResidents')}</p>
              )}
              {filteredResidents.map((r) => (
                <label key={r._id} className="area-multi-select__item">
                  <input
                    type="checkbox"
                    checked={selectedResidentIds.includes(String(r._id))}
                    onChange={() => toggleResident(r._id)}
                  />
                  <span>{residentPickerLabel(r, t)}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn btn--primary"
          onClick={handleSave}
          disabled={saving || loadingResidents}
        >
          {saving ? t('common.saving') : t('admin.staff.assignments.residents.saveResidents')}
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
