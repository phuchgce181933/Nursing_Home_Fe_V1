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
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import careAppointmentService from '../../../services/careAppointment.service';
import staffService from '../../../services/staff.service';
import residentService from '../../../services/resident.service';
import admissionService from '../../../services/admission.service';
import medicalRecordService from '../../../services/medicalRecord.service';
import '../../../styles/admin/CareAppointmentsPage.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

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
  const { user } = useAuth();
  const userRole = user?.role || '';
  const isAdminRole = ['admin', 'manager'].includes(userRole);
  const isMedicalRole = ['doctor', 'nurse'].includes(userRole);

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
      setError('Could not retrieve care appointments. Please check your credentials or network connection.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters, isMedicalRole]);

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
      const errMsg = err.response?.data?.message || 'Không thể tải danh sách bác sĩ/y tá trực ca tại khung giờ này.';
      setAssignmentError(errMsg);
    } finally {
      setLoadingAvailableStaff(false);
    }
  };

  // Handle Save Staff assignment (Doctor & Nurse)
  const handleSaveAssignment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAppt) return;
    
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

    } catch (err) {
      console.error('Failed to save staff assignment:', err);
      // Grab detailed Vietnamese error message from backend
      const errMsg = err.response?.data?.message || 'An error occurred during staff assignment.';
      setAssignmentError(errMsg);
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
    setSavingAppt(true);
    setApptFormError(null);

    try {
      const payload = {
        residentId: formValues.residentId,
        scheduledStartAt: new Date(formValues.scheduledStartAt).toISOString(),
        scheduledEndAt: new Date(formValues.scheduledEndAt).toISOString(),
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

    } catch (err) {
      console.error('Failed to save appointment:', err);
      const errMsg = err.response?.data?.message || 'An error occurred while saving the appointment.';
      setApptFormError(errMsg);
    } finally {
      setSavingAppt(false);
    }
  };

  // Open Status modal (for medical staff) or launch Clinical Wizard if clinical exam
  const handleOpenStatus = async (appt) => {
    setSelectedAppt(appt);
    setTargetApptStatus(appt.status);
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

        if (res?.data && res.data.length > 0) {
          const adm = res.data[0];
          setActiveAdmission(adm);
          setWizardValues({
            heightCm: vitals?.heightCm || '',
            weightKg: vitals?.weightKg || '',
            bloodPressureSystolic: vitals?.bloodPressureSystolic || '',
            bloodPressureDiastolic: vitals?.bloodPressureDiastolic || '',
            pulse: vitals?.pulse || '',
            temperatureCelsius: vitals?.temperatureCelsius || '',
            oxygenSaturation: vitals?.oxygenSaturation || '',
            bloodSugar: vitals?.bloodSugar || '',
            bloodType: adm.applicant?.bloodType || vitals?.bloodType || 'unknown',
            summary: vitals?.summary || adm.applicant?.initialHealthCondition || '',
            consultationNotes: adm.consultationNotes || '',
            assessmentResult: adm.assessmentResult || '',
            eligibilityStatus: ['eligible', 'not_eligible'].includes(adm.eligibilityStatus) ? adm.eligibilityStatus : 'eligible',
            rejectionReason: adm.rejectionReason || '',
          });
        } else {
          setActiveAdmission(null);
          setWizardValues(initialWizardValues);
        }
        setWizardStep(1);
        setShowWizardModal(true);
      } catch (err) {
        console.error('Failed to load admission details for clinical wizard:', err);
        setStatusError('Không thể tải thông tin hồ sơ nhập viện của cư dân này.');
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
    } catch (err) {
      console.error('Failed to update appointment status:', err);
      const errMsg = err.response?.data?.message || 'An error occurred while updating status.';
      setStatusError(errMsg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle clinical wizard form submission (vital signs + consultation + eligibility assessment)
  const handleWizardSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAppt) return;

    setUpdatingStatus(true);
    setStatusError(null);

    try {
      const residentId = selectedAppt.residentId?._id || selectedAppt.residentId;
      const admissionId = activeAdmission?._id;

      // 1. Save vital signs (UC-9)
      const vitalsBody = {
        heightCm: wizardValues.heightCm ? parseFloat(wizardValues.heightCm) : undefined,
        weightKg: wizardValues.weightKg ? parseFloat(wizardValues.weightKg) : undefined,
        bloodPressureSystolic: wizardValues.bloodPressureSystolic ? parseInt(wizardValues.bloodPressureSystolic, 10) : undefined,
        bloodPressureDiastolic: wizardValues.bloodPressureDiastolic ? parseInt(wizardValues.bloodPressureDiastolic, 10) : undefined,
        pulse: wizardValues.pulse ? parseInt(wizardValues.pulse, 10) : undefined,
        temperatureCelsius: wizardValues.temperatureCelsius ? parseFloat(wizardValues.temperatureCelsius) : undefined,
        oxygenSaturation: wizardValues.oxygenSaturation ? parseInt(wizardValues.oxygenSaturation, 10) : undefined,
        bloodSugar: wizardValues.bloodSugar ? parseFloat(wizardValues.bloodSugar) : undefined,
        bloodType: wizardValues.bloodType !== 'unknown' ? wizardValues.bloodType : undefined,
        summary: wizardValues.summary.trim() || undefined,
      };

      await medicalRecordService.recordVitals(residentId, vitalsBody);

      // 2. Call Pre-admission Consultation API if admission request is present (UC-6.16)
      if (admissionId) {
        await admissionService.medicalRecordConsultation(admissionId, {
          consultationNotes: wizardValues.consultationNotes.trim() || 'Đã thực hiện thăm khám lâm sàng.',
          notes: wizardValues.summary.trim() || undefined,
        });

        // 3. Evaluate Eligibility if Bác sĩ role (UC-6.19)
        if (userRole === 'doctor') {
          await admissionService.medicalEvaluateEligibility(admissionId, {
            eligibilityStatus: wizardValues.eligibilityStatus,
            assessmentResult: wizardValues.assessmentResult.trim() || 'Đã kiểm tra các chỉ số sinh tồn lâm sàng.',
            rejectionReason: wizardValues.eligibilityStatus === 'not_eligible' ? (wizardValues.rejectionReason.trim() || undefined) : undefined,
            notes: wizardValues.summary.trim() || undefined,
          });
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
    } catch (err) {
      console.error('Failed to complete clinical wizard:', err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra trong quá trình lưu hồ sơ khám lâm sàng.';
      setStatusError(errMsg);
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
            Lịch Hẹn Khám (Appointments)
          </h1>
          <p>
            {isAdminRole 
              ? 'Lập lịch trình khám, điều phối Bác sĩ và Y tá phụ trách khám lâm sàng đầu vào cho người cao tuổi.'
              : 'Theo dõi, cập nhật trạng thái các lịch khám bệnh và lịch trình của cư dân được phân công.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchAppointments} disabled={loading} className="cap-btn-refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          {isAdminRole && (
            <button onClick={handleOpenCreate} className="cap-btn-primary">
              <Plus size={16} />
              Tạo Lịch Khám
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
            <span className="cap-stat-label">Tổng cuộc hẹn</span>
            <span className="cap-stat-value">{metrics.total}</span>
          </div>
        </div>

        <div className="cap-card-stat">
          <div className="cap-stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
            <Clock size={22} />
          </div>
          <div>
            <span className="cap-stat-label">Chờ khám</span>
            <span className="cap-stat-value">{metrics.scheduled}</span>
          </div>
        </div>

        <div className="cap-card-stat">
          <div className="cap-stat-icon" style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
            <Activity size={22} />
          </div>
          <div>
            <span className="cap-stat-label">Đang khám</span>
            <span className="cap-stat-value">{metrics.inProgress}</span>
          </div>
        </div>

        <div className="cap-card-stat">
          <div className="cap-stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#047857' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <span className="cap-stat-label">Đã hoàn thành</span>
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
                  placeholder="Tìm theo Resident ID..."
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
                <Calendar size={13} className="text-slate-400" /> Ngày hẹn khám:
              </span>
              <input
                type="date"
                className="cap-date-input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-slate-400 text-xs font-semibold">đến</span>
              <input
                type="date"
                className="cap-date-input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="cap-filter-actions">
              <button type="button" onClick={handleResetFilters} className="cap-btn-clear">
                Xóa Bộ Lọc
              </button>
              <button type="submit" className="cap-btn-apply">
                Áp Dụng
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
            <p className="text-slate-500 text-sm">Đang tải lịch hẹn khám...</p>
          </div>
        ) : error ? (
          <div className="p-10 flex flex-col items-center justify-center text-center bg-white" style={{ minHeight: '300px' }}>
            <AlertCircle className="text-red-500 mb-3" size={36} />
            <p className="text-slate-800 font-bold mb-1">Đã có lỗi xảy ra</p>
            <p className="text-slate-500 text-sm max-w-md">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center bg-white" style={{ minHeight: '300px' }}>
            <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-3" style={{ width: 'fit-content' }}>
              <Calendar size={30} />
            </div>
            <p className="text-slate-700 font-bold mb-1">Không tìm thấy lịch hẹn nào</p>
            <p className="text-slate-400 text-xs max-w-sm">
              Bạn chưa có lịch hẹn khám nào được lên lịch hoặc khớp với bộ lọc tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="cap-table-responsive">
            <table className="cap-table">
              <thead>
                <tr>
                  <th>Elderly Resident</th>
                  <th>Thời gian khám</th>
                  <th>Loại khám</th>
                  <th>Bác sĩ phụ trách</th>
                  <th>Y tá phụ trách</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row._id} className="cap-table-row">
                    <td>
                      <div className="cap-resident-info">
                        <span className="cap-resident-name">{row.residentId?.fullName || 'Người cao tuổi'}</span>
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
                          Khám lâm sàng + Đánh giá điều kiện nhập viện
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
                        <div className="cap-staff-badge is-unassigned">Chưa chỉ định</div>
                      )}
                    </td>
                    <td>
                      {(row.nurseStaffId?.userId?.fullName || row.nurseStaffId?.fullName) ? (
                        <div className="cap-staff-badge">
                          <User size={12} />
                          {row.nurseStaffId.userId?.fullName || row.nurseStaffId.fullName}
                        </div>
                      ) : (
                        <div className="cap-staff-badge is-unassigned">Chưa chỉ định</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`cap-badge-status cap-status-${row.status.replace(/_/g, '-')}`}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {isAdminRole && (
                          <>
                            <button
                              onClick={() => handleOpenAssign(row)}
                              className="cap-btn-action"
                              title="Chỉ định Bác sĩ & Y tá"
                              disabled={['completed', 'cancelled'].includes(row.status)}
                            >
                              <UserCheck size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(row)}
                              className="cap-btn-action"
                              title="Chỉnh sửa thời gian"
                              disabled={['completed', 'cancelled'].includes(row.status)}
                            >
                              <Edit size={14} />
                            </button>
                          </>
                        )}
                        {isMedicalRole && (
                          <button
                            onClick={() => handleOpenStatus(row)}
                            className="cap-btn-action"
                            title={row.appointmentType === 'Khám lâm sàng đầu vào'
                              ? (row.status === 'completed'
                                ? 'Xem kết quả khám lâm sàng và đánh giá điều kiện'
                                : 'Mở wizard khám lâm sàng & đánh giá điều kiện')
                              : (row.status === 'completed'
                                ? 'Xem kết quả thăm khám'
                                : 'Cập nhật trạng thái')
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
              Hiển thị <span>{(page - 1) * limit + 1}</span> đến{' '}
              <span>{Math.min(page * limit, total)}</span> trong tổng số{' '}
              <span>{total}</span> lịch hẹn
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
                Trang {page} / {totalPages}
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
            <h4 className="cap-modal__title">Chỉ Định Bác Sĩ & Y Tá Phụ Trách</h4>
            <p className="cap-modal__text">
              Phân công nhân sự y tế thực hiện khám lâm sàng đầu vào cho người cao tuổi{' '}
              <strong>{selectedAppt.residentId?.fullName}</strong>.
            </p>

            {assignmentError && (
              <div className="cap-error-banner">
                <AlertCircle size={16} />
                <span>{assignmentError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAssignment}>
              <div className="cap-form-group">
                <label className="cap-form-label">Chọn Bác sĩ phụ trách *</label>
                <select
                  className="cap-filter-select"
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  disabled={loadingAvailableStaff}
                >
                  {loadingAvailableStaff ? (
                    <option value="">Đang tải danh sách Bác sĩ trực ca...</option>
                  ) : (
                    <>
                      <option value="">-- Chưa chỉ định Bác sĩ --</option>
                      {availableDoctors.map((doc) => (
                        <option key={doc._id} value={doc._id}>
                          {doc.fullName} ({doc.specialty || 'Đa khoa'})
                        </option>
                      ))}
                      {selectedAppt.doctorStaffId && !availableDoctors.some(d => d._id === (selectedAppt.doctorStaffId._id || selectedAppt.doctorStaffId)) && (
                        <option key={selectedAppt.doctorStaffId._id || selectedAppt.doctorStaffId} value={selectedAppt.doctorStaffId._id || selectedAppt.doctorStaffId}>
                          {selectedAppt.doctorStaffId.userId?.fullName || selectedAppt.doctorStaffId.fullName || 'Bác sĩ hiện tại'} (Không trong ca trực)
                        </option>
                      )}
                    </>
                  )}
                </select>
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">Chọn Y tá phụ trách *</label>
                <select
                  className="cap-filter-select"
                  value={selectedNurId}
                  onChange={(e) => setSelectedNurId(e.target.value)}
                  disabled={loadingAvailableStaff}
                >
                  {loadingAvailableStaff ? (
                    <option value="">Đang tải danh sách Y tá trực ca...</option>
                  ) : (
                    <>
                      <option value="">-- Chưa chỉ định Y tá --</option>
                      {availableNurses.map((nur) => (
                        <option key={nur._id} value={nur._id}>
                          {nur.fullName}
                        </option>
                      ))}
                      {selectedAppt.nurseStaffId && !availableNurses.some(n => n._id === (selectedAppt.nurseStaffId._id || selectedAppt.nurseStaffId)) && (
                        <option key={selectedAppt.nurseStaffId._id || selectedAppt.nurseStaffId} value={selectedAppt.nurseStaffId._id || selectedAppt.nurseStaffId}>
                          {selectedAppt.nurseStaffId.userId?.fullName || selectedAppt.nurseStaffId.fullName || 'Y tá hiện tại'} (Không trong ca trực)
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
                  Hủy
                </button>
                <button
                  type="submit"
                  className="cap-modal-btn-submit"
                  disabled={savingAssignment}
                >
                  {savingAssignment ? (
                    <>
                      <Loader2 className="animate-spin mr-1" size={13} />
                      Đang phân công...
                    </>
                  ) : (
                    'Xác nhận Phân Công'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TẠO/SỬA LỊCH HẸN KHÁM (CREATE/EDIT APPOINTMENT) */}
      {showCreateModal && (
        <div className="cap-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="cap-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="cap-modal__title">
              {isEditMode ? 'Chỉnh Sửa Lịch Hẹn Khám' : 'Tạo Lịch Hẹn Khám Mới'}
            </h4>
            <p className="cap-modal__text">
              Điền các thông tin cần thiết để lên lịch khám lâm sàng hoặc khám bệnh cho cư dân.
            </p>

            {apptFormError && (
              <div className="cap-error-banner">
                <AlertCircle size={16} />
                <span>{apptFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAppointment}>
              <div className="cap-form-group">
                <label className="cap-form-label">Chọn Cư dân (Resident) *</label>
                <select
                  className="cap-filter-select"
                  value={formValues.residentId}
                  onChange={(e) => setFormValues(prev => ({ ...prev, residentId: e.target.value }))}
                  required
                  disabled={isEditMode}
                >
                  <option value="">-- Chọn Cư dân --</option>
                  {residentsList.map((res) => (
                    <option key={res._id} value={res._id}>
                      {res.fullName} (#{res.residentCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">Loại cuộc hẹn *</label>
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
                <label className="cap-form-label">Thời gian bắt đầu *</label>
                <input
                  type="datetime-local"
                  className="cap-form-input"
                  value={formValues.scheduledStartAt}
                  onChange={(e) => setFormValues(prev => ({ ...prev, scheduledStartAt: e.target.value }))}
                  required
                />
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">Thời gian kết thúc *</label>
                <input
                  type="datetime-local"
                  className="cap-form-input"
                  value={formValues.scheduledEndAt}
                  onChange={(e) => setFormValues(prev => ({ ...prev, scheduledEndAt: e.target.value }))}
                  required
                />
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">Ghi chú (Notes)</label>
                <textarea
                  className="cap-form-input"
                  style={{ minHeight: '60px', fontFamily: 'inherit' }}
                  placeholder="Ghi chú về triệu chứng bệnh hoặc phòng khám..."
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
                  Hủy
                </button>
                <button
                  type="submit"
                  className="cap-modal-btn-submit"
                  disabled={savingAppt}
                >
                  {savingAppt ? (
                    <>
                      <Loader2 className="animate-spin mr-1" size={13} />
                      Đang xử lý...
                    </>
                  ) : (
                    'Lưu Lịch Hẹn'
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
            <h4 className="cap-modal__title">Cập Nhật Trạng Thái Khám</h4>
            <p className="cap-modal__text">
              Thay đổi trạng thái quá trình khám cho cư dân <strong>{selectedAppt.residentId?.fullName}</strong>.
            </p>

            {statusError && (
              <div className="cap-error-banner">
                <AlertCircle size={16} />
                <span>{statusError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStatus}>
              <div className="cap-form-group">
                <label className="cap-form-label">Trạng thái hiện tại: {selectedAppt.status}</label>
                <select
                  className="cap-filter-select"
                  value={targetApptStatus}
                  onChange={(e) => setTargetApptStatus(e.target.value)}
                  required
                >
                  <option value="scheduled">Scheduled (Đã lên lịch)</option>
                  <option value="in_progress">In Progress (Đang khám)</option>
                  <option value="completed">Completed (Đã khám xong)</option>
                  <option value="cancelled">Cancelled (Hủy bỏ)</option>
                </select>
              </div>

              <div className="cap-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="cap-modal-btn-cancel"
                  disabled={updatingStatus}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="cap-modal-btn-submit"
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <>
                      <Loader2 className="animate-spin mr-1" size={13} />
                      Đang cập nhật...
                    </>
                  ) : (
                    'Cập nhật'
                  )}
                </button>
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
                Thăm Khám Lâm Sàng Đầu Vào
              </h4>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                Bước {wizardStep} / 3
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
                      Hồ sơ sức khỏe người cao tuổi
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>Họ và tên:</span>
                        <strong style={{ color: '#1e293b' }}>{selectedAppt.residentId?.fullName || activeAdmission?.applicant?.fullName}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>Mã cư dân:</span>
                        <strong style={{ color: '#1e293b' }}>#{selectedAppt.residentId?.residentCode || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>Ngày sinh:</span>
                        <strong style={{ color: '#1e293b' }}>
                          {activeAdmission?.applicant?.dateOfBirth
                            ? new Date(activeAdmission.applicant.dateOfBirth).toLocaleDateString('vi-VN')
                            : 'Chưa cập nhật'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>Giới tính:</span>
                        <strong style={{ color: '#1e293b' }}>
                          {activeAdmission?.applicant?.gender === 'male' ? 'Nam'
                            : activeAdmission?.applicant?.gender === 'female' ? 'Nữ' : 'N/A'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>Nhóm máu:</span>
                        <strong style={{ color: '#1e293b' }}>{activeAdmission?.applicant?.bloodType || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>Địa chỉ:</span>
                        <strong style={{ color: '#1e293b' }}>{activeAdmission?.applicant?.personalAddress || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
                        Dị ứng (Allergies):
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
                        <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Không ghi nhận dị ứng</span>
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
                        Bệnh lý nền (Chronic Conditions):
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
                        <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Không ghi nhận bệnh nền</span>
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
                        Tình trạng sức khỏe ban đầu (do gia đình khai báo):
                      </span>
                      <div style={{ backgroundColor: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #64748b', fontSize: '13px', color: '#334155', fontStyle: 'italic', lineHeight: '1.4' }}>
                        "{activeAdmission?.applicant?.initialHealthCondition || 'Chưa ghi nhận thông tin mô tả chi tiết'}"
                      </div>
                    </div>
                  </div>

                  <div className="cap-modal-footer">
                    <button type="button" className="cap-modal-btn-cancel" onClick={() => setShowWizardModal(false)}>
                      {selectedAppt?.status === 'completed' ? 'Đóng' : 'Hủy'}
                    </button>
                    <button type="button" className="cap-modal-btn-submit" onClick={() => setWizardStep(2)}>
                      Tiếp tục: Đo sinh hiệu
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Record Vitals & Indicators */}
              {wizardStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="cap-form-group" style={{ marginBottom: 0 }}>
                      <label className="cap-form-label">Chiều cao (cm) *</label>
                      <input
                        type="number"
                        className="cap-form-input"
                        placeholder="Ví dụ: 165"
                        value={wizardValues.heightCm}
                        onChange={(e) => setWizardValues(prev => ({ ...prev, heightCm: e.target.value }))}
                        required
                        min="0"
                        disabled={selectedAppt?.status === 'completed'}
                      />
                    </div>
                    <div className="cap-form-group" style={{ marginBottom: 0 }}>
                      <label className="cap-form-label">Cân nặng (kg) *</label>
                      <input
                        type="number"
                        className="cap-form-input"
                        placeholder="Ví dụ: 60"
                        value={wizardValues.weightKg}
                        onChange={(e) => setWizardValues(prev => ({ ...prev, weightKg: e.target.value }))}
                        required
                        min="0"
                        disabled={selectedAppt?.status === 'completed'}
                      />
                    </div>
                    <div className="cap-form-group" style={{ marginBottom: 0 }}>
                      <label className="cap-form-label">Huyết áp Systolic (Tối đa)</label>
                      <input
                        type="number"
                        className="cap-form-input"
                        placeholder="Ví dụ: 120"
                        value={wizardValues.bloodPressureSystolic}
                        onChange={(e) => setWizardValues(prev => ({ ...prev, bloodPressureSystolic: e.target.value }))}
                        disabled={selectedAppt?.status === 'completed'}
                      />
                    </div>
                    <div className="cap-form-group" style={{ marginBottom: 0 }}>
                      <label className="cap-form-label">Huyết áp Diastolic (Tối thiểu)</label>
                      <input
                        type="number"
                        className="cap-form-input"
                        placeholder="Ví dụ: 80"
                        value={wizardValues.bloodPressureDiastolic}
                        onChange={(e) => setWizardValues(prev => ({ ...prev, bloodPressureDiastolic: e.target.value }))}
                        disabled={selectedAppt?.status === 'completed'}
                      />
                    </div>
                    <div className="cap-form-group" style={{ marginBottom: 0 }}>
                      <label className="cap-form-label">Nhịp tim (lần/phút)</label>
                      <input
                        type="number"
                        className="cap-form-input"
                        placeholder="Ví dụ: 75"
                        value={wizardValues.pulse}
                        onChange={(e) => setWizardValues(prev => ({ ...prev, pulse: e.target.value }))}
                        disabled={selectedAppt?.status === 'completed'}
                      />
                    </div>
                    <div className="cap-form-group" style={{ marginBottom: 0 }}>
                      <label className="cap-form-label">Nhiệt độ (°C) *</label>
                      <input
                        type="number"
                        step="0.1"
                        className="cap-form-input"
                        placeholder="Ví dụ: 36.5"
                        value={wizardValues.temperatureCelsius}
                        onChange={(e) => setWizardValues(prev => ({ ...prev, temperatureCelsius: e.target.value }))}
                        required
                        disabled={selectedAppt?.status === 'completed'}
                      />
                    </div>
                    <div className="cap-form-group" style={{ marginBottom: 0 }}>
                      <label className="cap-form-label">Nồng độ Oxy SPO2 (%)</label>
                      <input
                        type="number"
                        className="cap-form-input"
                        placeholder="Ví dụ: 98"
                        value={wizardValues.oxygenSaturation}
                        onChange={(e) => setWizardValues(prev => ({ ...prev, oxygenSaturation: e.target.value }))}
                        disabled={selectedAppt?.status === 'completed'}
                      />
                    </div>
                    <div className="cap-form-group" style={{ marginBottom: 0 }}>
                      <label className="cap-form-label">Đường huyết (mg/dL)</label>
                      <input
                        type="number"
                        className="cap-form-input"
                        placeholder="Ví dụ: 100"
                        value={wizardValues.bloodSugar}
                        onChange={(e) => setWizardValues(prev => ({ ...prev, bloodSugar: e.target.value }))}
                        disabled={selectedAppt?.status === 'completed'}
                      />
                    </div>
                  </div>

                  <div className="cap-form-group">
                    <label className="cap-form-label">Nhóm máu</label>
                    <select
                      className="cap-filter-select"
                      value={wizardValues.bloodType}
                      onChange={(e) => setWizardValues(prev => ({ ...prev, bloodType: e.target.value }))}
                      disabled={selectedAppt?.status === 'completed'}
                    >
                      <option value="unknown">Chưa rõ (Unknown)</option>
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
                    <label className="cap-form-label">Tóm tắt tình trạng/Kết luận lâm sàng ban đầu</label>
                    <textarea
                      className="cap-form-input"
                      placeholder="Mô tả tóm tắt tình trạng sinh hiệu, chẩn đoán sơ bộ..."
                      style={{ minHeight: '60px', fontFamily: 'inherit' }}
                      value={wizardValues.summary}
                      onChange={(e) => setWizardValues(prev => ({ ...prev, summary: e.target.value }))}
                      disabled={selectedAppt?.status === 'completed'}
                    />
                  </div>

                  <div className="cap-modal-footer">
                    <button type="button" className="cap-modal-btn-cancel" onClick={() => setWizardStep(1)}>
                      Quay lại
                    </button>
                    <button type="button" className="cap-modal-btn-submit" onClick={() => setWizardStep(3)}>
                      Tiếp tục: Đánh giá nhập viện
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Pre-admission Consultation & Eligibility Evaluation */}
              {wizardStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="cap-form-group">
                    <label className="cap-form-label">Nội dung tư vấn trước nhập viện *</label>
                    <textarea
                      className="cap-form-input"
                      placeholder="Ghi chú nội dung tư vấn chăm sóc, chế độ hoạt động phù hợp..."
                      style={{ minHeight: '80px', fontFamily: 'inherit' }}
                      value={wizardValues.consultationNotes}
                      onChange={(e) => setWizardValues(prev => ({ ...prev, consultationNotes: e.target.value }))}
                      required
                      disabled={selectedAppt?.status === 'completed'}
                    />
                  </div>

                  <div className="cap-form-group">
                    <label className="cap-form-label">Kết quả đánh giá chi tiết *</label>
                    <textarea
                      className="cap-form-input"
                      placeholder="Kết luận kiểm tra thể trạng chi tiết trước khi xét điều kiện..."
                      style={{ minHeight: '80px', fontFamily: 'inherit' }}
                      value={wizardValues.assessmentResult}
                      onChange={(e) => setWizardValues(prev => ({ ...prev, assessmentResult: e.target.value }))}
                      required
                      disabled={selectedAppt?.status === 'completed'}
                    />
                  </div>

                  <div className="cap-form-group">
                    <label className="cap-form-label">Đánh giá điều kiện nhập viện *</label>
                    {userRole === 'doctor' ? (
                      <select
                        className="cap-filter-select"
                        value={wizardValues.eligibilityStatus}
                        onChange={(e) => setWizardValues(prev => ({ ...prev, eligibilityStatus: e.target.value }))}
                        required
                        disabled={selectedAppt?.status === 'completed'}
                      >
                        <option value="eligible">Đủ điều kiện nhập viện (Eligible)</option>
                        <option value="not_eligible">Không đủ điều kiện (Ineligible)</option>
                      </select>
                    ) : (
                      <div>
                        <select
                          className="cap-filter-select"
                          value={wizardValues.eligibilityStatus}
                          disabled
                          style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                        >
                          <option value="eligible">Đủ điều kiện nhập viện (Eligible)</option>
                          <option value="not_eligible">Không đủ điều kiện (Ineligible)</option>
                        </select>
                        <p style={{ fontSize: '11px', color: '#b45309', marginTop: '6px', fontWeight: '500' }}>
                          * Chỉ Bác sĩ mới được quyền đánh giá điều kiện nhập viện. Vai trò Điều dưỡng hiện tại bị hạn chế.
                        </p>
                      </div>
                    )}
                  </div>

                  {wizardValues.eligibilityStatus === 'not_eligible' && (
                    <div className="cap-form-group">
                      <label className="cap-form-label">Lý do từ chối nhập viện *</label>
                      <textarea
                        className="cap-form-input"
                        placeholder="Nêu rõ lý do người cao tuổi không đủ điều kiện gia nhập viện..."
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
                      Quay lại
                    </button>
                    {selectedAppt?.status === 'completed' ? (
                      <button type="button" className="cap-modal-btn-submit" onClick={() => setShowWizardModal(false)}>
                        Đóng
                      </button>
                    ) : (
                      <button type="submit" className="cap-modal-btn-submit" disabled={updatingStatus}>
                        {updatingStatus ? (
                          <>
                            <Loader2 className="animate-spin mr-1" size={13} />
                            Đang lưu hồ sơ...
                          </>
                        ) : (
                          'Hoàn Thành Thăm Khám'
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
