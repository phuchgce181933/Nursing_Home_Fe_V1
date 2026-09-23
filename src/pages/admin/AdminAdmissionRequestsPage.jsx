import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Eye,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  UserCheck,
  UserPlus,
  FileText,
  Plus,
  User,
  Package,
  Percent,
  FileSignature,
  Hash,
  Loader2,
  RotateCcw,
  EyeOff,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import admissionService from '../../services/admission.service';
import contractService from '../../services/contract.service';
import residentService from '../../services/resident.service';
import servicePackageService from '../../services/servicePackage.service';
import CONTRACT_TERMS_TEMPLATE from '../../constants/contractTermsTemplate';
import { buildContractTerms, buildContractTermsFromForm } from '../../utils/contractTermsUtils';
import ContractEditor from '../../components/admin/contract/ContractEditor';
import ContractPreviewModal from '../../components/admin/contract/ContractPreviewModal';
import RoomBedAssignmentSection from '../../components/admin/contract/RoomBedAssignmentSection';
import AdmissionDetailDrawer from '../../components/family/SubmitAdmission/AdmissionDetailDrawer';
import CreateWalkInAdmissionModal from '../../components/admin/CreateWalkInAdmissionModal';
import { useToast } from '../../hooks/useToast';
import '../../styles/admin/ContractEditor.css';

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'new_request':
      return 'status-badge-custom-adm--new';
    case 'consulting':
      return 'status-badge-custom-adm--consulting';
    case 'assessing':
      return 'status-badge-custom-adm--assessing';
    case 'contracting':
      return 'status-badge-custom-adm--contracting';
    case 'checked_in':
      return 'status-badge-custom-adm--checked-in';
    case 'cancelled':
      return 'status-badge-custom-adm--cancelled';
    default:
      return 'status-badge-custom-adm--cancelled';
  }
};

const getEligibilityBadgeClass = (eligibility) => {
  switch (eligibility) {
    case 'eligible':
      return 'assess-badge-adm--eligible';
    case 'not_eligible':
      return 'assess-badge-adm--ineligible';
    default:
      return 'assess-badge-adm--pending';
  }
};

export default function AdminAdmissionRequestsPage() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();

  const STATUS_OPTIONS = [
    { value: '', label: t('admin.admissionRequests.allStatuses', 'All Statuses') },
    { value: 'new_request', label: t('admin.admissionRequests.statusNew', 'New Request') },
    { value: 'consulting', label: t('admin.admissionRequests.statusConsulting', 'Consulting') },
    { value: 'assessing', label: t('admin.admissionRequests.statusAssessing', 'Assessing') },
    { value: 'contracting', label: t('admin.admissionRequests.statusContracting', 'Contracting') },
    { value: 'checked_in', label: t('admin.admissionRequests.statusCheckedIn', 'Checked In') },
    { value: 'cancelled', label: t('admin.admissionRequests.statusCancelled', 'Cancelled') },
  ];

  const ELIGIBILITY_OPTIONS = [
    { value: '', label: t('admin.admissionRequests.allEligibility', 'All Eligibility') },
    { value: 'pending', label: t('admin.admissionRequests.eligibilityPending', 'Pending Assessment') },
    { value: 'eligible', label: t('admin.admissionRequests.eligibilityEligible', 'Eligible') },
    { value: 'not_eligible', label: t('admin.admissionRequests.eligibilityIneligible', 'Ineligible') },
  ];

  const formatEnglishDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'new_request':
        return t('admin.admissionRequests.statusNew', 'New Request');
      case 'consulting':
        return t('admin.admissionRequests.statusConsulting', 'Consulting');
      case 'assessing':
        return t('admin.admissionRequests.statusAssessing', 'Assessing');
      case 'contracting':
        return t('admin.admissionRequests.statusContracting', 'Contracting');
      case 'checked_in':
        return t('admin.admissionRequests.statusCheckedIn', 'Checked In');
      case 'cancelled':
        return t('admin.admissionRequests.statusCancelled', 'Cancelled');
      default:
        return status;
    }
  };

  const getEligibilityLabel = (eligibility) => {
    switch (eligibility) {
      case 'eligible':
        return t('admin.admissionRequests.eligibilityEligible', 'Eligible');
      case 'not_eligible':
        return t('admin.admissionRequests.eligibilityIneligible', 'Ineligible');
      default:
        return t('admin.admissionRequests.eligibilityPending', 'Pending');
    }
  };

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Metrics states
  const [metrics, setMetrics] = useState({
    total: 0,
    new: 0,
    processing: 0,
    completed: 0,
  });

  // Filter states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [eligibilityStatus, setEligibilityStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Active filters applied to query
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: '',
    eligibilityStatus: '',
    from: '',
    to: '',
  });

  // Detail Drawer state
  const [selectedAdmissionId, setSelectedAdmissionId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Create walk-in admission modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Create Contract modal state (NEW - luồng mới Doctor → HĐ → Hóa đơn)
  const [isCreateContractModalOpen, setIsCreateContractModalOpen] = useState(false);
  const [createContractAdmission, setCreateContractAdmission] = useState(null);
  const [createContractForm, setCreateContractForm] = useState({
    startDate: '',
    endDate: '',
    durationMonths: 12,
    discountPercent: 0,
    // Hình thức thanh toán: FULL = thanh toán tất cả, HALF_NOW = thanh toán 50%, MONTHLY = thanh toán theo tháng
    paymentPlan: 'MONTHLY',
    terms: '',
    notes: '',
  });
  const [availableServicePackages, setAvailableServicePackages] = useState([]);
  const [servicePackagesLoading, setServicePackagesLoading] = useState(false);
  const [selectedServicePackageId, setSelectedServicePackageId] = useState('');

  // Helper: Calculate end date from start date + duration (months)
  const calculateEndDate = (startDate, months) => {
    if (!startDate || !months) return '';
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + parseInt(months, 10));
    return date.toISOString().split('T')[0];
  };

  // Helper: Calculate duration (months) from start date + end date
  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months += end.getMonth() - start.getMonth();
    // Add 1 if end day >= start day (inclusive month)
    if (end.getDate() >= start.getDate()) months += 1;
    return Math.max(1, months);
  };

  // Handler: Start date change → auto-update end date if duration is set
  const handleStartDateChange = (value) => {
    setCreateContractForm(prev => {
      const newForm = { ...prev, startDate: value };
      if (prev.durationMonths && value) {
        newForm.endDate = calculateEndDate(value, prev.durationMonths);
      }
      return newForm;
    });
  };

  // Handler: Duration change → auto-update end date
  const handleDurationChange = (value) => {
    setCreateContractForm(prev => {
      const newForm = { ...prev, durationMonths: value };
      if (prev.startDate && value) {
        newForm.endDate = calculateEndDate(prev.startDate, value);
      }
      return newForm;
    });
  };

  // Handler: End date change → auto-update duration
  const handleEndDateChange = (value) => {
    setCreateContractForm(prev => {
      const newForm = { ...prev, endDate: value };
      if (prev.startDate && value) {
        newForm.durationMonths = calculateDuration(prev.startDate, value);
      }
      return newForm;
    });
  };
  // Structured form data for contract editor (per-article forms)
  const [contractEditorForm, setContractEditorForm] = useState({
    representative: {},
    health: {},
    package: {},
    contacts: [],
    terms: '',
  });
  // Phân bổ phòng/giường được tách riêng ra khỏi ContractEditor — lưu ở đây.
  const [roomBedAssignment, setRoomBedAssignment] = useState({
    buildingId: '',
    buildingName: '',
    floorId: '',
    floorName: '',
    roomId: '',
    roomName: '',
    roomType: '',
    bedId: '',
    bedName: '',
  });
  const [emergencyContactsSyncStatus, setEmergencyContactsSyncStatus] = useState('idle'); // idle | saving | success | error
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [showTermsPreview, setShowTermsPreview] = useState(false);
  const [isContractPreviewOpen, setIsContractPreviewOpen] = useState(false);

  // Fetch admission requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        limit,
        search: appliedFilters.search || undefined,
        status: appliedFilters.status || undefined,
        eligibilityStatus: appliedFilters.eligibilityStatus || undefined,
        from: appliedFilters.from || undefined,
        to: appliedFilters.to || undefined,
      };

      const res = await admissionService.adminGetAdmissionList(params);
      
      setData(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);

      // Compute simple dashboard metrics from the data list
      if (res?.data) {
        const totalCount = res.total || 0;
        setMetrics({
          total: totalCount,
          new: res.data.filter(x => x.status === 'new_request').length,
          processing: res.data.filter(x => ['consulting', 'assessing', 'contracting'].includes(x.status)).length,
          completed: res.data.filter(x => x.status === 'checked_in').length,
        });
      }
    } catch (err) {
      console.error('Failed to load admission requests:', err);
      setError(t('admin.admissionRequests.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Apply filters trigger
  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ search, status, eligibilityStatus, from, to });
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setEligibilityStatus('');
    setFrom('');
    setTo('');
    setPage(1);
    setAppliedFilters({ search: '', status: '', eligibilityStatus: '', from: '', to: '' });
  };

  // Open detail drawer
  const handleOpenDetails = (id) => {
    setSelectedAdmissionId(id);
    setIsDrawerOpen(true);
  };

  // Close drawer & reload list on success
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedAdmissionId(null);
  };

  // ═══ NEW FLOW: Create Contract (Doctor khám xong → Tạo HĐ) ═══
  const openCreateContractModal = async (admission) => {
    if (!admission) return;
    // Chỉ cho phép tạo hợp đồng khi Đánh giá y tế đã đạt "Đủ điều kiện"
    // (eligibilityStatus === 'eligible'). Nếu đang "Chờ đánh giá" (pending)
    // hoặc "Không đủ điều kiện" (not_eligible) thì phải hoàn tất đánh giá trước.
    if (admission.eligibilityStatus !== 'eligible') {
      const eligibilityLabel = {
        pending: 'Chờ đánh giá',
        not_eligible: 'Không đủ điều kiện',
      }[admission.eligibilityStatus] || 'chưa xác định';
      showToast(
        t('admin.admissionRequests.contractInvalidEligibility',
          `Không thể tạo hợp đồng khi Đánh giá y tế đang ở trạng thái "${eligibilityLabel}". Chỉ tạo được khi Đánh giá y tế đạt "Đủ điều kiện".`),
        'error'
      );
      return;
    }
    // Cũng chặn các trạng thái terminal (đã nhập viện hoặc đã hủy).
    if (['checked_in', 'cancelled'].includes(admission.status)) {
      showToast(
        t('admin.admissionRequests.contractInvalidStatus',
          'Hợp đồng chỉ có thể tạo trước khi cư dân được tiếp nhận hoặc trước khi yêu cầu bị hủy.'),
        'error'
      );
      return;
    }

    // Pre-fill dates: start = today, end = start + 12 months
    const today = new Date();
    const start = today.toISOString().split('T')[0];
    const end = new Date(today);
    end.setFullYear(end.getFullYear() + 1);
    const endStr = end.toISOString().split('T')[0];

    // Initialize structured editor form from admission data
    const applicant = admission.applicant || {};
    const initialEditorForm = {
      representative: {
        fullName: admission.requestedByName || '',
        relationship: applicant.relationshipToRequester || '',
        citizenId: '',
        phone: admission.requestedByPhone || '',
        email: admission.requestedByEmail || '',
        address: '',
      },
      health: {
        medicalHistory: applicant.chronicConditions?.join('; ') || '',
        currentIllness: '',
        allergies: applicant.allergies?.join('; ') || '',
        medications: applicant.currentMedications?.join('; ') || '',
        diet: applicant.dietaryRequirements || '',
        mobilityLimitations: '',
        specialCareNeeds: '',
        other: '',
      },
      package: {
        name: admission.assignedServicePackage || '',
        monthlyPrice: admission.servicePackageId?.monthlyPrice || '',
        roomType: admission.servicePackageId?.roomType || '',
        mealPlan: admission.servicePackageId?.mealPlan || '',
        description: admission.servicePackageId?.description || '',
      },
      contacts: [],
      terms: '',
    };

    // Pre-select service package: ưu tiên gói đã gán trên admission; nếu chưa có
    // thì để trống để admin chọn từ dropdown.
    const preSelectedPkgId = String(
      admission.servicePackageId?._id || admission.servicePackageId || ''
    );

    // Fetch danh sách gói dịch vụ đang hoạt động để admin chọn.
    // Đợi danh sách load xong rồi mới mở modal để dropdown sẵn sàng ngay.
    setServicePackagesLoading(true);
    try {
      const res = await servicePackageService.getServicePackageList({
        isActive: true,
        limit: 100,
      });
      const list = res?.data || [];
      setAvailableServicePackages(list);
      // Đảm bảo selected id hợp lệ; nếu admission chưa có gói thì chọn gói đầu tiên
      const existsInList = list.some((p) => String(p._id) === preSelectedPkgId);
      setSelectedServicePackageId(existsInList ? preSelectedPkgId : '');
    } catch (err) {
      console.error('Failed to load service packages:', err);
      setAvailableServicePackages([]);
      setSelectedServicePackageId(preSelectedPkgId);
      showToast(
        t('admin.admissionRequests.loadServicePackagesFailed', 'Không thể tải danh sách gói dịch vụ. Vui lòng thử lại.'),
        'error'
      );
    } finally {
      setServicePackagesLoading(false);
    }

    // Build full terms text from structured form
    const terms = buildContractTermsFromForm(initialEditorForm, admission, start, endStr);

    setCreateContractAdmission(admission);
    setCreateContractForm({
      startDate: start,
      endDate: endStr,
      durationMonths: 12,
      discountPercent: 0,
      paymentPlan: 'MONTHLY',
      terms,
      notes: '',
    });
    setContractEditorForm({ ...initialEditorForm, terms });
    // Khởi tạo phân bổ phòng/giường từ admission (nếu admission đã có sẵn)
    setRoomBedAssignment({
      buildingId: admission.assignedRoomId?.buildingId?._id || admission.assignedRoomId?.buildingId || '',
      buildingName: admission.assignedRoomId?.buildingId?.name || '',
      floorId: admission.assignedRoomId?.floorId?._id || admission.assignedRoomId?.floorId || '',
      floorName: admission.assignedRoomId?.floorId?.name || '',
      roomId: admission.assignedRoomId?._id || admission.assignedRoomId || '',
      roomName: admission.assignedRoomId?.roomNumber || '',
      roomType: admission.assignedRoomId?.roomType || '',
      bedId: admission.assignedBedId?._id || admission.assignedBedId || '',
      bedName: admission.assignedBedId?.bedCode || '',
    });
    setEmergencyContactsSyncStatus('idle');
    setIsCreateContractModalOpen(true);
  };

  const handleResetTermsTemplate = () => {
    const terms = buildContractTermsFromForm(
      contractEditorForm,
      createContractAdmission,
      createContractForm.startDate,
      createContractForm.endDate
    );
    setCreateContractForm((prev) => ({ ...prev, terms }));
    setContractEditorForm((prev) => ({ ...prev, terms }));
    showToast(
      t('admin.admissionRequests.termsRestored', 'Đã khôi phục điều khoản'),
      'success'
    );
  };

  // Sync emergency contacts to resident record
  const handleSyncEmergencyContacts = async () => {
    const residentId = createContractAdmission?.residentId?._id || createContractAdmission?.residentId;
    if (!residentId) {
      showToast('Người cao tuổi chưa được tạo hồ sơ — không thể đồng bộ. Vui lòng tạo hồ sơ trước.', 'error');
      return;
    }
    try {
      setEmergencyContactsSyncStatus('saving');
      const contacts = contractEditorForm.contacts || [];
      // POST each contact (or replace all with PUT if backend supports)
      for (const contact of contacts) {
        await residentService.addEmergencyContact(residentId, {
          fullName: contact.fullName,
          relationship: contact.relationship,
          phone: contact.phone,
          email: contact.email || undefined,
          address: contact.address || undefined,
          isPrimary: Boolean(contact.isPrimary),
        });
      }
      setEmergencyContactsSyncStatus('success');
      showToast(
        `Đã lưu ${contacts.length} liên hệ khẩn cấp vào hồ sơ người cao tuổi`,
        'success'
      );
    } catch (err) {
      setEmergencyContactsSyncStatus('error');
      showToast(
        `Lỗi đồng bộ: ${err?.response?.data?.message || err.message}`,
        'error'
      );
    }
  };

  // Callback when editor form changes → rebuild terms
  const handleEditorFormChange = (newEditorForm) => {
    const terms = buildContractTermsFromForm(
      newEditorForm,
      createContractAdmission,
      createContractForm.startDate,
      createContractForm.endDate
    );
    setContractEditorForm(newEditorForm);
    setCreateContractForm((prev) => ({ ...prev, terms }));
  };

  const handleCreateContract = async () => {
    if (!createContractAdmission) return;
    if (!createContractForm.startDate || !createContractForm.endDate) {
      showToast(t('admin.admissionRequests.enterContractDates', 'Vui lòng nhập ngày bắt đầu và kết thúc'), 'error');
      return;
    }
    // Bắt buộc phải chọn gói dịch vụ — nếu không có thì hóa đơn tạo ra sẽ có totalAmount = 0
    const admissionPkgId = String(
      createContractAdmission.servicePackageId?._id
      || createContractAdmission.servicePackageId
      || ''
    );
    if (!selectedServicePackageId && !admissionPkgId) {
      showToast(
        t('admin.admissionRequests.selectServicePackageRequired', 'Vui lòng chọn gói dịch vụ cho hợp đồng'),
        'error'
      );
      return;
    }
    // roomId/bedId từ state mới roomBedAssignment (đã tách khỏi editor package form)
    try {
      setIsCreatingContract(true);
      const result = await contractService.createContractFromAdmission(
        createContractAdmission._id,
        {
          startDate: createContractForm.startDate,
          endDate: createContractForm.endDate,
          durationMonths: Number(createContractForm.durationMonths) || 12,
          discountPercent: Number(createContractForm.discountPercent) || 0,
          paymentPlan: createContractForm.paymentPlan || 'MONTHLY',
          terms: createContractForm.terms,
          notes: createContractForm.notes,
          // Ưu tiên gói admin chọn trên dropdown; fallback về gói của admission
          // (cho phép override ngay cả khi admission đã có gói).
          servicePackageId: selectedServicePackageId || admissionPkgId || undefined,
          // roomId/bedId lấy từ RoomBedAssignmentSection (đã tách riêng khỏi editor)
          roomId: roomBedAssignment.roomId || undefined,
          bedId: roomBedAssignment.bedId || undefined,
        }
      );
      showToast(
        t('admin.admissionRequests.contractCreatedSuccess', 'Đã tạo hợp đồng. Bây giờ bạn có thể xuất hóa đơn ở trang Quản lý Hợp đồng.'),
        'success'
      );
      setIsCreateContractModalOpen(false);
      setCreateContractAdmission(null);
      setSelectedServicePackageId('');
      setAvailableServicePackages([]);
      setRoomBedAssignment({
        buildingId: '',
        buildingName: '',
        floorId: '',
        floorName: '',
        roomId: '',
        roomName: '',
        roomType: '',
        bedId: '',
        bedName: '',
      });
      await fetchRequests();
    } catch (err) {
      console.error('Create contract error:', err);
      showToast(
        err.response?.data?.message || t('admin.admissionRequests.contractCreateFailed', 'Không thể tạo hợp đồng'),
        'error'
      );
    } finally {
      setIsCreatingContract(false);
    }
  };

  const handleActionSuccess = () => {
    fetchRequests();
  };

  return (
    <div className="adm-container">
      
      {/* Top Banner Header */}
      <div className="adm-header">
        <div>
          <h1>
            <ClipboardList className="text-emerald-sage" size={26} />
            {t('admin.admissionRequests.title', 'Admission Requests')}
          </h1>
          <p>
            {t('admin.admissionRequests.subtitle', 'Review, evaluate, approve, and track family admission requests for elderly residents.')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="adm-btn-refresh"
            style={{ backgroundColor: '#0f766e' }}
          >
            <UserPlus className="h-4 w-4" />
            {t('admin.admissionRequests.createWalkIn')}
          </button>
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="adm-btn-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.admissionRequests.reloadData', 'Reload Data')}
          </button>
        </div>
      </div>

      {/* Metrics Counters Section */}
      <div className="adm-metrics-grid">
        {/* Total Card */}
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <span className="adm-stat-label">{t('admin.admissionRequests.totalRequests', 'Total Requests')}</span>
            <span className="adm-stat-value">{total}</span>
          </div>
        </div>

        {/* New Card */}
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: 'rgba(15, 118, 110, 0.08)', color: '#0f766e' }}>
            <Clock size={22} />
          </div>
          <div>
            <span className="adm-stat-label">{t('admin.admissionRequests.newRequests', 'New Requests')}</span>
            <span className="adm-stat-value">{data.filter(x => x.status === 'new_request').length}</span>
          </div>
        </div>

        {/* Processing Card */}
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#faf5ff', color: '#9333ea' }}>
            <Activity size={22} />
          </div>
          <div>
            <span className="adm-stat-label">{t('admin.admissionRequests.inProcessing', 'In Processing')}</span>
            <span className="adm-stat-value">
              {data.filter(x => ['consulting', 'assessing', 'contracting'].includes(x.status)).length}
            </span>
          </div>
        </div>

        {/* Admitted Card */}
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <span className="adm-stat-label">{t('admin.admissionRequests.admitted', 'Admitted')}</span>
            <span className="adm-stat-value">{data.filter(x => x.status === 'checked_in').length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="adm-filter-panel">
        <form onSubmit={handleApplyFilters}>
          <div className="adm-filter-grid">
            
            {/* Search Input */}
            <div className="adm-filter-group">
              <div className="adm-filter-input-wrapper">
                <Search className="adm-filter-input-icon" size={16} />
                <input
                  type="text"
                  className="adm-filter-input"
                  placeholder={t('admin.admissionRequests.searchPlaceholder', 'Search code, relative name, phone...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Status Select */}
            <div className="adm-filter-group">
              <select
                className="adm-filter-select"
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

            {/* Eligibility Select */}
            <div className="adm-filter-group">
              <select
                className="adm-filter-select"
                value={eligibilityStatus}
                onChange={(e) => setEligibilityStatus(e.target.value)}
              >
                {ELIGIBILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Filters - Dates & Buttons */}
          <div className="adm-filter-row-secondary">
            <div className="adm-filter-date-group">
              <span className="adm-date-title">
                <Calendar size={13} className="text-slate-400" /> {t('admin.admissionRequests.submittedRange', 'Submitted Range:')}
              </span>
              
              <input
                type="date"
                className="adm-date-input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-slate-400 text-xs font-semibold">{t('admin.admissionRequests.to', 'to')}</span>
              <input
                type="date"
                className="adm-date-input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="adm-filter-actions">
              <button
                type="button"
                onClick={handleResetFilters}
                className="adm-btn-clear"
              >
                {t('admin.admissionRequests.clearFilters', 'Clear Filters')}
              </button>
              <button
                type="submit"
                className="adm-btn-apply"
              >
                {t('admin.admissionRequests.applyFilters', 'Apply Filters')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main Table Card */}
      <div className="adm-table-card">
        {loading && data.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center bg-white" style={{ minHeight: '300px' }}>
            <RefreshCw className="animate-spin text-emerald-sage mb-3" size={32} />
            <p className="text-slate-500 text-sm">{t('admin.admissionRequests.retrieving', 'Retrieving admission dossiers...')}</p>
          </div>
        ) : error ? (
          <div className="p-10 flex flex-col items-center justify-center text-center bg-white" style={{ minHeight: '300px' }}>
            <AlertCircle className="text-red-500 mb-3" size={36} />
            <p className="text-slate-800 font-bold mb-1">{t('admin.admissionRequests.errorOccurred', 'An error occurred')}</p>
            <p className="text-slate-500 text-sm max-w-md">{error}</p>
            <button
              onClick={fetchRequests}
              className="mt-4 px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-xl font-semibold transition-all"
            >
              {t('admin.admissionRequests.tryAgain', 'Try Again')}
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center bg-white" style={{ minHeight: '300px' }}>
            <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-3" style={{ width: 'fit-content' }}>
              <ClipboardList size={30} />
            </div>
            <p className="text-slate-700 font-bold mb-1">{t('admin.admissionRequests.noRequestsFound', 'No Admission Requests Found')}</p>
            <p className="text-slate-400 text-xs max-w-sm">
              {t('admin.admissionRequests.noRequestsDesc', "We couldn't find any admission requests matching your search or filters.")}
            </p>
          </div>
        ) : (
          <div className="adm-table-responsive">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('admin.admissionRequests.colRequestCode', 'Request Code')}</th>
                  <th>{t('admin.admissionRequests.colElderlyResident', 'Elderly Resident')}</th>
                  <th>{t('admin.admissionRequests.colPrimaryContact', 'Primary Contact')}</th>
                  <th>{t('admin.admissionRequests.colPreferredDate', 'Preferred Date')}</th>
                  <th>{t('admin.admissionRequests.colSubmittedDate', 'Submitted Date')}</th>
                  <th style={{ textAlign: 'center' }}>{t('admin.admissionRequests.colMedicalAssessment', 'Medical Assessment')}</th>
                  <th style={{ textAlign: 'center' }}>{t('admin.admissionRequests.colStatus', 'Status')}</th>
                  <th style={{ textAlign: 'center' }}>{t('admin.admissionRequests.colActions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row._id}
                    className="adm-table-row"
                    onClick={() => handleOpenDetails(row._id)}
                  >
                    <td className="cell-code-adm">
                      #{row.requestCode || `ANH-${row._id.substring(0, 4).toUpperCase()}`}
                    </td>
                    <td>
                      <div className="cell-resident-name">{row.applicant?.fullName || 'N/A'}</div>
                      <div className="cell-resident-meta">
                        {row.applicant?.gender === 'male' ? t('admin.admissionRequests.male', 'MALE') : row.applicant?.gender === 'female' ? t('admin.admissionRequests.female', 'FEMALE') : row.applicant?.gender || 'N/A'}
                        {row.applicant?.dateOfBirth ? ` • ${new Date().getFullYear() - new Date(row.applicant.dateOfBirth).getFullYear()} ${t('admin.admissionRequests.yearsOld', 'years old')}` : ''}
                      </div>
                      {row.requestedByPhone && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {t('admin.admissionRequests.phoneLabel')}: {row.requestedByPhone}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="cell-contact-name">
                        {row.familyAccount?.fullName || row.requestedByName || t('admin.admissionRequests.relative', 'Relative')}
                        {row.familyAccount?.username && (
                          <span className="text-[11px] text-slate-400 font-normal ml-1.5">
                            (@{row.familyAccount.username})
                          </span>
                        )}
                      </div>
                      <div className="cell-contact-phone">
                        {row.familyAccount?.phone || 'N/A'}
                      </div>
                    </td>
                    <td style={{ fontWeight: '500', color: '#475569' }}>
                      {formatEnglishDate(row.preferredAdmissionDate)}
                    </td>
                    <td className="cell-date">
                      {formatEnglishDate(row.createdAt)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`assess-badge-adm ${getEligibilityBadgeClass(row.eligibilityStatus)}`}>
                        {getEligibilityLabel(row.eligibilityStatus)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge-custom-adm ${getStatusBadgeClass(row.status)}`}>
                        {getStatusLabel(row.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenDetails(row._id)}
                        className="adm-btn-action"
                        title={t('admin.admissionRequests.colActions', 'Actions')}
                      >
                        <Eye size={14} />
                      </button>
                      {/* Tạo hợp đồng: chỉ hiển thị khi Đánh giá y tế đã đạt "Đủ điều kiện"
                          (eligibilityStatus === 'eligible') VÀ admission chưa nhập viện
                          (status khác checked_in / cancelled) VÀ chưa có hợp đồng. */}
                      {row.eligibilityStatus === 'eligible'
                        && !['checked_in', 'cancelled'].includes(row.status)
                        && !row.contractNumber && (
                        <button
                          onClick={() => openCreateContractModal(row)}
                          className="adm-btn-action"
                          title={t('admin.admissionRequests.createContractTitle', 'Tạo hợp đồng')}
                          style={{ background: '#10b981', color: 'white', marginLeft: '4px' }}
                        >
                          <FileText size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="adm-pagination-footer">
            <div className="pagination-info">
              {t('admin.admissionRequests.showing', 'Showing')} <span>{(page - 1) * limit + 1}</span> {t('admin.admissionRequests.showingTo', 'to')}{' '}
              <span>{Math.min(page * limit, total)}</span> {t('admin.admissionRequests.showingOf', 'of')}{' '}
              <span>{total}</span> {t('admin.admissionRequests.showingDossiers', 'dossiers')}
            </div>

            <div className="pagination-controls">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="btn-page"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="page-indicator">
                {t('admin.admissionRequests.page', 'Page')} {page} / {totalPages}
              </div>

              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="btn-page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-out Administrative Drawer */}
      <AdmissionDetailDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        admissionId={selectedAdmissionId}
        onCancelSuccess={handleActionSuccess}
        isAdmin={true}
      />

      {/* Create Walk-in Admission Modal */}
      <CreateWalkInAdmissionModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchRequests}
      />

      {/* Modal tạo Hợp đồng từ Admission - NEW FLOW (Doctor khám xong → Tạo HĐ) */}
      {isCreateContractModalOpen && createContractAdmission && (
        <div className="adm-modal-overlay adm-modal-overlay--contract" onClick={() => !isCreatingContract && setIsCreateContractModalOpen(false)}>
          <div className="adm-modal-content adm-modal-content--contract" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header adm-modal-header--contract">
              <h2>
                <span className="adm-modal-header__icon">
                  <FileSignature size={20} />
                </span>
                {t('admin.admissionRequests.createContractTitle', 'Tạo hợp đồng')}
              </h2>
              <button
                onClick={() => {
                  setIsCreateContractModalOpen(false);
                  setCreateContractAdmission(null);
                  setSelectedServicePackageId('');
                  setAvailableServicePackages([]);
                  setRoomBedAssignment({
                    buildingId: '',
                    buildingName: '',
                    floorId: '',
                    floorName: '',
                    roomId: '',
                    roomName: '',
                    roomType: '',
                    bedId: '',
                    bedName: '',
                  });
                }}
                className="adm-modal-close"
                aria-label="Đóng"
                disabled={isCreatingContract}
              >
                ×
              </button>
            </div>

            <div className="adm-modal-body">
              {/* Info card: Resident + Service Package */}
              <div className="adm-contract-info">
                <div className="adm-contract-info-item">
                  <span className="adm-contract-info-label">
                    <User size={14} />
                    {t('admin.admissionRequests.residentLabel', 'Cư dân')}
                  </span>
                  <span className="adm-contract-info-value">
                    {createContractAdmission.applicant?.fullName || 'N/A'}
                  </span>
                </div>
                <div className="adm-contract-info-item">
                  <span className="adm-contract-info-label">
                    <Package size={14} />
                    {t('admin.admissionRequests.servicePackageLabel', 'Gói dịch vụ')}
                  </span>
                  <span className="adm-contract-info-value">
                    {(() => {
                      const id = selectedServicePackageId
                        || (createContractAdmission.servicePackageId?._id
                          || String(createContractAdmission.servicePackageId || ''));
                      const sel = availableServicePackages.find((p) => String(p._id) === id);
                      return sel ? `${sel.name} — ${Number(sel.monthlyPrice || 0).toLocaleString('vi-VN')} VND/tháng`
                        : (createContractAdmission.assignedServicePackage || createContractAdmission.servicePackageId?.name || 'Chưa chọn gói');
                    })()}
                  </span>
                </div>
              </div>

              {/* Service package selector — admin có thể chọn / đổi gói dịch vụ */}
              <div className="adm-form-group">
                <label>
                  <Package size={13} />
                  {t('admin.admissionRequests.servicePackageSelectLabel', 'Chọn gói dịch vụ cho hợp đồng')}
                  <span style={{ color: '#dc2626', marginLeft: 4 }}>*</span>
                </label>
                {servicePackagesLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.9rem' }}>
                    <Loader2 size={14} className="animate-spin" />
                    {t('admin.admissionRequests.loadingServicePackages', 'Đang tải danh sách gói dịch vụ...')}
                  </div>
                ) : (
                  <>
                    <select
                      className="adm-form-input"
                      value={selectedServicePackageId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedServicePackageId(newId);
                        // Đồng bộ đầy đủ thông tin lên contractEditorForm.package để khớp
                        // với preview hợp đồng (đã bỏ tab "Gói dịch vụ" trong ContractEditor).
                        const sel = availableServicePackages.find((p) => String(p._id) === newId);
                        const defaultRoomType = sel?.allowedRoomTypes?.[0] || '';
                        setContractEditorForm((prev) => ({
                          ...prev,
                          package: {
                            ...(prev.package || {}),
                            _id: newId,
                            name: sel?.name || '',
                            monthlyPrice: sel?.monthlyPrice ?? '',
                            description: sel?.description || '',
                            mealPlan: sel?.mealPlan || '',
                            roomType: defaultRoomType,
                          },
                        }));
                      }}
                      required
                    >
                      <option value="">
                        {t('admin.admissionRequests.servicePackagePlaceholder', '-- Chọn gói dịch vụ --')}
                      </option>
                      {availableServicePackages.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} — {Number(p.monthlyPrice || 0).toLocaleString('vi-VN')} VND/tháng
                          {p.tier ? ` (${p.tier})` : ''}
                          {p.isActive === false ? ' [đã ngừng]' : ''}
                        </option>
                      ))}
                    </select>
                    {selectedServicePackageId && (() => {
                      const sel = availableServicePackages.find((p) => String(p._id) === selectedServicePackageId);
                      if (!sel) return null;
                      const monthlyPrice = Number(sel.monthlyPrice || 0);
                      const months = Number(createContractForm.durationMonths) || 0;
                      const discount = Number(createContractForm.discountPercent) || 0;
                      const grossPerMonth = Math.round(monthlyPrice * (1 - discount / 100));
                      const total = monthlyPrice > 0 && months > 0 ? monthlyPrice * months : null;
                      const totalAfterDiscount = total != null ? Math.round(total * (1 - discount / 100)) : null;
                      return (
                        <div style={{
                          marginTop: 8,
                          padding: '8px 12px',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          fontSize: '0.85rem',
                          color: '#334155',
                        }}>
                          <div><strong>{t('admin.contractManagement.monthlyPriceLabel', 'Giá theo tháng')}:</strong> {monthlyPrice.toLocaleString('vi-VN')} VND</div>
                          {months > 0 && totalAfterDiscount != null && (
                            <>
                              <div style={{ marginTop: 4 }}>
                                <strong>{t('admin.contractManagement.contractMonths', 'Số tháng')}:</strong> {months} tháng
                                {' · '}
                                <strong>{t('admin.contractManagement.contractDiscountLabel', 'Chiết khấu')}:</strong> {discount}%
                              </div>
                              <div style={{ marginTop: 4, color: '#15803d' }}>
                                <strong>{t('admin.contractManagement.totalAmount', 'Tổng ước tính')}:</strong> {totalAfterDiscount.toLocaleString('vi-VN')} VND
                                {discount > 0 && (
                                  <span style={{ marginLeft: 8, color: '#64748b', textDecoration: 'line-through' }}>
                                                    {total.toLocaleString('vi-VN')} VND
                                                  </span>
                                )}
                              </div>
                              {createContractForm.paymentPlan === 'HALF_NOW' && (
                                <div style={{ marginTop: 4, color: '#b45309' }}>
                                  {t('admin.contractManagement.paymentPlanHalfNow', 'Thanh toán 50% trước')}: {(totalAfterDiscount / 2).toLocaleString('vi-VN')} VND
                                </div>
                              )}
                            </>
                          )}
                          {createContractForm.paymentPlan === 'HALF_NOW' && months > 0 && grossPerMonth > 0 && (
                            <div style={{ marginTop: 4 }}>
                              <strong>Đơn giá mỗi hóa đơn tháng:</strong> {grossPerMonth.toLocaleString('vi-VN')} VND
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Phân bổ phòng & giường — section riêng (tách khỏi ContractEditor để tránh trùng UI) */}
              <RoomBedAssignmentSection
                value={roomBedAssignment}
                onChange={setRoomBedAssignment}
                allowedRoomTypes={
                  (typeof selectedServicePackageId === 'string' && selectedServicePackageId
                    ? (availableServicePackages.find((p) => String(p._id) === selectedServicePackageId)?.allowedRoomTypes)
                    : null)
                }
                disabled={isCreatingContract}
              />

              {/* Date range */}
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label>
                    <Calendar size={13} />
                    {t('admin.admissionRequests.contractStartLabel', 'Ngày bắt đầu')}
                  </label>
                  <input
                    type="date"
                    value={createContractForm.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="adm-form-input"
                  />
                </div>
                <div className="adm-form-group">
                  <label>
                    <Calendar size={13} />
                    {t('admin.admissionRequests.contractEndLabel', 'Ngày kết thúc')}
                  </label>
                  <input
                    type="date"
                    value={createContractForm.endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="adm-form-input"
                  />
                </div>
              </div>

              {/* Duration + Discount */}
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label>
                    <Hash size={13} />
                    {t('admin.admissionRequests.durationMonthsLabel', 'Thời hạn (tháng)')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={createContractForm.durationMonths}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    className="adm-form-input"
                  />
                </div>
                <div className="adm-form-group">
                  <label>
                    <Percent size={13} />
                    {t('admin.admissionRequests.discountPercentLabel', 'Chiết khấu (%)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={createContractForm.discountPercent}
                    onChange={(e) => setCreateContractForm({ ...createContractForm, discountPercent: e.target.value })}
                    className="adm-form-input"
                  />
                </div>
              </div>

              {/* Payment Plan (Hình thức thanh toán) */}
              <div className="adm-form-group">
                <label>
                  <CreditCard size={13} />
                  {t('admin.admissionRequests.paymentPlanLabel', 'Hình thức thanh toán')}
                </label>
                <div className="adm-payment-plan-options" role="radiogroup" aria-label="Hình thức thanh toán">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={createContractForm.paymentPlan === 'FULL'}
                    className={`adm-payment-plan-option${createContractForm.paymentPlan === 'FULL' ? ' adm-payment-plan-option--active' : ''}`}
                    onClick={() => setCreateContractForm({ ...createContractForm, paymentPlan: 'FULL' })}
                  >
                    <Wallet size={16} className="adm-payment-plan-icon" />
                    <span className="adm-payment-plan-title">
                      {t('admin.admissionRequests.paymentPlanFullTitle', 'Thanh toán tất cả')}
                    </span>
                    <span className="adm-payment-plan-desc">
                      {t('admin.admissionRequests.paymentPlanFullDesc', 'Trả toàn bộ phí dịch vụ một lần')}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={createContractForm.paymentPlan === 'HALF_NOW'}
                    className={`adm-payment-plan-option${createContractForm.paymentPlan === 'HALF_NOW' ? ' adm-payment-plan-option--active' : ''}`}
                    onClick={() => setCreateContractForm({ ...createContractForm, paymentPlan: 'HALF_NOW' })}
                  >
                    <Percent size={16} className="adm-payment-plan-icon" />
                    <span className="adm-payment-plan-title">
                      {t('admin.admissionRequests.paymentPlanHalfTitle', 'Thanh toán 50%')}
                    </span>
                    <span className="adm-payment-plan-desc">
                      {t('admin.admissionRequests.paymentPlanHalfDesc', 'Trả 50% ngay, 50% còn lại sau')}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={createContractForm.paymentPlan === 'MONTHLY'}
                    className={`adm-payment-plan-option${createContractForm.paymentPlan === 'MONTHLY' ? ' adm-payment-plan-option--active' : ''}`}
                    onClick={() => setCreateContractForm({ ...createContractForm, paymentPlan: 'MONTHLY' })}
                  >
                    <Calendar size={16} className="adm-payment-plan-icon" />
                    <span className="adm-payment-plan-title">
                      {t('admin.admissionRequests.paymentPlanMonthlyTitle', 'Thanh toán theo tháng')}
                    </span>
                    <span className="adm-payment-plan-desc">
                      {t('admin.admissionRequests.paymentPlanMonthlyDesc', 'Mỗi tháng một hóa đơn riêng')}
                    </span>
                  </button>
                </div>
                <p className="adm-form-hint">
                  {createContractForm.paymentPlan === 'FULL' && t('admin.admissionRequests.paymentPlanHintFull', 'Tất cả hóa đơn được tạo ở trạng thái "Chưa xuất" — chỉ Admin thấy. Sau khi Admin bấm "Xuất hóa đơn", gia đình mới thấy và thanh toán được.')}
                  {createContractForm.paymentPlan === 'HALF_NOW' && t('admin.admissionRequests.paymentPlanHintHalf', 'Mỗi hóa đơn tháng ghi 50% phí; 50% còn lại ghi nhận remainingAmount. Hóa đơn khởi tạo ở trạng thái "Chưa xuất".')}
                  {createContractForm.paymentPlan === 'MONTHLY' && t('admin.admissionRequests.paymentPlanHintMonthly', 'Mỗi tháng một hóa đơn, thanh toán theo từng kỳ. Hóa đơn khởi tạo ở trạng thái "Chưa xuất" — chỉ Admin thấy cho đến khi bấm "Xuất hóa đơn".')}
                </p>
              </div>

              {/* Contract Editor (tabbed form per article) */}
              <ContractEditor
                admission={createContractAdmission}
                servicePackage={createContractAdmission?.servicePackageId || null}
                form={contractEditorForm}
                onChange={handleEditorFormChange}
                onSyncEmergencyContacts={handleSyncEmergencyContacts}
                syncStatus={emergencyContactsSyncStatus}
                onOpenPreview={() => setIsContractPreviewOpen(true)}
              />

              {/* Notes */}
              <div className="adm-form-group">
                <label>
                  <FileText size={13} />
                  {t('admin.admissionRequests.notesLabel', 'Ghi chú')}
                </label>
                <textarea
                  value={createContractForm.notes}
                  onChange={(e) => setCreateContractForm({ ...createContractForm, notes: e.target.value })}
                  rows={2}
                  className="adm-form-textarea"
                  placeholder={t('admin.admissionRequests.contractNotesPlaceholder', 'Ghi chú thêm (không bắt buộc)...')}
                />
              </div>
            </div>

            <div className="adm-modal-footer adm-modal-footer--contract">
              <button
                className="adm-btn-cancel"
                onClick={() => {
                  setIsCreateContractModalOpen(false);
                  setCreateContractAdmission(null);
                }}
                disabled={isCreatingContract}
              >
                {t('common.cancel', 'Hủy')}
              </button>
              <button
                className="adm-btn-submit-contract"
                onClick={() => setIsContractPreviewOpen(true)}
                disabled={isCreatingContract}
              >
                <Eye size={16} />
                {t('admin.admissionRequests.previewContract', 'Xem trước')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Preview Modal - xem trước toàn bộ điều khoản trước khi tạo */}
      <ContractPreviewModal
        open={isContractPreviewOpen}
        onClose={() => setIsContractPreviewOpen(false)}
        onEdit={() => setIsContractPreviewOpen(false)}
        onCreate={async () => {
          await handleCreateContract();
          setIsContractPreviewOpen(false);
        }}
        terms={createContractForm.terms}
        form={contractEditorForm}
        admission={createContractAdmission}
        isCreating={isCreatingContract}
      />
    </div>
  );
}
