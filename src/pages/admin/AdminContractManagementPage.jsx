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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import admissionService from '../../services/admission.service';
import medicationService from '../../services/medication.service';
import paymentService from '../../services/payment.service';
import servicePackageService from '../../services/servicePackage.service';
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
  });
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [renewalConflictMessage, setRenewalConflictMessage] = useState('');
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
    newEndDate: '',
    discountPercent: 0,
  });
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

  const fetchContracts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await admissionService.adminGetAdmissionList({
        page: 1,
        limit: 1000,
        status: 'contracting,checked_in,cancelled',
      });

      // Filter admissions with contracts
      const contractData = (response.data || [])
        .filter((admission) => admission.contractNumber && admission.contractStartDate && admission.contractEndDate)
        .map((admission) => ({
          id: admission._id,
          contractStatus: admission.contractStatus || (admission.status === 'cancelled' ? 'cancelled' : 'active'),
          residentId: admission.residentId?._id || admission.residentId,
          residentName: admission.residentId?.fullName || admission.applicant?.fullName || 'N/A',
          contractNumber: admission.contractNumber,
          startDate: admission.contractStartDate,
          endDate: admission.contractEndDate,
          terms: admission.contractTerms,
          signedAt: admission.contractSignedAt,
          status: getContractStatusLabel(admission.contractStartDate, admission.contractEndDate, admission.status),
          servicePackageId: admission.servicePackageId?._id || admission.servicePackageId || null,
          servicePackageName: admission.servicePackageId?.name || admission.servicePackageId?.packageCode || 'N/A',
          servicePackagePrice: admission.servicePackageId?.monthlyPrice || 0,
          contractDurationMonths: admission.contractDurationMonths || null,
          contractDiscountPercent: admission.contractDiscountPercent || null,
          latestInvoice: admission.latestInvoice || null,
          latestInvoiceStatus: admission.latestInvoice?.status?.toString().toLowerCase?.() || null,
          latestInvoiceHasServiceCost: ['SERVICE', 'COMBINED'].includes(admission.latestInvoice?.type)
            && Number(admission.latestInvoice?.careServiceCost || 0) > 0,
        }));

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
      // load recent prescriptions for the resident (include expired so admin can pick older ones)
      const resp = await medicationService.listPrescriptions({ residentId, limit: 20 });
      const list = Array.isArray(resp) ? resp : resp?.data || [];
      setMedPrescriptions(list);
      setMedError('');
    } catch (err) {
      console.error('Failed to load prescriptions for medication invoice:', err);
      setMedError(err.response?.data?.message || 'Không thể tải đơn thuốc.');
    } finally {
      setMedLoading(false);
    }
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

  const handleOpenExtensionModal = (contract) => {
    setSelectedContract(contract);
    // Pre-fill with 1 year extension from current end date
    const currentEndDate = new Date(contract.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    setExtensionData({
      newEndDate: newEndDate.toISOString().split('T')[0],
      discountPercent: contract.contractDiscountPercent || 0,
    });
    setShowExtensionModal(true);
  };

  const calculateExtensionCost = (newEndDateStr, currentEndDate, servicePackagePrice, discountPercent) => {
    if (!newEndDateStr) return 0;
    
    const newEndDate = new Date(newEndDateStr);
    if (newEndDate <= currentEndDate) return 0;
    
    // Calculate months
    let monthsDiff = (newEndDate.getFullYear() - currentEndDate.getFullYear()) * 12;
    monthsDiff += newEndDate.getMonth() - currentEndDate.getMonth();
    
    if (monthsDiff <= 0) return 0;
    
    // Calculate service cost with discount
    const baseServiceCost = (servicePackagePrice || 0) * monthsDiff;
    const finalServiceCost = baseServiceCost * (1 - (discountPercent || 0) / 100);
    
    return finalServiceCost;
  };

  const handleExtendContract = async () => {
    if (!selectedContract || !extensionData.newEndDate) {
      return alert('Vui lòng nhập ngày hết hạn mới.');
    }

    const newEndDate = new Date(extensionData.newEndDate);
    const currentEndDate = new Date(selectedContract.endDate);
    
    if (newEndDate <= currentEndDate) {
      return alert('Ngày hết hạn mới phải sau ngày hết hạn hiện tại.');
    }

    try {
      setIsExtendingContract(true);

      // Calculate extension period in months
      let monthsDiff = (newEndDate.getFullYear() - currentEndDate.getFullYear()) * 12;
      monthsDiff += newEndDate.getMonth() - currentEndDate.getMonth();
      
      if (monthsDiff <= 0) {
        return alert('Khoảng thời gian gia hạn phải tối thiểu 1 tháng.');
      }

      // Calculate service cost for extension: price * months * (1 - discount%)
      const baseServiceCost = (selectedContract.servicePackagePrice || 0) * monthsDiff;
      const discountPercent = extensionData.discountPercent || 0;
      const discountAmount = baseServiceCost * (discountPercent / 100);
      const finalServiceCost = baseServiceCost - discountAmount;

      // Update admission contract end date
      await admissionService.updateAdmissionContractDates(selectedContract.id, {
        contractEndDate: newEndDate.toISOString(),
      });

      // Create SERVICE invoice for extension period
      const billingPeriodStart = new Date(currentEndDate);
      billingPeriodStart.setDate(billingPeriodStart.getDate() + 1); // Start from day after old contract end
      
      const invoiceBody = {
        careServiceCost: finalServiceCost,
        billingPeriodStart: billingPeriodStart.toISOString().split('T')[0],
        billingPeriodEnd: newEndDate.toISOString().split('T')[0],
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
    nextEndDate.setFullYear(nextEndDate.getFullYear() + 1); // 1 year renewal

    // Fetch existing invoices to avoid double-charging for already-paid service periods
    let careServiceCost = (contract.servicePackagePrice || 0) * (contract.contractDurationMonths || 1);
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

    setRenewalData({
      billingPeriodStart: nextStartDate.toISOString().split('T')[0],
      billingPeriodEnd: nextEndDate.toISOString().split('T')[0],
      roomCost: 0,
      medicationCost: '',
      careServiceCost,
      otherCost: 0,
      prescriptionId: null,
      computedServiceFeeBreakdown: {
        monthlyPrice: contract.servicePackagePrice || 0,
        durationMonths: contract.contractDurationMonths || 1,
        discountPercent: contract.contractDiscountPercent || 0,
      },
    });
    setShowRenewalModal(true);
    await fetchActivePrescription(contract.residentId);
  };

  const handleSubmitRenewalInvoice = async () => {
    if (!selectedContract) return;

    setIsCreatingInvoice(true);
    try {
      // compute service fee with discount
      const monthly = renewalData.computedServiceFeeBreakdown?.monthlyPrice || 0;
      const months = renewalData.computedServiceFeeBreakdown?.durationMonths || 1;
      const discount = renewalData.computedServiceFeeBreakdown?.discountPercent || 0;
      const grossService = monthly * months;
      const netService = Math.round(grossService * (1 - discount / 100));

      const totalAmount =
        /* roomCost intentionally 0 for contract-based billing */
        0 +
        (renewalData.medicationCost || 0) +
        netService +
        (renewalData.otherCost || 0);

      const invoiceBody = {
        billingPeriodStart: renewalData.billingPeriodStart,
        billingPeriodEnd: renewalData.billingPeriodEnd,
        roomCost: 0,
        medicationCost: renewalData.medicationCost === '' ? undefined : renewalData.medicationCost,
        careServiceCost: netService,
        otherCost: renewalData.otherCost || 0,
        prescriptionId: renewalData.prescriptionId,
        totalAmount,
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
                        <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold">
                          {contract.latestInvoiceStatus === 'paid' ? (
                            <span className="bg-emerald-100 text-emerald-700">✓ Đã thanh toán</span>
                          ) : contract.latestInvoiceStatus === 'partially_paid' ? (
                            <span className="bg-amber-100 text-amber-700">◐ Thanh toán một phần</span>
                          ) : (
                            <span className="bg-red-100 text-red-700">✗ Chưa thanh toán</span>
                          )}
                        </div>
                      ) : (
                        <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          − Chưa có hóa đơn
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
                        <button className="btn-icon-primary" title={t('admin.contractManagement.viewDetails')}>
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Show create-invoice action when there is no invoice or invoice not paid */}
                        {contract.contractStatus !== 'cancelled' && (!contract.latestInvoice || contract.latestInvoiceStatus !== 'paid') && (
                          <button
                            className="btn-icon-primary btn-create-invoice"
                            title={t('admin.contractManagement.createRenewalInvoice')}
                            onClick={() => handleCreateRenewalInvoice(contract)}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                        {contract.contractStatus !== 'cancelled' && <button
                          className="btn-icon-secondary"
                          title="Tạo hóa đơn thuốc"
                          onClick={() => openMedicationInvoiceModal(contract)}
                        >
                          🩺
                        </button>}
                        {contract.contractStatus !== 'cancelled' && (
                          <>
                            <button
                              className="btn-icon-secondary"
                              title="Thay đổi gói dịch vụ"
                              onClick={() => openPackageChangeModal(contract)}
                              disabled={contract.latestInvoiceHasServiceCost && ['paid', 'partially_paid'].includes(contract.latestInvoiceStatus)}
                              style={{ opacity: contract.latestInvoiceHasServiceCost && ['paid', 'partially_paid'].includes(contract.latestInvoiceStatus) ? 0.45 : 1 }}
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
                        {getContractStatusLabel(contract.startDate, contract.endDate, contract.contractStatus) === 'expired' && contract.contractStatus !== 'cancelled' && (
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
                        onChange={(e) =>
                          setRenewalData({
                            ...renewalData,
                            billingPeriodStart: e.target.value,
                          })
                        }
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('admin.contractManagement.billingPeriodEnd')}</label>
                      <input
                        type="date"
                        value={renewalData.billingPeriodEnd}
                        onChange={(e) =>
                          setRenewalData({
                            ...renewalData,
                            billingPeriodEnd: e.target.value,
                          })
                        }
                        className="form-input"
                      />
                    </div>
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
                      {(() => {
                        // Recalculate service fee to ensure discount is applied
                        const monthly = renewalData.computedServiceFeeBreakdown?.monthlyPrice || 0;
                        const months = renewalData.computedServiceFeeBreakdown?.durationMonths || 1;
                        const discount = renewalData.computedServiceFeeBreakdown?.discountPercent || 0;
                        const grossService = monthly * months;
                        const netService = Math.round(grossService * (1 - discount / 100));
                        const total = 
                          0 +
                          (renewalData.medicationCost || 0) +
                          netService +
                          (renewalData.otherCost || 0);
                        return total.toLocaleString('vi-VN');
                      })()}
                    </div>
                  </div>
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
                disabled={isCreatingInvoice || Boolean(renewalConflictMessage)}
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
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Giá gói dịch vụ (tháng)</label>
                      <input
                        type="text"
                        value={`${(selectedContract.servicePackagePrice || 0).toLocaleString('vi-VN')} VND`}
                        disabled
                        className="form-input"
                      />
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

                  {extensionData.newEndDate && selectedContract && (
                    <div className="form-group">
                      <label>Chi phí gia hạn (sau giảm giá)</label>
                      <div className="form-input readonly">
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          {(() => {
                            const currentEndDate = new Date(selectedContract.endDate);
                            const finalCost = calculateExtensionCost(
                              extensionData.newEndDate,
                              currentEndDate,
                              selectedContract.servicePackagePrice,
                              extensionData.discountPercent
                            );
                            
                            let monthsDiff = (new Date(extensionData.newEndDate).getFullYear() - currentEndDate.getFullYear()) * 12;
                            monthsDiff += new Date(extensionData.newEndDate).getMonth() - currentEndDate.getMonth();
                            
                            const baseServiceCost = (selectedContract.servicePackagePrice || 0) * monthsDiff;
                            
                            return `${monthsDiff} tháng × ${(selectedContract.servicePackagePrice || 0).toLocaleString('vi-VN')} = ${baseServiceCost.toLocaleString('vi-VN')} VND`;
                          })()}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', marginTop: '8px' }}>
                          {(() => {
                            const currentEndDate = new Date(selectedContract.endDate);
                            const finalCost = calculateExtensionCost(
                              extensionData.newEndDate,
                              currentEndDate,
                              selectedContract.servicePackagePrice,
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
    </div>
  );
}
