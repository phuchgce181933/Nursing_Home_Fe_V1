import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  User,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';
import careAppointmentService from '../../../services/careAppointment.service';
import staffService from '../../../services/staff.service';
import residentService from '../../../services/resident.service';
import admissionService from '../../../services/admission.service';
import medicalRecordService from '../../../services/medicalRecord.service';
import '../../../styles/admin/CareAppointmentsPage.css';

const getStatusOptions = (t) => [
  { value: '', label: t('careAppointments.statusAll') },
  { value: 'scheduled', label: t('careAppointments.statusScheduled') },
  { value: 'in_progress', label: t('careAppointments.statusInProgress') },
  { value: 'completed', label: t('careAppointments.statusCompleted') },
  { value: 'cancelled', label: t('careAppointments.statusCancelled') },
];

// Mirrors STATUS_TRANSITIONS in backend services/careAppointmentService.js —
// keep in sync so the dropdown never offers a transition the API will reject.
const STATUS_TRANSITIONS = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const getStatusLabels = (t) => ({
  scheduled: t('careAppointments.statusLabelScheduled'),
  in_progress: t('careAppointments.statusLabelInProgress'),
  completed: t('careAppointments.statusLabelCompleted'),
  cancelled: t('careAppointments.statusLabelCancelled'),
});

// Domain values, not UI labels — stored as appointment data (matched by exact
// string elsewhere, e.g. the "Khám lâm sàng đầu vào" clinical-wizard trigger),
// so they intentionally stay in Vietnamese regardless of UI language.
const APPOINTMENT_TYPES = [
  'Khám lâm sàng đầu vào',
  'Khám tổng quát định kỳ',
  'Khám nội khoa chuyên sâu',
  'Đánh giá sức khỏe tinh thần',
  'Vật lý trị liệu',
  'Khác',
];

const formatEnglishDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
};

const formatTimeRange = (startStr, endStr) => {
  if (!startStr || !endStr) return '';
  try {
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
    const startText = s.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const endText = e.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${startText} - ${endText}`;
  } catch (e) {
    return '';
  }
};

export default function CareAppointmentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const userRole = user?.role || '';
  const isAdminRole = userRole === 'admin';
  const isMedicalRole = ['doctor', 'nurse'].includes(userRole);
  const STATUS_OPTIONS = getStatusOptions(t);
  const STATUS_LABELS = getStatusLabels(t);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Metrics counters
  const [metrics, setMetrics] = useState({
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
  });

  // Filter states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: '',
    from: '',
    to: '',
  });

  // Master data for modals
  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [availableNurses, setAvailableNurses] = useState([]);
  const [loadingAvailableStaff, setLoadingAvailableStaff] = useState(false);
  const [residentsList, setResidentsList] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(false);

  // Assign staff Modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedNurId, setSelectedNurId] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState(null);

  // Create/Edit Appointment Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formValues, setFormValues] = useState({
    residentId: '',
    scheduledStartAt: '',
    scheduledEndAt: '',
    appointmentType: 'Khám lâm sàng đầu vào',
    notes: '',
  });
  const [savingAppt, setSavingAppt] = useState(false);
  const [apptFormError, setApptFormError] = useState(null);

  // Delete Appointment Modal state (Admin only)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAppt, setDeletingAppt] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Update Status Modal state (for medical staff)
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetApptStatus, setTargetApptStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // Clinical Wizard state
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [activeAdmission, setActiveAdmission] = useState(null);
  const [loadingAdmission, setLoadingAdmission] = useState(false);
  // Realtime field-level errors for step 2
  const [step2FieldErrors, setStep2FieldErrors] = useState({});
  // Snapshot of old vitals loaded from API — used as fallback when a field is left blank
  const [prefilledVitals, setPrefilledVitals] = useState(null);
  // Track which step-2 fields the doctor has actually touched/changed
  const [step2Touched, setStep2Touched] = useState({});

  const initialWizardValues = {
    heightCm: '',
    weightKg: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    pulse: '',
    temperatureCelsius: '',
    oxygenSaturation: '',
    bloodSugar: '',
    bloodType: 'unknown',
    summary: '',
    consultationNotes: '',
    assessmentResult: '',
    eligibilityStatus: 'eligible',
    rejectionReason: '',
  };
  const [wizardValues, setWizardValues] = useState(initialWizardValues);

  // Fetch care appointments
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        residentId: appliedFilters.search || undefined, // or handled at BE search query
        status: appliedFilters.status || undefined,
        from: appliedFilters.from ? new Date(appliedFilters.from).toISOString() : undefined,
        to: appliedFilters.to ? new Date(appliedFilters.to).toISOString() : undefined,
      };

      let res;
      if (isMedicalRole) {
        // Medical staff can view their own appointments securely
        res = await careAppointmentService.getMyAppointments(params);
      } else {
        // Admin/Manager lists all care appointments
        res = await careAppointmentService.listAppointments(params);
      }

      const list = res?.data || [];
      setData(list);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);

      // Compute statistics metric values
      setMetrics({
        total: res?.total || list.length,
        scheduled: list.filter(x => x.status === 'scheduled').length,
        inProgress: list.filter(x => x.status === 'in_progress').length,
        completed: list.filter(x => x.status === 'completed').length,
      });

    } catch (err) {
      console.error('Failed to load care appointments:', err);
      setError(t('careAppointments.errorLoadList'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters, isMedicalRole, t]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Load master data for modals when Admin logged-in
  useEffect(() => {
    if (isAdminRole) {
      const loadMaster = async () => {
        try {
          setLoadingMaster(true);
          const [staffRes, resRes] = await Promise.all([
            staffService.getAll({ isActive: true, limit: 1000 }),
            residentService.listForAssignment({ status: 'admitted', limit: 1000 }),
          ]);

          const allStaff = staffRes?.data || [];
          const docs = allStaff.filter(x => x.role === 'doctor');
          const nurs = allStaff.filter(x => x.role === 'nurse');

          setDoctorsList(docs);
          setNursesList(nurs);
          setResidentsList(resRes?.data || []);
        } catch (err) {
          console.error('Failed to load master data for assignments:', err);
        } finally {
          setLoadingMaster(false);
        }
      };
      loadMaster();
    }
  }, [isAdminRole]);

  // Filters trigger
  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ search, status, from, to });
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
    setAppliedFilters({ search: '', status: '', from: '', to: '' });
  };

  // Open assign staff modal
  const handleOpenAssign = async (appt) => {
    setSelectedAppt(appt);
    setSelectedDocId(appt.doctorStaffId?._id || appt.doctorStaffId || '');
    setSelectedNurId(appt.nurseStaffId?._id || appt.nurseStaffId || '');
    setAssignmentError(null);
    setAvailableDoctors([]);
    setAvailableNurses([]);
    setShowAssignModal(true);

    try {
      setLoadingAvailableStaff(true);
      const res = await careAppointmentService.getAvailableStaff(
        appt.scheduledStartAt,
        appt.scheduledEndAt,
        appt._id
      );
      setAvailableDoctors(res.doctors || []);
      setAvailableNurses(res.nurses || []);
    } catch (err) {
      console.error('Failed to load available staff for slot:', err);
      const errMsg = err.response?.data?.message || t('careAppointments.assignErrorFallback');
      setAssignmentError(errMsg);
    } finally {
      setLoadingAvailableStaff(false);
    }
  };

  // Handle Save Staff assignment (Doctor & Nurse)
  const handleSaveAssignment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAppt) return;
    
    if (!selectedDocId || !selectedNurId) {
      setAssignmentError(t('adminAppointments.assignBothRequired'));
      showToast(t('adminAppointments.assignBothRequired'), 'error');
      return;
    }

    setSavingAssignment(true);
    setAssignmentError(null);

    try {
      // 1. Assign Doctor if changed
      const currentDoc = selectedAppt.doctorStaffId?._id || selectedAppt.doctorStaffId || '';
      if (selectedDocId !== currentDoc) {
        await careAppointmentService.assignDoctor(selectedAppt._id, selectedDocId || undefined);
      }

      // 2. Assign Nurse if changed
      const currentNur = selectedAppt.nurseStaffId?._id || selectedAppt.nurseStaffId || '';
      if (selectedNurId !== currentNur) {
        await careAppointmentService.assignNurse(selectedAppt._id, selectedNurId || undefined);
      }

      setShowAssignModal(false);
      setSelectedAppt(null);
      fetchAppointments();
      showToast(t('careAppointments.assignSuccess'), 'success');

    } catch (err) {
      console.error('Failed to save staff assignment:', err);
      // Grab detailed error message from backend (may already be localized server-side)
      const errMsg = err.response?.data?.message || t('careAppointments.assignErrorGeneric');
      setAssignmentError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setSavingAssignment(false);
    }
  };

  // Open Create Appointment Modal
  const handleOpenCreate = () => {
    setIsEditMode(false);
    setFormValues({
      residentId: '',
      scheduledStartAt: '',
      scheduledEndAt: '',
      appointmentType: 'Khám lâm sàng đầu vào',
      notes: '',
    });
    setApptFormError(null);
    setShowCreateModal(true);
  };

  // Open Edit Appointment Modal (Admin only)
  const handleOpenEdit = (appt) => {
    setIsEditMode(true);
    setSelectedAppt(appt);
    setFormValues({
      residentId: appt.residentId?._id || appt.residentId || '',
      scheduledStartAt: appt.scheduledStartAt ? appt.scheduledStartAt.slice(0, 16) : '',
      scheduledEndAt: appt.scheduledEndAt ? appt.scheduledEndAt.slice(0, 16) : '',
      appointmentType: appt.appointmentType || 'Khám lâm sàng đầu vào',
      notes: appt.notes || '',
    });
    setApptFormError(null);
    setShowCreateModal(true);
  };

  // Handle Save (Create/Edit) Appointment
  const handleSaveAppointment = async (e) => {
    if (e) e.preventDefault();
    setApptFormError(null);

    const start = new Date(formValues.scheduledStartAt);
    const end = new Date(formValues.scheduledEndAt);
    if (end <= start) {
      setApptFormError(t('careAppointments.endBeforeStartError'));
      return;
    }
    const diffMs = end.getTime() - start.getTime();
    if (diffMs > 24 * 60 * 60 * 1000) {
      setApptFormError(t('adminAppointments.durationMax24h'));
      return;
    }
    // On create, or when the start time is actually being changed on edit, block past times
    // client-side too — the backend enforces the same rule (see careAppointmentService.js).
    const originalStartAt = isEditMode && selectedAppt ? new Date(selectedAppt.scheduledStartAt) : null;
    const startTimeChanged = !originalStartAt || start.getTime() !== originalStartAt.getTime();
    if (startTimeChanged && start < new Date()) {
      setApptFormError(t('careAppointments.pastStartError'));
      return;
    }

    // ── Validate thêm cho loại "Khám lâm sàng đầu vào" ──
    if (formValues.appointmentType === 'Khám lâm sàng đầu vào') {
      // 1. Start và End phải cùng ngày
      const isSameDay =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate();

      if (!isSameDay) {
        setApptFormError(t('adminAppointments.sameDayRequired'));
        return;
      }

      // 3. Giờ bắt đầu và kết thúc phải trong khoảng 08:00 – 16:00
      const startHour = start.getHours();
      const startMin = start.getMinutes();
      const endHour = end.getHours();
      const endMin = end.getMinutes();

      if (startHour < 8 || startHour > 16 || (startHour === 16 && startMin > 0)) {
        setApptFormError(t('adminAppointments.startTimeRange'));
        return;
      }
      if (endHour < 8 || endHour > 16 || (endHour === 16 && endMin > 0)) {
        setApptFormError(t('adminAppointments.endTimeRange'));
        return;
      }
    }

    setSavingAppt(true);

    try {
      const payload = {
        residentId: formValues.residentId,
        scheduledStartAt: start.toISOString(),
        scheduledEndAt: end.toISOString(),
        appointmentType: formValues.appointmentType,
        notes: formValues.notes.trim() || undefined,
      };

      if (isEditMode && selectedAppt) {
        await careAppointmentService.updateAppointment(selectedAppt._id, payload);
      } else {
        await careAppointmentService.createAppointment(payload);
      }

      setShowCreateModal(false);
      setSelectedAppt(null);
      fetchAppointments();
      showToast(isEditMode ? t('careAppointments.updateSuccess') : t('careAppointments.createSuccess'), 'success');

    } catch (err) {
      console.error('Failed to save appointment:', err);
      const errMsg = err.response?.data?.message || t('careAppointments.saveErrorGeneric');
      setApptFormError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setSavingAppt(false);
    }
  };

  // Open Delete confirmation modal (Admin only)
  const handleOpenDelete = (appt) => {
    setSelectedAppt(appt);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  // Handle Delete Appointment
  const handleConfirmDelete = async () => {
    if (!selectedAppt) return;

    setDeletingAppt(true);
    setDeleteError(null);

    try {
      await careAppointmentService.deleteAppointment(selectedAppt._id);
      setShowDeleteModal(false);
      setSelectedAppt(null);
      fetchAppointments();
      showToast(t('careAppointments.deleteSuccess'), 'success');
    } catch (err) {
      console.error('Failed to delete appointment:', err);
      const errMsg = err.response?.data?.message || t('careAppointments.deleteErrorGeneric');
      setDeleteError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setDeletingAppt(false);
    }
  };

  // Open Status modal (for medical staff) or launch Clinical Wizard if clinical exam
  const handleOpenStatus = async (appt) => {
    if (appt.status !== 'completed') {
      const apptDate = new Date(appt.scheduledStartAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const apptDateOnly = new Date(apptDate);
      apptDateOnly.setHours(0, 0, 0, 0);

      if (apptDateOnly > today) {
        showToast(t('adminAppointments.appointmentNotYet'), 'error');
        return;
      }
    }

    setSelectedAppt(appt);
    const allowedNext = STATUS_TRANSITIONS[appt.status] || [];
    setTargetApptStatus(allowedNext[0] || '');
    setStatusError(null);

    if (appt.appointmentType === 'Khám lâm sàng đầu vào') {
      setLoadingAdmission(true);
      try {
        // Fetch the active or completed admission request for this resident using residentId filter
        const residentIdStr = appt.residentId?._id || appt.residentId;
        const residentIdParam = typeof residentIdStr === 'object' ? String(residentIdStr) : residentIdStr;
        const res = await admissionService.adminGetAdmissionList({
          residentId: residentIdParam,
          status: 'new_request,consulting,assessing,contracting,checked_in,cancelled',
          limit: 1,
        });

        // Fetch latest measured vitals if available
        let vitals = null;
        try {
          const vitalsRes = await medicalRecordService.getVitalsHistory(residentIdParam, { limit: 1 });
          if (vitalsRes?.data && vitalsRes.data.length > 0) {
            vitals = vitalsRes.data[0];
          }
        } catch (vErr) {
          console.error('Failed to load vitals history:', vErr);
        }

        // Save snapshot of old vitals for fallback logic
        setPrefilledVitals(vitals);
        // Reset touched state whenever wizard opens fresh
        setStep2Touched({});
        setStep2FieldErrors({});

        if (res?.data && res.data.length > 0) {
          const adm = res.data[0];
          setActiveAdmission(adm);
          setWizardValues({
            heightCm: vitals?.heightCm != null ? String(vitals.heightCm) : '',
            weightKg: vitals?.weightKg != null ? String(vitals.weightKg) : '',
            bloodPressureSystolic: vitals?.bloodPressureSystolic != null ? String(vitals.bloodPressureSystolic) : '',
            bloodPressureDiastolic: vitals?.bloodPressureDiastolic != null ? String(vitals.bloodPressureDiastolic) : '',
            pulse: vitals?.pulse != null ? String(vitals.pulse) : '',
            temperatureCelsius: vitals?.temperatureCelsius != null ? String(vitals.temperatureCelsius) : '',
            oxygenSaturation: vitals?.oxygenSaturation != null ? String(vitals.oxygenSaturation) : '',
            bloodSugar: vitals?.bloodSugar != null ? String(vitals.bloodSugar) : '',
            bloodType: adm.applicant?.bloodType || vitals?.bloodType || 'unknown',
            summary: vitals?.summary || adm.applicant?.initialHealthCondition || '',
            consultationNotes: adm.consultationNotes || '',
            assessmentResult: adm.assessmentResult || '',
            eligibilityStatus: ['eligible', 'not_eligible'].includes(adm.eligibilityStatus) ? adm.eligibilityStatus : 'eligible',
            rejectionReason: adm.rejectionReason || '',
          });
        } else {
          setActiveAdmission(null);
          setPrefilledVitals(null);
          setWizardValues(initialWizardValues);
        }
        setWizardStep(1);
        setShowWizardModal(true);
      } catch (err) {
        console.error('Failed to load admission details for clinical wizard:', err);
        setStatusError(t('careAppointments.admissionLoadError'));
        setShowStatusModal(true);
      } finally {
        setLoadingAdmission(false);
      }
    } else {
      setShowStatusModal(true);
    }
  };

  // Handle Update Status (Doctor/Nurse role) for normal appointments
  const handleUpdateStatus = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAppt) return;

    setUpdatingStatus(true);
    setStatusError(null);

    try {
      await careAppointmentService.updateStatus(selectedAppt._id, targetApptStatus);
      setShowStatusModal(false);
      setSelectedAppt(null);
      fetchAppointments();
      showToast(t('careAppointments.statusUpdateSuccess'), 'success');
    } catch (err) {
      console.error('Failed to update appointment status:', err);
      const errMsg = err.response?.data?.message || t('careAppointments.statusUpdateErrorGeneric');
      setStatusError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Validate một field đơn lẻ (dùng cho realtime + batch) ──────────────────
  const validateSingleField = (field, value, allValues) => {
    const vals = allValues || wizardValues;
    switch (field) {
      case 'heightCm': {
        if (!value && !prefilledVitals?.heightCm) return t('adminAppointments.heightRequired');
        if (value) {
          const h = parseFloat(value);
          if (isNaN(h) || h <= 0 || h > 300) return t('adminAppointments.heightInvalid');
        }
        return null;
      }
      case 'weightKg': {
        if (!value && !prefilledVitals?.weightKg) return t('adminAppointments.weightRequired');
        if (value) {
          const w = parseFloat(value);
          if (isNaN(w) || w <= 0 || w > 500) return t('adminAppointments.weightInvalid');
        }
        return null;
      }
      case 'temperatureCelsius': {
        if (!value && !prefilledVitals?.temperatureCelsius) return t('adminAppointments.temperatureRequired');
        if (value) {
          const temp = parseFloat(value);
          if (isNaN(temp) || temp < 30 || temp > 45) return t('adminAppointments.temperatureInvalid');
        }
        return null;
      }
      case 'bloodPressureSystolic': {
        const bpd = vals.bloodPressureDiastolic;
        if (value || bpd) {
          if (!value) return t('adminAppointments.systolicRequiredWithDiastolic');
          const sys = parseInt(value, 10);
          if (isNaN(sys) || sys <= 0 || sys > 300) return t('adminAppointments.systolicInvalid');
          if (bpd) {
            const dia = parseInt(bpd, 10);
            if (!isNaN(dia) && sys <= dia) return t('adminAppointments.systolicMustBeHigher');
          }
        }
        return null;
      }
      case 'bloodPressureDiastolic': {
        const bps = vals.bloodPressureSystolic;
        if (value || bps) {
          if (!value) return t('adminAppointments.diastolicRequiredWithSystolic');
          const dia = parseInt(value, 10);
          if (isNaN(dia) || dia <= 0 || dia > 300) return t('adminAppointments.diastolicInvalid');
          if (bps) {
            const sys = parseInt(bps, 10);
            if (!isNaN(sys) && sys <= dia) return t('adminAppointments.systolicMustBeHigher');
          }
        }
        return null;
      }
      case 'pulse': {
        if (value) {
          const p = parseInt(value, 10);
          if (isNaN(p) || p <= 0 || p > 300) return t('adminAppointments.pulseInvalid');
        }
        return null;
      }
      case 'oxygenSaturation': {
        if (value) {
          const spo2 = parseInt(value, 10);
          if (isNaN(spo2) || spo2 < 0 || spo2 > 100) return t('adminAppointments.oxygenInvalid');
        }
        return null;
      }
      case 'bloodSugar': {
        if (value) {
          const bs = parseFloat(value);
          if (isNaN(bs) || bs <= 0 || bs > 1000) return t('adminAppointments.bloodSugarInvalid');
        }
        return null;
      }
      default:
        return null;
    }
  };

  // Validate tất cả field step 2, trả về object lỗi { field: message }
  const validateStep2All = (vals) => {
    const v = vals || wizardValues;
    const fields = ['heightCm', 'weightKg', 'temperatureCelsius', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'pulse', 'oxygenSaturation', 'bloodSugar'];
    const errors = {};
    for (const f of fields) {
      const err = validateSingleField(f, v[f], v);
      if (err) errors[f] = err;
    }
    return errors;
  };

  // Legacy single-string validator kept for form submission (backward-compat)
  const validateStep2 = () => {
    const errors = validateStep2All();
    const firstKey = Object.keys(errors)[0];
    return firstKey ? errors[firstKey] : null;
  };

  // Handle clinical wizard form submission (vital signs + consultation + eligibility assessment)
  const handleWizardSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAppt) return;

    // Re-validate all step-2 fields before final submit
    const allErrors = validateStep2All();
    if (Object.keys(allErrors).length > 0) {
      setStep2FieldErrors(allErrors);
      setStatusError(Object.values(allErrors)[0]);
      setWizardStep(2);
      return;
    }

    setUpdatingStatus(true);
    setStatusError(null);

    // ── Helper: resolve value or fall back to old vitals ────────────────────
    // If user left a field empty, use the old value instead of saving null/undefined
    const resolveNum = (field, parseFn, currentVal) => {
      if (currentVal !== '' && currentVal != null) return parseFn(currentVal);
      const old = prefilledVitals?.[field];
      return old != null ? old : undefined;
    };

    try {
      const residentId = selectedAppt.residentId?._id || selectedAppt.residentId;
      const admissionId = activeAdmission?._id;

      // 1. Save vital signs (UC-9)
      // For each numeric field: use entered value, OR fall back to old vitals value, OR omit
      const vitalsBody = {
        heightCm:              resolveNum('heightCm',              parseFloat, wizardValues.heightCm),
        weightKg:              resolveNum('weightKg',              parseFloat, wizardValues.weightKg),
        bloodPressureSystolic: resolveNum('bloodPressureSystolic', (v) => parseInt(v, 10), wizardValues.bloodPressureSystolic),
        bloodPressureDiastolic:resolveNum('bloodPressureDiastolic',(v) => parseInt(v, 10), wizardValues.bloodPressureDiastolic),
        pulse:                 resolveNum('pulse',                 (v) => parseInt(v, 10), wizardValues.pulse),
        temperatureCelsius:    resolveNum('temperatureCelsius',    parseFloat, wizardValues.temperatureCelsius),
        oxygenSaturation:      resolveNum('oxygenSaturation',      (v) => parseInt(v, 10), wizardValues.oxygenSaturation),
        bloodSugar:            resolveNum('bloodSugar',            parseFloat, wizardValues.bloodSugar),
        bloodType: wizardValues.bloodType !== 'unknown' ? wizardValues.bloodType : undefined,
        summary: wizardValues.summary.trim() || undefined,
      };
      // Remove undefined keys to keep payload clean
      Object.keys(vitalsBody).forEach(k => vitalsBody[k] === undefined && delete vitalsBody[k]);

      await medicalRecordService.recordVitals(residentId, vitalsBody);

      // 2. Call Pre-admission Consultation API if admission request is present (UC-6.16)
      if (admissionId) {
        try {
          await admissionService.medicalRecordConsultation(admissionId, {
            consultationNotes: wizardValues.consultationNotes.trim() || t('adminAppointments.clinicalExamDefault'),
            notes: wizardValues.summary.trim() || undefined,
          });
        } catch (cErr) {
          console.warn('Admission consultation step skipped or already completed:', cErr);
        }

        // 3. Evaluate Eligibility if Bác sĩ role (UC-6.19)
        if (userRole === 'doctor') {
          try {
            await admissionService.medicalEvaluateEligibility(admissionId, {
              eligibilityStatus: wizardValues.eligibilityStatus,
              assessmentResult: wizardValues.assessmentResult.trim() || t('adminAppointments.assessmentDefault'),
              rejectionReason: wizardValues.eligibilityStatus === 'not_eligible' ? (wizardValues.rejectionReason.trim() || undefined) : undefined,
              notes: wizardValues.summary.trim() || undefined,
            });
          } catch (eErr) {
            console.warn('Admission eligibility step skipped or already completed:', eErr);
          }
        }
      }

      // 4. Mark appointment complete once the clinical exam workflow is finished.
      if (selectedAppt?.status && selectedAppt.status !== 'completed') {
        if (selectedAppt.status === 'scheduled') {
          await careAppointmentService.updateStatus(selectedAppt._id, 'in_progress');
        }
        await careAppointmentService.updateStatus(selectedAppt._id, 'completed');
      }

      setShowWizardModal(false);
      setSelectedAppt(null);
      fetchAppointments();
      showToast(t('adminAppointments.wizardSaveSuccess'), 'success');
    } catch (err) {
      console.error('Failed to complete clinical wizard:', err);
      const errMsg = err.response?.data?.message || t('adminAppointments.wizardSaveError');
      setStatusError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="cap-container">
      {/* Page Header */}
      <div className="cap-header">
        <div>
          <h1>
            <Calendar className="text-navy-deep" size={26} />
            {t('careAppointments.pageTitle')}
          </h1>
          <p>
            {isAdminRole
              ? t('careAppointments.subtitleAdmin')
              : t('careAppointments.subtitleStaff')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchAppointments} disabled={loading} className="cap-btn-refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('careAppointments.refresh')}
          </button>
          {isAdminRole && (
            <button onClick={handleOpenCreate} className="cap-btn-primary">
              <Plus size={16} />
              {t('careAppointments.createAppointment')}
            </button>
          )}
        </div>
      </div>

      {/* Metrics widgets */}
      <div className="cap-metrics-grid">
        <div className="cap-card-stat">
          <div className="cap-stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
            <Calendar size={22} />
          </div>
          <div>
            <span className="cap-stat-label">{t('careAppointments.statTotal')}</span>
            <span className="cap-stat-value">{metrics.total}</span>
          </div>
        </div>

        <div className="cap-card-stat">
          <div className="cap-stat-icon" style={{ backgroundColor: 'rgba(15, 118, 110, 0.08)', color: '#0f766e' }}>
            <Clock size={22} />
          </div>
          <div>
            <span className="cap-stat-label">{t('careAppointments.statScheduled')}</span>
            <span className="cap-stat-value">{metrics.scheduled}</span>
          </div>
        </div>

        <div className="cap-card-stat">
          <div className="cap-stat-icon" style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
            <Activity size={22} />
          </div>
          <div>
            <span className="cap-stat-label">{t('careAppointments.statInProgress')}</span>
            <span className="cap-stat-value">{metrics.inProgress}</span>
          </div>
        </div>

        <div className="cap-card-stat">
          <div className="cap-stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#047857' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <span className="cap-stat-label">{t('careAppointments.statCompleted')}</span>
            <span className="cap-stat-value">{metrics.completed}</span>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="cap-filter-panel">
        <form onSubmit={handleApplyFilters}>
          <div className="cap-filter-grid">
            <div className="cap-filter-group">
              <div className="cap-filter-input-wrapper">
                <Search className="cap-filter-input-icon" size={16} />
                <input
                  type="text"
                  className="cap-filter-input"
                  placeholder={t('careAppointments.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="cap-filter-group">
              <select
                className="cap-filter-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="cap-filter-row-secondary">
            <div className="cap-filter-date-group">
              <span className="cap-date-title">
                <Calendar size={13} className="text-slate-400" /> {t('careAppointments.dateRangeLabel')}
              </span>
              <input
                type="date"
                className="cap-date-input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-slate-400 text-xs font-semibold">{t('careAppointments.dateRangeTo')}</span>
              <input
                type="date"
                className="cap-date-input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="cap-filter-actions">
              <button type="button" onClick={handleResetFilters} className="cap-btn-clear">
                {t('careAppointments.clearFilters')}
              </button>
              <button type="submit" className="cap-btn-apply">
                {t('careAppointments.applyFilters')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Table grid */}
      <div className="cap-table-card">
        {loading && data.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center bg-white" style={{ minHeight: '300px' }}>
            <RefreshCw className="animate-spin text-emerald-sage mb-3" size={32} />
            <p className="text-slate-500 text-sm">{t('careAppointments.loadingList')}</p>
          </div>
        ) : error ? (
          <div className="p-10 flex flex-col items-center justify-center text-center bg-white" style={{ minHeight: '300px' }}>
            <AlertCircle className="text-red-500 mb-3" size={36} />
            <p className="text-slate-800 font-bold mb-1">{t('careAppointments.errorTitle')}</p>
            <p className="text-slate-500 text-sm max-w-md">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center bg-white" style={{ minHeight: '300px' }}>
            <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-3" style={{ width: 'fit-content' }}>
              <Calendar size={30} />
            </div>
            <p className="text-slate-700 font-bold mb-1">{t('careAppointments.emptyTitle')}</p>
            <p className="text-slate-400 text-xs max-w-sm">
              {t('careAppointments.emptyHint')}
            </p>
          </div>
        ) : (
          <div className="cap-table-responsive">
            <table className="cap-table">
              <thead>
                <tr>
                  <th>{t('careAppointments.colResident')}</th>
                  <th>{t('careAppointments.colTime')}</th>
                  <th>{t('careAppointments.colType')}</th>
                  <th>{t('careAppointments.colDoctor')}</th>
                  <th>{t('careAppointments.colNurse')}</th>
                  <th style={{ textAlign: 'center' }}>{t('careAppointments.colStatus')}</th>
                  <th style={{ textAlign: 'center' }}>{t('careAppointments.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row._id} className="cap-table-row">
                    <td>
                      <div className="cap-resident-info">
                        <span className="cap-resident-name">{row.residentId?.fullName || t('careAppointments.unknownResident')}</span>
                        <span className="cap-resident-code">#{row.residentId?.residentCode || row.residentId?._id || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500', color: '#1e293b' }}>
                        {formatEnglishDate(row.scheduledStartAt)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {formatTimeRange(row.scheduledStartAt, row.scheduledEndAt)}
                      </div>
                    </td>
                    <td style={{ fontWeight: '600', color: '#475569' }}>
                      {row.appointmentType}
                      {row.appointmentType === 'Khám lâm sàng đầu vào' && (
                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#0f766e' }}>
                          {t('careAppointments.clinicalExamNote')}
                        </div>
                      )}
                    </td>
                    <td>
                      {(row.doctorStaffId?.userId?.fullName || row.doctorStaffId?.fullName) ? (
                        <div className="cap-staff-badge">
                          <User size={12} />
                          {row.doctorStaffId.userId?.fullName || row.doctorStaffId.fullName}
                        </div>
                      ) : (
                        <div className="cap-staff-badge is-unassigned">{t('careAppointments.unassigned')}</div>
                      )}
                    </td>
                    <td>
                      {(row.nurseStaffId?.userId?.fullName || row.nurseStaffId?.fullName) ? (
                        <div className="cap-staff-badge">
                          <User size={12} />
                          {row.nurseStaffId.userId?.fullName || row.nurseStaffId.fullName}
                        </div>
                      ) : (
                        <div className="cap-staff-badge is-unassigned">{t('careAppointments.unassigned')}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`cap-badge-status cap-status-${row.status.replace(/_/g, '-')}`}>
                        {STATUS_LABELS[row.status] || row.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {isAdminRole && (
                          <>
                            <button
                              onClick={() => handleOpenAssign(row)}
                              className="cap-btn-action"
                              title={t('careAppointments.actionAssign')}
                              disabled={['completed', 'cancelled'].includes(row.status)}
                            >
                              <UserCheck size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(row)}
                              className="cap-btn-action"
                              title={t('careAppointments.actionEdit')}
                              disabled={['completed', 'cancelled'].includes(row.status)}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(row)}
                              className="cap-btn-action cap-btn-action--danger"
                              title={t('careAppointments.actionDelete')}
                              disabled={['completed', 'cancelled', 'in_progress'].includes(row.status)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                        {isMedicalRole && (
                          <button
                            onClick={() => handleOpenStatus(row)}
                            className="cap-btn-action"
                            title={row.appointmentType === 'Khám lâm sàng đầu vào'
                              ? (row.status === 'completed'
                                ? t('careAppointments.actionViewClinicalResult')
                                : t('careAppointments.actionOpenWizard'))
                              : (row.status === 'completed'
                                ? t('careAppointments.actionViewResult')
                                : t('careAppointments.actionUpdateStatus'))
                            }
                            disabled={row.status === 'cancelled'}
                          >
                            {row.status === 'completed' ? <Eye size={14} /> : <Activity size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="cap-filter-row-secondary" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              {t('careAppointments.paginationShowing', {
                from: (page - 1) * limit + 1,
                to: Math.min(page * limit, total),
                total,
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="cap-btn-clear"
                style={{ padding: '6px 12px' }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '13px', color: '#475569' }}>
                {t('careAppointments.paginationPage', { page, totalPages })}
              </span>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="cap-btn-clear"
                style={{ padding: '6px 12px' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: CHỈ ĐỊNH BÁC SĨ & Y TÁ (ASSIGN STAFF) */}
      {showAssignModal && selectedAppt && (
        <div className="cap-modal-backdrop" onClick={() => setShowAssignModal(false)}>
          <div className="cap-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="cap-modal__title">{t('careAppointments.assignTitle')}</h4>
            <p className="cap-modal__text">
              {t('careAppointments.assignText', { name: selectedAppt.residentId?.fullName })}
            </p>

            {assignmentError && (
              <div className="cap-error-banner">
                <AlertCircle size={16} />
                <span>{assignmentError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAssignment}>
              <div className="cap-form-group">
                <label className="cap-form-label">{t('careAppointments.chooseDoctorLabel')}</label>
                <select
                  className="cap-filter-select"
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  disabled={loadingAvailableStaff}
                >
                  {loadingAvailableStaff ? (
                    <option value="">{t('careAppointments.loadingDoctors')}</option>
                  ) : (
                    <>
                      <option value="">{t('careAppointments.noDoctorOption')}</option>
                      {availableDoctors.map((doc) => (
                        <option key={doc._id} value={doc._id}>
                          {doc.fullName} ({doc.specialty || t('careAppointments.generalPractice')})
                        </option>
                      ))}
                      {selectedAppt.doctorStaffId && !availableDoctors.some(d => d._id === (selectedAppt.doctorStaffId._id || selectedAppt.doctorStaffId)) && (
                        <option key={selectedAppt.doctorStaffId._id || selectedAppt.doctorStaffId} value={selectedAppt.doctorStaffId._id || selectedAppt.doctorStaffId}>
                          {selectedAppt.doctorStaffId.userId?.fullName || selectedAppt.doctorStaffId.fullName || t('careAppointments.currentDoctorFallback')} {t('careAppointments.notOnShift')}
                        </option>
                      )}
                    </>
                  )}
                </select>
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">{t('careAppointments.chooseNurseLabel')}</label>
                <select
                  className="cap-filter-select"
                  value={selectedNurId}
                  onChange={(e) => setSelectedNurId(e.target.value)}
                  disabled={loadingAvailableStaff}
                >
                  {loadingAvailableStaff ? (
                    <option value="">{t('careAppointments.loadingNurses')}</option>
                  ) : (
                    <>
                      <option value="">{t('careAppointments.noNurseOption')}</option>
                      {availableNurses.map((nur) => (
                        <option key={nur._id} value={nur._id}>
                          {nur.fullName}
                        </option>
                      ))}
                      {selectedAppt.nurseStaffId && !availableNurses.some(n => n._id === (selectedAppt.nurseStaffId._id || selectedAppt.nurseStaffId)) && (
                        <option key={selectedAppt.nurseStaffId._id || selectedAppt.nurseStaffId} value={selectedAppt.nurseStaffId._id || selectedAppt.nurseStaffId}>
                          {selectedAppt.nurseStaffId.userId?.fullName || selectedAppt.nurseStaffId.fullName || t('careAppointments.currentNurseFallback')} {t('careAppointments.notOnShift')}
                        </option>
                      )}
                    </>
                  )}
                </select>
              </div>

              <div className="cap-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="cap-modal-btn-cancel"
                  disabled={savingAssignment}
                >
                  {t('careAppointments.cancel')}
                </button>
                <button
                  type="submit"
                  className="cap-modal-btn-submit"
                  disabled={savingAssignment}
                >
                  {savingAssignment ? (
                    <>
                      <Loader2 className="animate-spin mr-1" size={13} />
                      {t('careAppointments.assigning')}
                    </>
                  ) : (
                    t('careAppointments.confirmAssign')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: XÁC NHẬN XÓA LỊCH HẸN (DELETE CONFIRMATION) */}
      {showDeleteModal && selectedAppt && (
        <div className="cap-modal-backdrop" onClick={() => !deletingAppt && setShowDeleteModal(false)}>
          <div className="cap-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="cap-modal__title">{t('careAppointments.deleteTitle')}</h4>
            <p className="cap-modal__text">
              {t('careAppointments.deleteText', {
                name: selectedAppt.residentId?.fullName,
                date: formatEnglishDate(selectedAppt.scheduledStartAt),
                time: formatTimeRange(selectedAppt.scheduledStartAt, selectedAppt.scheduledEndAt),
              })}
            </p>

            {deleteError && (
              <div className="cap-error-banner">
                <AlertCircle size={16} />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="cap-modal-footer">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="cap-modal-btn-cancel"
                disabled={deletingAppt}
              >
                {t('careAppointments.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="cap-modal-btn-submit cap-modal-btn-submit--danger"
                disabled={deletingAppt}
              >
                {deletingAppt ? (
                  <>
                    <Loader2 className="animate-spin mr-1" size={13} />
                    {t('careAppointments.deleting')}
                  </>
                ) : (
                  t('careAppointments.confirmDelete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TẠO/SỬA LỊCH HẸN KHÁM (CREATE/EDIT APPOINTMENT) */}
      {showCreateModal && (
        <div className="cap-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="cap-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="cap-modal__title">
              {isEditMode ? t('careAppointments.editTitle') : t('careAppointments.createTitleModal')}
            </h4>
            <p className="cap-modal__text">
              {t('careAppointments.formSubtitle')}
            </p>

            {apptFormError && (
              <div className="cap-error-banner">
                <AlertCircle size={16} />
                <span>{apptFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAppointment}>
              {!isEditMode && (
                <div className="cap-form-group">
                  <label className="cap-form-label">{t('careAppointments.chooseResidentLabel')}</label>
                  <select
                    className="cap-filter-select"
                    value={formValues.residentId}
                    onChange={(e) => setFormValues(prev => ({ ...prev, residentId: e.target.value }))}
                    required
                  >
                    <option value="">{t('careAppointments.chooseResidentPlaceholder')}</option>
                    {residentsList.map((res) => (
                      <option key={res._id} value={res._id}>
                        {res.fullName} (#{res.residentCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="cap-form-group">
                <label className="cap-form-label">{t('careAppointments.appointmentTypeLabel')}</label>
                <select
                  className="cap-filter-select"
                  value={formValues.appointmentType}
                  onChange={(e) => setFormValues(prev => ({ ...prev, appointmentType: e.target.value }))}
                  required
                >
                  {APPOINTMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">{t('careAppointments.startTimeLabel')}</label>
                <input
                  type="datetime-local"
                  className="cap-form-input"
                  value={formValues.scheduledStartAt}
                  onChange={(e) => setFormValues(prev => ({ ...prev, scheduledStartAt: e.target.value }))}
                  min={!isEditMode ? new Date().toISOString().slice(0, 16) : undefined}
                  required
                />
                {formValues.appointmentType === 'Khám lâm sàng đầu vào' && (
                  <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {t('adminAppointments.clinicalStartTimeNote')}
                  </small>
                )}
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">{t('careAppointments.endTimeLabel')}</label>
                <input
                  type="datetime-local"
                  className="cap-form-input"
                  value={formValues.scheduledEndAt}
                  onChange={(e) => setFormValues(prev => ({ ...prev, scheduledEndAt: e.target.value }))}
                  min={formValues.scheduledStartAt || (!isEditMode ? new Date().toISOString().slice(0, 16) : undefined)}
                  required
                />
                {formValues.appointmentType === 'Khám lâm sàng đầu vào' && (
                  <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {t('adminAppointments.clinicalEndTimeNote')}
                  </small>
                )}
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">{t('careAppointments.notesLabel')}</label>
                <textarea
                  className="cap-form-input"
                  style={{ minHeight: '60px', fontFamily: 'inherit' }}
                  placeholder={t('careAppointments.notesPlaceholder')}
                  value={formValues.notes}
                  onChange={(e) => setFormValues(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="cap-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="cap-modal-btn-cancel"
                  disabled={savingAppt}
                >
                  {t('careAppointments.cancel')}
                </button>
                <button
                  type="submit"
                  className="cap-modal-btn-submit"
                  disabled={savingAppt}
                >
                  {savingAppt ? (
                    <>
                      <Loader2 className="animate-spin mr-1" size={13} />
                      {t('careAppointments.saving')}
                    </>
                  ) : (
                    t('careAppointments.saveAppointment')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CẬP NHẬT TRẠNG THÁI (UPDATE STATUS FOR MEDICAL STAFF) */}
      {showStatusModal && selectedAppt && (
        <div className="cap-modal-backdrop" onClick={() => setShowStatusModal(false)}>
          <div className="cap-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="cap-modal__title">{t('careAppointments.statusModalTitle')}</h4>
            <p className="cap-modal__text">
              {t('careAppointments.statusModalText', { name: selectedAppt.residentId?.fullName })}
            </p>

            {statusError && (
              <div className="cap-error-banner">
                <AlertCircle size={16} />
                <span>{statusError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStatus}>
              <div className="cap-form-group">
                <label className="cap-form-label">
                  {t('careAppointments.currentStatusLabel', { status: STATUS_LABELS[selectedAppt.status] || selectedAppt.status })}
                </label>
                {(() => {
                  const allowedNext = STATUS_TRANSITIONS[selectedAppt.status] || [];
                  if (allowedNext.length === 0) {
                    return (
                      <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                        {t('careAppointments.terminalStatusNote')}
                      </p>
                    );
                  }
                  return (
                    <select
                      className="cap-filter-select"
                      value={targetApptStatus}
                      onChange={(e) => setTargetApptStatus(e.target.value)}
                      required
                    >
                      {allowedNext.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              <div className="cap-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="cap-modal-btn-cancel"
                  disabled={updatingStatus}
                >
                  {t('careAppointments.cancel')}
                </button>
                {(STATUS_TRANSITIONS[selectedAppt.status] || []).length > 0 && (
                  <button
                    type="submit"
                    className="cap-modal-btn-submit"
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? (
                      <>
                        <Loader2 className="animate-spin mr-1" size={13} />
                        {t('careAppointments.updating')}
                      </>
                    ) : (
                      t('careAppointments.confirmUpdate')
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CLINICAL CHECK-UP WIZARD MODAL (QUY TRÌNH KHÁM LÂM SÀNG ĐẦU VÀO) */}
      {showWizardModal && selectedAppt && (
        <div className="cap-modal-backdrop" onClick={() => !updatingStatus && setShowWizardModal(false)}>
          <div className="cap-modal" style={{ maxWidth: '650px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 className="cap-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Activity className="text-[#1b365d]" size={20} />
                {t('adminAppointments.wizardTitle')}
              </h4>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                {t('adminAppointments.wizardStep', { step: wizardStep })}
              </span>
            </div>

            {/* Step indicator progress bar */}
            <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '20px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ flex: 1, backgroundColor: wizardStep >= 1 ? '#1b365d' : '#e2e8f0' }} />
              <div style={{ flex: 1, backgroundColor: wizardStep >= 2 ? '#1b365d' : '#e2e8f0' }} />
              <div style={{ flex: 1, backgroundColor: wizardStep >= 3 ? '#1b365d' : '#e2e8f0' }} />
            </div>

            {statusError && (
              <div className="cap-error-banner">
                <AlertCircle size={16} />
                <span>{statusError}</span>
              </div>
            )}

            <form onSubmit={handleWizardSubmit}>
              {/* STEP 1: Applicant Profile View */}
              {wizardStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#1b365d' }}>
                      {t('adminAppointments.wizardStep1Title')}
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>{t('adminAppointments.wizardFullName')}</span>
                        <strong style={{ color: '#1e293b' }}>{selectedAppt.residentId?.fullName || activeAdmission?.applicant?.fullName}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>{t('adminAppointments.wizardResidentCode')}</span>
                        <strong style={{ color: '#1e293b' }}>#{selectedAppt.residentId?.residentCode || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>{t('adminAppointments.wizardDob')}</span>
                        <strong style={{ color: '#1e293b' }}>
                          {activeAdmission?.applicant?.dateOfBirth
                            ? new Date(activeAdmission.applicant.dateOfBirth).toLocaleDateString('vi-VN')
                            : t('adminAppointments.notUpdated')}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>{t('adminAppointments.wizardGender')}</span>
                        <strong style={{ color: '#1e293b' }}>
                          {activeAdmission?.applicant?.gender === 'male' ? t('adminAppointments.male')
                            : activeAdmission?.applicant?.gender === 'female' ? t('adminAppointments.female') : 'N/A'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>{t('adminAppointments.wizardBloodType')}</span>
                        <strong style={{ color: '#1e293b' }}>{activeAdmission?.applicant?.bloodType || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>{t('adminAppointments.wizardAddress')}</span>
                        <strong style={{ color: '#1e293b' }}>{activeAdmission?.applicant?.personalAddress || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
                        {t('adminAppointments.wizardAllergies')}
                      </span>
                      {activeAdmission?.applicant?.allergies && activeAdmission.applicant.allergies.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {activeAdmission.applicant.allergies.map((alg, index) => (
                            <span key={index} style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                              {alg}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>{t('adminAppointments.noAllergies')}</span>
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
                        {t('adminAppointments.wizardChronicConditions')}
                      </span>
                      {activeAdmission?.applicant?.chronicConditions && activeAdmission.applicant.chronicConditions.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {activeAdmission.applicant.chronicConditions.map((cond, index) => (
                            <span key={index} style={{ backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                              {cond}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>{t('adminAppointments.noChronicConditions')}</span>
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
                        {t('adminAppointments.wizardInitialHealth')}
                      </span>
                      <div style={{ backgroundColor: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #64748b', fontSize: '13px', color: '#334155', fontStyle: 'italic', lineHeight: '1.4' }}>
                        "{activeAdmission?.applicant?.initialHealthCondition || t('adminAppointments.noHealthInfo')}"
                      </div>
                    </div>
                  </div>

                  <div className="cap-modal-footer">
                    <button type="button" className="cap-modal-btn-cancel" onClick={() => setShowWizardModal(false)}>
                      {selectedAppt?.status === 'completed' ? t('adminAppointments.close') : t('careAppointments.cancel')}
                    </button>
                    <button type="button" className="cap-modal-btn-submit" onClick={() => setWizardStep(2)}>
                      {t('adminAppointments.wizardStep1Next')}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Record Vitals & Indicators */}
              {wizardStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Info banner: prefilled from old vitals */}
                  {prefilledVitals && (
                    <div style={{
                      backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
                      borderRadius: 8, padding: '10px 14px',
                      fontSize: 12, color: '#1e40af', display: 'flex', gap: 8, alignItems: 'flex-start'
                    }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
                      <span>
                        {t('adminAppointments.prefilledNoteP1')}<strong>{t('adminAppointments.prefilledNoteP1Bold')}</strong>
                        {t('adminAppointments.prefilledNoteP2')}<strong>{t('adminAppointments.prefilledNoteP2Bold')}</strong>
                        {t('adminAppointments.prefilledNoteP3')}
                      </span>
                    </div>
                  )}

                  {/* Helper to render a single vitals input with realtime validation */}
                  {(() => {
                    const handleVitalsChange = (field, value) => {
                      setWizardValues(prev => {
                        const next = { ...prev, [field]: value };
                        // Realtime validate this field (and cross-validate BP pair)
                        const err = validateSingleField(field, value, next);
                        const pairField = field === 'bloodPressureSystolic' ? 'bloodPressureDiastolic'
                          : field === 'bloodPressureDiastolic' ? 'bloodPressureSystolic' : null;
                        setStep2FieldErrors(prevErr => {
                          const updated = { ...prevErr };
                          if (err) updated[field] = err; else delete updated[field];
                          // Re-validate paired BP field
                          if (pairField) {
                            const pairErr = validateSingleField(pairField, next[pairField], next);
                            if (pairErr) updated[pairField] = pairErr; else delete updated[pairField];
                          }
                          return updated;
                        });
                        setStep2Touched(prev2 => ({ ...prev2, [field]: true }));
                        return next;
                      });
                    };

                    const inputStyle = (field) => ({
                      borderColor: step2FieldErrors[field] ? '#ef4444' : undefined,
                      boxShadow: step2FieldErrors[field] ? '0 0 0 2px rgba(239,68,68,0.15)' : undefined,
                    });

                    const oldHint = (field) => {
                      if (!wizardValues[field] && prefilledVitals?.[field] != null) {
                        return (
                          <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                            {t('adminAppointments.oldValueHint')}<strong>{prefilledVitals[field]}</strong>
                          </span>
                        );
                      }
                      return null;
                    };

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                        {/* Chiều cao */}
                        <div className="cap-form-group" style={{ marginBottom: 0 }}>
                          <label className="cap-form-label">{t('adminAppointments.heightLabel')}</label>
                          <input
                            type="number" className="cap-form-input"
                            placeholder={t('adminAppointments.heightPlaceholder')}
                            value={wizardValues.heightCm}
                            onChange={(e) => handleVitalsChange('heightCm', e.target.value)}
                            min="0"
                            disabled={selectedAppt?.status === 'completed'}
                            style={inputStyle('heightCm')}
                          />
                          {step2FieldErrors.heightCm
                            ? <span style={{ fontSize: 11, color: '#ef4444' }}>{step2FieldErrors.heightCm}</span>
                            : oldHint('heightCm')}
                        </div>

                        {/* Cân nặng */}
                        <div className="cap-form-group" style={{ marginBottom: 0 }}>
                          <label className="cap-form-label">{t('adminAppointments.weightLabel')}</label>
                          <input
                            type="number" className="cap-form-input"
                            placeholder={t('adminAppointments.weightPlaceholder')}
                            value={wizardValues.weightKg}
                            onChange={(e) => handleVitalsChange('weightKg', e.target.value)}
                            min="0"
                            disabled={selectedAppt?.status === 'completed'}
                            style={inputStyle('weightKg')}
                          />
                          {step2FieldErrors.weightKg
                            ? <span style={{ fontSize: 11, color: '#ef4444' }}>{step2FieldErrors.weightKg}</span>
                            : oldHint('weightKg')}
                        </div>

                        {/* Huyết áp Systolic */}
                        <div className="cap-form-group" style={{ marginBottom: 0 }}>
                          <label className="cap-form-label">{t('adminAppointments.systolicLabel')}</label>
                          <input
                            type="number" className="cap-form-input"
                            placeholder={t('adminAppointments.systolicPlaceholder')}
                            value={wizardValues.bloodPressureSystolic}
                            onChange={(e) => handleVitalsChange('bloodPressureSystolic', e.target.value)}
                            disabled={selectedAppt?.status === 'completed'}
                            style={inputStyle('bloodPressureSystolic')}
                          />
                          {step2FieldErrors.bloodPressureSystolic
                            ? <span style={{ fontSize: 11, color: '#ef4444' }}>{step2FieldErrors.bloodPressureSystolic}</span>
                            : oldHint('bloodPressureSystolic')}
                        </div>

                        {/* Huyết áp Diastolic */}
                        <div className="cap-form-group" style={{ marginBottom: 0 }}>
                          <label className="cap-form-label">{t('adminAppointments.diastolicLabel')}</label>
                          <input
                            type="number" className="cap-form-input"
                            placeholder={t('adminAppointments.diastolicPlaceholder')}
                            value={wizardValues.bloodPressureDiastolic}
                            onChange={(e) => handleVitalsChange('bloodPressureDiastolic', e.target.value)}
                            disabled={selectedAppt?.status === 'completed'}
                            style={inputStyle('bloodPressureDiastolic')}
                          />
                          {step2FieldErrors.bloodPressureDiastolic
                            ? <span style={{ fontSize: 11, color: '#ef4444' }}>{step2FieldErrors.bloodPressureDiastolic}</span>
                            : oldHint('bloodPressureDiastolic')}
                        </div>

                        {/* Nhịp tim */}
                        <div className="cap-form-group" style={{ marginBottom: 0 }}>
                          <label className="cap-form-label">{t('adminAppointments.pulseLabel')}</label>
                          <input
                            type="number" className="cap-form-input"
                            placeholder={t('adminAppointments.pulsePlaceholder')}
                            value={wizardValues.pulse}
                            onChange={(e) => handleVitalsChange('pulse', e.target.value)}
                            disabled={selectedAppt?.status === 'completed'}
                            style={inputStyle('pulse')}
                          />
                          {step2FieldErrors.pulse
                            ? <span style={{ fontSize: 11, color: '#ef4444' }}>{step2FieldErrors.pulse}</span>
                            : oldHint('pulse')}
                        </div>

                        {/* Nhiệt độ */}
                        <div className="cap-form-group" style={{ marginBottom: 0 }}>
                          <label className="cap-form-label">{t('adminAppointments.temperatureLabel')}</label>
                          <input
                            type="number" step="0.1" className="cap-form-input"
                            placeholder={t('adminAppointments.temperaturePlaceholder')}
                            value={wizardValues.temperatureCelsius}
                            onChange={(e) => handleVitalsChange('temperatureCelsius', e.target.value)}
                            disabled={selectedAppt?.status === 'completed'}
                            style={inputStyle('temperatureCelsius')}
                          />
                          {step2FieldErrors.temperatureCelsius
                            ? <span style={{ fontSize: 11, color: '#ef4444' }}>{step2FieldErrors.temperatureCelsius}</span>
                            : oldHint('temperatureCelsius')}
                        </div>

                        {/* SpO2 */}
                        <div className="cap-form-group" style={{ marginBottom: 0 }}>
                          <label className="cap-form-label">{t('adminAppointments.oxygenLabel')}</label>
                          <input
                            type="number" className="cap-form-input"
                            placeholder={t('adminAppointments.oxygenPlaceholder')}
                            value={wizardValues.oxygenSaturation}
                            onChange={(e) => handleVitalsChange('oxygenSaturation', e.target.value)}
                            disabled={selectedAppt?.status === 'completed'}
                            style={inputStyle('oxygenSaturation')}
                          />
                          {step2FieldErrors.oxygenSaturation
                            ? <span style={{ fontSize: 11, color: '#ef4444' }}>{step2FieldErrors.oxygenSaturation}</span>
                            : oldHint('oxygenSaturation')}
                        </div>

                        {/* Đường huyết */}
                        <div className="cap-form-group" style={{ marginBottom: 0 }}>
                          <label className="cap-form-label">{t('adminAppointments.bloodSugarLabel')}</label>
                          <input
                            type="number" className="cap-form-input"
                            placeholder={t('adminAppointments.bloodSugarPlaceholder')}
                            value={wizardValues.bloodSugar}
                            onChange={(e) => handleVitalsChange('bloodSugar', e.target.value)}
                            disabled={selectedAppt?.status === 'completed'}
                            style={inputStyle('bloodSugar')}
                          />
                          {step2FieldErrors.bloodSugar
                            ? <span style={{ fontSize: 11, color: '#ef4444' }}>{step2FieldErrors.bloodSugar}</span>
                            : oldHint('bloodSugar')}
                        </div>

                      </div>
                    );
                  })()}

                  <div className="cap-form-group">
                    <label className="cap-form-label">{t('adminAppointments.bloodTypeLabel')}</label>
                    <select
                      className="cap-filter-select"
                      value={wizardValues.bloodType}
                      onChange={(e) => setWizardValues(prev => ({ ...prev, bloodType: e.target.value }))}
                      disabled={selectedAppt?.status === 'completed'}
                    >
                      <option value="unknown">{t('adminAppointments.bloodTypeUnknown')}</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div className="cap-form-group">
                    <label className="cap-form-label">{t('adminAppointments.summaryLabel')}</label>
                    <textarea
                      className="cap-form-input"
                      placeholder={t('adminAppointments.summaryPlaceholder')}
                      style={{ minHeight: '60px', fontFamily: 'inherit' }}
                      value={wizardValues.summary}
                      onChange={(e) => setWizardValues(prev => ({ ...prev, summary: e.target.value }))}
                      disabled={selectedAppt?.status === 'completed'}
                    />
                  </div>

                  <div className="cap-modal-footer">
                    <button type="button" className="cap-modal-btn-cancel" onClick={() => setWizardStep(1)}>
                      {t('adminAppointments.back')}
                    </button>
                    <button
                      type="button"
                      className="cap-modal-btn-submit"
                      onClick={() => {
                        // Validate tất cả field cùng lúc, hiện lỗi inline
                        const allErrs = validateStep2All();
                        setStep2FieldErrors(allErrs);
                        if (Object.keys(allErrs).length > 0) {
                          setStatusError(Object.values(allErrs)[0]);
                        } else {
                          setStatusError(null);
                          setStep2FieldErrors({});
                          setWizardStep(3);
                        }
                      }}
                    >
                      {t('adminAppointments.wizardStep2Next')}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Pre-admission Consultation & Eligibility Evaluation */}
              {wizardStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="cap-form-group">
                    <label className="cap-form-label">{t('adminAppointments.consultationNotesLabel')}</label>
                    <textarea
                      className="cap-form-input"
                      placeholder={t('adminAppointments.consultationNotesPlaceholder')}
                      style={{ minHeight: '80px', fontFamily: 'inherit' }}
                      value={wizardValues.consultationNotes}
                      onChange={(e) => setWizardValues(prev => ({ ...prev, consultationNotes: e.target.value }))}
                      required
                      disabled={selectedAppt?.status === 'completed'}
                    />
                  </div>

                  <div className="cap-form-group">
                    <label className="cap-form-label">{t('adminAppointments.assessmentResultLabel')}</label>
                    <textarea
                      className="cap-form-input"
                      placeholder={t('adminAppointments.assessmentResultPlaceholder')}
                      style={{ minHeight: '80px', fontFamily: 'inherit' }}
                      value={wizardValues.assessmentResult}
                      onChange={(e) => setWizardValues(prev => ({ ...prev, assessmentResult: e.target.value }))}
                      required
                      disabled={selectedAppt?.status === 'completed'}
                    />
                  </div>

                  <div className="cap-form-group">
                    <label className="cap-form-label">{t('adminAppointments.eligibilityLabel')}</label>
                    {userRole === 'doctor' ? (
                      <select
                        className="cap-filter-select"
                        value={wizardValues.eligibilityStatus}
                        onChange={(e) => setWizardValues(prev => ({ ...prev, eligibilityStatus: e.target.value }))}
                        required
                        disabled={selectedAppt?.status === 'completed'}
                      >
                        <option value="eligible">{t('adminAppointments.eligible')}</option>
                        <option value="not_eligible">{t('adminAppointments.notEligible')}</option>
                      </select>
                    ) : (
                      <div>
                        <select
                          className="cap-filter-select"
                          value={wizardValues.eligibilityStatus}
                          disabled
                          style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                        >
                          <option value="eligible">{t('adminAppointments.eligible')}</option>
                          <option value="not_eligible">{t('adminAppointments.notEligible')}</option>
                        </select>
                        <p style={{ fontSize: '11px', color: '#b45309', marginTop: '6px', fontWeight: '500' }}>
                          {t('adminAppointments.eligibilityNurseNote')}
                        </p>
                      </div>
                    )}
                  </div>

                  {wizardValues.eligibilityStatus === 'not_eligible' && (
                    <div className="cap-form-group">
                      <label className="cap-form-label">{t('adminAppointments.rejectionReasonLabel')}</label>
                      <textarea
                        className="cap-form-input"
                        placeholder={t('adminAppointments.rejectionReasonPlaceholder')}
                        style={{ minHeight: '60px', fontFamily: 'inherit' }}
                        value={wizardValues.rejectionReason}
                        onChange={(e) => setWizardValues(prev => ({ ...prev, rejectionReason: e.target.value }))}
                        required={wizardValues.eligibilityStatus === 'not_eligible'}
                        disabled={selectedAppt?.status === 'completed'}
                      />
                    </div>
                  )}

                  <div className="cap-modal-footer">
                    <button type="button" className="cap-modal-btn-cancel" onClick={() => setWizardStep(2)} disabled={updatingStatus}>
                      {t('adminAppointments.back')}
                    </button>
                    {selectedAppt?.status === 'completed' ? (
                      <button type="button" className="cap-modal-btn-submit" onClick={() => setShowWizardModal(false)}>
                        {t('adminAppointments.close')}
                      </button>
                    ) : (
                      <button type="submit" className="cap-modal-btn-submit" disabled={updatingStatus}>
                        {updatingStatus ? (
                          <>
                            <Loader2 className="animate-spin mr-1" size={13} />
                            {t('adminAppointments.savingRecord')}
                          </>
                        ) : (
                          t('adminAppointments.completeExam')
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
