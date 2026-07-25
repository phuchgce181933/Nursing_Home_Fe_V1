import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  Plus,
  X,
  LogOut,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import admissionService from '../../services/admission.service';
import medicationService from '../../services/medication.service';
import paymentService from '../../services/payment.service';
import residentService from '../../services/resident.service';
import servicePackageService from '../../services/servicePackage.service';
import facilityService from '../../services/facility.service';
import { resolveApiError } from '../../utils/apiMessage';
import '../../styles/admin/AdminContractManagementPage.css';

const getContractStatusClass = (startDate, endDate, contractStatus) => {
  if (contractStatus === 'cancelled') return 'contract-status-cancelled';
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < now) {
    return 'contract-status-expired';
  }
  if (start <= now && end >= now) {
    return 'contract-status-active';
  }
  return 'contract-status-upcoming';
};

const getContractStatusLabel = (startDate, endDate, contractStatus) => {
  if (contractStatus === 'cancelled') return 'cancelled';
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < now) {
    return 'expired';
  }
  if (start <= now && end >= now) {
    return 'active';
  }
  return 'upcoming';
};

const getStatusTranslation = (statusKey, t) => {
  const statusMap = {
    active: 'admin.contractManagement.statusActive',
    expired: 'admin.contractManagement.statusExpired',
    upcoming: 'admin.contractManagement.statusUpcoming',
    cancelled: 'admin.contractManagement.statusCancelled',
  };
  return t(statusMap[statusKey] || statusKey, statusKey === 'cancelled' ? 'Đã hủy' : statusKey);
};

const isContractOverdueUnpaid = (contract) => {
  if (!contract || !contract.startDate) return false;
  const status = getContractStatusLabel(contract.startDate, contract.endDate, contract.contractStatus);
  if (status !== 'active') return false;
  const start = new Date(contract.startDate);
  const now = new Date();
  const elapsedDays = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  return elapsedDays > 30 && contract.latestInvoiceStatus !== 'paid';
};

const getContractStatusIcon = (startDate, endDate, contractStatus) => {
  const status = getContractStatusLabel(startDate, endDate, contractStatus);
  if (status === 'cancelled') {
    return <XCircle className="w-5 h-5 text-gray-500" />;
  }
  if (status === 'active') {
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  }
  if (status === 'expired') {
    return <XCircle className="w-5 h-5 text-red-600" />;
  }
  return <Calendar className="w-5 h-5 text-blue-600" />;
};

export default function AdminContractManagementPage() {
  const { t, i18n } = useTranslation();
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showContractDetailModal, setShowContractDetailModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState('');
  const [renewalData, setRenewalData] = useState({
    billingPeriodStart: '',
    billingPeriodEnd: '',
    roomCost: 0,
    medicationCost: '',
    careServiceCost: 0,
    otherCost: 0,
    prescriptionId: null,
    serviceDiscountPercent: 0,
    paymentPlan: 'FULL',
  });
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [renewalConflictMessage, setRenewalConflictMessage] = useState('');
  const [renewalDateError, setRenewalDateError] = useState('');
  const [renewalServiceBlockedMessage, setRenewalServiceBlockedMessage] = useState('');
  const [renewalMedBlockedMessage, setRenewalMedBlockedMessage] = useState('');
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [medPrescriptions, setMedPrescriptions] = useState([]);
  const [medLoading, setMedLoading] = useState(false);
  const [medSelectedId, setMedSelectedId] = useState(null);
  const [medEstimatedCost, setMedEstimatedCost] = useState(null);
  const [medCreatingInvoice, setMedCreatingInvoice] = useState(false);
  const [medError, setMedError] = useState('');
  const [medConflictMessage, setMedConflictMessage] = useState('');
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionData, setExtensionData] = useState({
    contractStartDate: '',
    newEndDate: '',
    discountPercent: 0,
    selectedNewPackageId: '',
    selectedNewBedId: '',
  });
  const [extensionPackageError, setExtensionPackageError] = useState('');
  const [extensionAvailablePackages, setExtensionAvailablePackages] = useState([]);
  const [extensionAvailableBeds, setExtensionAvailableBeds] = useState([]);
  const [extensionPackageLoading, setExtensionPackageLoading] = useState(false);
  const [extensionBedsLoading, setExtensionBedsLoading] = useState(false);
  const [extensionBedsError, setExtensionBedsError] = useState('');
  const [extensionFloors, setExtensionFloors] = useState([]);
  const [extensionRooms, setExtensionRooms] = useState([]);
  const [extensionSelectedFloorId, setExtensionSelectedFloorId] = useState('');
  const [extensionSelectedRoomId, setExtensionSelectedRoomId] = useState('');
  const [extensionSelectionError, setExtensionSelectionError] = useState('');
  const [isExtendingContract, setIsExtendingContract] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancellingContract, setIsCancellingContract] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [packageLoading, setPackageLoading] = useState(false);
  const [isChangingPackage, setIsChangingPackage] = useState(false);
  const [packageError, setPackageError] = useState('');
  const [isReleasingResident, setIsReleasingResident] = useState(false);

  const formatDate = (dateStr) => {
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

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    if (Number.isNaN(amount)) return '0 VND';
    return `${amount.toLocaleString('vi-VN')} VND`;
  };

  const applyPaymentPlanFactor = (amount, paymentPlan) => {
    const numericAmount = Number(amount) || 0;
    if (String(paymentPlan || '').toUpperCase() === 'HALF_NOW') {
      return Math.round(numericAmount / 2);
    }
    return numericAmount;
  };

  const computeRenewalInvoiceTotal = (data) => {
    const monthly = data.computedServiceFeeBreakdown?.monthlyPrice || 0;
    const months = data.computedServiceFeeBreakdown?.durationMonths || 1;
    const discount = data.computedServiceFeeBreakdown?.discountPercent || 0;
    const grossService = monthly * months;
    const netService = Math.round(grossService * (1 - discount / 100));
    const rawTotal =
      0 +
      (data.medicationCost || 0) +
      netService +
      (data.otherCost || 0);
    return applyPaymentPlanFactor(rawTotal, data.paymentPlan);
  };

  const calculateBillingPeriodMonths = (billingPeriodStart, billingPeriodEnd) => {
    if (!billingPeriodStart || !billingPeriodEnd) return 1;

    const start = new Date(billingPeriodStart);
    const end = new Date(billingPeriodEnd);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return 1;
    }

    const monthDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const hasExtraDay = end.getDate() >= start.getDate() ? 1 : 0;

    return Math.max(1, monthDiff + hasExtraDay);
  };

  const validateBillingPeriodDates = (billingPeriodStart, billingPeriodEnd) => {
    if (!billingPeriodStart || !billingPeriodEnd) return '';
    const start = new Date(billingPeriodStart);
    const end = new Date(billingPeriodEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'Ngày kỳ tính phí không hợp lệ.';
    }
    if (start < today) {
      return 'Kỳ tính phí từ không được chọn trong quá khứ.';
    }
    if (end <= start) {
      return 'Kỳ tính phí đến phải sau kỳ tính phí từ.';
    }

    const diffDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 30) {
      return 'Kỳ tính phí phải kéo dài ít nhất 30 ngày.';
    }
    return '';
  };

  const isOverdueReleaseEligible = (contract) => {
    if (!contract || !contract.residentId) return false;
    if (contract.contractStatus === 'cancelled') return false;

    const status = getContractStatusLabel(contract.startDate, contract.endDate, contract.contractStatus);
    if (status !== 'expired') return false;

    const endDate = new Date(contract.endDate);
    const now = new Date();
    const overdueDays = Math.floor((now - endDate) / (24 * 60 * 60 * 1000));
    return overdueDays > 7;
  };

  const handleReleaseResident = async (contract) => {
    if (!contract || !contract.residentId) return;
    const confirmMessage = `Bạn có muốn giải phóng phòng/giường cho cư dân ${contract.residentName || ''}?`;
    if (!window.confirm(confirmMessage)) return;

    setIsReleasingResident(true);
    setError('');
    try {
      await residentService.adminReleaseResident(contract.residentId);
      await fetchContracts();
    } catch (err) {
      setError(resolveApiError(err) || 'Không thể giải phóng phòng/giường cư dân.');
      console.error('Release resident failed:', err);
    } finally {
      setIsReleasingResident(false);
    }
  };

  const syncRenewalPricing = (nextData) => {
    if (!selectedContract) return nextData;

    const monthlyPrice = Number(selectedContract.servicePackagePrice || 0);
    const contractDiscountPercent = Number(selectedContract.contractDiscountPercent || 0);
    const extraDiscountPercent = Number(nextData.serviceDiscountPercent || 0);
    const totalDiscountPercent = Math.min(100, contractDiscountPercent + extraDiscountPercent);
    const durationMonths = calculateBillingPeriodMonths(nextData.billingPeriodStart, nextData.billingPeriodEnd);
    const gross = monthlyPrice * durationMonths;
    const net = Math.round(gross * (1 - totalDiscountPercent / 100));

    return {
      ...nextData,
      careServiceCost: net,
      computedServiceFeeBreakdown: {
        monthlyPrice,
        durationMonths,
        discountPercent: totalDiscountPercent,
      },
    };
  };

  const fetchContracts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await admissionService.adminGetAdmissionList({
        page: 1,
        limit: 1000,
        status: 'contracting,checked_in,cancelled',
      });

      const data = response?.data || [];

      // Filter admissions with contracts
      const contractData = data
        .filter((admission) => admission.contractNumber && admission.contractStartDate && admission.contractEndDate)
        .map((admission) => {
          const residentStatus = String(admission?.resident?.residencyStatus || admission?.residentId?.residencyStatus || '').toLowerCase();
          const hasServicePackage = Boolean(
            admission?.servicePackageId || admission?.assignedServicePackage || admission?.servicePackageId?.name || admission?.servicePackageId?.packageCode
          );
          const isReleased = Boolean(admission?.isReleased || (residentStatus === 'pending' && !hasServicePackage));

          return {
            id: admission._id,
            contractStatus: admission.contractStatus || (admission.status === 'cancelled' ? 'cancelled' : 'active'),
            residentId: admission.residentId?._id || admission.residentId,
            residentName: admission.residentId?.fullName || admission.applicant?.fullName || 'N/A',
            residentStatus,
            contractNumber: admission.contractNumber,
            startDate: admission.contractStartDate,
            endDate: admission.contractEndDate,
            terms: admission.contractTerms,
            signedAt: admission.contractSignedAt,
            status: getContractStatusLabel(admission.contractStartDate, admission.contractEndDate, admission.status),
            servicePackageId: admission.servicePackageId?._id || admission.servicePackageId || null,
            servicePackageName: admission.assignedServicePackage || admission.servicePackageId?.name || admission.servicePackageId?.packageCode || 'N/A',
            servicePackagePrice: admission.servicePackageId?.monthlyPrice || 0,
            contractDurationMonths: admission.contractDurationMonths || null,
            contractDiscountPercent: admission.contractDiscountPercent || null,
            latestInvoice: admission.latestInvoice || null,
            latestInvoiceStatus: admission.latestInvoice?.status?.toString().toLowerCase?.() || null,
            latestInvoicePaymentPlan: admission.latestInvoice?.paymentPlan || null,
            latestInvoiceRemainingAmount: Number(admission.latestInvoice?.remainingAmount || 0),
            outstandingAmount: Number(admission.outstandingAmount || 0),
            latestInvoiceHasServiceCost: ['SERVICE', 'COMBINED'].includes(admission.latestInvoice?.type)
              && Number(admission.latestInvoice?.careServiceCost || 0) > 0,
            isReleased,
          };
        });

      console.log('Contract data fetched:', contractData[0]); // Debug log to check latestInvoice field
      setContracts(contractData);
    } catch (err) {
      setError(err.message || 'Failed to fetch contracts');
      console.error('Error fetching contracts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  useEffect(() => {
    let filtered = contracts;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((contract) => {
        const status = getContractStatusLabel(contract.startDate, contract.endDate, contract.contractStatus);
        return status.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (contract) =>
          contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.residentName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredContracts(filtered);
    setCurrentPage(1);
  }, [contracts, searchTerm, statusFilter]);

  const openPackageChangeModal = async (contract) => {
    setSelectedContract(contract);
    setSelectedPackageId(contract.servicePackageId || '');
    setPackageError('');
    setShowPackageModal(true);
    setPackageLoading(true);
    try {
      const response = await servicePackageService.getServicePackageList({ isActive: true, page: 1, limit: 100 }, 'admin');
      setAvailablePackages(Array.isArray(response) ? response : response?.data || []);
    } catch (err) {
      setPackageError(err.response?.data?.message || 'Không thể tải danh sách gói dịch vụ.');
    } finally {
      setPackageLoading(false);
    }
  };

  const handleChangeContractPackage = async () => {
    if (!selectedContract || !selectedPackageId) {
      setPackageError('Vui lòng chọn gói dịch vụ mới.');
      return;
    }
    if (selectedPackageId === selectedContract.servicePackageId) {
      setPackageError('Vui lòng chọn gói dịch vụ khác với gói hiện tại.');
      return;
    }
    try {
      setIsChangingPackage(true);
      await admissionService.adminChangeContractServicePackage(selectedContract.id, { servicePackageId: selectedPackageId });
      setShowPackageModal(false);
      setSelectedContract(null);
      await fetchContracts();
    } catch (err) {
      setPackageError(err.response?.data?.message || 'Không thể thay đổi gói dịch vụ.');
    } finally {
      setIsChangingPackage(false);
    }
  };

  const openCancelContractModal = (contract) => {
    setSelectedContract(contract);
    setCancellationReason('');
    setShowCancelModal(true);
  };

  const handleCancelContract = async () => {
    const reason = cancellationReason.trim();
    if (!selectedContract || !reason) return;
    try {
      setIsCancellingContract(true);
      await admissionService.adminCancelContract(selectedContract.id, { cancellationReason: reason });
      setShowCancelModal(false);
      setSelectedContract(null);
      setCancellationReason('');
      await fetchContracts();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể hủy hợp đồng.');
    } finally {
      setIsCancellingContract(false);
    }
  };

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const fetchPrescriptionCost = async (prescriptionId, residentId) => {
    try {
      const response = await medicationService.estimatePrescriptionCost(prescriptionId, residentId);
      const medicationCost = response.data?.medicationCost;
      if (medicationCost !== undefined && medicationCost !== null) {
        setRenewalData((prev) => ({
          ...prev,
          medicationCost,
        }));
      }
    } catch (err) {
      console.warn('Unable to estimate prescription cost:', err);
    }
  };

  const fetchActivePrescription = async (residentId) => {
    setPrescriptionLoading(true);
    setPrescriptionError('');
    setSelectedPrescription(null);
    try {
      const response = await medicationService.listPrescriptions({ residentId, status: 'ACTIVE', limit: 1 });
      const prescription = response.data?.[0] || null;
      setSelectedPrescription(prescription);
      setRenewalData((prev) => ({
        ...prev,
        prescriptionId: prescription?._id || null,
      }));
      if (prescription?._id) {
        await fetchPrescriptionCost(prescription._id, residentId);
      }
    } catch (err) {
      setPrescriptionError(err.message || t('admin.contractManagement.prescriptionLoadError'));
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const refreshMedicationPrescriptions = async (residentId) => {
    try {
      setMedLoading(true);
      const resp = await medicationService.listPrescriptions({ residentId, limit: 20 });
      const list = Array.isArray(resp) ? resp : resp?.data || [];
      const validPrescriptions = list.filter(isPrescriptionInvoiceable);
      setMedPrescriptions(validPrescriptions);
      setMedError('');
    } catch (err) {
      console.error('Failed to load prescriptions for medication invoice:', err);
      setMedError(err.response?.data?.message || 'Không thể tải đơn thuốc.');
    } finally {
      setMedLoading(false);
    }
  };

  const applyRenewalPreset = (monthsCount) => {
    if (!selectedContract) return;

    const normalizedMonths = Math.max(1, Number(monthsCount) || 1);
    const today = new Date();
    const start = new Date(today.toISOString().split('T')[0]);

    const end = new Date(start);
    end.setMonth(end.getMonth() + normalizedMonths);
    end.setDate(end.getDate() - 1);

    const nextData = {
      ...renewalData,
      billingPeriodStart: start.toISOString().split('T')[0],
      billingPeriodEnd: end.toISOString().split('T')[0],
    };

    setRenewalDateError(validateBillingPeriodDates(nextData.billingPeriodStart, nextData.billingPeriodEnd));
    setRenewalData(syncRenewalPricing(nextData));
  };

  const openMedicationInvoiceModal = async (contract) => {
    setSelectedContract(contract);
    setMedError('');
    setMedPrescriptions([]);
    setMedSelectedId(null);
    setMedEstimatedCost(null);
    setShowMedicationModal(true);
    await refreshMedicationPrescriptions(contract.residentId);
  };

  const estimateMedCost = async (prescriptionId) => {
    if (!prescriptionId || !selectedContract) return;
    try {
      setMedEstimatedCost(null);
      const resp = await medicationService.estimatePrescriptionCost(prescriptionId, selectedContract.residentId);
      const cost = resp.data?.medicationCost ?? resp?.medicationCost ?? null;
      setMedEstimatedCost(cost);
    } catch (err) {
      console.warn('Estimate failed:', err);
      setMedError(err.response?.data?.message || 'Không thể ước tính chi phí thuốc.');
    }
  };

  const isPrescriptionExpired = (validUntil) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const isPrescriptionInvoiceable = (prescription) => {
    if (!prescription) return false;
    if (isPrescriptionExpired(prescription.validUntil)) return false;
    if (prescription.status !== 'ACTIVE') return false;
    if (!Array.isArray(prescription.items)) return false;
    return prescription.items.some((item) => item.isActive !== false);
  };

  const getSelectedPrescriptionDetails = () => {
    if (!medSelectedId || medPrescriptions.length === 0) return null;
    return medPrescriptions.find(p => (p._id || p.id) === medSelectedId);
  };

  const handleCreateMedicationInvoice = async () => {
    if (!selectedContract || !medSelectedId) return alert('Vui lòng chọn đơn thuốc.');
    try {
      setMedCreatingInvoice(true);
      setMedConflictMessage('');
      // Check for existing medication invoice for this prescription
      try {
        const invResp = await paymentService.listInvoices(selectedContract.residentId);
        const invList = Array.isArray(invResp) ? invResp : invResp?.data || [];
        const existingMed = invList.find((inv) => (
          (String(inv.type || '').toUpperCase() === 'MEDICATION' || String(inv.type || '').toUpperCase() === 'MEDICATIONS')
          && (String(inv.prescriptionId || '') === String(medSelectedId || ''))
          && String((inv.status || '').toLowerCase()) !== 'cancelled'
        ));
        if (existingMed) {
          const invNum = existingMed.invoiceNumber || existingMed._id || '';
          const message = `Đã có hóa đơn thuốc cho đơn này (${invNum}). Không thể tạo thêm.`;
          setMedConflictMessage(message);
          alert(message);
          return;
        }
      } catch (checkErr) {
        console.warn('Không thể kiểm tra hóa đơn hiện có trước khi tạo hóa đơn thuốc:', checkErr);
      }
      const selectedPrescription = getSelectedPrescriptionDetails();
      if (!isPrescriptionInvoiceable(selectedPrescription)) {
        alert('Đơn thuốc này không hợp lệ để tạo hóa đơn thuốc. Vui lòng chọn đơn còn hiệu lực và có thuốc đang được dùng.');
        return;
      }
      const body = { prescriptionId: medSelectedId };
      if (medEstimatedCost != null) body.medicationCost = medEstimatedCost;
      await paymentService.createInvoice(selectedContract.residentId, body);
      alert(t('admin.contractManagement.invoiceCreatedSuccess'));
      setShowMedicationModal(false);
      setSelectedContract(null);
      await fetchContracts();
    } catch (err) {
      console.error('Error creating medication invoice:', err);
      alert(resolveApiError(err, t, 'admin.contractManagement.invoiceCreatedError'));
    } finally {
      setMedCreatingInvoice(false);
    }
  };

  const getAllowedRoomTypesForPackage = (pkg) => {
    if (!pkg) return [];

    const allowedRoomTypes = pkg.allowedRoomTypes || [];
    if (Array.isArray(allowedRoomTypes) && allowedRoomTypes.length > 0) {
      return allowedRoomTypes.map((type) => String(type).toLowerCase());
    }

    const tier = String(pkg.tier || '').toLowerCase();
    if (tier === 'vip') return ['icu', 'isolation'];
    if (tier === 'premium') return ['premium'];
    return ['standard'];
  };

  const loadFloorsForExtension = async () => {
    setExtensionBedsLoading(true);
    setExtensionBedsError('');
    try {
      const floors = await facilityService.listFloors({ page: 1, limit: 100 });
      const floorsList = Array.isArray(floors) ? floors : floors?.data || [];
      setExtensionFloors(floorsList);
    } catch (err) {
      console.error('Failed to load floors:', err);
      setExtensionBedsError('Không thể tải danh sách tòa nhà. Vui lòng thử lại.');
    } finally {
      setExtensionBedsLoading(false);
    }
  };

  const handleExtensionFloorChange = async (floorId) => {
    setExtensionSelectedFloorId(floorId);
    setExtensionSelectedRoomId('');
    setExtensionAvailableBeds([]);
    setExtensionSelectionError('');
    
    if (!floorId) {
      setExtensionRooms([]);
      return;
    }

    setExtensionBedsLoading(true);
    setExtensionBedsError('');
    try {
      const rooms = await facilityService.listRoomsByFloor(floorId);
      const roomsList = Array.isArray(rooms) ? rooms : rooms?.data || [];
      const selectedPackage = extensionAvailablePackages.find((pkg) => pkg._id === extensionData.selectedNewPackageId);
      const allowedRoomTypes = getAllowedRoomTypesForPackage(selectedPackage);
      const filteredRooms = allowedRoomTypes.length
        ? roomsList.filter((room) => allowedRoomTypes.includes(String(room.roomType || '').toLowerCase()))
        : roomsList;

      setExtensionRooms(filteredRooms);
      if (filteredRooms.length === 0) {
        setExtensionSelectionError('Gói dịch vụ này không có phòng phù hợp để chọn.');
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setExtensionBedsError('Không thể tải danh sách phòng. Vui lòng thử lại.');
    } finally {
      setExtensionBedsLoading(false);
    }
  };

  const handleExtensionRoomChange = async (roomId) => {
    setExtensionSelectedRoomId(roomId);
    setExtensionData({ ...extensionData, selectedNewBedId: '' });
    
    if (!roomId) {
      setExtensionAvailableBeds([]);
      return;
    }

    setExtensionBedsLoading(true);
    setExtensionBedsError('');
    try {
      const beds = await facilityService.listAvailableBedsByRoom(roomId);
      const bedsList = Array.isArray(beds) ? beds : beds?.data || [];
      setExtensionAvailableBeds(bedsList);
    } catch (err) {
      console.error('Failed to load beds:', err);
      setExtensionBedsError('Không thể tải danh sách giường. Vui lòng thử lại.');
    } finally {
      setExtensionBedsLoading(false);
    }
  };

  const handleOpenExtensionModal = async (contract) => {
    setSelectedContract(contract);
    setExtensionPackageError('');
    setExtensionPackageLoading(true);
    try {
      const response = await servicePackageService.getServicePackageList({ isActive: true, page: 1, limit: 100 }, 'admin');
      setExtensionAvailablePackages(Array.isArray(response) ? response : response?.data || []);
    } catch (err) {
      setExtensionPackageError(err.response?.data?.message || 'Không thể tải danh sách gói dịch vụ.');
    } finally {
      setExtensionPackageLoading(false);
    }

    // Set contract start date to today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate new end date (1 year from today)
    const newEndDate = new Date(today);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    
    const initialPackageId = contract.servicePackageId || '';
    setExtensionData({
      contractStartDate: todayStr,
      newEndDate: newEndDate.toISOString().split('T')[0],
      discountPercent: contract.contractDiscountPercent || 0,
      selectedNewPackageId: initialPackageId,
      selectedNewBedId: contract.assignedBedId || '',
    });
    
    // Reset bed selection hierarchy
    setExtensionSelectedFloorId('');
    setExtensionSelectedRoomId('');
    setExtensionFloors([]);
    setExtensionRooms([]);
    setExtensionAvailableBeds([]);
    
    // Load floors
    await loadFloorsForExtension();
    
    setShowExtensionModal(true);
  };

  const formatDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleExtensionDurationSelect = (months) => {
    if (!extensionData.contractStartDate) return;

    const startDate = new Date(extensionData.contractStartDate);
    const newEndDate = new Date(startDate);
    newEndDate.setMonth(newEndDate.getMonth() + months);

    setExtensionData({
      ...extensionData,
      newEndDate: formatDateInputValue(newEndDate),
    });
  };

  const calculateExtensionCost = (contractStartDateStr, newEndDateStr, servicePackagePrice, discountPercent) => {
    if (!contractStartDateStr || !newEndDateStr) return 0;
    
    const startDate = new Date(contractStartDateStr);
    const endDate = new Date(newEndDateStr);
    if (endDate <= startDate) return 0;
    
    // Calculate months between start and end date
    let monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12;
    monthsDiff += endDate.getMonth() - startDate.getMonth();
    
    if (monthsDiff <= 0) return 0;
    
    // Calculate service cost with discount
    const baseServiceCost = (servicePackagePrice || 0) * monthsDiff;
    const finalServiceCost = baseServiceCost * (1 - (discountPercent || 0) / 100);
    
    return finalServiceCost;
  };

  const handleExtendContract = async () => {
    if (!selectedContract || !extensionData.newEndDate || !extensionData.contractStartDate) {
      return alert('Vui lòng nhập đầy đủ thông tin ngày bắt đầu và ngày hết hạn.');
    }
    if (!extensionData.selectedNewPackageId) {
      return alert('Vui lòng chọn gói dịch vụ mới.');
    }

    const startDate = new Date(extensionData.contractStartDate);
    const endDate = new Date(extensionData.newEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate start date is not in the past
    if (startDate < today) {
      return alert('Ngày bắt đầu hợp đồng mới không thể là quá khứ.');
    }

    if (endDate <= startDate) {
      return alert('Ngày hết hạn phải sau ngày bắt đầu.');
    }

    // Calculate contract length
    let monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12;
    monthsDiff += endDate.getMonth() - startDate.getMonth();
    if (monthsDiff <= 0) {
      return alert('Khoảng thời gian gia hạn phải tối thiểu 1 tháng.');
    }

    const selectedPackage = extensionAvailablePackages.find((pkg) => String(pkg._id) === String(extensionData.selectedNewPackageId));
    const packagePrice = selectedPackage?.monthlyPrice ?? selectedContract.servicePackagePrice ?? 0;
    const discountPercent = extensionData.discountPercent || 0;
    const baseServiceCost = packagePrice * monthsDiff;
    const discountAmount = baseServiceCost * (discountPercent / 100);
    const finalServiceCost = Math.round(baseServiceCost - discountAmount);

    try {
      setIsExtendingContract(true);

      const contractStartDate = extensionData.contractStartDate;
      const contractEndDate = endDate.toISOString();

      await admissionService.updateAdmissionContractDates(selectedContract.id, {
        contractStartDate,
        contractEndDate,
        servicePackageId: extensionData.selectedNewPackageId,
        assignedBedId: extensionData.selectedNewBedId || undefined,
      });

      const invoiceBody = {
        careServiceCost: finalServiceCost,
        billingPeriodStart: contractStartDate,
        billingPeriodEnd: contractEndDate.split('T')[0],
        roomCost: 0,
        medicationCost: 0,
        otherCost: 0,
        totalAmount: finalServiceCost,
      };

      await paymentService.createInvoice(selectedContract.residentId, invoiceBody);

      const discountText = discountPercent > 0 ? ` (giảm ${discountPercent}%)` : '';
      alert(`Gia hạn hợp đồng và tạo hóa đơn thành công!\nChi phí gia hạn: ${finalServiceCost.toLocaleString('vi-VN')} VND${discountText}`);

      setShowExtensionModal(false);
      setSelectedContract(null);
      await fetchContracts();
    } catch (err) {
      console.error('Error extending contract:', err);
      alert(resolveApiError(err, t, 'admin.contractManagement.extendFailed') || ('Lỗi khi gia hạn hợp đồng: ' + (err.message || 'Unknown error')));
    } finally {
      setIsExtendingContract(false);
    }
  };

  const handleCreateRenewalInvoice = async (contract) => {
    setSelectedContract(contract);
    setSelectedPrescription(null);
    setPrescriptionError('');
    setRenewalConflictMessage('');

    // Pre-fill dates based on contract end date + 1 day
    const endDate = new Date(contract.endDate);
    const nextStartDate = new Date(endDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);
    const nextEndDate = new Date(nextStartDate);
    nextEndDate.setMonth(nextEndDate.getMonth() + (contract.contractDurationMonths || 1));
    nextEndDate.setDate(nextEndDate.getDate() - 1);

    // Fetch existing invoices to avoid double-charging for already-paid service periods
    const durationMonths = calculateBillingPeriodMonths(nextStartDate, nextEndDate);
    let careServiceCost = (contract.servicePackagePrice || 0) * durationMonths;
    try {
      // First fetch active prescription so we can detect existing medication invoices
      await fetchActivePrescription(contract.residentId);

      const invoicesResp = await paymentService.listInvoices(contract.residentId);
      const invoices = Array.isArray(invoicesResp) ? invoicesResp : invoicesResp?.data || [];
      
      // Filter for paid SERVICE invoices
      const paidServiceInvoices = invoices.filter(
        (inv) => inv.type === 'SERVICE' && 
                 (inv.paymentStatus === 'paid' || inv.status === 'paid') &&
                 inv.careServiceCost > 0
      );
      
      if (paidServiceInvoices.length > 0) {
        // Sum up all careServiceCost from paid invoices
        const totalPaidServiceCost = paidServiceInvoices.reduce((sum, inv) => sum + (inv.careServiceCost || 0), 0);
        // Only charge for periods not yet billed
        careServiceCost = Math.max(0, careServiceCost - totalPaidServiceCost);
      }
      // Reset previous messages
      setRenewalServiceBlockedMessage('');
      setRenewalMedBlockedMessage('');

      // Detect exact duplicate service invoice for the same billing period
      try {
        const startIso = nextStartDate.toISOString().split('T')[0];
        const endIso = nextEndDate.toISOString().split('T')[0];
        const duplicateService = invoices.find((inv) => (
          String((inv.type || '')).toUpperCase() === 'SERVICE' &&
          (inv.billingPeriodStart === startIso) &&
          (inv.billingPeriodEnd === endIso) &&
          String((inv.status || '').toLowerCase()) !== 'cancelled'
        ));
        if (duplicateService) {
          const invNum = duplicateService.invoiceNumber || duplicateService._id || '';
          const message = `Đã có hóa đơn dịch vụ cho kỳ ${startIso} → ${endIso} (${invNum}). Chi phí dịch vụ chăm sóc (VND) sẽ không được gia hạn.`;
          setRenewalServiceBlockedMessage(message);
          // Also set a general conflict so UI can disable if desired
          setRenewalConflictMessage(message);
        }
      } catch (dupErr) {
        console.warn('Không thể kiểm tra trùng hóa đơn dịch vụ:', dupErr);
      }

      // Detect existing medication invoice for selected prescription (if any)
      try {
        const prescId = selectedPrescription?._id || renewalData?.prescriptionId || null;
        if (prescId) {
          const existingMedInv = invoices.find((inv) => (
            (String(inv.type || '').toUpperCase() === 'MEDICATION' || String(inv.type || '').toUpperCase() === 'MEDICATIONS') &&
            String(inv.prescriptionId || '') === String(prescId) &&
            String((inv.status || '').toLowerCase()) !== 'cancelled'
          ));
          if (existingMedInv) {
            const invNum = existingMedInv.invoiceNumber || existingMedInv._id || '';
            const message = `Đã có hóa đơn thuốc cho đơn thuốc chọn (số: ${invNum}). Chi phí thuốc (VND) sẽ không được gia hạn.`;
            setRenewalMedBlockedMessage(message);
          }
        }
      } catch (medCheckErr) {
        console.warn('Không thể kiểm tra hóa đơn thuốc khi tạo hóa đơn gia hạn:', medCheckErr);
      }
    } catch (err) {
      console.warn('Unable to fetch invoices for service cost calculation:', err);
      // Default to full cost if we can't fetch invoices
    }

    setRenewalData(syncRenewalPricing({
      billingPeriodStart: nextStartDate.toISOString().split('T')[0],
      billingPeriodEnd: nextEndDate.toISOString().split('T')[0],
      roomCost: 0,
      medicationCost: '',
      careServiceCost,
      otherCost: 0,
      prescriptionId: null,
      serviceDiscountPercent: 0,
      computedServiceFeeBreakdown: {
        monthlyPrice: contract.servicePackagePrice || 0,
        durationMonths,
        discountPercent: contract.contractDiscountPercent || 0,
      },
    }));
    setShowRenewalModal(true);
    await fetchActivePrescription(contract.residentId);
  };

  const handleSubmitRenewalInvoice = async () => {
    if (!selectedContract) return;

    const dateError = validateBillingPeriodDates(renewalData.billingPeriodStart, renewalData.billingPeriodEnd);
    if (dateError) {
      setRenewalDateError(dateError);
      return;
    }

    setIsCreatingInvoice(true);
    try {
      // compute service fee with discount
      const monthly = renewalData.computedServiceFeeBreakdown?.monthlyPrice || 0;
      const months = renewalData.computedServiceFeeBreakdown?.durationMonths || 1;
      const discount = renewalData.computedServiceFeeBreakdown?.discountPercent || 0;
      const grossService = monthly * months;
      const netService = Math.round(grossService * (1 - discount / 100));

      // Validate remaining balance exists from any unpaid invoice before creating a new full invoice.
      if (
        selectedContract?.outstandingAmount > 0 &&
        renewalData.paymentPlan === 'FULL'
      ) {
        alert('Cư dân hiện có hóa đơn chưa thanh toán. Vui lòng xử lý phần nợ còn lại trước khi tạo hóa đơn đầy đủ mới.');
        return;
      }

      const totalAmount = computeRenewalInvoiceTotal(renewalData);

      const invoiceBody = {
        billingPeriodStart: renewalData.billingPeriodStart,
        billingPeriodEnd: renewalData.billingPeriodEnd,
        roomCost: 0,
        medicationCost: renewalData.medicationCost === '' ? undefined : renewalData.medicationCost,
        careServiceCost: netService,
        otherCost: renewalData.otherCost || 0,
        prescriptionId: renewalData.prescriptionId,
        totalAmount,
        paymentPlan: renewalData.paymentPlan,
      };

      await paymentService.createInvoice(selectedContract.residentId, invoiceBody);

      alert(t('admin.contractManagement.invoiceCreatedSuccess'));
      setShowRenewalModal(false);
      setSelectedContract(null);
      setRenewalData({
        billingPeriodStart: '',
        billingPeriodEnd: '',
        roomCost: 0,
        medicationCost: '',
        careServiceCost: 0,
        otherCost: 0,
        prescriptionId: null,
        serviceDiscountPercent: 0,
        paymentPlan: 'FULL',
      });
      await fetchContracts();
    } catch (err) {
      console.error('Error creating invoice:', err);
      alert(resolveApiError(err, t, 'admin.contractManagement.invoiceCreatedError'));
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-section">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="admin-page-title">{t('admin.contractManagement.title')}</h1>
            <p className="admin-page-subtitle">{t('admin.contractManagement.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Section */}
      <div className="admin-page-filters">
        <div className="filter-group search-group">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('admin.contractManagement.searchPlaceholder')}
            className="filter-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t('admin.contractManagement.allStatuses')}</option>
            <option value="active">{t('admin.contractManagement.statusActive')}</option>
            <option value="expired">{t('admin.contractManagement.statusExpired')}</option>
            <option value="upcoming">{t('admin.contractManagement.statusUpcoming')}</option>
            <option value="cancelled">{t('admin.contractManagement.statusCancelled', 'Đã hủy')}</option>
          </select>
        </div>

        <button className="btn-icon-secondary" onClick={fetchContracts} disabled={isLoading}>
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="admin-page-table">
        {isLoading ? (
          <div className="table-loading">
            <div className="spinner" />
            <p>{t('admin.contractManagement.loadingContracts')}</p>
          </div>
        ) : paginatedContracts.length > 0 ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>{t('admin.contractManagement.colContractNumber')}</th>
                  <th>{t('admin.contractManagement.colResidentName')}</th>
                  <th>{t('admin.contractManagement.colStartDate')}</th>
                  <th>{t('admin.contractManagement.colEndDate')}</th>
                  <th>Trạng thái hóa đơn</th>
                  <th>{t('admin.contractManagement.colStatus')}</th>
                  <th>{t('admin.contractManagement.colSignedDate')}</th>
                  <th>{t('admin.contractManagement.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="font-semibold">{contract.contractNumber}</td>
                    <td>{contract.residentName}</td>
                    <td>{formatDate(contract.startDate)}</td>
                    <td>{formatDate(contract.endDate)}</td>
                    <td>
                      {contract.latestInvoice ? (
                        <div className="inline-flex flex-col gap-1">
                          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold">
                            {contract.latestInvoiceStatus === 'paid' ? (
                              <span className="bg-emerald-100 text-emerald-700">✓ Đã thanh toán</span>
                            ) : contract.latestInvoiceStatus === 'partially_paid' ? (
                              <span className="bg-amber-100 text-amber-700">◐ Thanh toán một phần</span>
                            ) : (
                              <span className="bg-red-100 text-red-700">✗ Chưa thanh toán</span>
                            )}
                          </div>
                          {contract.outstandingAmount > 0 && (
                            <div className="inline-block px-2 py-1 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700">
                              Còn lại {contract.outstandingAmount.toLocaleString('vi-VN')}₫
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          − Chưa có hóa đơn
                        </div>
                      )}
                      {isContractOverdueUnpaid(contract) && (
                        <div className="inline-block mt-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
                          Hợp đồng quá 30 ngày chưa thanh toán
                        </div>
                      )}
                    </td>
                    <td>
                      <div className={`status-badge ${getContractStatusClass(contract.startDate, contract.endDate, contract.contractStatus)}`}>
                        <div className="flex items-center gap-2">
                          {getContractStatusIcon(contract.startDate, contract.endDate, contract.contractStatus)}
                          <span>{getStatusTranslation(getContractStatusLabel(contract.startDate, contract.endDate, contract.contractStatus), t)}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(contract.signedAt)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-icon-primary" title={t('admin.contractManagement.viewDetails')} onClick={() => {
                          setSelectedContract(contract);
                          setShowContractDetailModal(true);
                        }}>
                          <Eye className="w-4 h-4" />
                        </button>
                        {!contract.isReleased && contract.contractStatus !== 'cancelled' && (
                          !contract.latestInvoice ||
                          contract.outstandingAmount > 0 ||
                          contract.latestInvoiceStatus !== 'paid'
                        ) && (
                          <button
                            className="btn-icon-primary btn-create-invoice"
                            title={t('admin.contractManagement.createRenewalInvoice')}
                            onClick={() => handleCreateRenewalInvoice(contract)}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                        {!contract.isReleased && contract.contractStatus !== 'cancelled' && (
                          <button
                            className="btn-icon-secondary"
                            title="Tạo hóa đơn thuốc"
                            onClick={() => openMedicationInvoiceModal(contract)}
                          >
                            🩺
                          </button>
                        )}
                        {!contract.isReleased && contract.contractStatus !== 'cancelled' && (
                          <>
                            <button
                              className="btn-icon-secondary"
                              title="Thay đổi gói dịch vụ"
                              onClick={() => openPackageChangeModal(contract)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              className="btn-icon-secondary"
                              title="Hủy hợp đồng"
                              onClick={() => openCancelContractModal(contract)}
                              style={{ color: '#dc2626' }}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {contract.isReleased && (
                          <button
                            className="btn-icon-primary"
                            title="Gia hạn lại"
                            onClick={() => handleOpenExtensionModal(contract)}
                            style={{ background: '#f59e0b', color: 'white' }}
                          >
                            ↻
                          </button>
                        )}
                        {!contract.isReleased && isOverdueReleaseEligible(contract) && (
                          <button
                            className="btn-icon-secondary"
                            title="Giải phóng phòng/giường"
                            onClick={() => handleReleaseResident(contract)}
                            disabled={isReleasingResident}
                            style={{ background: '#ef4444', color: 'white' }}
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        )}
                        {!contract.isReleased && getContractStatusLabel(contract.startDate, contract.endDate, contract.contractStatus) === 'expired' && contract.contractStatus !== 'cancelled' && (
                          <button
                            className="btn-icon-primary"
                            title="Gia hạn hợp đồng"
                            onClick={() => handleOpenExtensionModal(contract)}
                            style={{ background: '#3b82f6', color: 'white' }}
                          >
                            ↻
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="table-pagination">
                <button
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="table-empty">
            <FileText className="w-12 h-12 text-gray-300" />
            <p>{t('admin.contractManagement.noContractsFound')}</p>
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="admin-page-stats">
        <div className="stat-card">
          <h3>{t('admin.contractManagement.totalContracts')}</h3>
          <p className="stat-value">{contracts.length}</p>
        </div>
        <div className="stat-card">
          <h3>{t('admin.contractManagement.activeContracts')}</h3>
          <p className="stat-value text-green-600">
            {contracts.filter((c) => getContractStatusLabel(c.startDate, c.endDate, c.contractStatus) === 'active').length}
          </p>
        </div>
        <div className="stat-card">
          <h3>{t('admin.contractManagement.expiredContracts')}</h3>
          <p className="stat-value text-red-600">
            {contracts.filter((c) => getContractStatusLabel(c.startDate, c.endDate, c.contractStatus) === 'expired').length}
          </p>
        </div>
        <div className="stat-card">
          <h3>{t('admin.contractManagement.upcomingContracts')}</h3>
          <p className="stat-value text-blue-600">
            {contracts.filter((c) => getContractStatusLabel(c.startDate, c.endDate, c.contractStatus) === 'upcoming').length}
          </p>
        </div>
      </div>

      {/* Renewal Invoice Modal */}
      {showRenewalModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{t('admin.contractManagement.renewalInvoiceTitle')}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRenewalModal(false);
                  setSelectedContract(null);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body">
              {selectedContract && (
                <>
                  <div className="form-group">
                    <label>{t('admin.contractManagement.contractNumberLabel')}</label>
                    <input
                      type="text"
                      value={selectedContract.contractNumber}
                      disabled
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>{t('admin.contractManagement.residentNameLabel')}</label>
                    <input
                      type="text"
                      value={selectedContract.residentName}
                      disabled
                      className="form-input"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('admin.contractManagement.billingPeriodStart')}</label>
                      <input
                        type="date"
                        value={renewalData.billingPeriodStart}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                          const nextData = {
                            ...renewalData,
                            billingPeriodStart: e.target.value,
                          };
                          setRenewalDateError(validateBillingPeriodDates(nextData.billingPeriodStart, nextData.billingPeriodEnd));
                          setRenewalData(syncRenewalPricing(nextData));
                        }}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('admin.contractManagement.billingPeriodEnd')}</label>
                      <input
                        type="date"
                        value={renewalData.billingPeriodEnd}
                        min={renewalData.billingPeriodStart || new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                          const nextData = {
                            ...renewalData,
                            billingPeriodEnd: e.target.value,
                          };
                          setRenewalDateError(validateBillingPeriodDates(nextData.billingPeriodStart, nextData.billingPeriodEnd));
                          setRenewalData(syncRenewalPricing(nextData));
                        }}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Gói dịch vụ trong hợp đồng</label>
                    <div className="form-input readonly" style={{ minHeight: 'auto' }}>
                      <div className="font-semibold text-slate-800">{selectedContract.servicePackageName || 'N/A'}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Giá theo tháng: {formatCurrency(selectedContract.servicePackagePrice || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Số tháng trong hợp đồng</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 flex-wrap">
                        {[1, 3, 6, 12].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className="btn-icon-secondary"
                            onClick={() => applyRenewalPreset(preset)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '999px',
                              fontSize: '13px',
                              fontWeight: 600,
                              background: (renewalData.computedServiceFeeBreakdown?.durationMonths || 1) === preset ? '#e0f2fe' : '#f8fafc',
                              color: '#0f172a',
                            }}
                          >
                            {preset} tháng
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={renewalData.computedServiceFeeBreakdown?.durationMonths || 1}
                        onChange={(e) => applyRenewalPreset(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>% Giảm giá gói dịch vụ</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={renewalData.serviceDiscountPercent || 0}
                      onChange={(e) => {
                        const value = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        const nextData = {
                          ...renewalData,
                          serviceDiscountPercent: value,
                        };
                        setRenewalData(syncRenewalPricing(nextData));
                      }}
                      className="form-input"
                    />
                    <p className="form-note">Giảm giá chỉ áp dụng cho phần gói dịch vụ, không giảm thuốc.</p>
                  </div>

                  <div className="form-group">
                    <label>{t('admin.contractManagement.medicationCost')}</label>
                    <input
                      type="number"
                      min="0"
                      value={renewalData.medicationCost}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRenewalData({
                          ...renewalData,
                          medicationCost: value === '' ? '' : Number(value),
                        });
                      }}
                      className="form-input"
                    />
                    <p className="form-note">{t('admin.contractManagement.medicationCostNote')}</p>
                    {renewalMedBlockedMessage && (
                      <div className="form-note" style={{ color: '#b91c1c', marginTop: 8 }}>{renewalMedBlockedMessage}</div>
                    )}
                  </div>

                  {/* Computed service fee from package price × duration (read-only) */}
                  <div className="form-group">
                    <label>{t('admin.contractManagement.careServiceCost')}</label>
                    <div className="form-input readonly">
                      {(() => {
                        const monthly = renewalData.computedServiceFeeBreakdown?.monthlyPrice || 0;
                        const months = renewalData.computedServiceFeeBreakdown?.durationMonths || 1;
                        const discount = renewalData.computedServiceFeeBreakdown?.discountPercent || 0;
                        const gross = monthly * months;
                        const net = Math.round(gross * (1 - (discount / 100)));
                        return `${net.toLocaleString('vi-VN')} VND`;
                      })()}
                      <div className="text-xs text-slate-500 mt-1">
                        {`Thời hạn đang chọn: ${renewalData.computedServiceFeeBreakdown?.durationMonths || 1} tháng`}
                      </div>
                      {renewalData.computedServiceFeeBreakdown?.discountPercent ? (
                        <div className="text-xs text-slate-500 mt-1">(Đã áp dụng giảm giá {renewalData.computedServiceFeeBreakdown.discountPercent}%)</div>
                      ) : null}
                      {renewalServiceBlockedMessage && (
                        <div className="form-note" style={{ color: '#b91c1c', marginTop: 8 }}>{renewalServiceBlockedMessage}</div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{t('admin.contractManagement.otherCost')}</label>
                    <input
                      type="number"
                      min="0"
                      value={renewalData.otherCost}
                      onChange={(e) =>
                        setRenewalData({
                          ...renewalData,
                          otherCost: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>{t('admin.contractManagement.paymentPlanLabel')}</label>
                    <div className="form-radio-group">
                      <label className="form-radio">
                        <input
                          type="radio"
                          name="paymentPlan"
                          value="FULL"
                          checked={renewalData.paymentPlan === 'FULL'}
                          onChange={() => setRenewalData((p) => ({ ...p, paymentPlan: 'FULL' }))}
                        />
                        {t('admin.contractManagement.paymentPlanFull')}
                      </label>
                      <label className="form-radio">
                        <input
                          type="radio"
                          name="paymentPlan"
                          value="HALF_NOW"
                          checked={renewalData.paymentPlan === 'HALF_NOW'}
                          onChange={() => setRenewalData((p) => ({ ...p, paymentPlan: 'HALF_NOW' }))}
                        />
                        {t('admin.contractManagement.paymentPlanHalfNow')}
                      </label>
                    </div>
                    <p className="form-note">{t('admin.contractManagement.paymentPlanHalfNowNote')}</p>
                  </div>

                  <div className="form-group">
                    <label>{t('admin.contractManagement.prescriptionSectionTitle')}</label>
                    {prescriptionLoading ? (
                      <div className="prescription-loading">{t('admin.contractManagement.prescriptionLoading')}</div>
                    ) : selectedPrescription ? (
                      <div className="prescription-summary">
                        <div>{`${t('admin.contractManagement.prescriptionDoctor')}: ${selectedPrescription.doctorId?.fullName || t('admin.contractManagement.unknownDoctor')}`}</div>
                        <div>{`${t('admin.contractManagement.prescriptionDate')}: ${formatDate(selectedPrescription.prescriptionDate)}`}</div>
                        <div>{`${t('admin.contractManagement.prescriptionItems')}: ${selectedPrescription.itemsCount || selectedPrescription.items?.length || 0}`}</div>
                      </div>
                    ) : (
                      <div className="prescription-empty">{t('admin.contractManagement.noActivePrescription')}</div>
                    )}
                    {prescriptionError && (
                      <div className="prescription-error">{prescriptionError}</div>
                    )}
                  </div>

                  <div className="form-group-total">
                    <label>{t('admin.contractManagement.totalAmount')}</label>
                    <div className="total-amount">
                      {formatCurrency(computeRenewalInvoiceTotal(renewalData))}
                    </div>
                  </div>
                  {renewalDateError && (
                    <div className="alert alert-error" style={{ marginTop: 12 }}>
                      {renewalDateError}
                    </div>
                  )}
                  {renewalConflictMessage && (
                    <div className="alert alert-error" style={{ marginTop: 12 }}>
                      {renewalConflictMessage}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowRenewalModal(false);
                  setSelectedContract(null);
                }}
              >
                {t('admin.contractManagement.cancelButton')}
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmitRenewalInvoice}
                disabled={isCreatingInvoice || Boolean(renewalConflictMessage) || Boolean(renewalDateError)}
              >
                {isCreatingInvoice ? t('admin.contractManagement.creatingInvoice') : t('admin.contractManagement.createInvoiceButton')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showMedicationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Tạo hóa đơn thuốc</h2>
              <div className="flex gap-2">
                <button
                  className="btn-icon-secondary"
                  title="Làm mới danh sách đơn thuốc"
                  onClick={() => selectedContract && refreshMedicationPrescriptions(selectedContract.residentId)}
                  disabled={medLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${medLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  className="modal-close"
                  onClick={() => {
                    setShowMedicationModal(false);
                    setSelectedContract(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {medLoading ? (
                <div>Đang tải đơn thuốc...</div>
              ) : medError ? (
                <div className="alert alert-error">{medError}</div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Chọn đơn thuốc</label>
                    <select
                      value={medSelectedId || ''}
                      onChange={(e) => {
                        setMedSelectedId(e.target.value);
                        estimateMedCost(e.target.value);
                      }}
                      className="form-select"
                    >
                      <option value="">-- Chọn --</option>
                      {medPrescriptions.map((p) => (
                        <option key={p._id || p.id} value={p._id || p.id}>{`${p.prescriptionDate ? formatDate(p.prescriptionDate) : '---'} — ${p.doctorId?.fullName || 'Bác sĩ'}`}</option>
                      ))}
                    </select>
                  </div>

                  {medSelectedId && (() => {
                    const selectedPrx = getSelectedPrescriptionDetails();
                    if (!selectedPrx) return null;
                    const isExpired = isPrescriptionExpired(selectedPrx.validUntil);
                    const invoiceStatus = selectedPrx.invoiceStatus || 'no_invoice';
                    const paymentStatus = selectedPrx.paymentStatus || null;
                    
                    return (
                      <>
                        {/* Expiration Warning */}
                        {isExpired && (
                          <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
                            <AlertCircle className="inline w-4 h-4 mr-2" />
                            <strong>⚠️ Cảnh báo:</strong> Đơn thuốc này đã quá hạn (hết hiệu lực: {formatDate(selectedPrx.validUntil)})
                          </div>
                        )}

                        {/* Prescription Status and Payment Info */}
                        <div className="form-group">
                          <label>Thông tin đơn thuốc</label>
                          <div style={{ background: '#f3f4f6', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
                            <div style={{ marginBottom: '8px' }}>
                              <strong>Trạng thái:</strong> {' '}
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: isExpired ? '#fee2e2' : '#dcfce7',
                                color: isExpired ? '#991b1b' : '#166534',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}>
                                {isExpired ? '❌ Đã quá hạn' : '✓ Còn hiệu lực'}
                              </span>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                              <strong>Hết hiệu lực:</strong> {selectedPrx.validUntil ? formatDate(selectedPrx.validUntil) : '—'}
                            </div>
                            <div>
                              <strong>Thanh toán:</strong> {' '}
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: paymentStatus === 'paid' ? '#dcfce7' : paymentStatus === 'partially_paid' ? '#fef3c7' : '#fecaca',
                                color: paymentStatus === 'paid' ? '#166534' : paymentStatus === 'partially_paid' ? '#92400e' : '#991b1b',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}>
                                {paymentStatus === 'paid' ? '✓ Đã thanh toán' : paymentStatus === 'partially_paid' ? '◐ Thanh toán một phần' : '✗ Chưa thanh toán'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Chi tiết đơn thuốc</label>
                          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
                            {selectedPrx.items?.length ? (
                              <>
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>Từ ngày:</strong>{' '}
                                  {selectedPrx.items
                                    .filter((it) => it.startDate)
                                    .map((it) => it.startDate)
                                    .sort()[0]
                                    ? formatDate(selectedPrx.items
                                        .filter((it) => it.startDate)
                                        .map((it) => it.startDate)
                                        .sort()[0])
                                    : '—'}
                                  {' '}<strong>Đến ngày:</strong>{' '}
                                  {(() => {
                                    const itemEndDates = selectedPrx.items
                                      .filter((it) => it.endDate)
                                      .map((it) => it.endDate);
                                    const latestItemEnd = itemEndDates.sort().slice(-1)[0];
                                    const latestDate = [latestItemEnd, selectedPrx.validUntil]
                                      .filter(Boolean)
                                      .sort()
                                      .slice(-1)[0];
                                    return latestDate ? formatDate(latestDate) : '—';
                                  })()}
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>Thuốc:</strong>{' '}
                                  {selectedPrx.items.map((item) => item.medicationName).filter(Boolean).join(', ') || '—'}
                                </div>
                                <div>
                                  <strong>Chi tiết từng thuốc:</strong>
                                  <ul style={{ marginTop: 8, paddingLeft: '18px' }}>
                                    {selectedPrx.items.map((item) => (
                                      <li key={item._id || item.medicationId || item.medicationName} style={{ marginBottom: 4 }}>
                                        {item.medicationName || 'N/A'} — {item.dosage || '—'} {item.unit || ''} — {item.frequency ? `${item.frequency} lần/ngày` : '—'}{item.startDate ? ` — ${formatDate(item.startDate)}` : ''}{item.endDate ? ` đến ${formatDate(item.endDate)}` : ''}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            ) : (
                              <div>Không có thông tin chi tiết đơn thuốc.</div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  <div className="form-group">
                    <label>Ước tính chi phí thuốc</label>
                    <div className="form-input readonly">{medEstimatedCost != null ? `${medEstimatedCost.toLocaleString('vi-VN')} VND` : '—'}</div>
                  </div>
                  {medConflictMessage && (
                    <div className="alert alert-error" style={{ marginTop: 12 }}>
                      {medConflictMessage}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowMedicationModal(false);
                  setSelectedContract(null);
                }}
              >
                {t('admin.contractManagement.cancelButton')}
              </button>
              <button
                className="btn-submit"
                onClick={handleCreateMedicationInvoice}
                disabled={medCreatingInvoice || !medSelectedId || Boolean(medConflictMessage)}
              >
                {medCreatingInvoice ? 'Đang tạo...' : 'Tạo hóa đơn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPackageModal && (
        <div className="modal-overlay" onClick={() => setShowPackageModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Thay đổi gói dịch vụ</h2>
              <button className="modal-close" onClick={() => setShowPackageModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              {selectedContract && (
                <p className="form-note" style={{ marginBottom: '16px' }}>
                  Hợp đồng <strong>{selectedContract.contractNumber}</strong> của cư dân {selectedContract.residentName}.
                </p>
              )}
              {packageError && <div className="alert alert-error">{packageError}</div>}
              <div className="form-group">
                <label>Gói dịch vụ mới</label>
                <p className="form-note" style={{ marginTop: '4px', marginBottom: '8px' }}>
                  Khi đổi gói, phòng hiện tại của cư dân phải phù hợp với loại phòng được phép của gói mới.
                </p>
                {packageLoading ? (
                  <div className="form-note">Đang tải danh sách gói dịch vụ...</div>
                ) : (
                  <select
                    className="form-select"
                    value={selectedPackageId}
                    onChange={(event) => setSelectedPackageId(event.target.value)}
                  >
                    <option value="">-- Chọn gói dịch vụ --</option>
                    {availablePackages.map((pkg) => (
                      <option key={pkg._id} value={pkg._id}>
                        {pkg.name || pkg.packageCode} - {(pkg.monthlyPrice || 0).toLocaleString('vi-VN')} VND/tháng
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowPackageModal(false)}>Đóng</button>
              <button className="btn-submit" onClick={handleChangeContractPackage} disabled={packageLoading || isChangingPackage || !selectedPackageId}>
                {isChangingPackage ? 'Đang cập nhật...' : 'Lưu gói dịch vụ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Hủy hợp đồng</h2>
              <button className="modal-close" onClick={() => setShowCancelModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <p className="form-note" style={{ marginBottom: '16px' }}>
                Bạn đang hủy hợp đồng <strong>{selectedContract?.contractNumber}</strong>. Thao tác này sẽ chuyển trạng thái hợp đồng thành “Đã hủy”.
              </p>
              <div className="form-group">
                <label>Lý do hủy hợp đồng *</label>
                <textarea
                  className="form-input"
                  rows="4"
                  value={cancellationReason}
                  onChange={(event) => setCancellationReason(event.target.value)}
                  placeholder="Nhập lý do hủy hợp đồng..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCancelModal(false)}>Đóng</button>
              <button className="btn-submit" style={{ background: '#dc2626' }} onClick={handleCancelContract} disabled={isCancellingContract || !cancellationReason.trim()}>
                {isCancellingContract ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Extension Modal */}
      {showExtensionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Gia hạn hợp đồng</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowExtensionModal(false);
                  setSelectedContract(null);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body">
              {selectedContract && (
                <>
                  <div className="form-group">
                    <label>Số hợp đồng</label>
                    <input
                      type="text"
                      value={selectedContract.contractNumber}
                      disabled
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Tên cư dân</label>
                    <input
                      type="text"
                      value={selectedContract.residentName}
                      disabled
                      className="form-input"
                    />
                  </div>

                  {/* Service Package Selection */}
                  <div className="form-group">
                    <label>Gói dịch vụ *</label>
                    {extensionPackageLoading ? (
                      <div className="form-input" style={{ color: '#999' }}>Đang tải...</div>
                    ) : extensionPackageError ? (
                      <div style={{ color: '#dc2626', fontSize: '14px' }}>{extensionPackageError}</div>
                    ) : (
                      <select
                        value={extensionData.selectedNewPackageId}
                        onChange={(e) => {
                          const newPackageId = e.target.value;
                          setExtensionData({ ...extensionData, selectedNewPackageId: newPackageId, selectedNewBedId: '' });
                          setExtensionSelectedFloorId('');
                          setExtensionSelectedRoomId('');
                          setExtensionRooms([]);
                          setExtensionAvailableBeds([]);
                          setExtensionSelectionError('');
                        }}
                        className="form-input"
                      >
                        <option value="">-- Chọn gói dịch vụ --</option>
                        {extensionAvailablePackages.map((pkg) => (
                          <option key={pkg._id} value={pkg._id}>
                            {pkg.name} - {pkg.monthlyPrice.toLocaleString('vi-VN')} VND/tháng
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Bed Selection - Hierarchical */}
                  {extensionData.selectedNewPackageId && (
                    <>
                      {/* Floor Selection */}
                      <div className="form-group">
                        <label>Tòa nhà</label>
                        {extensionBedsLoading && !extensionSelectedFloorId ? (
                          <div className="form-input" style={{ color: '#999' }}>Đang tải...</div>
                        ) : extensionBedsError && !extensionSelectedFloorId ? (
                          <div style={{ color: '#dc2626', fontSize: '14px' }}>{extensionBedsError}</div>
                        ) : (
                          <select
                            value={extensionSelectedFloorId}
                            onChange={(e) => handleExtensionFloorChange(e.target.value)}
                            className="form-input"
                          >
                            <option value="">-- Chọn tòa nhà --</option>
                            {extensionFloors.map((floor) => {
                              const floorLabel = floor.name || floor.label || `Tầng ${floor.floorNumber || ''}`.trim();
                              return (
                                <option key={floor._id} value={floor._id}>
                                  {floorLabel}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </div>

                      {/* Room Selection */}
                      {extensionSelectedFloorId && (
                        <div className="form-group">
                          <label>Phòng</label>
                          {extensionBedsLoading && extensionSelectedFloorId && !extensionSelectedRoomId ? (
                            <div className="form-input" style={{ color: '#999' }}>Đang tải...</div>
                          ) : extensionBedsError && extensionSelectedFloorId && !extensionSelectedRoomId ? (
                            <div style={{ color: '#dc2626', fontSize: '14px' }}>{extensionBedsError}</div>
                          ) : (
                            <select
                              value={extensionSelectedRoomId}
                              onChange={(e) => handleExtensionRoomChange(e.target.value)}
                              className="form-input"
                            >
                              <option value="">-- Chọn phòng --</option>
                              {extensionRooms.map((room) => {
                                const roomLabel = room.label || room.roomNumber || room.name || `Phòng ${room.roomNumber || room.number || room._id?.slice(-4)}`;
                                return (
                                  <option key={room._id} value={room._id}>
                                    {roomLabel}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                          {extensionSelectionError && (
                            <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '6px' }}>{extensionSelectionError}</div>
                          )}
                        </div>
                      )}

                      {/* Bed Selection */}
                      {extensionSelectedRoomId && (
                        <div className="form-group">
                          <label>Giường</label>
                          {extensionBedsLoading && extensionSelectedRoomId ? (
                            <div className="form-input" style={{ color: '#999' }}>Đang tải...</div>
                          ) : extensionBedsError && extensionSelectedRoomId ? (
                            <div style={{ color: '#dc2626', fontSize: '14px' }}>{extensionBedsError}</div>
                          ) : (
                            <select
                              value={extensionData.selectedNewBedId}
                              onChange={(e) => setExtensionData({ ...extensionData, selectedNewBedId: e.target.value })}
                              className="form-input"
                            >
                              <option value="">-- Không đổi giường --</option>
                              {extensionAvailableBeds.map((bed) => {
                                const bedLabel = bed.label || bed.bedCode || bed.code || bed.bedNumber || `Giường ${bed.bedCode || bed._id?.slice(-4)}`;
                                return (
                                  <option key={bed._id} value={bed._id}>
                                    {bedLabel}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Ngày hết hạn hiện tại</label>
                      <input
                        type="date"
                        value={new Date(selectedContract.endDate).toISOString().split('T')[0]}
                        disabled
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Ngày bắt đầu hợp đồng mới *</label>
                      <input
                        type="date"
                        value={extensionData.contractStartDate}
                        onChange={(e) =>
                          setExtensionData({
                            ...extensionData,
                            contractStartDate: e.target.value,
                          })
                        }
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Ngày hết hạn mới *</label>
                      <input
                        type="date"
                        value={extensionData.newEndDate}
                        onChange={(e) =>
                          setExtensionData({
                            ...extensionData,
                            newEndDate: e.target.value,
                          })
                        }
                        className="form-input"
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {[1, 3, 6, 12].map((months) => (
                          <button
                            key={months}
                            type="button"
                            className="btn-submit"
                            style={{ padding: '6px 10px', fontSize: '12px', minWidth: '70px' }}
                            onClick={() => handleExtensionDurationSelect(months)}
                          >
                            {months} tháng
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>% Giảm giá *</label>
                      <input
                        type="number"
                        value={extensionData.discountPercent}
                        onChange={(e) =>
                          setExtensionData({
                            ...extensionData,
                            discountPercent: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                          })
                        }
                        min="0"
                        max="100"
                        step="1"
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Cost Calculation Display */}
                  {extensionData.newEndDate && extensionData.contractStartDate && extensionData.selectedNewPackageId && selectedContract && (
                    <div className="form-group">
                      <label>Chi phí gia hạn (sau giảm giá)</label>
                      <div className="form-input readonly">
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          {(() => {
                            const startDate = new Date(extensionData.contractStartDate);
                            const endDate = new Date(extensionData.newEndDate);
                            const selectedPackage = extensionAvailablePackages.find(
                              (pkg) => String(pkg._id) === String(extensionData.selectedNewPackageId)
                            );
                            const packagePrice = selectedPackage?.monthlyPrice ?? selectedContract.servicePackagePrice ?? 0;
                            const finalCost = calculateExtensionCost(
                              extensionData.contractStartDate,
                              extensionData.newEndDate,
                              packagePrice,
                              extensionData.discountPercent
                            );
                            
                            let monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12;
                            monthsDiff += endDate.getMonth() - startDate.getMonth();
                            
                            const baseServiceCost = packagePrice * monthsDiff;
                            
                            return `${monthsDiff} tháng × ${packagePrice.toLocaleString('vi-VN')} = ${baseServiceCost.toLocaleString('vi-VN')} VND`;
                          })()}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', marginTop: '8px' }}>
                          {(() => {
                            const selectedPackage = extensionAvailablePackages.find(
                              (pkg) => String(pkg._id) === String(extensionData.selectedNewPackageId)
                            );
                            const packagePrice = selectedPackage?.monthlyPrice ?? selectedContract.servicePackagePrice ?? 0;
                            const finalCost = calculateExtensionCost(
                              extensionData.contractStartDate,
                              extensionData.newEndDate,
                              packagePrice,
                              extensionData.discountPercent
                            );
                            return `${finalCost.toLocaleString('vi-VN')} VND`;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowExtensionModal(false);
                  setSelectedContract(null);
                }}
              >
                {t('admin.contractManagement.cancelButton')}
              </button>
              <button
                className="btn-submit"
                onClick={handleExtendContract}
                disabled={isExtendingContract}
              >
                {isExtendingContract ? 'Đang xử lý...' : 'Gia hạn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContractDetailModal && selectedContract && (
        <div className="modal-overlay" onClick={() => setShowContractDetailModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Chi tiết hợp đồng</h2>
              <button className="modal-close" onClick={() => setShowContractDetailModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Số hợp đồng</label>
                <div className="form-input readonly">{selectedContract.contractNumber || '-'}</div>
              </div>
              <div className="form-group">
                <label>Cư dân</label>
                <div className="form-input readonly">{selectedContract.residentName || '-'}</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày bắt đầu</label>
                  <div className="form-input readonly">{formatDate(selectedContract.startDate)}</div>
                </div>
                <div className="form-group">
                  <label>Ngày kết thúc</label>
                  <div className="form-input readonly">{formatDate(selectedContract.endDate)}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Trạng thái hợp đồng</label>
                  <div className="form-input readonly">{getStatusTranslation(getContractStatusLabel(selectedContract.startDate, selectedContract.endDate, selectedContract.contractStatus), t)}</div>
                </div>
                <div className="form-group">
                  <label>Ngày ký</label>
                  <div className="form-input readonly">{formatDate(selectedContract.signedAt)}</div>
                </div>
              </div>
              <div className="form-group">
                <label>Gói dịch vụ</label>
                <div className="form-input readonly">{selectedContract.servicePackageName || '-'}</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Giá dịch vụ</label>
                  <div className="form-input readonly">{formatCurrency(selectedContract.servicePackagePrice)}</div>
                </div>
                <div className="form-group">
                  <label>Giảm giá hợp đồng</label>
                  <div className="form-input readonly">{selectedContract.contractDiscountPercent != null ? `${selectedContract.contractDiscountPercent}%` : '-'}</div>
                </div>
              </div>
              <div className="form-group">
                <label>Hóa đơn mới nhất</label>
                <div className="form-input readonly">
                  {selectedContract.latestInvoice ? (
                    <>
                      <div>{selectedContract.latestInvoice.invoiceNumber || '—'}</div>
                      <div style={{ marginTop: 8, fontSize: '0.95rem', color: '#475569' }}>
                        {selectedContract.latestInvoiceStatus === 'paid' ? 'Đã thanh toán' : selectedContract.latestInvoiceStatus === 'partially_paid' ? 'Thanh toán một phần' : 'Chưa thanh toán'}
                      </div>
                      {selectedContract.outstandingAmount > 0 && (
                        <div style={{ marginTop: 6, fontSize: '0.92rem', color: '#0f172a' }}>
                          Tổng nợ chưa thanh toán: {selectedContract.outstandingAmount.toLocaleString('vi-VN')}₫
                        </div>
                      )}
                    </>
                  ) : (
                    'Chưa có hóa đơn'
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-submit" onClick={() => setShowContractDetailModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
