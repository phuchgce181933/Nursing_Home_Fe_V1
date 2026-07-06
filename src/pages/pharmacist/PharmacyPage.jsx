import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const [expiryDays, setExpiryDays] = useState(30);

  const [medications, setMedications] = useState([]);
  const [medLoading, setMedLoading] = useState(false);
  const [medSearch, setMedSearch] = useState('');
  const [medActive, setMedActive] = useState('true');
  const [medPage, setMedPage] = useState(1);
  const [medTotalPages, setMedTotalPages] = useState(1);
  const [medTotal, setMedTotal] = useState(0);

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

  const [usageStats, setUsageStats] = useState([]);
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
      const res = await pharmacyService.trackExpiry({ withinDays: expiryDays });
      setExpiryList(res?.data || []);
    } catch (err) {
    }
  }, [expiryDays]);

  const loadMedications = useCallback(async () => {
    try {
      setMedLoading(true);
      const res = await pharmacyService.listMedications({
        search: medSearch.trim() || undefined,
        isActive: medActive === '' ? undefined : medActive,
        page: medPage,
        limit: 10,
      });
      setMedications(res?.data || []);
      setMedTotal(res?.total || 0);
      setMedTotalPages(res?.totalPages || 1);
    } catch (err) {
    } finally {
      setMedLoading(false);
    }
  }, [medActive, medPage, medSearch]);

  const loadSuppliers = useCallback(async () => {
    try {
      setSupLoading(true);
      const res = await pharmacyService.listSuppliers({
        search: supSearch.trim() || undefined,
        isActive: supActive === '' ? undefined : supActive,
        page: supPage,
        limit: 10,
      });
      setSuppliers(res?.data || []);
      setSupTotalPages(res?.totalPages || 1);
    } catch (err) {
    } finally {
      setSupLoading(false);
    }
  }, [supActive, supPage, supSearch]);

  const loadStocks = useCallback(async () => {
    try {
      setStockLoading(true);
      const medicationId = stockFilters.medicationId.trim();
      const supplierId = stockFilters.supplierId.trim();
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
      const params = {
        medicationId: resolvedMedicationId,
        supplierId: resolvedSupplierId,
        lotNumber: stockFilters.lotNumber.trim() || undefined,
        expiryFrom: stockFilters.expiryFrom ? toIsoDate(stockFilters.expiryFrom) : undefined,
        expiryTo: stockFilters.expiryTo ? toIsoDate(stockFilters.expiryTo) : undefined,
        page: stockPage,
        limit: 10,
      };
      const res = await pharmacyService.listStocks(params);
      const sortedStocks = (res?.data || []).slice().sort((a, b) => {
        const aDate = new Date(a.receivedDate || a.createdAt).getTime();
        const bDate = new Date(b.receivedDate || b.createdAt).getTime();
        return bDate - aDate;
      });
      setStocks(sortedStocks);
      setStockTotalPages(res?.totalPages || 1);
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
    } catch (err) {
    } finally {
      setUsageLoading(false);
    }
  }, [usageRange]);

  const loadOptions = useCallback(async () => {
    try {
      const [medRes, supplierRes] = await Promise.all([
        pharmacyService.listMedications({ page: 1, limit: 200 }),
        pharmacyService.listSuppliers({ page: 1, limit: 200 }),
      ]);
      setMedicationOptions(medRes?.data || []);
      setSupplierOptions(supplierRes?.data || []);
    } catch (err) {
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
  }, [activeTab, loadMedications]);

  useEffect(() => {
    if (activeTab === 'suppliers') {
      loadSuppliers();
    }
  }, [activeTab, loadSuppliers]);

  useEffect(() => {
    if (activeTab === 'stocks') {
      loadStocks();
    }
  }, [activeTab, loadStocks]);

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
    setStockForm((prev) => ({ ...prev, medicationId }));
  };

  const openStockModal = (stock) => {
    if (!supplierOptions.length || !medicationOptions.length) {
      loadOptions();
    }
    setEditingStock(stock || null);
    if (stock) {
      setStockForm({
        medicationId: stock.medicationId?._id || stock.medicationId || '',
        supplierId: stock.supplierId?._id || stock.supplierId || '',
        quantity: stock.quantity || 0,
        expiryDate: toDateTimeInput(stock.expiryDate),
        receivedDate: toDateTimeInput(stock.receivedDate),
        costPerUnit: stock.costPerUnit || 0,
        notes: stock.notes || '',
      });
    } else {
      setStockForm({ ...emptyStockForm, receivedDate: localDateTimeNow() });
    }
    setStockError(null);
    setStockMessage(null);
    setShowStockModal(true);
  };

  const saveStock = async (event) => {
    if (event) event.preventDefault();
    const validation = validateStockForm(stockForm);
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

      const payload = {
        medicationId: resolvedMedicationId,
        supplierId: resolvedSupplierId || undefined,
        quantity: Number(stockForm.quantity),
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
          <p>Quản lý thuốc, nhà cung cấp, nhập thuốc và quy trình cấp phát.</p>
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
            <div className="summary-card">
              <span>Thuốc đang hoạt động</span>
              <strong>{summary?.activeMedications ?? '--'}</strong>
            </div>
            <div className="summary-card">
              <span>Nhà cung cấp đang hoạt động</span>
              <strong>{summary?.activeSuppliers ?? '--'}</strong>
            </div>
            <div className="summary-card">
              <span>Cảnh báo tồn kho thấp</span>
              <strong>{summary?.lowStockCount ?? '--'}</strong>
            </div>
            <div className="summary-card">
              <span>Sắp hết hạn</span>
              <strong>{summary?.expiringSoonCount ?? '--'}</strong>
            </div>
          </div>

          <div className="pharmacy-grid">
            <div className="pharmacy-card">
              <div className="pharmacy-card__header">
                <div>
                  <h2>Cảnh báo tồn kho thấp</h2>
                </div>
                <AlertTriangle size={18} />
              </div>
              <div className="pharmacy-card__body">
                {lowStock.length === 0 ? (
                  <p className="pharmacy-empty">Không có cảnh báo tồn kho thấp.</p>
                ) : (
                  <ul className="pharmacy-list">
                    {lowStock.slice(0, 6).map((item) => (
                      <li key={item.medication._id}>
                        <span>{item.medication.name}</span>
                        <strong>{item.medication.availableQuantity}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="pharmacy-card">
              <div className="pharmacy-card__header">
                <div>
                  <h2>Hàng tồn sắp hết hạn</h2>
                </div>
                <PackageOpen size={18} />
              </div>
              <div className="pharmacy-card__body">
                <label className="pharmacy-inline">
                  Hết hạn trong vòng
                  <input
                    type="number"
                    min="1"
                    value={expiryDays}
                    onChange={(event) => setExpiryDays(Number(event.target.value) || 30)}
                  />
                  ngày
                </label>
                {expiryList.length === 0 ? (
                  <p className="pharmacy-empty">Không có hàng tồn sắp hết hạn.</p>
                ) : (
                  <ul className="pharmacy-list">
                    {expiryList.slice(0, 6).map((item) => (
                      <li key={item._id}>
                        <span>
                          {item.medicationId?.name
                            ? `${item.medicationId.name}${item.medicationId.medicationCode ? ' (' + item.medicationId.medicationCode + ')' : ''}`
                            : item.medicationId?.medicationCode || item.medicationId || 'Unknown medication'}
                        </span>
                        <strong>{formatDate(item.expiryDate)}</strong>
                      </li>
                    ))}
                  </ul>
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
              Trang {medPage} / {medTotalPages} | {medTotal} mục
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

          <div className="pharmacy-card">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>Tên nhà cung cấp</th>
                  <th>Người liên hệ</th>
                  <th>Điện thoại</th>
                  <th>Email</th>
                  <th>Địa chỉ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {supLoading && (
                  <tr>
                    <td colSpan="7" className="pharmacy-empty">Đang tải nhà cung cấp...</td>
                  </tr>
                )}
                {!supLoading && suppliers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="pharmacy-empty">Không tìm thấy nhà cung cấp.</td>
                  </tr>
                )}
                {!supLoading &&
                  suppliers.map((supplier) => (
                    <tr key={supplier._id}>
                      <td className="pharmacy-supplier">{supplier.name}</td>
                      <td>{supplier.contactName || 'N/A'}</td>
                      <td>{supplier.phone || 'N/A'}</td>
                      <td>{supplier.email || 'N/A'}</td>
                      <td className="pharmacy-supplier">{supplier.address || 'N/A'}</td>
                      <td>
                        <span className={`status-pill ${supplier.isActive ? 'active' : 'inactive'}`}>
                          {supplier.isActive ? 'Hoạt động' : 'Ngừng'}
                        </span>
                      </td>
                      <td>
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
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
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

      {activeTab === 'dispense' && (
        <section className="pharmacy-section">
          <div className="pharmacy-grid">
            <div className="pharmacy-card">
              <div className="pharmacy-card__header">
                <div>
                  <h2>Ghi lại giao dịch cấp phát thuốc</h2>
                </div>
              </div>
              <form className="pharmacy-form" onSubmit={handleDispense}>
                <select
                  value={dispenseForm.medicationId}
                  onChange={(event) =>
                    setDispenseForm((prev) => ({ ...prev, medicationId: event.target.value }))
                  }
                >
                  <option value="">-- Chọn thuốc --</option>
                  {medicationOptions.map((med) => (
                    <option key={med._id} value={med._id}>{med.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nhập ID đơn thuốc"
                  value={dispenseForm.prescriptionId}
                  onChange={(event) =>
                    setDispenseForm((prev) => ({ ...prev, prescriptionId: event.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="Nhập ID cư dân (Resident ID)"
                  value={dispenseForm.residentId}
                  onChange={(event) =>
                    setDispenseForm((prev) => ({ ...prev, residentId: event.target.value }))
                  }
                />
                <input
                  type="number"
                  placeholder="Số lượng"
                  value={dispenseForm.quantity}
                  onChange={(event) =>
                    setDispenseForm((prev) => ({ ...prev, quantity: event.target.value }))
                  }
                />
                <input
                  type="datetime-local"
                  value={dispenseForm.dispensedAt}
                  onChange={(event) =>
                    setDispenseForm((prev) => ({ ...prev, dispensedAt: event.target.value }))
                  }
                />
                
                <button type="submit" className="pharmacy-primary" disabled={dispenseSaving}>
                  {dispenseSaving ? 'Đang cấp phát...' : 'Cấp phát thuốc'}
                </button>
                {dispenseMessage && <p className="pharmacy-message">{dispenseMessage}</p>}
              </form>
            </div>

            <div className="pharmacy-card">
              <div className="pharmacy-card__header">
                <div>
                  <h2>Xác nhận đơn thuốc trước khi cấp phát</h2>
                </div>
              </div>
              <div className="pharmacy-form">
                <input
                  type="text"
                  placeholder="Nhập ID đơn thuốc"
                  value={verifyId}
                  onChange={(event) => setVerifyId(event.target.value)}
                />
                <button type="button" className="pharmacy-primary" onClick={handleVerify}>
                  Xác nhận
                </button>
                {verifyMessage && <p className="pharmacy-message">{verifyMessage}</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'reports' && (
        <section className="pharmacy-section">
          <div className="pharmacy-toolbar wide">
            <label>
              Từ ngày
              <input
                type="date"
                value={usageRange.from}
                onChange={(event) => setUsageRange((prev) => ({ ...prev, from: event.target.value }))}
              />
            </label>
            <label>
              Đến ngày
              <input
                type="date"
                value={usageRange.to}
                onChange={(event) => setUsageRange((prev) => ({ ...prev, to: event.target.value }))}
              />
            </label>
            <button type="button" className="pharmacy-primary" onClick={loadUsageStats}>
              Làm mới dữ liệu
            </button>
          </div>

          <div className="pharmacy-card">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>Tên thuốc</th>
                  <th>Tổng đã cấp phát (Lần)</th>
                  <th>Số lần cấp phát</th>
                </tr>
              </thead>
              <tbody>
                {usageLoading && (
                  <tr>
                    <td colSpan="3" className="pharmacy-empty">Đang tải số lần cấp phát...</td>
                  </tr>
                )}
                {!usageLoading && usageStats.length === 0 && (
                  <tr>
                    <td colSpan="3" className="pharmacy-empty">Không tìm thấy số lần cấp phát.</td>
                  </tr>
                )}
                {!usageLoading &&
                  usageStats.map((row) => (
                    <tr key={row.medication?._id || row.medicationId}>
                      <td>{row.medication?.name || row.medication?._id || 'N/A'}</td>
                      <td>{row.totalDispensed ?? 0}</td>
                      <td>{row.dispenseCount ?? 0}</td>
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
                    min="0"
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
                          <option key={med._id} value={med._id}>{med.name}</option>
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
                      >
                        <option value="">-- Chọn nhà cung cấp --</option>
                        {supplierOptions
                          .filter((sup) => sup.isActive)
                          .map((sup) => (
                            <option key={sup._id} value={sup._id}>{sup.name}</option>
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
