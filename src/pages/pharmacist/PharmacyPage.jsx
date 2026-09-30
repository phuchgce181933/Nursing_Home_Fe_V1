import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Edit2,
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
import { useToast } from '../../hooks/useToast';
import {
  validateMedicationForm,
  buildMedicationPayload,
  validateSupplierForm,
  buildSupplierPayload,
  validateStockForm,
  getApiErrorMessage,
} from '../../utils/pharmacyValidation';

const TABS = [
  { id: 'overview', i18nKey: 'pharmacyPage.tabOverview', icon: Activity },
  { id: 'medications', i18nKey: 'pharmacyPage.tabMedications', icon: Pill },
  { id: 'suppliers', i18nKey: 'pharmacyPage.tabSuppliers', icon: Truck },
  { id: 'stocks', i18nKey: 'pharmacyPage.tabStocks', icon: PackageOpen },
  { id: 'priceList', i18nKey: 'pharmacyPage.tabPriceList', icon: TrendingUp },
  { id: 'reports', i18nKey: 'pharmacyPage.tabReports', icon: Activity },
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
];

const OTHER_OPTION_VALUE = '__OTHER__';

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
    return { labelKey: 'pharmacyPage.expiryNotExist', badgeClass: 'expiry-badge--black', itemClass: 'expiry-item--black' };
  }
  if (days < 0) {
    return { labelKey: 'pharmacyPage.expiryExpired', badgeClass: 'expiry-badge--gray', itemClass: 'expiry-item--gray' };
  }
  if (days < 90) {
    return { labelKey: 'pharmacyPage.expiryLess3Months', badgeClass: 'expiry-badge--red', itemClass: 'expiry-item--red' };
  }
  if (days < 180) {
    return { labelKey: 'pharmacyPage.expiry3To6Months', badgeClass: 'expiry-badge--purple', itemClass: 'expiry-item--purple' };
  }
  if (days < 365) {
    return { labelKey: 'pharmacyPage.expiry6To12Months', badgeClass: 'expiry-badge--blue', itemClass: 'expiry-item--blue' };
  }
  return { labelKey: 'pharmacyPage.expiryMore12Months', badgeClass: 'expiry-badge--green', itemClass: 'expiry-item--green' };
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
  formOther: false,
  strength: '',
  unit: '',
  strengthOther: false,
  unitOther: false,
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
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const location = useLocation();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [lowStock, setLowStock] = useState([]);
  const [expiryList, setExpiryList] = useState([]);
  const [priceBelowCost, setPriceBelowCost] = useState([]);
  const [overviewLowStockPage, setOverviewLowStockPage] = useState(1);
  const [overviewExpiryPage, setOverviewExpiryPage] = useState(1);
  const [overviewPriceBelowCostPage, setOverviewPriceBelowCostPage] = useState(1);

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

  // Price List state
  const [priceList, setPriceList] = useState([]);
  const [priceListLoading, setPriceListLoading] = useState(false);
  const [priceListPage, setPriceListPage] = useState(1);
  const [priceListTotalPages, setPriceListTotalPages] = useState(1);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceWarning, setPriceWarning] = useState(null); // { medicationId, newPrice, maxCost }

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

  // Computed: medications where selling price < max batch cost
  const priceBelowCostList = useMemo(() => {
    if (!priceList || priceList.length === 0) return [];
    return priceList
      .map((item) => {
        const batchCosts = (item.batches || [])
          .map((b) => b.costPerUnit)
          .filter((c) => c != null && c > 0);
        const maxCost = batchCosts.length > 0 ? Math.max(...batchCosts) : 0;
        if (maxCost > 0 && item.sellingPrice < maxCost) {
          return { ...item, maxCost };
        }
        return null;
      })
      .filter(Boolean);
  }, [priceList]);


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

  // Price List - load from stocks with medication's selling price
  const loadPriceList = useCallback(async () => {
    try {
      setPriceListLoading(true);
      // Get all stocks and medications to build price list
      const page = normalizePage(priceListPage);
      
      // First get medications with their prices
      const medRes = await pharmacyService.listMedications({
        isActive: true,
        page: 1,
        limit: 500, // Get all for price list
      });
      
      const medications = medRes?.data || [];
      
      // Then get stocks for each medication to get batch info and cost
      const priceListData = [];
      for (const med of medications) {
        const stockRes = await pharmacyService.listStocks({
          medicationId: med._id,
          limit: 10,
        });
        const stocks = stockRes?.data || [];
        
        // Get latest stock with cost info
        const latestStock = stocks.length > 0 ? stocks[0] : null;
        
        // Get all unique batches
        const uniqueBatches = stocks.reduce((acc, stock) => {
          if (stock.lotNumber) {
            const existing = acc.find(b => b.lotNumber === stock.lotNumber);
            if (!existing) {
              acc.push({
                lotNumber: stock.lotNumber,
                supplierId: stock.supplierId,
                supplierName: stock.supplierId?.name || '',
                costPerUnit: stock.costPerUnit,
                expiryDate: stock.expiryDate,
              });
            }
          }
          return acc;
        }, []);
        
        priceListData.push({
          medicationId: med._id,
          medicationName: med.name,
          sellingPrice: med.price || 0,
          supplierName: latestStock?.supplierId?.name || med.supplierId?.name || '',
          batches: uniqueBatches.length > 0 ? uniqueBatches : [{ lotNumber: 'N/A' }],
        });
      }
      
      // Sort by medication name
      priceListData.sort((a, b) => a.medicationName.localeCompare(b.medicationName));
      
      // Paginate
      const startIndex = (page - 1) * PAGE_SIZE;
      const paginatedData = priceListData.slice(startIndex, startIndex + PAGE_SIZE);
      
      setPriceList(paginatedData);
      setPriceListPage(page);
      setPriceListTotalPages(calculateTotalPages(priceListData.length, PAGE_SIZE));
    } catch (err) {
      console.error('Error loading price list:', err);
    } finally {
      setPriceListLoading(false);
    }
  }, [priceListPage]);

  const handleEditPrice = (medicationId, currentPrice) => {
    setEditingPriceId(medicationId);
    setEditingPriceValue(currentPrice || '');
  };

  const handleSavePrice = async () => {
    if (!editingPriceId) return;
    const newPrice = Number(editingPriceValue);
    // Find the medication in priceList to check all batch costs
    const item = priceList.find((i) => i.medicationId === editingPriceId);
    if (item && item.batches) {
      const batchCosts = item.batches
        .map((b) => b.costPerUnit)
        .filter((c) => c != null && c > 0);
      const maxCost = Math.max(...batchCosts);
      if (batchCosts.length > 0 && newPrice < maxCost) {
        setPriceWarning({ medicationId: editingPriceId, newPrice, maxCost });
        return;
      }
    }
    await doSavePrice(editingPriceId, newPrice);
  };

  const doSavePrice = async (medicationId, newPrice) => {
    try {
      setPriceSaving(true);
      setPriceWarning(null);
      await pharmacyService.updateSellingPrice(medicationId, newPrice);
      showToast(t('pharmacyPage.updatePriceSuccess'), 'success');
      setEditingPriceId(null);
      setEditingPriceValue('');
      loadPriceList();
    } catch (err) {
      showToast(err?.response?.data?.message || t('pharmacyPage.updatePriceError'), 'error');
    } finally {
      setPriceSaving(false);
    }
  };

  const handlePriceWarningConfirm = () => {
    if (priceWarning) {
      doSavePrice(priceWarning.medicationId, priceWarning.newPrice);
    }
  };

  const handlePriceWarningCancel = () => {
    setPriceWarning(null);
  };

  const handleCancelEditPrice = () => {
    setEditingPriceId(null);
    setEditingPriceValue('');
  };

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
      showToast(t('pharmacyPage.noDataToExport'), 'error');
      return;
    }

    const data = aggregatedReportData.map((item) => ({
      [t('pharmacyPage.colMedicationName')]: item.medicationName || 'N/A',
      [t('pharmacyPage.colPatientName')]: item.patientName || 'N/A',
      [t('pharmacyPage.colDispensedTime')]: item.lastDispensedTime ? new Date(item.lastDispensedTime).toLocaleString('vi-VN') : 'N/A',
      [t('pharmacyPage.colDispensCount')]: item.dispensCount,
      [t('pharmacyPage.colTotalQuantity')]: item.totalQuantity,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t('pharmacyPage.excelSheetName'));

    const colWidths = [
      { wch: 25 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
    ];
    worksheet['!cols'] = colWidths;

    const filename = t('pharmacyPage.excelFilename');

    XLSX.writeFile(workbook, filename);
  }, [aggregatedReportData, usageRange, t]);

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
    const known = TABS.map((tab) => tab.id);
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
      loadPriceList();
    }
  }, [activeTab, loadExpiry, loadPriceList]);

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
    if (activeTab === 'priceList') {
      loadPriceList();
    }
  }, [activeTab, priceListPage]);

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
      const formOptions = [...new Set([...DEFAULT_FORMS_VN, ...(medicationFormOptions.forms || [])])];
      const strengthOptions = combinedStrengthOptions;
      const unitOptions = combinedUnitOptions;
      setMedicationForm({
        medicationCode: medication.medicationCode || '',
        name: medication.name || '',
        form: medication.form || '',
        formOther: Boolean(medication.form && !formOptions.includes(medication.form)),
        strength: medication.strength || '',
        unit: medication.unit || '',
        strengthOther: Boolean(medication.strength && !strengthOptions.includes(medication.strength)),
        unitOther: Boolean(medication.unit && !unitOptions.includes(medication.unit)),
        manufacturer: medication.manufacturer || '',
        description: medication.description || '',
        minStockLevel: medication.minStockLevel || 0,
        price: medication.price ?? '',
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
        setMedicationMessage(t('pharmacyPage.updateMedicationSuccess'));
      } else {
        await pharmacyService.createMedication(payload);
        setMedicationMessage(t('pharmacyPage.addMedicationSuccess'));
      }
      setMedicationError(null);
      setShowMedicationModal(false);
      loadMedications();
      loadLowStock();
      loadSummary();
    } catch (err) {
      setMedicationError(getApiErrorMessage(err, t('pharmacyPage.saveMedicationError')));
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
        setSupplierMessage(t('pharmacyPage.updateSupplierSuccess'));
      } else {
        await pharmacyService.createSupplier(payload);
        setSupplierMessage(t('pharmacyPage.addSupplierSuccess'));
      }
      setSupplierError(null);
      setShowSupplierModal(false);
      loadSuppliers();
      loadSummary();
    } catch (err) {
      setSupplierError(getApiErrorMessage(err, t('pharmacyPage.saveSupplierError')));
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
    const validation = validateStockForm(stockForm, medicationOptions, supplierOptions, !!editingStock);
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
      const payload = editingStock
        ? {
          expiryDate: stockForm.expiryDate ? toIsoDate(stockForm.expiryDate) : undefined,
          costPerUnit: stockForm.costPerUnit ? Number(stockForm.costPerUnit) : undefined,
        }
        : {
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
        setStockMessage(t('pharmacyPage.updateStockSuccess'));
        loadStocks();
      } else {
        await pharmacyService.createStock(payload);
        setStockMessage(t('pharmacyPage.addStockSuccess'));
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
      setStockError(getApiErrorMessage(err, t('pharmacyPage.saveStockError')));
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
      setNoteError(t('pharmacyPage.cannotLoadNotes'));
    } finally {
      setNoteLoading(false);
    }
  };

  const addNote = async (event) => {
    if (event) event.preventDefault();
    if (!noteMedication) return;
    if (!noteText.trim()) {
      setNoteError(t('pharmacyPage.noteRequired'));
      return;
    }

    try {
      setNoteError(null);
      await pharmacyService.addMedicationNote(noteMedication._id, { note: noteText.trim() });
      const res = await pharmacyService.listMedicationNotes(noteMedication._id, { page: 1, limit: 10 });
      setNotes(res?.data || []);
      setNoteText('');
    } catch (err) {
      setNoteError(t('pharmacyPage.cannotAddNote'));
    }
  };

  return (
    <div className="pharmacy-page">
      <header className="pharmacy-header">
        <div>
          <h1>{t('pharmacyPage.pageTitle')}</h1>
          <p>{t('pharmacyPage.pageSubtitle')}</p>
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
                  const roles = ['pharmacist', 'admin', 'nurse', 'doctor', 'caregiver', 'family'];
                  const roleIdx = parts.findIndex((p) => roles.includes(p));
                  let newPath = '';
                  if (roleIdx !== -1) {
                    if (parts[roleIdx] === 'admin') {
                      newPath = `/admin/medications?tab=${tab.id}`;
                    } else {
                      newPath = `/${parts[roleIdx]}/${tab.id}`;
                    }
                  } else {
                    const known = TABS.map((tab) => tab.id);
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
              {t(tab.i18nKey)}
            </button>
          );
        })}
      </nav>

      {priceWarning && (
        <div className="pharmacy-price-warning">
          <AlertTriangle size={20} />
          <span>
            Đơn giá bán (<strong>{formatCurrency(priceWarning.newPrice)}</strong>) thấp hơn giá nhập của một số lô (cao nhất: <strong>{formatCurrency(priceWarning.maxCost)}</strong>). Bạn có chắc muốn tiếp tục?
          </span>
          <button type="button" className="pharmacy-warning-confirm" onClick={handlePriceWarningConfirm} disabled={priceSaving}>
            {priceSaving ? '...' : t('pharmacyPage.confirmPriceWarning')}
          </button>
          <button type="button" className="pharmacy-warning-cancel" onClick={handlePriceWarningCancel}>
            {t('pharmacyPage.cancel')}
          </button>
        </div>
      )}

      {activeTab === 'overview' && (
        <section className="pharmacy-section">
          <div className="pharmacy-summary">
            <div className="summary-card summary-card--active">
              <div className="summary-card__icon">
                <CheckCircle2 size={24} />
              </div>
              <div className="summary-card__content">
                <span>{t('pharmacyPage.activeMedications')}</span>
                <strong>{summary?.activeMedications ?? '--'}</strong>
              </div>
            </div>

            <div className="summary-card summary-card--active">
              <div className="summary-card__icon">
                <CheckCircle2 size={24} />
              </div>
              <div className="summary-card__content">
                <span>{t('pharmacyPage.activeSuppliers')}</span>
                <strong>{summary?.activeSuppliers ?? '--'}</strong>
              </div>
            </div>

            <div className="summary-card summary-card--warning">
              <div className="summary-card__icon">
                <AlertCircle size={24} />
              </div>
              <div className="summary-card__content">
                <span>{t('pharmacyPage.lowStockAlerts')}</span>
                <strong>{summary?.lowStockCount ?? '--'}</strong>
              </div>
            </div>

            <div className="summary-card summary-card--expiring">
              <div className="summary-card__icon">
                <Clock size={24} />
              </div>
              <div className="summary-card__content">
                <span>{t('pharmacyPage.expiringSoon')}</span>
                <strong>{summary?.expiringSoonCount ?? '--'}</strong>
              </div>
            </div>
          </div>

          <div className="pharmacy-grid">
            <div className="pharmacy-card">
              <div className="pharmacy-card__header">
                <div>
                  <strong>{t('pharmacyPage.lowStockAlerts')}</strong>
                  <strong className="pharmacy-card__meta">{t('pharmacyPage.lowStockCount', { count: lowStock.length })}</strong>
                </div>
                <AlertTriangle size={18} />
              </div>

              <div className="pharmacy-card__body">
                {lowStock.length === 0 ? (
                  <p className="pharmacy-empty">{t('pharmacyPage.noLowStockAlerts')}</p>
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
                                  ? t('pharmacyPage.supplierOf', { name: item.medication.manufacturer })
                                  : t('pharmacyPage.noSupplier')}
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
                          {t('pharmacyPage.prev')}
                        </button>
                        <span>{t('pharmacyPage.page', { current: overviewLowStockPage, total: Math.max(1, Math.ceil(lowStock.length / OVERVIEW_PAGE_SIZE)) })}</span>
                        <button
                          type="button"
                          onClick={() => setOverviewLowStockPage((prev) => Math.min(Math.max(1, Math.ceil(lowStock.length / OVERVIEW_PAGE_SIZE)), prev + 1))}
                          disabled={overviewLowStockPage >= Math.max(1, Math.ceil(lowStock.length / OVERVIEW_PAGE_SIZE))}
                        >
                          {t('pharmacyPage.next')}
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
                  <strong>{t('pharmacyPage.medicationStatusTitle')}</strong>
                  <strong className="pharmacy-card__meta">{t('pharmacyPage.importedCount', { count: expiryList.length })}</strong>
                </div>
                <PackageOpen size={18} />
              </div>
              <div className="pharmacy-card__body">
                <div className="expiry-legend">
                  <span className="expiry-badge expiry-badge--green">{t('pharmacyPage.expiryLegendNormal')}</span>
                  <span className="expiry-badge expiry-badge--blue">{t('pharmacyPage.expiryLegendMonitor')}</span>
                  <span className="expiry-badge expiry-badge--purple">{t('pharmacyPage.expiryLegendPriority')}</span>
                  <span className="expiry-badge expiry-badge--red">{t('pharmacyPage.expiryLegendUrgent')}</span>
                  <span className="expiry-badge expiry-badge--gray">{t('pharmacyPage.expiryExpired')}</span>
                </div>

                {expiryList.length === 0 ? (
                  <p className="pharmacy-empty">{t('pharmacyPage.noExpiringItems')}</p>
                ) : (
                  <>
                    <ul className="pharmacy-list pharmacy-list--expiry">
                      {expiryList
                        .slice((overviewExpiryPage - 1) * OVERVIEW_PAGE_SIZE, overviewExpiryPage * OVERVIEW_PAGE_SIZE)
                        .map((item) => {
                          const expiryTag = getExpiryTag(item.expiryDate);
                          const supplierName = item.supplierId?.name || t('pharmacyPage.noSupplier');
                          const medicationLabel = item.medicationId?.name || item.medicationId?.medicationCode || item.medicationId || t('pharmacyPage.unknownMedication');

                          return (
                            <li key={item._id} className={`pharmacy-list-item--expiry ${expiryTag.itemClass}`}>
                              <div>
                                <span className="pharmacy-list__title">{medicationLabel}</span>
                                <span className="pharmacy-list__meta">{t('pharmacyPage.supplierOf', { name: supplierName })}</span>
                              </div>
                              <div className="pharmacy-list__details">
                                <span className={`expiry-badge ${expiryTag.badgeClass}`}>{t(expiryTag.labelKey)}</span>
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
                          {t('pharmacyPage.prev')}
                        </button>
                        <span>{t('pharmacyPage.page', { current: overviewExpiryPage, total: Math.max(1, Math.ceil(expiryList.length / OVERVIEW_PAGE_SIZE)) })}</span>
                        <button
                          type="button"
                          onClick={() => setOverviewExpiryPage((prev) => Math.min(Math.max(1, Math.ceil(expiryList.length / OVERVIEW_PAGE_SIZE)), prev + 1))}
                          disabled={overviewExpiryPage >= Math.max(1, Math.ceil(expiryList.length / OVERVIEW_PAGE_SIZE))}
                        >
                          {t('pharmacyPage.next')}
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {priceBelowCostList.length > 0 && (
              <div className="pharmacy-card">
                <div className="pharmacy-card__header">
                  <div>
                    <strong>{t('pharmacyPage.priceBelowCostTitle')}</strong>
                    <strong className="pharmacy-card__meta">{t('pharmacyPage.priceBelowCostCount', { count: priceBelowCostList.length })}</strong>
                  </div>
                  <AlertTriangle size={18} />
                </div>
                <div className="pharmacy-card__body">
                  <ul className="pharmacy-list pharmacy-list--compact">
                    {priceBelowCostList
                      .slice((overviewPriceBelowCostPage - 1) * OVERVIEW_PAGE_SIZE, overviewPriceBelowCostPage * OVERVIEW_PAGE_SIZE)
                      .map((item) => (
                        <li key={item.medicationId}>
                          <div className="pharmacy-alert-item">
                            <span className="pharmacy-alert-item__name">{item.medicationName}</span>
                            <span className="pharmacy-alert-item__meta">
                              Giá bán: {formatCurrency(item.sellingPrice)} | Nhập cao nhất: {formatCurrency(item.maxCost)}
                            </span>
                          </div>
                          <strong className="price-loss">{formatCurrency(item.sellingPrice)}</strong>
                        </li>
                      ))}
                  </ul>
                  {Math.ceil(priceBelowCostList.length / OVERVIEW_PAGE_SIZE) > 1 && (
                    <div className="pharmacy-pagination">
                      <button
                        type="button"
                        onClick={() => setOverviewPriceBelowCostPage((prev) => Math.max(1, prev - 1))}
                        disabled={overviewPriceBelowCostPage <= 1}
                      >
                        <ChevronLeft size={14} />
                        {t('pharmacyPage.prev')}
                      </button>
                      <span>{t('pharmacyPage.page', { current: overviewPriceBelowCostPage, total: Math.max(1, Math.ceil(priceBelowCostList.length / OVERVIEW_PAGE_SIZE)) })}</span>
                      <button
                        type="button"
                        onClick={() => setOverviewPriceBelowCostPage((prev) => Math.min(Math.max(1, Math.ceil(priceBelowCostList.length / OVERVIEW_PAGE_SIZE)), prev + 1))}
                        disabled={overviewPriceBelowCostPage >= Math.max(1, Math.ceil(priceBelowCostList.length / OVERVIEW_PAGE_SIZE))}
                      >
                        {t('pharmacyPage.next')}
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                placeholder={t('pharmacyPage.searchMedicationsPlaceholder')}
              />
            </div>

            <select value={medActive} onChange={(event) => setMedActive(event.target.value)}>
              <option value="">{t('pharmacyPage.all')}</option>
              <option value="true">{t('pharmacyPage.active')}</option>
              <option value="false">{t('pharmacyPage.inactive')}</option>
            </select>
            <button type="button" className="pharmacy-primary" onClick={() => openMedicationModal(null)}>
              <Plus size={16} />
              {t('pharmacyPage.addMedication')}
            </button>
          </div>

          <div className="pharmacy-card">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>{t('pharmacyPage.colCode')}</th>
                  <th>{t('pharmacyPage.colMedicationName')}</th>
                  <th>{t('pharmacyPage.colStrength')}</th>
                  <th>{t('pharmacyPage.colManufacturer')}</th>
                  <th>{t('pharmacyPage.colForm')}</th>
                  <th>{t('pharmacyPage.colUnit')}</th>
                  <th>{t('pharmacyPage.colMinLevel')}</th>
                  <th>{t('pharmacyPage.colStock')}</th>
                  <th>{t('pharmacyPage.colStatus')}</th>
                  <th>{t('pharmacyPage.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {medLoading && (
                  <tr>
                    <td colSpan="10" className="pharmacy-empty">{t('pharmacyPage.loadingMedications')}</td>
                  </tr>
                )}
                {!medLoading && medications.length === 0 && (
                  <tr>
                    <td colSpan="10" className="pharmacy-empty">{t('pharmacyPage.noMedications')}</td>
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
                          {med.isActive ? t('pharmacyPage.statusActive') : t('pharmacyPage.statusInactive')}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="pharmacy-action" onClick={() => openMedicationModal(med)}>
                          <Edit3 size={14} />
                          {t('pharmacyPage.edit')}
                        </button>
                        <button type="button" className="pharmacy-action ghost" onClick={() => openNotes(med)}>
                          <FileText size={14} />
                          {t('pharmacyPage.notes')}
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
              {t('pharmacyPage.prev')}
            </button>
            <span>
              {t('pharmacyPage.page', { current: medPage, total: medTotalPages })}
            </span>
            <button
              type="button"
              onClick={() => setMedPage((prev) => Math.min(medTotalPages, prev + 1))}
              disabled={medPage >= medTotalPages}
            >
              {t('pharmacyPage.next')}
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
                placeholder={t('pharmacyPage.searchSuppliersPlaceholder')}
              />
            </div>
            <select value={supActive} onChange={(event) => setSupActive(event.target.value)}>
              <option value="">{t('pharmacyPage.all')}</option>
              <option value="true">{t('pharmacyPage.active')}</option>
              <option value="false">{t('pharmacyPage.inactive')}</option>
            </select>
            <button type="button" className="pharmacy-primary" onClick={() => openSupplierModal(null)}>
              <Plus size={16} />
              {t('pharmacyPage.addSupplier')}
            </button>
          </div>

          <div className="suppliers-grid">
            {supLoading && (
              <div className="pharmacy-empty-full">{t('pharmacyPage.loadingSuppliers')}</div>
            )}
            {!supLoading && suppliers.length === 0 && (
              <div className="pharmacy-empty-full">{t('pharmacyPage.noSuppliers')}</div>
            )}
            {!supLoading &&
              suppliers.map((supplier) => (
                <div key={supplier._id} className="supplier-card">
                  <div className="supplier-card__header">
                    <div>
                      <h3>{supplier.name}</h3>
                      <span className={`status-pill ${supplier.isActive ? 'active' : 'inactive'}`}>
                        {supplier.isActive ? t('pharmacyPage.statusActive') : t('pharmacyPage.statusInactive')}
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
                        <strong>{t('pharmacyPage.contactPersonLabel')}</strong> {supplier.contactName}
                      </div>
                    )}
                  </div>

                  <div className="supplier-card__footer">
                    <button type="button" className="pharmacy-action" onClick={() => openSupplierModal(supplier)}>
                      <Edit3 size={14} />
                      {t('pharmacyPage.edit')}
                    </button>

                    {supplier.isActive && (
                      <button
                        type="button"
                        className="pharmacy-action ghost"
                        onClick={() => deactivateSupplier(supplier._id)}
                      >
                        {t('pharmacyPage.deactivate')}
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
              {t('pharmacyPage.prev')}
            </button>
            <span>{t('pharmacyPage.page', { current: supPage, total: supTotalPages })}</span>
            <button
              type="button"
              onClick={() => setSupPage((prev) => Math.min(supTotalPages, prev + 1))}
              disabled={supPage >= supTotalPages}
            >
              {t('pharmacyPage.next')}
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
              <option value="">{t('pharmacyPage.allMedications')}</option>
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
              <option value="">{t('pharmacyPage.allSuppliers')}</option>
              {supplierOptions
                .filter((sup) => sup.isActive !== false)
                .map((sup) => (
                  <option key={sup._id} value={sup._id}>{sup.name}</option>
                ))}
            </select>
            <button type="button" className="pharmacy-primary" onClick={() => openStockModal(null)}>
              <Plus size={16} />
              {t('pharmacyPage.importMedication')}
            </button>
          </div>

          <div className="pharmacy-card">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>{t('pharmacyPage.colLotNumber')}</th>
                  <th>{t('pharmacyPage.colMedicationName')}</th>
                  <th className="pharmacy-supplier-col">{t('pharmacyPage.colManufacturer')}</th>
                  <th>{t('pharmacyPage.colForm')}</th>
                  <th>{t('pharmacyPage.colUnit')}</th>
                  <th>{t('pharmacyPage.colPrice')}</th>
                  <th>{t('pharmacyPage.colQuantity')}</th>
                  <th>{t('pharmacyPage.colExpiry')}</th>
                  <th>{t('pharmacyPage.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {stockLoading && (
                  <tr>
                    <td colSpan="9" className="pharmacy-empty">{t('pharmacyPage.loadingStocks')}</td>
                  </tr>
                )}
                {!stockLoading && stocks.length === 0 && (
                  <tr>
                    <td colSpan="9" className="pharmacy-empty">{t('pharmacyPage.noStocks')}</td>
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
                          {t('pharmacyPage.edit')}
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
              {t('pharmacyPage.prev')}
            </button>
            <span>{t('pharmacyPage.page', { current: stockPage, total: stockTotalPages })}</span>
            <button
              type="button"
              onClick={() => setStockPage((prev) => Math.min(stockTotalPages, prev + 1))}
              disabled={stockPage >= stockTotalPages}
            >
              {t('pharmacyPage.next')}
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {activeTab === 'priceList' && (
        <section className="pharmacy-section">
          <div className="pharmacy-toolbar wide">
            <div className="price-list-title">
              <TrendingUp size={20} />
              <h2>{t('pharmacyPage.tabPriceList')}</h2>
            </div>
          </div>

          <div className="pharmacy-card">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>{t('pharmacyPage.colMedicationName')}</th>
                  <th>{t('pharmacyPage.colLotNumber')}</th>
                  <th>{t('pharmacyPage.colManufacturer')}</th>
                  <th>{t('pharmacyPage.colPrice')}</th>
                  <th>{t('pharmacyPage.priceLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {priceListLoading && (
                  <tr>
                    <td colSpan="5" className="pharmacy-empty">{t('pharmacyPage.loadingStocks')}</td>
                  </tr>
                )}
                {!priceListLoading && priceList.length === 0 && (
                  <tr>
                    <td colSpan="5" className="pharmacy-empty">{t('pharmacyPage.noStocks')}</td>
                  </tr>
                )}
                {!priceListLoading &&
                  priceList.map((item, idx) => (
                    item.batches && item.batches.length > 0 ? (
                      item.batches.map((batch, batchIdx) => (
                        <tr key={`${item.medicationId}-${batchIdx}`}>
                          {batchIdx === 0 ? (
                            <>
                              <td rowSpan={item.batches.length}>{item.medicationName}</td>
                              <td>{batch.lotNumber}</td>
                              <td rowSpan={item.batches.length}>{item.supplierName || 'N/A'}</td>
                              <td>{batch.costPerUnit ? formatCurrency(batch.costPerUnit) : 'N/A'}</td>
                              <td rowSpan={item.batches.length}>
                                {editingPriceId === item.medicationId ? (
                                  <div className="pharmacy-price-edit">
                                    <input
                                      type="number"
                                      value={editingPriceValue}
                                      onChange={(e) => setEditingPriceValue(e.target.value)}
                                      className="pharmacy-input-small"
                                      min="0"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleSavePrice}
                                      className="pharmacy-btn-small pharmacy-btn-save"
                                      disabled={priceSaving}
                                    >
                                      {priceSaving ? '...' : <Save size={12} />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditPrice}
                                      className="pharmacy-btn-small pharmacy-btn-cancel"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="pharmacy-price-display">
                                    <span>{formatCurrency(item.sellingPrice)}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleEditPrice(item.medicationId, item.sellingPrice)}
                                      className="pharmacy-btn-edit"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{batch.lotNumber}</td>
                              <td>{batch.costPerUnit ? formatCurrency(batch.costPerUnit) : 'N/A'}</td>
                            </>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr key={idx}>
                        <td>{item.medicationName}</td>
                        <td>N/A</td>
                        <td>{item.supplierName || 'N/A'}</td>
                        <td>N/A</td>
                        <td>
                          {editingPriceId === item.medicationId ? (
                            <div className="pharmacy-price-edit">
                              <input
                                type="number"
                                value={editingPriceValue}
                                onChange={(e) => setEditingPriceValue(e.target.value)}
                                className="pharmacy-input-small"
                                min="0"
                              />
                              <button
                                type="button"
                                onClick={handleSavePrice}
                                className="pharmacy-btn-small pharmacy-btn-save"
                                disabled={priceSaving}
                              >
                                {priceSaving ? '...' : <Save size={12} />}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditPrice}
                                className="pharmacy-btn-small pharmacy-btn-cancel"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="pharmacy-price-display">
                              <span>{formatCurrency(item.sellingPrice)}</span>
                              <button
                                type="button"
                                onClick={() => handleEditPrice(item.medicationId, item.sellingPrice)}
                                className="pharmacy-btn-edit"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  ))}
              </tbody>
            </table>
          </div>

          <div className="pharmacy-pagination">
            <button
              type="button"
              onClick={() => setPriceListPage((prev) => Math.max(1, prev - 1))}
              disabled={priceListPage <= 1}
            >
              <ChevronLeft size={16} />
              {t('pharmacyPage.prev')}
            </button>
            <span>{t('pharmacyPage.page', { current: priceListPage, total: priceListTotalPages })}</span>
            <button
              type="button"
              onClick={() => setPriceListPage((prev) => Math.min(priceListTotalPages, prev + 1))}
              disabled={priceListPage >= priceListTotalPages}
            >
              {t('pharmacyPage.next')}
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
                <h2>{t('pharmacyPage.reportsTitle')}</h2>
                <p>{t('pharmacyPage.reportsSubtitle')}</p>
              </div>
            </div>

            <div className="date-range-picker">
              <label>
                <span>{t('pharmacyPage.fromDate')}</span>
                <input
                  type="date"
                  value={usageRange.from}
                  onChange={(event) => setUsageRange((prev) => ({ ...prev, from: event.target.value }))}
                />
              </label>

              <label>
                <span>{t('pharmacyPage.toDate')}</span>
                <input
                  type="date"
                  value={usageRange.to}
                  onChange={(event) => setUsageRange((prev) => ({ ...prev, to: event.target.value }))}
                />
              </label>

              <button type="button" className="pharmacy-primary" onClick={loadUsageStats}>
                <RefreshCw size={16} />
                {t('pharmacyPage.refresh')}
              </button>
              <button type="button" className="pharmacy-export" onClick={exportToExcel}>
                <Download size={16} />
                {t('pharmacyPage.exportExcel')}
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
                      {t('pharmacyPage.colMedicationName')}
                    </span>
                  </th>
                  <th>
                    <span className="table-header-with-icon">
                      <Activity size={16} />
                      {t('pharmacyPage.colPatientName')}
                    </span>
                  </th>
                  <th>
                    <span className="table-header-with-icon">
                      <Clock size={16} />
                      {t('pharmacyPage.colDispensedTime')}
                    </span>
                  </th>
                  <th>{t('pharmacyPage.colDispensCount')}</th>
                  <th>{t('pharmacyPage.colTotalQuantity')}</th>
                </tr>
              </thead>
              <tbody>
                {usageLoading && (
                  <tr>
                    <td colSpan="5" className="pharmacy-empty">{t('pharmacyPage.loadingData')}</td>
                  </tr>
                )}
                {!usageLoading && aggregatedReportData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="pharmacy-empty">{t('pharmacyPage.noReportData')}</td>
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
                <h2>{editingMedication ? t('pharmacyPage.editMedicationTitle') : t('pharmacyPage.addMedication')}</h2>
                <p>{t('pharmacyPage.medicationModalSubtitle')}</p>
              </div>
              <button type="button" onClick={() => setShowMedicationModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="pharmacy-modal__body" onSubmit={saveMedication}>
              <div className="pharmacy-form-grid">
                <label className="full">
                  {t('pharmacyPage.medicationNameLabel')}
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
                  {t('pharmacyPage.formLabel')}
                  <select
                    value={medicationForm.formOther ? OTHER_OPTION_VALUE : medicationForm.form}
                    onChange={(event) => setMedicationForm((prev) => ({
                      ...prev,
                      formOther: event.target.value === OTHER_OPTION_VALUE,
                      form: event.target.value === OTHER_OPTION_VALUE ? '' : event.target.value,
                    }))}
                  >
                    <option value="">{t('pharmacyPage.selectForm')}</option>
                    {[...new Set([...DEFAULT_FORMS_VN, ...(medicationFormOptions.forms || [])])].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                    <option value={OTHER_OPTION_VALUE}>{t('pharmacyPage.otherOption')}</option>
                  </select>
                  {medicationForm.formOther && (
                    <input
                      value={medicationForm.form}
                      placeholder={t('pharmacyPage.otherFormPlaceholder')}
                      onChange={(event) => setMedicationForm((prev) => ({ ...prev, form: event.target.value }))}
                    />
                  )}
                </label>

                <label>
                  {t('pharmacyPage.strengthLabel')}
                  <select
                    value={medicationForm.strengthOther ? OTHER_OPTION_VALUE : medicationForm.strength}
                    onChange={(event) => setMedicationForm((prev) => ({
                      ...prev,
                      strengthOther: event.target.value === OTHER_OPTION_VALUE,
                      strength: event.target.value === OTHER_OPTION_VALUE ? '' : event.target.value,
                    }))}
                  >
                    <option value="">{t('pharmacyPage.selectStrength')}</option>
                    {withFallbackOption(combinedStrengthOptions, medicationForm.strengthOther ? '' : medicationForm.strength).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value={OTHER_OPTION_VALUE}>{t('pharmacyPage.otherOption')}</option>
                  </select>
                  {medicationForm.strengthOther && (
                    <input
                      value={medicationForm.strength}
                      placeholder={t('pharmacyPage.otherStrengthPlaceholder')}
                      onChange={(event) => setMedicationForm((prev) => ({ ...prev, strength: event.target.value }))}
                    />
                  )}
                </label>

                <label>
                  {t('pharmacyPage.unitLabel')}
                  <select
                    value={medicationForm.unitOther ? OTHER_OPTION_VALUE : medicationForm.unit}
                    onChange={(event) => setMedicationForm((prev) => ({
                      ...prev,
                      unitOther: event.target.value === OTHER_OPTION_VALUE,
                      unit: event.target.value === OTHER_OPTION_VALUE ? '' : event.target.value,
                    }))}
                  >
                    <option value="">{t('pharmacyPage.selectUnit')}</option>
                    {combinedUnitOptions.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    <option value={OTHER_OPTION_VALUE}>{t('pharmacyPage.otherOption')}</option>
                  </select>
                  {medicationForm.unitOther && (
                    <input
                      value={medicationForm.unit}
                      placeholder={t('pharmacyPage.otherUnitPlaceholder')}
                      onChange={(event) => setMedicationForm((prev) => ({ ...prev, unit: event.target.value }))}
                    />
                  )}
                </label>

                <label>
                  {t('pharmacyPage.manufacturerLabel')}
                  <select
                    value={medicationForm.manufacturer}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, manufacturer: event.target.value }))
                    }
                  >
                    <option value="">{t('pharmacyPage.selectManufacturer')}</option>
                    {supplierOptions
                      .filter((s) => s.isActive !== false)
                      .map((s) => (
                        <option key={s._id} value={s.name}>{s.name}</option>
                      ))}
                  </select>
                </label>

                <label>
                  {t('pharmacyPage.minLevelLabel')}
                  <input
                    type="number"
                    value={medicationForm.minStockLevel}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, minStockLevel: event.target.value }))
                    }
                  />
                </label>

                <label>
                  {t('pharmacyPage.statusLabel')}
                  <select
                    value={medicationForm.isActive ? 'true' : 'false'}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))
                    }
                  >
                    <option value="true">{t('pharmacyPage.statusActive')}</option>
                    <option value="false">{t('pharmacyPage.statusInactive')}</option>
                  </select>
                </label>
              </div>

              {medicationError && <p className="pharmacy-error">{medicationError}</p>}
              {medicationMessage && <p className="pharmacy-success">{medicationMessage}</p>}

                  <div className="pharmacy-modal__footer">
                <button type="button" onClick={() => setShowMedicationModal(false)} className="ghost">
                  {t('pharmacyPage.cancel')}
                </button>
                <button type="submit" className="pharmacy-primary" disabled={medicationSaving}>
                  <Save size={14} />
                  {medicationSaving ? t('pharmacyPage.saving') : t('pharmacyPage.save')}
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
                <h2>{editingSupplier ? t('pharmacyPage.editSupplierTitle') : t('pharmacyPage.addSupplier')}</h2>
                <p>{t('pharmacyPage.supplierModalSubtitle')}</p>
              </div>
              <button type="button" onClick={() => setShowSupplierModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="pharmacy-modal__body" onSubmit={saveSupplier}>
              <div className="pharmacy-form-grid">
                <label>
                  {t('pharmacyPage.supplierNameLabel')}
                  <input
                    type="text"
                    placeholder={t('pharmacyPage.supplierNamePlaceholder')}
                    value={supplierForm.name}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </label>

                <label>
                  {t('pharmacyPage.contactNameLabel')}
                  <input
                    type="text"
                    placeholder={t('pharmacyPage.contactNamePlaceholder')}
                    value={supplierForm.contactName}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, contactName: event.target.value }))
                    }
                  />
                </label>

                <label>
                  {t('pharmacyPage.phoneLabel')}
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
                  {t('pharmacyPage.emailLabel')}
                  <input
                    type="email"
                    placeholder={t('pharmacyPage.emailPlaceholder')}
                    value={supplierForm.email}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                </label>

                <label className="full">
                  {t('pharmacyPage.addressLabel')}
                  <input
                    type="text"
                    placeholder={t('pharmacyPage.addressPlaceholder')}
                    value={supplierForm.address}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                  />
                </label>

                <label>
                  {t('pharmacyPage.statusLabel')}
                  <select
                    value={supplierForm.isActive ? 'true' : 'false'}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))
                    }
                  >
                    <option value="true">{t('pharmacyPage.statusActive')}</option>
                    <option value="false">{t('pharmacyPage.statusInactive')}</option>
                  </select>
                </label>
              </div>

              {supplierError && <p className="pharmacy-error">{supplierError}</p>}
              {supplierMessage && <p className="pharmacy-success">{supplierMessage}</p>}

              <div className="pharmacy-modal__footer">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="ghost">
                  {t('pharmacyPage.cancel')}
                </button>
                <button type="submit" className="pharmacy-primary" disabled={supplierSaving}>
                  <Save size={14} />
                  {supplierSaving ? t('pharmacyPage.saving') : t('pharmacyPage.save')}
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
                <h2>{editingStock ? t('pharmacyPage.editStockTitle') : t('pharmacyPage.addStockTitle')}</h2>
                <p>{t('pharmacyPage.stockModalSubtitle')}</p>
              </div>
              <button type="button" onClick={() => setShowStockModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="pharmacy-modal__body" onSubmit={saveStock}>
              <div className="pharmacy-form-grid">
                <label>
                  {t('pharmacyPage.stockMedicationLabel')}
                      <select
                        value={stockForm.medicationId}
                        onChange={handleStockMedicationChange}
                        disabled={!!editingStock}
                      >
                        <option value="">{t('pharmacyPage.selectMedication')}</option>
                        {medicationOptions.map((med) => (
                          <option key={med._id} value={med._id} disabled={med.isActive === false}>
                            {med.name}{med.isActive === false ? t('pharmacyPage.inactiveLabel') : ''}
                          </option>
                        ))}
                      </select>
                </label>

                <label>
                  {t('pharmacyPage.stockSupplierLabel')}
                      <select
                        value={stockForm.supplierId}
                        onChange={(event) =>
                          setStockForm((prev) => ({ ...prev, supplierId: event.target.value }))
                        }
                        disabled={!!editingStock}
                      >
                        <option value="">{t('pharmacyPage.selectSupplier')}</option>
                        {supplierOptions.map((sup) => (
                          <option key={sup._id} value={sup._id} disabled={sup.isActive === false}>
                            {sup.name}{sup.isActive === false ? t('pharmacyPage.inactiveLabel') : ''}
                          </option>
                        ))}
                      </select>
                </label>

                <label>
                  {t('pharmacyPage.stockQuantityLabel')}
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
                  {t('pharmacyPage.expiryDateLabel')}
                  <input
                    type="datetime-local"
                    min={editingStock ? undefined : localDateTimeNow()}
                    value={stockForm.expiryDate}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, expiryDate: event.target.value }))
                    }
                  />
                </label>

                <label>
                  {t('pharmacyPage.receivedDateLabel')}
                  <input
                    type="datetime-local"
                    min={editingStock ? undefined : localDateTimeNow()}
                    value={stockForm.receivedDate}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, receivedDate: event.target.value }))
                    }
                    readOnly={!!editingStock}
                  />
                </label>

                <label>
                  {t('pharmacyPage.costPerUnitLabel')}
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
                  {t('pharmacyPage.cancel')}
                </button>
                <button type="submit" className="pharmacy-primary" disabled={stockSaving}>
                  <Save size={14} />
                  {stockSaving ? t('pharmacyPage.saving') : t('pharmacyPage.save')}
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
                <h2>{t('pharmacyPage.noteModalTitle')}</h2>
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
                  placeholder={t('pharmacyPage.addNote')}
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                />
                <button type="submit" className="pharmacy-primary">{t('pharmacyPage.addNote')}</button>
                {noteError && <p className="pharmacy-error">{noteError}</p>}
              </form>

              {noteLoading ? (
                <p className="pharmacy-empty">{t('pharmacyPage.loadingNotes')}</p>
              ) : (
                <ul className="pharmacy-list">
                  {notes.length === 0 && <li className="pharmacy-empty">{t('pharmacyPage.noNotes')}</li>}
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
