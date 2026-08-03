import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Plus, Edit3, Trash2, Filter, CalendarDays, AlertTriangle, Eye, X } from 'lucide-react';
import activityService from '../../services/activity.service';
import authService from '../../services/auth.service';
import residentService from '../../services/resident.service';
import medicalRecordService from '../../services/medicalRecord.service';
import '../../styles/admin/AdminAdmissionRequestsPage.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'draft', label: 'Nháp' },
  { value: 'scheduled', label: 'Đã lên lịch' },
  { value: 'ongoing', label: 'Đang diễn ra' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'cancelled', label: 'Đã huỷ' },
];

const getStatusOptionsForForm = (currentStatus) => {
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

const formatDurationLabel = (durationMinutes) => {
  const totalMinutes = Number(durationMinutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '';

  const totalDays = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  const parts = [];
  if (totalDays > 0) parts.push(`${totalDays} ngày`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}p`);

  return parts.join(' ');
};

const getMinDateTimeLocal = () => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset();
  const localNow = new Date(now.getTime() - tzOffset * 60000);
  return localNow.toISOString().slice(0, 16);
};

const ACTIVITY_CATEGORY_OPTIONS = [
  'Hoạt động chăm sóc cá nhân hằng ngày',
  'Hoạt động chăm sóc sức khỏe',
  'Hoạt động ăn uống - dinh dưỡng',
  'Hoạt động thể chất - phục hồi chức năng',
  'Hoạt động giải trí',
  'Hoạt động kích thích nhận thức',
  'Hoạt động xã hội - giao lưu',
  'Hoạt động tâm lý - tinh thần',
  'Hoạt động sự kiện đặc biệt',
  'Hoạt động với gia đình',
  'Hoạt động quản lý nội bộ',
  'Hoạt động xử lý sự cố',
  'Khác',
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
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ search: '', status: '', from: '', to: '' });
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

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit,
        search: appliedFilters.search || undefined,
        status: appliedFilters.status || undefined,
        from: appliedFilters.from || undefined,
        to: appliedFilters.to || undefined,
      };
      const res = await activityService.getActivityList(params);
      setActivities(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error('Fetch activities failed:', err);
      setError(err.response?.data?.message || 'Không thể tải danh sách hoạt động.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

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
        console.log(`📋 Loading abnormal status for ${residents.length} residents...`);
        
        const results = await Promise.allSettled(
          residents.map(async (resident) => {
            try {
              const latestRecord = await medicalRecordService.getLatestVitals(resident._id);
              const isAbnormal = latestRecord?.abnormalFlag === true;
              console.log(`✓ Resident ${resident.fullName} (${resident._id}): abnormal=${isAbnormal}, record=`, latestRecord);
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
          console.log(`📊 Health status map updated:`, statusMap);
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
        console.log(`🏥 Checking abnormal status for ${activities.length} activities...`);
        
        for (const activity of activities) {
          const participantIds = activity.participantResidentIds || [];
          const abnormalCount = participantIds.filter((id) => residentsAbnormalStatus[id]).length;
          abnormalMap[activity._id] = abnormalCount;
          if (abnormalCount > 0) {
            console.log(`  ⚠️ Activity "${activity.title}" has ${abnormalCount} abnormal participants`);
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

  const getSelectedActivity = () => {
    return activities.find((a) => a._id === selectedActivityId);
  };

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ search, status, from, to });
  };

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
    setFrom('');
    setTo('');
    setPage(1);
    setAppliedFilters({ search: '', status: '', from: '', to: '' });
  };

  const handleEdit = (activity) => {
    setEditingId(activity._id);
    setIsCreating(true);
    setForm({
      title: activity.title || '',
      category: activity.category && !ACTIVITY_CATEGORY_OPTIONS.includes(activity.category) ? 'Khác' : (activity.category || ''),
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

  const handleDelete = async (activityId) => {
    if (!window.confirm('Bạn có chắc muốn xóa hoạt động này không?')) return;
    try {
      setLoading(true);
      await activityService.deleteActivity(activityId);
      fetchActivities();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.response?.data?.message || 'Không thể xóa hoạt động.');
    } finally {
      setLoading(false);
    }
  };

  const getParticipantDisplay = (activity) => {
    const names = (activity.participantResidentIds || [])
      .map((residentId) => {
        const resident = residents.find((item) => item._id === residentId);
        if (!resident) return null;
        return resident.fullName || resident.residentCode || 'Cư dân';
      })
      .filter(Boolean);

    if (names.length === 0) return '0 cư dân';
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  };

  const handleStatusChange = async (activity, newStatus) => {
    try {
      setLoading(true);
      await activityService.updateActivityStatus(activity._id, newStatus);
      fetchActivities();
    } catch (err) {
      console.error('Status update failed:', err);
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const targetLabel = appliedFilters.search || appliedFilters.status || appliedFilters.from || appliedFilters.to
      ? 'các hoạt động phù hợp với bộ lọc hiện tại'
      : 'tất cả hoạt động';

    if (!window.confirm(`Bạn có chắc muốn xóa ${targetLabel} không?`)) return;

    try {
      setLoading(true);
      await activityService.bulkDeleteActivities(appliedFilters);
      await fetchActivities();
      alert('Đã xóa các hoạt động phù hợp.');
    } catch (err) {
      console.error('Bulk delete failed:', err);
      alert(err.response?.data?.message || 'Không thể xóa các hoạt động này.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatus) return;

    const targetLabel = appliedFilters.search || appliedFilters.status || appliedFilters.from || appliedFilters.to
      ? 'các hoạt động phù hợp với bộ lọc hiện tại'
      : 'tất cả hoạt động';

    if (!window.confirm(`Bạn có chắc muốn đổi trạng thái của ${targetLabel} thành ${STATUS_OPTIONS.find((item) => item.value === bulkStatus)?.label || bulkStatus}?`)) return;

    try {
      setLoading(true);
      const filters = { ...appliedFilters };
      if (filters.status === '') {
        delete filters.status;
      }
      await activityService.bulkUpdateActivityStatus({ ...filters, status: bulkStatus });
      await fetchActivities();
      alert('Đã cập nhật trạng thái cho các hoạt động phù hợp.');
    } catch (err) {
      console.error('Bulk status update failed:', err);
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái cho các hoạt động này.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStaffSelection = (field, staffId) => {
    setForm((prevForm) => {
      const currentIds = Array.isArray(prevForm[field]) ? [...prevForm[field]] : [];
      const nextIds = currentIds.includes(staffId)
        ? currentIds.filter((id) => id !== staffId)
        : [...currentIds, staffId];
      return { ...prevForm, [field]: nextIds };
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
      setFormError('Tiêu đề là bắt buộc');
      return;
    }
    if (!form.startAt) {
      setFormError('Ngày/giờ bắt đầu là bắt buộc');
      return;
    }
    if (!form.location?.trim()) {
      setFormError('Địa điểm là bắt buộc');
      return;
    }
    if (!form.category?.trim()) {
      setFormError('Danh mục hoạt động là bắt buộc');
      return;
    }
    if (form.category === 'Khác' && !form.categoryOther?.trim()) {
      setFormError('Vui lòng nhập danh mục khác');
      return;
    }

    const startDate = new Date(form.startAt);
    const endDate = form.endAt ? new Date(form.endAt) : startDate;
    if (Number.isNaN(startDate.getTime())) {
      setFormError('Ngày bắt đầu không hợp lệ');
      return;
    }
    if (startDate < new Date()) {
      setFormError('Ngày bắt đầu không được là quá khứ');
      return;
    }
    if (form.endAt && endDate <= startDate) {
      setFormError('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    const computedDurationMinutes = getAutoDurationMinutes(form.startAt, form.endAt || form.startAt);
    if (computedDurationMinutes === null) {
      setFormError('Ngày bắt đầu và kết thúc phải hợp lệ');
      return;
    }
    if (computedDurationMinutes <= 0) {
      setFormError('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    const organizerStaffIds = Array.isArray(form.organizerStaffIds)
      ? form.organizerStaffIds.filter(Boolean)
      : [];
    if (organizerStaffIds.length === 0) {
      setFormError('Nhân viên tổ chức là bắt buộc');
      return;
    }

    for (const organizerId of organizerStaffIds) {
      const organizer = staffOptions.find((s) => s._id === organizerId);
      if (!organizer || !isActivityStaff(organizer)) {
        setFormError('Nhân viên tổ chức phải là y tá, hộ lý, caregiver hoặc bác sĩ');
        return;
      }
    }

    const supportStaffIds = Array.isArray(form.supportStaffIds)
      ? form.supportStaffIds.filter(Boolean)
      : [];
    for (const supportStaffId of supportStaffIds) {
      const supportStaff = staffOptions.find((s) => s._id === supportStaffId);
      if (!supportStaff || !isActivityStaff(supportStaff)) {
        setFormError('Nhân viên hỗ trợ phải là y tá, hộ lý, caregiver hoặc bác sĩ');
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
      setFormError(err.response?.data?.message || 'Có lỗi khi lưu hoạt động.');
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
            Quản lý hoạt động
          </h1>
          <p>Quản lý hoạt động cho cư dân: tạo, chỉnh sửa, xóa, và cập nhật trạng thái.</p>
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
          {isCreating ? 'Đóng form' : 'Tạo hoạt động'}
        </button>
      </div>

      <div className="adm-filter-panel">
        <form onSubmit={handleApplyFilters} className="adm-filter-grid">
          <div>
            <label className="text-sm font-semibold">Tìm kiếm</label>
            <div className="adm-filter-input-wrapper">
              <Search className="adm-filter-input-icon" size={14} />
              <input
                type="text"
                placeholder="Tìm theo tiêu đề, danh mục..."
                className="adm-filter-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Trạng thái</label>
            <select
              className="adm-filter-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Từ ngày</label>
            <input
              type="date"
              className="adm-filter-select"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Đến ngày</label>
            <input
              type="date"
              className="adm-filter-select"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-3" style={{ alignSelf: 'end' }}>
            <button type="button" className="adm-btn-refresh" onClick={handleResetFilters}>
              <RefreshCw size={14} /> Đặt lại
            </button>
            <button type="submit" className="adm-btn-refresh">
              <Filter size={14} /> Áp dụng
            </button>
          </div>
        </form>

        <div className="flex items-end gap-3" style={{ marginTop: '16px', flexWrap: 'wrap' }}>
          <select
            className="adm-filter-select"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            {STATUS_OPTIONS.filter((item) => item.value).map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button type="button" className="adm-btn-refresh" onClick={handleBulkStatusChange}>
            Chuyển trạng thái tất cả
          </button>
          <button type="button" className="adm-btn-refresh" onClick={handleBulkDelete}>
            <Trash2 size={14} /> Xóa tất cả
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="adm-filter-panel" style={{ marginBottom: '28px' }}>
          <h2 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>
            {editingId ? 'Chỉnh sửa hoạt động' : 'Tạo hoạt động'}
          </h2>
          <form onSubmit={handleSubmit} className="adm-activity-form-grid">
            <div className="adm-form-field">
              <label className="text-sm font-semibold">Tiêu đề</label>
              <input
                type="text"
                className="adm-filter-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">Danh mục</label>
              <select
                className="adm-filter-select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value, categoryOther: e.target.value === 'Khác' ? form.categoryOther : '' })}
              >
                <option value="">Chọn danh mục</option>
                {ACTIVITY_CATEGORY_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              {form.category === 'Khác' && (
                <input
                  type="text"
                  className="adm-filter-input"
                  style={{ marginTop: '8px' }}
                  value={form.categoryOther}
                  onChange={(e) => setForm({ ...form, categoryOther: e.target.value })}
                  placeholder="Nhập danh mục khác"
                />
              )}
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">Bắt đầu</label>
              <input
                type="datetime-local"
                className="adm-filter-input"
                min={getMinDateTimeLocal()}
                value={form.startAt}
                onChange={(e) => {
                  const nextStart = e.target.value;
                  const computedMinutes = getAutoDurationMinutes(nextStart, form.endAt || nextStart);
                  setForm({ ...form, startAt: nextStart, durationMinutes: computedMinutes === null || computedMinutes <= 0 ? '' : computedMinutes });
                }}
              />
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">Kết thúc</label>
              <input
                type="datetime-local"
                className="adm-filter-input"
                min={form.startAt}
                value={form.endAt}
                onChange={(e) => {
                  const nextEnd = e.target.value;
                  const computedMinutes = getAutoDurationMinutes(form.startAt, nextEnd || form.startAt);
                  setForm({ ...form, endAt: nextEnd, durationMinutes: computedMinutes === null || computedMinutes <= 0 ? '' : computedMinutes });
                }}
              />
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">Thời lượng</label>
              <input
                type="text"
                className="adm-filter-input"
                value={formatDurationLabel(form.durationMinutes)}
                readOnly
                placeholder="Sẽ tự tính từ thời gian bắt đầu và kết thúc"
              />
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">Thời lượng mỗi ngày</label>
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
              <label className="text-sm font-semibold">Địa điểm</label>
              <input
                type="text"
                className="adm-filter-input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="adm-form-field adm-form-field-full">
              <label className="text-sm font-semibold">Nhân viên tổ chức</label>
              <div className="adm-participant-chips" style={{ marginBottom: '8px' }}>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={staffOptions.filter((staff) => isActivityStaff(staff) && String(staff.role || '').toLowerCase().includes('doctor') || String(staff.role || '').toLowerCase().includes('bác sĩ')).length > 0 && staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('doctor') || String(staff.role || '').toLowerCase().includes('bác sĩ'))).every((staff) => form.organizerStaffIds.includes(staff._id))}
                    onChange={() => toggleRoleGroupSelection('organizerStaffIds', ['doctor', 'bác sĩ'])}
                    style={{ marginRight: '6px' }}
                  />
                  Tất cả bác sĩ
                </label>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('caregiver') || String(staff.role || '').toLowerCase().includes('hộ lý'))).length > 0 && staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('caregiver') || String(staff.role || '').toLowerCase().includes('hộ lý'))).every((staff) => form.organizerStaffIds.includes(staff._id))}
                    onChange={() => toggleRoleGroupSelection('organizerStaffIds', ['caregiver', 'hộ lý'])}
                    style={{ marginRight: '6px' }}
                  />
                  Tất cả hộ lý
                </label>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('nurse') || String(staff.role || '').toLowerCase().includes('y tá') || String(staff.role || '').toLowerCase().includes('điều dưỡng'))).length > 0 && staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('nurse') || String(staff.role || '').toLowerCase().includes('y tá') || String(staff.role || '').toLowerCase().includes('điều dưỡng'))).every((staff) => form.organizerStaffIds.includes(staff._id))}
                    onChange={() => toggleRoleGroupSelection('organizerStaffIds', ['nurse', 'y tá', 'điều dưỡng'])}
                    style={{ marginRight: '6px' }}
                  />
                  Tất cả y tá
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
                        {staff.fullName || staff.email || 'Nhân viên'} {staff.role ? `(${staff.role})` : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="adm-form-field adm-form-field-full">
              <label className="text-sm font-semibold">Nhân viên hỗ trợ</label>
              <div className="adm-participant-chips" style={{ marginBottom: '8px' }}>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('doctor') || String(staff.role || '').toLowerCase().includes('bác sĩ'))).length > 0 && staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('doctor') || String(staff.role || '').toLowerCase().includes('bác sĩ'))).every((staff) => form.supportStaffIds.includes(staff._id))}
                    onChange={() => toggleRoleGroupSelection('supportStaffIds', ['doctor', 'bác sĩ'])}
                    style={{ marginRight: '6px' }}
                  />
                  Tất cả bác sĩ
                </label>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('caregiver') || String(staff.role || '').toLowerCase().includes('hộ lý'))).length > 0 && staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('caregiver') || String(staff.role || '').toLowerCase().includes('hộ lý'))).every((staff) => form.supportStaffIds.includes(staff._id))}
                    onChange={() => toggleRoleGroupSelection('supportStaffIds', ['caregiver', 'hộ lý'])}
                    style={{ marginRight: '6px' }}
                  />
                  Tất cả hộ lý
                </label>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('nurse') || String(staff.role || '').toLowerCase().includes('y tá') || String(staff.role || '').toLowerCase().includes('điều dưỡng'))).length > 0 && staffOptions.filter((staff) => isActivityStaff(staff) && (String(staff.role || '').toLowerCase().includes('nurse') || String(staff.role || '').toLowerCase().includes('y tá') || String(staff.role || '').toLowerCase().includes('điều dưỡng'))).every((staff) => form.supportStaffIds.includes(staff._id))}
                    onChange={() => toggleRoleGroupSelection('supportStaffIds', ['nurse', 'y tá', 'điều dưỡng'])}
                    style={{ marginRight: '6px' }}
                  />
                  Tất cả y tá
                </label>
              </div>
              <div className="adm-participant-picker">
                {staffOptions.filter(isActivityStaff).map((staff) => {
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
                        {staff.fullName || staff.email || 'Nhân viên'} {staff.role ? `(${staff.role})` : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="adm-form-field adm-form-field-full">
              <label className="text-sm font-semibold">Người tham gia</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                <label className="adm-participant-chip" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={residents.length > 0 && residents.every((resident) => form.participantResidentIds.includes(resident._id))}
                    onChange={toggleAllResidents}
                    style={{ marginRight: '6px' }}
                  />
                  Tất cả cư dân
                </label>
              </div>
              <input
                type="text"
                className="adm-filter-input"
                placeholder="Tìm cư dân..."
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
                      (resident.fullName || 'Cư dân') +
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
                    {'+' + (form.participantResidentIds.length - 6) + ' khác'}
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
                        {resident.fullName || 'Cư dân chưa đặt tên'}{resident.residentCode ? ` (${resident.residentCode})` : ''}
                      </span>
                      {hasAbnormal && (
                        <span className="adm-abnormal-badge">
                          <AlertTriangle size={12} />
                          Bất thường
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
                  <div className="adm-empty-state">Không tìm thấy cư dân phù hợp.</div>
                )}
                {optionsLoading && <div className="adm-empty-state">Đang tải danh sách cư dân...</div>}
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
                      <strong>⚠ Cảnh báo: Cư dân có chỉ số sức khỏe bất thường</strong>
                      <div className="adm-warning-list">
                        {selectedAbnormalResidents.map((item) => (
                          <div key={item.resident._id}>
                            • {item.resident.fullName || 'Cư dân'} ({item.resident.residentCode}) - Xin hãy giám sát sau khi tham gia hoạt động
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
            <div className="adm-form-field">
              <label className="text-sm font-semibold">Trạng thái</label>
              <select
                className="adm-filter-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {getStatusOptionsForForm(form.status).filter((item) => item.value).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="adm-form-field adm-form-field-full">
              <label className="text-sm font-semibold">Mô tả</label>
              <textarea
                rows="3"
                className="adm-filter-input"
                style={{ resize: 'vertical' }}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            {formError && (
              <div className="adm-form-message adm-form-field-full">{formError}</div>
            )}
            <div className="adm-form-actions adm-form-field-full">
              <button type="button" className="adm-btn-refresh" onClick={() => { resetForm(); setIsCreating(false); }}>
                Huỷ
              </button>
              <button type="submit" className="adm-btn-refresh" disabled={submitting}>
                {editingId ? 'Lưu thay đổi' : 'Tạo hoạt động'}
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
              <strong>⚠ Cảnh báo: {activitiesWithAbnormal.length} hoạt động có bệnh nhân ở trạng thái bất thường</strong>
              <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.9 }}>
                {activitiesWithAbnormal.map(({ activity, count }) => (
                  <div key={activity._id}>
                    • <strong>{activity.title}</strong> - {count} bệnh nhân có chỉ số bất thường
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
                <th>Tiêu đề</th>
                <th>Danh mục</th>
                <th>Lên lịch lúc</th>
                <th>Trạng thái</th>
                <th>Người tham gia</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                    Đang tải hoạt động...
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                    Không tìm thấy hoạt động nào.
                  </td>
                </tr>
              ) : (
                activities.map((activity) => {
                  const abnormalCount = activitiesAbnormalParticipants[activity._id] || 0;
                  return (
                    <tr key={activity._id} className="adm-table-row" style={abnormalCount > 0 ? { backgroundColor: '#fffbeb' } : {}}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {activity.title}
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
                              {abnormalCount} bất thường
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{activity.category || '-'}</td>
                      <td>{formatActivityDateRange(activity)}</td>
                      <td>
                        <select
                          value={activity.status}
                          onChange={(e) => handleStatusChange(activity, e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '10px', borderColor: '#cbd5e1' }}
                        >
                          {STATUS_OPTIONS.filter((item) => item.value).map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
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
                        <button
                          type="button"
                          className="adm-btn-refresh"
                          style={{ marginRight: '8px' }}
                          onClick={() => setSelectedActivityId(activity._id)}
                          title="Xem chi tiết"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="adm-btn-refresh"
                          style={{ marginRight: '8px' }}
                          onClick={() => handleEdit(activity)}
                          title="Chỉnh sửa"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          className="adm-btn-refresh"
                          onClick={() => handleDelete(activity._id)}
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
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
          Trang {page} / {totalPages} — {total} hoạt động
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="adm-btn-refresh"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          >
            Trước
          </button>
          <button
            type="button"
            className="adm-btn-refresh"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          >
            Tiếp
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', marginTop: '16px' }}>{error}</div>}

      {/* ─── Activity Detail Modal ─── */}
      {selectedActivityId && (
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Chi tiết hoạt động</h2>
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
              {getSelectedActivity() && (() => {
                const activity = getSelectedActivity();
                const organizer = staffOptions.find((s) => s._id === activity.organizerStaffId);
                const participantsList = (activity.participantResidentIds || []).map((resId) => {
                  const resident = residents.find((r) => r._id === resId);
                  return resident;
                }).filter(Boolean);

                return (
                  <>
                    {/* Title and Status */}
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700 }}>
                        {activity.title}
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
                        {STATUS_OPTIONS.find((s) => s.value === activity.status)?.label || activity.status}
                      </span>
                    </div>

                    {/* Description */}
                    {activity.description && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>Mô tả</label>
                        <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>{activity.description}</p>
                      </div>
                    )}

                    {/* Category */}
                    {activity.category && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>Danh mục</label>
                        <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{activity.category}</p>
                      </div>
                    )}

                    {/* Date Range */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>Thời gian</label>
                      <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{formatActivityDateRange(activity)}</p>
                    </div>

                    {/* Duration */}
                    {activity.durationMinutes && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>Thời lượng</label>
                        <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{formatDurationLabel(activity.durationMinutes)}</p>
                      </div>
                    )}

                    {/* Location */}
                    {activity.location && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>Địa điểm</label>
                        <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{activity.location}</p>
                      </div>
                    )}

                    {/* Organizer */}
                    {organizer && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>Nhân viên tổ chức</label>
                        <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>
                          {organizer.fullName || organizer.email} {organizer.role ? `(${organizer.role})` : ''}
                        </p>
                      </div>
                    )}

                    {/* Participants */}
                    {participantsList.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Cư dân tham gia ({participantsList.length})</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {participantsList.map((resident) => {
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
                                <span>{resident.fullName || resident.residentCode}</span>
                                {isAbnormal && (
                                  <span style={{
                                    fontSize: '11px',
                                    color: '#dc2626',
                                    backgroundColor: '#fecaca',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                  }}>
                                    ⚠️ Bất thường
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
              })()}
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
    </div>
  );
}
