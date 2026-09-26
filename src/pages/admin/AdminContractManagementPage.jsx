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
  X,
  LogOut,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import contractService from '../../services/contract.service';
import medicationService from '../../services/medication.service';
import paymentService from '../../services/payment.service';
import residentService from '../../services/resident.service';
import servicePackageService from '../../services/servicePackage.service';
import { resolveApiError } from '../../utils/apiMessage';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ContractPreviewModal from '../../components/admin/contract/ContractPreviewModal';
import { useToast } from '../../hooks/useToast';
import '../../styles/admin/AdminContractManagementPage.css';
import '../../styles/admin/ContractEditor.css';

// ── Resident cell helpers ─────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#0f766e', '#e64980', '#0ca678', '#f76707', '#7048e8', '#1098ad', '#d6336c', '#5c7cfa'];
const getAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
};
const formatResidentDisplay = (contract) => {
  // Trả về { name, code } dùng cho cell. Có fallback hợp lý khi dữ liệu thiếu.
  const name = contract.residentName && contract.residentName !== 'N/A' ? contract.residentName : '';
  const code = contract.residentCode || '';
  if (!name && !code) {
    return { displayName: '—', subtitle: 'Không xác định' };
  }
  return {
    displayName: name || code,
    subtitle: code && name ? code : (name ? 'Chưa có mã cư dân' : ''),
  };
};

const getContractStatusClass = (startDate, endDate, contractStatus) => {
  // 'cancelled' = admission cancel; 'terminated' = admin chấm dứt hợp đồng (sau khi
  // hợp đồng đã active). Cả hai đều là trạng thái terminal — không còn hiệu lực.
  if (contractStatus === 'cancelled' || contractStatus === 'terminated') {
    return 'contract-status-cancelled';
  }
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
  // 'cancelled' và 'terminated' đều là terminal — hợp đồng không còn hiệu lực.
  // Trước đây chỉ check 'cancelled' → hợp đồng bị terminateContract chấm dứt bị
  // tính nhầm là 'active' dựa trên endDate (khiến UI hiển thị "Còn hiệu lực").
  if (contractStatus === 'cancelled' || contractStatus === 'terminated') {
    return 'cancelled';
  }
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
  return t(statusMap[statusKey] || statusKey);
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

// Helper format tiền VND
const formatVnd = (n) => {
  const num = Number(n || 0);
  return num.toLocaleString('vi-VN') + ' đ';
};

// Helper format ngày
const formatDateShort = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN');
};

// ── Component hiển thị điều khoản hợp đồng (terms) trong modal chi tiết ───────
// Mặc định thu gọn (preview ~480px) để không phá layout modal. Admin bấm "Mở rộng"
// để xem toàn bộ. Có nút "Sao chép" để copy nguyên văn terms vào clipboard.
function ContractTermsSection({ contract, t }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copyState, setCopyState] = useState('idle'); // idle | success | error

  const rawTerms = contract?.terms;
  const hasTerms = typeof rawTerms === 'string' && rawTerms.trim().length > 0;

  const handleCopy = async () => {
    if (!hasTerms) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(rawTerms);
      } else {
        // Fallback cho trình duyệt không hỗ trợ clipboard API
        const ta = document.createElement('textarea');
        ta.value = rawTerms;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopyState('success');
      setTimeout(() => setCopyState('idle'), 1800);
    } catch (err) {
      console.error('[ContractTermsSection] copy failed:', err);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 1800);
    }
  };

  return (
    <div className="form-group">
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span>{t('admin.contractManagement.contractTermsLabel')}</span>
        {hasTerms && (
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              style={{
                background: '#e0f2fe',
                color: '#075985',
                border: 'none',
                borderRadius: 4,
                padding: '2px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isExpanded
                ? t('admin.contractManagement.contractTermsCollapse')
                : t('admin.contractManagement.contractTermsExpand')}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                background: copyState === 'success' ? '#dcfce7' : '#f1f5f9',
                color: copyState === 'success' ? '#15803d' : '#475569',
                border: 'none',
                borderRadius: 4,
                padding: '2px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              title={t('admin.contractManagement.copyTermsButton')}
            >
              {copyState === 'success' ? '✓' : copyState === 'error' ? '✗' : t('admin.contractManagement.copyTermsButton')}
            </button>
          </span>
        )}
      </label>
      <div
        className="form-input readonly"
        style={{
          padding: 0,
          overflow: 'hidden',
          background: '#f8fafc',
        }}
      >
        {hasTerms ? (
          <pre
            style={{
              margin: 0,
              padding: '12px 14px',
              maxHeight: isExpanded ? 'none' : 320,
              overflowY: 'auto',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
              fontSize: '0.88rem',
              lineHeight: 1.55,
              color: '#0f172a',
            }}
          >
            {rawTerms}
          </pre>
        ) : (
          <div style={{ padding: '12px 14px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>
            {t('admin.contractManagement.contractTermsEmpty')}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminContractManagementPage() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [residentFilter, setResidentFilter] = useState('all');
  const [residentOptions, setResidentOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showContractDetailModal, setShowContractDetailModal] = useState(false);
  const [detailContract, setDetailContract] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showContractInvoicesModal, setShowContractInvoicesModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractInvoices, setContractInvoices] = useState([]);
  const [contractInvoicesLoading, setContractInvoicesLoading] = useState(false);
  const [recalculatingInvoices, setRecalculatingInvoices] = useState(false);
  const [exportingInvoiceId, setExportingInvoiceId] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState({
    careServiceCost: 0,
    billingPeriodStart: '',
    reason: '',
  });
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [pendingCancelInvoice, setPendingCancelInvoice] = useState(null);
  const [cancelInvoiceReason, setCancelInvoiceReason] = useState('');
  const [cancellingInvoice, setCancellingInvoice] = useState(false);
  const [cancelInvoiceError, setCancelInvoiceError] = useState(null);
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
  });
  const [extensionPackageError, setExtensionPackageError] = useState('');
  const [extensionAvailablePackages, setExtensionAvailablePackages] = useState([]);
  const [extensionPackageLoading, setExtensionPackageLoading] = useState(false);
  const [isExtendingContract, setIsExtendingContract] = useState(false);
  // Lịch sử hợp đồng của cư dân (active + cũ) — hiển thị trong modal chi tiết
  const [contractHistory, setContractHistory] = useState([]);
  const [contractHistoryLoading, setContractHistoryLoading] = useState(false);
  const [historyContract, setHistoryContract] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancellingContract, setIsCancellingContract] = useState(false);
  const [isReleasingResident, setIsReleasingResident] = useState(false);
  const [pendingReleaseContract, setPendingReleaseContract] = useState(null);

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

  const handleReleaseResident = (contract) => {
    if (!contract || !contract.residentId) return;
    setPendingReleaseContract(contract);
  };

  const confirmReleaseResident = async () => {
    const contract = pendingReleaseContract;
    if (!contract) return;
    setIsReleasingResident(true);
    setError('');
    try {
      await residentService.adminReleaseResident(contract.residentId);
      setPendingReleaseContract(null);
      await fetchContracts();
    } catch (err) {
      setError(resolveApiError(err) || t('admin.contractManagement.releaseResidentFailed'));
      console.error('Release resident failed:', err);
    } finally {
      setIsReleasingResident(false);
    }
  };

  const fetchContracts = async () => {
    setIsLoading(true);
    setError('');
    try {
      // 1. Fetch all contracts
      const response = await contractService.listContracts({ page: 1, limit: 1000 });
      const contractList = response?.data || [];

      // 2. Fetch all residents
      const residentResp = await residentService.getResidentList({ page: 1, limit: 1000 });
      const residentList = Array.isArray(residentResp) ? residentResp : residentResp?.data || [];

      // 3. Build residentId -> best contract map
      // Mỗi cư dân có thể có NHIỀU hợp đồng (vd: hợp đồng cũ bị terminate rồi nhập
      // viện lại → tạo hợp đồng mới). Backend trả về sort theo createdAt desc, nên
      // nếu chỉ đơn giản Map.set() theo thứ tự, hợp đồng CŨ (terminated/cancelled)
      // sẽ ghi đè hợp đồng MỚI (active) trên UI. Phải ưu tiên hợp đồng còn hiệu lực.
      const TERMINAL_STATUSES = ['cancelled', 'terminated'];
      const isTerminal = (c) => c && TERMINAL_STATUSES.includes(String(c.status || '').toLowerCase());
      const contractByResident = new Map();
      for (const c of contractList) {
        const rid = c.residentId?._id || c.residentId;
        if (!rid) continue;
        const ridStr = String(rid);
        const existing = contractByResident.get(ridStr);
        if (!existing) {
          contractByResident.set(ridStr, c);
          continue;
        }
        const existingTerminal = isTerminal(existing);
        const currentTerminal = isTerminal(c);
        if (currentTerminal && !existingTerminal) {
          // current = terminated, existing = active → giữ existing (active thắng)
          continue;
        }
        if (!currentTerminal && existingTerminal) {
          // current = active, existing = terminated → current thắng
          contractByResident.set(ridStr, c);
          continue;
        }
        // Cả hai cùng trạng thái (đều active hoặc đều terminated) → lấy hợp đồng
        // mới hơn theo createdAt. Backend đã sort desc nên phần tử sau cùng cùng
        // trạng thái là MỚI hơn → ghi đè là đúng.
        contractByResident.set(ridStr, c);
      }

      // 4. Build table rows: all residents + placeholder contracts for those without
      const rows = [];

      for (const resident of residentList) {
        const rid = String(resident._id);
        const rawContract = contractByResident.get(rid);

        if (rawContract) {
          // Has contract — use existing mapping logic
          const contract = rawContract;
          const admission = contract.admissionId || {};
          const residentFromAdmission = admission.residentId;
          const residentObj = (residentFromAdmission && typeof residentFromAdmission === 'object' && residentFromAdmission.fullName)
            ? residentFromAdmission
            : (contract.residentId || {});
          const servicePackage = contract.servicePackageId || {};
          const latestInvoice = contract.latestInvoice || null;

          const residentStatus = String(residentObj?.residencyStatus || resident.residencyStatus || '').toLowerCase();
          const hasServicePackage = Boolean(contract.servicePackageId || servicePackage?.name);
          const isReleased = residentStatus === 'pending' && !hasServicePackage;

          rows.push({
            id: contract._id,
            contractId: contract._id,
            admissionId: admission._id,
            contractStatus: contract.status || 'active',
            residentId: resident._id,
            residentName: residentObj?.fullName || resident.fullName || '',
            residentCode: residentObj?.residentCode || resident.residentCode || '',
            residentDateOfBirth: residentObj?.dateOfBirth || resident.dateOfBirth || null,
            residentGender: residentObj?.gender || resident.gender || '',
            residentStatus,
            contractNumber: contract.contractNumber,
            startDate: contract.startDate,
            endDate: contract.endDate,
            terms: contract.terms,
            signedAt: contract.signedAt,
            status: getContractStatusLabel(contract.startDate, contract.endDate, contract.status),
            servicePackageId: servicePackage._id || null,
            servicePackageName: servicePackage.name || 'N/A',
            servicePackagePrice: (() => {
              const fromPackage = Number(servicePackage?.monthlyPrice);
              if (Number.isFinite(fromPackage) && fromPackage > 0) return fromPackage;
              const fromContract = Number(contract?.monthlyFee);
              if (Number.isFinite(fromContract) && fromContract > 0) return fromContract;
              const latestSvcCost = Number(latestInvoice?.careServiceCost || 0);
              const months = Number(contract?.durationMonths || 1);
              if (latestSvcCost > 0 && months > 0) {
                return Math.round((latestSvcCost / months) * (1 - (Number(contract?.discountPercent || 0) / 100)));
              }
              return 0;
            })(),
            contractDurationMonths: contract.durationMonths || null,
            contractDiscountPercent: contract.discountPercent || null,
            latestInvoice,
            latestInvoiceStatus: latestInvoice?.status?.toString().toLowerCase?.() || null,
            latestInvoicePaymentPlan: latestInvoice?.paymentPlan || null,
            latestInvoiceRemainingAmount: Number(latestInvoice?.remainingAmount || 0),
            outstandingAmount: contract.outstandingAmount || Number(latestInvoice?.remainingAmount || 0),
            paymentPlan: contract.paymentPlan || null,
            latestInvoiceHasServiceCost: latestInvoice && ['SERVICE', 'COMBINED'].includes(latestInvoice.type)
              && Number(latestInvoice.careServiceCost || 0) > 0,
            isReleased,
            isRenewal: contract.isRenewal,
            previousContractId: contract.previousContractId,
            hasContract: true,
          });
        } else {
          // No contract — create placeholder row
          rows.push({
            id: `no-contract-${resident._id}`,
            contractId: null,
            admissionId: null,
            contractStatus: null,
            residentId: resident._id,
            residentName: resident.fullName || '',
            residentCode: resident.residentCode || '',
            residentDateOfBirth: resident.dateOfBirth || null,
            residentGender: resident.gender || '',
            residentStatus: String(resident.residencyStatus || '').toLowerCase(),
            contractNumber: null,
            startDate: null,
            endDate: null,
            terms: null,
            signedAt: null,
            status: 'no_contract',
            servicePackageId: null,
            servicePackageName: 'N/A',
            servicePackagePrice: null,
            contractDurationMonths: null,
            contractDiscountPercent: null,
            latestInvoice: null,
            latestInvoiceStatus: null,
            latestInvoicePaymentPlan: null,
            latestInvoiceRemainingAmount: null,
            outstandingAmount: null,
            paymentPlan: null,
            latestInvoiceHasServiceCost: false,
            isReleased: false,
            isRenewal: false,
            previousContractId: null,
            hasContract: false,
          });
        }
      }

      setContracts(rows);
      // Populate resident filter dropdown
      const sortedResidents = [...residentList].sort((a, b) =>
        (a.fullName || '').localeCompare(b.fullName || '')
      );
      setResidentOptions(sortedResidents);
    } catch (err) {
      setError(err.message || t('admin.contractManagement.loadContractsFailed'));
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
      if (statusFilter === 'no_contract') {
        filtered = filtered.filter((contract) => !contract.hasContract);
      } else {
        filtered = filtered.filter((contract) => {
          if (!contract.hasContract) return false;
          const status = getContractStatusLabel(contract.startDate, contract.endDate, contract.contractStatus);
          return status.toLowerCase() === statusFilter.toLowerCase();
        });
      }
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (contract) =>
          (contract.contractNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (contract.residentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (contract.residentCode || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Resident filter
    if (residentFilter !== 'all') {
      filtered = filtered.filter(
        (contract) =>
          String(contract.residentId) === String(residentFilter) ||
          contract.residentId?._id === residentFilter
      );
    }

    setFilteredContracts(filtered);
    setCurrentPage(1);
  }, [contracts, searchTerm, statusFilter, residentFilter]);

  // Fetch full contract detail (đã populate admission + servicePackage) khi mở modal chi tiết
  useEffect(() => {
    if (!showContractDetailModal || !selectedContract?.contractId) {
      return;
    }
    // Đã load cho đúng contract này rồi → bỏ qua
    if (detailContract && String(detailContract._id) === String(selectedContract.contractId)) {
      return;
    }
    setDetailLoading(true);
    contractService.getContractDetails(selectedContract.contractId)
      .then((result) => {
        // result = { contract, invoices, outstandingAmount }
        setDetailContract(result.contract || result);
      })
      .catch((err) => {
        console.error('Failed to load contract details:', err);
        showToast(resolveApiError(err) || 'Không thể tải chi tiết hợp đồng', 'error');
        setShowContractDetailModal(false);
      })
      .finally(() => setDetailLoading(false));
  }, [showContractDetailModal, selectedContract?.contractId]);

  // Fetch lịch sử hợp đồng của cùng cư dân (active + cũ) khi mở modal chi tiết.
  // Mục đích: cư dân có thể có nhiều hợp đồng (hợp đồng cũ đã chấm dứt + hợp
  // đồng mới active). Bảng chính chỉ hiển thị 1 hàng/cư dân (hợp đồng mới nhất),
  // nên admin không thấy được các hợp đồng cũ. Modal này sẽ liệt kê tất cả để
  // admin click xem lại nội dung hợp đồng cũ.
  useEffect(() => {
    if (!showContractDetailModal || !selectedContract?.residentId) {
      return;
    }
    const residentId = String(selectedContract.residentId);
    setContractHistoryLoading(true);
    contractService.getContractsByResident(residentId)
      .then((resp) => {
        const list = Array.isArray(resp?.data) ? resp.data : [];
        setContractHistory(list);
      })
      .catch((err) => {
        console.error('Failed to load contract history:', err);
        // Không đóng modal — chỉ ẩn phần lịch sử, vẫn cho xem chi tiết
        setContractHistory([]);
      })
      .finally(() => setContractHistoryLoading(false));
  }, [showContractDetailModal, selectedContract?.residentId]);

  // Handler: click vào 1 hợp đồng cũ trong sidebar lịch sử → load và hiển thị
  const handleOpenHistoryContract = async (contractSummary) => {
    const cid = contractSummary?._id;
    if (!cid) return;
    // Nếu click vào hợp đồng đang xem rồi → bỏ qua
    if (detailContract && String(detailContract._id) === String(cid)) return;
    setHistoryLoading(true);
    setHistoryContract(null);
    try {
      const result = await contractService.getContractDetails(cid);
      setHistoryContract(result.contract || result);
    } catch (err) {
      console.error('Failed to load history contract:', err);
      showToast(resolveApiError(err) || 'Không thể tải hợp đồng', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Handler: quay lại xem hợp đồng hiện tại (đóng hợp đồng cũ)
  const handleBackToCurrentContract = () => {
    setHistoryContract(null);
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
      // NEW: Use contractService.terminateContract with contractId
      const result = await contractService.terminateContract(selectedContract.contractId || selectedContract.id, {
        reason,
      });
      const bedMsg = result?.bedFreed ? t('admin.contractManagement.bedFreedNotice') : '';
      const tasksMsg = result?.tasksCancelled > 0
        ? t('admin.contractManagement.tasksCancelledNotice', { count: result.tasksCancelled })
        : '';
      const evalMsg = result?.eligibilityStatusReset
        ? t('admin.contractManagement.eligibilityResetNotice')
        : '';
      const detail = [bedMsg, tasksMsg, evalMsg].filter(Boolean).join('. ');
      const baseMsg = t('admin.contractManagement.cancelSuccess');
      const toastMsg = detail ? `${baseMsg}. ${detail}` : baseMsg;
      showToast(toastMsg, 'success');
      setShowCancelModal(false);
      setSelectedContract(null);
      setCancellationReason('');
      await fetchContracts();
    } catch (err) {
      setError(err.response?.data?.message || t('admin.contractManagement.cancelContractFailed'));
    } finally {
      setIsCancellingContract(false);
    }
  };

  // Handle create contract for resident without a contract
  const handleCreateContractForResident = async (residentRow) => {
    if (!residentRow || residentRow.hasContract) return;
    // For now, navigate to admission/contract creation page via a toast hint
    // The contract detail modal is view-only; a create flow would be a separate modal/page
    showToast(
      t('admin.contractManagement.createContractHint', { name: residentRow.residentName }),
      'info'
    );
  };

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const refreshMedicationPrescriptions = async (residentId) => {
    try {
      setMedLoading(true);
      // Load cả đơn thuốc + hóa đơn của cư dân song song để xác định đơn nào đã có hóa đơn.
      const [resp, invResp] = await Promise.all([
        medicationService.listPrescriptions({ residentId, limit: 20 }),
        paymentService.listInvoices(residentId).catch(() => []),
      ]);
      const list = Array.isArray(resp) ? resp : resp?.data || [];
      const invList = Array.isArray(invResp) ? invResp : invResp?.data || [];

      // Map prescriptionId → invoice (chỉ lấy hóa đơn thuốc chưa bị hủy để hiển thị)
      const medInvoiceByPrescription = new Map();
      for (const inv of invList) {
        const invType = String(inv?.type || '').toUpperCase();
        if (invType !== 'MEDICATION' && invType !== 'MEDICATIONS') continue;
        if (String(inv?.status || '').toLowerCase() === 'cancelled') continue;
        const pId = inv?.prescriptionId?._id || inv?.prescriptionId;
        if (!pId) continue;
        medInvoiceByPrescription.set(String(pId), inv);
      }

      // Enrich mỗi đơn thuốc với thông tin hóa đơn (nếu có)
      const enriched = list.map((p) => {
        const pid = String(p._id || p.id || '');
        const linkedInvoice = medInvoiceByPrescription.get(pid) || null;
        return {
          ...p,
          existingInvoice: linkedInvoice
            ? {
                _id: linkedInvoice._id,
                invoiceNumber: linkedInvoice.invoiceNumber,
                status: linkedInvoice.status,
                totalAmount: Number(linkedInvoice.totalAmount || linkedInvoice.total || 0),
                paidAmount: Number(linkedInvoice.paidAmount || 0),
                remainingAmount: Number(linkedInvoice.remainingAmount ?? linkedInvoice.totalAmount ?? 0),
              }
            : null,
        };
      });

      const validPrescriptions = enriched.filter(isPrescriptionInvoiceable);
      setMedPrescriptions(validPrescriptions);
      setMedError('');
    } catch (err) {
      console.error('Failed to load prescriptions for medication invoice:', err);
      setMedError(err.response?.data?.message || t('admin.contractManagement.loadPrescriptionsFailed'));
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
      setMedError(err.response?.data?.message || t('admin.contractManagement.estimateMedCostFailed'));
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
    if (!selectedContract || !medSelectedId) { showToast(t('admin.contractManagement.selectPrescription'), 'error'); return; }
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
          const message = t('admin.contractManagement.medInvoiceExists', { invNum });
          setMedConflictMessage(message);
          showToast(message, 'error');
          return;
        }
      } catch (checkErr) {
        console.warn('Không thể kiểm tra hóa đơn hiện có trước khi tạo hóa đơn thuốc:', checkErr);
      }
      const selectedPrescription = getSelectedPrescriptionDetails();
      if (!isPrescriptionInvoiceable(selectedPrescription)) {
        showToast(t('admin.contractManagement.prescriptionInvalid'), 'error');
        return;
      }
      const body = { prescriptionId: medSelectedId };
      if (medEstimatedCost != null) body.medicationCost = medEstimatedCost;
      await paymentService.createInvoice(selectedContract.residentId, body);
      showToast(t('admin.contractManagement.invoiceCreatedSuccess'), 'success');
      setShowMedicationModal(false);
      setSelectedContract(null);
      await fetchContracts();
    } catch (err) {
      console.error('Error creating medication invoice:', err);
      showToast(resolveApiError(err, t, 'admin.contractManagement.invoiceCreatedError'), 'error');
    } finally {
      setMedCreatingInvoice(false);
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
      setExtensionPackageError(err.response?.data?.message || t('admin.contractManagement.loadPackagesFailed'));
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
    });

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
      showToast(t('admin.contractManagement.enterDateInfo'), 'error');
      return;
    }
    if (!extensionData.selectedNewPackageId) {
      showToast(t('admin.contractManagement.selectNewPackage'), 'error');
      return;
    }

    const startDate = new Date(extensionData.contractStartDate);
    const endDate = new Date(extensionData.newEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate start date is not in the past
    if (startDate < today) {
      showToast(t('admin.contractManagement.contractStartPast'), 'error');
      return;
    }

    if (endDate <= startDate) {
      showToast(t('admin.contractManagement.endDateAfterStart'), 'error');
      return;
    }

    // Calculate contract length
    let monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12;
    monthsDiff += endDate.getMonth() - startDate.getMonth();
    if (monthsDiff <= 0) {
      showToast(t('admin.contractManagement.extendMinOneMonth'), 'error');
      return;
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

      const contractId = selectedContract.contractId || selectedContract.id;

      // Extend the existing contract (1-to-1: update, not create new)
      const renewResult = await contractService.renewContract(contractId, {
        startDate: contractStartDate,
        endDate: contractEndDate.split('T')[0],
        servicePackageId: extensionData.selectedNewPackageId,
        durationMonths: monthsDiff,
        discountPercent,
      });

      const discountText = discountPercent > 0 ? t('admin.contractManagement.discountTextFormat', { percent: discountPercent }) : '';
      showToast(t('admin.contractManagement.extendSuccessToast', { cost: finalServiceCost.toLocaleString('vi-VN'), discount: discountText }), 'success');

      setShowExtensionModal(false);
      setSelectedContract(null);
      await fetchContracts();
    } catch (err) {
      console.error('Error extending contract:', err);
      showToast(resolveApiError(err, t, 'admin.contractManagement.extendFailed') || t('admin.contractManagement.extendErrorFallback', { message: err.message || 'Unknown error' }), 'error');
    } finally {
      setIsExtendingContract(false);
    }
  };

  const fetchContractInvoices = async (contract) => {
    if (!contract) {
      setContractInvoices([]);
      return;
    }
    setContractInvoicesLoading(true);
    try {
      const residentId = contract.residentId;
      const contractId = contract.contractId || contract.id;
      if (!residentId) {
        setContractInvoices([]);
        return;
      }
      const resp = await paymentService.listInvoices(residentId);
      const allInvoices = Array.isArray(resp) ? resp : resp?.data || [];
      const filtered = allInvoices.filter((inv) => {
        if (!inv) return false;
        if (inv.contractId && contractId && String(inv.contractId) === String(contractId)) {
          return true;
        }
        // Fallback: nếu invoice không có contractId, vẫn hiển thị (invoice cũ trước khi liên kết contract)
        if (!inv.contractId) {
          return true;
        }
        return false;
      });
      // Sắp xếp: mới nhất trước
      filtered.sort((a, b) => {
        const da = new Date(a.createdAt || a.issuedAt || 0).getTime();
        const db = new Date(b.createdAt || b.issuedAt || 0).getTime();
        return db - da;
      });
      setContractInvoices(filtered);
    } catch (err) {
      console.error('Failed to load contract invoices:', err);
      setContractInvoices([]);
    } finally {
      setContractInvoicesLoading(false);
    }
  };

  const handleRecalculateInvoices = async (contract) => {
    if (!contract) return;
    setRecalculatingInvoices(true);
    try {
      const result = await contractService.recalculateContractInvoices(contract.contractId || contract.id);
      showToast(result?.message || 'Đã tính lại giá hóa đơn.', 'success');
      await fetchContractInvoices(contract);
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể tính lại giá hóa đơn.', 'error');
    } finally {
      setRecalculatingInvoices(false);
    }
  };

  // Xuất hóa đơn ra HTML có thể in / lưu PDF
  const handleExportInvoice = async (inv) => {
    const invoiceId = inv?._id || inv?.id || inv?.invoiceNumber;
    if (!invoiceId) return;
    setExportingInvoiceId(invoiceId);
    try {
      // Nếu hóa đơn đang ở DRAFT → tự động chuyển sang ISSUED trước khi xuất
      // (xuất = gửi cho family xem và thanh toán)
      const currentStatus = String(inv?.status || '').toUpperCase();
      if (currentStatus === 'DRAFT') {
        console.log('🔄 [EXPORT] DRAFT invoice → auto transition to ISSUED', { invoiceId });
        try {
          const transitionResult = await contractService.transitionInvoice(invoiceId, { status: 'ISSUED' });
          console.log('🔄 [EXPORT] transition result', transitionResult);
        } catch (transErr) {
          console.error('🔄 [EXPORT] transition failed, export aborted', transErr);
          showToast(
            transErr?.response?.data?.message ||
            transErr?.message ||
            'Không thể chuyển trạng thái hóa đơn từ Nháp sang Đã xuất.',
            'error'
          );
          return;
        }
      }

      const { blob, filename } = await contractService.exportInvoice(invoiceId);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      // Nếu popup bị chặn, fallback tải về
      if (!win) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `invoice-${invoiceId}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      // Giải phóng URL sau khi tab mới đã load
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      // Tải lại danh sách để cập nhật badge trạng thái mới
      if (selectedContract) {
        await fetchContractInvoices(selectedContract);
      }
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
        err?.message ||
        t('admin.contractManagement.exportInvoiceError') ||
        'Không thể xuất hóa đơn.',
        'error'
      );
    } finally {
      setExportingInvoiceId(null);
    }
  };

  // Mở modal sửa giá hóa đơn DRAFT
  const openEditInvoiceModal = (inv) => {
    const periodStart = inv.billingPeriodStart || inv.periodStart;
    let startStr = '';
    if (periodStart) {
      const d = new Date(periodStart);
      if (!Number.isNaN(d.getTime())) {
        startStr = d.toISOString().slice(0, 10);
      }
    }
    setEditingInvoice(inv);
    setEditInvoiceForm({
      careServiceCost: Number(inv.careServiceCost || 0),
      billingPeriodStart: startStr,
      reason: '',
    });
  };

  const closeEditInvoiceModal = () => {
    if (savingInvoice) return;
    setEditingInvoice(null);
  };

  // Tính tổng preview trong form sửa
  const editPreviewTotal = (() => {
    const c = Number(editInvoiceForm.careServiceCost || 0);
    const items = Array.isArray(editingInvoice?.items) ? editingInvoice.items : [];
    const tax = Number(editingInvoice?.tax || 0);
    const itemsSum = items.length > 0
      ? items.reduce((s, it) => s + Number(it.amount || 0), 0)
      : 0;
    const subTotal = itemsSum > 0 ? itemsSum : c;
    return {
      subTotal,
      total: subTotal + tax,
    };
  })();

  const openCancelInvoiceDialog = (inv) => {
    setPendingCancelInvoice(inv);
    setCancelInvoiceReason('');
  };

  const closeCancelInvoiceDialog = () => {
    if (cancellingInvoice) return;
    setPendingCancelInvoice(null);
  };

  const confirmCancelInvoice = async () => {
    if (!pendingCancelInvoice) return;
    const invoiceId = pendingCancelInvoice._id || pendingCancelInvoice.id;
    const invoiceLabel = pendingCancelInvoice.invoiceNumber || `#${invoiceId}`;
    setCancellingInvoice(true);
    try {
      const result = await contractService.cancelInvoice(invoiceId, {
        reason: cancelInvoiceReason || '',
      });
      showToast(
        result?.message || t('admin.contractManagement.cancelInvoiceSuccess') || `Đã dừng hóa đơn ${invoiceLabel}.`,
        'success'
      );
      setPendingCancelInvoice(null);
      if (selectedContract) {
        await fetchContractInvoices(selectedContract);
      }
      await fetchContracts();
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        t('admin.contractManagement.cancelInvoiceError') ||
        'Không thể dừng hóa đơn.';
      setCancelInvoiceError({ title: 'Dừng hóa đơn thất bại', message: errorMsg });
    } finally {
      setCancellingInvoice(false);
    }
  };

  const handleUpdateInvoice = async () => {
    if (!editingInvoice) return;
    const invoiceId = editingInvoice._id || editingInvoice.id;
    setSavingInvoice(true);
    try {
      const payload = {};
      if (editInvoiceForm.careServiceCost !== '' && editInvoiceForm.careServiceCost !== null) {
        payload.careServiceCost = Number(editInvoiceForm.careServiceCost || 0);
      }
      if (editInvoiceForm.billingPeriodStart) {
        payload.billingPeriodStart = editInvoiceForm.billingPeriodStart;
      }
      payload.reason = editInvoiceForm.reason || '';

      const result = await contractService.updateInvoice(invoiceId, payload);
      showToast(
        result?.message || t('admin.contractManagement.editInvoiceSuccess') || 'Đã cập nhật hóa đơn.',
        'success'
      );
      setEditingInvoice(null);
      if (selectedContract) {
        await fetchContractInvoices(selectedContract);
      }
      await fetchContracts();
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
        err?.message ||
        t('admin.contractManagement.editInvoiceError') ||
        'Không thể cập nhật hóa đơn.',
        'error'
      );
    } finally {
      setSavingInvoice(false);
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
            <option value="cancelled">{t('admin.contractManagement.statusCancelled')}</option>
            <option value="no_contract">{t('admin.contractManagement.statusNoContract') || 'Chưa có hợp đồng'}</option>
          </select>
        </div>

        <div className="filter-group">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={residentFilter}
            onChange={(e) => setResidentFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t('admin.contractManagement.allResidents') ?? 'Tất cả cư dân'}</option>
            {residentOptions
              .filter(r => r._id !== 'all')
              .map((r) => (
              <option key={r._id} value={r._id}>
                {r.fullName || r.residentCode || r._id}
              </option>
            ))}
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
                  <th>{t('admin.contractManagement.colStatus')}</th>
                  <th>{t('admin.contractManagement.colSignedDate')}</th>
                  <th>{t('admin.contractManagement.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="font-semibold">
                      {contract.hasContract ? contract.contractNumber : '—'}
                    </td>
                    <td>
                      {(() => {
                        const { displayName, subtitle } = formatResidentDisplay(contract);
                        return (
                          <div className="contract-resident-cell">
                            <div
                              className="contract-resident-cell__avatar"
                              style={{ background: getAvatarColor(displayName) }}
                              aria-hidden="true"
                            >
                              {getInitials(displayName)}
                            </div>
                            <div className="contract-resident-cell__info">
                              <div className="contract-resident-cell__name">{displayName}</div>
                              {subtitle && <div className="contract-resident-cell__subtitle">{subtitle}</div>}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td>{contract.hasContract ? formatDate(contract.startDate) : '—'}</td>
                    <td>{contract.hasContract ? formatDate(contract.endDate) : '—'}</td>
                    <td>
                      {!contract.hasContract ? (
                        <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          {t('admin.contractManagement.noContract') || 'Chưa có hợp đồng'}
                        </div>
                      ) : (
                        <div className={`status-badge ${getContractStatusClass(contract.startDate, contract.endDate, contract.contractStatus)}`}>
                          <div className="flex items-center gap-2">
                            {getContractStatusIcon(contract.startDate, contract.endDate, contract.contractStatus)}
                            <span>{getStatusTranslation(getContractStatusLabel(contract.startDate, contract.endDate, contract.contractStatus), t)}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td>{contract.hasContract ? formatDate(contract.signedAt) : '—'}</td>
                    <td>
                      <div className="flex gap-2">
                        {!contract.hasContract ? (
                          <button
                            className="btn-icon-primary"
                            title={t('admin.contractManagement.createContract') || 'Tạo hợp đồng'}
                            onClick={() => handleCreateContractForResident(contract)}
                            style={{ background: '#0f766e', color: 'white' }}
                          >
                            📝
                          </button>
                        ) : (
                          <>
                            <button className="btn-icon-primary" title={t('admin.contractManagement.viewDetails')} onClick={() => {
                              setSelectedContract(contract);
                              setDetailContract(null);
                              setShowContractDetailModal(true);
                            }}>
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="btn-icon-secondary"
                              title={t('admin.contractManagement.viewInvoicesTitle') || 'Xem hóa đơn'}
                              onClick={() => {
                                setSelectedContract(contract);
                                setShowContractInvoicesModal(true);
                                fetchContractInvoices(contract);
                              }}
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            {!contract.isReleased && contract.contractStatus !== 'cancelled' && (
                              <button
                                className="btn-icon-secondary"
                                title={t('admin.contractManagement.createMedInvoiceTitle')}
                                onClick={() => openMedicationInvoiceModal(contract)}
                              >
                                🩺
                              </button>
                            )}
                            {!contract.isReleased && contract.contractStatus !== 'cancelled' && (
                              <button
                                  className="btn-icon-secondary"
                                  title={t('admin.contractManagement.cancelContractTitle')}
                                  onClick={() => openCancelContractModal(contract)}
                                  style={{ color: '#dc2626' }}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                            )}
                            {contract.isReleased && (
                              <button
                                className="btn-icon-primary"
                                title={t('admin.contractManagement.renewContractTitle')}
                                onClick={() => handleOpenExtensionModal(contract)}
                                style={{ background: '#f59e0b', color: 'white' }}
                              >
                                ↻
                              </button>
                            )}
                            {!contract.isReleased && isOverdueReleaseEligible(contract) && (
                              <button
                                className="btn-icon-secondary"
                                title={t('admin.contractManagement.releaseRoomTitle')}
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
                                title={t('admin.contractManagement.extendContractTitle')}
                                onClick={() => handleOpenExtensionModal(contract)}
                                style={{ background: '#0f766e', color: 'white' }}
                              >
                                ↻
                              </button>
                            )}
                          </>
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

      {/* Medication Invoice Modal */}
      {showMedicationModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px', width: '95vw' }}>
            <div className="modal-header">
              <h2>{t('admin.contractManagement.createMedInvoiceTitle')}</h2>
              <div className="flex gap-2">
                <button
                  className="btn-icon-secondary"
                  title={t('admin.contractManagement.refreshPrescriptions')}
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
                <div>{t('admin.contractManagement.loadingPrescriptions')}</div>
              ) : medError ? (
                <div className="alert alert-error">{medError}</div>
              ) : (
                <>
                  <div className="form-group">
                    <label>{t('admin.contractManagement.selectPrescriptionLabel')}</label>
                    <select
                      value={medSelectedId || ''}
                      onChange={(e) => {
                        setMedSelectedId(e.target.value);
                        estimateMedCost(e.target.value);
                      }}
                      className="form-select"
                    >
                      <option value="">{t('admin.contractManagement.choosePlaceholder')}</option>
                      {medPrescriptions.map((p) => {
                        const dateText = p.prescriptionDate ? formatDate(p.prescriptionDate) : '---';
                        const doctorText = p.doctorId?.fullName || t('admin.contractManagement.defaultDoctor');
                        // Hiển thị trạng thái hóa đơn ngay trong option (nếu có)
                        const inv = p.existingInvoice;
                        let invBadge = '';
                        if (inv) {
                          const invStatus = String(inv.status || '').toUpperCase();
                          const invStatusText = invStatus === 'PAID'
                            ? t('admin.contractManagement.invoiceStatusPaid')
                            : invStatus === 'PARTIALLY_PAID'
                              ? t('admin.contractManagement.invoiceStatusPartiallyPaid')
                              : t('admin.contractManagement.invoiceStatusUnpaid');
                          invBadge = ` — ${invStatusText} (${inv.invoiceNumber || inv._id})`;
                        } else {
                          invBadge = ` — ${t('admin.contractManagement.noInvoice') || 'Chưa có hóa đơn'}`;
                        }
                        return (
                          <option key={p._id || p.id} value={p._id || p.id}>
                            {`${dateText} — ${doctorText}${invBadge}`}
                          </option>
                        );
                      })}
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
                            <strong>{t('admin.contractManagement.warningLabel')}</strong> {t('admin.contractManagement.prescriptionExpiredMsg', { date: formatDate(selectedPrx.validUntil) })}
                          </div>
                        )}

                        {/* Existing Invoice Alert — hiển thị rõ khi đơn này đã có hóa đơn */}
                        {selectedPrx.existingInvoice && (() => {
                          const linkedInv = selectedPrx.existingInvoice;
                          const linkedStatus = String(linkedInv.status || '').toUpperCase();
                          const isPaid = linkedStatus === 'PAID';
                          const isCancelled = linkedStatus === 'CANCELLED';
                          const bg = isPaid ? '#dcfce7' : isCancelled ? '#e2e8f0' : '#fef3c7';
                          const border = isPaid ? '#16a34a' : isCancelled ? '#64748b' : '#d97706';
                          const icon = isPaid ? '✓' : isCancelled ? '⊘' : '⚠';
                          const statusText = isPaid
                            ? t('admin.contractManagement.invoiceStatusPaid')
                            : linkedStatus === 'PARTIALLY_PAID'
                              ? t('admin.contractManagement.invoiceStatusPartiallyPaid')
                              : t('admin.contractManagement.invoiceStatusUnpaid');
                          return (
                            <div
                              style={{
                                marginBottom: '16px',
                                padding: '12px 16px',
                                background: bg,
                                border: `1px solid ${border}`,
                                borderRadius: '6px',
                                fontSize: '14px',
                                color: '#0f172a',
                              }}
                            >
                              <strong>{icon} {t('admin.contractManagement.medInvoiceExistsLabel') || 'Đơn thuốc này đã có hóa đơn'}:</strong>{' '}
                              <span style={{ fontWeight: 600 }}>{linkedInv.invoiceNumber || linkedInv._id}</span>
                              {' — '}
                              <span>{statusText}</span>
                              {Number(linkedInv.totalAmount) > 0 && (
                                <span style={{ marginLeft: 8, color: '#475569' }}>
                                  ({Number(linkedInv.totalAmount).toLocaleString('vi-VN')}₫)
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Prescription Status and Payment Info */}
                        <div className="form-group">
                          <label>{t('admin.contractManagement.prescriptionInfoLabel')}</label>
                          <div style={{ background: '#f3f4f6', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
                            <div style={{ marginBottom: '8px' }}>
                              <strong>{t('admin.contractManagement.statusLabel')}</strong> {' '}
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: isExpired ? '#fee2e2' : '#dcfce7',
                                color: isExpired ? '#991b1b' : '#166534',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}>
                                {isExpired ? t('admin.contractManagement.prescriptionExpiredStatus') : t('admin.contractManagement.prescriptionValidStatus')}
                              </span>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                              <strong>{t('admin.contractManagement.expiresLabel')}</strong> {selectedPrx.validUntil ? formatDate(selectedPrx.validUntil) : '—'}
                            </div>
                            <div>
                              <strong>{t('admin.contractManagement.paymentStatusLabel')}</strong> {' '}
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: paymentStatus === 'paid' ? '#dcfce7' : paymentStatus === 'partially_paid' ? '#fef3c7' : '#fecaca',
                                color: paymentStatus === 'paid' ? '#166534' : paymentStatus === 'partially_paid' ? '#92400e' : '#991b1b',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}>
                                {paymentStatus === 'paid' ? t('admin.contractManagement.invoiceStatusPaid') : paymentStatus === 'partially_paid' ? t('admin.contractManagement.invoiceStatusPartiallyPaid') : t('admin.contractManagement.invoiceStatusUnpaid')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>{t('admin.contractManagement.prescriptionDetailsLabel')}</label>
                          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
                            {selectedPrx.items?.length ? (
                              <>
                                <div style={{ marginBottom: '12px' }}>
                                  <strong>{t('admin.contractManagement.fromDateLabel')}</strong>{' '}
                                  {selectedPrx.items
                                    .filter((it) => it.startDate)
                                    .map((it) => it.startDate)
                                    .sort()[0]
                                    ? formatDate(selectedPrx.items
                                        .filter((it) => it.startDate)
                                        .map((it) => it.startDate)
                                        .sort()[0])
                                    : '—'}
                                  {' '}<strong>{t('admin.contractManagement.toDateLabel')}</strong>{' '}
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

                                {/* Bảng chi tiết thuốc */}
                                <div style={{ marginBottom: 8 }}>
                                  <strong style={{ fontSize: '0.88rem', color: '#475569' }}>
                                     Chi tiết từng thuốc:
                                  </strong>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: '13px',
                                    marginBottom: 12,
                                  }}>
                                    <thead>
                                      <tr style={{ background: '#e2e8f0' }}>
                                        <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: '#475569', width: 40 }}>STT</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Tên thuốc</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: '#475569', width: 50 }}>ĐVT</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: '#475569', width: 50 }}>SL</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Đơn giá</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Thành tiền chưa thuế</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Thuế suất</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Tiền thuế</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Thành tiền</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {selectedPrx.items.map((item, idx) => {
                                        const price = Number(item.price) || 0;
                                        const quantity = Number(item.quantity) || 0;
                                        const taxRate = Number(item.taxRate) || 0.05;
                                        const beforeTax = price * quantity;
                                        const taxAmt = Math.round(beforeTax * taxRate * 100) / 100;
                                        const subtotal = beforeTax + taxAmt;
                                        return (
                                          <tr key={item._id || item.medicationId || item.medicationName} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                                            <td style={{ padding: '8px 6px' }}>
                                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.medicationName || 'N/A'}</div>
                                              <div style={{ fontSize: 11, color: '#64748b' }}>{item.dosage || ''} {item.unit || ''} • {item.frequency ? `${item.frequency}×/ngày` : ''}</div>
                                            </td>
                                            <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b' }}>{item.unit || 'viên'}</td>
                                            <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600 }}>{quantity}</td>
                                            <td style={{ padding: '8px 6px', textAlign: 'right', color: '#1e40af' }}>
                                              {price > 0 ? formatVnd(price) : '—'}
                                            </td>
                                            <td style={{ padding: '8px 6px', textAlign: 'right', color: '#64748b' }}>
                                              {beforeTax > 0 ? formatVnd(beforeTax) : '—'}
                                            </td>
                                            <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b' }}>
                                              {(taxRate * 100).toFixed(0)}%
                                            </td>
                                            <td style={{ padding: '8px 6px', textAlign: 'right', color: '#64748b' }}>
                                              {taxAmt > 0 ? formatVnd(taxAmt) : '—'}
                                            </td>
                                            <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                              {subtotal > 0 ? formatVnd(subtotal) : '—'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr style={{ background: '#f1f5f9' }}>
                                        <td colSpan={8} style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                                          Tổng cộng:
                                        </td>
                                        <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem', color: '#2563eb' }}>
                                          {medEstimatedCost != null ? formatVnd(medEstimatedCost) : '—'}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </>
                            ) : (
                              <div>{t('admin.contractManagement.noPrescriptionDetails')}</div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}

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
                disabled={
                  medCreatingInvoice
                  || !medSelectedId
                  || Boolean(medConflictMessage)
                  || Boolean(getSelectedPrescriptionDetails()?.existingInvoice)
                }
              >
                {medCreatingInvoice ? t('admin.contractManagement.creatingInvoice') : t('admin.contractManagement.createInvoiceButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('admin.contractManagement.cancelContractModalTitle')}</h2>
              <button className="modal-close" onClick={() => setShowCancelModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <p className="form-note" style={{ marginBottom: '16px' }}>
                {t('admin.contractManagement.cancelContractConfirm', { number: selectedContract?.contractNumber })}
              </p>
              <div className="form-group">
                <label>{t('admin.contractManagement.cancellationReasonLabel')}</label>
                <textarea
                  className="form-input"
                  rows="4"
                  value={cancellationReason}
                  onChange={(event) => setCancellationReason(event.target.value)}
                  placeholder={t('admin.contractManagement.cancellationReasonPlaceholder')}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCancelModal(false)}>{t('admin.contractManagement.closeButton')}</button>
              <button className="btn-submit" style={{ background: '#dc2626' }} onClick={handleCancelContract} disabled={isCancellingContract || !cancellationReason.trim()}>
                {isCancellingContract ? t('admin.contractManagement.cancellingButton') : t('admin.contractManagement.confirmCancelButton')}
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
              <h2>{t('admin.contractManagement.extendContractModalTitle')}</h2>
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

                  {/* Service Package Selection */}
                  <div className="form-group">
                    <label>{t('admin.contractManagement.servicePackageRequired')}</label>
                    {extensionPackageLoading ? (
                      <div className="form-input" style={{ color: '#999' }}>{t('admin.contractManagement.loadingLabel')}</div>
                    ) : extensionPackageError ? (
                      <div style={{ color: '#dc2626', fontSize: '14px' }}>{extensionPackageError}</div>
                    ) : (
                      <select
                        value={extensionData.selectedNewPackageId}
                        onChange={(e) => {
                          setExtensionData({ ...extensionData, selectedNewPackageId: e.target.value });
                        }}
                        className="form-input"
                      >
                        <option value="">{t('admin.contractManagement.choosePackagePlaceholder')}</option>
                        {extensionAvailablePackages.map((pkg) => (
                          <option key={pkg._id} value={pkg._id}>
                            {pkg.name} - {pkg.monthlyPrice.toLocaleString('vi-VN')} {t('admin.contractManagement.vndPerMonth')}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('admin.contractManagement.currentEndDateLabel')}</label>
                      <input
                        type="date"
                        value={new Date(selectedContract.endDate).toISOString().split('T')[0]}
                        disabled
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('admin.contractManagement.newContractStartDate')}</label>
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
                      <label>{t('admin.contractManagement.newEndDateLabel')}</label>
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
                            {t('admin.contractManagement.monthsLabel', { count: months })}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>{t('admin.contractManagement.discountPercentLabel')}</label>
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
                      <label>{t('admin.contractManagement.extensionCostLabel')}</label>
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
                            
                            return t('admin.contractManagement.extensionCostBreakdown', { months: monthsDiff, price: packagePrice.toLocaleString('vi-VN'), total: baseServiceCost.toLocaleString('vi-VN') });
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
                {isExtendingContract ? t('admin.contractManagement.processingButton') : t('admin.contractManagement.extendButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContractDetailModal && (
        detailLoading ? (
          <div className="modal-overlay">
            <div className="modal-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
              <div className="spinner" />
            </div>
          </div>
        ) : (
          (() => {
            // Nếu đang xem 1 hợp đồng cũ (do click từ sidebar lịch sử),
            // dùng historyContract thay cho detailContract.
            const displayedContract = historyContract || detailContract;
            return (
              <div className="modal-overlay">
                <div
                  className="modal-content"
                  style={{
                    maxWidth: '1100px',
                    width: '95vw',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '90vh',
                  }}
                >
                  <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <h2>
                        {historyContract
                          ? `Hợp đồng cũ — ${historyContract.contractNumber || ''}`
                          : 'Chi tiết hợp đồng'}
                      </h2>
                      {historyContract && (
                        <button
                          type="button"
                          onClick={handleBackToCurrentContract}
                          style={{
                            background: '#e0f2fe',
                            color: '#075985',
                            border: 'none',
                            borderRadius: 4,
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ← Quay lại hợp đồng hiện tại
                        </button>
                      )}
                    </div>
                    <button
                      className="modal-close"
                      onClick={() => {
                        setShowContractDetailModal(false);
                        setDetailContract(null);
                        setHistoryContract(null);
                      }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(260px, 320px) 1fr',
                      gap: 16,
                      padding: '12px 16px',
                      overflow: 'hidden',
                      flex: 1,
                      minHeight: 0,
                    }}
                  >
                    {/* Sidebar: Lịch sử hợp đồng của cư dân */}
                    <aside
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: 12,
                        overflowY: 'auto',
                        maxHeight: 'calc(90vh - 110px)',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: '#0f172a',
                          marginBottom: 8,
                        }}
                      >
                        Lịch sử hợp đồng
                        {contractHistory.length > 0 && (
                          <span
                            style={{
                              background: '#e0f2fe',
                              color: '#075985',
                              padding: '1px 8px',
                              borderRadius: 999,
                              fontSize: '0.72rem',
                              fontWeight: 600,
                            }}
                          >
                            {contractHistory.length}
                          </span>
                        )}
                      </div>

                      {contractHistoryLoading ? (
                        <div
                          style={{
                            padding: 16,
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '0.85rem',
                          }}
                        >
                          Đang tải…
                        </div>
                      ) : contractHistory.length === 0 ? (
                        <div
                          style={{
                            padding: 16,
                            textAlign: 'center',
                            color: '#94a3b8',
                            fontSize: '0.85rem',
                            fontStyle: 'italic',
                          }}
                        >
                          Chưa có hợp đồng nào
                        </div>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {contractHistory.map((c) => {
                            const cId = String(c._id);
                            const isActiveView = !historyContract
                              ? String(detailContract?._id) === cId
                              : String(historyContract._id) === cId;
                            const statusKey = getContractStatusLabel(c.startDate, c.endDate, c.status);
                            const statusText = getStatusTranslation(statusKey, t);
                            return (
                              <li key={cId}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenHistoryContract(c)}
                                  disabled={historyLoading}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    background: isActiveView ? '#dbeafe' : 'white',
                                    border: isActiveView ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                    borderRadius: 6,
                                    padding: '8px 10px',
                                    cursor: isActiveView ? 'default' : 'pointer',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: 6,
                                      marginBottom: 4,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        fontSize: '0.82rem',
                                        color: '#0f172a',
                                      }}
                                    >
                                      {c.contractNumber || '—'}
                                    </span>
                                    <span
                                      className={`status-badge ${getContractStatusClass(c.startDate, c.endDate, c.status)}`}
                                      style={{ fontSize: '0.65rem', padding: '1px 6px' }}
                                    >
                                      {statusText}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                    {formatDate(c.startDate)} → {formatDate(c.endDate)}
                                  </div>
                                  {c.servicePackageId && typeof c.servicePackageId === 'object' && c.servicePackageId.name && (
                                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>
                                      {c.servicePackageId.name}
                                    </div>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </aside>

                    {/* Nội dung chính: chi tiết hợp đồng */}
                    <div style={{ overflow: 'auto', minHeight: 0 }}>
                      {historyLoading ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 320,
                          }}
                        >
                          <div className="spinner" />
                        </div>
                      ) : (
                        <ContractPreviewModal
                          open={true}
                          embedded
                          onClose={() => {
                            setShowContractDetailModal(false);
                            setDetailContract(null);
                            setHistoryContract(null);
                          }}
                          contract={displayedContract}
                          terms={displayedContract?.terms || selectedContract?.terms || ''}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        )
      )}

      {/* Contract Invoices Modal - popup riêng */}
      {showContractInvoicesModal && selectedContract && (
        <div className="modal-overlay" onClick={() => {
          setShowContractInvoicesModal(false);
          setContractInvoices([]);
        }}>
          <div
            className="modal-content"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 1320, width: '98%' }}
          >
            <div className="modal-header">
              <h2>
                {t('admin.contractManagement.contractInvoicesModalTitle') || 'Hóa đơn của hợp đồng'}
                {' - '}
                {selectedContract.contractNumber || '—'}
              </h2>
              <button className="modal-close" onClick={() => {
                setShowContractInvoicesModal(false);
                setContractInvoices([]);
              }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>{t('admin.contractManagement.residentLabel')}</label>
                  <div className="form-input readonly">{selectedContract.residentName || '-'}</div>
                </div>
                <div className="form-group">
                  <label>{t('admin.contractManagement.invoiceCountLabel') || 'Số hóa đơn'}</label>
                  <div className="form-input readonly">{contractInvoices.length}</div>
                </div>
                <div className="form-group">
                  <label>{t('admin.contractManagement.paymentPlanLabel') || 'Phương án thanh toán đã chọn'}</label>
                  <div className="form-input readonly" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(() => {
                      const planKey = String(selectedContract.paymentPlan || '').toUpperCase();
                      if (planKey === 'FULL') {
                        return (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: 999,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            background: '#ecfdf5',
                            color: '#047857',
                          }}>
                            {t('admin.contractManagement.paymentPlanFull') || 'Thanh toán tất cả'}
                          </span>
                        );
                      }
                      if (planKey === 'HALF_NOW') {
                        return (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: 999,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                          }}>
                            {t('admin.contractManagement.paymentPlanHalf') || 'Thanh toán 50%'}
                          </span>
                        );
                      }
                      if (planKey === 'MONTHLY') {
                        return (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: 999,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            background: '#fef3c7',
                            color: '#b45309',
                          }}>
                            {t('admin.contractManagement.paymentPlanMonthly') || 'Thanh toán theo tháng'}
                          </span>
                        );
                      }
                      return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>;
                    })()}
                  </div>
                </div>
              </div>
              {selectedContract.outstandingAmount > 0 && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#fee2e2',
                  color: '#b91c1c',
                  fontWeight: 600,
                  marginBottom: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>{t('admin.contractManagement.outstandingAmountLabel') || 'Tổng còn phải thu'}</span>
                  <span>{selectedContract.outstandingAmount.toLocaleString('vi-VN')} VND</span>
                </div>
              )}
              <div className="form-group">
                <div style={{ overflowX: 'auto' }}>
                  {contractInvoicesLoading ? (
                    <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
                      <div className="spinner" style={{ width: 16, height: 16 }} />
                      <span>{t('admin.contractManagement.loadingInvoices') || 'Đang tải hóa đơn...'}</span>
                    </div>
                  ) : contractInvoices.length === 0 ? (
                    <div style={{ padding: 16, color: '#64748b', fontStyle: 'italic' }}>
                      {t('admin.contractManagement.noInvoiceSimple') || 'Chưa có hóa đơn nào.'}
                    </div>
                  ) : (
                    <>
                      {contractInvoices.some((inv) => Number(inv.totalAmount || inv.total || 0) === 0) && (
                        <div style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: '#fff7ed',
                          border: '1px solid #fed7aa',
                          color: '#9a3412',
                          marginBottom: 10,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}>
                          <span style={{ fontSize: '0.92rem' }}>
                            {t('admin.contractManagement.recalculateInvoicesHint')
                              || 'Một số hóa đơn đang có đơn giá = 0 (do dữ liệu cũ). Bấm "Tính lại" để cập nhật theo monthlyFee hiện tại.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRecalculateInvoices(selectedContract)}
                            disabled={recalculatingInvoices}
                            style={{
                              padding: '6px 14px',
                              borderRadius: 6,
                              border: 'none',
                              background: '#ea580c',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '0.88rem',
                              cursor: recalculatingInvoices ? 'not-allowed' : 'pointer',
                              opacity: recalculatingInvoices ? 0.7 : 1,
                            }}
                          >
                            {recalculatingInvoices
                              ? (t('admin.contractManagement.recalculating') || 'Đang tính lại...')
                              : (t('admin.contractManagement.recalculateInvoicesBtn') || 'Tính lại đơn giá')}
                          </button>
                        </div>
                      )}
                      <div className="contract-invoices-table-wrapper" style={{ maxHeight: 500, overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                      <table
                        className="contract-invoices-table"
                        style={{
                          width: '100%',
                          minWidth: 1240,
                          borderCollapse: 'collapse',
                          fontSize: '0.92rem',
                          tableLayout: 'auto',
                        }}
                      >
                        <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', color: '#0f172a', zIndex: 1 }}>
                          <tr>
                            <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 150, color: '#0f172a' }}>
                              {t('admin.contractManagement.colInvoiceNumber') || 'Số hóa đơn'}
                            </th>
                            <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 110, color: '#0f172a' }}>
                              {t('admin.contractManagement.colInvoiceType') || 'Loại'}
                            </th>
                            <th style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '2px solid #e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 130, color: '#0f172a' }}>
                              {t('admin.contractManagement.colInvoiceTotal') || 'Tổng tiền'}
                            </th>
                            <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 120, color: '#0f172a' }}>
                              {t('admin.contractManagement.colInvoicePeriodStart') || 'Ngày bắt đầu'}
                            </th>
                            <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 120, color: '#0f172a' }}>
                              {t('admin.contractManagement.colInvoiceDueDate') || 'Ngày hết hạn'}
                            </th>
                            <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 110, color: '#0f172a' }}>
                              {t('admin.contractManagement.colInvoiceActions') || 'Thao tác'}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {contractInvoices.map((inv) => {
                            const statusKey = String(inv.status || '').toLowerCase();
                            const totalAmount = Number(inv.totalAmount || inv.total || 0);
                            const remainingAmount = Number(inv.remainingAmount || 0);
                            const isZeroAmount = totalAmount === 0;
                            const isPaid = statusKey === 'paid' || remainingAmount <= 0;
                            // Ưu tiên dueDate; fallback sang billingPeriodEnd / periodEnd nếu chưa set dueDate
                            const dueDateRaw = inv.dueDate || inv.billingPeriodEnd || inv.periodEnd;
                            // Ngày bắt đầu kỳ: billingPeriodStart / periodStart (nếu backend đặt tên khác)
                            const periodStartRaw = inv.billingPeriodStart || inv.periodStart || null;
                            const dueDateObj = dueDateRaw ? new Date(dueDateRaw) : null;
                            const isOverdue = !isPaid && dueDateObj && !isNaN(dueDateObj.getTime())
                              && dueDateObj.getTime() < new Date(new Date().toDateString()).getTime();
                            const typeLabel = (() => {
                              const typeKey = String(inv.type || '').toUpperCase();
                              if (typeKey === 'SERVICE') return t('admin.contractManagement.invoiceTypeService') || 'Dịch vụ';
                              if (typeKey === 'MEDICATION' || typeKey === 'MEDICATIONS') return t('admin.contractManagement.invoiceTypeMedication') || 'Thuốc';
                              if (typeKey === 'COMBINED') return t('admin.contractManagement.invoiceTypeCombined') || 'Kết hợp';
                              return inv.type || '—';
                            })();
                            return (
                              <tr key={inv._id || inv.invoiceNumber}>
                                <td style={{
                                  padding: '12px 14px',
                                  borderBottom: '1px solid #f1f5f9',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  color: inv.invoiceNumber ? '#0f172a' : '#94a3b8',
                                  fontStyle: inv.invoiceNumber ? 'normal' : 'italic',
                                }}>
                                  {inv.invoiceNumber || (t('admin.contractManagement.notIssuedYet') || '(chưa có số)')}
                                </td>
                                <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '3px 10px',
                                    borderRadius: 6,
                                    fontSize: '0.82rem',
                                    fontWeight: 500,
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                  }}>
                                    {typeLabel}
                                  </span>
                                </td>
                                <td style={{
                                  padding: '12px 14px',
                                  borderBottom: '1px solid #f1f5f9',
                                  textAlign: 'right',
                                  whiteSpace: 'nowrap',
                                  color: isZeroAmount ? '#ea580c' : '#0f172a',
                                  fontStyle: isZeroAmount ? 'italic' : 'normal',
                                  fontWeight: isZeroAmount ? 600 : 500,
                                }} title={isZeroAmount ? 'Đơn giá đang bằng 0 — bấm "Tính lại" ở trên để cập nhật' : ''}>
                                  {isZeroAmount
                                    ? (t('admin.contractManagement.noPriceYet') || '(chưa có đơn giá)')
                                    : `${totalAmount.toLocaleString('vi-VN')} VND`}
                                </td>
                                <td
                                  style={{
                                    padding: '12px 14px',
                                    borderBottom: '1px solid #f1f5f9',
                                    whiteSpace: 'nowrap',
                                    color: '#0f172a',
                                  }}
                                  title={periodStartRaw ? undefined : 'Chưa có ngày bắt đầu kỳ'}
                                >
                                  {periodStartRaw ? formatDate(periodStartRaw) : '—'}
                                </td>
                                <td
                                  style={{
                                    padding: '12px 14px',
                                    borderBottom: '1px solid #f1f5f9',
                                    whiteSpace: 'nowrap',
                                    color: isOverdue ? '#b91c1c' : '#0f172a',
                                    fontWeight: isOverdue ? 600 : 500,
                                  }}
                                  title={
                                    isOverdue
                                      ? 'Hóa đơn quá hạn thanh toán'
                                      : (dueDateRaw ? undefined : 'Chưa có hạn thanh toán — dùng ngày kết thúc kỳ')
                                  }
                                >
                                  {formatDate(dueDateRaw)}
                                  {isOverdue && (
                                    <span style={{
                                      marginLeft: 8,
                                      display: 'inline-block',
                                      padding: '2px 8px',
                                      borderRadius: 999,
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: '#fee2e2',
                                      color: '#b91c1c',
                                      letterSpacing: '0.02em',
                                    }}>
                                      QUÁ HẠN
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'center' }}>
                                    {statusKey === 'draft' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => openEditInvoiceModal(inv)}
                                          title={t('admin.contractManagement.editInvoiceTooltip') || 'Sửa kỳ bắt đầu / phí dịch vụ trước khi xuất'}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '6px 12px',
                                            borderRadius: 6,
                                            border: '1px solid #f59e0b',
                                            background: '#fffbeb',
                                            color: '#b45309',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'background 0.15s ease, transform 0.05s ease',
                                          }}
                                          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                                          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                        >
                                          ✏️ {t('admin.contractManagement.editInvoiceLabel') || 'Sửa'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openCancelInvoiceDialog(inv)}
                                          title={t('admin.contractManagement.cancelInvoiceTooltip') || 'Dừng hóa đơn (xóa mềm, ẩn khỏi danh sách)'}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '6px 12px',
                                            borderRadius: 6,
                                            border: '1px solid #dc2626',
                                            background: '#fef2f2',
                                            color: '#b91c1c',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'background 0.15s ease, transform 0.05s ease',
                                          }}
                                          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                                          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                        >
                                          ⏹ {t('admin.contractManagement.cancelInvoiceLabel') || 'Dừng'}
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleExportInvoice(inv)}
                                      disabled={exportingInvoiceId === (inv._id || inv.invoiceNumber)}
                                      title={t('admin.contractManagement.exportInvoiceTooltip') || 'Xuất hóa đơn ra file HTML có thể in / lưu PDF'}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        border: '1px solid #2563eb',
                                        background: exportingInvoiceId === (inv._id || inv.invoiceNumber) ? '#dbeafe' : '#eff6ff',
                                        color: '#1d4ed8',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: exportingInvoiceId === (inv._id || inv.invoiceNumber) ? 'wait' : 'pointer',
                                        transition: 'background 0.15s ease, transform 0.05s ease',
                                      }}
                                      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                                      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                    >
                                      {exportingInvoiceId === (inv._id || inv.invoiceNumber) ? (
                                        <>⏳ {t('admin.contractManagement.exportingLabel') || 'Đang xuất…'}</>
                                      ) : (
                                        <>📄 {t('admin.contractManagement.exportInvoiceLabel') || 'Xuất'}</>
                                      )}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-submit" onClick={() => {
                setShowContractInvoicesModal(false);
                setContractInvoices([]);
              }}>
                {t('admin.contractManagement.closeButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal: Sửa giá hóa đơn DRAFT ═══ */}
      {editingInvoice && (
        <div className="modal-overlay" onClick={closeEditInvoiceModal}>
          <div
            className="modal-content"
            style={{ maxWidth: 560, width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ background: '#fffbeb', borderBottom: '2px solid #f59e0b' }}>
              <div>
                <h2 className="modal-title" style={{ color: '#92400e' }}>
                  ✏️ {t('admin.contractManagement.editInvoiceTitle') || 'Sửa hóa đơn (Nháp)'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#78350f' }}>
                  {t('admin.contractManagement.editInvoiceSubtitle') || 'Điều chỉnh kỳ bắt đầu và phí dịch vụ trước khi xuất hóa đơn.'}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeEditInvoiceModal}
                disabled={savingInvoice}
                aria-label="close"
              >
                ×
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <div style={{
                marginBottom: 16,
                padding: '10px 14px',
                background: '#f1f5f9',
                borderRadius: 8,
                fontSize: '0.88rem',
                color: '#475569',
              }}>
                <div><strong>Số hóa đơn:</strong> {editingInvoice.invoiceNumber || editingInvoice._id}</div>
              </div>

              {/* Kỳ bắt đầu */}
              <div style={{ marginBottom: 12 }}>
                <label style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  marginBottom: 4,
                }}>
                  {t('admin.contractManagement.editInvoicePeriodStartLabel') || 'Kỳ bắt đầu'}
                </label>
                <input
                  type="date"
                  value={editInvoiceForm.billingPeriodStart}
                  onChange={(e) => setEditInvoiceForm((f) => ({ ...f, billingPeriodStart: e.target.value }))}
                  disabled={savingInvoice}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {/* Phí dịch vụ chăm sóc */}
              <div style={{ marginBottom: 12 }}>
                <label style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  color: '#1d4ed8',
                  marginBottom: 4,
                }}>
                  {t('admin.contractManagement.editInvoiceCareFeeLabel') || 'Phí dịch vụ chăm sóc (VND)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={editInvoiceForm.careServiceCost}
                  onChange={(e) => setEditInvoiceForm((f) => ({ ...f, careServiceCost: e.target.value }))}
                  disabled={savingInvoice}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
              </div>

              {/* Lý do sửa */}
              <div style={{ marginBottom: 12 }}>
                <label style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  marginBottom: 4,
                }}>
                  {t('admin.contractManagement.editInvoiceReasonLabel') || 'Lý do sửa (tùy chọn, lưu audit log)'}
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={editInvoiceForm.reason}
                  onChange={(e) => setEditInvoiceForm((f) => ({ ...f, reason: e.target.value }))}
                  disabled={savingInvoice}
                  placeholder={t('admin.contractManagement.editInvoiceReasonPlaceholder') || 'Ví dụ: điều chỉnh giảm giá cho khách hàng thân thiết'}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Preview tổng tiền */}
              <div style={{
                marginTop: 14,
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: 8,
                fontSize: '0.9rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ color: '#64748b' }}>Tạm tính (subTotal):</span>
                  <strong style={{ color: '#0f172a' }}>{editPreviewTotal.subTotal.toLocaleString('vi-VN')} VND</strong>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0 0',
                  borderTop: '1px solid #e2e8f0',
                  marginTop: 4,
                }}>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Tổng cộng (totalAmount):</span>
                  <strong style={{ fontSize: '1.05rem', color: '#15803d' }}>{editPreviewTotal.total.toLocaleString('vi-VN')} VND</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ background: '#fffbeb' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeEditInvoiceModal}
                disabled={savingInvoice}
              >
                {t('common.cancel') || 'Hủy'}
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={handleUpdateInvoice}
                disabled={savingInvoice}
                style={{ background: savingInvoice ? '#fbbf24' : '#f59e0b' }}
              >
                {savingInvoice
                  ? <>⏳ {t('admin.contractManagement.savingLabel') || 'Đang lưu…'}</>
                  : <>💾 {t('admin.contractManagement.editInvoiceSaveLabel') || 'Lưu thay đổi'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog        open={!!pendingReleaseContract}
        message={t('admin.contractManagement.releaseResidentConfirm', { name: pendingReleaseContract?.residentName || '' })}
        loading={isReleasingResident}
        onConfirm={confirmReleaseResident}
        onCancel={() => setPendingReleaseContract(null)}
      />

      {/* ═══ Confirm dialog: Dừng (xóa mềm) hóa đơn ═══ */}
      {pendingCancelInvoice && (
        <div
          className="confirm-dialog-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeCancelInvoiceDialog(); }}
        >
          <div className="confirm-dialog" role="alertdialog" aria-modal="true">
            <div className="confirm-dialog__title">
              {t('admin.contractManagement.cancelInvoiceConfirmTitle') || 'Dừng hóa đơn Nháp?'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--nh-text-secondary)', lineHeight: 1.5, margin: '0 0 16px' }}>
              <p style={{ margin: '0 0 12px' }}>
                {t('admin.contractManagement.cancelInvoiceConfirmMessage') ||
                  'Hóa đơn sẽ được đánh dấu là đã dừng và ẩn khỏi danh sách. Bạn có thể tra cứu lịch sử trong cơ sở dữ liệu.'}
              </p>
              <div style={{
                padding: '8px 12px',
                background: '#f1f5f9',
                borderRadius: 6,
                fontSize: '0.88rem',
                color: '#475569',
                marginBottom: 12,
              }}>
                <div><strong>Số HĐ:</strong> {pendingCancelInvoice.invoiceNumber || pendingCancelInvoice._id}</div>
                <div>
                  <strong>Tổng tiền:</strong>{' '}
                  {Number(pendingCancelInvoice.totalAmount || pendingCancelInvoice.total || 0).toLocaleString('vi-VN')} VND
                </div>
              </div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: 6, color: '#0f172a' }}>
                {t('admin.contractManagement.cancelInvoiceReasonLabel') || 'Lý do dừng (tùy chọn)'}
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={cancelInvoiceReason}
                onChange={(e) => setCancelInvoiceReason(e.target.value)}
                disabled={cancellingInvoice}
                placeholder={t('admin.contractManagement.cancelInvoiceReasonPlaceholder') || 'Ví dụ: nhập sai số tiền, tạo hóa đơn nhầm'}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>
            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="confirm-dialog__btn confirm-dialog__btn--secondary"
                onClick={closeCancelInvoiceDialog}
                disabled={cancellingInvoice}
              >
                {t('common.cancel') || 'Hủy'}
              </button>
              <button
                type="button"
                className="confirm-dialog__btn confirm-dialog__btn--danger"
                onClick={confirmCancelInvoice}
                disabled={cancellingInvoice}
              >
                {cancellingInvoice
                  ? (t('common.confirming') || 'Đang xử lý…')
                  : (t('admin.contractManagement.cancelInvoiceConfirmBtn') || 'Dừng hóa đơn')
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Result popup: lỗi khi dừng hóa đơn ═══ */}
      {cancelInvoiceError && (
        <div
          className="confirm-dialog-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setCancelInvoiceError(null); }}
        >
          <div className="confirm-dialog" role="alertdialog" aria-modal="true">
            <div className="confirm-dialog__title" style={{ color: '#b91c1c' }}>
              ⚠ {cancelInvoiceError.title}
            </div>
            <div style={{ fontSize: 14, color: 'var(--nh-text-secondary)', lineHeight: 1.5, margin: '0 0 16px' }}>
              {cancelInvoiceError.message}
            </div>
            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="confirm-dialog__btn confirm-dialog__btn--primary"
                onClick={() => setCancelInvoiceError(null)}
              >
                {t('common.close') || 'Đóng'}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
  );
}
