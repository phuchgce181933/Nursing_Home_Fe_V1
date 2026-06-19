import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../utils/auth';
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
  UserCheck,
  Eye,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import admissionService from '../../../services/admission.service';
import paymentService from '../../../services/payment.service';
import servicePackageService from '../../../services/servicePackage.service';
import facilityService from '../../../services/facility.service';

const formatViDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
};

const formatEnglishDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
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
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) {
    return '';
  }
};

const formatRelationship = (rel) => {
  if (!rel) return 'Người giám hộ';
  const mapping = {
    child: 'Con cái',
    spouse: 'Vợ/Chồng',
    sibling: 'Anh/Chị/Em',
    grandchild: 'Cháu',
    parent: 'Cha mẹ',
    other: 'Khác',
    con_cai: 'Con cái',
    vo_chong: 'Vợ/Chồng',
    anh_chi_em: 'Anh/Chị/Em',
    chau: 'Cháu',
    bo_me: 'Cha mẹ',
    khac: 'Khác',
    bo: 'Cha',
    me: 'Mẹ',
    con: 'Con cái'
  };
  const normalized = rel.toLowerCase().replace(/_/g, ' ').trim();
  if (mapping[normalized]) return mapping[normalized];
  if (mapping[rel]) return mapping[rel];
  return rel;
};

const formatGender = (gender) => {
  if (!gender) return 'Không rõ';
  const mapping = {
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
    unknown: 'Không rõ'
  };
  return mapping[gender.toLowerCase()] || gender;
};

const formatBloodType = (blood) => {
  if (!blood || blood.toLowerCase() === 'unknown') return 'Chưa xác định';
  return blood;
};

const formatAdmissionReason = (reason) => {
  if (!reason) return 'Chưa ghi nhận';
  const mapping = {
    long_term_care: 'Chăm sóc dài hạn',
    short_term_rehab: 'Phục hồi chức năng ngắn hạn',
    daycare: 'Bán trú',
    palliative_care: 'Chăm sóc giảm nhẹ',
    assisted_living: 'Hỗ trợ sinh hoạt',
    memory_care: 'Chăm sóc đặc biệt trí tuệ',
    'chăm sóc dài hạn': 'Chăm sóc dài hạn',
    'điều trị phục hồi chức năng': 'Phục hồi chức năng',
    'nghỉ dưỡng ngắn hạn': 'Phục hồi chức năng ngắn hạn',
    'khác': 'Khác'
  };
  const normalized = reason.toLowerCase().replace(/_/g, ' ').trim();
  if (mapping[reason]) return mapping[reason];
  if (mapping[normalized]) return mapping[normalized];
  return reason;
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
    return 'THÁNG ' + (d.getMonth() + 1);
  } catch (e) {
    return '';
  }
};

const formatDayOfWeek = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN', { weekday: 'long' });
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

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [isOpenPackageDropdown, setIsOpenPackageDropdown] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [modalError, setModalError] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [consultationGenNotes, setConsultationGenNotes] = useState('');
  const [recordingConsultation, setRecordingConsultation] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [initialAssessmentNotes, setInitialAssessmentNotes] = useState('');
  const [scheduleGenNotes, setScheduleGenNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [eligibilityStatus, setEligibilityStatus] = useState('eligible');
  const [assessmentResult, setAssessmentResult] = useState('');
  const [rejReason, setRejReason] = useState('');
  const [eligibilityGenNotes, setEligibilityGenNotes] = useState('');
  const [evaluating, setEvaluating] = useState(false);

  const [showAssignPackageModal, setShowAssignPackageModal] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [assigningPackage, setAssigningPackage] = useState(false);

  const [showContractModal, setShowContractModal] = useState(false);
  const [contractNum, setContractNum] = useState('');
  const [contractStart, setContractStart] = useState('');
  const [contractEnd, setContractEnd] = useState('');
  const [contractDurationMonths, setContractDurationMonths] = useState('');
  const [contractDiscountPercent, setContractDiscountPercent] = useState('');
  const [contractTerms, setContractTerms] = useState('');
  const [contractGenNotes, setContractGenNotes] = useState('');
  const [creatingContract, setCreatingContract] = useState(false);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [roomCost, setRoomCost] = useState('');
  const [medicationCost, setMedicationCost] = useState('');
  const [careServiceCost, setCareServiceCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  useEffect(() => {
    if (!showInvoiceModal) return;
    // Compute service fee: monthlyPrice × contractDurationMonths with discount applied
    const monthlyPrice = admission?.servicePackageId?.monthlyPrice || 0;
    const durationMonths = admission?.contractDurationMonths || 1;
    const discountPercent = admission?.contractDiscountPercent || 0;
    const grossService = monthlyPrice * durationMonths;
    const netService = Math.round(grossService * (1 - discountPercent / 100));
    setCareServiceCost(String(netService));
  }, [showInvoiceModal, admission?.servicePackageId?.monthlyPrice, admission?.contractDurationMonths, admission?.contractDiscountPercent]);

  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [assignedBedHex, setAssignedBedHex] = useState('');
  const [assignedRoomHex, setAssignedRoomHex] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [showContractViewModal, setShowContractViewModal] = useState(false);

  // States for facility drilldown check-in dropdowns
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedBedId, setSelectedBedId] = useState('');

  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);

  const openPayosCheckout = (residentId, invoiceId) => {
    if (!invoiceId || !residentId) return;
    const resolvedResidentId = residentId?._id || residentId;
    if (!resolvedResidentId) return;
    const token = getAuthToken();
    const url = `/api/residents/${resolvedResidentId}/invoices/payos/checkout/${invoiceId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(url, '_blank');
  };

  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingBeds, setLoadingBeds] = useState(false);

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

  // Helper: add months to a date string (YYYY-MM-DD) and return YYYY-MM-DD
  const addMonthsToDateStr = (dateStr, months) => {
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      d.setMonth(d.getMonth() + months);
      // handle month overflow (e.g., Jan 31 + 1 month -> Feb 28/29)
      if (d.getDate() < day) {
        d.setDate(0); // last day of previous month
      }
      return d.toISOString().split('T')[0];
    } catch (e) {
      return dateStr;
    }
  };

  // Helper: calculate full months difference between two date-strings (YYYY-MM-DD)
  const monthsBetween = (startStr, endStr) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
      let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
      // adjust if end day is before start day
      if (e.getDate() < s.getDate()) months -= 1;
      return months >= 0 ? months : 0;
    } catch (err) {
      return null;
    }
  };

  // Sync handlers for contract date/duration fields
  const handleContractStartChange = (val) => {
    setContractStart(val);
    // if duration provided, compute end date
    if (contractDurationMonths && contractDurationMonths !== '') {
      const months = parseInt(contractDurationMonths, 10);
      if (!isNaN(months) && months > 0) {
        const end = addMonthsToDateStr(val || new Date().toISOString().split('T')[0], months);
        setContractEnd(end);
      }
    } else if (contractEnd) {
      // if end exists but duration empty, compute duration
      const m = monthsBetween(val, contractEnd);
      if (m != null) setContractDurationMonths(String(m));
    }
  };

  const handleContractEndChange = (val) => {
    setContractEnd(val);
    if (contractStart) {
      const m = monthsBetween(contractStart, val);
      if (m != null) setContractDurationMonths(String(m));
    }
  };

  const handleContractDurationChange = (val) => {
    // allow empty or numeric
    setContractDurationMonths(val);
    const months = parseInt(val, 10);
    if (!isNaN(months) && months > 0) {
      const start = contractStart || new Date().toISOString().split('T')[0];
      setContractStart(start);
      const end = addMonthsToDateStr(start, months);
      setContractEnd(end);
    }
  };

  useEffect(() => {
    if (!isOpen || !admissionId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = (isAdmin || isDoctorOrNurseRole || isAdminRole)
          ? await admissionService.adminGetAdmissionDetail(admissionId)
          : await admissionService.getAdmissionDetail(admissionId);
        setAdmission(res?.admission || null);
      } catch (err) {
        console.error('Failed to load admission details:', err);
        setError('Không thể kết nối máy chủ. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, admissionId, isAdmin, isDoctorOrNurseRole, isAdminRole]);

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

  // Load buildings when check-in modal is shown
  useEffect(() => {
    if (showCheckInModal) {
      const fetchBuildings = async () => {
        try {
          setLoadingBuildings(true);
          const res = await facilityService.listBuildings();
          setBuildings(res || []);
        } catch (err) {
          console.error('Failed to fetch buildings:', err);
        } finally {
          setLoadingBuildings(false);
        }
      };
      fetchBuildings();
    } else {
      setSelectedBuildingId('');
      setSelectedFloorId('');
      setSelectedRoomId('');
      setSelectedBedId('');
      setBuildings([]);
      setFloors([]);
      setRooms([]);
      setBeds([]);
    }
  }, [showCheckInModal]);

  // Load floors when selectedBuildingId changes
  useEffect(() => {
    if (selectedBuildingId) {
      const fetchFloors = async () => {
        try {
          setLoadingFloors(true);
          const res = await facilityService.listFloors({ buildingId: selectedBuildingId });
          setFloors(res || []);
          setSelectedFloorId('');
          setSelectedRoomId('');
          setSelectedBedId('');
          setRooms([]);
          setBeds([]);
        } catch (err) {
          console.error('Failed to fetch floors:', err);
        } finally {
          setLoadingFloors(false);
        }
      };
      fetchFloors();
    } else {
      setFloors([]);
      setSelectedFloorId('');
      setSelectedRoomId('');
      setSelectedBedId('');
      setRooms([]);
      setBeds([]);
    }
  }, [selectedBuildingId]);

  // Load rooms when selectedFloorId changes
  useEffect(() => {
    if (selectedFloorId) {
      const fetchRooms = async () => {
        try {
          setLoadingRooms(true);
          const res = await facilityService.listRoomsByFloor(selectedFloorId);
          setRooms(res || []);
          setSelectedRoomId('');
          setSelectedBedId('');
          setBeds([]);
        } catch (err) {
          console.error('Failed to fetch rooms:', err);
        } finally {
          setLoadingRooms(false);
        }
      };
      fetchRooms();
    } else {
      setRooms([]);
      setSelectedRoomId('');
      setSelectedBedId('');
      setBeds([]);
    }
  }, [selectedFloorId]);

  // Load beds when selectedRoomId changes
  useEffect(() => {
    if (selectedRoomId) {
      const fetchBeds = async () => {
        try {
          setLoadingBeds(true);
          const res = await facilityService.listAvailableBedsByRoom(selectedRoomId);
          setBeds(res || []);
          setSelectedBedId('');
        } catch (err) {
          console.error('Failed to fetch beds:', err);
        } finally {
          setLoadingBeds(false);
        }
      };
      fetchBeds();
    } else {
      setBeds([]);
      setSelectedBedId('');
    }
  }, [selectedRoomId]);

  if (!isOpen) return null;

  const handleCancelRequest = async () => {
    if (!admissionId) return;
    try {
      setCancelling(true);
      await admissionService.cancelAdmissionRequest(admissionId, {
        cancellationReason: cancellationReason.trim() || 'Huỷ theo yêu cầu của gia đình',
      });
      setShowCancelModal(false);
      setCancellationReason('');
      if (onCancelSuccess) {
        onCancelSuccess();
      }
      const res = (isAdmin || isDoctorOrNurseRole || isAdminRole)
        ? await admissionService.adminGetAdmissionDetail(admissionId)
        : await admissionService.getAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to cancel admission request:', err);
      setModalError(err.response?.data?.message || 'Đã xảy ra lỗi khi huỷ yêu cầu. Vui lòng thử lại.');
    } finally {
      setCancelling(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!admissionId) return;
    try {
      setApproving(true);
      await admissionService.adminApproveAdmission(admissionId, {
        notes: adminNotes.trim() || undefined,
      });
      setShowApproveModal(false);
      setSelectedPackage('');
      setAdminNotes('');
      if (onCancelSuccess) {
        onCancelSuccess();
      }
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to approve request:', err);
      setModalError(err.response?.data?.message || 'Đã xảy ra lỗi khi duyệt yêu cầu.');
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
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to reject request:', err);
      setModalError(err.response?.data?.message || 'Đã xảy ra lỗi khi từ chối yêu cầu.');
    } finally {
      setRejecting(false);
    }
  };

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
      setModalError(err.response?.data?.message || 'Đã xảy ra lỗi khi phân công tư vấn viên.');
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
      setModalError(err.response?.data?.message || 'Đã xảy ra lỗi khi ghi nhận tư vấn.');
    } finally {
      setRecordingConsultation(false);
    }
  };

  const handleScheduleAssessment = async (e) => {
    if (e) e.preventDefault();
    if (!admissionId || !scheduleDate) return;

    try {
      setScheduling(true);
      let selectedDate = new Date(scheduleDate);
      const now = new Date();
      if (selectedDate.getTime() - now.getTime() < 5 * 60 * 1000) {
        selectedDate = new Date(now.getTime() + 10 * 60 * 1000);
      }

      await admissionService.medicalScheduleAssessment(admissionId, {
        scheduledAt: selectedDate.toISOString(),
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
      setModalError(err.response?.data?.message || 'Đã xảy ra lỗi khi lên lịch đánh giá.');
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
      setModalError(err.response?.data?.message || 'Đã xảy ra lỗi khi đánh giá điều kiện nhập viện.');
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
      setModalError(err.response?.data?.message || 'Đã xảy ra lỗi khi gán gói dịch vụ.');
    } finally {
      setAssigningPackage(false);
    }
  };

  const handleCreateContract = async (e) => {
    if (e) e.preventDefault();
    if (!admissionId) return;

    try {
      setCreatingContract(true);
      await admissionService.adminCreateContract(admissionId, {
        contractNumber: contractNum.trim() || undefined,
        contractStartDate: contractStart ? new Date(contractStart).toISOString() : undefined,
        contractEndDate: contractEnd ? new Date(contractEnd).toISOString() : undefined,
        contractDurationMonths: contractDurationMonths !== '' ? parseInt(contractDurationMonths, 10) : undefined,
        contractDiscountPercent: contractDiscountPercent !== '' ? Number(contractDiscountPercent) : undefined,
        contractTerms: contractTerms.trim() || undefined,
        notes: contractGenNotes.trim() || undefined,
      });
      setShowContractModal(false);
      setContractNum('');
      setContractStart('');
      setContractEnd('');
      setContractDurationMonths('');
      setContractDiscountPercent('');
      setContractTerms('');
      setContractGenNotes('');
      if (onCancelSuccess) onCancelSuccess();
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to create contract:', err);
      setModalError(err.response?.data?.message || 'Đã xảy ra lỗi khi tạo hợp đồng.');
    } finally {
      setCreatingContract(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    if (e) e.preventDefault();
    if (!admissionId) return;
    const residentId = admission?.residentId || admission?.resident?._id;
    if (!residentId) return;

    try {
      setCreatingInvoice(true);
      // careServiceCost is already computed with discount applied; roomCost is always 0
      await paymentService.createInvoice(residentId, {
        roomCost: 0,
        medicationCost: medicationCost || 0,
        careServiceCost: careServiceCost ? parseInt(careServiceCost, 10) : 0,
        otherCost: otherCost || 0,
        dueDate: invoiceDueDate || undefined,
      });
      setShowInvoiceModal(false);
      setMedicationCost('');
      setCareServiceCost('');
      setOtherCost('');
      setInvoiceDueDate('');
      if (onCancelSuccess) onCancelSuccess();
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to create invoice:', err);
      setModalError(err.response?.data?.message || 'Đã xảy ra lỗi khi tạo hóa đơn.');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleCheckInResident = async (e) => {
    if (e) e.preventDefault();
    if (!admissionId) return;

    try {
      setCheckingIn(true);
      await admissionService.adminCheckInResident(admissionId, {
        bedId: selectedBedId || undefined,
        roomId: selectedRoomId || undefined,
      });
      setShowCheckInModal(false);
      setSelectedBuildingId('');
      setSelectedFloorId('');
      setSelectedRoomId('');
      setSelectedBedId('');
      if (onCancelSuccess) onCancelSuccess();
      const res = await admissionService.adminGetAdmissionDetail(admissionId);
      setAdmission(res?.admission || null);
    } catch (err) {
      console.error('Failed to check-in resident:', err);
      setModalError(err.response?.data?.message || 'Đã xảy ra lỗi khi nhận cư dân vào ở.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handlePrintContract = () => {
    if (!admission) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Vui lòng cho phép trình duyệt mở popup để xuất PDF/In hợp đồng.');
      return;
    }
    
    const htmlContent = `
      <html>
        <head>
          <title>Hop_dong_nhap_vien_${admission.contractNumber || 'NH'}</title>
          <style>
            body {
              font-family: "Times New Roman", Times, serif, Arial, sans-serif;
              line-height: 1.5;
              padding: 40px;
              color: #000;
              background: #fff;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              text-transform: uppercase;
            }
            .title {
              text-align: center;
              font-size: 20px;
              font-weight: bold;
              margin: 20px 0;
              text-transform: uppercase;
            }
            .section-title {
              font-weight: bold;
              margin-top: 20px;
              margin-bottom: 10px;
              text-decoration: underline;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 15px;
            }
            .item {
              margin-bottom: 8px;
            }
            .label {
              font-weight: bold;
            }
            .terms {
              border: 1px solid #ccc;
              padding: 15px;
              margin: 15px 0;
              white-space: pre-wrap;
              font-size: 13px;
              background: #fafafa;
            }
            .signatures {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              text-align: center;
              width: 45%;
            }
            .signature-space {
              margin-top: 60px;
              font-style: italic;
              color: #555;
            }
            @media print {
              body {
                padding: 20px;
              }
              .no-print {
                display: none;
              }
              .terms {
                border: none;
                padding: 0;
                background: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
            <strong>Độc lập - Tự do - Hạnh phúc</strong><br/>
            <span>-----------------------</span>
          </div>
          <div class="title">
            HỢP ĐỒNG CHĂM SÓC VÀ LƯU TRÚ NGƯỜI CAO TUỔI
          </div>
          <div style="text-align: center; margin-bottom: 30px;">
            Số hợp đồng: ${admission.contractNumber || 'Chưa thiết lập'}<br/>
            Ngày lập: ${formatEnglishDate(admission.contractSignedAt || admission.createdAt)}
          </div>
          
          <div class="section-title">BÊN A: TRUNG TÂM DƯỠNG LÃO NURSING HOME (ĐƠN VỊ CUNG CẤP DỊCH VỤ)</div>
          <div class="item"><span class="label">Đại diện:</span> Ban Giám Đốc Trung Tâm</div>
          <div class="item"><span class="label">Địa chỉ:</span> 123 Đường Y Tế, Quận 1, TP.HCM</div>
          <div class="item"><span class="label">Số điện thoại:</span> 1900 6868</div>

          <div class="section-title">BÊN B: ĐẠI DIỆN GIA ĐÌNH (NGƯỜI BẢO LÃNH)</div>
          <div class="grid">
            <div class="item"><span class="label">Họ và tên:</span> ${admission.familyAccount?.fullName || admission.requestedByName || 'N/A'}</div>
            <div class="item"><span class="label">Số điện thoại:</span> ${admission.requestedByPhone || admission.familyAccount?.phone || 'N/A'}</div>
            <div class="item" style="grid-column: span 2"><span class="label">Email:</span> ${admission.familyAccount?.email || 'N/A'}</div>
            <div class="item" style="grid-column: span 2"><span class="label">Quan hệ với người cao tuổi:</span> ${formatRelationship(admission.applicant?.relationshipToRequester)}</div>
          </div>

          <div class="section-title">ĐỐI TƯỢNG CHĂM SÓC (NGƯỜI CAO TUỔI)</div>
          <div class="grid">
            <div class="item"><span class="label">Họ và tên:</span> ${admission.applicant?.fullName || 'N/A'}</div>
            <div class="item"><span class="label">Ngày sinh:</span> ${formatEnglishDate(admission.applicant?.dateOfBirth)}</div>
            <div class="item"><span class="label">Giới tính:</span> ${formatGender(admission.applicant?.gender)}</div>
            <div class="item"><span class="label">Số CCCD:</span> ${admission.applicant?.citizenId || 'N/A'}</div>
            <div class="item" style="grid-column: span 2"><span class="label">Địa chỉ thường trú:</span> ${admission.applicant?.personalAddress || 'N/A'}</div>
          </div>

          <div class="section-title">NỘI DUNG VÀ ĐIỀU KHOẢN HỢP ĐỒNG</div>
          <div class="item"><span class="label">Gói dịch vụ đăng ký:</span> ${admission.servicePackageId?.name || admission.assignedServicePackage || 'N/A'}</div>
          <div class="item">
            <span class="label">Phí dịch vụ hàng tháng:</span> 
            ${admission.servicePackageId?.monthlyPrice ? (admission.servicePackageId.monthlyPrice.toLocaleString() + ' VND/tháng') : 'Theo đơn giá gói'}
          </div>
          <div class="item">
            <span class="label">Thời hạn hợp đồng:</span> 
            Từ ngày ${formatEnglishDate(admission.contractStartDate)} đến ngày ${formatEnglishDate(admission.contractEndDate)}
          </div>
          
          <div class="label" style="margin-top: 15px;">Các điều khoản thỏa thuận:</div>
          <div class="terms">${admission.contractTerms || 'Hai bên đồng ý tuân thủ các quy định và nội quy chung của Trung tâm dưỡng lão trong suốt thời gian lưu trú.'}</div>

          <div class="signatures">
            <div class="signature-box">
              <strong>ĐẠI DIỆN TRUNG TÂM (BÊN A)</strong>
              <div class="signature-space">
                (Ký, ghi rõ họ tên và đóng dấu)
                <br/><br/>
                <span style="font-weight: bold; color: #1B365D;">ĐÃ KÝ</span>
              </div>
            </div>
            <div class="signature-box">
              <strong>ĐẠI DIỆN GIA ĐÌNH (BÊN B)</strong>
              <div class="signature-space">
                (Ký và ghi rõ họ tên)
                <br/><br/>
                <span style="font-weight: bold; color: #1B365D;">ĐÃ KÝ</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    };
  };

  // Determine if request is cancellable (family mode)
  // Block cancellation once the intake clinical appointment has been completed by the doctor
  const intakeApptCompleted = admission?.assignedCareAppointment?.status === 'completed';
  const isCancellable =
    !isAdmin &&
    admission &&
    ['new_request', 'consulting', 'assessing', 'contracting'].includes(admission.status) &&
    !intakeApptCompleted;

  // Determine if request is approvable/rejectable (admin mode)
  // Only approvable if: admin role, status is new_request or consulting, AND not yet approved before
  const isApprovable =
    isAdminRole &&
    admission &&
    ['new_request', 'consulting'].includes(admission.status) &&
    !admission.approvedAt;

  const isRejectable =
    isAdminRole &&
    admission &&
    ['new_request', 'consulting'].includes(admission.status) &&
    !admission.approvedAt;

  const getTimelineSteps = () => {
    if (!admission) return [];

    const steps = [
      {
        key: 'new_request',
        title: 'Yêu cầu mới',
        statusText: `Đã gửi`,
        date: `${formatEnglishDate(admission.createdAt)} - ${formatTime(admission.createdAt)}`,
        isDone: true,
        isActive: false,
      },
      {
        key: 'consulting',
        title: 'Tư vấn tiếp nhận',
        statusText: ['consulting', 'assessing', 'contracting', 'checked_in'].includes(admission.status)
          ? 'Đã hoàn thành'
          : 'Đang chờ',
        date: admission.consultedAt
          ? `${formatViDate(admission.consultedAt)}`
          : admission.consultationScheduledAt
            ? `Lịch hẹn: ${formatEnglishDate(admission.consultationScheduledAt)}`
            : '',
        isDone: ['assessing', 'contracting', 'checked_in'].includes(admission.status) || !!admission.consultedAt,
        isActive: admission.status === 'consulting',
      },
      {
        key: 'assessing',
        title: 'Đánh giá y tế',
        statusText: ['assessing', 'contracting', 'checked_in'].includes(admission.status)
          ? (admission.eligibilityStatus === 'eligible' ? 'Đã duyệt (Đủ điều kiện)' : admission.eligibilityStatus === 'not_eligible' ? 'Từ chối (Không đủ điều kiện)' : 'Đang tiến hành')
          : 'Đang chờ',
        date: admission.assessedAt ? `${formatEnglishDate(admission.assessedAt)}` : '',
        isDone: ['contracting', 'checked_in'].includes(admission.status) && admission.eligibilityStatus === 'eligible',
        isActive: admission.status === 'assessing',
      },
      {
        key: 'contracting',
        title: 'Ký hợp đồng',
        statusText: ['contracting', 'checked_in'].includes(admission.status)
          ? (admission.status === 'checked_in' ? 'Đã hoàn thành' : 'Đang làm hợp đồng')
          : 'Đang chờ',
        date: admission.contractSignedAt ? `${formatEnglishDate(admission.contractSignedAt)}` : '',
        isDone: admission.status === 'checked_in',
        isActive: admission.status === 'contracting',
      },
      {
        key: 'checked_in',
        title: 'Nhập viện / Nhận phòng',
        statusText: admission.status === 'checked_in' ? 'Đã hoàn thành' : 'Đang chờ',
        date: admission.checkInAt ? `${formatEnglishDate(admission.checkInAt)}` : '',
        isDone: admission.status === 'checked_in',
        isActive: false,
      },
    ];

    return steps;
  };

  const timelineSteps = getTimelineSteps();

  const appt = admission?.assignedCareAppointment;
  const scheduledDate = appt?.scheduledStartAt || admission?.initialAssessmentScheduledAt || admission?.consultationScheduledAt;
  const appointmentNotes = appt
    ? `Thời gian khám đầu vào do Admin chỉ định`
    : (admission?.initialAssessmentNotes || admission?.consultationNotes || 'Tại Phòng đánh giá y tế, Tòa A');
  const appointmentTitle = appt ? 'LỊCH KHÁM LÂM SÀNG ĐẦU VÀO' : (admission?.initialAssessmentScheduledAt ? 'LỊCH HẸN ĐÁNH GIÁ SỨC KHỎE' : 'LỊCH HẸN TƯ VẤN TIẾP NHẬN');
  const doctor = appt?.doctor;
  const nurse = appt?.nurse;

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
            <h2 className="arh-drawer__title">Chi tiết yêu cầu</h2>
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
              <p className="arh-loading-text">Đang tải thông tin hồ sơ tiếp nhận...</p>
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
                  <Clock size={16} /> TIẾN TRÌNH XỬ LÝ
                </h5>
                <div className="arh-timeline">
                  <div className="arh-timeline__line" />

                  {admission.status === 'cancelled' && (
                    <div className="arh-timeline__step is-cancelled">
                      <div className="arh-timeline__dot animate-pulse" />
                      <p className="arh-timeline__title">Yêu cầu đã bị hủy</p>
                      <p className="arh-timeline__date">
                        Ngày hủy: {formatEnglishDate(admission.cancelledAt || admission.updatedAt)}
                      </p>
                      <p className="arh-timeline__desc">
                        "Lý do: {admission.cancellationReason || admission.rejectionReason || 'Hủy theo yêu cầu'}"
                      </p>
                    </div>
                  )}

                  {timelineSteps.map((step) => {
                    const isDone = step.isDone;
                    const isActive = step.isActive;

                    return (
                      <div key={step.key} className={`arh-timeline__step ${isDone ? 'is-done' : isActive ? 'is-active' : ''}`}>
                        <div className="arh-timeline__dot flex items-center justify-center">
                          {isDone && <Check size={8} className="text-white" />}
                          {isActive && getStepIcon(step.key)}
                        </div>

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
                  <User size={16} /> NGƯỜI LIÊN HỆ CHÍNH
                </h5>
                <div className="arh-detail-card__profile" style={{ background: 'rgba(239, 244, 255, 0.4)', border: '1px solid rgba(27, 54, 93, 0.05)', padding: '14px', borderRadius: '12px' }}>
                  <img
                    alt="Ảnh người yêu cầu"
                    className="arh-detail-card__avatar"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJXACrUfkBY9FzZgqaYWlbX2_62AvB8l3uq1FtPvHQLPXjrGi_pCx100ZMjqgFsjpLnyALy7cQ5HakNfzB6W_5g45qDwYQEw1vHmVH5smWEcdKtoEiRARx_wst369IQZWNEsbxfaQiR7N8bZ8CdZpY4zVsLhpqnZGHYN0qm0QbBarwa-WWJ7keBArDnMmO3hrwY_wqVVkmiqKVtfEhifVie9Jn2HWA4tbPhuGX_x4lUz6m_HgraTM9IbraKGLNxKx4xcqhALN9SqZE"
                  />
                  <div className="arh-detail-card__info">
                    <h4 className="arh-detail-card__name">
                      {admission.familyAccount?.fullName || admission.requestedByName || 'Người thân'}
                    </h4>
                    <p className="arh-detail-item__value" style={{ marginTop: '4px', fontSize: '12.5px', color: '#475569', fontWeight: '500' }}>
                      {formatRelationship(admission.applicant?.relationshipToRequester)} • {admission.requestedByPhone || admission.familyAccount?.phone || 'N/A'}
                    </p>
                    {isAdmin && admission.familyAccount && (
                      <div className="text-[11.5px] text-slate-500 mt-2 font-medium bg-white/70 p-2 rounded border border-slate-100 flex flex-col gap-0.5">
                        <div><strong>Tên đăng nhập:</strong> {admission.familyAccount.username || 'N/A'}</div>
                        <div><strong>Email gia đình:</strong> {admission.familyAccount.email || 'N/A'}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Elderly Resident profile card */}
              <div className="arh-detail-card">
                <h5 className="arh-drawer__section-title">
                  <Heart size={16} /> THÔNG TIN NGƯỜI CAO TUỔI
                </h5>
                <div className="arh-detail-grid">
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label">Họ và tên</p>
                    <p className="arh-detail-item__value" style={{ fontWeight: 'bold' }}>{admission.applicant?.fullName || 'N/A'}</p>
                  </div>
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label">Ngày sinh</p>
                    <p className="arh-detail-item__value">{formatEnglishDate(admission.applicant?.dateOfBirth)}</p>
                  </div>
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label">Nhóm máu</p>
                    <p className="arh-detail-item__value" style={{ fontWeight: 'bold' }}>{formatBloodType(admission.applicant?.bloodType)}</p>
                  </div>
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label">Giới tính</p>
                    <p className="arh-detail-item__value">
                      {formatGender(admission.applicant?.gender)}
                    </p>
                  </div>
                  <div className="arh-detail-item" style={{ gridColumn: 'span 2' }}>
                    <p className="arh-detail-item__label">Địa chỉ hiện tại</p>
                    <p className="arh-detail-item__value" style={{ fontSize: '12.5px', lineHeight: '1.4' }}>
                      {admission.applicant?.personalAddress || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Health Profile Card */}
              <div className="arh-detail-card arh-detail-card--health-alert">
                <h5 className="arh-drawer__section-title">
                  <AlertCircle size={16} /> THÔNG TIN SỨC KHỎE
                </h5>
                <div className="arh-detail-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label" style={{ color: '#ba1a1a' }}>Dị ứng</p>
                    <div className="arh-tags" style={{ marginTop: '4px' }}>
                      {admission.applicant?.allergies && admission.applicant.allergies.length > 0 ? (
                        admission.applicant.allergies.map((alg, i) => (
                          <span key={i} className="arh-tag arh-tag--allergy" style={{ fontWeight: 'bold' }}>
                            {alg}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Không có dị ứng được ghi nhận</span>
                      )}
                    </div>
                  </div>

                  <div className="arh-detail-item" style={{ marginTop: '8px' }}>
                    <p className="arh-detail-item__label" style={{ color: '#ba1a1a' }}>Bệnh mãn tính</p>
                    <div className="arh-tags" style={{ marginTop: '4px' }}>
                      {admission.applicant?.chronicConditions && admission.applicant.chronicConditions.length > 0 ? (
                        admission.applicant.chronicConditions.map((cond, i) => (
                          <span key={i} className="arh-tag" style={{ color: '#ba1a1a', background: 'rgba(186, 26, 26, 0.08)' }}>
                            {cond}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Không có bệnh mãn tính được ghi nhận</span>
                      )}
                    </div>
                  </div>

                  <div className="arh-detail-item" style={{ marginTop: '12px', borderTop: '1px solid rgba(186, 26, 26, 0.15)', paddingTop: '8px' }}>
                    <p className="arh-detail-item__label" style={{ color: '#ba1a1a' }}>Tóm tắt tình trạng sức khỏe</p>
                    <p className="arh-detail-item__value" style={{ fontStyle: 'italic', background: 'rgba(255, 255, 255, 0.6)', padding: '8px 12px', borderRadius: '8px', marginTop: '4px', border: '1px dashed rgba(186, 26, 26, 0.15)', color: '#334155' }}>
                      "{admission.applicant?.initialHealthCondition || 'Chưa có tóm tắt sức khỏe chi tiết'}"
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
                        {formatDayOfWeek(scheduledDate)}, {formatViDate(scheduledDate)}
                      </p>
                      <p className="text-slate-500 text-[12.5px] mt-1 font-medium flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        {formatTime(scheduledDate)} • {appointmentNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Assigned Medical Staff Card */}
              {appt && (doctor || nurse) && (
                <div className="arh-detail-card" style={{ borderLeft: '4px solid #1B365D', background: 'rgba(27, 54, 93, 0.03)' }}>
                  <h5 className="arh-drawer__section-title" style={{ color: '#1B365D' }}>
                    <UserCheck size={16} /> NHÂN VIÊN Y TẾ PHỤ TRÁCH
                  </h5>
                  <div className="arh-detail-grid mt-3">
                    {doctor && (
                      <div className="arh-detail-item">
                        <p className="arh-detail-item__label" style={{ color: '#1B365D' }}>Bác sĩ phụ trách</p>
                        <p className="arh-detail-item__value" style={{ fontWeight: 'bold' }}>{doctor.fullName}</p>
                        {doctor.email && <p className="text-[11px] text-slate-400 font-normal">{doctor.email}</p>}
                      </div>
                    )}
                    {nurse && (
                      <div className="arh-detail-item">
                        <p className="arh-detail-item__label" style={{ color: '#1B365D' }}>Điều dưỡng phụ trách</p>
                        <p className="arh-detail-item__value" style={{ fontWeight: 'bold' }}>{nurse.fullName}</p>
                        {nurse.email && <p className="text-[11px] text-slate-400 font-normal">{nurse.email}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Service Package Card (if assigned) */}
              {(admission.servicePackageId || admission.assignedServicePackage) && (
                <div className="arh-detail-card" style={{ borderLeft: '4px solid #2D6A4F', background: 'rgba(45, 106, 79, 0.03)' }}>
                  <h5 className="arh-drawer__section-title" style={{ color: '#2D6A4F' }}>
                    <CheckCircle size={16} /> GÓI DỊCH VỤ ĐƯỢC CHỈ ĐỊNH
                  </h5>
                  <div className="mt-2 text-[13.5px] font-bold text-[#1B365D]">
                    {admission.servicePackageId?.name || admission.assignedServicePackage}
                  </div>
                  {admission.servicePackageId?.tier && (
                    <div className="text-xs text-slate-500 mt-1 font-medium">
                      Phân hạng: <span className="font-bold text-[#2D6A4F] uppercase">{admission.servicePackageId.tier}</span> • Đơn giá: <span className="font-bold text-[#1B365D]">{admission.servicePackageId.monthlyPrice?.toLocaleString()} VND/tháng</span>
                    </div>
                  )}
                  {admission.latestInvoice ? (
                    <div className="mt-3 rounded-lg bg-white/80 border border-slate-200 p-3 text-sm">
                      <p className="text-slate-500">Trạng thái hóa đơn gần nhất</p>
                      <p className="font-semibold text-slate-800">{admission.latestInvoice.status === 'paid' ? 'Đã thanh toán' : admission.latestInvoice.status === 'partially_paid' ? 'Đã thanh toán một phần' : 'Chưa thanh toán'}</p>
                      {admission.latestInvoice.dueDate && (
                        <p className="text-xs text-slate-500 mt-1">Hạn thanh toán: {new Date(admission.latestInvoice.dueDate).toLocaleDateString('vi-VN')}</p>
                      )}
                      {admission.latestInvoice.status !== 'paid' && (
                        <button
                          type="button"
                          className="button button-primary mt-3"
                          onClick={() => openPayosCheckout(admission.residentId || admission?.resident?._id, admission.latestInvoice._id)}
                        >
                          Thanh toán qua PayOS
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg bg-white/80 border border-slate-200 p-3 text-sm text-slate-600">
                      Chưa có hóa đơn thanh toán liên quan đến gói dịch vụ.
                    </div>
                  )}
                </div>
              )}

              {/* Contract & Accommodation Details Card */}
              {(admission.status === 'checked_in' || admission.status === 'contracting' || admission.contractNumber || admission.assignedBed || admission.assignedRoom || admission.assignedBedId || admission.assignedRoomId) && (
                <div className="arh-detail-card font-sans" style={{ borderLeft: '4px solid #4F46E5', background: 'rgba(79, 70, 229, 0.03)' }}>
                  <h5 className="arh-drawer__section-title" style={{ color: '#4F46E5' }}>
                    <CheckCircle size={16} /> HỢP ĐỒNG & THÔNG TIN LƯU TRÚ
                  </h5>
                  <div className="arh-detail-grid mt-3">
                    <div className="arh-detail-item">
                      <p className="arh-detail-item__label" style={{ color: '#4F46E5' }}>Số hợp đồng</p>
                      <p className="arh-detail-item__value font-bold" style={{ color: admission.contractNumber ? '#1E1B4B' : '#94a3b8' }}>
                        {admission.contractNumber || 'Chưa lập hợp đồng'}
                      </p>
                    </div>
                    <div className="arh-detail-item">
                      <p className="arh-detail-item__label" style={{ color: '#4F46E5' }}>Thời hạn hợp đồng</p>
                      <p className="arh-detail-item__value" style={{ color: admission.contractStartDate ? '#1E1B4B' : '#94a3b8' }}>
                        {admission.contractStartDate ? formatEnglishDate(admission.contractStartDate) : 'N/A'} - {admission.contractEndDate ? formatEnglishDate(admission.contractEndDate) : 'N/A'}
                      </p>
                    </div>
                    {admission.contractTerms && (
                      <div className="arh-detail-item" style={{ gridColumn: 'span 2' }}>
                        <p className="arh-detail-item__label" style={{ color: '#4F46E5' }}>Điều khoản hợp đồng</p>
                        <p className="arh-detail-item__value" style={{ whiteSpace: 'pre-line', fontSize: '12px', color: '#475569', background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid rgba(79, 70, 229, 0.1)', marginTop: '4px' }}>
                          {admission.contractTerms}
                        </p>
                      </div>
                    )}
                    {admission.contractDurationMonths != null && (
                      <div className="arh-detail-item">
                        <p className="arh-detail-item__label" style={{ color: '#4F46E5' }}>Thời hạn hợp đồng</p>
                        <p className="arh-detail-item__value font-bold" style={{ color: '#1E1B4B' }}>
                          {admission.contractDurationMonths} tháng
                        </p>
                      </div>
                    )}
                    {admission.contractDiscountPercent != null && (
                      <div className="arh-detail-item">
                        <p className="arh-detail-item__label" style={{ color: '#4F46E5' }}>Giảm giá hợp đồng</p>
                        <p className="arh-detail-item__value font-bold" style={{ color: '#1E1B4B' }}>
                          {admission.contractDiscountPercent}%
                        </p>
                      </div>
                    )}
                    <div className="arh-detail-item">
                      <p className="arh-detail-item__label" style={{ color: '#4F46E5' }}>Phòng ở</p>
                      <p className="arh-detail-item__value font-bold" style={{ color: (admission.assignedRoom?.roomNumber || admission.assignedRoom || admission.assignedRoomId) ? '#1E1B4B' : '#94a3b8' }}>
                        {admission.assignedRoom?.roomNumber || admission.assignedRoom || admission.assignedRoomId ? `Phòng ${admission.assignedRoom?.roomNumber || admission.assignedRoom || admission.assignedRoomId}` : 'Chưa phân phòng'}
                      </p>
                    </div>
                    <div className="arh-detail-item">
                      <p className="arh-detail-item__label" style={{ color: '#4F46E5' }}>Giường số</p>
                      <p className="arh-detail-item__value font-bold" style={{ color: (admission.assignedBed?.bedCode || admission.assignedBed || admission.assignedBedId) ? '#1E1B4B' : '#94a3b8' }}>
                        {admission.assignedBed?.bedCode || admission.assignedBed || admission.assignedBedId ? `Giường ${admission.assignedBed?.bedCode || admission.assignedBed || admission.assignedBedId}` : 'Chưa phân giường'}
                      </p>
                    </div>
                    {admission.contractNumber && !isDoctorOrNurseRole && (
                      <div className="flex gap-2.5 mt-3 pt-3 border-t border-indigo-100" style={{ gridColumn: 'span 2' }}>
                        <button
                          type="button"
                          onClick={() => setShowContractViewModal(true)}
                          className="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          style={{
                            background: 'rgba(79, 70, 229, 0.08)',
                            color: '#4F46E5',
                            border: '1px solid rgba(79, 70, 229, 0.15)',
                          }}
                        >
                          <Eye size={13} /> Xem hợp đồng
                        </button>
                        <button
                          type="button"
                          onClick={handlePrintContract}
                          className="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          style={{
                            background: '#4F46E5',
                            color: '#ffffff',
                            border: '1px solid #4F46E5',
                          }}
                        >
                          <FileText size={13} /> Xuất PDF
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Extra Admission details */}
              <div className="arh-detail-card">
                <h5 className="arh-drawer__section-title">
                  <Calendar size={16} /> CHI TIẾT YÊU CẦU TIẾP NHẬN
                </h5>
                <div className="arh-detail-grid">
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label">Ngày mong muốn nhập viện</p>
                    <p className="arh-detail-item__value" style={{ color: '#1B365D', fontWeight: 'bold' }}>
                      {formatViDate(admission.preferredAdmissionDate)}
                    </p>
                  </div>
                  <div className="arh-detail-item">
                    <p className="arh-detail-item__label">Mối quan hệ</p>
                    <p className="arh-detail-item__value">{formatRelationship(admission.applicant?.relationshipToRequester)}</p>
                  </div>
                  {admission.consultantId && (
                    <div className="arh-detail-item" style={{ gridColumn: 'span 2', marginTop: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <p className="arh-detail-item__label" style={{ color: '#1B365D' }}>Nhân viên tư vấn</p>
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
                    <p className="arh-detail-item__label">Lý do tiếp nhận</p>
                    <p className="arh-detail-item__value" style={{ fontSize: '12.5px' }}>
                      {formatAdmissionReason(admission.reasonForAdmission)}
                    </p>
                  </div>
                  {admission.notes && (
                    <div className="arh-detail-item" style={{ gridColumn: 'span 2' }}>
                      <p className="arh-detail-item__label">Ghi chú thêm</p>
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
                    <Activity size={16} /> HÀNH ĐỘNG QUY TRÌNH
                  </h5>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {/* 2. Pre-admission Consultation (Doctor & Nurse roles) */}
                    {isDoctorOrNurseRole && ['new_request', 'consulting'].includes(admission.status) && (
                      <button
                        type="button"
                        onClick={() => setShowConsultationModal(true)}
                        className="adm-btn-apply"
                        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none', background: '#1B365D' }}
                      >
                        Ghi nhận tư vấn
                      </button>
                    )}

                    {isDoctorRole && ['new_request', 'consulting', 'assessing', 'contracting'].includes(admission.status) && (
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
                        Đánh giá điều kiện
                      </button>
                    )}

                    {/* 5. Assign Service Package (Admin/Manager role) - Only when doctor confirmed (contracting status) and package is not assigned yet */}
                    {isAdminRole && admission.status === 'contracting' && (!admission.servicePackageId && !admission.assignedServicePackage) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPackageId(admission.servicePackageId?._id || admission.servicePackageId || '');
                          setShowAssignPackageModal(true);
                        }}
                        className="adm-btn-apply"
                        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none', background: '#1B365D' }}
                      >
                        Giao gói dịch vụ
                      </button>
                    )}

                    {/* 6. Create Admission Contract (Admin/Manager role) - Only after package is assigned and contract is not created yet */}
                    {isAdminRole && admission.status === 'contracting' && (admission.servicePackageId || admission.assignedServicePackage) && !admission.contractNumber && (
                      <button
                        type="button"
                        onClick={() => {
                          if (admission.contractNumber) {
                            setContractNum(admission.contractNumber);
                          } else {
                            const year = new Date().getFullYear();
                            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                            setContractNum(`HĐ-${year}-${randomSuffix}`);
                          }
                          setContractStart(admission.contractStartDate ? admission.contractStartDate.split('T')[0] : '');
                          setContractEnd(admission.contractEndDate ? admission.contractEndDate.split('T')[0] : '');
                          setContractDurationMonths(admission.contractDurationMonths != null ? String(admission.contractDurationMonths) : '');
                          setContractDiscountPercent(admission.contractDiscountPercent != null ? String(admission.contractDiscountPercent) : '');
                          setContractTerms(admission.contractTerms || '');
                          setShowContractModal(true);
                        }}
                        className="adm-btn-apply"
                        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none', background: '#1B365D' }}
                      >
                        {admission.contractNumber ? 'Sửa hợp đồng' : 'Tạo hợp đồng'}
                      </button>
                    )}

                    {isAdminRole && (admission.status === 'contracting' || admission.status === 'checked_in') && (admission.servicePackageId || admission.assignedServicePackage) && !admission.latestInvoice && (
                      <button
                        type="button"
                        onClick={() => setShowInvoiceModal(true)}
                        className="adm-btn-apply"
                        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none', background: '#1B365D' }}
                      >
                        Tạo hóa đơn
                      </button>
                    )}

                    {/* 7. Check-in Resident (Admin/Manager role) - Only after contract is created */}
                    {isAdminRole && admission.status === 'contracting' && (admission.servicePackageId || admission.assignedServicePackage) && admission.contractNumber && (
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
                        Nhận phòng cư dân
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
                  Từ chối yêu cầu
                </button>
              )}
              {isApprovable && (
                <button
                  className="arh-drawer__btn arh-drawer__btn--primary flex-1"
                  style={{ background: '#1B365D' }}
                  onClick={() => setShowApproveModal(true)}
                >
                  Duyệt yêu cầu
                </button>
              )}
              {!isApprovable && !isRejectable && (
                <button
                  className="arh-drawer__btn arh-drawer__btn--primary w-full"
                  onClick={onClose}
                >
                  Đóng chi tiết
                </button>
              )}
            </div>
          ) : isCancellable ? (
            <button
              className="arh-drawer__btn arh-drawer__btn--cancel w-full"
              onClick={() => setShowCancelModal(true)}
            >
              <XCircle size={18} />
              Hủy yêu cầu tiếp nhận
            </button>
          ) : (
            <button
              className="arh-drawer__btn arh-drawer__btn--primary w-full"
              onClick={onClose}
            >
              Đóng chi tiết
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
            <h4 className="arh-modal__title">Xác nhận hủy yêu cầu tiếp nhận</h4>
            <p className="arh-modal__text">
              Bạn có chắc chắn muốn hủy yêu cầu tiếp nhận cho{' '}
              <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>? Hành động này sẽ chấm dứt toàn bộ quy trình tư vấn và không thể hoàn tác.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4">
                {modalError}
              </div>
            )}
            <textarea
              className="arh-modal__textarea"
              placeholder="Vui lòng cho biết lý do hủy (ví dụ: Thay đổi kế hoạch gia đình, đã tìm được giải pháp khác...)"
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
                Quay lại
              </button>
              <button
                className="arh-drawer__btn arh-drawer__btn--cancel"
                onClick={handleCancelRequest}
                disabled={cancelling}
              >
                {cancelling && <Loader2 className="animate-spin mr-1" size={13} />}
                Xác nhận hủy
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
              if (isOpenPackageDropdown) setIsOpenPackageDropdown(false);
            }}
          >
            <h4 className="arh-modal__title">Duyệt yêu cầu tiếp nhận</h4>
            <p className="arh-modal__text">
              Bạn đang duyệt yêu cầu tiếp nhận cho <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>. Yêu cầu sẽ chuyển sang giai đoạn <span className="font-bold text-emerald-600">Ký hợp đồng</span> và xác nhận điều kiện sức khỏe.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}



            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Ghi chú quản trị
              </label>
              <textarea
                className="arh-modal__textarea"
                placeholder="Thêm ghi chú, hướng dẫn đặc biệt hoặc các công việc cần theo dõi..."
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
                Hủy bỏ
              </button>
              <button
                className="adm-btn-apply flex-1 justify-center"
                style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                onClick={handleApproveRequest}
                disabled={approving}
              >
                {approving && <Loader2 className="animate-spin mr-1" size={13} />}
                Xác nhận duyệt
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
            <h4 className="arh-modal__title" style={{ color: '#ba1a1a' }}>Từ chối yêu cầu tiếp nhận</h4>
            <p className="arh-modal__text">
              Bạn đang từ chối yêu cầu tiếp nhận của <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>. Yêu cầu sẽ chuyển sang trạng thái <span className="font-bold text-red-600">Đã hủy</span> và được đánh dấu là không đủ điều kiện.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Lý do từ chối (Bắt buộc)
              </label>
              <textarea
                className="arh-modal__textarea"
                style={{ border: '1px solid rgba(186, 26, 26, 0.25)' }}
                placeholder="Nhập chi tiết lý do từ chối đơn tiếp nhận này..."
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
                Hủy bỏ
              </button>
              <button
                className="arh-drawer__btn arh-drawer__btn--cancel"
                onClick={handleRejectRequest}
                disabled={rejecting || !rejectionReason.trim()}
              >
                {rejecting && <Loader2 className="animate-spin mr-1" size={13} />}
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Assign Consultant Modal */}
      {showAssignModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowAssignModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Chỉ định nhân viên tư vấn</h4>
            <p className="arh-modal__text">
              Chọn nhân viên y tế (Bác sĩ hoặc Điều dưỡng) phụ trách tư vấn và đánh giá ban đầu cho <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAssignConsultant}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Chọn nhân viên tư vấn *
                </label>
                {loadingStaff ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang tải danh sách nhân viên...</span>
                  </div>
                ) : (
                  <select
                    className="adm-filter-select"
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn bác sĩ hoặc điều dưỡng --</option>
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
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={assigning || !selectedStaffId}
                >
                  {assigning && <Loader2 className="animate-spin mr-1" size={13} />}
                  Xác nhận chỉ định
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
            <h4 className="arh-modal__title">Ghi nhận tư vấn tiền nhập viện</h4>
            <p className="arh-modal__text">
              Ghi lại nội dung tư vấn và hỗ trợ cho <strong className="text-slate-800">{admission?.applicant?.fullName}</strong> để đánh giá nhu cầu chăm sóc.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleRecordConsultation}>
              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Nội dung tư vấn *
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '120px' }}
                  placeholder="Ghi tóm tắt nội dung tư vấn, yêu cầu của gia đình, mong đợi về chăm sóc..."
                  value={consultationNotes}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Ghi chú bổ sung
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '60px' }}
                  placeholder="Ghi chú thêm (không bắt buộc)..."
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
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={recordingConsultation || !consultationNotes.trim()}
                >
                  {recordingConsultation && <Loader2 className="animate-spin mr-1" size={13} />}
                  Lưu tư vấn
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
            <h4 className="arh-modal__title">Lên lịch đánh giá sức khỏe ban đầu</h4>
            <p className="arh-modal__text">
              Đặt ngày giờ đánh giá sức khỏe thể chất và nhận thức cho <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleScheduleAssessment}>
              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Ngày & Giờ đánh giá * (Phải là thời điểm trong tương lai)
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
                  Ghi chú đánh giá ban đầu
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '60px' }}
                  placeholder="Hướng dẫn đặc biệt cho bệnh nhân, địa điểm (vd: Phòng B102)..."
                  value={initialAssessmentNotes}
                  onChange={(e) => setInitialAssessmentNotes(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Ghi chú chung
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '50px' }}
                  placeholder="Ghi chú thêm (không bắt buộc)..."
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
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={scheduling || !scheduleDate}
                >
                  {scheduling && <Loader2 className="animate-spin mr-1" size={13} />}
                  Xác nhận lịch hẹn
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
            <h4 className="arh-modal__title">Đánh giá điều kiện nhập viện</h4>
            <p className="arh-modal__text">
              Với tư cách bác sĩ, hãy đánh giá điều kiện thể chất/y tế của <strong className="text-slate-800">{admission?.applicant?.fullName}</strong> để xét duyệt nhập viện dưỡng lão.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleEvaluateEligibility}>
              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Kết quả đánh giá *
                </label>
                <select
                  className="adm-filter-select"
                  value={eligibilityStatus}
                  onChange={(e) => setEligibilityStatus(e.target.value)}
                  required
                >
                  <option value="eligible">Đủ điều kiện nhập viện</option>
                  <option value="not_eligible">Không đủ điều kiện – Từ chối</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Tóm tắt kết quả khám lâm sàng *
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="Mô tả chi tiết kết quả và nhận định lâm sàng..."
                  value={assessmentResult}
                  onChange={(e) => setAssessmentResult(e.target.value)}
                  required
                />
              </div>

              {eligibilityStatus === 'not_eligible' && (
                <div className="mb-3">
                  <label className="block text-xs font-bold text-red-600 mb-1.5 uppercase tracking-wider">
                    Lý do từ chối *
                  </label>
                  <textarea
                    className="arh-modal__textarea"
                    style={{ minHeight: '60px', border: '1.5px solid #fed7d7' }}
                    placeholder="Nêu rõ lý do cư dân không đủ điều kiện (vd: Cần chăm sóc ICU, bệnh truyền nhiễm)..."
                    value={rejReason}
                    onChange={(e) => setRejReason(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Ghi chú chung
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '50px' }}
                  placeholder="Ghi chú thêm (không bắt buộc)..."
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
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={evaluating || !assessmentResult.trim() || (eligibilityStatus === 'not_eligible' && !rejReason.trim())}
                >
                  {evaluating && <Loader2 className="animate-spin mr-1" size={13} />}
                  Gửi đánh giá
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
            <h4 className="arh-modal__title">Giao gói dịch vụ chăm sóc</h4>
            <p className="arh-modal__text">
              Giao hoặc cập nhật gói dịch vụ chăm sóc cho <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAssignPackage}>
              <div className="mb-4 relative">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Gói dịch vụ đang hoạt động *
                </label>
                {loadingPackages ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang tải danh sách gói dịch vụ...</span>
                  </div>
                ) : (
                  <select
                    className="adm-filter-select"
                    value={selectedPackageId}
                    onChange={(e) => setSelectedPackageId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn gói dịch vụ --</option>
                    {packages.map((pkg) => (
                      <option key={pkg._id} value={pkg._id}>
                        {pkg.name} ({pkg.tier.toUpperCase()} - {pkg.monthlyPrice?.toLocaleString()} VND/tháng)
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
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={assigningPackage || !selectedPackageId}
                >
                  {assigningPackage && <Loader2 className="animate-spin mr-1" size={13} />}
                  Xác nhận giao gói
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
            <h4 className="arh-modal__title">Tạo / Chỉnh sửa hợp đồng nhập viện</h4>
            <p className="arh-modal__text">
              Lập điều khoản dịch vụ và ký kết hợp đồng chăm sóc cho <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateContract}>
              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Số hợp đồng *
                </label>
                <input
                  type="text"
                  className="adm-filter-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="vd: HĐ-2026-0001"
                  value={contractNum}
                  onChange={(e) => setContractNum(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Ngày bắt đầu hợp đồng
                  </label>
                  <input
                    type="date"
                    className="adm-filter-input"
                    style={{ paddingLeft: '14px' }}
                    value={contractStart}
                    onChange={(e) => handleContractStartChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Ngày kết thúc hợp đồng
                  </label>
                  <input
                    type="date"
                    className="adm-filter-input"
                    style={{ paddingLeft: '14px' }}
                    value={contractEnd}
                    onChange={(e) => handleContractEndChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Số tháng hợp đồng
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="adm-filter-input"
                    style={{ paddingLeft: '14px' }}
                    placeholder="Số tháng"
                    value={contractDurationMonths}
                    onChange={(e) => handleContractDurationChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Giảm giá hợp đồng (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="adm-filter-input"
                    style={{ paddingLeft: '14px' }}
                    placeholder="0 - 100"
                    value={contractDiscountPercent}
                    onChange={(e) => setContractDiscountPercent(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Điều khoản hợp đồng
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="Nhập chi tiết chu kỳ thanh toán, điều khoản trách nhiệm, liên hệ khẩn cấp..."
                  value={contractTerms}
                  onChange={(e) => setContractTerms(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Ghi chú chung
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '50px' }}
                  placeholder="Ghi chú thêm (không bắt buộc)..."
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
                    setContractDurationMonths('');
                    setContractDiscountPercent('');
                    setContractTerms('');
                    setContractGenNotes('');
                  }}
                  disabled={creatingContract}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={creatingContract || !contractNum.trim()}
                >
                  {creatingContract && <Loader2 className="animate-spin mr-1" size={13} />}
                  Ký kết hợp đồng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowInvoiceModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Tạo hóa đơn thanh toán</h4>
            <p className="arh-modal__text">
              Tạo hóa đơn cho cư dân <strong className="text-slate-800">{admission?.applicant?.fullName}</strong> dựa trên gói dịch vụ hiện tại.
            </p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 font-sans">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateInvoice}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Chi phí dịch vụ chăm sóc
                  </label>
                  <div className="adm-filter-input readonly bg-slate-100 text-slate-700 p-2 rounded">
                    {(() => {
                      const monthlyPrice = admission?.servicePackageId?.monthlyPrice || 0;
                      const durationMonths = admission?.contractDurationMonths || 1;
                      const discountPercent = admission?.contractDiscountPercent || 0;
                      const grossService = monthlyPrice * durationMonths;
                      const netService = Math.round(grossService * (1 - discountPercent / 100));
                      return `${netService.toLocaleString('vi-VN')} VND`;
                    })()}
                    {admission?.contractDiscountPercent ? (
                      <div className="text-xs text-slate-500 mt-1">(Đã áp dụng giảm giá {admission.contractDiscountPercent}%)</div>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Chi phí thuốc men
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="adm-filter-input"
                    style={{ paddingLeft: '14px' }}
                    value={medicationCost}
                    onChange={(e) => setMedicationCost(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Chi phí khác
                </label>
                <input
                  type="number"
                  min="0"
                  className="adm-filter-input"
                  style={{ paddingLeft: '14px' }}
                  value={otherCost}
                  onChange={(e) => setOtherCost(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Hạn thanh toán
                </label>
                <input
                  type="date"
                  className="adm-filter-input"
                  style={{ paddingLeft: '14px' }}
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                />
              </div>

              {/* Total Amount Display */}
              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                  Tổng tiền (VND)
                </label>
                <div className="text-2xl font-bold text-emerald-600">
                  {(() => {
                    const monthly = admission?.servicePackageId?.monthlyPrice || 0;
                    const months = admission?.contractDurationMonths || 1;
                    const discount = admission?.contractDiscountPercent || 0;
                    const grossService = monthly * months;
                    const netService = Math.round(grossService * (1 - discount / 100));
                    const total = 
                      0 +
                      (parseInt(medicationCost, 10) || 0) +
                      netService +
                      (parseInt(otherCost, 10) || 0);
                    return total.toLocaleString('vi-VN');
                  })()}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setRoomCost('');
                    setMedicationCost('');
                    setCareServiceCost('');
                    setOtherCost('');
                    setInvoiceDueDate('');
                  }}
                  disabled={creatingInvoice}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={creatingInvoice}
                >
                  {creatingInvoice && <Loader2 className="animate-spin mr-1" size={13} />}
                  Tạo hóa đơn
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
            <h4 className="arh-modal__title">Xác nhận nhận phòng cư dân</h4>
            <p className="arh-modal__text">
              Hoàn tất phân bổ phòng và giường cho <strong className="text-slate-800">{admission?.applicant?.fullName}</strong>. Cư dân sẽ được đăng ký là cư dân đang hoạt động.
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
                    Chọn tòa nhà
                  </label>
                  {loadingBuildings ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 py-2 font-medium">
                      <Loader2 size={12} className="animate-spin" /> Đang tải tòa nhà...
                    </div>
                  ) : (
                    <select
                      className="adm-filter-select w-full"
                      value={selectedBuildingId}
                      onChange={(e) => setSelectedBuildingId(e.target.value)}
                    >
                      <option value="">-- Chọn tòa nhà --</option>
                      {buildings.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Chọn tầng
                  </label>
                  {loadingFloors ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 py-2 font-medium">
                      <Loader2 size={12} className="animate-spin" /> Đang tải danh sách tầng...
                    </div>
                  ) : (
                    <select
                      className="adm-filter-select w-full"
                      value={selectedFloorId}
                      onChange={(e) => setSelectedFloorId(e.target.value)}
                      disabled={!selectedBuildingId}
                    >
                      <option value="">-- Chọn tầng --</option>
                      {floors.map((f) => (
                        <option key={f._id} value={f._id}>
                          {f.label || `Tầng ${f.floorNumber}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Chọn phòng
                  </label>
                  {loadingRooms ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 py-2 font-medium">
                      <Loader2 size={12} className="animate-spin" /> Đang tải danh sách phòng...
                    </div>
                  ) : (
                    <select
                      className="adm-filter-select w-full"
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                      disabled={!selectedFloorId}
                    >
                      <option value="">-- Chọn phòng --</option>
                      {rooms.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.label || `Phòng ${r.roomNumber}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Chọn giường
                  </label>
                  {loadingBeds ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 py-2 font-medium">
                      <Loader2 size={12} className="animate-spin" /> Đang tải danh sách giường...
                    </div>
                  ) : (
                    <select
                      className="adm-filter-select w-full"
                      value={selectedBedId}
                      onChange={(e) => setSelectedBedId(e.target.value)}
                      disabled={!selectedRoomId}
                    >
                      <option value="">-- Chọn giường --</option>
                      {beds.map((b) => (
                        <option key={b._id} value={b._id}>
                          Giường {b.bedCode} ({b.bedType})
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedRoomId && beds.length === 0 && !loadingBeds && (
                    <p className="text-[10.5px] text-red-500 mt-1 font-semibold italic">
                      * Không còn giường trống trong phòng này
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl mb-4">
                <p className="text-xs text-[#1B365D] font-medium leading-relaxed">
                  <strong>Quy tắc nhận phòng:</strong> Hãy chọn lần lượt Tòa nhà ➔ Tầng ➔ Phòng ➔ Giường trống để phân bổ chỗ lưu trú cho cư dân. Để trống để nhận phòng chung (nhận phòng không chỉ định giường).
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                  onClick={() => {
                    setShowCheckInModal(false);
                    setSelectedBuildingId('');
                    setSelectedFloorId('');
                    setSelectedRoomId('');
                    setSelectedBedId('');
                  }}
                  disabled={checkingIn}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={checkingIn}
                >
                  {checkingIn && <Loader2 className="animate-spin mr-1" size={13} />}
                  Xác nhận nhận phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract View Modal */}
      {showContractViewModal && (
        <div
          className="arh-modal-backdrop animate-fade-in"
          style={{ zIndex: 3000, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(10px)' }}
          onClick={() => setShowContractViewModal(false)}
        >
          <div
            className="font-sans flex animate-pop-in overflow-hidden"
            style={{
              maxWidth: '960px',
              width: '95%',
              height: '85vh',
              background: '#f8fafc',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Sidebar: Contract Summary & Actions */}
            <div
              className="w-[300px] flex-shrink-0 flex flex-col justify-between p-7 text-white font-sans"
              style={{
                background: 'linear-gradient(135deg, #1B365D 0%, #0F2038 100%)',
                borderRight: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              {/* Sidebar Header */}
              <div>
                <div className="flex flex-col items-center text-center pb-6 border-b border-white/10">
                  <div 
                    className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-3"
                    style={{ boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                  >
                    <CheckCircle size={22} className="animate-pulse" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Đã xác thực pháp lý</span>
                  <h3 className="mt-2 font-extrabold text-white text-base tracking-tight">HỢP ĐỒNG CHI TIẾT</h3>
                  <p className="text-white/60 text-xs mt-1 font-mono">Số: {admission.contractNumber}</p>
                </div>

                {/* Sidebar Metadata Fields */}
                <div className="flex flex-col gap-4.5 pt-6 text-white/90 text-xs">
                  <div>
                    <span className="block text-white/45 text-[9px] uppercase tracking-wider font-bold mb-1">Đại diện ký kết</span>
                    <span className="font-semibold text-[13px] text-white">
                      {admission.familyAccount?.fullName || admission.requestedByName || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-white/45 text-[9px] uppercase tracking-wider font-bold mb-1">Người cao tuổi</span>
                    <span className="font-semibold text-[13px] text-white/95">
                      {admission.applicant?.fullName || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-white/45 text-[9px] uppercase tracking-wider font-bold mb-1">Gói dịch vụ</span>
                    <span className="inline-block bg-emerald-500/10 text-emerald-300 font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-500/20">
                      {admission.servicePackageId?.name || admission.assignedServicePackage || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-white/45 text-[9px] uppercase tracking-wider font-bold mb-1">Đơn giá định kỳ</span>
                    <span className="font-semibold text-[13px] text-white/95">
                      {admission.servicePackageId?.monthlyPrice ? (admission.servicePackageId.monthlyPrice.toLocaleString() + ' VND/tháng') : 'Theo đơn giá gói'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-white/45 text-[9px] uppercase tracking-wider font-bold mb-1">Thời hạn hợp đồng</span>
                    <span className="font-semibold text-[12.5px] text-white/90">
                      {formatEnglishDate(admission.contractStartDate)} - {formatEnglishDate(admission.contractEndDate)}
                    </span>
                  </div>
                  {admission.contractDurationMonths != null && (
                    <div>
                      <span className="block text-white/45 text-[9px] uppercase tracking-wider font-bold mb-1">Chu kỳ thanh toán</span>
                      <span className="font-semibold text-[12.5px] text-white/90">
                        {admission.contractDurationMonths} tháng
                      </span>
                    </div>
                  )}
                  {admission.contractDiscountPercent != null && (
                    <div>
                      <span className="block text-white/45 text-[9px] uppercase tracking-wider font-bold mb-1">Giảm giá hợp đồng</span>
                      <span className="font-semibold text-[12.5px] text-white/90">
                        {admission.contractDiscountPercent}%
                      </span>
                    </div>
                  )}
                  {/* Invoice status & action */}
                  <div>
                    <span className="block text-white/45 text-[9px] uppercase tracking-wider font-bold mb-1">Trạng thái hóa đơn</span>
                    {admission.latestInvoice ? (
                      <span className="font-semibold text-[12.5px] text-white/90">
                        {admission.latestInvoice.status === 'paid' ? 'Đã thanh toán' : admission.latestInvoice.status === 'partially_paid' ? 'Thanh toán một phần' : admission.latestInvoice.status}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[12.5px] text-white/90">Chưa có hóa đơn</span>
                        <button
                          type="button"
                          onClick={() => { setShowContractViewModal(false); setShowInvoiceModal(true); }}
                          className="py-1 px-2 bg-amber-400 hover:bg-amber-500 text-white rounded text-[11px] font-semibold"
                        >
                          Tạo hóa đơn
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Action Buttons */}
              <div className="flex flex-col gap-3 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={handlePrintContract}
                  className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10 border-none"
                >
                  <FileText size={14} /> Xuất PDF / In hợp đồng
                </button>
                <button
                  type="button"
                  onClick={() => setShowContractViewModal(false)}
                  className="py-2.5 px-4 bg-white/5 hover:bg-white/10 active:scale-[0.98] text-white/95 border border-white/15 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <X size={14} /> Đóng cửa sổ
                </button>
              </div>
            </div>

            {/* Right Panel: Scrollable Document Page Sheet */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
              {/* Top Bar showing file format info */}
              <div className="flex justify-between items-center px-6 py-3 bg-white border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                  <span className="text-xs text-slate-500 font-bold">Chế độ xem tài liệu chính thức (A4)</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium font-sans">
                  Sử dụng tổ hợp phím Ctrl + P để in nhanh
                </div>
              </div>

              {/* Document Sheet Container */}
              <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                <div 
                  className="p-12 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80 rounded-sm mb-6" 
                  style={{ 
                    width: '100%', 
                    maxWidth: '680px', 
                    minHeight: '880px', 
                    fontFamily: '"Times New Roman", Times, serif', 
                    color: '#1e293b', 
                    lineHeight: '1.6',
                    alignSelf: 'flex-start'
                  }}
                >
                  {/* Quốc hiệu tiêu ngữ */}
                  <div className="text-center mb-6" style={{ fontSize: '13px', color: '#000' }}>
                    <strong className="tracking-wide text-xs">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
                    <strong className="tracking-wider text-xs">Độc lập - Tự do - Hạnh phúc</strong><br/>
                    <span className="text-slate-400">-----------------------</span>
                  </div>

                  {/* Tên hợp đồng */}
                  <h2 className="text-center text-lg font-bold my-4 uppercase tracking-wider text-black">
                    HỢP ĐỒNG CHĂM SÓC VÀ LƯU TRÚ NGƯỜI CAO TUỔI
                  </h2>
                  <div className="text-center text-xs text-slate-500 mb-8 font-sans">
                    Số hợp đồng: <strong>{admission.contractNumber}</strong><br/>
                    Ngày lập: {formatEnglishDate(admission.contractSignedAt || admission.createdAt)}
                  </div>

                  {/* Bên A */}
                  <div className="mb-4 text-xs">
                    <h5 className="font-bold border-b border-slate-900 pb-0.5 mb-1.5 text-black uppercase">
                      BÊN A: TRUNG TÂM DƯỠNG LÃO NURSING HOME (ĐƠN VỊ CUNG CẤP DỊCH VỤ)
                    </h5>
                    <div className="grid grid-cols-2 gap-y-1 pl-2 font-serif text-[13px] text-slate-800">
                      <div><strong>Đại diện:</strong> Ban Giám Đốc Trung Tâm</div>
                      <div><strong>Số điện thoại:</strong> 1900 6868</div>
                      <div className="col-span-2"><strong>Địa chỉ:</strong> 123 Đường Y Tế, Quận 1, TP.HCM</div>
                    </div>
                  </div>

                  {/* Bên B */}
                  <div className="mb-4 text-xs">
                    <h5 className="font-bold border-b border-slate-900 pb-0.5 mb-1.5 text-black uppercase">
                      BÊN B: ĐẠI DIỆN GIA ĐÌNH (NGƯỜI BẢO LÃNH)
                    </h5>
                    <div className="grid grid-cols-2 gap-y-1 pl-2 font-serif text-[13px] text-slate-800">
                      <div><strong>Họ và tên:</strong> {admission.familyAccount?.fullName || admission.requestedByName || 'N/A'}</div>
                      <div><strong>Số điện thoại:</strong> {admission.requestedByPhone || admission.familyAccount?.phone || 'N/A'}</div>
                      <div className="col-span-2"><strong>Email:</strong> {admission.familyAccount?.email || 'N/A'}</div>
                      <div className="col-span-2"><strong>Quan hệ với người cao tuổi:</strong> {formatRelationship(admission.applicant?.relationshipToRequester)}</div>
                    </div>
                  </div>

                  {/* Người cao tuổi */}
                  <div className="mb-4 text-xs">
                    <h5 className="font-bold border-b border-slate-900 pb-0.5 mb-1.5 text-black uppercase">
                      ĐỐI TƯỢNG CHĂM SÓC (NGƯỜI CAO TUỔI)
                    </h5>
                    <div className="grid grid-cols-2 gap-y-1 pl-2 font-serif text-[13px] text-slate-800">
                      <div><strong>Họ và tên:</strong> {admission.applicant?.fullName || 'N/A'}</div>
                      <div><strong>Ngày sinh:</strong> {formatEnglishDate(admission.applicant?.dateOfBirth)}</div>
                      <div><strong>Giới tính:</strong> {formatGender(admission.applicant?.gender)}</div>
                      <div><strong>Số CCCD:</strong> {admission.applicant?.citizenId || 'N/A'}</div>
                      <div className="col-span-2"><strong>Địa chỉ thường trú:</strong> {admission.applicant?.personalAddress || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Nội dung hợp đồng */}
                  <div className="mb-4 text-xs">
                    <h5 className="font-bold border-b border-slate-900 pb-0.5 mb-1.5 text-black uppercase">
                      CHI TIẾT DỊCH VỤ VÀ THỜI HẠN
                    </h5>
                    <div className="grid grid-cols-2 gap-y-1 pl-2 font-serif text-[13px] text-slate-800">
                      <div className="col-span-2"><strong>Gói dịch vụ đăng ký:</strong> {admission.servicePackageId?.name || admission.assignedServicePackage || 'N/A'}</div>
                      <div className="col-span-2">
                        <strong>Phí dịch vụ hàng tháng:</strong> {admission.servicePackageId?.monthlyPrice ? (admission.servicePackageId.monthlyPrice.toLocaleString() + ' VND/tháng') : 'Theo đơn giá gói'}
                      </div>
                      {admission.contractDurationMonths != null && (
                        <div className="col-span-2">
                          <strong>Thời hạn hợp đồng:</strong> {admission.contractDurationMonths} tháng
                        </div>
                      )}
                      {admission.contractDiscountPercent != null && (
                        <div className="col-span-2">
                          <strong>Giảm giá hợp đồng:</strong> {admission.contractDiscountPercent}%
                        </div>
                      )}
                      <div className="col-span-2">
                        <strong>Thời hạn hợp đồng:</strong> Từ ngày {formatEnglishDate(admission.contractStartDate)} đến ngày {formatEnglishDate(admission.contractEndDate)}
                      </div>
                    </div>
                  </div>

                  {/* Điều khoản */}
                  <div className="mb-8 text-xs">
                    <h5 className="font-bold border-b border-slate-900 pb-0.5 mb-1.5 text-black uppercase">
                      CÁC ĐIỀU KHOẢN THỎA THUẬN
                    </h5>
                    <div className="pl-2 font-serif text-[13px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {admission.contractTerms || 'Hai bên đồng ý tuân thủ các quy định và nội quy chung của Trung tâm dưỡng lão trong suốt thời gian lưu trú.'}
                    </div>
                  </div>

                  {/* Chữ ký */}
                  <div className="grid grid-cols-2 gap-4 mt-12 text-center text-xs font-serif text-black">
                    <div>
                      <strong>ĐẠI DIỆN TRUNG TÂM (BÊN A)</strong>
                      <div className="mt-16 text-slate-500 italic text-[11px]">(Ký, ghi rõ họ tên và đóng dấu)</div>
                      <div className="mt-4 font-bold text-[#1B365D] tracking-widest text-[14px]">ĐÃ KÝ</div>
                    </div>
                    <div>
                      <strong>ĐẠI DIỆN GIA ĐÌNH (BÊN B)</strong>
                      <div className="mt-16 text-slate-500 italic text-[11px]">(Ký và ghi rõ họ tên)</div>
                      <div className="mt-4 font-bold text-[#1B365D] tracking-widest text-[14px]">ĐÃ KÝ</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
