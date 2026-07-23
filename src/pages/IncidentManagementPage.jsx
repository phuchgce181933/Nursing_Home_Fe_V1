import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  PlusCircle,
  Search,
  Paperclip,
  AlertTriangle,
  ShieldAlert,
  Eye,
  CheckCircle2,
  X,
  MapPin,
  Clock,
  User,
  FileWarning,
  BarChart3,
} from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import authService from '../services/auth.service';
import residentService from '../services/resident.service';
import facilityService from '../services/facility.service';
import { useAuth } from '../hooks/useAuth';
import incidentService from '../services/incident.service';
import clinicalServiceService from '../services/clinicalService.service';
import staffService from '../services/staff.service';
import { floorLabel } from '../utils/residentArea';
import '../styles/shared/IncidentManagementPage.css';

const initialForm = {
  incidentType: '',
  severity: 'medium',
  incidentAt: '',
  location: '',
  description: '',
  residentIds: [],
  assignedStaffIds: [],
};

const statusOptions = ['open', 'investigating', 'resolved', 'closed'];

const getStatusDisplay = (t) => ({
  open: t('incidents.status.open'),
  investigating: t('incidents.status.investigating'),
  resolved: t('incidents.status.resolved'),
  closed: t('incidents.status.closed'),
});

const getSeverityDisplay = (t) => ({
  low: t('incidents.severity.low'),
  medium: t('incidents.severity.medium'),
  high: t('incidents.severity.high'),
  critical: t('incidents.severity.critical'),
});

const getResolutionStatusLabel = (status) => {
  const normalized = String(status || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
  const labels = {
    in_progress: 'Đang tiến hành',
    pending: 'Đang chờ xử lý',
    resolved: 'Đã giải quyết',
    completed: 'Đã hoàn tất',
    closed: 'Đã đóng',
  };
  return labels[normalized] || status || '—';
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

function toIsoDatetime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function IncidentManagementPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const STATUS_DISPLAY = useMemo(() => getStatusDisplay(t), [t]);
  const SEVERITY_DISPLAY = useMemo(() => getSeverityDisplay(t), [t]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [residents, setResidents] = useState([]);
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [residentAreaFilter, setResidentAreaFilter] = useState('');
  const [residentSearch, setResidentSearch] = useState('');
  const [floors, setFloors] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIncident, setDetailIncident] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [assignHandlersOpen, setAssignHandlersOpen] = useState(false);
  const [selectedHandlers, setSelectedHandlers] = useState([]);
  const [assigningHandlers, setAssigningHandlers] = useState(false);
  const [drawerJustOpened, setDrawerJustOpened] = useState(false);
  const [resolutionForm, setResolutionForm] = useState(null);
  const [resolutionFiles, setResolutionFiles] = useState([]);
  const [resolutionFilePreviews, setResolutionFilePreviews] = useState([]);
  const [savingResolution, setSavingResolution] = useState(false);
  const [reopenForm, setReopenForm] = useState(null);
  const attachmentInputRef = useRef(null);

  const noResidentSelected = resolutionForm?.medical?.residentCondition === 'NoResident';
  const [clinicalServices, setClinicalServices] = useState([]);
  const [selectedClinicalServices, setSelectedClinicalServices] = useState({});
  const [medSuggestions] = useState(["Paracetamol", "Amoxicillin", "Ibuprofen", "Metformin", "Aspirin", "Omeprazole"]);
  const [medSuggestionOpenIndex, setMedSuggestionOpenIndex] = useState(-1);
  const immediateActionOptions = ['Lau sàn', 'Hỗ trợ cư dân', 'Gọi bác sĩ', 'Liên hệ gia đình', 'Chuyển viện', 'Khác'];
  const [staffAvailabilityMap, setStaffAvailabilityMap] = useState({});
  const [assignmentConflicts, setAssignmentConflicts] = useState({});

  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const isCaregiver = String(user?.role || '').toLowerCase() === 'caregiver';
  const canAssignHandlers = isAdmin;

  const formatResidentLabel = (resident) => {
    const baseName = resident?.fullName || t('incidents.unnamedResident');
    const code = resident?.residentCode ? ` (${resident.residentCode})` : '';
    return `${baseName}${code}`;
  };

  const formatStaffLabel = (staff) => {
    const name = staff?.fullName || staff?.email || t('incidents.unnamedStaff');
    const role = staff?.role ? ` — ${staff.role.toUpperCase()}` : '';
    const email = staff?.email ? ` • ${staff.email}` : '';
    return `${name}${role}${email}`;
  };

  const getTodayLocalDateString = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  useEffect(() => {
    // generate object URLs for image previews for resolution files
    let mounted = true;
    if (!resolutionFiles || !resolutionFiles.length) {
      setResolutionFilePreviews([]);
      return () => { mounted = false; };
    }
    const previews = resolutionFiles.map((file) => {
      try {
        const url = URL.createObjectURL(file);
        return { file, url };
      } catch (e) {
        return { file, url: null };
      }
    });
    if (mounted) setResolutionFilePreviews(previews);
    return () => {
      mounted = false;
      (previews || []).forEach((p) => { if (p && p.url) URL.revokeObjectURL(p.url); });
    };
  }, [resolutionFiles]);

  const handleResolutionFilesChange = (filesArray) => {
    // revoke previous previews
    (resolutionFilePreviews || []).forEach((p) => { if (p && p.url) { try { URL.revokeObjectURL(p.url); } catch (e) {} } });
    const previews = (filesArray || []).map((file) => {
      try { return { file, url: URL.createObjectURL(file) }; }
      catch (e) { return { file, url: null }; }
    });
    setResolutionFiles(filesArray || []);
    setResolutionFilePreviews(previews);
  };

  const handleAttachmentButtonClick = () => {
    attachmentInputRef.current?.click();
  };

  const removeResolutionFile = (index) => {
    setResolutionFiles((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1);
      return next;
    });
    setResolutionFilePreviews((prev) => {
      const next = [...(prev || [])];
      const removed = next.splice(index, 1);
      if (removed && removed[0] && removed[0].url) {
        try { URL.revokeObjectURL(removed[0].url); } catch (e) {}
      }
      return next;
    });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await clinicalServiceService.listServices({ active: true, page: 1, limit: 500 });
        const services = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (mounted && services.length > 0) setClinicalServices(services);
        else if (mounted && clinicalServices.length === 0) setClinicalServices([]);
      } catch (err) {
        if (mounted && clinicalServices.length === 0) setClinicalServices([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getSelectedClinicalServiceFieldValue = (serviceId, fieldCode) => {
    return selectedClinicalServices[serviceId]?.fieldValues?.[fieldCode] ?? '';
  };
  const setSelectedClinicalServiceFieldValue = (serviceId, fieldCode, value) => {
    setSelectedClinicalServices((prev) => {
      const svc = prev[serviceId];
      if (!svc) return prev;
      const nextFieldValues = { ...(svc.fieldValues || {}) };
      nextFieldValues[fieldCode] = value;
      return { ...prev, [serviceId]: { ...svc, fieldValues: nextFieldValues } };
    });
  };

  const getStaffSelectionId = (staff) => {
    if (!staff) return '';
    return String(
      staff?.staffProfile?._id
      || staff?.staffProfile?.id
      || staff?.userId?._id
      || staff?.userId
      || staff?.id
      || staff?._id
      || ''
    );
  };

  const floorLabelMap = useMemo(
    () => Object.fromEntries(floors.map((floor) => [String(floor._id), floorLabel(floor, t) || floor.name || floor.label || String(floor._id)])),
    [floors, t]
  );

  const getAreaKey = (area) => {
    if (!area) return '';
    if (typeof area === 'object' && area !== null) {
      return String(area._id || area.id || area.name || area.floorNumber || area.label || '');
    }
    return String(area);
  };

  const getAreaLabel = (area) => {
    if (!area) return null;
    const key = getAreaKey(area);
    return floorLabelMap[key] || floorLabel(area, t) || area?.name || area?.label || String(key);
  };

  const areaOptions = useMemo(() => {
    const map = new Map();
    staffAccounts.forEach((staff) => {
      const areas = staff?.staffProfile?.responsibleAreaIds ?? staff?.responsibleAreaIds;
      if (!Array.isArray(areas)) return;
      areas.forEach((area) => {
        if (!area) return;
        const key = getAreaKey(area);
        const label = getAreaLabel(area);
        if (key && label && !map.has(key)) {
          map.set(key, label);
        }
      });
    });
    return Array.from(map, ([id, label]) => ({ id, label }));
  }, [staffAccounts, floorLabelMap, t]);

  const getResidentArea = (resident) => resident?.roomId?.floorId ?? resident?.area?.floor ?? resident?.floor;

  const residentAreaOptions = useMemo(() => {
    const map = new Map();
    residents.forEach((resident) => {
      const area = getResidentArea(resident);
      if (!area) return;
      const key = getAreaKey(area);
      const label = getAreaLabel(area);
      if (key && label && !map.has(key)) {
        map.set(key, label);
      }
    });
    return Array.from(map, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [residents, floorLabelMap, t]);

  const filteredResidents = useMemo(() => {
    let list = residents;
    if (residentAreaFilter) {
      list = list.filter((resident) => {
        const area = getResidentArea(resident);
        if (!area) return false;
        const key = getAreaKey(area);
        return key === residentAreaFilter;
      });
    }
    const query = residentSearch.trim().toLowerCase();
    if (!query) return list;
    return list.filter((resident) => formatResidentLabel(resident).toLowerCase().includes(query));
  }, [residents, residentAreaFilter, residentSearch, t]);

  const filteredStaff = useMemo(() => {
    let list = staffAccounts;
    if (areaFilter) {
      list = list.filter((staff) => {
        const areas = staff?.staffProfile?.responsibleAreaIds ?? staff?.responsibleAreaIds;
        if (!Array.isArray(areas)) return false;
        return areas.some((area) => {
          const key = typeof area === 'object' && area !== null
            ? String(area._id || area.id || area.name || area.floorNumber || area.label || '')
            : String(area);
          return key === areaFilter;
        });
      });
    }
    const query = staffSearch.trim().toLowerCase();
    if (!query) return list;
    return list.filter((staff) => formatStaffLabel(staff).toLowerCase().includes(query));
  }, [staffAccounts, staffSearch, areaFilter]);

  const toggleResident = (residentId) => {
    setForm((current) => {
      const alreadySelected = current.residentIds.includes(residentId);
      return {
        ...current,
        residentIds: alreadySelected
          ? current.residentIds.filter((id) => id !== residentId)
          : [...current.residentIds, residentId],
      };
    });
  };

  const toggleAssignedStaff = (staff) => {
    const staffId = getStaffSelectionId(staff);
    if (!staffId) return;

    setForm((current) => {
      const alreadyAssigned = current.assignedStaffIds.includes(staffId);
      return {
        ...current,
        assignedStaffIds: alreadyAssigned
          ? current.assignedStaffIds.filter((id) => id !== staffId)
          : [...current.assignedStaffIds, staffId],
      };
    });
  };

  const getStaffAvailabilityKey = (staff) => {
    if (!staff) return '';
    return String(staff?.userId?._id || staff?.userId || staff?._id || staff?.id || '');
  };

  const getStaffAvailability = (staff) => {
    const key = getStaffAvailabilityKey(staff);
    return key ? staffAvailabilityMap[key] : null;
  };

  const getStaffAvailabilityLabel = (staff) => {
    const availability = getStaffAvailability(staff);
    const staffId = getStaffSelectionId(staff);
    const conflict = assignmentConflicts[staffId];

    if (!availability) {
      if (conflict && Array.isArray(conflict.reasons) && conflict.reasons.length) {
        return `${conflict.reasons.join(' · ')}`;
      }
      return '—';
    }

    const status = availability.availabilityStatus || availability.readinessLabelVi || '—';
    const isOnDuty = availability.isOnShift || availability.onShift || availability.availabilityStatus === 'On Duty';
    const baseLabel = isOnDuty ? `Đang đi làm · ${status}` : `Không trực · ${status}`;

    const formatConflictDetails = (conf) => {
      if (!conf) return '';
      const parts = [];
      // Prefer full lists if available
      // Show only tasks/appointments on the incident day when available
      if (Array.isArray(conf.careTasksForDayTimes) && conf.careTasksForDayTimes.length) {
        parts.push(`Nhiệm vụ trong ngày: ${conf.careTasksForDayTimes.join(', ')}`);
      } else if (Array.isArray(conf.allCareTaskTimes) && conf.allCareTaskTimes.length) {
        parts.push(`Nhiệm vụ: ${conf.allCareTaskTimes.join(', ')}`);
      }

      if (Array.isArray(conf.appointmentTimesForDay) && conf.appointmentTimesForDay.length) {
        const formattedAppts = conf.appointmentTimesForDay.map((a) => {
          try {
            const d = new Date(a);
            return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            return String(a);
          }
        });
        parts.push(`Lịch khám trong ngày: ${formattedAppts.join(', ')}`);
      }
      // Fallback to human reasons if arrays missing
      if (parts.length === 0 && Array.isArray(conf.reasons) && conf.reasons.length) {
        parts.push(conf.reasons.join(', '));
      }
      return parts.join(' · ');
    };

    const conflictDetails = formatConflictDetails(conflict);
    if (conflictDetails) return `${baseLabel} · ${conflictDetails}`;

    return baseLabel;
  };

  const getStaffConflictBadge = (staff) => {
    const staffId = getStaffSelectionId(staff);
    const conflict = assignmentConflicts[staffId];
    if (!conflict) return null;
    if (!conflict.canAssign) {
      return <span className="ic-availability ic-availability--conflict">Không thể chỉ định · {conflict.reasons.join(' · ')}</span>;
    }
    return null;
  };

  const isStaffConflicted = (staff) => {
    const staffId = getStaffSelectionId(staff);
    const conflict = assignmentConflicts[staffId];
    if (!conflict) return false;
    if (conflict.canAssign) return false;

    // If incident time not set, treat as conflicted
    if (!form.incidentAt) return true;

    const incidentDate = new Date(form.incidentAt);
    if (Number.isNaN(incidentDate.getTime())) return true;

    const parseTaskTimeToDate = (timeStr) => {
      if (!timeStr) return null;
      // timeStr expected like '14:00' or '8:30'
      const datePart = (form.incidentAt && form.incidentAt.split('T')[0]) || new Date().toISOString().slice(0, 10);
      const normalized = timeStr.length === 5 ? timeStr : String(timeStr).slice(0,5);
      const candidate = new Date(`${datePart}T${normalized}:00`);
      return Number.isNaN(candidate.getTime()) ? null : candidate;
    };

    const times = [];
    const careTimes = conflict.allCareTaskTimes || conflict.careTaskTimes || [];
    careTimes.forEach((t) => {
      const d = parseTaskTimeToDate(t);
      if (d) times.push(d);
    });
    const apptTimes = conflict.allAppointmentTimes || conflict.appointmentTimes || [];
    apptTimes.forEach((a) => {
      try {
        const d = new Date(a);
        if (!Number.isNaN(d.getTime())) times.push(d);
      } catch (e) {
        // ignore
      }
    });

    if (times.length === 0) return true;

    // If ALL times are strictly before the incidentDate, then allow selection (not conflicted)
    const allBefore = times.every((d) => d.getTime() < incidentDate.getTime());
    return !allBefore;
  };

  const getReporterStaffSelectionId = (incident) => {
    if (!incident || !staffAccounts.length) return null;

    const reporterEmail = incident?.reporterEmail?.toLowerCase?.();
    const reporterName = incident?.reporterName?.trim();
    const reportedByUser = incident?.reportedByUserId;
    const reportedByUserId = reportedByUser?._id || reportedByUser?.id || reportedByUser;

    const matchedStaff = staffAccounts.find((staff) => {
      const staffId = getStaffSelectionId(staff);
      const staffUserId = getStaffSelectionId(staff);
      const staffEmail = staff?.email?.toLowerCase?.() || staff?.userId?.email?.toLowerCase?.();
      const staffName = staff?.fullName || staff?.userId?.fullName || '';

      if (staffId && reportedByUserId && String(staffId) === String(reportedByUserId)) return true;
      if (staffUserId && reportedByUserId && String(staffUserId) === String(reportedByUserId)) return true;
      if (reporterEmail && staffEmail && reporterEmail === staffEmail) return true;
      if (reporterName && staffName && reporterName.trim().toLowerCase() === staffName.trim().toLowerCase()) return true;
      return false;
    });

    return matchedStaff ? getStaffSelectionId(matchedStaff) : null;
  };

  /* ── Data loading ──────────────────────────────────────────── */
  const loadIncidents = async () => {
    setLoading(true);
    try {
      const payload = {
        page,
        limit: pageSize,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      };
      const data = await incidentService.listIncidents(payload);
      setIncidents(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
      setMessage('');
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('incidents.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-select current user as assigned staff when drawer opens and staff accounts are loaded
    if (drawerJustOpened && staffAccounts.length > 0 && !optionsLoading) {
      console.log('[DEBUG] Auto-selecting current user. User:', user?._id, 'StaffAccounts:', staffAccounts.length);
      
      // Find current user's staff profile - try multiple match strategies
      let currentUserStaff = staffAccounts.find((staff) => {
        const staffUserId = staff.userId?._id || staff.userId;
        const match = staffUserId === user?._id;
        console.log(`[DEBUG] Checking staff ${staff._id}: staffUserId=${staffUserId}, user._id=${user?._id}, match=${match}`);
        return match;
      });

      // If not found, try matching by email
      if (!currentUserStaff && user?.email) {
        currentUserStaff = staffAccounts.find((staff) => staff.email === user.email || staff.userId?.email === user.email);
        console.log('[DEBUG] Found by email:', currentUserStaff?._id);
      }

      if (currentUserStaff) {
        const staffId = getStaffSelectionId(currentUserStaff);
        console.log('[DEBUG] Setting assigned staff to:', staffId);
        setForm((prev) => ({
          ...prev,
          assignedStaffIds: [staffId],
        }));
      }
      
      setDrawerJustOpened(false);
    }
  }, [drawerJustOpened, staffAccounts, optionsLoading, user]);

  useEffect(() => {
    if (!assignHandlersOpen || !detailIncident || !staffAccounts.length) return;

    const preselectedReporterStaffId = getReporterStaffSelectionId(detailIncident);
    if (!preselectedReporterStaffId) return;

    setSelectedHandlers((current) => {
      const next = current.includes(preselectedReporterStaffId)
        ? current
        : [...current, preselectedReporterStaffId];
      return next;
    });
  }, [assignHandlersOpen, detailIncident, staffAccounts]);

  useEffect(() => {
    // Reset drawerJustOpened when drawer closes
    if (!drawerOpen) {
      setDrawerJustOpened(false);
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!user) return;
    loadIncidents();
  }, [user, search, statusFilter, page, pageSize, isAdmin, isCaregiver]);

  useEffect(() => {
    if (!isAdmin || !staffAccounts.length || !form.incidentAt) {
      setAssignmentConflicts({});
      return;
    }

    let active = true;
    const loadConflicts = async () => {
      try {
        const staffProfileIds = staffAccounts
          .map((staff) => getStaffSelectionId(staff))
          .filter(Boolean);
        if (!staffProfileIds.length) {
          if (active) setAssignmentConflicts({});
          return;
        }
        const response = await incidentService.getAssignmentConflicts({
          incidentAt: form.incidentAt,
          residentIds: form.residentIds,
          staffProfileIds,
        });
        if (!active) return;
        console.debug('[DEBUG] assignmentConflicts response', response);
        setAssignmentConflicts(response?.conflicts || {});
      } catch (error) {
        if (active) setAssignmentConflicts({});
      }
    };

    loadConflicts();
    return () => { active = false; };
  }, [isAdmin, staffAccounts, form.incidentAt, form.residentIds]);

  useEffect(() => {
    if (!isAdmin || !staffAccounts.length) {
      setStaffAvailabilityMap({});
      return;
    }

    let active = true;
    const loadAvailability = async () => {
      try {
        const today = getTodayLocalDateString();
        const roles = ['nurse', 'doctor', 'caregiver', 'pharmacist'];
        const availabilityResponses = await Promise.all(
          roles.map((role) => staffService.getAvailability({ role, date: today }).catch(() => []))
        );

        if (!active) return;
        const nextMap = {};
        const rows = availabilityResponses.flatMap((response) =>
          Array.isArray(response) ? response : response?.data || []
        );
        rows.forEach((row) => {
          const key = String(row?._id || row?.userId?._id || row?.userId || '');
          if (key) nextMap[key] = row;
        });
        setStaffAvailabilityMap(nextMap);
      } catch (error) {
        if (active) setStaffAvailabilityMap({});
      }
    };

    loadAvailability();
    return () => { active = false; };
  }, [isAdmin, staffAccounts]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadFormOptions = async () => {
      setOptionsLoading(true);
      try {
        const residentPromise = residentService.getResidentList({ page: 1, limit: 1000 });
        const floorPromise = facilityService.listFloors({ activeOnly: true });
        const staffPromise = isAdmin
          ? authService.getStaffAccounts({ page: 1, limit: 500 })
          : Promise.resolve([]);

        const [residentResponse, staffResponse, floorResponse] = await Promise.all([
          residentPromise,
          staffPromise,
          floorPromise,
        ]);
        if (!active) return;
        setResidents(Array.isArray(residentResponse) ? residentResponse : residentResponse?.data || []);
        setStaffAccounts(Array.isArray(staffResponse) ? staffResponse : staffResponse?.data || []);
        setFloors(Array.isArray(floorResponse) ? floorResponse : []);
      } catch (error) {
        if (!active) return;
        setMessageType('error');
        setMessage(error?.response?.data?.message || t('incidents.error.loadOptionsFailed'));
      } finally {
        if (active) setOptionsLoading(false);
      }
    };
    loadFormOptions();
    return () => { active = false; };
  }, [user, t]);

  /* ── Handlers ──────────────────────────────────────────────── */
  const handleCreate = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    // Validate that incident date is today (only time may be edited)
    try {
      const incidentAtVal = form.incidentAt;
      if (!incidentAtVal) {
        setMessageType('error');
        setMessage(t('incidents.error.invalidIncidentAt') || 'Thời gian xảy ra không hợp lệ.');
        setIsSaving(false);
        return;
      }
      const datePart = (incidentAtVal.split && incidentAtVal.split('T')[0]) || '';
      const today = new Date().toISOString().slice(0, 10);
      if (datePart !== today) {
        setMessageType('error');
        setMessage(t('incidents.error.incidentDateMustBeToday') || 'Thời gian xảy ra phải là ngày hôm nay.');
        setIsSaving(false);
        return;
      }
    } catch (err) {
      setMessageType('error');
      setMessage(t('incidents.error.invalidIncidentAt') || 'Thời gian xảy ra không hợp lệ.');
      setIsSaving(false);
      return;
    }
    try {
      const payload = {
        ...form,
        incidentAt: toIsoDatetime(form.incidentAt),
        residentIds: form.residentIds.length ? form.residentIds : undefined,
        assignedStaffIds: canAssignHandlers && form.assignedStaffIds.length ? form.assignedStaffIds : undefined,
      };
      await incidentService.createIncident(payload);
      setMessageType('success');
      setMessage(t('incidents.success.created'));
      setForm(initialForm);
      setDrawerOpen(false);
      await loadIncidents();
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('incidents.error.createFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReopen = async (newAssignedStaffIds = []) => {
    if (!detailIncident?._id) return;
    setDetailLoading(true);
    try {
      const payload = {
        assignedStaffIds: newAssignedStaffIds && newAssignedStaffIds.length > 0 ? newAssignedStaffIds : detailIncident.assignedStaffIds || [],
      };
      await incidentService.reopenIncident(detailIncident._id, payload);
      setMessageType('success');
      setMessage('Đã mở lại sự cố');
      setReopenForm(null);
      await loadIncidents();
      await handleViewDetail(detailIncident._id);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Mở lại sự cố thất bại');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusUpdate = async (incidentId, status) => {
    setIsSaving(true);
    setMessage('');
    try {
      await incidentService.updateIncidentStatus(incidentId, { status });
      setMessageType('success');
      setMessage(t('incidents.success.statusUpdated'));
      await loadIncidents();
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('incidents.error.updateStatusFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    setPage(1);
  };

  const handleViewDetail = async (incidentId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailIncident(null);
    setDetailError(null);
    try {
      const data = await incidentService.getIncident(incidentId);
      setDetailIncident(data);
      // Initialize resolution form from incident
      setResolutionForm({
        method: data?.resolution?.method || '',
        rootCause: data?.resolution?.rootCause || '',
        detailedCause: data?.resolution?.detailedCause || '',
        immediateActions: data?.resolution?.immediateActions || [],
        medical: data?.resolution?.medical || { medications: [], procedures: [], residentCondition: '', needFollowUp: false },
        severityAssessment: data?.resolution?.severityAssessment || '',
        escalationRequested: data?.resolution?.escalationRequested || false,
        notes: data?.resolution?.notes || '',
      });
      setResolutionFiles([]);
    } catch (error) {
      const msg = error?.response?.data?.message || t('incidents.error.loadFailed');
      setDetailError(msg);
      setDetailIncident(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const csv = await incidentService.exportIncidents({
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `incidents-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setMessageType('success');
      setMessage(t('incidents.success.exportStarted'));
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('incidents.error.exportFailed'));
    }
  };

  const handleAssignHandlers = async () => {
    if (!detailIncident || !selectedHandlers.length) {
      setMessage(t('incidents.error.selectHandlers'));
      setMessageType('error');
      return;
    }
    setAssigningHandlers(true);
    try {
      await incidentService.assignHandlers(detailIncident._id, { assignedStaffIds: selectedHandlers });
      setMessageType('success');
      setMessage(t('incidents.success.handlersAssigned'));
      setAssignHandlersOpen(false);
      setSelectedHandlers([]);
      await loadIncidents();
      // Reload the detail incident
      if (detailIncident) {
        await handleViewDetail(detailIncident._id);
      }
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('incidents.error.assignHandlersFailed'));
    } finally {
      setAssigningHandlers(false);
    }
  };

  const handleOpenDrawer = () => {
    // Pre-fill incidentAt with today's date and current time (local)
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const datetimeLocal = `${today}T${hh}:${mm}`;
    setForm({ ...initialForm, incidentAt: datetimeLocal });
    setDrawerJustOpened(true);
    setDrawerOpen(true);
  };

  // Helper to extract time part (HH:MM) from form.incidentAt
  const getIncidentTime = () => {
    try {
      if (!form.incidentAt) return '';
      const parts = form.incidentAt.split('T');
      return (parts[1] || '').slice(0, 5);
    } catch (e) {
      return '';
    }
  };

  // Update form.incidentAt time portion while keeping date unchanged
  const setIncidentTime = (timeStr) => {
    try {
      const datePart = (form.incidentAt && form.incidentAt.split('T')[0]) || new Date().toISOString().slice(0, 10);
      const normalizedTime = timeStr && timeStr.length === 5 ? timeStr : '00:00';
      setForm((c) => ({ ...c, incidentAt: `${datePart}T${normalizedTime}` }));
    } catch (e) {
      // fallback
      const today = new Date().toISOString().slice(0, 10);
      setForm((c) => ({ ...c, incidentAt: `${today}T00:00` }));
    }
  };

  /* ── Computed ──────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total: incidents.length,
    open: incidents.filter((i) => i.status === 'open').length,
    investigating: incidents.filter((i) => i.status === 'investigating').length,
    resolved: incidents.filter((i) => i.status === 'resolved').length,
  }), [incidents]);

  if (!user) {
    return <LoadingSpinner label={t('incidents.loadingPage')} />;
  }

  return (
    <div className="ic-page">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="ic-header">
        <div className="ic-header__info">
          <h1 className="ic-header__title">{t('incidents.title')}</h1>
          <p className="ic-header__subtitle">{t('incidents.subtitle')}</p>
        </div>
        <div className="ic-header__actions">
          <button type="button" className="ic-btn ic-btn--secondary" onClick={handleExport}>
            <Download size={16} />
            {t('incidents.exportCsv')}
          </button>
          <button type="button" className="ic-btn ic-btn--primary" onClick={handleOpenDrawer}>
            <PlusCircle size={16} />
            {t('incidents.createIncident')}
          </button>
        </div>
      </header>

      {/* ── Toast ──────────────────────────────────────────── */}
      {message && (
        <div className={`ic-toast ic-toast--${messageType}${drawerOpen || detailOpen ? ' ic-toast--floating' : ''}`}>
          {messageType === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {message}
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="ic-stats">
        <div className="ic-stat-card">
          <div className="ic-stat-card__icon ic-stat-card__icon--total">
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="ic-stat-card__value">{stats.total}</div>
            <div className="ic-stat-card__label">{t('incidents.stat.total')}</div>
          </div>
        </div>
        <div className="ic-stat-card">
          <div className="ic-stat-card__icon ic-stat-card__icon--open">
            <FileWarning size={22} />
          </div>
          <div>
            <div className="ic-stat-card__value">{stats.open}</div>
            <div className="ic-stat-card__label">{t('incidents.stat.open')}</div>
          </div>
        </div>
        <div className="ic-stat-card">
          <div className="ic-stat-card__icon ic-stat-card__icon--invest">
            <Eye size={22} />
          </div>
          <div>
            <div className="ic-stat-card__value">{stats.investigating}</div>
            <div className="ic-stat-card__label">{t('incidents.stat.investigating')}</div>
          </div>
        </div>
        <div className="ic-stat-card">
          <div className="ic-stat-card__icon ic-stat-card__icon--resolve">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="ic-stat-card__value">{stats.resolved}</div>
            <div className="ic-stat-card__label">{t('incidents.stat.resolved')}</div>
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="ic-filters">
        <div className="ic-search">
          <Search size={16} className="ic-search__icon" />
          <input
            className="ic-search__input"
            value={search}
            onChange={handleSearchChange}
            placeholder={t('incidents.searchPlaceholder')}
          />
        </div>
        <div className="ic-status-pills">
          <button
            type="button"
            className={`ic-pill ${statusFilter === '' ? 'ic-pill--active' : ''}`}
            onClick={() => handleStatusFilterChange('')}
          >
            {t('incidents.filter.all')}
          </button>
          {statusOptions.map((s) => (
            <button
              key={s}
              type="button"
              className={`ic-pill ${statusFilter === s ? 'ic-pill--active' : ''}`}
              onClick={() => handleStatusFilterChange(s)}
            >
              {STATUS_DISPLAY[s]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Incident table ─────────────────────────────── */}
      {loading ? (
        <LoadingSpinner label={t('incidents.loading')} />
      ) : incidents.length === 0 ? (
        <div className="ic-empty">
          <div className="ic-empty__icon"><ShieldAlert size={42} /></div>
          <p>{t('incidents.noIncidents')}</p>
        </div>
      ) : (
        <>
          <div className="ic-table-wrapper">
            <table className="ic-table">
              <thead>
                <tr>
                  <th>Loại sự cố</th>
                  <th>Cư dân</th>
                  <th>Độ nghiêm trọng</th>
                  <th>Trạng thái</th>
                  <th>Nhân viên được giao</th>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => {
                  const assignedStaffList = Array.isArray(incident.assignedStaffIds) ? incident.assignedStaffIds : [];
                  return (
                    <tr key={incident._id}>
                      <td>
                        <div className="ic-table-title">
                          {incident.incidentType}
                          {incident.resolution?.escalationRequested && (
                            <span style={{ marginLeft: 8, display: 'inline-block', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600 }}>🔴 CHUYỂN CẤP</span>
                          )}
                        </div>
                        <div className="ic-table-subtext">{incident.location || '—'}</div>
                      </td>
                      <td>
                        <div className="ic-table-title" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {Array.isArray(incident.residentIds) && incident.residentIds.length > 0
                            ? (
                                <>
                                  {incident.residentIds.slice(0, 2).map((resident) => (
                                    <div key={resident?._id || resident} style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {resident?.fullName || resident}
                                    </div>
                                  ))}
                                  {incident.residentIds.length > 2 && (
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>... +{incident.residentIds.length - 2}</div>
                                  )}
                                </>
                              )
                            : incident.residentId?.fullName || incident.residentId || t('incidents.unknownResident')}
                        </div>
                        <div className="ic-table-subtext">{incident.reporterName || incident.reporterEmail || t('incidents.unknown')}</div>
                      </td>
                      <td>
                        <span className={`ic-severity ic-severity--${incident.severity}`}>
                          {SEVERITY_DISPLAY[incident.severity] || incident.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`ic-badge ic-badge--${incident.status}`}>
                          {STATUS_DISPLAY[incident.status] || incident.status}
                        </span>
                      </td>
                      <td>
                        {assignedStaffList.length > 0 ? (
                          <div className="ic-assigned-list">
                            {assignedStaffList.map((staff) => {
                              const availabilityLabel = getStaffAvailabilityLabel(staff);
                              return (
                                <div key={staff?._id || staff?.id || staff?.userId?._id || staff?.userId} className="ic-assigned-item">
                                  <span>{staff?.userId?.fullName || staff?.fullName || staff?.userId?.email || staff?.email || '—'}</span>
                                  <small className={availabilityLabel.includes('Đang đi làm') ? 'ic-availability ic-availability--on' : 'ic-availability ic-availability--off'}>{availabilityLabel}</small>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="ic-muted">Chưa phân công</span>
                        )}
                      </td>
                      <td>
                        <div className="ic-table-title">{formatDate(incident.incidentAt)}</div>
                        <div className="ic-table-subtext">{incident.description || '—'}</div>
                      </td>
                      <td>
                        <div className="ic-table-actions">
                          <button
                            type="button"
                            className="ic-btn ic-btn--small ic-btn--secondary"
                            onClick={() => handleViewDetail(incident._id)}
                          >
                            <Eye size={14} />
                            {t('incidents.viewDetail')}
                          </button>
                          <div className="ic-status-actions">
                            {statusOptions.map((status, idx) => {
                              const orderIndex = statusOptions.indexOf(incident.status);
                              const disabled = isSaving || status === incident.status || idx < orderIndex;
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  className={`ic-btn ic-btn--small ${status === incident.status ? 'ic-btn--primary' : 'ic-btn--secondary'}`}
                                  onClick={() => handleStatusUpdate(incident._id, status)}
                                  disabled={disabled}
                                >
                                  {STATUS_DISPLAY[status]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="ic-pagination">
            <span className="ic-pagination__summary">Hiển thị {incidents.length} / {totalItems} sự cố</span>
            <div className="ic-pagination__controls">
              <button type="button" className="ic-btn ic-btn--secondary" disabled={page <= 1 || loading} onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>
                Trước
              </button>
              <span className="ic-pagination__page">Trang {page} / {totalPages}</span>
              <button type="button" className="ic-btn ic-btn--secondary" disabled={page >= totalPages || loading} onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}>
                Tiếp
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Detail drawer ─────────────────────────────────── */}
      {detailOpen && (
        <>
          <div className="ic-drawer-overlay" onClick={() => { setDetailOpen(false); setDetailIncident(null); setDetailError(null); }} />
          <div className="ic-drawer">
            <div className="ic-drawer__header">
              <h2 className="ic-drawer__title">{t('incidents.detail.title')}</h2>
              <button type="button" className="ic-drawer__close" onClick={() => { setDetailOpen(false); setDetailIncident(null); setDetailError(null); }}>
                <X size={20} />
              </button>
            </div>
            <div className="ic-drawer__body">
              {detailLoading ? (
                <LoadingSpinner label={t('incidents.loading')} />
              ) : detailError ? (
                <div style={{ padding: 12, border: '1px solid #ffdddd', background: '#fff6f6', color: '#b00020', borderRadius: 6 }}>
                  <strong>Lỗi:</strong> {detailError}
                </div>
              ) : reopenForm ? (
                <div>
                  <h3 style={{ marginBottom: 16 }}>Mở lại sự cố - Chỉ định nhân viên</h3>
                  <div className="ic-field ic-form-full" style={{ marginBottom: 16 }}>
                    <label className="ic-field__label">Nhân viên xử lý *</label>
                    <div className="ic-field--multi-select">
                      <div className="ic-multi-select-filters" style={{ marginBottom: 10 }}>
                        <input
                          type="text"
                          className="ic-multi-select-search"
                          placeholder="Tìm nhân viên..."
                          onChange={(e) => {
                            const query = e.target.value.toLowerCase();
                            const filtered = staffAccounts.filter(
                              (staff) => !reopenForm.selectedStaffIds?.includes(getStaffSelectionId(staff)) &&
                                formatStaffLabel(staff).toLowerCase().includes(query)
                            );
                            setReopenForm((s) => ({ ...s, filteredStaff: filtered }));
                          }}
                        />
                      </div>
                      <div className="ic-multi-select-list">
                        {(reopenForm.filteredStaff || staffAccounts).map((staff) => {
                          const staffId = getStaffSelectionId(staff);
                          const availabilityLabel = getStaffAvailabilityLabel(staff);
                          return (
                            <label key={staffId || staff._id} className="ic-multi-select-item">
                              <input
                                type="checkbox"
                                checked={(reopenForm.selectedStaffIds || []).includes(staffId)}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...(reopenForm.selectedStaffIds || []), staffId]
                                    : (reopenForm.selectedStaffIds || []).filter((id) => id !== staffId);
                                  setReopenForm((s) => ({ ...s, selectedStaffIds: next }));
                                }}
                              />
                              <div className="ic-multi-select-item__label">
                                <span className="ic-multi-select-item__name">{formatStaffLabel(staff)}</span>
                                <span className={availabilityLabel.includes('Đang đi làm') ? 'ic-availability ic-availability--on' : 'ic-availability ic-availability--off'}>{availabilityLabel}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="ic-btn ic-btn--secondary" onClick={() => setReopenForm(null)}>Hủy</button>
                    <button type="button" className="ic-btn ic-btn--primary" onClick={() => handleReopen(reopenForm.selectedStaffIds)}>
                      Xác nhận mở lại
                    </button>
                  </div>
                </div>
              ) : detailIncident ? (
                <>
                  <div className="ic-form-grid">
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.incidentType')}</label>
                      <div className="ic-field__input ic-field__input--display">{detailIncident.incidentType}</div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.severity')}</label>
                      <div className="ic-field__input ic-field__input--display">
                        <span className={`ic-severity ic-severity--${detailIncident.severity}`}>{SEVERITY_DISPLAY[detailIncident.severity] || detailIncident.severity}</span>
                      </div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.status')}</label>
                      <div className="ic-field__input ic-field__input--display">
                        <span className={`ic-badge ic-badge--${detailIncident.status}`}>{STATUS_DISPLAY[detailIncident.status] || detailIncident.status}</span>
                      </div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.incidentAt')}</label>
                      <div className="ic-field__input ic-field__input--display">{formatDate(detailIncident.incidentAt)}</div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.location')}</label>
                      <div className="ic-field__input ic-field__input--display">{detailIncident.location || '—'}</div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.resident')}</label>
                      <div className="ic-field__input ic-field__input--display">
                        {Array.isArray(detailIncident.residentIds) && detailIncident.residentIds.length > 0
                          ? (
                              <>
                                {detailIncident.residentIds.slice(0, 3).map((resident) => (
                                  <div key={resident?._id || resident} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                    {resident?.fullName || resident}
                                  </div>
                                ))}
                                {detailIncident.residentIds.length > 3 && (
                                  <div style={{ color: '#64748b', fontStyle: 'italic' }}>... +{detailIncident.residentIds.length - 3} cư dân khác</div>
                                )}
                              </>
                            )
                          : detailIncident.residentId?.fullName || detailIncident.residentId || t('incidents.unknownResident')}
                      </div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.form.assignedStaff')}</label>
                      <div className="ic-field__input ic-field__input--display">
                        {Array.isArray(detailIncident.assignedStaffIds) && detailIncident.assignedStaffIds.length > 0
                          ? (
                              <>
                                {detailIncident.assignedStaffIds.slice(0, 3).map((staff) => (
                                  <div key={staff?._id || staff?.userId?._id || staff?.userId} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                    {staff?.userId?.fullName || staff?.fullName || staff?.userId?.email || staff?.email || '—'}
                                  </div>
                                ))}
                                {detailIncident.assignedStaffIds.length > 3 && (
                                  <div style={{ color: '#64748b', fontStyle: 'italic' }}>... +{detailIncident.assignedStaffIds.length - 3} nhân viên khác</div>
                                )}
                              </>
                            )
                          : '—'}
                      </div>
                    </div>
                    <div className="ic-field ic-form-full">
                      <label className="ic-field__label">{t('incidents.form.description')}</label>
                      <div className="ic-field__textarea ic-field__textarea--display" style={{ minHeight: 100, whiteSpace: 'pre-wrap' }}>{detailIncident.description || '—'}</div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.reporter')}</label>
                      <div className="ic-field__input ic-field__input--display">{detailIncident.reporterName || detailIncident.reporterEmail || t('incidents.unknown')}</div>
                    </div>
                    <div className="ic-field">
                      <label className="ic-field__label">{t('incidents.reporterRole')}</label>
                      <div className="ic-field__input ic-field__input--display">{detailIncident.reporterRole || '—'}</div>
                    </div>
                  </div>
                  {/* Assign Handlers Button for Admins */}
                  {isAdmin && (!detailIncident.assignedStaffIds || detailIncident.assignedStaffIds.length === 0) && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
                      <button
                        type="button"
                        className="ic-btn ic-btn--primary"
                        onClick={() => {
                          setSelectedHandlers([]);
                          setAssignHandlersOpen(true);
                        }}
                      >
                        {t('incidents.assignHandlers')}
                      </button>
                    </div>
                  )}
                  {/* Thông tin giải quyết (chỉ nhập khi đang xác minh) */}
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e0e0e0' }}>
                    <h3 style={{ marginBottom: 8 }}>Thông tin giải quyết</h3>
                    {detailIncident.status === 'investigating' ? (
                      resolutionForm ? (
                        <div>
                          <div className="ic-field">
                            <label className="ic-field__label">Phương pháp giải quyết *</label>
                            <input className="ic-field__input" value={resolutionForm.method} onChange={(e) => setResolutionForm((s) => ({ ...s, method: e.target.value }))} />
                          </div>

                          <div className="ic-field">
                            <label className="ic-field__label">Tình trạng cư dân</label>
                            <select className="ic-field__select" value={resolutionForm.medical?.residentCondition || ''} onChange={(e) => {
                              const val = e.target.value;
                              setResolutionForm((s) => ({ ...s, medical: { ...s.medical, residentCondition: val, procedures: val === 'NoResident' ? [] : (s.medical?.procedures || []), medications: val === 'NoResident' ? [] : (s.medical?.medications || []) } }));
                            }}>
                              <option value="">Chọn</option>
                              <option value="Stable">Ổn định</option>
                              <option value="Improving">Đang cải thiện</option>
                              <option value="Critical">Nguy kịch</option>
                              <option value="Hospitalized">Nhập viện</option>
                              <option value="NoResident">Không có cư dân liên quan</option>
                              <option value="UnknownResident">Không rõ cư dân liên quan</option>
                            </select>
                          </div>

                          <div className="ic-field">
                            <label className="ic-field__label">Nguyên nhân chính *</label>
                            <select className="ic-field__select" value={resolutionForm.rootCause} onChange={(e) => setResolutionForm((s) => ({ ...s, rootCause: e.target.value }))}>
                              <option value="Wet Floor">Sàn ướt</option>
                              <option value="Resident Lost Balance">Cư dân mất thăng bằng</option>
                              <option value="Equipment Failure">Hỏng thiết bị</option>
                              <option value="Staff Error">Lỗi nhân viên</option>
                              <option value="Unknown">Không rõ</option>
                              <option value="Other">Khác</option>
                            </select>
                            {resolutionForm.rootCause === 'Other' && (
                              <input className="ic-field__input" placeholder="Mô tả nguyên nhân khác" value={resolutionForm.rootCauseOther || ''} onChange={(e) => setResolutionForm((s) => ({ ...s, rootCauseOther: e.target.value }))} style={{ marginTop: 8 }} />
                            )}
                          </div>

                          <div className="ic-field ic-form-full">
                            <label className="ic-field__label">Nguyên nhân chi tiết</label>
                            <textarea className="ic-field__textarea" rows={3} value={resolutionForm.detailedCause} onChange={(e) => setResolutionForm((s) => ({ ...s, detailedCause: e.target.value }))} />
                          </div>

                          <div className="ic-field ic-form-full">
                            <label className="ic-field__label">Hành động ngay lập tức</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {immediateActionOptions
                                .filter((act) => {
                                  const noResident = resolutionForm.medical?.residentCondition === 'NoResident';
                                  if (!noResident) return true;
                                  const lower = String(act).toLowerCase();
                                  return !(lower.includes('cư dân') || lower.includes('hỗ trợ') || lower.includes('khám') || lower.includes('resident'));
                                })
                                .map((act) => (
                                  <label key={act} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="checkbox" checked={(resolutionForm.immediateActions || []).includes(act)} onChange={(e) => {
                                      const prev = resolutionForm.immediateActions || [];
                                      if (e.target.checked) setResolutionForm((s) => ({ ...s, immediateActions: [...prev, act] }));
                                      else setResolutionForm((s) => ({ ...s, immediateActions: prev.filter((i) => i !== act) }));
                                    }} />
                                    <span>{act}</span>
                                  </label>
                                ))}
                              {(resolutionForm.immediateActions || []).includes('Khác') && (
                                <input className="ic-field__input" placeholder="Mô tả hành động khác" value={resolutionForm.immediateOther || ''} onChange={(e) => setResolutionForm((s) => ({ ...s, immediateOther: e.target.value }))} />
                              )}
                            </div>
                          </div>

                          <div className="ic-field ic-form-full">
                            <label className="ic-field__label">Đánh giá mức độ nghiêm trọng *</label>
                            <select className="ic-field__select" value={resolutionForm.severityAssessment} onChange={(e) => setResolutionForm((s) => ({ ...s, severityAssessment: e.target.value }))}>
                              <option value="">-- Chọn mức độ --</option>
                              <option value="Thấp">Thấp</option>
                              <option value="Trung bình">Trung bình</option>
                              <option value="Cao">Cao</option>
                              <option value="Khẩn cấp">Khẩn cấp</option>
                            </select>
                            {resolutionForm.severityAssessment && (
                              <div className="ic-severity-description">
                                {resolutionForm.severityAssessment === 'Thấp' && 'Không ảnh hưởng nhiều, xử lý thông thường'}
                                {resolutionForm.severityAssessment === 'Trung bình' && 'Ảnh hưởng đến cư dân hoặc hoạt động'}
                                {resolutionForm.severityAssessment === 'Cao' && 'Cần xử lý ưu tiên'}
                                {resolutionForm.severityAssessment === 'Khẩn cấp' && 'Đe dọa tính mạng hoặc an toàn'}
                              </div>
                            )}
                          </div>

                          <div className="ic-field">
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                              <input type="checkbox" checked={resolutionForm.escalationRequested || false} onChange={(e) => setResolutionForm((s) => ({ ...s, escalationRequested: e.target.checked }))} />
                              <span>Yêu cầu chuyển cấp</span>
                            </label>
                          </div>

                          <div className="ic-field">
                            <label className="ic-field__label">Đính kèm</label>
                            <div className="ic-attachment-picker">
                              <button type="button" className="ic-btn ic-btn--secondary ic-btn--upload" onClick={handleAttachmentButtonClick}>
                                <Paperclip size={16} />
                                {resolutionFiles.length > 0 ? `Đã chọn ${resolutionFiles.length} tệp` : 'Chọn tệp đính kèm'}
                              </button>
                              <input
                                ref={attachmentInputRef}
                                type="file"
                                multiple
                                className="ic-attachment-input"
                                onChange={(e) => handleResolutionFilesChange(Array.from(e.target.files || []))}
                              />
                            </div>
                            {resolutionFilePreviews && resolutionFilePreviews.length > 0 && (
                              <div className="ic-attachments">
                                {resolutionFilePreviews.map((p, idx) => (
                                  <div key={idx} className="ic-attachment">
                                    <div className="ic-attachment__thumb">
                                      {p && p.url && p.file && p.file.type && p.file.type.startsWith('image/') ? (
                                        <img src={p.url} alt={p.file.name} className="ic-attachment__img" />
                                      ) : (
                                        <div className="ic-attachment__placeholder">{p.file?.name || '—'}</div>
                                      )}
                                      <button type="button" className="ic-attachment__remove" onClick={() => removeResolutionFile(idx)} title="Xóa tệp">✕</button>
                                    </div>
                                    <div className="ic-attachment__name" title={p.file?.name}>{p.file?.name}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="ic-field ic-form-full">
                            <label className="ic-field__label">Ghi chú</label>
                            <textarea className="ic-field__textarea" rows={2} value={resolutionForm.notes} onChange={(e) => setResolutionForm((s) => ({ ...s, notes: e.target.value }))} />
                          </div>

                          <div className="ic-resolution-actions">
                            <button type="button" className="ic-btn ic-btn--secondary" onClick={() => { setResolutionForm(null); setResolutionFiles([]); setSelectedClinicalServices({}); }}>{t('incidents.form.cancel') || 'Hủy'}</button>
                            <button type="button" className="ic-btn ic-btn--secondary ic-btn--action" disabled={savingResolution} onClick={async () => {
                              // Save draft
                              setSavingResolution(true);
                              try {
                                const payload = { ...resolutionForm, action: 'saveDraft' };
                                if (payload.rootCause === 'Other') payload.rootCause = payload.rootCauseOther || '';
                                if (payload.immediateOther) payload.immediateActions = [...(payload.immediateActions || []), payload.immediateOther];
                                // include medical.proceduresOther if present
                                if (payload.medical?.proceduresOther) payload.medical.procedures = [...(payload.medical.procedures || []), payload.medical.proceduresOther];
                                // if no resident involved, remove medications
                                if (payload.medical?.residentCondition === 'NoResident') {
                                  if (payload.medical && payload.medical.medications) delete payload.medical.medications;
                                }
                                await incidentService.updateIncidentResolution(detailIncident._id, payload, resolutionFiles);
                                setMessageType('success'); setMessage('Lưu nháp thành công');
                                await loadIncidents();
                                await handleViewDetail(detailIncident._id);
                              } catch (err) {
                                setMessageType('error'); setMessage(err?.response?.data?.message || 'Lưu nháp thất bại');
                              } finally { setSavingResolution(false); }
                            }}>{t('incidents.form.saveDraft') || 'Lưu nháp'}</button>
                            <button type="button" className="ic-btn ic-btn--primary ic-btn--action" disabled={savingResolution} onClick={async () => {
                              // Mark as resolved
                              if (!resolutionForm.severityAssessment || !resolutionForm.method || !resolutionForm.rootCause) {
                                setMessageType('error'); setMessage('Vui lòng điền đầy đủ: Phương pháp, Nguyên nhân chính và Đánh giá mức độ');
                                return;
                              }
                              setSavingResolution(true);
                              try {
                                const payload = { ...resolutionForm, action: 'markResolved' };
                                if (payload.rootCause === 'Other') payload.rootCause = payload.rootCauseOther || '';
                                if (payload.immediateOther) payload.immediateActions = [...(payload.immediateActions || []), payload.immediateOther];
                                if (payload.medical?.proceduresOther) payload.medical.procedures = [...(payload.medical.procedures || []), payload.medical.proceduresOther];
                                if (payload.medical?.residentCondition === 'NoResident') {
                                  if (payload.medical && payload.medical.medications) delete payload.medical.medications;
                                }
                                await incidentService.updateIncidentResolution(detailIncident._id, payload, resolutionFiles);
                                setMessageType('success'); setMessage('Đã đánh dấu là đã giải quyết');
                                await loadIncidents();
                                setDetailOpen(false); setDetailIncident(null);
                              } catch (err) {
                                setMessageType('error'); setMessage(err?.response?.data?.message || 'Đánh dấu giải quyết thất bại');
                              } finally { setSavingResolution(false); }
                            }}>{t('incidents.form.markResolved') || 'Đánh dấu đã giải quyết'}</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: '#666' }}>Đang tải thông tin giải quyết...</div>
                      )
                    ) : (
                      <div>
                        {detailIncident.resolution ? (
                          <div>
                            {detailIncident.resolution.escalationRequested && (
                              <div style={{ marginBottom: 16, padding: 12, background: '#fee2e2', border: '2px solid #dc2626', borderRadius: 6, color: '#7f1d1d' }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>🔴 Nhân viên yêu cầu chuyển cấp</div>
                                <div style={{ fontSize: '0.9rem' }}>Vui lòng đánh giá lại tình huống và quyết định xử lý tiếp theo</div>
                              </div>
                            )}
                            <div style={{ marginBottom: 12, padding: 12, background: '#f3f4f6', borderRadius: 6 }}>
                              <div style={{ marginBottom: 8 }}>
                                <strong>Phương pháp:</strong> 
                                <span style={{ marginLeft: 8, color: detailIncident.resolution.method ? '#333' : '#ef4444', fontWeight: detailIncident.resolution.method ? '400' : '600' }}>
                                  {detailIncident.resolution.method || 'chưa rõ'}
                                </span>
                              </div>
                              <div style={{ marginBottom: 8 }}>
                                <strong>Nguyên nhân chính:</strong>
                                <span style={{ marginLeft: 8, color: detailIncident.resolution.rootCause ? '#333' : '#ef4444', fontWeight: detailIncident.resolution.rootCause ? '400' : '600' }}>
                                  {detailIncident.resolution.rootCause || 'Unknown'}
                                </span>
                              </div>
                              <div style={{ marginBottom: 8 }}>
                                <strong>Hành động ngay lập tức:</strong>
                                <span style={{ marginLeft: 8, color: (detailIncident.resolution.immediateActions || []).length > 0 ? '#333' : '#9ca3af' }}>
                                  {(detailIncident.resolution.immediateActions || []).length > 0 
                                    ? (detailIncident.resolution.immediateActions || []).map((action, idx) => (
                                        <span key={idx} style={{ display: 'inline-block', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 4, marginRight: 4, marginBottom: 4 }}>
                                          {action}
                                        </span>
                                      ))
                                    : '—'
                                  }
                                </span>
                              </div>
                              <div>
                                <strong>Mức độ nghiêm trọng:</strong>
                                <span style={{ marginLeft: 8 }}>
                                  {detailIncident.resolution.severityAssessment ? (
                                    <span style={{ 
                                      display: 'inline-block',
                                      padding: '4px 8px',
                                      borderRadius: 4,
                                      background: detailIncident.resolution.severityAssessment === 'Thấp' 
                                        ? '#dbeafe' 
                                        : detailIncident.resolution.severityAssessment === 'Trung bình'
                                        ? '#fed7aa'
                                        : detailIncident.resolution.severityAssessment === 'Cao'
                                        ? '#fecaca'
                                        : '#fca5a5',
                                      color: detailIncident.resolution.severityAssessment === 'Thấp'
                                        ? '#1e40af'
                                        : detailIncident.resolution.severityAssessment === 'Trung bình'
                                        ? '#9a3412'
                                        : detailIncident.resolution.severityAssessment === 'Cao'
                                        ? '#991b1b'
                                        : '#7f1d1d',
                                      fontWeight: 600
                                    }}>
                                      {detailIncident.resolution.severityAssessment}
                                      {detailIncident.resolution.severityAssessment === 'Thấp' 
                                        ? ' - Không ảnh hưởng nhiều, xử lý thông thường' 
                                        : detailIncident.resolution.severityAssessment === 'Trung bình'
                                        ? ' - Ảnh hưởng đến cư dân hoặc hoạt động'
                                        : detailIncident.resolution.severityAssessment === 'Cao'
                                        ? ' - Cần xử lý ưu tiên'
                                        : ' - Đe dọa tính mạng hoặc an toàn'}
                                    </span>
                                  ) : '—'}
                                </span>
                              </div>
                            </div>
                            {detailIncident.resolution.escalationRequested && detailIncident.status === 'resolved' && (
                              <div style={{ marginBottom: 16 }}>
                                <button type="button" className="ic-btn ic-btn--primary" onClick={() => setReopenForm({ selectedStaffIds: [], filteredStaff: staffAccounts })}>
                                  ↻ Mở lại sự cố và chỉ định người xử lý
                                </button>
                              </div>
                            )}
                            <div><strong>Ghi chú:</strong> {detailIncident.resolution.notes || '—'}</div>
                            <div><strong>Thời gian hoàn thành:</strong> {detailIncident.resolution.completedAt ? new Date(detailIncident.resolution.completedAt).toLocaleString('vi-VN') : '—'}</div>
                            <div style={{ marginTop: 8 }}>
                              <strong>File đính kèm:</strong>
                              <div className="ic-detail-attachments">
                                {(detailIncident.resolution.attachments || []).map((att) => {
                                  const isImage = att.mimeType ? String(att.mimeType).startsWith('image/') : String(att.fileUrl || '').match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);
                                  return (
                                    <div key={att.fileUrl} className="ic-detail-attachment">
                                      {isImage ? (
                                        <a href={att.fileUrl} target="_blank" rel="noreferrer">
                                          <img src={att.fileUrl} alt={att.fileName || 'attachment'} className="ic-detail-attachment__img" />
                                        </a>
                                      ) : (
                                        <div><a href={att.fileUrl} target="_blank" rel="noreferrer">{att.fileName || att.fileUrl}</a></div>
                                      )}
                                      <div className="ic-detail-attachment__name">{att.fileName || att.fileUrl}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>Chưa có thông tin giải quyết.</div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="ic-empty">
                  <p>{t('incidents.error.loadFailed')}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Create drawer ──────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="ic-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="ic-drawer">
            <div className="ic-drawer__header">
              <h2 className="ic-drawer__title">{t('incidents.drawer.title')}</h2>
              <button type="button" className="ic-drawer__close" onClick={() => setDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="ic-drawer__body">
              <div className="ic-form-grid">
                <div className="ic-field">
                  <label className="ic-field__label">{t('incidents.form.incidentType')} *</label>
                  <input
                    className="ic-field__input"
                    value={form.incidentType}
                    onChange={(e) => setForm((c) => ({ ...c, incidentType: e.target.value }))}
                    required
                  />
                </div>

                <div className="ic-field">
                  <label className="ic-field__label">{t('incidents.form.severity')}</label>
                  <select
                    className="ic-field__select"
                    value={form.severity}
                    onChange={(e) => setForm((c) => ({ ...c, severity: e.target.value }))}
                  >
                    <option value="low">{t('incidents.severity.low')}</option>
                    <option value="medium">{t('incidents.severity.medium')}</option>
                    <option value="high">{t('incidents.severity.high')}</option>
                    <option value="critical">{t('incidents.severity.critical')}</option>
                  </select>
                </div>

                <div className="ic-field ic-field--horizontal">
                  <label className="ic-field__label">{t('incidents.form.incidentAt')} *</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="ic-field__input"
                      type="date"
                      value={(form.incidentAt && form.incidentAt.split('T')[0]) || ''}
                      disabled
                      aria-disabled
                    />
                    <input
                      className="ic-field__input"
                      type="time"
                      value={getIncidentTime()}
                      onChange={(e) => setIncidentTime(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{t('incidents.form.incidentAtHelp')}</div>
                </div>

                <div className="ic-field">
                  <label className="ic-field__label">{t('incidents.form.location')}</label>
                  <input
                    className="ic-field__input"
                    value={form.location}
                    onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))}
                  />
                </div>

                <div className="ic-field ic-field--multi-select">
                  <label className="ic-field__label">{t('incidents.form.resident')}</label>
                  
                  {/* Display selected residents as tags */}
                  {form.residentIds.length > 0 && (
                    <div className="ic-selected-tags">
                      {form.residentIds.map((residentId) => {
                        const resident = residents.find((r) => r._id === residentId);
                        if (!resident) return null;
                        return (
                          <div key={residentId} className="ic-tag">
                            <span className="ic-tag__name" title={formatResidentLabel(resident)}>
                              {formatResidentLabel(resident)}
                            </span>
                            <button
                              type="button"
                              className="ic-tag__remove"
                              onClick={() => toggleResident(residentId)}
                              title={t('incidents.form.removeResident') || 'Xóa'}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="ic-multi-select-filters">
                    <select
                      className="ic-field__select"
                      value={residentAreaFilter}
                      onChange={(e) => setResidentAreaFilter(e.target.value)}
                      disabled={optionsLoading}
                    >
                      <option value="">{t('incidents.form.filterResidentAreaAll')}</option>
                      {residentAreaOptions.map((area) => (
                        <option key={area.id} value={area.id}>{area.label}</option>
                      ))}
                    </select>
                    <input
                      type="search"
                      className="ic-multi-select-search"
                      placeholder={t('incidents.form.searchResident')}
                      value={residentSearch}
                      onChange={(e) => setResidentSearch(e.target.value)}
                      disabled={optionsLoading}
                    />
                  </div>
                  <div className="ic-multi-select-list">
                    {filteredResidents.length === 0 ? (
                      <div className="ic-multi-select-empty">{t('incidents.form.noResidents')}</div>
                    ) : (
                      filteredResidents.map((resident) => {
                        const isSelected = form.residentIds.includes(resident._id);
                        return (
                          <label key={resident._id} className="ic-multi-select-item">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleResident(resident._id)}
                              disabled={optionsLoading}
                            />
                            <div className="ic-multi-select-item__label">
                              <span className="ic-multi-select-item__name">{formatResidentLabel(resident)}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {canAssignHandlers && (
                  <div className="ic-field ic-field--multi-select">
                    <label className="ic-field__label">{t('incidents.form.assignedStaff')}</label>
                    
                    {/* Display selected staff as tags */}
                    {form.assignedStaffIds.length > 0 && (
                      <div className="ic-selected-tags">
                        {form.assignedStaffIds.map((staffId) => {
                          const staff = staffAccounts.find((s) => getStaffSelectionId(s) === staffId);
                          if (!staff) return null;
                          return (
                            <div key={staffId} className="ic-tag">
                              <span className="ic-tag__name" title={formatStaffLabel(staff)}>
                                {formatStaffLabel(staff)}
                              </span>
                              <button
                                type="button"
                                className="ic-tag__remove"
                                onClick={() => toggleAssignedStaff(staff)}
                                title={t('incidents.form.removeStaff') || 'Xóa'}
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="ic-multi-select-filters">
                      <select
                        className="ic-field__select"
                        value={areaFilter}
                        onChange={(e) => setAreaFilter(e.target.value)}
                        disabled={optionsLoading}
                      >
                        <option value="">{t('incidents.form.filterAreaAll')}</option>
                        {areaOptions.map((area) => (
                          <option key={area.id} value={area.id}>{area.label}</option>
                        ))}
                      </select>
                      <input
                        type="search"
                        className="ic-multi-select-search"
                        placeholder={t('incidents.form.searchStaff')}
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        disabled={optionsLoading}
                      />
                    </div>
                    <div className="ic-multi-select-list">
                      {filteredStaff.length === 0 ? (
                        <div className="ic-multi-select-empty">{t('incidents.form.noStaff')}</div>
                      ) : (
                        filteredStaff.map((staff) => {
                          const staffId = getStaffSelectionId(staff);
                          const isChecked = form.assignedStaffIds.includes(staffId);
                          const availabilityLabel = getStaffAvailabilityLabel(staff);
                          const conflictBadge = getStaffConflictBadge(staff);
                          const conflicted = isStaffConflicted(staff);
                          const itemClassName = `ic-multi-select-item${conflicted ? ' ic-multi-select-item--disabled' : ''}`;
                          return (
                            <label key={staff._id} className={itemClassName}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleAssignedStaff(staff)}
                                disabled={optionsLoading || conflicted}
                              />
                              <div className="ic-multi-select-item__label">
                                <span className="ic-multi-select-item__name">{formatStaffLabel(staff)}</span>
                                <span className={availabilityLabel.includes('Đang đi làm') ? 'ic-availability ic-availability--on' : 'ic-availability ic-availability--off'}>{availabilityLabel}</span>
                                {conflictBadge}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="ic-field ic-form-full">
                  <label className="ic-field__label">{t('incidents.form.description')} *</label>
                  <textarea
                    className="ic-field__textarea"
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="ic-drawer__footer" style={{ padding: 0, border: 'none', marginTop: 20 }}>
                <button type="button" className="ic-btn ic-btn--secondary" onClick={() => setDrawerOpen(false)}>
                  {t('incidents.form.cancel')}
                </button>
                <button type="submit" className="ic-btn ic-btn--primary" disabled={isSaving}>
                  <PlusCircle size={16} />
                  {isSaving ? t('incidents.form.saving') : t('incidents.createIncident')}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Assign Handlers Modal ─────────────────────────────── */}
      {assignHandlersOpen && (
        <>
          <div className="ic-drawer-overlay" onClick={() => { setAssignHandlersOpen(false); setSelectedHandlers([]); }} />
          <div className="ic-drawer">
            <div className="ic-drawer__header">
              <h2 className="ic-drawer__title">{t('incidents.assignHandlers')}</h2>
              <button type="button" className="ic-drawer__close" onClick={() => { setAssignHandlersOpen(false); setSelectedHandlers([]); }}>
                <X size={20} />
              </button>
            </div>
            <div className="ic-drawer__body">
              <div className="ic-form-grid">
                <div className="ic-field ic-form-full">
                  <label className="ic-field__label">{t('incidents.form.assignedStaff')} *</label>
                  <div className="ic-multi-select">
                    {staffAccounts.length > 0 ? (
                      staffAccounts.map((staff) => {
                        const availabilityLabel = getStaffAvailabilityLabel(staff);
                        const staffId = getStaffSelectionId(staff);
                        const conflicted = isStaffConflicted(staff);
                        const itemClassName = `ic-multi-select-item${conflicted ? ' ic-multi-select-item--disabled' : ''}`;
                        return (
                          <label key={staffId || staff._id || staff.id} className={itemClassName}>
                            <input
                              type="checkbox"
                              checked={selectedHandlers.includes(staffId)}
                              disabled={conflicted}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedHandlers([...selectedHandlers, staffId]);
                                } else {
                                  setSelectedHandlers(selectedHandlers.filter((s) => s !== staffId));
                                }
                              }}
                            />
                            <div className="ic-multi-select-item__label">
                              <span className="ic-multi-select-item__name">{formatStaffLabel(staff)}</span>
                              <span className={availabilityLabel.includes('Đang đi làm') ? 'ic-availability ic-availability--on' : 'ic-availability ic-availability--off'}>{availabilityLabel}</span>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <p style={{ color: '#666', padding: '10px' }}>{t('incidents.noStaff')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="ic-drawer__footer" style={{ padding: 0, border: 'none', marginTop: 20 }}>
              <button type="button" className="ic-btn ic-btn--secondary" onClick={() => { setAssignHandlersOpen(false); setSelectedHandlers([]); }}>
                {t('incidents.form.cancel')}
              </button>
              <button
                type="button"
                className="ic-btn ic-btn--primary"
                disabled={assigningHandlers || selectedHandlers.length === 0}
                onClick={handleAssignHandlers}
              >
                {assigningHandlers ? t('incidents.form.saving') : t('incidents.assignHandlers')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default IncidentManagementPage;
