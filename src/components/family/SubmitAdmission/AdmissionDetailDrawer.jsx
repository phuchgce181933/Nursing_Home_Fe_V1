import { useState, useEffect } from 'react';
import {
  X,
  User,
  Heart,
  Calendar,
  Phone,
  Clock,
  Check,
  MapPin,
  AlertCircle,
  Loader2,
  XCircle,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import admissionService from '../../../services/admission.service';
import servicePackageService from '../../../services/servicePackage.service';

const formatEnglishDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) {
    return '';
  }
};

const formatRelationship = (rel) => {
  if (!rel) return 'Guardian';
  const mapping = {
    child: 'Child',
    spouse: 'Spouse',
    sibling: 'Sibling',
    grandchild: 'Grandchild',
    parent: 'Parent',
    other: 'Other',
    con_cai: 'Child',
    vo_chong: 'Spouse',
    anh_chi_em: 'Sibling',
    chau: 'Grandchild',
    bo_me: 'Parent',
    khac: 'Other',
    bo: 'Father',
    me: 'Mother',
    con: 'Child'
  };
  const normalized = rel.toLowerCase().replace(/_/g, ' ').trim();
  if (mapping[normalized]) return mapping[normalized];
  if (mapping[rel]) return mapping[rel];
  return rel.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const formatGender = (gender) => {
  if (!gender) return 'Unknown';
  const mapping = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    unknown: 'Unknown'
  };
  return mapping[gender.toLowerCase()] || gender;
};

const formatBloodType = (blood) => {
  if (!blood || blood.toLowerCase() === 'unknown') return 'Unknown';
  return blood;
};

const formatAdmissionReason = (reason) => {
  if (!reason) return 'Not recorded';
  const mapping = {
    long_term_care: 'Long-term Care',
    short_term_rehab: 'Short-term Rehabilitation',
    daycare: 'Daycare',
    palliative_care: 'Palliative Care',
    assisted_living: 'Assisted Living',
    memory_care: 'Memory Care',
    'chăm sóc dài hạn': 'Long-term Care',
    'điều trị phục hồi chức năng': 'Short-term Rehabilitation',
    'nghỉ dưỡng ngắn hạn': 'Short-term Rehabilitation',
    'khác': 'Other'
  };
  const normalized = reason.toLowerCase().replace(/_/g, ' ').trim();
  if (mapping[reason]) return mapping[reason];
  if (mapping[normalized]) return mapping[normalized];
  return reason.charAt(0).toUpperCase() + reason.slice(1);
};

const getCalendarDay = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.getDate().toString().padStart(2, '0');
  } catch (e) {
    return '';
  }
};

const getCalendarMonth = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  } catch (e) {
    return '';
  }
};

const formatDayOfWeek = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  } catch (e) {
    return '';
  }
};

export default function AdmissionDetailDrawer({
  isOpen,
  onClose,
  admissionId,
  onCancelSuccess,
  isAdmin = false,
}) {
  const { user } = useAuth();
  const userRole = user?.role || '';
  const isDoctorRole = userRole === 'doctor';
  const isNurseRole = userRole === 'nurse';
  const isAdminRole = ['admin', 'manager'].includes(userRole);
  const isDoctorOrNurseRole = isDoctorRole || isNurseRole;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [admission, setAdmission] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Admin approval state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [isOpenPackageDropdown, setIsOpenPackageDropdown] = useState(false);

  // Admin rejection state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Modal error state for displaying beautiful error banner instead of browser alert popup
  const [modalError, setModalError] = useState(null);

  // Reset modal error when any modal state changes
  useEffect(() => {
    setModalError(null);
  }, [
    showCancelModal,
    showApproveModal,
    showRejectModal,
    showAssignModal,
    showConsultationModal,
    showScheduleModal,
    showEligibilityModal,
    showAssignPackageModal,
    showContractModal,
    showCheckInModal
  ]);

  // New Workflow Action States
  // 1. Assign Consultant
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // 2. Pre-admission Consultation
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [consultationGenNotes, setConsultationGenNotes] = useState('');
  const [recordingConsultation, setRecordingConsultation] = useState(false);

  // 3. Initial Assessment Scheduling
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [initialAssessmentNotes, setInitialAssessmentNotes] = useState('');
  const [scheduleGenNotes, setScheduleGenNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // 4. Evaluate Admission Eligibility
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [eligibilityStatus, setEligibilityStatus] = useState('eligible');
  const [assessmentResult, setAssessmentResult] = useState('');
  const [rejReason, setRejReason] = useState('');
  const [eligibilityGenNotes, setEligibilityGenNotes] = useState('');
  const [evaluating, setEvaluating] = useState(false);

  // 5. Assign Service Package
  const [showAssignPackageModal, setShowAssignPackageModal] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [assigningPackage, setAssigningPackage] = useState(false);

  // 6. Create Admission Contract
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractNum, setContractNum] = useState('');
  const [contractStart, setContractStart] = useState('');
  const [contractEnd, setContractEnd] = useState('');
  const [contractTerms, setContractTerms] = useState('');
  const [contractGenNotes, setContractGenNotes] = useState('');
  const [creatingContract, setCreatingContract] = useState(false);

  // 7. Check-in Resident
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [assignedBedHex, setAssignedBedHex] = useState('');
  const [assignedRoomHex, setAssignedRoomHex] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  // Load details whenever admissionId changes or role changes
  useEffect(() => {
    if (!isOpen || !admissionId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        // Cả admin, manager, doctor, nurse đều dùng chung route admin để đọc chi tiết nhờ BE đã mở quyền đọc
        const res = (isAdmin || isDoctorOrNurseRole || isAdminRole)
          ? await admissionService.adminGetAdmissionDetail(admissionId)
          : await admissionService.getAdmissionDetail(admissionId);
        setAdmission(res?.admission || null);
      } catch (err) {
        console.error('Failed to load admission details:', err);
        setError('Failed to connect to server. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, admissionId, isAdmin, isDoctorOrNurseRole, isAdminRole]);

  // Load packages when approve modal or assign package modal opens
  useEffect(() => {
    if (showApproveModal || showAssignPackageModal) {
      const fetchPackages = async () => {
        try {
          setLoadingPackages(true);
          const res = await servicePackageService.getServicePackageList({ isActive: true }, 'admin');
          setPackages(res?.data || []);
        } catch (err) {
          console.error('Failed to fetch service packages:', err);
        } finally {
          setLoadingPackages(false);
        }
      };
      fetchPackages();
    }
  }, [showApproveModal, showAssignPackageModal]);

  // Load staff members when assign consultant modal opens
  useEffect(() => {
    if (showAssignModal) {
      const fetchStaff = async () => {
        try {
          setLoadingStaff(true);
          const res = await admissionService.getStaffList({ isActive: true });
          const filtered = (res?.data || []).filter(x => ['doctor', 'nurse'].includes(x.role));
          setStaffMembers(filtered);
        } catch (err) {
          console.error('Failed to fetch staff members:', err);
        } finally {
          setLoadingStaff(false);
        }
      };
      fetchStaff();
    }
  }, [showAssignModal]);

  if (!isOpen) return null;

  const handleCancelRequest = async () => {
    if (!admissionId) return;
    try {
      setCancelling(true);
      await admissionService.cancelAdmissionRequest(admissionId, {
        cancellationReason: cancellationReason.trim() || 'Cancelled at family request',
      });
      setShowCancelModal(false);
      setCancellationReason('');
      if (onCancelSuccess) {
        onCancelSuccess();
      }
      // Reload details
      const res = (isAdmin || isDoctorOrNurseRole || isAdminRole)
        ? await admissionService.adminGetAdmissionDetail(admissionId)
        : await admissionService.getAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to cancel admission request:', err);
      setModalError(err.response?.data?.message || 'An error occurred while cancelling the request. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!admissionId) return;
    try {
      setApproving(true);
      await admissionService.adminApproveAdmission(admissionId, {
        assignedServicePackage: selectedPackage || undefined,
        notes: adminNotes.trim() || undefined,
      });
      setShowApproveModal(false);
      setSelectedPackage('');
      setAdminNotes('');
      if (onCancelSuccess) {
        onCancelSuccess();
      }
      // Reload details
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to approve request:', err);
      setModalError(err.response?.data?.message || 'An error occurred while approving the request.');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!admissionId || !rejectionReason.trim()) return;
    try {
      setRejecting(true);
      await admissionService.adminRejectAdmission(admissionId, {
        rejectionReason: rejectionReason.trim(),
      });
      setShowRejectModal(false);
      setRejectionReason('');
      if (onCancelSuccess) {
        onCancelSuccess();
      }
      // Reload details
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to reject request:', err);
      setModalError(err.response?.data?.message || 'An error occurred while rejecting the request.');
    } finally {
      setRejecting(false);
    }
  };

  // Workflow Handlers
  const handleAssignConsultant = async (e) => {
    if (e) e.preventDefault();
    if (!admissionId || !selectedStaffId) return;

    try {
      setAssigning(true);
      await admissionService.adminAssignConsultant(admissionId, { consultantId: selectedStaffId });
      setShowAssignModal(false);
      setSelectedStaffId('');
      if (onCancelSuccess) onCancelSuccess();
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to assign consultant:', err);
      setModalError(err.response?.data?.message || 'An error occurred while assigning the consultant.');
    } finally {
      setAssigning(false);
    }
  };

  const handleRecordConsultation = async (e) => {
    if (e) e.preventDefault();
    if (!admissionId || !consultationNotes.trim()) return;

    try {
      setRecordingConsultation(true);
      await admissionService.medicalRecordConsultation(admissionId, {
        consultationNotes: consultationNotes.trim(),
        notes: consultationGenNotes.trim() || undefined,
      });
      setShowConsultationModal(false);
      setConsultationNotes('');
      setConsultationGenNotes('');
      if (onCancelSuccess) onCancelSuccess();
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to record consultation:', err);
      setModalError(err.response?.data?.message || 'An error occurred while recording the consultation.');
    } finally {
      setRecordingConsultation(false);
    }
  };

  const handleScheduleAssessment = async (e) => {
    if (e) e.preventDefault();
    if (!admissionId || !scheduleDate) return;

    try {
      setScheduling(true);
      await admissionService.medicalScheduleAssessment(admissionId, {
        scheduledAt: new Date(scheduleDate).toISOString(),
        initialAssessmentNotes: initialAssessmentNotes.trim() || undefined,
        notes: scheduleGenNotes.trim() || undefined,
      });
      setShowScheduleModal(false);
      setScheduleDate('');
      setInitialAssessmentNotes('');
      setScheduleGenNotes('');
      if (onCancelSuccess) onCancelSuccess();
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to schedule assessment:', err);
      setModalError(err.response?.data?.message || 'An error occurred while scheduling the assessment.');
    } finally {
      setScheduling(false);
    }
  };

  const handleEvaluateEligibility = async (e) => {
    if (e) e.preventDefault();
    if (!admissionId || !assessmentResult.trim()) return;

    try {
      setEvaluating(true);
      await admissionService.medicalEvaluateEligibility(admissionId, {
        eligibilityStatus,
        assessmentResult: assessmentResult.trim(),
        rejectionReason: eligibilityStatus === 'not_eligible' ? (rejReason.trim() || undefined) : undefined,
        notes: eligibilityGenNotes.trim() || undefined,
      });
      setShowEligibilityModal(false);
      setAssessmentResult('');
      setRejReason('');
      setEligibilityGenNotes('');
      if (onCancelSuccess) onCancelSuccess();
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to evaluate eligibility:', err);
      setModalError(err.response?.data?.message || 'An error occurred while evaluating eligibility.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleAssignPackage = async (e) => {
    if (e) e.preventDefault();
    if (!admissionId || !selectedPackageId) return;

    try {
      setAssigningPackage(true);
      await admissionService.adminAssignServicePackage(admissionId, { servicePackageId: selectedPackageId });
      setShowAssignPackageModal(false);
      setSelectedPackageId('');
      if (onCancelSuccess) onCancelSuccess();
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to assign package:', err);
      setModalError(err.response?.data?.message || 'An error occurred while assigning the service package.');
    } finally {
      setAssigningPackage(false);
    }
  };

  const handleCreateContract = async (e) => {
    if (e) e.preventDefault();
    if (!admissionId || !contractNum.trim()) return;

    try {
      setCreatingContract(true);
      await admissionService.adminCreateContract(admissionId, {
        contractNumber: contractNum.trim(),
        contractStartDate: contractStart ? new Date(contractStart).toISOString() : undefined,
        contractEndDate: contractEnd ? new Date(contractEnd).toISOString() : undefined,
        contractTerms: contractTerms.trim() || undefined,
        notes: contractGenNotes.trim() || undefined,
      });
      setShowContractModal(false);
      setContractNum('');
      setContractStart('');
      setContractEnd('');
      setContractTerms('');
      setContractGenNotes('');
      if (onCancelSuccess) onCancelSuccess();
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to create contract:', err);
      setModalError(err.response?.data?.message || 'An error occurred while creating the contract.');
    } finally {
      setCreatingContract(false);
    }
  };

  const handleCheckInResident = async (e) => {
    if (e) e.preventDefault();
    if (!admissionId) return;

    try {
      setCheckingIn(true);
      await admissionService.adminCheckInResident(admissionId, {
        bedId: assignedBedHex.trim() || undefined,
        roomId: assignedRoomHex.trim() || undefined,
      });
      setShowCheckInModal(false);
      setAssignedBedHex('');
      setAssignedRoomHex('');
      if (onCancelSuccess) onCancelSuccess();
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to check-in resident:', err);
      setModalError(err.response?.data?.message || 'An error occurred during resident check-in.');
    } finally {
      setCheckingIn(false);
    }
  };

  // Determine if request is cancellable (family mode)
  const isCancellable =
    !isAdmin &&
    admission &&
    ['new_request', 'consulting', 'assessing', 'contracting'].includes(admission.status);

  // Determine if request is approvable/rejectable (admin mode)
  const isApprovable =
    isAdmin &&
    admission &&
    ['new_request', 'consulting', 'assessing'].includes(admission.status);

  const isRejectable =
    isAdmin &&
    admission &&
    ['new_request', 'consulting', 'assessing'].includes(admission.status);

  // Dynamic timeline builder
  const getTimelineSteps = () => {
    if (!admission) return [];

    const steps = [
      {
        key: 'new_request',
        title: 'New Request',
        statusText: `Submitted`,
        date: `${formatEnglishDate(admission.createdAt)} - ${formatTime(admission.createdAt)}`,
        isDone: true,
        isActive: false,
      },
      {
        key: 'consulting',
        title: 'Consultation',
        statusText: ['consulting', 'assessing', 'contracting', 'checked_in'].includes(admission.status)
          ? 'Completed'
          : 'Pending',
        date: admission.consultedAt
          ? `${formatEnglishDate(admission.consultedAt)}`
          : admission.consultationScheduledAt
            ? `Scheduled: ${formatEnglishDate(admission.consultationScheduledAt)}`
            : '',
        isDone: ['assessing', 'contracting', 'checked_in'].includes(admission.status) || !!admission.consultedAt,
        isActive: admission.status === 'consulting',
      },
      {
        key: 'assessing',
        title: 'Medical Assessment',
        statusText: ['assessing', 'contracting', 'checked_in'].includes(admission.status)
          ? (admission.eligibilityStatus === 'eligible' ? 'Completed (Eligible)' : admission.eligibilityStatus === 'not_eligible' ? 'Completed (Ineligible)' : 'In Progress')
          : 'Pending',
        date: admission.assessedAt ? `${formatEnglishDate(admission.assessedAt)}` : '',
        isDone: ['contracting', 'checked_in'].includes(admission.status) && admission.eligibilityStatus === 'eligible',
        isActive: admission.status === 'assessing',
      },
      {
        key: 'contracting',
        title: 'Contract Signing',
        statusText: ['contracting', 'checked_in'].includes(admission.status)
          ? (admission.status === 'checked_in' ? 'Completed' : 'In Progress')
          : 'Pending',
        date: admission.contractSignedAt ? `${formatEnglishDate(admission.contractSignedAt)}` : '',
        isDone: admission.status === 'checked_in',
        isActive: admission.status === 'contracting',
      },
      {
        key: 'checked_in',
        title: 'Admission / Check-in',
        statusText: admission.status === 'checked_in' ? 'Completed' : 'Pending',
        date: admission.checkInAt ? `${formatEnglishDate(admission.checkInAt)}` : '',
        isDone: admission.status === 'checked_in',
        isActive: false,
      },
    ];

    return steps;
  };

  const timelineSteps = getTimelineSteps();

  const scheduledDate = admission?.initialAssessmentScheduledAt || admission?.consultationScheduledAt;
  const appointmentNotes = admission?.initialAssessmentNotes || admission?.consultationNotes || 'At Assessment Room, Block A';
  const appointmentTitle = admission?.initialAssessmentScheduledAt ? 'HEALTH ASSESSMENT APPOINTMENT' : 'CONSULTATION APPOINTMENT';

  const getStepIcon = (key) => {
    switch (key) {
      case 'new_request':
        return <Clock size={8} />;
      case 'consulting':
        return <Phone size={8} />;
      case 'assessing':
        return <Activity size={8} />;
      case 'contracting':
        return <CheckCircle size={8} />;
      case 'checked_in':
        return <Check size={8} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`arh-backdrop ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`arh-drawer ${isOpen ? 'is-open' : ''}`}
      >
        {/* Header Block */}
        <div className="arh-drawer__header">
          <div>
            <h2 className="arh-drawer__title">Request Details</h2>
            {admission && (
              <p className="arh-detail-card__code">
                #{admission.requestCode || `ANH-${admission._id.substring(0, 4).toUpperCase()}`}
              </p>
            )}
          </div>
          <button
            className="arh-drawer__close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Unified Scroll Body */}
        <div className="arh-drawer__body">
          {loading && (
            <div className="arh-loading-box">
              <Loader2 className="arh-loading-spinner" size={32} />
              <p className="arh-loading-text">Loading admission details...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-error p-4 rounded-xl flex items-center gap-2.5 text-sm">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && admission && (
            <>
              {/* Timeline Progress */}
              <div className="arh-detail-card">
                <h5 className="arh-drawer__section-title">
                  <Clock size={16} /> PROCESSING TIMELINE
                </h5>
                <div className="arh-timeline">
                  {/* Timeline connecting line */}
                  <div className="arh-timeline__line" />

                  {admission.status === 'cancelled' && (
                    <div className="arh-timeline__step is-cancelled">
                      <div className="arh-timeline__dot animate-pulse" />
                      <p className="arh-timeline__title">Request Cancelled</p>
                      <p className="arh-timeline__date">
                        Cancelled date: {formatEnglishDate(admission.cancelledAt || admission.updatedAt)}
                      </p>
                      <p className="arh-timeline__desc">
                        "Reason: {admission.cancellationReason || admission.rejectionReason || 'Cancelled by user'}"
                      </p>
                    </div>
                  )}

                  {timelineSteps.map((step) => {
                    const isDone = step.isDone;
                    const isActive = step.isActive;

                    return (
                      <div key={step.key} className={`arh-timeline__step ${isDone ? 'is-done' : isActive ? 'is-active' : ''}`}>
                        {/* Bullet symbol */}
                        <div className="arh-timeline__dot flex items-center justify-center">
                          {isDone && <Check size={8} className="text-white" />}
                          {isActive && getStepIcon(step.key)}
                        </div>

                        {/* Title and stats */}
                        <div>
                          <p className="arh-timeline__title">
                            {step.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${isDone
                                ? 'bg-emerald-50 text-status-success'
                                : isActive
                                  ? 'bg-indigo-50 text-navy-deep'
                                  : 'bg-slate-100 text-slate-400'
                              }`}>
                              {step.statusText}
                            </span>
                            {step.date && (
                              <span className="arh-timeline__date">{step.date}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Requester Contact card */}
              <div className="arh-detail-card">
                <h5 className="arh-drawer__section-title">
                  <User size={16} /> PRIMARY CONTACT
                </h5>
                <div className="arh-detail-card__profile" style={{ background: 'rgba(239, 244, 255, 0.4)', border: '1px solid rgba(27, 54, 93, 0.05)', padding: '14px', borderRadius: '12px' }}>
                  <img
                    alt="Requester photo"
                    className="arh-detail-card__avatar"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJXACrUfkBY9FzZgqaYWlbX2_62AvB8l3uq1FtPvHQLPXjrGi_pCx100ZMjqgFsjpLnyALy7cQ5HakNfzB6W_5g45qDwYQEw1vHmVH5smWEcdKtoEiRARx_wst369IQZWNEsbxfaQiR7N8bZ8CdZpY4zVsLhpqnZGHYN0qm0QbBarwa-WWJ7keBArDnMmO3hrwY_wqVVkmiqKVtfEhifVie9Jn2HWA4tbPhuGX_x4lUz6m_HgraTM9IbraKGLNxKx4xcqhALN9SqZE"
                  />
                  <div className="arh-detail-card__info">
                    <h4 className="arh-detail-card__name">
                      {admission.familyAccount?.fullName || admission.requestedByName || 'Relative'}
                    </h4>
                    <p className="arh-detail-item__value" style={{ marginTop: '4px', fontSize: '12.5px', color: '#475569', fontWeight: '500' }}>
                      {formatRelationship(admission.applicant?.relationshipToRequester)} • {admission.requestedByPhone || admission.familyAccount?.phone || 'N/A'}
                    </p>
                    {isAdmin && admission.familyAccount && (
                      <div className="text-[11.5px] text-slate-500 mt-2 font-medium bg-white/70 p-2 rounded border border-slate-100 flex flex-col gap-0.5">
                        <div><strong>Username:</strong> {admission.familyAccount.username || 'N/A'}</div>
                        <div><strong>Family Email:</strong> {admission.familyAccount.email || 'N/A'}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Elderly Resident profile card */}
              <div className="arh-detail-card">
                <h5 className="arh-drawer__section-title">
                  <Heart size={16} /> ELDERLY RESIDENT DETAILS
                </h5>
                <div className="arh-detail-grid">
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label">Full Name</p>
                    <p className="arh-detail-item__value" style={{ fontWeight: 'bold' }}>{admission.applicant?.fullName || 'N/A'}</p>
                  </div>
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label">Date of Birth</p>
                    <p className="arh-detail-item__value">{formatEnglishDate(admission.applicant?.dateOfBirth)}</p>
                  </div>
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label">Blood Type</p>
                    <p className="arh-detail-item__value" style={{ fontWeight: 'bold' }}>{formatBloodType(admission.applicant?.bloodType)}</p>
                  </div>
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label">Gender</p>
                    <p className="arh-detail-item__value">
                      {formatGender(admission.applicant?.gender)}
                    </p>
                  </div>
                  <div className="arh-detail-item" style={{ gridColumn: 'span 2' }}>
                    <p className="arh-detail-item__label">Current Address</p>
                    <p className="arh-detail-item__value" style={{ fontSize: '12.5px', lineHeight: '1.4' }}>
                      {admission.applicant?.personalAddress || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Health Profile Card */}
              <div className="arh-detail-card arh-detail-card--health-alert">
                <h5 className="arh-drawer__section-title">
                  <AlertCircle size={16} /> HEALTH INFORMATION
                </h5>
                <div className="arh-detail-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label" style={{ color: '#ba1a1a' }}>Allergies</p>
                    <div className="arh-tags" style={{ marginTop: '4px' }}>
                      {admission.applicant?.allergies && admission.applicant.allergies.length > 0 ? (
                        admission.applicant.allergies.map((alg, i) => (
                          <span key={i} className="arh-tag arh-tag--allergy" style={{ fontWeight: 'bold' }}>
                            {alg}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No documented allergies</span>
                      )}
                    </div>
                  </div>

                  <div className="arh-detail-item" style={{ marginTop: '8px' }}>
                    <p className="arh-detail-item__label" style={{ color: '#ba1a1a' }}>Chronic Conditions</p>
                    <div className="arh-tags" style={{ marginTop: '4px' }}>
                      {admission.applicant?.chronicConditions && admission.applicant.chronicConditions.length > 0 ? (
                        admission.applicant.chronicConditions.map((cond, i) => (
                          <span key={i} className="arh-tag" style={{ color: '#ba1a1a', background: 'rgba(186, 26, 26, 0.08)' }}>
                            {cond}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No documented chronic conditions</span>
                      )}
                    </div>
                  </div>

                  <div className="arh-detail-item" style={{ marginTop: '12px', borderTop: '1px solid rgba(186, 26, 26, 0.15)', paddingTop: '8px' }}>
                    <p className="arh-detail-item__label" style={{ color: '#ba1a1a' }}>Detailed Health Summary</p>
                    <p className="arh-detail-item__value" style={{ fontStyle: 'italic', background: 'rgba(255, 255, 255, 0.6)', padding: '8px 12px', borderRadius: '8px', marginTop: '4px', border: '1px dashed rgba(186, 26, 26, 0.15)', color: '#334155' }}>
                      "{admission.applicant?.initialHealthCondition || 'No detailed health summary provided'}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Health Assessment / Consultation Appointment Card */}
              {scheduledDate && (
                <div className="arh-detail-card arh-detail-card--appointment">
                  <h5 className="arh-drawer__section-title">
                    <Calendar size={16} /> {appointmentTitle}
                  </h5>
                  <div className="flex items-center gap-4 bg-white/70 p-3 rounded-lg border border-emerald-100 shadow-sm mt-3">
                    <div className="bg-[#2D6A4F] text-white w-12 h-12 rounded flex flex-col items-center justify-center leading-none flex-shrink-0 font-sans shadow-[0_2px_6px_rgba(45,106,79,0.2)]">
                      <span className="text-[15px] font-bold">{getCalendarDay(scheduledDate)}</span>
                      <span className="text-[9px] font-medium uppercase mt-0.5">{getCalendarMonth(scheduledDate)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-[13.5px]">
                        {formatDayOfWeek(scheduledDate)}, {formatEnglishDate(scheduledDate)}
                      </p>
                      <p className="text-slate-500 text-[12.5px] mt-1 font-medium flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        {formatTime(scheduledDate)} • {appointmentNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Service Package Card (if assigned) */}
              {admission.assignedServicePackage && (
                <div className="arh-detail-card" style={{ borderLeft: '4px solid #2D6A4F', background: 'rgba(45, 106, 79, 0.03)' }}>
                  <h5 className="arh-drawer__section-title" style={{ color: '#2D6A4F' }}>
                    <CheckCircle size={16} /> ASSIGNED SERVICE PACKAGE
                  </h5>
                  <div className="mt-2 text-[13.5px] font-bold text-[#1B365D]">
                    {admission.assignedServicePackage}
                  </div>
                </div>
              )}

              {/* Extra Admission details */}
              <div className="arh-detail-card">
                <h5 className="arh-drawer__section-title">
                  <Calendar size={16} /> ADMISSION DETAILS
                </h5>
                <div className="arh-detail-grid">
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label">Preferred Admission Date</p>
                    <p className="arh-detail-item__value" style={{ color: '#1B365D', fontWeight: 'bold' }}>
                      {formatEnglishDate(admission.preferredAdmissionDate)}
                    </p>
                  </div>
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label">Relationship</p>
                    <p className="arh-detail-item__value">{formatRelationship(admission.applicant?.relationshipToRequester)}</p>
                  </div>
                  {admission.consultantId && (
                    <div className="arh-detail-item" style={{ gridColumn: 'span 2', marginTop: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <p className="arh-detail-item__label" style={{ color: '#1B365D' }}>Assigned Consultant</p>
                      <p className="arh-detail-item__value" style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="text-[#1B365D] bg-slate-100 px-2 py-0.5 rounded text-[12px] font-semibold border border-slate-200">
                          {admission.consultantId.fullName} ({admission.consultantId.role?.toUpperCase()})
                        </span>
                        {admission.consultantId.email && (
                          <span className="text-xs text-slate-400 font-normal">
                            ({admission.consultantId.email})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  <div className="arh-detail-item" style={{ gridColumn: 'span 2' }}>
                    <p className="arh-detail-item__label">Reason for Admission</p>
                    <p className="arh-detail-item__value" style={{ fontSize: '12.5px' }}>
                      {formatAdmissionReason(admission.reasonForAdmission)}
                    </p>
                  </div>
                  {admission.notes && (
                    <div className="arh-detail-item" style={{ gridColumn: 'span 2' }}>
                      <p className="arh-detail-item__label">Additional Notes</p>
                      <p className="arh-detail-item__value" style={{ fontSize: '12px', color: '#64748b' }}>
                        {admission.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Administrative & Care Workflow Actions */}
              {(
                (isAdminRole && (admission.status !== 'cancelled' && admission.status !== 'checked_in')) ||
                (isDoctorOrNurseRole && ['new_request', 'consulting', 'assessing'].includes(admission.status))
              ) && (
                <div className="arh-detail-card font-sans" style={{ borderLeft: '4px solid #1B365D', background: 'rgba(27, 54, 93, 0.02)' }}>
                  <h5 className="arh-drawer__section-title" style={{ color: '#1B365D' }}>
                    <Activity size={16} /> WORKFLOW ACTIONS
                  </h5>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {isAdminRole && (
                      <div className="w-full text-xs text-[#1B365D] bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/60 leading-normal mb-2 font-medium">
                        <strong>Medical Workflow Note:</strong> Pre-admission Consultation, Initial Assessment Scheduling, and Eligibility Evaluation are strictly designated for <strong>Doctor</strong> & <strong>Nurse</strong> roles. To perform these steps, please log in as a Doctor (<code>doctor@test.com</code>) or Nurse (<code>nurse@test.com</code>).
                      </div>
                    )}
                    {/* 1. Assign Consultant (Admin/Manager role) */}
                    {isAdminRole && admission.status !== 'cancelled' && admission.status !== 'checked_in' && (
                      <button
                        type="button"
                        onClick={() => setShowAssignModal(true)}
                        className="adm-btn-apply"
                        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none', background: '#1B365D' }}
                      >
                        Assign Consultant
                      </button>
                    )}

                    {/* 2. Pre-admission Consultation (Doctor & Nurse roles) */}
                    {isDoctorOrNurseRole && ['new_request', 'consulting'].includes(admission.status) && (
                      <button
                        type="button"
                        onClick={() => setShowConsultationModal(true)}
                        className="adm-btn-apply"
                        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none', background: '#1B365D' }}
                      >
                        Record Consultation
                      </button>
                    )}

                    {/* 3. Initial Assessment Scheduling (Doctor & Nurse roles) */}
                    {isDoctorOrNurseRole && ['new_request', 'consulting', 'assessing'].includes(admission.status) && (
                      <button
                        type="button"
                        onClick={() => setShowScheduleModal(true)}
                        className="adm-btn-apply"
                        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none', background: '#1B365D' }}
                      >
                        Schedule Assessment
                      </button>
                    )}

                    {/* 4. Evaluate Admission Eligibility (Doctor role only) */}
                    {isDoctorRole && ['consulting', 'assessing'].includes(admission.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEligibilityStatus(admission.eligibilityStatus === 'not_eligible' ? 'not_eligible' : 'eligible');
                          setAssessmentResult(admission.assessmentResult || '');
                          setRejReason(admission.rejectionReason || '');
                          setShowEligibilityModal(true);
                        }}
                        className="adm-btn-apply"
                        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none', background: '#1B365D' }}
                      >
                        Evaluate Eligibility
                      </button>
                    )}

                    {/* 5. Assign Service Package (Admin/Manager role) */}
                    {isAdminRole && ['assessing', 'contracting'].includes(admission.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPackageId(admission.servicePackageId?._id || '');
                          setShowAssignPackageModal(true);
                        }}
                        className="adm-btn-apply"
                        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none', background: '#1B365D' }}
                      >
                        Assign Service Package
                      </button>
                    )}

                    {/* 6. Create Admission Contract (Admin/Manager role) */}
                    {isAdminRole && ['assessing', 'contracting'].includes(admission.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          setContractNum(admission.contractNumber || '');
                          setContractStart(admission.contractStartDate ? admission.contractStartDate.split('T')[0] : '');
                          setContractEnd(admission.contractEndDate ? admission.contractEndDate.split('T')[0] : '');
                          setContractTerms(admission.contractTerms || '');
                          setShowContractModal(true);
                        }}
                        className="adm-btn-apply"
                        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none', background: '#1B365D' }}
                      >
                        {admission.contractNumber ? 'Edit Contract' : 'Create Contract'}
                      </button>
                    )}

                    {/* 7. Check-in Resident (Admin/Manager role) */}
                    {isAdminRole && admission.status === 'contracting' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAssignedBedHex(admission.assignedBedId || '');
                          setAssignedRoomHex(admission.assignedRoomId || '');
                          setShowCheckInModal(true);
                        }}
                        className="adm-btn-apply"
                        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none', background: '#1B365D' }}
                      >
                        Check-in Resident
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pinned Glass Layout Footer */}
        <div className="arh-drawer__footer">
          {isAdmin ? (
            <div className="flex gap-3 w-full">
              {isRejectable && (
                <button
                  className="arh-drawer__btn arh-drawer__btn--cancel flex-1"
                  onClick={() => setShowRejectModal(true)}
                >
                  Reject Request
                </button>
              )}
              {isApprovable && (
                <button
                  className="arh-drawer__btn arh-drawer__btn--primary flex-1"
                  style={{ background: '#1B365D' }}
                  onClick={() => setShowApproveModal(true)}
                >
                  Approve Request
                </button>
              )}
              {!isApprovable && !isRejectable && (
                <button
                  className="arh-drawer__btn arh-drawer__btn--primary w-full"
                  onClick={onClose}
                >
                  Close Details
                </button>
              )}
            </div>
          ) : isCancellable ? (
            <button
              className="arh-drawer__btn arh-drawer__btn--cancel w-full"
              onClick={() => setShowCancelModal(true)}
            >
              <XCircle size={18} />
              Cancel Admission Request
            </button>
          ) : (
            <button
              className="arh-drawer__btn arh-drawer__btn--primary w-full"
              onClick={onClose}
            >
              Close Details
            </button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div
          className="arh-modal-backdrop"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="arh-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="arh-modal__title">Confirm Request Cancellation</h4>
            <p className="arh-modal__text">
              Are you sure you want to cancel the admission request for{' '}
              <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>? This action will immediately terminate the entire consultation process and cannot be undone.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4">
                {modalError}
              </div>
            )}
            <textarea
              className="arh-modal__textarea"
              placeholder="Please share your reason for cancellation (e.g., Change of family plans, found alternative solution...)"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <button
                className="arh-drawer__btn"
                style={{ background: '#f1f5f9', color: '#475569' }}
                onClick={() => {
                  setShowCancelModal(false);
                  setCancellationReason('');
                }}
                disabled={cancelling}
              >
                Go Back
              </button>
              <button
                className="arh-drawer__btn arh-drawer__btn--cancel"
                onClick={handleCancelRequest}
                disabled={cancelling}
              >
                {cancelling && <Loader2 className="animate-spin mr-1" size={13} />}
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Approve Modal */}
      {showApproveModal && (
        <div
          className="arh-modal-backdrop"
          onClick={() => {
            setShowApproveModal(false);
            setIsOpenPackageDropdown(false);
          }}
        >
          <div
            className="arh-modal"
            onClick={(e) => {
              e.stopPropagation();
              // Đóng dropdown khi click vùng trống khác trong modal
              if (isOpenPackageDropdown) setIsOpenPackageDropdown(false);
            }}
          >
            <h4 className="arh-modal__title">Approve Admission Request</h4>
            <p className="arh-modal__text">
              You are approving the admission request for <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>. This transitions the request to <span className="font-bold text-emerald-600">Contracting</span> and verifies health eligibility.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <div className="mb-4 relative">
              <label className="block text-xs font-semibold text-slate-500 mb-2 font-sans tracking-wide">
                Assign Care Service Package <span className="text-slate-400 font-normal italic text-[11px] ml-1">(optional)</span>
              </label>
              {loadingPackages ? (
                <div className="flex items-center gap-2 py-2.5 text-xs text-slate-400">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Loading active care packages...</span>
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpenPackageDropdown(!isOpenPackageDropdown);
                    }}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm flex justify-between items-center cursor-pointer hover:border-slate-300 transition-all font-sans text-left"
                    style={{ minHeight: '42px', fontFamily: "'Inter', sans-serif" }}
                  >
                    <span className="text-slate-700 font-medium">
                      {selectedPackage || '-- No Care Package Assignment --'}
                    </span>
                    <span className="text-slate-400 text-xs transition-transform duration-200" style={{ transform: isOpenPackageDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </button>

                  {isOpenPackageDropdown && (
                    <div
                      className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[1100] max-h-60 overflow-y-auto animate-fade-in"
                      style={{ fontFamily: "'Inter', sans-serif", boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' }}
                    >
                      <div
                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-[10px] text-slate-400 font-bold border-b border-slate-100 transition-all uppercase tracking-wider text-center"
                        onClick={() => {
                          setSelectedPackage('');
                          setIsOpenPackageDropdown(false);
                        }}
                      >
                        -- Leave Empty (No Care Package) --
                      </div>
                      {packages.map((pkg) => (
                        <div
                          key={pkg._id}
                          className="px-4 py-2 hover:bg-[#1B365D]/5 cursor-pointer border-b border-slate-100 last:border-b-0 flex flex-col gap-1 transition-all"
                          onClick={() => {
                            setSelectedPackage(pkg.name);
                            setIsOpenPackageDropdown(false);
                          }}
                        >
                          {/* Hàng 1: Tên dịch vụ bên trái, Tag Tier bên phải */}
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[13px] font-medium text-[#1B365D] tracking-wide">
                              {pkg.name}
                            </span>
                            <span className="font-medium uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md text-[9px] tracking-wider border border-emerald-100 flex-shrink-0">
                              {pkg.tier}
                            </span>
                          </div>

                          {/* Hàng 2: Giá tiền nằm dưới, căn phải */}
                          <div className="flex justify-end w-full">
                            <span className="font-medium text-[#1B365D]/80 text-[11.5px] bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                              {pkg.monthlyPrice?.toLocaleString()} VND / month
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Administrative Notes
              </label>
              <textarea
                className="arh-modal__textarea"
                placeholder="Add special instructions, comments, or follow-up tasks..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                className="adm-btn-clear flex-1"
                style={{ borderRadius: '20px', padding: '10px 24px' }}
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedPackage('');
                  setAdminNotes('');
                  setIsOpenPackageDropdown(false);
                }}
                disabled={approving}
              >
                Cancel
              </button>
              <button
                className="adm-btn-apply flex-1 justify-center"
                style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                onClick={handleApproveRequest}
                disabled={approving}
              >
                {approving && <Loader2 className="animate-spin mr-1" size={13} />}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reject Modal */}
      {showRejectModal && (
        <div
          className="arh-modal-backdrop"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="arh-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="arh-modal__title" style={{ color: '#ba1a1a' }}>Reject Admission Request</h4>
            <p className="arh-modal__text">
              You are rejecting the admission request for <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>. This transitions the request to <span className="font-bold text-red-600">Cancelled</span> and marks them as ineligible.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Rejection Reason (Mandatory)
              </label>
              <textarea
                className="arh-modal__textarea"
                style={{ border: '1px solid rgba(186, 26, 26, 0.25)' }}
                placeholder="Enter details on why this application is rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                className="arh-drawer__btn"
                style={{ background: '#f1f5f9', color: '#475569' }}
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={rejecting}
              >
                Cancel
              </button>
              <button
                className="arh-drawer__btn arh-drawer__btn--cancel"
                onClick={handleRejectRequest}
                disabled={rejecting || !rejectionReason.trim()}
              >
                {rejecting && <Loader2 className="animate-spin mr-1" size={13} />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Assign Consultant Modal */}
      {showAssignModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowAssignModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Assign Consultant</h4>
            <p className="arh-modal__text">
              Select a medical staff member (Doctor or Nurse) to be in charge of consultation and initial assessment for <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAssignConsultant}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Select Consultant *
                </label>
                {loadingStaff ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Loading available staff...</span>
                  </div>
                ) : (
                  <select
                    className="adm-filter-select"
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    required
                  >
                    <option value="">-- Pick Doctor or Nurse --</option>
                    {staffMembers.map((st) => (
                      <option key={st._id} value={st._id}>
                        {st.fullName} ({st.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedStaffId('');
                  }}
                  disabled={assigning}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={assigning || !selectedStaffId}
                >
                  {assigning && <Loader2 className="animate-spin mr-1" size={13} />}
                  Assign Consultant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Record Pre-admission Consultation Modal */}
      {showConsultationModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowConsultationModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Record Pre-admission Consultation</h4>
            <p className="arh-modal__text">
              Log consultation and support notes for <strong className="text-slate-800">{admission?.applicant?.fullName}</strong> to evaluate care requirements.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleRecordConsultation}>
              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Consultation Notes *
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '120px' }}
                  placeholder="Record summary of notes, family requests, care expectations, etc..."
                  value={consultationNotes}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Additional Notes
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '60px' }}
                  placeholder="Optional general notes..."
                  value={consultationGenNotes}
                  onChange={(e) => setConsultationGenNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                  onClick={() => {
                    setShowConsultationModal(false);
                    setConsultationNotes('');
                    setConsultationGenNotes('');
                  }}
                  disabled={recordingConsultation}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={recordingConsultation || !consultationNotes.trim()}
                >
                  {recordingConsultation && <Loader2 className="animate-spin mr-1" size={13} />}
                  Record Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Schedule Initial Assessment Modal */}
      {showScheduleModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowScheduleModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Schedule Initial Health Assessment</h4>
            <p className="arh-modal__text">
              Set a date and time for the physical health and cognitive assessment of <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleScheduleAssessment}>
              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Assessment Date & Time * (Must be in the future)
                </label>
                <input
                  type="datetime-local"
                  className="adm-filter-input"
                  style={{ paddingLeft: '14px' }}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Initial Assessment Notes
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '60px' }}
                  placeholder="Special instructions for patient preparation, location (e.g. Room B102)..."
                  value={initialAssessmentNotes}
                  onChange={(e) => setInitialAssessmentNotes(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  General Notes
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '50px' }}
                  placeholder="Optional general notes..."
                  value={scheduleGenNotes}
                  onChange={(e) => setScheduleGenNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                  onClick={() => {
                    setShowScheduleModal(false);
                    setScheduleDate('');
                    setInitialAssessmentNotes('');
                    setScheduleGenNotes('');
                  }}
                  disabled={scheduling}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={scheduling || !scheduleDate}
                >
                  {scheduling && <Loader2 className="animate-spin mr-1" size={13} />}
                  Schedule Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Evaluate Admission Eligibility Modal */}
      {showEligibilityModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowEligibilityModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Evaluate Admission Eligibility</h4>
            <p className="arh-modal__text">
              As a Doctor, evaluate the physical/medical eligibility of <strong className="text-slate-800">{admission?.applicant?.fullName}</strong> for staying at the care home.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleEvaluateEligibility}>
              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Eligibility Status *
                </label>
                <select
                  className="adm-filter-select"
                  value={eligibilityStatus}
                  onChange={(e) => setEligibilityStatus(e.target.value)}
                  required
                >
                  <option value="eligible">Eligible (Đủ điều kiện nhập viện)</option>
                  <option value="not_eligible">Ineligible (Không đủ điều kiện - Từ chối)</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Medical Assessment Result Summary *
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="Provide detailed clinical assessment result and reasoning..."
                  value={assessmentResult}
                  onChange={(e) => setAssessmentResult(e.target.value)}
                  required
                />
              </div>

              {eligibilityStatus === 'not_eligible' && (
                <div className="mb-3">
                  <label className="block text-xs font-bold text-red-600 mb-1.5 uppercase tracking-wider">
                    Rejection Reason *
                  </label>
                  <textarea
                    className="arh-modal__textarea"
                    style={{ minHeight: '60px', border: '1.5px solid #fed7d7' }}
                    placeholder="Provide mandatory reason why resident is ineligible (e.g. Requires ICU care, contagious disease)..."
                    value={rejReason}
                    onChange={(e) => setRejReason(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  General Notes
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '50px' }}
                  placeholder="Optional general notes..."
                  value={eligibilityGenNotes}
                  onChange={(e) => setEligibilityGenNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                  onClick={() => {
                    setShowEligibilityModal(false);
                    setAssessmentResult('');
                    setRejReason('');
                    setEligibilityGenNotes('');
                  }}
                  disabled={evaluating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={evaluating || !assessmentResult.trim() || (eligibilityStatus === 'not_eligible' && !rejReason.trim())}
                >
                  {evaluating && <Loader2 className="animate-spin mr-1" size={13} />}
                  Submit Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Assign Service Package Modal */}
      {showAssignPackageModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowAssignPackageModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Assign Care Service Package</h4>
            <p className="arh-modal__text">
              Assign or update the Care Service Package for <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAssignPackage}>
              <div className="mb-4 relative">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Active Care Package *
                </label>
                {loadingPackages ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Loading active packages...</span>
                  </div>
                ) : (
                  <select
                    className="adm-filter-select"
                    value={selectedPackageId}
                    onChange={(e) => setSelectedPackageId(e.target.value)}
                    required
                  >
                    <option value="">-- Pick active package --</option>
                    {packages.map((pkg) => (
                      <option key={pkg._id} value={pkg._id}>
                        {pkg.name} ({pkg.tier.toUpperCase()} - {pkg.monthlyPrice?.toLocaleString()} VND/mo)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                  onClick={() => {
                    setShowAssignPackageModal(false);
                    setSelectedPackageId('');
                  }}
                  disabled={assigningPackage}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={assigningPackage || !selectedPackageId}
                >
                  {assigningPackage && <Loader2 className="animate-spin mr-1" size={13} />}
                  Assign Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Create Admission Contract Modal */}
      {showContractModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowContractModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Create/Edit Admission Contract</h4>
            <p className="arh-modal__text">
              Generate admission service terms and sign the care contract for <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateContract}>
              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Contract Number *
                </label>
                <input
                  type="text"
                  className="adm-filter-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="e.g. HĐ-2026-0001"
                  value={contractNum}
                  onChange={(e) => setContractNum(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Contract Start Date
                  </label>
                  <input
                    type="date"
                    className="adm-filter-input"
                    style={{ paddingLeft: '14px' }}
                    value={contractStart}
                    onChange={(e) => setContractStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Contract End Date
                  </label>
                  <input
                    type="date"
                    className="adm-filter-input"
                    style={{ paddingLeft: '14px' }}
                    value={contractEnd}
                    onChange={(e) => setContractEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Contract Terms & Conditions
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="Enter details about billing cycles, responsibility clauses, emergency contacts..."
                  value={contractTerms}
                  onChange={(e) => setContractTerms(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  General Notes
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '50px' }}
                  placeholder="Optional general notes..."
                  value={contractGenNotes}
                  onChange={(e) => setContractGenNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                  onClick={() => {
                    setShowContractModal(false);
                    setContractNum('');
                    setContractStart('');
                    setContractEnd('');
                    setContractTerms('');
                    setContractGenNotes('');
                  }}
                  disabled={creatingContract}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={creatingContract || !contractNum.trim()}
                >
                  {creatingContract && <Loader2 className="animate-spin mr-1" size={13} />}
                  Sign Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Check-in Resident Modal */}
      {showCheckInModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowCheckInModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Confirm Resident Check-in</h4>
            <p className="arh-modal__text">
              Finalize room and bed assignment for <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>. This registers them as an active resident.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCheckInResident}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Assigned Bed ID (ObjectId)
                  </label>
                  <input
                    type="text"
                    className="adm-filter-input"
                    style={{ paddingLeft: '14px' }}
                    placeholder="Optional Bed ObjectId"
                    value={assignedBedHex}
                    onChange={(e) => setAssignedBedHex(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic leading-normal">
                    Format: 24-char hex string. Leave empty if no specific bed is assigned yet.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Assigned Room ID (ObjectId)
                  </label>
                  <input
                    type="text"
                    className="adm-filter-input"
                    style={{ paddingLeft: '14px' }}
                    placeholder="Optional Room ObjectId"
                    value={assignedRoomHex}
                    onChange={(e) => setAssignedRoomHex(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic leading-normal">
                    Format: 24-char hex string. Leave empty if no specific room is assigned yet.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl mb-4">
                <p className="text-xs text-[#1B365D] font-medium leading-relaxed">
                  <strong>Business Rule Note:</strong> Bed and Room ObjectIds must be valid 24-character hexadecimal strings if entered. Leave them empty to proceed with general check-in (both default to <code>null</code>).
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                  onClick={() => {
                    setShowCheckInModal(false);
                    setAssignedBedHex('');
                    setAssignedRoomHex('');
                  }}
                  disabled={checkingIn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={checkingIn}
                >
                  {checkingIn && <Loader2 className="animate-spin mr-1" size={13} />}
                  Confirm Check-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
