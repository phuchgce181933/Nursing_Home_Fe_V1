import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, Plus, Edit3, Trash2, Filter, CalendarDays, AlertTriangle, Eye, X } from 'lucide-react';
import activityService from '../../services/activity.service';
import authService from '../../services/auth.service';
import residentService from '../../services/resident.service';
import medicalRecordService from '../../services/medicalRecord.service';
import { useToast } from '../../hooks/useToast';
import BulkEditActivityModal from '../../components/admin/BulkEditActivityModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import '../../styles/admin/AdminAdmissionRequestsPage.css';
import '../../styles/admin/ConfirmModal.css';

const STATUS_OPTIONS = [
  { value: '', i18nKey: 'adminActivities.statusAll' },
  { value: 'draft', i18nKey: 'adminActivities.statusDraft' },
  { value: 'scheduled', i18nKey: 'adminActivities.statusScheduled' },
  { value: 'ongoing', i18nKey: 'adminActivities.statusOngoing' },
  { value: 'completed', i18nKey: 'adminActivities.statusCompleted' },
  { value: 'cancelled', i18nKey: 'adminActivities.statusCancelled' },
];

// Statuses that cannot be deleted (BE enforces the same rule).
const NON_DELETABLE_STATUSES = ['completed', 'ongoing'];
// Statuses that cannot be edited (single edit + bulk edit) on BE.
const NON_EDITABLE_STATUSES = ['completed', 'ongoing'];
// Bulk status change can only target draft / scheduled.
const BULK_STATUS_TARGET_OPTIONS = STATUS_OPTIONS.filter(
  (item) => item.value === 'draft' || item.value === 'scheduled',
);

const getActivityStartMs = (activity) => {
  const raw = activity?.scheduledAt || activity?.startAt;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? null : ms;
};

const isActivityInPast = (activity) => {
  const ms = getActivityStartMs(activity);
  return ms != null && ms < Date.now();
};

const isActivityLocked = (activity) =>
  NON_EDITABLE_STATUSES.includes(String(activity?.status || '').toLowerCase()) || isActivityInPast(activity);

const isActivityDeletable = (activity) =>
  !NON_DELETABLE_STATUSES.includes(String(activity?.status || '').toLowerCase());

const getStatusOptionsForForm = (currentStatus, isEditing = false) => {
  // Create flow: only draft / scheduled are valid initial statuses (BE enforces).
  // Edit flow: keep the current value visible, but block 'ongoing' (auto-managed).
  if (!isEditing) {
    return STATUS_OPTIONS.filter((item) => !item.value || ['draft', 'scheduled'].includes(item.value));
  }
  if (currentStatus === 'ongoing') {
    return STATUS_OPTIONS;
  }
  return STATUS_OPTIONS.filter((item) => item.value !== 'ongoing');
};

const toInputDateTimeLocal = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const tzOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - tzOffset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const formatActivityDateRange = (activity) => {
  const start = activity?.startAt || activity?.scheduledAt;
  const end = activity?.endAt || activity?.scheduledAt || activity?.startAt;
  if (!start) return '-';

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (end && new Date(end).getTime() !== new Date(start).getTime()) {
    return `${formatDate(start)} → ${formatDate(end)}`;
  }

  return formatDate(start);
};

const toIsoString = (localDateTime) => {
  if (!localDateTime) return '';
  return new Date(localDateTime).toISOString();
};

const getAutoDurationMinutes = (startAt, endAt) => {
  if (!startAt || !endAt) return null;
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;
  return Math.round(diffMs / (1000 * 60));
};

const formatDurationLabel = (durationMinutes, t) => {
  const totalMinutes = Number(durationMinutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '';

  const totalDays = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  const parts = [];
  if (totalDays > 0) parts.push(t ? t('adminActivities.durationDays', { count: totalDays }) : `${totalDays} ngày`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}p`);

  return parts.join(' ');
};

const toDisplayText = (value, fallback = '') => {
  if (typeof value === 'function') {
    console.debug('[AdminActivities] function value blocked from React child', { valueName: value.name || '(anonymous)' });
    return fallback;
  }
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return fallback;
};

const findFunctionPaths = (value, path = 'activity', seen = new Set()) => {
  if (!value || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  const paths = [];
  Object.entries(value).forEach(([key, child]) => {
    const childPath = `${path}.${key}`;
    if (typeof child === 'function') paths.push(childPath);
    else if (child && typeof child === 'object') paths.push(...findFunctionPaths(child, childPath, seen));
  });
  return paths;
};

const getMinDateTimeLocal = () => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset();
  const localNow = new Date(now.getTime() - tzOffset * 60000);
  return localNow.toISOString().slice(0, 16);
};

const ACTIVITY_CATEGORY_OPTIONS = [
  { value: 'Hoạt động chăm sóc cá nhân hằng ngày', i18nKey: 'adminActivities.categoryPersonalCare' },
  { value: 'Hoạt động chăm sóc sức khỏe', i18nKey: 'adminActivities.categoryHealthCare' },
  { value: 'Hoạt động ăn uống - dinh dưỡng', i18nKey: 'adminActivities.categoryNutrition' },
  { value: 'Hoạt động thể chất - phục hồi chức năng', i18nKey: 'adminActivities.categoryPhysical' },
  { value: 'Hoạt động giải trí', i18nKey: 'adminActivities.categoryEntertainment' },
  { value: 'Hoạt động kích thích nhận thức', i18nKey: 'adminActivities.categoryCognitive' },
  { value: 'Hoạt động xã hội - giao lưu', i18nKey: 'adminActivities.categorySocial' },
  { value: 'Hoạt động tâm lý - tinh thần', i18nKey: 'adminActivities.categoryPsychological' },
  { value: 'Hoạt động sự kiện đặc biệt', i18nKey: 'adminActivities.categorySpecialEvent' },
  { value: 'Hoạt động với gia đình', i18nKey: 'adminActivities.categoryFamily' },
  { value: 'Hoạt động quản lý nội bộ', i18nKey: 'adminActivities.categoryInternalManagement' },
  { value: 'Hoạt động xử lý sự cố', i18nKey: 'adminActivities.categoryIncident' },
  { value: 'Khác', i18nKey: 'adminActivities.categoryOther' },
];

const isActivityStaff = (staff) => {
  if (!staff || !staff.role) return false;
  const role = String(staff.role).toLowerCase();
  return role.includes('nurse')
    || role.includes('y tá')
    || role.includes('điều dưỡng')
    || role.includes('caregiver')
    || role.includes('hộ lý')
    || role.includes('doctor')
    || role.includes('bác sĩ');
};

export default function AdminActivitiesPage() {
  const { t: translate } = useTranslation();
  const t = useCallback((...args) => toDisplayText(translate(...args), ''), [translate]);
  const { showToast } = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ search: '', status: '', category: '', from: '', to: '' });
  const [bulkStatus, setBulkStatus] = useState('scheduled');

  const [residents, setResidents] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [participantSearch, setParticipantSearch] = useState('');
  const [residentsAbnormalStatus, setResidentsAbnormalStatus] = useState({});
  const [activitiesAbnormalParticipants, setActivitiesAbnormalParticipants] = useState({});

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [detailActivity, setDetailActivity] = useState(null);
  const [bulkEditActivity, setBulkEditActivity] = useState(null);
  const [bulkEditForm, setBulkEditForm] = useState({
    title: '',
    category: '',
    categoryOther: '',
    location: '',
    organizerStaffIds: [],
    supportStaffIds: [],
    participantResidentIds: [],
    status: '',
  });
  const [bulkEditError, setBulkEditError] = useState(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: '',
    categoryOther: '',
    description: '',
    startAt: '',
    endAt: '',
    durationMinutes: '',
    dailyDurationMinutes: '30',
    location: '',
    organizerStaffIds: [],
    supportStaffIds: [],
    participantResidentIds: [],
    status: 'draft',
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Confirm modal state — replaces window.confirm() for delete / bulk actions.
  const [confirmModal, setConfirmModal] = useState(null);
  // confirmModal shape: { tone, title, message, details, confirmLabel, cancelLabel, busy, run }

  const closeConfirmModal = () => {
    setConfirmModal((prev) => (prev ? { ...prev, busy: false } : prev));
    setConfirmModal(null);
  };

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Convert date-only inputs (YYYY-MM-DD) to full ISO at day boundaries so the
      // BE can apply timezone-aware comparisons.
      const dateOnlyToIso = (value, endOfDay) => {
        if (!value) return undefined;
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return endOfDay
            ? `${value}T23:59:59.999+07:00`
            : `${value}T00:00:00+07:00`;
        }
        return value;
      };
      const params = {
        page,
        limit,
        search: appliedFilters.search || undefined,
        status: appliedFilters.status || undefined,
        category: appliedFilters.category || undefined,
        from: dateOnlyToIso(appliedFilters.from, false),
        to: dateOnlyToIso(appliedFilters.to, true),
      };
      const res = await activityService.getActivityList(params);
      setActivities(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error('Fetch activities failed:', err);
      setError(err.response?.data?.message || t('adminActivities.errLoadActivities'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters, t]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (!selectedActivityId) {
      setDetailActivity(null);
      return;
    }
    const activity = activities.find((a) => a._id === selectedActivityId);
    if (activity) {
      console.debug('[AdminActivities] detail from list', {
        id: selectedActivityId,
        functionPaths: findFunctionPaths(activity),
        fieldTypes: Object.fromEntries(Object.entries(activity).map(([key, value]) => [key, typeof value])),
      });
      setDetailActivity(activity);
    } else {
      activityService.getActivityById(selectedActivityId).then((data) => {
        const detail = data?.data && typeof data.data === 'object' ? data.data : data;
        console.debug('[AdminActivities] detail from API', {
          raw: data,
          functionPaths: findFunctionPaths(detail),
          fieldTypes: detail && typeof detail === 'object'
            ? Object.fromEntries(Object.entries(detail).map(([key, value]) => [key, typeof value]))
            : typeof detail,
        });
        setDetailActivity(detail);
      }).catch((err) => {
        console.error('Failed to fetch activity detail:', err);
        setDetailActivity(null);
      });
    }
  }, [selectedActivityId, activities]);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        const [residentResponse, staffResponse] = await Promise.all([
          residentService.getResidentList({ page: 1, limit: 200 }),
          authService.getStaffAccounts({ page: 1, limit: 500 }),
        ]);

        if (!active) return;

        setResidents(residentResponse?.data || []);
        setStaffOptions(staffResponse?.data || []);
      } catch (err) {
        console.error('Failed to load options:', err);
      } finally {
        if (active) setOptionsLoading(false);
      }
    };

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  // ─── Load abnormal status for all residents ───
  useEffect(() => {
    let active = true;
    const loadAbnormalStatus = async () => {
      try {
        const statusMap = {};
        const results = await Promise.allSettled(
          residents.map(async (resident) => {
            try {
              const latestRecord = await medicalRecordService.getLatestVitals(resident._id);
              const isAbnormal = latestRecord?.abnormalFlag === true;
              return { id: resident._id, isAbnormal };
            } catch (err) {
              console.error(`✗ Failed to load health status for resident ${resident.fullName} (${resident._id}):`, err.message);
              return { id: resident._id, isAbnormal: false };
            }
          })
        );

        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            statusMap[result.value.id] = result.value.isAbnormal;
          }
        });

        if (active) {
          setResidentsAbnormalStatus(statusMap);
        }
      } catch (err) {
        console.error('❌ Failed to load abnormal status:', err);
      }
    };

    if (residents.length > 0) {
      loadAbnormalStatus();
    }

    return () => {
      active = false;
    };
  }, [residents]);

  // ─── Check abnormal participants for each activity ───
  useEffect(() => {
    let active = true;
    const checkActivitiesAbnormal = async () => {
      try {
        const abnormalMap = {};
        for (const activity of activities) {
          const participantIds = activity.participantResidentIds || [];
          const abnormalCount = participantIds.filter((id) => residentsAbnormalStatus[id]).length;
          abnormalMap[activity._id] = abnormalCount;
          if (abnormalCount > 0) {
          }
        }

        if (active) {
          setActivitiesAbnormalParticipants(abnormalMap);
        }
      } catch (err) {
        console.error('❌ Failed to check activities abnormal status:', err);
      }
    };

    if (activities.length > 0 && Object.keys(residentsAbnormalStatus).length > 0) {
      checkActivitiesAbnormal();
    }

    return () => {
      active = false;
    };
  }, [activities, residentsAbnormalStatus]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      category: '',
      categoryOther: '',
      description: '',
      startAt: '',
      endAt: '',
      durationMinutes: '',
      dailyDurationMinutes: '30',
      location: '',
      organizerStaffIds: [],
      supportStaffIds: [],
      participantResidentIds: [],
      status: 'draft',
    });
    setParticipantSearch('');
    setFormError(null);
  };

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ search, status, category, from, to });
  };

  // Auto-apply on change so filters feel reactive, like the user expects.
  // `search` is debounced; the rest apply immediately.
  const searchDebounceRef = useRef(null);
  useEffect(() => {
    const trimmedSearch = search;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      setAppliedFilters((prev) => {
        if (prev.search === trimmedSearch && prev.status === status
          && prev.category === category && prev.from === from && prev.to === to) {
          return prev;
        }
        return { search: trimmedSearch, status, category, from, to };
      });
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, category, from, to]);

  const toggleParticipant = (residentId) => {
    setForm((prevForm) => {
      const selected = Array.isArray(prevForm.participantResidentIds)
        ? [...prevForm.participantResidentIds]
        : [];
      const index = selected.indexOf(residentId);
      if (index >= 0) {
        selected.splice(index, 1);
      } else {
        selected.push(residentId);
      }
      return { ...prevForm, participantResidentIds: selected };
    });
  };

  const toggleAllResidents = () => {
    setForm((prevForm) => {
      const selected = Array.isArray(prevForm.participantResidentIds)
        ? prevForm.participantResidentIds.map((id) => String(id))
        : [];
      const residentIds = residents
        .map((resident) => (resident?._id ? String(resident._id) : ''))
        .filter(Boolean);

      if (residentIds.length === 0) {
        return prevForm;
      }

      const allSelected = residentIds.every((residentId) => selected.includes(residentId));
      if (allSelected) {
        return {
          ...prevForm,
          participantResidentIds: selected.filter((residentId) => !residentIds.includes(residentId)),
        };
      }

      const nextSelection = Array.from(new Set([...selected, ...residentIds]));
      return { ...prevForm, participantResidentIds: nextSelection };
    });
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setCategory('');
    setFrom('');
    setTo('');
    setPage(1);
    setAppliedFilters({ search: '', status: '', category: '', from: '', to: '' });
  };

  const handleEdit = (activity) => {
    setEditingId(activity?._id || activity?.id || null);
    setIsCreating(true);
    setForm({
      title: activity.title || '',
      category: activity.category && !ACTIVITY_CATEGORY_OPTIONS.some((opt) => opt.value === activity.category) ? 'Khác' : (activity.category || ''),
      categoryOther: activity.category && !ACTIVITY_CATEGORY_OPTIONS.includes(activity.category) ? activity.category : '',
      description: activity.description || '',
      startAt: toInputDateTimeLocal(activity.startAt || activity.scheduledAt),
      endAt: toInputDateTimeLocal(activity.endAt || activity.startAt || activity.scheduledAt),
      durationMinutes: activity.durationMinutes || getAutoDurationMinutes(activity.startAt || activity.scheduledAt, activity.endAt || activity.startAt || activity.scheduledAt) || '',
      dailyDurationMinutes: activity.dailyDurationMinutes || '30',
      location: activity.location || '',
      organizerStaffIds: Array.isArray(activity.organizerStaffIds)
        ? activity.organizerStaffIds.map((staff) => staff?._id || staff).filter(Boolean)
        : (activity.organizerStaffId ? [activity.organizerStaffId?._id || activity.organizerStaffId] : []),
      supportStaffIds: Array.isArray(activity.supportStaffIds)
        ? activity.supportStaffIds.map((staff) => staff?._id || staff).filter(Boolean)
        : (activity.supportStaffId ? [activity.supportStaffId?._id || activity.supportStaffId] : []),
      participantResidentIds: Array.isArray(activity.participantResidentIds)
        ? activity.participantResidentIds.map((id) => id.toString())
        : [],
      status: activity.status || 'draft',
    });
  };

  const handleBulkEdit = (activity) => {
    setBulkEditActivity(activity);
    setBulkEditForm({
      title: activity.title || '',
      category: activity.category && !ACTIVITY_CATEGORY_OPTIONS.some((opt) => opt.value === activity.category) ? 'Khác' : (activity.category || ''),
      categoryOther: activity.category && !ACTIVITY_CATEGORY_OPTIONS.includes(activity.category) ? activity.category : '',
      location: activity.location || '',
      organizerStaffIds: Array.isArray(activity.organizerStaffIds)
        ? activity.organizerStaffIds.map((staff) => staff?._id || staff).filter(Boolean)
        : (activity.organizerStaffId ? [activity.organizerStaffId?._id || activity.organizerStaffId] : []),
      supportStaffIds: Array.isArray(activity.supportStaffIds)
        ? activity.supportStaffIds.map((staff) => staff?._id || staff).filter(Boolean)
        : (activity.supportStaffId ? [activity.supportStaffId?._id || activity.supportStaffId] : []),
      participantResidentIds: Array.isArray(activity.participantResidentIds)
        ? activity.participantResidentIds.map((id) => id.toString())
        : [],
      status: activity.status || '',
    });
    setBulkEditError(null);
  };

  const handleBulkSave = async () => {
    const { title, category, categoryOther, location, organizerStaffIds, supportStaffIds, participantResidentIds, status } = bulkEditForm;
    const updateSeries = {};

    if (title !== (bulkEditActivity?.title || '')) updateSeries.title = title;
    if (category || categoryOther) {
      updateSeries.category = category === 'Khác' ? categoryOther : category;
    }
    if (location !== (bulkEditActivity?.location || '')) updateSeries.location = location;
    if (JSON.stringify(organizerStaffIds.sort()) !== JSON.stringify([...(bulkEditActivity?.organizerStaffIds || []).map((s) => s?._id || s).sort()])) {
      updateSeries.organizerStaffIds = organizerStaffIds;
    }
    if (JSON.stringify(supportStaffIds.sort()) !== JSON.stringify([...(bulkEditActivity?.supportStaffIds || []).map((s) => s?._id || s).sort()])) {
      updateSeries.supportStaffIds = supportStaffIds;
    }
    if (JSON.stringify(participantResidentIds.sort()) !== JSON.stringify([...(bulkEditActivity?.participantResidentIds || []).map((id) => String(id)).sort()])) {
      updateSeries.participantResidentIds = participantResidentIds;
    }
    if (status && status !== (bulkEditActivity?.status || '')) updateSeries.status = status;

    if (Object.keys(updateSeries).length === 0) {
      setBulkEditError(t('adminActivities.bulkNoChange'));
      return;
    }

    setBulkSubmitting(true);
    try {
      await activityService.bulkUpdateActivities(bulkEditActivity._id, updateSeries);
      setBulkEditActivity(null);
      fetchActivities();
    } catch (err) {
      setBulkEditError(err.response?.data?.message || t('adminActivities.bulkSaveFailed'));
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleDelete = (activityId) => {
    setConfirmModal({
      tone: 'danger',
      title: t('adminActivities.confirmDeleteTitle', { defaultValue: 'Xóa hoạt động?' }),
      message: t('adminActivities.confirmDeleteActivity'),
      details: t('adminActivities.confirmDeleteDetails', { defaultValue: 'Hành động này không thể hoàn tác.' }),
      confirmLabel: t('adminActivities.btnDeleteConfirm', { defaultValue: 'Xóa' }),
      cancelLabel: t('adminActivities.btnCancelConfirm', { defaultValue: 'Hủy' }),
      busy: false,
      run: async () => {
        setConfirmModal((prev) => ({ ...prev, busy: true }));
        try {
          setLoading(true);
          await activityService.deleteActivity(activityId);
          await fetchActivities();
        } catch (err) {
          console.error('Delete failed:', err);
          showToast(err.response?.data?.message || t('adminActivities.errDeleteActivity'), 'error');
          setConfirmModal((prev) => ({ ...prev, busy: false }));
          throw err;
        } finally {
          setLoading(false);
        }
        closeConfirmModal();
      },
    });
  };

  const getParticipantDisplay = (activity) => {
    const names = (activity.participantResidentIds || [])
      .map((residentId) => {
        const resident = residents.find((item) => item._id === residentId);
        if (!resident) return null;
        return toDisplayText(resident.fullName || resident.residentCode, t('adminActivities.residentFallback'));
      })
      .filter(Boolean);

    if (names.length === 0) return t('adminActivities.zeroResidents');
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  };

  const detailText = (...args) => toDisplayText(t(...args), '-');

  const getReferenceId = (value) => {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    return value?._id || value?.id || value?.userId?._id || value?.userId?.id || '';
  };

  const getDetailStaffNames = (activity, pluralField, singularField) => {
    const references = Array.isArray(activity?.[pluralField])
      ? activity[pluralField]
      : activity?.[singularField]
        ? [activity[singularField]]
        : [];
    return references.map((reference) => {
      const referenceId = getReferenceId(reference);
      const staff = staffOptions.find((item) => getReferenceId(item) === referenceId);
      return toDisplayText(
        reference?.fullName || reference?.userId?.fullName || reference?.email || reference?.userId?.email
          || staff?.fullName || staff?.email,
        '',
      );
    }).filter(Boolean).join(', ') || '-';
  };

  const getDetailResidentNames = (activity) => {
    const references = Array.isArray(activity?.participantResidentIds) ? activity.participantResidentIds : [];
    return references.map((reference) => {
      const referenceId = getReferenceId(reference);
      const resident = residents.find((item) => getReferenceId(item) === referenceId);
      return toDisplayText(reference?.fullName || reference?.residentCode || resident?.fullName || resident?.residentCode, '');
    }).filter(Boolean).join(', ') || '-';
  };

  const handleStatusChange = async (activity, newStatus) => {
    try {
      setLoading(true);
      await activityService.updateActivityStatus(activity._id, newStatus);
      fetchActivities();
    } catch (err) {
      console.error('Status update failed:', err);
      showToast(err.response?.data?.message || t('adminActivities.errUpdateStatus'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const openBulkDeleteConfirm = () => {
    const hasFilter = appliedFilters.search || appliedFilters.status || appliedFilters.category || appliedFilters.from || appliedFilters.to;
    const targetLabel = hasFilter
      ? t('adminActivities.bulkTargetFilter')
      : t('adminActivities.bulkTargetAll');

    setConfirmModal({
      tone: 'danger',
      title: t('adminActivities.confirmBulkDeleteTitle', { defaultValue: 'Xóa nhiều hoạt động?' }),
      message: t('adminActivities.confirmBulkDelete', { target: targetLabel }),
      details: t('adminActivities.confirmBulkDeleteDetails', { defaultValue: 'Toàn bộ hoạt động phù hợp với bộ lọc hiện tại sẽ bị xóa vĩnh viễn.' }),
      confirmLabel: t('adminActivities.btnDeleteConfirm', { defaultValue: 'Xóa tất cả' }),
      cancelLabel: t('adminActivities.btnCancelConfirm', { defaultValue: 'Hủy' }),
      busy: false,
      run: async () => {
        setConfirmModal((prev) => ({ ...prev, busy: true }));
        try {
          setLoading(true);
          const filters = { ...appliedFilters };
          if (filters.status === '') delete filters.status;
          if (filters.category === '') delete filters.category;
          await activityService.bulkDeleteActivities(filters);
          await fetchActivities();
          showToast(t('adminActivities.successBulkDelete'), 'success');
        } catch (err) {
          console.error('Bulk delete failed:', err);
          showToast(err.response?.data?.message || t('adminActivities.errBulkDelete'), 'error');
          setConfirmModal((prev) => ({ ...prev, busy: false }));
          throw err;
        } finally {
          setLoading(false);
        }
        closeConfirmModal();
      },
    });
  };

  const handleBulkDelete = openBulkDeleteConfirm;

  const openBulkStatusConfirm = () => {
    if (!bulkStatus) return;

    const hasFilter = appliedFilters.search || appliedFilters.status || appliedFilters.category || appliedFilters.from || appliedFilters.to;
    const targetLabel = hasFilter
      ? t('adminActivities.bulkTargetFilter')
      : t('adminActivities.bulkTargetAll');

    const foundOption = STATUS_OPTIONS.find((item) => item.value === bulkStatus);
    const statusLabel = foundOption ? t(foundOption.i18nKey) : bulkStatus;

    setConfirmModal({
      tone: 'warning',
      title: t('adminActivities.confirmBulkStatusTitle', { defaultValue: 'Đổi trạng thái hàng loạt?' }),
      message: t('adminActivities.confirmBulkStatus', { target: targetLabel, status: statusLabel }),
      details: t('adminActivities.confirmBulkStatusDetails', { defaultValue: 'Các hoạt động phù hợp với bộ lọc hiện tại sẽ được chuyển sang trạng thái đã chọn.' }),
      confirmLabel: t('adminActivities.confirmApplyLabel', { defaultValue: 'Đồng ý' }),
      cancelLabel: t('adminActivities.btnCancelConfirm', { defaultValue: 'Hủy' }),
      busy: false,
      run: async () => {
        setConfirmModal((prev) => ({ ...prev, busy: true }));
        try {
          setLoading(true);
          const filters = { ...appliedFilters };
          if (filters.status === '') delete filters.status;
          if (filters.category === '') delete filters.category;
          await activityService.bulkUpdateActivityStatus({ ...filters, status: bulkStatus });
          await fetchActivities();
          showToast(t('adminActivities.successBulkStatus'), 'success');
        } catch (err) {
          console.error('Bulk status update failed:', err);
          showToast(err.response?.data?.message || t('adminActivities.errBulkStatus'), 'error');
          setConfirmModal((prev) => ({ ...prev, busy: false }));
          throw err;
        } finally {
          setLoading(false);
        }
        closeConfirmModal();
      },
    });
  };

  const handleBulkStatusChange = openBulkStatusConfirm;

  const toggleStaffSelection = (field, staffId) => {
    setForm((prevForm) => {
      const currentIds = Array.isArray(prevForm[field]) ? [...prevForm[field]] : [];
      const isAdding = !currentIds.includes(staffId);
      const nextIds = isAdding ? [...currentIds, staffId] : currentIds.filter((id) => id !== staffId);
      const nextForm = { ...prevForm, [field]: nextIds };

      // Keep organizer and support sets disjoint
      if (field === 'organizerStaffIds' && isAdding && Array.isArray(nextForm.supportStaffIds) && nextForm.supportStaffIds.includes(staffId)) {
        nextForm.supportStaffIds = nextForm.supportStaffIds.filter((id) => id !== staffId);
      }
      if (field === 'supportStaffIds' && isAdding && Array.isArray(nextForm.organizerStaffIds) && nextForm.organizerStaffIds.includes(staffId)) {
        nextForm.organizerStaffIds = nextForm.organizerStaffIds.filter((id) => id !== staffId);
      }

      return nextForm;
    });
  };

  const toggleRoleGroupSelection = (field, roleKeywords) => {
    const roleStaffIds = staffOptions
      .filter((staff) => isActivityStaff(staff) && roleKeywords.some((keyword) => String(staff.role || '').toLowerCase().includes(keyword)))
      .map((staff) => staff._id)
      .filter(Boolean);

    if (roleStaffIds.length === 0) return;

    setForm((prevForm) => {
      const currentIds = Array.isArray(prevForm[field]) ? [...prevForm[field]] : [];
      const allSelected = roleStaffIds.every((id) => currentIds.includes(id));
      const nextIds = allSelected
        ? currentIds.filter((id) => !roleStaffIds.includes(id))
        : [...new Set([...currentIds, ...roleStaffIds])];
      return { ...prevForm, [field]: nextIds };
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFormError(null);
    if (!form.title.trim()) {
      setFormError(t('adminActivities.validTitle'));
      return;
    }
    if (!form.startAt) {
      setFormError(t('adminActivities.validStartAt'));
      return;
    }
    if (!form.location?.trim()) {
      setFormError(t('adminActivities.validLocation'));
      return;
    }
    if (!form.category?.trim()) {
      setFormError(t('adminActivities.validCategory'));
      return;
    }
    if (form.category === 'Khác' && !form.categoryOther?.trim()) {
      setFormError(t('adminActivities.validCategoryOther'));
      return;
    }

    const startDate = new Date(form.startAt);
    const endDate = form.endAt ? new Date(form.endAt) : startDate;
    if (Number.isNaN(startDate.getTime())) {
      setFormError(t('adminActivities.validStartDateInvalid'));
      return;
    }
    if (editingId == null && startDate < new Date()) {
      setFormError(t('adminActivities.validStartDatePast'));
      return;
    }
    if (form.endAt && endDate <= startDate) {
      setFormError(t('adminActivities.validEndAfterStart'));
      return;
    }

    const computedDurationMinutes = getAutoDurationMinutes(form.startAt, form.endAt || form.startAt);
    if (computedDurationMinutes === null) {
      setFormError(t('adminActivities.validDateRange'));
      return;
    }
    if (computedDurationMinutes <= 0) {
      setFormError(t('adminActivities.validEndAfterStart'));
      return;
    }
    const dailyDuration = Number(form.dailyDurationMinutes) || 0;
    if (dailyDuration > 0 && computedDurationMinutes < dailyDuration) {
      setFormError(t('adminActivities.validDurationMinDaily'));
      return;
    }

    const organizerStaffIds = Array.isArray(form.organizerStaffIds)
      ? form.organizerStaffIds.filter(Boolean)
      : [];
    if (organizerStaffIds.length === 0) {
      setFormError(t('adminActivities.validOrganizerRequired'));
      return;
    }

    for (const organizerId of organizerStaffIds) {
      const organizer = staffOptions.find((s) => s._id === organizerId);
      if (!organizer || !isActivityStaff(organizer)) {
        setFormError(t('adminActivities.validOrganizerRole'));
        return;
      }
    }

    const supportStaffIds = Array.isArray(form.supportStaffIds)
      ? form.supportStaffIds.filter(Boolean)
      : [];
    for (const supportStaffId of supportStaffIds) {
      const supportStaff = staffOptions.find((s) => s._id === supportStaffId);
      if (!supportStaff || !isActivityStaff(supportStaff)) {
        setFormError(t('adminActivities.validSupportRole'));
        return;
      }
    }

    const payload = {
      title: form.title.trim(),
      category: (form.category === 'Khác' ? form.categoryOther : form.category).trim() || undefined,
      description: form.description.trim() || undefined,
      startAt: toIsoString(form.startAt),
      endAt: form.endAt ? toIsoString(form.endAt) : toIsoString(form.startAt),
      durationMinutes: computedDurationMinutes,
      dailyDurationMinutes: form.dailyDurationMinutes ? Number(form.dailyDurationMinutes) : 30,
      createRecurring: Boolean(form.endAt && new Date(form.endAt) > new Date(form.startAt) && new Date(form.endAt).getTime() - new Date(form.startAt).getTime() > 24 * 60 * 60 * 1000),
      location: form.location.trim() || undefined,
      organizerStaffIds: organizerStaffIds,
      organizerStaffId: organizerStaffIds[0] || undefined,
      supportStaffIds: supportStaffIds,
      supportStaffId: supportStaffIds[0] || undefined,
      participantResidentIds: Array.isArray(form.participantResidentIds)
        ? form.participantResidentIds.filter(Boolean)
        : [],
      ...(editingId && form.status === 'ongoing' ? {} : { status: form.status }),
    };

    try {
      setSubmitting(true);
      if (editingId) {
        await activityService.updateActivity(editingId, payload);
      } else {
        await activityService.createActivity(payload);
      }
      resetForm();
      setIsCreating(false);
      fetchActivities();
    } catch (err) {
      console.error('Submit activity failed:', err);
      setFormError(err.response?.data?.message || t('adminActivities.errSaveActivity'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div>
          <h1>
            <CalendarDays size={26} />
            {t('adminActivities.pageTitle')}
          </h1>
          <p>{t('adminActivities.pageSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setEditingId(null);
            setIsCreating((prev) => !prev);
          }}
          className="adm-btn-refresh"
        >
          <Plus size={16} />
          {isCreating ? t('adminActivities.btnCloseForm') : t('adminActivities.btnCreate')}
        </button>
      </div>

      <div className="adm-filter-panel" style={{ marginBottom: '16px' }}>
        <div className="flex items-end gap-3" style={{ marginBottom: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 120px', minWidth: 0 }}>
            <label className="text-sm font-semibold">{t('adminActivities.filterSearch')}</label>
            <div className="adm-filter-input-wrapper">
              <Search className="adm-filter-input-icon" size={14} />
              <input
                type="text"
                placeholder={t('adminActivities.filterSearchPlaceholder')}
                className="adm-filter-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ flex: '0 0 140px' }}>
            <label className="text-sm font-semibold">{t('adminActivities.filterStatus')}</label>
            <select
              className="adm-filter-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {t(item.i18nKey)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '0 0 160px' }}>
            <label className="text-sm font-semibold">{t('adminActivities.filterCategory')}</label>
            <select
              className="adm-filter-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t('adminActivities.filterCategoryAll', { defaultValue: '— Tất cả —' })}</option>
              {ACTIVITY_CATEGORY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{t(item.i18nKey)}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '0 0 140px' }}>
            <label className="text-sm font-semibold">{t('adminActivities.filterFrom')}</label>
            <input
              type="date"
              className="adm-filter-select"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div style={{ flex: '0 0 140px' }}>
            <label className="text-sm font-semibold">{t('adminActivities.filterTo')}</label>
            <input
              type="date"
              className="adm-filter-select"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-2" style={{ flexShrink: 0 }}>
            <button type="button" className="adm-btn-refresh" onClick={handleResetFilters}>
              <RefreshCw size={14} /> {t('adminActivities.btnReset')}
            </button>
            <button type="button" className="adm-btn-refresh" onClick={handleApplyFilters}>
              <Filter size={14} /> {t('adminActivities.btnApply')}
            </button>
          </div>
        </div>

        <div className="flex items-end gap-3" style={{ flexWrap: 'wrap' }}>
          <select
            className="adm-filter-select"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            style={{ minWidth: '180px' }}
            title={t('adminActivities.bulkStatusHint', { defaultValue: 'Chỉ áp dụng cho hoạt động trong tương lai và đang ở trạng thái nháp/đã lên lịch.' })}
          >
            {BULK_STATUS_TARGET_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {t(item.i18nKey)}
              </option>
            ))}
          </select>
          <button type="button" className="adm-btn-refresh" onClick={handleBulkStatusChange}>
            {t('adminActivities.btnBulkChangeStatus')}
          </button>
          <button type="button" className="adm-btn-refresh" onClick={handleBulkDelete}>
            <Trash2 size={14} /> {t('adminActivities.btnDeleteAll')}
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="adm-filter-panel" style={{ marginBottom: '28px' }}>
          <h2 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>
            {editingId ? t('adminActivities.formTitleEdit') : t('adminActivities.formTitleCreate')}
          </h2>
          <form onSubmit={handleSubmit} className="adm-activity-form-grid">
            <div className="adm-form-field">
              <label className="text-sm font-semibold">{t('adminActivities.fieldTitle')}</label>
              <input
                type="text"
                className="adm-filter-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">{t('adminActivities.fieldCategory')}</label>
              <select
                className="adm-filter-select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value, categoryOther: e.target.value === 'Khác' ? form.categoryOther : '' })}
              >
                <option value="">{t('adminActivities.fieldCategoryPlaceholder')}</option>
                {ACTIVITY_CATEGORY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{t(item.i18nKey)}</option>
                ))}
              </select>
              {form.category === 'Khác' && (
                <input
                  type="text"
                  className="adm-filter-input"
                  style={{ marginTop: '8px' }}
                  value={form.categoryOther}
                  onChange={(e) => setForm({ ...form, categoryOther: e.target.value })}
                  placeholder={t('adminActivities.fieldCategoryOtherPlaceholder')}
                />
              )}
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">{t('adminActivities.fieldStartAt')}</label>
              <input
                type="datetime-local"
                className="adm-filter-input"
                min={editingId ? undefined : getMinDateTimeLocal()}
                value={form.startAt}
                readOnly={Boolean(editingId)}
                onChange={(e) => {
                  const nextStart = e.target.value;
                  const computedMinutes = getAutoDurationMinutes(nextStart, form.endAt || nextStart);
                  setForm({ ...form, startAt: nextStart, durationMinutes: computedMinutes === null || computedMinutes <= 0 ? '' : computedMinutes });
                }}
              />
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">{t('adminActivities.fieldEndAt')}</label>
              <input
                type="datetime-local"
                className="adm-filter-input"
                min={form.startAt}
                value={form.endAt}
                readOnly={Boolean(editingId)}
                onChange={(e) => {
                  const nextEnd = e.target.value;
                  const computedMinutes = getAutoDurationMinutes(form.startAt, nextEnd || form.startAt);
                  setForm({ ...form, endAt: nextEnd, durationMinutes: computedMinutes === null || computedMinutes <= 0 ? '' : computedMinutes });
                }}
              />
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">{t('adminActivities.fieldDuration')}</label>
              <input
                type="text"
                className="adm-filter-input"
                value={formatDurationLabel(form.durationMinutes, t)}
                readOnly
                placeholder={t('adminActivities.fieldDurationPlaceholder')}
              />
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">{t('adminActivities.fieldDailyDuration')}</label>
              <input
                type="number"
                min="1"
                className="adm-filter-input"
                value={form.dailyDurationMinutes}
                onChange={(e) => setForm({ ...form, dailyDurationMinutes: e.target.value })}
                placeholder="30"
              />
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">{t('adminActivities.fieldLocation')}</label>
              <input
                type="text"
                className="adm-filter-input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="adm-form-field adm-form-field-full">
              <label className="text-sm font-semibold">{t('adminActivities.fieldOrganizerStaff')}</label>
              <div className="adm-participant-chips" style={{ marginBottom: '8px' }}>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={staffOptions.filter((staff) => isActivityStaff(staff) && String(staff.role || '').toLowerCase().includes('doctor') || String(staff.role || '').toLowerCase().includes('bác sĩ')).length > 0 && staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('doctor') || String(staff.role || '').toLowerCase().includes('bác sĩ'))).every((staff) => form.organizerStaffIds.includes(staff._id))}
                    onChange={() => toggleRoleGroupSelection('organizerStaffIds', ['doctor', 'bác sĩ'])}
                    style={{ marginRight: '6px' }}
                  />
                  {t('adminActivities.allDoctors')}
                </label>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('caregiver') || String(staff.role || '').toLowerCase().includes('hộ lý'))).length > 0 && staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('caregiver') || String(staff.role || '').toLowerCase().includes('hộ lý'))).every((staff) => form.organizerStaffIds.includes(staff._id))}
                    onChange={() => toggleRoleGroupSelection('organizerStaffIds', ['caregiver', 'hộ lý'])}
                    style={{ marginRight: '6px' }}
                  />
                  {t('adminActivities.allCaregivers')}
                </label>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('nurse') || String(staff.role || '').toLowerCase().includes('y tá') || String(staff.role || '').toLowerCase().includes('điều dưỡng'))).length > 0 && staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('nurse') || String(staff.role || '').toLowerCase().includes('y tá') || String(staff.role || '').toLowerCase().includes('điều dưỡng'))).every((staff) => form.organizerStaffIds.includes(staff._id))}
                    onChange={() => toggleRoleGroupSelection('organizerStaffIds', ['nurse', 'y tá', 'điều dưỡng'])}
                    style={{ marginRight: '6px' }}
                  />
                  {t('adminActivities.allNurses')}
                </label>
              </div>
              <div className="adm-participant-picker">
                {staffOptions.filter(isActivityStaff).map((staff) => {
                  const checked = form.organizerStaffIds.includes(staff._id);
                  return (
                    <label key={staff._id} className={`adm-participant-option${checked ? ' selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStaffSelection('organizerStaffIds', staff._id)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>
                        {toDisplayText(staff.fullName || staff.email, t('adminActivities.staffFallback'))} {staff.role ? `(${toDisplayText(staff.role)})` : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="adm-form-field adm-form-field-full">
              <label className="text-sm font-semibold">{t('adminActivities.fieldSupportStaff')}</label>
              <div className="adm-participant-chips" style={{ marginBottom: '8px' }}>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('doctor') || String(staff.role || '').toLowerCase().includes('bác sĩ'))).length > 0 && staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('doctor') || String(staff.role || '').toLowerCase().includes('bác sĩ'))).every((staff) => form.supportStaffIds.includes(staff._id))}
                    onChange={() => toggleRoleGroupSelection('supportStaffIds', ['doctor', 'bác sĩ'])}
                    style={{ marginRight: '6px' }}
                  />
                  {t('adminActivities.allDoctors')}
                </label>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('caregiver') || String(staff.role || '').toLowerCase().includes('hộ lý'))).length > 0 && staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('caregiver') || String(staff.role || '').toLowerCase().includes('hộ lý'))).every((staff) => form.supportStaffIds.includes(staff._id))}
                    onChange={() => toggleRoleGroupSelection('supportStaffIds', ['caregiver', 'hộ lý'])}
                    style={{ marginRight: '6px' }}
                  />
                  {t('adminActivities.allCaregivers')}
                </label>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('nurse') || String(staff.role || '').toLowerCase().includes('y tá') || String(staff.role || '').toLowerCase().includes('điều dưỡng'))).length > 0 && staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('nurse') || String(staff.role || '').toLowerCase().includes('y tá') || String(staff.role || '').toLowerCase().includes('điều dưỡng'))).every((staff) => form.supportStaffIds.includes(staff._id))}
                    onChange={() => toggleRoleGroupSelection('supportStaffIds', ['nurse', 'y tá', 'điều dưỡng'])}
                    style={{ marginRight: '6px' }}
                  />
                  {t('adminActivities.allNurses')}
                </label>
              </div>
              <div className="adm-participant-picker">
                {staffOptions.filter(isActivityStaff).filter((staff) => !form.organizerStaffIds.includes(staff._id)).map((staff) => {
                  const checked = form.supportStaffIds.includes(staff._id);
                  return (
                    <label key={staff._id} className={`adm-participant-option${checked ? ' selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStaffSelection('supportStaffIds', staff._id)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>
                        {toDisplayText(staff.fullName || staff.email, t('adminActivities.staffFallback'))} {staff.role ? `(${toDisplayText(staff.role)})` : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="adm-form-field adm-form-field-full">
              <label className="text-sm font-semibold">{t('adminActivities.fieldParticipants')}</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={residents.length > 0 && residents.every((resident) => form.participantResidentIds.includes(resident._id))}
                    onChange={toggleAllResidents}
                    style={{ marginRight: '6px' }}
                  />
                  {t('adminActivities.allResidents')}
                </label>
              </div>
              <input
                type="text"
                className="adm-filter-input"
                placeholder={t('adminActivities.searchResidentPlaceholder')}
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                disabled={optionsLoading}
                style={{ marginBottom: '8px' }}
              />
              <div className="adm-participant-chips">
                {residents
                  .filter((resident) => form.participantResidentIds.includes(resident._id))
                  .slice(0, 6)
                  .map((resident) => {
                    const label =
                      (resident.fullName || t('adminActivities.residentFallback')) +
                      (resident.residentCode ? ' (' + resident.residentCode + ')' : '');
                    return (
                      <button
                        type="button"
                        key={resident._id}
                        onClick={() => toggleParticipant(resident._id)}
                        className="adm-participant-chip"
                      >
                        {label}
                        ×
                      </button>
                    );
                  })}
                {form.participantResidentIds.length > 6 && (
                  <span className="adm-participant-chip adm-participant-chip-muted">
                    {t('adminActivities.moreOthers', { count: form.participantResidentIds.length - 6 })}
                  </span>
                )}
              </div>
              <div className="adm-participant-picker">
                {!optionsLoading && residents.filter((resident) => {
                  const searchText = participantSearch.trim().toLowerCase();
                  return (
                    !searchText ||
                    resident.fullName?.toLowerCase().includes(searchText) ||
                    resident.residentCode?.toLowerCase().includes(searchText)
                  );
                }).map((resident) => {
                  const selected = form.participantResidentIds.includes(resident._id);
                  const hasAbnormal = residentsAbnormalStatus[resident._id];
                  return (
                    <label
                      key={resident._id}
                      className={`adm-participant-option${selected ? ' selected' : ''}${hasAbnormal ? ' abnormal' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleParticipant(resident._id)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>
                        {toDisplayText(resident.fullName, t('adminActivities.residentUnnamed'))}{resident.residentCode ? ` (${toDisplayText(resident.residentCode)})` : ''}
                      </span>
                      {hasAbnormal && (
                        <span className="adm-abnormal-badge">
                          <AlertTriangle size={12} />
                          {t('adminActivities.badgeAbnormal')}
                        </span>
                      )}
                    </label>
                  );
                })}
                {!optionsLoading && residents.filter((resident) => {
                  const searchText = participantSearch.trim().toLowerCase();
                  return (
                    !searchText ||
                    resident.fullName?.toLowerCase().includes(searchText) ||
                    resident.residentCode?.toLowerCase().includes(searchText)
                  );
                }).length === 0 && (
                  <div className="adm-empty-state">{t('adminActivities.noResidentsFound')}</div>
                )}
                {optionsLoading && <div className="adm-empty-state">{t('adminActivities.loadingResidents')}</div>}
              </div>
              {(() => {
                const selectedAbnormalResidents = form.participantResidentIds
                  .map((id) => {
                    const resident = residents.find((r) => r._id === id);
                    return { resident, hasAbnormal: residentsAbnormalStatus[id] };
                  })
                  .filter((item) => item.hasAbnormal);

                return selectedAbnormalResidents.length > 0 ? (
                  <div className="adm-warning-box">
                    <AlertTriangle size={20} />
                    <div>
                      <strong>{t('adminActivities.warningAbnormalResidents')}</strong>
                      <div className="adm-warning-list">
                        {selectedAbnormalResidents.map((item) => (
                          <div key={item.resident._id}>
                            • {toDisplayText(item.resident.fullName, t('adminActivities.residentFallback'))} ({toDisplayText(item.resident.residentCode, '-')}) {t('adminActivities.monitorAfterActivity')}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">{t('adminActivities.fieldStatus')}</label>
              <select
                className="adm-filter-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {getStatusOptionsForForm(form.status, Boolean(editingId)).filter((item) => item.value).map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.i18nKey)}
                  </option>
                ))}
              </select>
            </div>
            <div className="adm-form-field adm-form-field-full">
              <label className="text-sm font-semibold">{t('adminActivities.fieldDescription')}</label>
              <textarea
                rows="3"
                className="adm-filter-input"
                style={{ resize: 'vertical' }}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            {typeof formError === 'string' && (
              <div className="adm-form-message adm-form-field-full">{formError}</div>
            )}
            <div className="adm-form-actions adm-form-field-full">
              <button type="button" className="adm-btn-refresh" onClick={() => { resetForm(); setIsCreating(false); }}>
                {t('adminActivities.btnCancel')}
              </button>
              <button type="submit" className="adm-btn-refresh" disabled={submitting}>
                {editingId ? t('adminActivities.btnSaveChanges') : t('adminActivities.btnCreate')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Activities abnormal summary */}
      {(() => {
        const totalAbnormal = Object.values(activitiesAbnormalParticipants).reduce((sum, count) => sum + count, 0);
        const activitiesWithAbnormal = Object.entries(activitiesAbnormalParticipants)
          .filter(([_, count]) => count > 0)
          .map(([activityId, count]) => {
            const activity = activities.find((a) => a._id === activityId);
            return { activity, count };
          });

        return totalAbnormal > 0 ? (
          <div
            style={{
              marginBottom: '18px',
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}
          >
            <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: '#991b1b' }}>
              <strong>{t('adminActivities.warningAbnormalActivities', { count: activitiesWithAbnormal.length })}</strong>
              <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.9 }}>
                {activitiesWithAbnormal.map(({ activity, count }) => (
                  <div key={activity._id}>
                    • <strong>{toDisplayText(activity.title, '-')}</strong> - {t('adminActivities.abnormalPatientCount', { count })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;
      })()}

      <div className="adm-table-card">
        <div className="adm-table-responsive">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('adminActivities.colTitle')}</th>
                <th>{t('adminActivities.colCategory')}</th>
                <th>{t('adminActivities.colScheduledAt')}</th>
                <th>{t('adminActivities.colStatus')}</th>
                <th>{t('adminActivities.colParticipants')}</th>
                <th>{t('adminActivities.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                    {t('adminActivities.loadingActivities')}
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                    {t('adminActivities.noActivitiesFound')}
                  </td>
                </tr>
              ) : (
                activities.map((activity) => {
                  const abnormalCount = activitiesAbnormalParticipants[activity._id] || 0;
                  return (
                    <tr key={activity._id} className="adm-table-row" style={abnormalCount > 0 ? { backgroundColor: '#fffbeb' } : {}}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {typeof activity.title === 'string' ? activity.title : String(activity.title || '')}
                          {abnormalCount > 0 && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                color: '#dc2626',
                                backgroundColor: '#fee2e2',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <AlertTriangle size={10} />
                              {t('adminActivities.abnormalCount', { count: abnormalCount })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{typeof activity.category === 'string' ? activity.category : '-'}</td>
                      <td>{formatActivityDateRange(activity)}</td>
                      <td>
                        {(() => {
                          const locked = isActivityLocked(activity);
                          const lockedTooltip = t('adminActivities.lockedActionTooltip', {
                            defaultValue: 'Hoạt động đã diễn ra hoặc đã ở trạng thái kết thúc.',
                          });
                          return (
                            <select
                              value={activity.status}
                              onChange={(e) => handleStatusChange(activity, e.target.value)}
                              disabled={locked}
                              title={locked ? lockedTooltip : ''}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '10px', borderColor: '#cbd5e1' }}
                            >
                              {STATUS_OPTIONS.filter((item) => item.value).map((item) => (
                                <option key={item.value} value={item.value}>
                                  {t(item.i18nKey)}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getParticipantDisplay(activity)}
                          {abnormalCount > 0 && (
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '11px',
                                color: '#dc2626',
                                backgroundColor: '#fecaca',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {abnormalCount} ⚠️
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const locked = isActivityLocked(activity);
                          const lockedTitle = t('adminActivities.lockedActionTooltip', {
                            defaultValue: 'Hoạt động đã diễn ra hoặc đã ở trạng thái kết thúc.',
                          });
                          return (
                            <>
                              <button
                                type="button"
                                className="adm-btn-refresh"
                                style={{ marginRight: '8px' }}
                                onClick={() => setSelectedActivityId(activity._id)}
                                title={t('adminActivities.btnViewDetail')}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                className="adm-btn-refresh"
                                style={{ marginRight: '8px' }}
                                onClick={() => handleEdit(activity)}
                                disabled={locked}
                                title={locked ? lockedTitle : t('adminActivities.btnEdit')}
                              >
                                <Edit3 size={14} />
                              </button>
                              {activity.seriesId && (
                                <button
                                  type="button"
                                  className="adm-btn-refresh"
                                  style={{ marginRight: '8px', background: '#7c3aed', color: '#fff', border: 'none' }}
                                  onClick={() => handleBulkEdit(activity)}
                                  disabled={locked}
                                  title={locked ? lockedTitle : t('adminActivities.btnEditSeries')}
                                >
                                  <Filter size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="adm-btn-refresh"
                                onClick={() => handleDelete(activity._id)}
                                disabled={!isActivityDeletable(activity)}
                                title={isActivityDeletable(activity)
                                  ? t('adminActivities.btnDelete')
                                  : t('adminActivities.deleteBlockedTooltip', {
                                      defaultValue: 'Không thể xóa hoạt động đã hoàn thành hoặc đang diễn ra.',
                                    })}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-header" style={{ marginTop: '18px', justifyContent: 'space-between' }}>
        <span>
          {t('adminActivities.paginationInfo', { page, totalPages, total })}
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="adm-btn-refresh"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          >
            {t('adminActivities.btnPrev')}
          </button>
          <button
            type="button"
            className="adm-btn-refresh"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          >
            {t('adminActivities.btnNext')}
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', marginTop: '16px' }}>{error}</div>}

      {/* ─── Activity Detail Modal ─── */}
      {false && selectedActivityId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'flex-end',
          zIndex: 1000
        }}>
          <div style={{
            width: '500px',
            height: '100%',
            backgroundColor: '#fff',
            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.3s ease-out',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{detailText('adminActivities.modalTitle')}</h2>
              <button
                type="button"
                onClick={() => setSelectedActivityId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {detailActivity && typeof detailActivity === 'object' ? (() => {
                const activity = detailActivity;
                const organizer = staffOptions.find((s) => s._id === activity.organizerStaffId);
                const participantsList = (Array.isArray(activity.participantResidentIds) ? activity.participantResidentIds : []).map((resId) => {
                  const resident = residents.find((r) => r._id === resId);
                  return resident;
                }).filter(Boolean);

                return (
                  <>
                    {/* Title and Status */}
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700 }}>
                        {typeof activity.title === 'string' ? activity.title : String(activity.title || '')}
                      </h3>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: activity.status === 'completed' ? '#dcfce7' : activity.status === 'cancelled' ? '#fee2e2' : '#dbeafe',
                        color: activity.status === 'completed' ? '#166534' : activity.status === 'cancelled' ? '#b91c1c' : '#0c4a6e',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>
                        {(() => {
                          const found = STATUS_OPTIONS.find((s) => s.value === activity.status);
                          const translated = found ? t(found.i18nKey) : activity.status;
                          return toDisplayText(translated, '-');
                        })()}
                      </span>
                    </div>

                    {/* Description */}
                    {activity.description && typeof activity.description === 'string' && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>{detailText('adminActivities.detailDescription')}</label>
                        <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>{activity.description}</p>
                      </div>
                    )}

                    {/* Category */}
                    {activity.category && typeof activity.category === 'string' && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>{detailText('adminActivities.detailCategory')}</label>
                        <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{activity.category}</p>
                      </div>
                    )}

                    {/* Date Range */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>{detailText('adminActivities.detailDateRange')}</label>
                      <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{formatActivityDateRange(activity)}</p>
                    </div>

                    {/* Duration */}
                    {activity.durationMinutes && typeof activity.durationMinutes === 'number' && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>{detailText('adminActivities.detailDuration')}</label>
                        <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{formatDurationLabel(activity.durationMinutes, t)}</p>
                      </div>
                    )}

                    {/* Location */}
                    {activity.location && typeof activity.location === 'string' && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>{detailText('adminActivities.detailLocation')}</label>
                        <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{activity.location}</p>
                      </div>
                    )}

                    {/* Organizer */}
                    {organizer && typeof organizer === 'object' && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>{detailText('adminActivities.detailOrganizer')}</label>
                        <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>
                          {toDisplayText(organizer.fullName || organizer.email)} {organizer.role ? `(${toDisplayText(organizer.role)})` : ''}
                        </p>
                      </div>
                    )}

                    {/* Participants */}
                    {Array.isArray(participantsList) && participantsList.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>{detailText('adminActivities.detailParticipants', { count: participantsList.length })}</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {participantsList.map((resident) => {
                            if (!resident || typeof resident !== 'object') return null;
                            const isAbnormal = residentsAbnormalStatus[resident._id];
                            return (
                              <div key={resident._id} style={{
                                padding: '8px 12px',
                                backgroundColor: isAbnormal ? '#fef2f2' : '#f8fafc',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '14px',
                              }}>
                                <span>{toDisplayText(resident?.fullName || resident?.residentCode, '-')}</span>
                                {isAbnormal && (
                                  <span style={{
                                    fontSize: '11px',
                                    color: '#dc2626',
                                    backgroundColor: '#fecaca',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                  }}>
                                    ⚠️ {detailText('adminActivities.badgeAbnormal')}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              }) : null}
            </div>
          </div>
        </div>
      )}

      {selectedActivityId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'flex-end',
          zIndex: 1000,
        }}>
          <div style={{ width: '500px', maxWidth: '100%', height: '100%', backgroundColor: '#fff', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{detailText('adminActivities.modalTitle')}</h2>
              <button type="button" onClick={() => setSelectedActivityId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              {detailActivity && typeof detailActivity === 'object' ? (
                <>
                  <h3 style={{ margin: '0 0 16px', fontSize: '20px' }}>{toDisplayText(detailActivity.title, '-')}</h3>
                  <p><strong>{detailText('adminActivities.fieldStatus')}:</strong> {toDisplayText(detailActivity.status, '-')}</p>
                  <p><strong>{detailText('adminActivities.detailCategory')}:</strong> {toDisplayText(detailActivity.category, '-')}</p>
                  <p><strong>{detailText('adminActivities.detailDateRange')}:</strong> {formatActivityDateRange(detailActivity)}</p>
                  <p><strong>{detailText('adminActivities.detailLocation')}:</strong> {toDisplayText(detailActivity.location, '-')}</p>
                  <p><strong>{detailText('adminActivities.detailDescription')}:</strong> {toDisplayText(detailActivity.description, '-')}</p>
                  <p><strong>{detailText('adminActivities.detailOrganizer')}:</strong> {getDetailStaffNames(detailActivity, 'organizerStaffIds', 'organizerStaffId')}</p>
                  <p><strong>{detailText('adminActivities.fieldSupportStaff')}:</strong> {getDetailStaffNames(detailActivity, 'supportStaffIds', 'supportStaffId')}</p>
                  <p><strong>{detailText('adminActivities.detailParticipants', { count: Array.isArray(detailActivity.participantResidentIds) ? detailActivity.participantResidentIds.length : 0 })}:</strong> {getDetailResidentNames(detailActivity)}</p>
                </>
              ) : (
                <p>{detailText('adminActivities.loadingActivities')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
      {bulkEditActivity && <BulkEditActivityModal
        bulkEditActivity={bulkEditActivity}
        bulkEditForm={bulkEditForm}
        setBulkEditForm={setBulkEditForm}
        bulkEditError={bulkEditError}
        bulkSubmitting={bulkSubmitting}
        bulkSubmit={handleBulkSave}
        onClose={() => setBulkEditActivity(null)}
        t={t}
        staffOptions={staffOptions}
        residents={residents}
        isActivityStaff={isActivityStaff}
      />}

      <ConfirmModal
        open={Boolean(confirmModal)}
        tone={confirmModal?.tone || 'warning'}
        title={confirmModal?.title}
        message={confirmModal?.message}
        details={confirmModal?.details}
        confirmLabel={confirmModal?.confirmLabel}
        cancelLabel={confirmModal?.cancelLabel}
        busy={Boolean(confirmModal?.busy)}
        onConfirm={confirmModal?.run}
        onClose={closeConfirmModal}
      />
    </div>
  );
}
