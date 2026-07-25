import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Pill,
  PackageOpen,
  Truck,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Search,
  Plus,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileText,
  Save,
  Bold,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  BarChart3,
  TrendingUp,
  Download,
} from 'lucide-react';
import pharmacyService from '../../services/pharmacy.service';
import {
  validateMedicationForm,
  buildMedicationPayload,
  validateSupplierForm,
  buildSupplierPayload,
  validateStockForm,
  getApiErrorMessage,
} from '../../utils/pharmacyValidation';

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: Activity },
  { id: 'medications', label: 'Thuốc', icon: Pill },
  { id: 'suppliers', label: 'Nhà cung cấp', icon: Truck },
  { id: 'stocks', label: 'Lịch sử nhập', icon: PackageOpen },
  { id: 'reports', label: 'Báo cáo', icon: Activity },
];

const DEFAULT_FORMS_VN = [
  'Viên nén',
  'Viên bao phim',
  'Viên nang cứng',
  'Viên nang mềm',
  'Viên sủi',
  'Viên nhai',
  'Siro',
  'Dung dịch uống',
  'Kem bôi',
  'Gel bôi',
  'Miếng dán',
  'Thuốc tiêm',
  'Dung dịch truyền',
  'Bột',
  'Cốm',
];

const DEFAULT_UNITS_VN = [
  'Viên',
  'Vỉ',
  'Hộp',
  'Chai',
  'Lọ',
  'Ống',
  'Gói',
  'Túi',
  'Tuýp',
  'Bút',
  'Miếng',
];

const DEFAULT_STRENGTHS_VN = [
  '0.5mg',
  '1mg',
  '2mg',
  '5mg',
  '10mg',
  '20mg',
  '50mg',
  '100mg',
  '250mg',
  '500mg',
  '750mg',
  '1g',
  '5mg/ml',
  '10mg/ml',
  '100IU/ml',
  'Khác',
];

const toIsoDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const localDateTimeNow = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
};

const generateLotNumber = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LOT-${ts}-${rnd}`;
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getDaysToExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const target = new Date(expiryDate);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / MS_PER_DAY);
};

const getExpiryTag = (expiryDate) => {
  const days = getDaysToExpiry(expiryDate);
  if (days === null) {
    return { label: 'Thuốc không tồn tại', badgeClass: 'expiry-badge--black', itemClass: 'expiry-item--black' };
  }
  if (days < 0) {
    return { label: 'Đã hết hạn', badgeClass: 'expiry-badge--gray', itemClass: 'expiry-item--gray' };
  }
  if (days < 90) {
    return { label: '< 3 tháng', badgeClass: 'expiry-badge--red', itemClass: 'expiry-item--red' };
  }
  if (days < 180) {
    return { label: '3 - 6 tháng', badgeClass: 'expiry-badge--purple', itemClass: 'expiry-item--purple' };
  }
  if (days < 365) {
    return { label: '6 - 12 tháng', badgeClass: 'expiry-badge--blue', itemClass: 'expiry-item--blue' };
  }
  return { label: '> 12 tháng', badgeClass: 'expiry-badge--green', itemClass: 'expiry-item--green' };
};

const formatCurrency = (value) => {
  if (value == null || value === '') return 'N/A';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

const buildOptionList = (items, key) => {
  const values = items
    .map((item) => item?.[key])
    .filter((value) => typeof value === 'string' && value.trim());
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
};

const withFallbackOption = (options, currentValue) => {
  if (!currentValue || options.includes(currentValue)) return options;
  return [currentValue, ...options];
};

const findOptionMatch = (items, value, key) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return items.find((item) => String(item?.[key] || '').trim().toLowerCase() === normalized) || null;
};

const emptyMedicationForm = {
  medicationCode: '',
  name: '',
  form: '',
  strength: '',
  unit: '',
  manufacturer: '',
  description: '',
  minStockLevel: 0,
  isActive: true,
};

const emptySupplierForm = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  isActive: true,
};

const emptyStockForm = {
  medicationId: '',
  supplierId: '',
  quantity: 0,
  lotNumber: '',
  expiryDate: '',
  receivedDate: '',
  costPerUnit: 0,
  notes: '',
};

function PharmacyPage({ defaultTab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const location = useLocation();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [lowStock, setLowStock] = useState([]);
  const [expiryList, setExpiryList] = useState([]);
  const [overviewLowStockPage, setOverviewLowStockPage] = useState(1);
  const [overviewExpiryPage, setOverviewExpiryPage] = useState(1);

  const [medications, setMedications] = useState([]);
  const [medLoading, setMedLoading] = useState(false);
  const [medSearch, setMedSearch] = useState('');
  const [medActive, setMedActive] = useState('true');
  const [medPage, setMedPage] = useState(1);
  const [medTotalPages, setMedTotalPages] = useState(1);

  const [suppliers, setSuppliers] = useState([]);
  const [supLoading, setSupLoading] = useState(false);
  const [supSearch, setSupSearch] = useState('');
  const [supActive, setSupActive] = useState('true');
  const [supPage, setSupPage] = useState(1);
  const [supTotalPages, setSupTotalPages] = useState(1);

  const [stocks, setStocks] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockFilters, setStockFilters] = useState({
    medicationId: '',
    supplierId: '',
    lotNumber: '',
    expiryFrom: '',
    expiryTo: '',
  });
  const [stockPage, setStockPage] = useState(1);
  const [stockTotalPages, setStockTotalPages] = useState(1);

  const PAGE_SIZE = 9;
  const OVERVIEW_PAGE_SIZE = 4;
  const normalizePage = (value) => {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : 1;
  };

  const calculateTotalPages = (total, reportedTotalPages) => {
    if (reportedTotalPages != null) {
      return Math.max(1, Number(reportedTotalPages) || 1);
    }
    return Math.max(1, Math.ceil((Number(total) || 0) / PAGE_SIZE));
  };

  const [usageStats, setUsageStats] = useState([]);
  const [dispensingDetails, setDispensingDetails] = useState([]);
  const [usageRange, setUsageRange] = useState({ from: '', to: '' });
  const [usageLoading, setUsageLoading] = useState(false);

  const [medicationOptions, setMedicationOptions] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);

  const medicationFormOptions = useMemo(() => {
    return {
      forms: buildOptionList(medicationOptions, 'form'),
      units: buildOptionList(medicationOptions, 'unit'),
      manufacturers: buildOptionList(medicationOptions, 'manufacturer'),
      strengths: buildOptionList(medicationOptions, 'strength'),
    };
  }, [medicationOptions]);

  const supplierFormOptions = useMemo(() => {
    return {
      contactNames: buildOptionList(supplierOptions, 'contactName'),
      phones: buildOptionList(supplierOptions, 'phone'),
      emails: buildOptionList(supplierOptions, 'email'),
      addresses: buildOptionList(supplierOptions, 'address'),
    };
  }, [supplierOptions]);

  const combinedUnitOptions = useMemo(() => {
    const items = [
      ...DEFAULT_UNITS_VN,
      ...(medicationFormOptions.units || []),
    ];
    return Array.from(new Set(items)).sort((a, b) => String(a).localeCompare(String(b)));
  }, [medicationFormOptions]);

  const combinedStrengthOptions = useMemo(() => {
    const items = [
      ...DEFAULT_STRENGTHS_VN,
      ...(medicationFormOptions.strengths || []),
    ];
    return Array.from(new Set(items)).sort((a, b) => String(a).localeCompare(String(b)));
  }, [medicationFormOptions]);


  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [medicationForm, setMedicationForm] = useState({ ...emptyMedicationForm });
  const [medicationSaving, setMedicationSaving] = useState(false);
  const [medicationError, setMedicationError] = useState(null);
  const [medicationMessage, setMedicationMessage] = useState(null);

  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  const nameSuggestions = useMemo(() => {
    const q = (medicationForm.name || '').trim().toLowerCase();
    if (!q) return [];
    return medicationOptions
      .filter((m) => (m.name || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [medicationForm.name, medicationOptions]);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ ...emptySupplierForm });
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [supplierError, setSupplierError] = useState(null);
  const [supplierMessage, setSupplierMessage] = useState(null);

  const [showStockModal, setShowStockModal] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [stockForm, setStockForm] = useState({ ...emptyStockForm });
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState(null);
  const [stockMessage, setStockMessage] = useState(null);

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteMedication, setNoteMedication] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteError, setNoteError] = useState(null);
  const [noteLoading, setNoteLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await pharmacyService.getReportSummary({});
      setSummary(res?.summary || null);
    } catch (err) {
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadLowStock = useCallback(async () => {
    try {
      const res = await pharmacyService.getLowStockAlerts();
      setLowStock(res?.data || []);
    } catch (err) {
    }
  }, []);

  const loadExpiry = useCallback(async () => {
    try {
      const res = await pharmacyService.trackExpiry();
      setExpiryList(res?.data || []);
      setOverviewExpiryPage(1);
    } catch (err) {
    }
  }, []);

  const loadMedications = useCallback(async () => {
    const page = normalizePage(medPage);
    try {
      setMedLoading(true);
      const res = await pharmacyService.listMedications({
        search: medSearch.trim() || undefined,
        isActive: medActive === '' ? undefined : medActive,
        page,
        limit: PAGE_SIZE,
      });
      setMedications(res?.data || []);
      setMedPage(res?.page ? normalizePage(res.page) : page);
      setMedTotalPages(calculateTotalPages(res?.total, res?.totalPages));
    } catch (err) {
    } finally {
      setMedLoading(false);
    }
  }, [medActive, medPage, medSearch]);

  const loadSuppliers = useCallback(async () => {
    try {
      setSupLoading(true);
      const page = normalizePage(supPage);
      const res = await pharmacyService.listSuppliers({
        search: supSearch.trim() || undefined,
        isActive: supActive === '' ? undefined : supActive,
        page,
        limit: PAGE_SIZE,
      });
      setSuppliers(res?.data || []);
      setSupPage(res?.page ? normalizePage(res.page) : page);
      setSupTotalPages(calculateTotalPages(res?.total, res?.totalPages));
    } catch (err) {
    } finally {
      setSupLoading(false);
    }
  }, [supActive, supPage, supSearch]);

  const loadStocks = useCallback(async () => {
    try {
      setStockLoading(true);
      const medicationId = (stockFilters.medicationId || '').trim();
      const supplierId = (stockFilters.supplierId || '').trim();
      const resolvedMedicationId = medicationId
        ? medicationOptions.find((med) => String(med._id) === medicationId)?._id ||
          findOptionMatch(medicationOptions, medicationId, 'name')?._id ||
          medicationId
        : undefined;
      const resolvedSupplierId = supplierId
        ? supplierOptions.find((supplier) => String(supplier._id) === supplierId)?._id ||
          findOptionMatch(supplierOptions, supplierId, 'name')?._id ||
          supplierId
        : undefined;
      const page = normalizePage(stockPage);
      const params = {
        medicationId: resolvedMedicationId,
        supplierId: resolvedSupplierId,
        lotNumber: stockFilters.lotNumber.trim() || undefined,
        expiryFrom: stockFilters.expiryFrom ? toIsoDate(stockFilters.expiryFrom) : undefined,
        expiryTo: stockFilters.expiryTo ? toIsoDate(stockFilters.expiryTo) : undefined,
        page,
        limit: PAGE_SIZE,
      };
      const res = await pharmacyService.listStocks(params);
      const sortedStocks = (res?.data || []).slice().sort((a, b) => {
        const aDate = new Date(a.receivedDate || a.createdAt).getTime();
        const bDate = new Date(b.receivedDate || b.createdAt).getTime();
        return bDate - aDate;
      });
      setStocks(sortedStocks);
      setStockPage(res?.page ? normalizePage(res.page) : page);
      setStockTotalPages(calculateTotalPages(res?.total, res?.totalPages));
    } catch (err) {
    } finally {
      setStockLoading(false);
    }
  }, [medicationOptions, stockFilters, stockPage, supplierOptions]);

  const loadUsageStats = useCallback(async () => {
    try {
      setUsageLoading(true);
      const res = await pharmacyService.getUsageStats({
        from: usageRange.from ? toIsoDate(usageRange.from) : undefined,
        to: usageRange.to ? toIsoDate(usageRange.to) : undefined,
      });
      setUsageStats(res?.data || []);
      // Set dispensing details from response
      setDispensingDetails(res?.dispensingDetails || []);
    } catch (err) {
    } finally {
      setUsageLoading(false);
    }
  }, [usageRange]);

  const aggregatedReportData = useMemo(() => {
    if (!dispensingDetails || dispensingDetails.length === 0) return [];

    const grouped = {};
    dispensingDetails.forEach((item) => {
      const key = `${item.medicationName}|${item.patientName}`;
      if (!grouped[key]) {
        grouped[key] = {
          medicationName: item.medicationName,
          patientName: item.patientName,
          lastDispensedTime: item.dispensedTime,
          dispensCount: 0,
          totalQuantity: 0,
          records: [],
        };
      }
      grouped[key].dispensCount += 1;
      grouped[key].totalQuantity += item.quantity || 0;
      grouped[key].records.push(item);
      // Keep the most recent time
      if (item.dispensedTime > grouped[key].lastDispensedTime) {
        grouped[key].lastDispensedTime = item.dispensedTime;
      }
    });

    return Object.values(grouped);
  }, [dispensingDetails]);

  const exportToExcel = useCallback(() => {
    if (aggregatedReportData.length === 0) {
      alert('Không có dữ liệu để xuất. Vui lòng tải dữ liệu trước.');
      return;
    }

    const data = aggregatedReportData.map((item) => ({
      'Tên thuốc': item.medicationName || 'N/A',
      'Tên bệnh nhân': item.patientName || 'N/A',
      'Thời gian cấp phát': item.lastDispensedTime ? new Date(item.lastDispensedTime).toLocaleString('vi-VN') : 'N/A',
      'Số lần cấp phát': item.dispensCount,
      'Tổng đã cấp phát (Lần)': item.totalQuantity,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo cấp phát');

    const colWidths = [
      { wch: 25 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
    ];
    worksheet['!cols'] = colWidths;

    const filename = `Báo Cáo Cấp Phát Thuốc.xlsx`;

    XLSX.writeFile(workbook, filename);
  }, [aggregatedReportData, usageRange]);

  const loadOptions = useCallback(async () => {
    try {
      const [medRes, supplierRes] = await Promise.all([
        pharmacyService.listMedications({ page: 1, limit: 200 }),
        pharmacyService.listSuppliers({ page: 1, limit: 200 }),
      ]);
      const meds = medRes?.data || [];
      const suppliers = supplierRes?.data || [];
      setMedicationOptions(meds);
      setSupplierOptions(suppliers);
      return { meds, suppliers };
    } catch (err) {
      return { meds: [], suppliers: [] };
    } finally {
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadLowStock();
  }, [loadSummary, loadLowStock]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (!location) return;
    const known = TABS.map((t) => t.id);
    try {
      const params = new URLSearchParams(location.search || '');
      const tabParam = params.get('tab');
      if (tabParam && known.includes(tabParam)) {
        setActiveTab((prev) => (prev === tabParam ? prev : tabParam));
        return;
      }
    } catch (e) {
    }

    if (!location.pathname) return;
    const parts = location.pathname.split('/').filter(Boolean);
    const matches = parts.filter((p) => known.includes(p));
    const found = matches.length ? matches[matches.length - 1] : null;
    if (found) setActiveTab((prev) => (prev === found ? prev : found));
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadExpiry();
    }
  }, [activeTab, loadExpiry]);

  useEffect(() => {
    if (activeTab === 'medications') {
      loadMedications();
    }
  }, [activeTab, medPage, medSearch, medActive]);

  useEffect(() => {
    if (activeTab === 'suppliers') {
      loadSuppliers();
    }
  }, [activeTab, supPage, supSearch, supActive]);

  useEffect(() => {
    if (activeTab === 'stocks') {
      loadStocks();
    }
  }, [activeTab, stockPage, stockFilters, medicationOptions, supplierOptions]);

  useEffect(() => {
    setMedPage(1);
  }, [medSearch, medActive]);

  useEffect(() => {
    setSupPage(1);
  }, [supSearch, supActive]);

  useEffect(() => {
    setStockPage(1);
  }, [stockFilters.medicationId, stockFilters.supplierId, stockFilters.lotNumber, stockFilters.expiryFrom, stockFilters.expiryTo]);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadUsageStats();
    }
  }, [activeTab, loadUsageStats]);

  useEffect(() => {
    if (activeTab === 'stocks' || activeTab === 'medications' || activeTab === 'suppliers') {
      loadOptions();
    }
  }, [activeTab, loadOptions]);

  const openMedicationModal = (medication) => {
    setEditingMedication(medication || null);
    if (medication) {
      setMedicationForm({
        medicationCode: medication.medicationCode || '',
        name: medication.name || '',
        form: medication.form || '',
        strength: medication.strength || '',
        unit: medication.unit || '',
        manufacturer: medication.manufacturer || '',
        description: medication.description || '',
        minStockLevel: medication.minStockLevel || 0,
        isActive: medication.isActive !== false,
      });
    } else {
      setMedicationForm({ ...emptyMedicationForm });
    }
    setMedicationError(null);
    setMedicationMessage(null);
    try {
      loadSuppliers();
    } catch (e) {
    }
    setShowMedicationModal(true);
  };

  const saveMedication = async (event) => {
    if (event) event.preventDefault();
    const validation = validateMedicationForm(medicationForm);
    if (!validation.valid) {
      setMedicationError(validation.message);
      setMedicationMessage(null);
      return;
    }

    try {
      setMedicationSaving(true);
      setMedicationError(null);
      const payload = buildMedicationPayload(medicationForm);
      if (editingMedication) {
        await pharmacyService.updateMedication(editingMedication._id, payload);
        setMedicationMessage('Cập nhật thuốc thành công.');
      } else {
        await pharmacyService.createMedication(payload);
        setMedicationMessage('Thêm thuốc thành công.');
      }
      setMedicationError(null);
      setShowMedicationModal(false);
      loadMedications();
      loadLowStock();
      loadSummary();
    } catch (err) {
      setMedicationError(getApiErrorMessage(err, 'Không thể lưu thuốc.'));
      setMedicationMessage(null);
    } finally {
      setMedicationSaving(false);
    }
  };

  const openSupplierModal = (supplier) => {
    setEditingSupplier(supplier || null);
    if (supplier) {
      setSupplierForm({
        name: supplier.name || '',
        contactName: supplier.contactName || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
        isActive: supplier.isActive !== false,
      });
    } else {
      setSupplierForm({ ...emptySupplierForm });
    }
    setSupplierError(null);
    setSupplierMessage(null);
    setShowSupplierModal(true);
  };

  const saveSupplier = async (event) => {
    if (event) event.preventDefault();
    const validation = validateSupplierForm(supplierForm, suppliers, editingSupplier?._id || null);
    if (!validation.valid) {
      setSupplierError(validation.message);
      setSupplierMessage(null);
      return;
    }

    try {
      setSupplierSaving(true);
      setSupplierError(null);
      const payload = buildSupplierPayload(supplierForm);
      if (editingSupplier) {
        await pharmacyService.updateSupplier(editingSupplier._id, payload);
        setSupplierMessage('Cập nhật nhà cung cấp thành công.');
      } else {
        await pharmacyService.createSupplier(payload);
        setSupplierMessage('Thêm nhà cung cấp thành công.');
      }
      setSupplierError(null);
      setShowSupplierModal(false);
      loadSuppliers();
      loadSummary();
    } catch (err) {
      setSupplierError(getApiErrorMessage(err, 'Không thể lưu nhà cung cấp.'));
      setSupplierMessage(null);
    } finally {
      setSupplierSaving(false);
    }
  };

  const deactivateSupplier = async (supplierId) => {
    try {
      await pharmacyService.deleteSupplier(supplierId);
      loadSuppliers();
      loadSummary();
    } catch (err) {
      console.error('Failed to deactivate supplier:', err);
    }
  };

  const handleStockMedicationChange = (event) => {
    const medicationId = event.target.value;
    const selectedMedication = medicationOptions.find((med) => String(med._id) === String(medicationId));
    const isInactiveMedication = Boolean(selectedMedication && selectedMedication.isActive === false);
    const manufacturerName = String(selectedMedication?.manufacturer || '').trim().toLowerCase();
    const matchedSupplierByManufacturer = supplierOptions.find((supplier) => {
      if (supplier.isActive === false) return false;
      return String(supplier.name || '').trim().toLowerCase() === manufacturerName;
    });

    const matchedSupplierFromHistory = stocks.find((entry) => {
      const entryMedicationId = String(entry.medicationId?._id || entry.medicationId || '');
      return entryMedicationId === String(medicationId) && entry.supplierId;
    })?.supplierId;

    const resolvedSupplierId =
      matchedSupplierByManufacturer?._id ||
      (typeof matchedSupplierFromHistory === 'object'
        ? matchedSupplierFromHistory?._id || ''
        : matchedSupplierFromHistory || '');

    const isInactiveSupplier = Boolean(selectedMedication && selectedMedication.manufacturer && supplierOptions.some((supplier) => String(supplier.name || '').trim().toLowerCase() === String(selectedMedication.manufacturer || '').trim().toLowerCase() && supplier.isActive === false));

    setStockForm((prev) => ({
      ...prev,
      medicationId: isInactiveMedication ? '' : medicationId,
      supplierId: medicationId && !isInactiveMedication && !isInactiveSupplier ? resolvedSupplierId || prev.supplierId : '',
    }));
  };

  const openStockModal = async (stock) => {
    if (!supplierOptions.length || !medicationOptions.length) {
      await loadOptions();
    }
    setEditingStock(stock || null);
    if (stock) {
      setStockForm({
        medicationId: stock.medicationId?._id || stock.medicationId || '',
        supplierId: stock.supplierId?._id || stock.supplierId || '',
        quantity: stock.quantity || 0,
        lotNumber: stock.lotNumber || generateLotNumber(),
        expiryDate: toDateTimeInput(stock.expiryDate),
        receivedDate: toDateTimeInput(stock.receivedDate),
        costPerUnit: stock.costPerUnit || 0,
        notes: stock.notes || '',
      });
    } else {
      setStockForm({ ...emptyStockForm, lotNumber: generateLotNumber(), receivedDate: localDateTimeNow() });
    }
    setStockError(null);
    setStockMessage(null);
    setShowStockModal(true);
  };

  const saveStock = async (event) => {
    if (event) event.preventDefault();
    const validation = validateStockForm(stockForm, medicationOptions, supplierOptions);
    if (!validation.valid) {
      setStockError(validation.message);
      setStockMessage(null);
      return;
    }

    try {
      setStockSaving(true);
      setStockError(null);
      const medKey = (stockForm.medicationId ?? '').toString().trim();
      const supKey = (stockForm.supplierId ?? '').toString().trim();

      const resolvedMedicationId =
        medicationOptions.find((med) => med._id === medKey)?._id ||
        findOptionMatch(medicationOptions, medKey, 'name')?._id ||
        medKey;
      const resolvedSupplierId =
        supplierOptions.find((supplier) => supplier._id === supKey)?._id ||
        findOptionMatch(supplierOptions, supKey, 'name')?._id ||
        (supKey || undefined);

      const selectedMedication = medicationOptions.find((med) => String(med._id) === String(resolvedMedicationId));
      const payload = {
        medicationId: resolvedMedicationId,
        supplierId: resolvedSupplierId || undefined,
        quantity: Number(stockForm.quantity),
        unit: selectedMedication?.unit || undefined,
        lotNumber: String(stockForm.lotNumber || generateLotNumber()).trim() || undefined,
        expiryDate: stockForm.expiryDate ? toIsoDate(stockForm.expiryDate) : undefined,
        receivedDate: stockForm.receivedDate ? toIsoDate(stockForm.receivedDate) : undefined,
        costPerUnit: stockForm.costPerUnit ? Number(stockForm.costPerUnit) : undefined,
        notes: String(stockForm.notes || '').trim() || undefined,
      };

      if (editingStock) {
        await pharmacyService.updateStock(editingStock._id, payload);
        setStockMessage('Cập nhật lịch sử nhập thuốc thành công.');
        loadStocks();
      } else {
        await pharmacyService.createStock(payload);
        setStockMessage('Nhập thuốc thành công.');
        if (stockPage !== 1) {
          setStockPage(1);
        } else {
          loadStocks();
        }
      }
      setStockError(null);
      setShowStockModal(false);
      loadSummary();
      loadLowStock();
    } catch (err) {
      setStockError(getApiErrorMessage(err, 'Không thể lưu tồn kho.'));
      setStockMessage(null);
    } finally {
      setStockSaving(false);
    }
  };

  const openNotes = async (medication) => {
    if (!medication) return;
    try {
      setNoteLoading(true);
      setNoteMedication(medication);
      setNoteText('');
      setNoteError(null);
      const res = await pharmacyService.listMedicationNotes(medication._id, { page: 1, limit: 10 });
      setNotes(res?.data || []);
      setShowNoteModal(true);
    } catch (err) {
      setNoteError('Không thể tải ghi chú.');
    } finally {
      setNoteLoading(false);
    }
  };

  const addNote = async (event) => {
    if (event) event.preventDefault();
    if (!noteMedication) return;
    if (!noteText.trim()) {
      setNoteError('Ghi chú là bắt buộc.');
      return;
    }

    try {
      setNoteError(null);
      await pharmacyService.addMedicationNote(noteMedication._id, { note: noteText.trim() });
      const res = await pharmacyService.listMedicationNotes(noteMedication._id, { page: 1, limit: 10 });
      setNotes(res?.data || []);
      setNoteText('');
    } catch (err) {
      setNoteError('Không thể thêm ghi chú.');
    }
  };

  return (
    <div className="pharmacy-page">
      <header className="pharmacy-header">
        <div>
          <h1>Hoạt động nhà thuốc</h1>
          <p>Quản lý thuốc, nhà cung cấp, nhập thuốc và báo cáo cấp phát thuốc.</p>
        </div>
      </header>

      <nav className="pharmacy-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`pharmacy-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => {
                try {
                  const parts = (location?.pathname || '').split('/').filter(Boolean);
                  const roles = ['pharmacist', 'admin', 'manager', 'nurse', 'doctor', 'caregiver', 'family'];
                  const roleIdx = parts.findIndex((p) => roles.includes(p));
                  let newPath = '';
                  if (roleIdx !== -1) {
                    if (parts[roleIdx] === 'admin') {
                      newPath = `/admin/medications?tab=${tab.id}`;
                    } else {
                      newPath = `/${parts[roleIdx]}/${tab.id}`;
                    }
                  } else {
                    const known = TABS.map((t) => t.id);
                    const matches = parts.filter((p) => known.includes(p));
                    if (matches.length) {
                      const lastMatch = matches[matches.length - 1];
                      const idx = parts.lastIndexOf(lastMatch);
                      const newParts = parts.slice();
                      newParts[idx] = tab.id;
                      newPath = '/' + newParts.join('/');
                    } else {
                      newPath = '/' + tab.id;
                    }
                  }
                  try {
                    const current = (location?.pathname || '') + (location?.search || '');
                    if (newPath !== current) navigate(newPath);
                  } catch (e) {
                    navigate(newPath);
                  }
                } catch (e) {
                }
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === 'overview' && (
        <section className="pharmacy-section">
          <div className="pharmacy-summary">
            <div className="summary-card summary-card--active">
              <div className="summary-card__icon">
                <CheckCircle2 size={24} />
              </div>
              <div className="summary-card__content">
                <span>Thuốc đang hoạt động</span>
                <strong>{summary?.activeMedications ?? '--'}</strong>
              </div>
            </div>

            <div className="summary-card summary-card--active">
              <div className="summary-card__icon">
                <CheckCircle2 size={24} />
              </div>
              <div className="summary-card__content">
                <span>Nhà cung cấp đang hoạt động</span>
                <strong>{summary?.activeSuppliers ?? '--'}</strong>
              </div>
            </div>

            <div className="summary-card summary-card--warning">
              <div className="summary-card__icon">
                <AlertCircle size={24} />
              </div>
              <div className="summary-card__content">
                <span>Cảnh báo tồn kho thấp</span>
                <strong>{summary?.lowStockCount ?? '--'}</strong>
              </div>
            </div>

            <div className="summary-card summary-card--expiring">
              <div className="summary-card__icon">
                <Clock size={24} />
              </div>
              <div className="summary-card__content">
                <span>Thuốc sắp hết hạn</span>
                <strong>{summary?.expiringSoonCount ?? '--'}</strong>
              </div>
            </div>
          </div>

          <div className="pharmacy-grid">
            <div className="pharmacy-card">
              <div className="pharmacy-card__header">
                <div>
                  <strong>Cảnh báo tồn kho thấp</strong>
                  <strong className="pharmacy-card__meta">Số thuốc tồn kho thấp: {lowStock.length}</strong>
                </div>
                <AlertTriangle size={18} />
              </div>

              <div className="pharmacy-card__body">
                {lowStock.length === 0 ? (
                  <p className="pharmacy-empty">Không có cảnh báo tồn kho thấp.</p>
                ) : (
                  <>
                    <ul className="pharmacy-list pharmacy-list--compact">
                      {lowStock
                        .slice((overviewLowStockPage - 1) * OVERVIEW_PAGE_SIZE, overviewLowStockPage * OVERVIEW_PAGE_SIZE)
                        .map((item) => (
                          <li key={item.medication._id}>
                            <div className="pharmacy-alert-item">
                              <span className="pharmacy-alert-item__name">{item.medication.name}</span>
                              <span className="pharmacy-alert-item__meta">
                                {item.medication.manufacturer
                                  ? `Nhà cung cấp: ${item.medication.manufacturer}`
                                  : 'Chưa có nhà cung cấp'}
                              </span>
                            </div>
                            <strong>{item.medication.availableQuantity}</strong>
                          </li>
                        ))}
                    </ul>
                    {Math.ceil(lowStock.length / OVERVIEW_PAGE_SIZE) > 1 && (
                      <div className="pharmacy-pagination">
                        <button
                          type="button"
                          onClick={() => setOverviewLowStockPage((prev) => Math.max(1, prev - 1))}
                          disabled={overviewLowStockPage <= 1}
                        >
                          <ChevronLeft size={14} />
                          Trước
                        </button>
                        <span>Trang {overviewLowStockPage} / {Math.max(1, Math.ceil(lowStock.length / OVERVIEW_PAGE_SIZE))}</span>
                        <button
                          type="button"
                          onClick={() => setOverviewLowStockPage((prev) => Math.min(Math.max(1, Math.ceil(lowStock.length / OVERVIEW_PAGE_SIZE)), prev + 1))}
                          disabled={overviewLowStockPage >= Math.max(1, Math.ceil(lowStock.length / OVERVIEW_PAGE_SIZE))}
                        >
                          Tiếp
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="pharmacy-card">
              <div className="pharmacy-card__header">
                <div>
                  <strong>Tình trạng thuốc trong 12 tháng</strong>
                  <strong className="pharmacy-card__meta">Số thuốc đã nhập: {expiryList.length} lần</strong>
                </div>
                <PackageOpen size={18} />
              </div>
              <div className="pharmacy-card__body">
                <div className="expiry-legend">
                  <span className="expiry-badge expiry-badge--green">Bình thường</span>
                  <span className="expiry-badge expiry-badge--blue">Theo dõi</span>
                  <span className="expiry-badge expiry-badge--purple">Ưu tiên xuất</span>
                  <span className="expiry-badge expiry-badge--red">Cảnh báo khẩn</span>
                  <span className="expiry-badge expiry-badge--gray">Đã hết hạn</span>
                </div>

                {expiryList.length === 0 ? (
                  <p className="pharmacy-empty">Không có hàng tồn sắp hết hạn.</p>
                ) : (
                  <>
                    <ul className="pharmacy-list pharmacy-list--expiry">
                      {expiryList
                        .slice((overviewExpiryPage - 1) * OVERVIEW_PAGE_SIZE, overviewExpiryPage * OVERVIEW_PAGE_SIZE)
                        .map((item) => {
                          const expiryTag = getExpiryTag(item.expiryDate);
                          const supplierName = item.supplierId?.name || 'Chưa có nhà cung cấp';
                          const medicationLabel = item.medicationId?.name || item.medicationId?.medicationCode || item.medicationId || 'Thuốc không xác định';

                          return (
                            <li key={item._id} className={`pharmacy-list-item--expiry ${expiryTag.itemClass}`}>
                              <div>
                                <span className="pharmacy-list__title">{medicationLabel}</span>
                                <span className="pharmacy-list__meta">Nhà cung cấp: {supplierName}</span>
                              </div>
                              <div className="pharmacy-list__details">
                                <span className={`expiry-badge ${expiryTag.badgeClass}`}>{expiryTag.label}</span>
                                <strong>{formatDate(item.expiryDate)}</strong>
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                    {Math.ceil(expiryList.length / OVERVIEW_PAGE_SIZE) > 1 && (
                      <div className="pharmacy-pagination">
                        <button
                          type="button"
                          onClick={() => setOverviewExpiryPage((prev) => Math.max(1, prev - 1))}
                          disabled={overviewExpiryPage <= 1}
                        >
                          <ChevronLeft size={14} />
                          Trước
                        </button>
                        <span>Trang {overviewExpiryPage} / {Math.max(1, Math.ceil(expiryList.length / OVERVIEW_PAGE_SIZE))}</span>
                        <button
                          type="button"
                          onClick={() => setOverviewExpiryPage((prev) => Math.min(Math.max(1, Math.ceil(expiryList.length / OVERVIEW_PAGE_SIZE)), prev + 1))}
                          disabled={overviewExpiryPage >= Math.max(1, Math.ceil(expiryList.length / OVERVIEW_PAGE_SIZE))}
                        >
                          Tiếp
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'medications' && (
        <section className="pharmacy-section">
          <div className="pharmacy-toolbar">
            <div className="pharmacy-search">
              <Search size={16} />
              <input
                type="text"
                size="29"
                value={medSearch}
                onChange={(event) => setMedSearch(event.target.value)}
                placeholder="Tìm theo mã, tên thuốc, nhà cung cấp"
              />
            </div>

            <select value={medActive} onChange={(event) => setMedActive(event.target.value)}>
              <option value="">Tất cả</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Ngừng hoạt động</option>
            </select>
            <button type="button" className="pharmacy-primary" onClick={() => openMedicationModal(null)}>
              <Plus size={16} />
              Thêm thuốc
            </button>
          </div>

          <div className="pharmacy-card">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên thuốc</th>
                  <th>Hàm lượng</th>
                  <th>Nhà cung cấp</th>
                  <th>Dạng thuốc</th>
                  <th>Đơn vị</th>
                  <th>Mức tối thiểu</th>
                  <th>Tồn kho</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {medLoading && (
                  <tr>
                    <td colSpan="10" className="pharmacy-empty">Đang tải danh sách thuốc...</td>
                  </tr>
                )}
                {!medLoading && medications.length === 0 && (
                  <tr>
                    <td colSpan="10" className="pharmacy-empty">Không tìm thấy thuốc.</td>
                  </tr>
                )}

                {!medLoading &&
                  medications.map((med) => (
                    <tr key={med._id}>
                      <td>{med.medicationCode}</td>
                      <td>
                        <strong>{med.name}</strong>
                      </td>
                      <td>{med.strength || 'N/A'}</td>
                      <td className="pharmacy-supplier">{med.manufacturer || '—'}</td>
                      <td>{med.form || 'N/A'}</td>
                      <td>{med.unit || '—'}</td>
                      <td>{med.minStockLevel}</td>
                      <td>{med.availableQuantity ?? 'N/A'}</td>
                      <td>
                        <span className={`status-pill ${med.isActive ? 'active' : 'inactive'}`}>
                          {med.isActive ? 'Hoạt động' : 'Ngừng'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="pharmacy-action" onClick={() => openMedicationModal(med)}>
                          <Edit3 size={14} />
                          Sửa
                        </button>
                        <button type="button" className="pharmacy-action ghost" onClick={() => openNotes(med)}>
                          <FileText size={14} />
                          Ghi chú
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="pharmacy-pagination">
            <button
              type="button"
              onClick={() => setMedPage((prev) => Math.max(1, prev - 1))}
              disabled={medPage <= 1}
            >
              <ChevronLeft size={16} />
              Trước
            </button>
            <span>
              Trang {medPage} / {medTotalPages}
            </span>
            <button
              type="button"
              onClick={() => setMedPage((prev) => Math.min(medTotalPages, prev + 1))}
              disabled={medPage >= medTotalPages}
            >
              Tiếp
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {activeTab === 'suppliers' && (
        <section className="pharmacy-section">
          <div className="pharmacy-toolbar">
            <div className="pharmacy-search">
              <Search size={16} />
              <input
                type="text"
                size="31"
                value={supSearch}
                onChange={(event) => setSupSearch(event.target.value)}
                placeholder="Tìm theo nhà cung cấp, điện thoại, email"
              />
            </div>
            <select value={supActive} onChange={(event) => setSupActive(event.target.value)}>
              <option value="">Tất cả</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Ngừng hoạt động</option>
            </select>
            <button type="button" className="pharmacy-primary" onClick={() => openSupplierModal(null)}>
              <Plus size={16} />
              Thêm nhà cung cấp
            </button>
          </div>

          <div className="suppliers-grid">
            {supLoading && (
              <div className="pharmacy-empty-full">Đang tải nhà cung cấp...</div>
            )}
            {!supLoading && suppliers.length === 0 && (
              <div className="pharmacy-empty-full">Không tìm thấy nhà cung cấp.</div>
            )}
            {!supLoading &&
              suppliers.map((supplier) => (
                <div key={supplier._id} className="supplier-card">
                  <div className="supplier-card__header">
                    <div>
                      <h3>{supplier.name}</h3>
                      <span className={`status-pill ${supplier.isActive ? 'active' : 'inactive'}`}>
                        {supplier.isActive ? 'Hoạt động' : 'Ngừng'}
                      </span>
                    </div>
                    <Truck size={20} className="supplier-card__icon" />
                  </div>

                  <div className="supplier-card__content">
                    <div className="supplier-info">
                      <Phone size={16} />
                      <span>{supplier.phone || 'N/A'}</span>
                    </div>
                    <div className="supplier-info">
                      <Mail size={16} />
                      <span>{supplier.email || 'N/A'}</span>
                    </div>
                    <div className="supplier-info">
                      <MapPin size={16} />
                      <span>{supplier.address || 'N/A'}</span>
                    </div>

                    {supplier.contactName && (
                      <div className="supplier-contact-name">
                        <strong>Người liên hệ:</strong> {supplier.contactName}
                      </div>
                    )}
                  </div>

                  <div className="supplier-card__footer">
                    <button type="button" className="pharmacy-action" onClick={() => openSupplierModal(supplier)}>
                      <Edit3 size={14} />
                      Sửa
                    </button>

                    {supplier.isActive && (
                      <button
                        type="button"
                        className="pharmacy-action ghost"
                        onClick={() => deactivateSupplier(supplier._id)}
                      >
                        Vô hiệu hóa
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>

          <div className="pharmacy-pagination">
            <button
              type="button"
              onClick={() => setSupPage((prev) => Math.max(1, prev - 1))}
              disabled={supPage <= 1}
            >
              <ChevronLeft size={16} />
              Trước
            </button>
            <span>Trang {supPage} / {supTotalPages}</span>
            <button
              type="button"
              onClick={() => setSupPage((prev) => Math.min(supTotalPages, prev + 1))}
              disabled={supPage >= supTotalPages}
            >
              Tiếp
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {activeTab === 'stocks' && (
        <section className="pharmacy-section">
            <div className="pharmacy-toolbar wide">
            <select
              value={stockFilters.medicationId}
              onChange={(event) =>
                setStockFilters((prev) => ({ ...prev, medicationId: event.target.value }))
              }
            >
              <option value="">Tất cả thuốc</option>
              {medicationOptions.map((med) => (
                <option key={med._id} value={med._id}>{med.name}</option>
              ))}
            </select>
            <select
              value={stockFilters.supplierId}
              onChange={(event) =>
                setStockFilters((prev) => ({ ...prev, supplierId: event.target.value }))
              }
            >
              <option value="">Tất cả nhà cung cấp</option>
              {supplierOptions
                .filter((sup) => sup.isActive !== false)
                .map((sup) => (
                  <option key={sup._id} value={sup._id}>{sup.name}</option>
                ))}
            </select>
            <button type="button" className="pharmacy-primary" onClick={() => openStockModal(null)}>
              <Plus size={16} />
              Nhập thuốc
            </button>
          </div>

          <div className="pharmacy-card">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>Số lô</th>
                  <th>Tên thuốc</th>
                  <th className="pharmacy-supplier-col">Nhà cung cấp</th>
                  <th>Dạng thuốc</th>
                  <th>Đơn vị</th>
                  <th>Giá</th>
                  <th>Số lượng</th>
                  <th>Hạn dùng</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {stockLoading && (
                  <tr>
                    <td colSpan="9" className="pharmacy-empty">Đang tải dữ liệu tồn kho...</td>
                  </tr>
                )}
                {!stockLoading && stocks.length === 0 && (
                  <tr>
                    <td colSpan="9" className="pharmacy-empty">Không tìm thấy lịch sử nhập thuốc.</td>
                  </tr>
                )}
                {!stockLoading &&
                  stocks.map((stock) => (
                    <tr key={stock._id}>
                      <td>{stock.lotNumber || 'N/A'}</td>
                      <td>{stock.medicationId?.name || stock.medicationId}</td>
                      <td className="pharmacy-supplier">{stock.supplierId?.name || stock.supplierId || 'N/A'}</td>
                      <td>{stock.medicationId?.form || medicationOptions.find((med) => String(med._id) === String(stock.medicationId?._id || stock.medicationId))?.form || 'N/A'}</td>
                      <td>{stock.unit || 'N/A'}</td>
                      <td>{formatCurrency(stock.costPerUnit)}</td>
                      <td>{stock.quantity}</td>
                      <td>{formatDate(stock.expiryDate)}</td>
                      <td>
                        <button type="button" className="pharmacy-action" onClick={() => openStockModal(stock)}>
                          <Edit3 size={14} />
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="pharmacy-pagination">
            <button
              type="button"
              onClick={() => setStockPage((prev) => Math.max(1, prev - 1))}
              disabled={stockPage <= 1}
            >
              <ChevronLeft size={16} />
              Trước
            </button>
            <span>Trang {stockPage} / {stockTotalPages}</span>
            <button
              type="button"
              onClick={() => setStockPage((prev) => Math.min(stockTotalPages, prev + 1))}
              disabled={stockPage >= stockTotalPages}
            >
              Tiếp
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {activeTab === 'reports' && (
        <section className="pharmacy-section">
          <div className="reports-header">
            <div className="reports-title">
              <BarChart3 size={20} />
              <div>
                <h2>Báo cáo cấp phát thuốc</h2>
                <p>Chi tiết số lần cấp phát thuốc cho bệnh nhân</p>
              </div>
            </div>
            
            <div className="date-range-picker">
              <label>
                <span>Từ ngày</span>
                <input
                  type="date"
                  value={usageRange.from}
                  onChange={(event) => setUsageRange((prev) => ({ ...prev, from: event.target.value }))}
                />
              </label>

              <label>
                <span>Đến ngày</span>
                <input
                  type="date"
                  value={usageRange.to}
                  onChange={(event) => setUsageRange((prev) => ({ ...prev, to: event.target.value }))}
                />
              </label>

              <button type="button" className="pharmacy-primary" onClick={loadUsageStats}>
                <RefreshCw size={16} />
                Làm mới
              </button>
              <button type="button" className="pharmacy-export" onClick={exportToExcel}>
                <Download size={16} />
                Xuất Excel
              </button>
            </div>
          </div>

          <div className="pharmacy-card">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>
                    <span className="table-header-with-icon">
                      <Pill size={16} />
                      Tên thuốc
                    </span>
                  </th>
                  <th>
                    <span className="table-header-with-icon">
                      <Activity size={16} />
                      Tên bệnh nhân
                    </span>
                  </th>
                  <th>
                    <span className="table-header-with-icon">
                      <Clock size={16} />
                      Thời gian cấp phát
                    </span>
                  </th>
                  <th>Số lần cấp phát</th>
                  <th>Tổng đã cấp phát (Lần)</th>
                </tr>
              </thead>
              <tbody>
                {usageLoading && (
                  <tr>
                    <td colSpan="5" className="pharmacy-empty">Đang tải dữ liệu...</td>
                  </tr>
                )}
                {!usageLoading && aggregatedReportData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="pharmacy-empty">Không tìm thấy dữ liệu cấp phát.</td>
                  </tr>
                )}
                {!usageLoading &&
                  aggregatedReportData.map((row, idx) => (
                    <tr key={idx}>
                      <td><strong>{row.medicationName || 'N/A'}</strong></td>
                      <td>{row.patientName || 'N/A'}</td>
                      <td className="report-time">
                        {row.lastDispensedTime ? new Date(row.lastDispensedTime).toLocaleString('vi-VN') : 'N/A'}
                      </td>
                      <td className="report-number">{row.dispensCount}</td>
                      <td className="report-number">{row.totalQuantity}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showMedicationModal && (
        <div className="pharmacy-modal">
          <div className="pharmacy-modal__content">
            <div className="pharmacy-modal__header">
              <div>
                <h2>{editingMedication ? 'Chỉnh sửa thuốc' : 'Thêm thuốc'}</h2>
                <p>Quản lý thông tin thuốc và mức tồn kho tối thiểu.</p>
              </div>
              <button type="button" onClick={() => setShowMedicationModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="pharmacy-modal__body" onSubmit={saveMedication}>
              <div className="pharmacy-form-grid">
                <label className="full">
                  Tên thuốc*
                  <input
                    type="text"
                    placeholder="Paracetamol"
                    value={medicationForm.name}
                    onFocus={() => setShowNameSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowNameSuggestions(false), 120)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowNameSuggestions(false);
                    }}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  {showNameSuggestions && nameSuggestions.length > 0 && (
                    <ul className="pharmacy-suggestions">
                      {nameSuggestions.map((s) => (
                        <li
                          key={s._id}
                          onMouseDown={() => {
                            setMedicationForm((prev) => ({ ...prev, name: s.name }));
                            setShowNameSuggestions(false);
                          }}
                        >
                          <strong>{s.name}</strong>
                          <div className="pharmacy-muted" style={{ fontSize: 12 }}>{s.manufacturer || ''}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </label>

                <label>
                  Dạng thuốc
                  <select
                    value={medicationForm.form}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, form: event.target.value }))
                    }
                  >
                    <option value="">-- Chọn dạng thuốc --</option>
                    {[...new Set([...DEFAULT_FORMS_VN, ...(medicationFormOptions.forms || [])])].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </label>
                
                <label>
                  Hàm lượng
                  <select
                    value={medicationForm.strength}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, strength: event.target.value }))
                    }
                  >
                    <option value="">-- Chọn hàm lượng --</option>
                    {withFallbackOption(combinedStrengthOptions, medicationForm.strength).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                
                <label>
                  Đơn vị
                  <select
                    value={medicationForm.unit}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, unit: event.target.value }))
                    }
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    {combinedUnitOptions.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </label>
                
                <label>
                  Nhà cung cấp
                  <select
                    value={medicationForm.manufacturer}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, manufacturer: event.target.value }))
                    }
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {supplierOptions
                      .filter((s) => s.isActive !== false)
                      .map((s) => (
                        <option key={s._id} value={s.name}>{s.name}</option>
                      ))}
                  </select>
                </label>
                
                <label>
                  Mức tối thiểu
                  <input
                    type="number"
                    value={medicationForm.minStockLevel}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, minStockLevel: event.target.value }))
                    }
                  />
                </label>
                
                <label>
                  Trạng thái
                  <select
                    value={medicationForm.isActive ? 'true' : 'false'}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))
                    }
                  >
                    <option value="true">Hoạt động</option>
                    <option value="false">Ngừng</option>
                  </select>
                </label>                
              </div>

              {medicationError && <p className="pharmacy-error">{medicationError}</p>}
              {medicationMessage && <p className="pharmacy-success">{medicationMessage}</p>}

                  <div className="pharmacy-modal__footer">
                <button type="button" onClick={() => setShowMedicationModal(false)} className="ghost">
                  Hủy
                </button>
                <button type="submit" className="pharmacy-primary" disabled={medicationSaving}>
                  <Save size={14} />
                  {medicationSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSupplierModal && (
        <div className="pharmacy-modal">
          <div className="pharmacy-modal__content">
            <div className="pharmacy-modal__header">
              <div>
                <h2>{editingSupplier ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp'}</h2>
                <p>Quản lý thông tin liên hệ và chi tiết cung cấp.</p>
              </div>
              <button type="button" onClick={() => setShowSupplierModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="pharmacy-modal__body" onSubmit={saveSupplier}>
              <div className="pharmacy-form-grid">
                <label>
                  Tên*
                  <input
                    type="text"
                    placeholder="Tên nhà cung cấp"
                    value={supplierForm.name}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Người liên hệ
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={supplierForm.contactName}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, contactName: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Điện thoại
                  <input
                    type="text"
                    placeholder="0398765432"
                    value={supplierForm.phone}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    placeholder="Nhập email"
                    value={supplierForm.email}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                </label>

                <label className="full">
                  Địa chỉ
                  <input
                    type="text"
                    placeholder="Nhập địa chỉ"
                    value={supplierForm.address}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Trạng thái
                  <select
                    value={supplierForm.isActive ? 'true' : 'false'}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))
                    }
                  >
                    <option value="true">Hoạt động</option>
                    <option value="false">Ngừng</option>
                  </select>
                </label>
              </div>

              {supplierError && <p className="pharmacy-error">{supplierError}</p>}
              {supplierMessage && <p className="pharmacy-success">{supplierMessage}</p>}

              <div className="pharmacy-modal__footer">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="ghost">
                  Hủy
                </button>
                <button type="submit" className="pharmacy-primary" disabled={supplierSaving}>
                  <Save size={14} />
                  {supplierSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStockModal && (
        <div className="pharmacy-modal">
          <div className="pharmacy-modal__content">
            <div className="pharmacy-modal__header">
              <div>
                <h2>{editingStock ? 'Chỉnh sửa lịch sử nhập thuốc' : 'Nhập thuốc mới'}</h2>
                <p>Ghi lại lịch sử và thông tin lô hàng.</p>
              </div>
              <button type="button" onClick={() => setShowStockModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="pharmacy-modal__body" onSubmit={saveStock}>
              <div className="pharmacy-form-grid">
                <label>
                  Thuốc *
                      <select
                        value={stockForm.medicationId}
                        onChange={handleStockMedicationChange}
                      >
                        <option value="">-- Chọn thuốc --</option>
                        {medicationOptions.map((med) => (
                          <option key={med._id} value={med._id} disabled={med.isActive === false}>
                            {med.name}{med.isActive === false ? ' (Ngừng hoạt động)' : ''}
                          </option>
                        ))}
                      </select>
                </label>

                <label>
                  Nhà cung cấp
                      <select
                        value={stockForm.supplierId}
                        onChange={(event) =>
                          setStockForm((prev) => ({ ...prev, supplierId: event.target.value }))
                        }
                        disabled={!!editingStock}
                      >
                        <option value="">-- Chọn nhà cung cấp --</option>
                        {supplierOptions.map((sup) => (
                          <option key={sup._id} value={sup._id} disabled={sup.isActive === false}>
                            {sup.name}{sup.isActive === false ? ' (Ngừng hoạt động)' : ''}
                          </option>
                        ))}
                      </select>
                </label>
          
                <label>
                  Số lượng *
                  <input
                    type="number"
                    min="0"
                    value={stockForm.quantity}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, quantity: event.target.value }))
                    }
                    readOnly={!!editingStock}
                  />
                  <div className="pharmacy-field-meta">
                    <small>{editingStock ? '' : ''}</small>
                  </div>
                </label>

                <label>
                  Ngày hết hạn
                  <input
                    type="datetime-local"
                    min={localDateTimeNow()}
                    value={stockForm.expiryDate}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, expiryDate: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Ngày nhập thuốc
                  <input
                    type="datetime-local"
                    min={localDateTimeNow()}
                    value={stockForm.receivedDate}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, receivedDate: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Giá mỗi đơn vị
                  <input
                    type="number"
                    min="0"
                    value={stockForm.costPerUnit}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, costPerUnit: event.target.value }))
                    }
                  />
                </label>
              </div>

              {stockError && <p className="pharmacy-error">{stockError}</p>}
              {stockMessage && <p className="pharmacy-success">{stockMessage}</p>}

              <div className="pharmacy-modal__footer">
                <button type="button" onClick={() => setShowStockModal(false)} className="ghost">
                  Hủy
                </button>
                <button type="submit" className="pharmacy-primary" disabled={stockSaving}>
                  <Save size={14} />
                  {stockSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNoteModal && (
        <div className="pharmacy-modal">
          <div className="pharmacy-modal__content">
            <div className="pharmacy-modal__header">
              <div>
                <h2>Ghi chú thuốc</h2>
                <p>{noteMedication?.name}</p>
              </div>
              <button type="button" onClick={() => setShowNoteModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="pharmacy-modal__body">
              
              <form className="pharmacy-form" onSubmit={addNote}>
                <textarea
                  rows="3"
                  placeholder="Thêm ghi chú"
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                />
                <button type="submit" className="pharmacy-primary">Thêm ghi chú</button>
                {noteError && <p className="pharmacy-error">{noteError}</p>}
              </form>

              {noteLoading ? (
                <p className="pharmacy-empty">Đang tải ghi chú...</p>
              ) : (
                <ul className="pharmacy-list">
                  {notes.length === 0 && <li className="pharmacy-empty">Chưa có ghi chú.</li>}
                  {notes.map((note) => (
                    <li key={note._id}>
                      <span>{note.note}</span>
                      <strong>{formatDateTime(note.createdAt)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PharmacyPage;
