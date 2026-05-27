import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import pharmacyService from '../../services/pharmacy.service';
import '../../styles/pharmacist/PharmacyPage.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'stocks', label: 'Stocks', icon: PackageOpen },
  { id: 'dispense', label: 'Dispense', icon: ShieldCheck },
  { id: 'reports', label: 'Reports', icon: Activity },
];

const toDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
};

const toIsoDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
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
  unit: '',
  lotNumber: '',
  expiryDate: '',
  receivedDate: '',
  costPerUnit: 0,
  notes: '',
};

const emptyDispenseForm = {
  medicationId: '',
  prescriptionId: '',
  residentId: '',
  quantity: 0,
  dispensedAt: '',
  notes: '',
};

function PharmacyPage({ defaultTab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [lowStock, setLowStock] = useState([]);
  const [expiryList, setExpiryList] = useState([]);
  const [expiryDays, setExpiryDays] = useState(30);

  const [medications, setMedications] = useState([]);
  const [medLoading, setMedLoading] = useState(false);
  const [medError, setMedError] = useState(null);
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

  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [medicationForm, setMedicationForm] = useState({ ...emptyMedicationForm });
  const [medicationSaving, setMedicationSaving] = useState(false);
  const [medicationError, setMedicationError] = useState(null);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ ...emptySupplierForm });
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [supplierError, setSupplierError] = useState(null);

  const [showStockModal, setShowStockModal] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [stockForm, setStockForm] = useState({ ...emptyStockForm });
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState(null);

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteMedication, setNoteMedication] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteError, setNoteError] = useState(null);
  const [noteLoading, setNoteLoading] = useState(false);

  const [dispenseForm, setDispenseForm] = useState({ ...emptyDispenseForm });
  const [dispenseSaving, setDispenseSaving] = useState(false);
  const [dispenseMessage, setDispenseMessage] = useState(null);
  const [verifyId, setVerifyId] = useState('');
  const [verifyMessage, setVerifyMessage] = useState(null);

  const medStats = useMemo(() => {
    const activeCount = medications.filter((item) => item.isActive).length;
    const lowCount = medications.filter(
      (item) => item.minStockLevel > 0 && item.availableQuantity <= item.minStockLevel
    ).length;
    return { activeCount, lowCount };
  }, [medications]);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await pharmacyService.getReportSummary({});
      setSummary(res?.summary || null);
    } catch (err) {
      console.error('Failed to load summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadLowStock = useCallback(async () => {
    try {
      const res = await pharmacyService.getLowStockAlerts();
      setLowStock(res?.data || []);
    } catch (err) {
      console.error('Failed to load low stock alerts:', err);
    }
  }, []);

  const loadExpiry = useCallback(async () => {
    try {
      const res = await pharmacyService.trackExpiry({ withinDays: expiryDays });
      setExpiryList(res?.data || []);
    } catch (err) {
      console.error('Failed to load expiry list:', err);
    }
  }, [expiryDays]);

  const loadMedications = useCallback(async () => {
    try {
      setMedLoading(true);
      setMedError(null);
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
      console.error('Failed to load medications:', err);
      setMedError('Could not load medications.');
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
      console.error('Failed to load suppliers:', err);
    } finally {
      setSupLoading(false);
    }
  }, [supActive, supPage, supSearch]);

  const loadStocks = useCallback(async () => {
    try {
      setStockLoading(true);
      const params = {
        medicationId: stockFilters.medicationId.trim() || undefined,
        supplierId: stockFilters.supplierId.trim() || undefined,
        lotNumber: stockFilters.lotNumber.trim() || undefined,
        expiryFrom: stockFilters.expiryFrom ? toIsoDate(stockFilters.expiryFrom) : undefined,
        expiryTo: stockFilters.expiryTo ? toIsoDate(stockFilters.expiryTo) : undefined,
        page: stockPage,
        limit: 10,
      };
      const res = await pharmacyService.listStocks(params);
      setStocks(res?.data || []);
      setStockTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load stock entries:', err);
    } finally {
      setStockLoading(false);
    }
  }, [stockFilters, stockPage]);

  const loadUsageStats = useCallback(async () => {
    try {
      setUsageLoading(true);
      const res = await pharmacyService.getUsageStats({
        from: usageRange.from ? toIsoDate(usageRange.from) : undefined,
        to: usageRange.to ? toIsoDate(usageRange.to) : undefined,
      });
      setUsageStats(res?.data || []);
    } catch (err) {
      console.error('Failed to load usage stats:', err);
    } finally {
      setUsageLoading(false);
    }
  }, [usageRange]);

  useEffect(() => {
    loadSummary();
    loadLowStock();
  }, [loadSummary, loadLowStock]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

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
    setShowMedicationModal(true);
  };

  const saveMedication = async (event) => {
    if (event) event.preventDefault();
    if (!medicationForm.name.trim()) {
      setMedicationError('Medication name is required.');
      return;
    }

    try {
      setMedicationSaving(true);
      setMedicationError(null);
      const payload = {
        medicationCode: medicationForm.medicationCode.trim() || undefined,
        name: medicationForm.name.trim(),
        form: medicationForm.form.trim() || undefined,
        strength: medicationForm.strength.trim() || undefined,
        unit: medicationForm.unit.trim() || undefined,
        manufacturer: medicationForm.manufacturer.trim() || undefined,
        description: medicationForm.description.trim() || undefined,
        minStockLevel: Number(medicationForm.minStockLevel) || 0,
        isActive: Boolean(medicationForm.isActive),
      };

      if (editingMedication) {
        await pharmacyService.updateMedication(editingMedication._id, payload);
      } else {
        await pharmacyService.createMedication(payload);
      }

      setShowMedicationModal(false);
      loadMedications();
      loadLowStock();
      loadSummary();
    } catch (err) {
      console.error('Failed to save medication:', err);
      setMedicationError(err.response?.data?.message || 'Failed to save medication.');
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
    setShowSupplierModal(true);
  };

  const saveSupplier = async (event) => {
    if (event) event.preventDefault();
    if (!supplierForm.name.trim()) {
      setSupplierError('Supplier name is required.');
      return;
    }

    try {
      setSupplierSaving(true);
      setSupplierError(null);
      const payload = {
        name: supplierForm.name.trim(),
        contactName: supplierForm.contactName.trim() || undefined,
        phone: supplierForm.phone.trim() || undefined,
        email: supplierForm.email.trim() || undefined,
        address: supplierForm.address.trim() || undefined,
        notes: supplierForm.notes.trim() || undefined,
        isActive: Boolean(supplierForm.isActive),
      };

      if (editingSupplier) {
        await pharmacyService.updateSupplier(editingSupplier._id, payload);
      } else {
        await pharmacyService.createSupplier(payload);
      }
      setShowSupplierModal(false);
      loadSuppliers();
      loadSummary();
    } catch (err) {
      console.error('Failed to save supplier:', err);
      setSupplierError(err.response?.data?.message || 'Failed to save supplier.');
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

  const openStockModal = (stock) => {
    setEditingStock(stock || null);
    if (stock) {
      setStockForm({
        medicationId: stock.medicationId?._id || stock.medicationId || '',
        supplierId: stock.supplierId?._id || stock.supplierId || '',
        quantity: stock.quantity || 0,
        unit: stock.unit || '',
        lotNumber: stock.lotNumber || '',
        expiryDate: toDateTimeInput(stock.expiryDate),
        receivedDate: toDateTimeInput(stock.receivedDate),
        costPerUnit: stock.costPerUnit || 0,
        notes: stock.notes || '',
      });
    } else {
      setStockForm({ ...emptyStockForm });
    }
    setStockError(null);
    setShowStockModal(true);
  };

  const saveStock = async (event) => {
    if (event) event.preventDefault();
    if (!stockForm.medicationId.trim()) {
      setStockError('Medication ID is required.');
      return;
    }
    if (!Number(stockForm.quantity)) {
      setStockError('Quantity must be greater than 0.');
      return;
    }

    try {
      setStockSaving(true);
      setStockError(null);
      const payload = {
        medicationId: stockForm.medicationId.trim(),
        supplierId: stockForm.supplierId.trim() || undefined,
        quantity: Number(stockForm.quantity),
        unit: stockForm.unit.trim() || undefined,
        lotNumber: stockForm.lotNumber.trim() || undefined,
        expiryDate: stockForm.expiryDate ? toIsoDate(stockForm.expiryDate) : undefined,
        receivedDate: stockForm.receivedDate ? toIsoDate(stockForm.receivedDate) : undefined,
        costPerUnit: stockForm.costPerUnit ? Number(stockForm.costPerUnit) : undefined,
        notes: stockForm.notes.trim() || undefined,
      };

      if (editingStock) {
        await pharmacyService.updateStock(editingStock._id, payload);
      } else {
        await pharmacyService.createStock(payload);
      }
      setShowStockModal(false);
      loadStocks();
      loadSummary();
      loadLowStock();
    } catch (err) {
      console.error('Failed to save stock:', err);
      setStockError(err.response?.data?.message || 'Failed to save stock.');
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
      console.error('Failed to load notes:', err);
      setNoteError('Could not load notes.');
    } finally {
      setNoteLoading(false);
    }
  };

  const addNote = async (event) => {
    if (event) event.preventDefault();
    if (!noteMedication) return;
    if (!noteText.trim()) {
      setNoteError('Note is required.');
      return;
    }

    try {
      setNoteError(null);
      await pharmacyService.addMedicationNote(noteMedication._id, { note: noteText.trim() });
      const res = await pharmacyService.listMedicationNotes(noteMedication._id, { page: 1, limit: 10 });
      setNotes(res?.data || []);
      setNoteText('');
    } catch (err) {
      console.error('Failed to add note:', err);
      setNoteError(err.response?.data?.message || 'Failed to add note.');
    }
  };

  const handleDispense = async (event) => {
    if (event) event.preventDefault();
    if (!dispenseForm.medicationId.trim() || !Number(dispenseForm.quantity)) {
      setDispenseMessage('Medication ID and quantity are required.');
      return;
    }

    try {
      setDispenseSaving(true);
      setDispenseMessage(null);
      await pharmacyService.dispenseMedication({
        medicationId: dispenseForm.medicationId.trim(),
        prescriptionId: dispenseForm.prescriptionId.trim() || undefined,
        residentId: dispenseForm.residentId.trim() || undefined,
        quantity: Number(dispenseForm.quantity),
        dispensedAt: dispenseForm.dispensedAt ? toIsoDate(dispenseForm.dispensedAt) : undefined,
        notes: dispenseForm.notes.trim() || undefined,
      });
      setDispenseForm({ ...emptyDispenseForm });
      setDispenseMessage('Medication dispensed successfully.');
      loadMedications();
      loadLowStock();
      loadSummary();
    } catch (err) {
      console.error('Failed to dispense:', err);
      setDispenseMessage(err.response?.data?.message || 'Failed to dispense medication.');
    } finally {
      setDispenseSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyId.trim()) return;
    try {
      setVerifyMessage(null);
      const res = await pharmacyService.verifyPrescription(verifyId.trim());
      setVerifyMessage(res?.message || 'Prescription verified.');
    } catch (err) {
      console.error('Failed to verify prescription:', err);
      setVerifyMessage(err.response?.data?.message || 'Failed to verify prescription.');
    }
  };

  return (
    <div className="pharmacy-page">
      <header className="pharmacy-header">
        <div>
          <h1>Pharmacy Operations</h1>
          <p>Manage medication inventory, suppliers, stock receipts, and dispensing workflows.</p>
        </div>
        <button className="pharmacy-refresh" onClick={loadSummary} disabled={summaryLoading}>
          <RefreshCw size={16} className={summaryLoading ? 'spin' : ''} />
          Refresh Summary
        </button>
      </header>

      <nav className="pharmacy-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`pharmacy-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
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
              <span>Active Medications</span>
              <strong>{summary?.activeMedications ?? '--'}</strong>
            </div>
            <div className="summary-card">
              <span>Active Suppliers</span>
              <strong>{summary?.activeSuppliers ?? '--'}</strong>
            </div>
            <div className="summary-card">
              <span>Low Stock Alerts</span>
              <strong>{summary?.lowStockCount ?? '--'}</strong>
            </div>
            <div className="summary-card">
              <span>Expiring Soon</span>
              <strong>{summary?.expiringSoonCount ?? '--'}</strong>
            </div>
          </div>

          <div className="pharmacy-grid">
            <div className="pharmacy-card">
              <div className="pharmacy-card__header">
                <div>
                  <h3>Low Stock Alerts</h3>
                  <p>Monitor items below minimum stock threshold.</p>
                </div>
                <AlertTriangle size={18} />
              </div>
              <div className="pharmacy-card__body">
                {lowStock.length === 0 ? (
                  <p className="pharmacy-empty">No low stock alerts.</p>
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
                  <h3>Expiring Stock</h3>
                  <p>Upcoming expiries within the selected window.</p>
                </div>
                <PackageOpen size={18} />
              </div>
              <div className="pharmacy-card__body">
                <label className="pharmacy-inline">
                  Days window
                  <input
                    type="number"
                    min="1"
                    value={expiryDays}
                    onChange={(event) => setExpiryDays(Number(event.target.value) || 30)}
                  />
                </label>
                {expiryList.length === 0 ? (
                  <p className="pharmacy-empty">No expiring stock found.</p>
                ) : (
                  <ul className="pharmacy-list">
                    {expiryList.slice(0, 6).map((item) => (
                      <li key={item._id}>
                        <span>{item.medicationId?.name || 'Medication'}</span>
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
                value={medSearch}
                onChange={(event) => setMedSearch(event.target.value)}
                placeholder="Search medication, code, manufacturer"
              />
            </div>
            <select value={medActive} onChange={(event) => setMedActive(event.target.value)}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
              <option value="">All</option>
            </select>
            <button type="button" className="pharmacy-primary" onClick={() => openMedicationModal(null)}>
              <Plus size={16} />
              Add Medication
            </button>
          </div>

          <div className="pharmacy-card">
            {medError && <p className="pharmacy-error">{medError}</p>}
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Form</th>
                  <th>Available</th>
                  <th>Min Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medLoading && (
                  <tr>
                    <td colSpan="7" className="pharmacy-empty">Loading medications...</td>
                  </tr>
                )}
                {!medLoading && medications.length === 0 && (
                  <tr>
                    <td colSpan="7" className="pharmacy-empty">No medications found.</td>
                  </tr>
                )}
                {!medLoading &&
                  medications.map((med) => (
                    <tr key={med._id}>
                      <td>{med.medicationCode}</td>
                      <td>
                        <strong>{med.name}</strong>
                        <span className="pharmacy-muted">{med.manufacturer || 'N/A'}</span>
                      </td>
                      <td>{med.form || 'N/A'}</td>
                      <td>{med.availableQuantity}</td>
                      <td>{med.minStockLevel}</td>
                      <td>
                        <span className={`status-pill ${med.isActive ? 'active' : 'inactive'}`}>
                          {med.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="pharmacy-action" onClick={() => openMedicationModal(med)}>
                          Edit
                        </button>
                        <button type="button" className="pharmacy-action ghost" onClick={() => openNotes(med)}>
                          Notes
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
              Prev
            </button>
            <span>
              Page {medPage} of {medTotalPages} | {medTotal} items
            </span>
            <button
              type="button"
              onClick={() => setMedPage((prev) => Math.min(medTotalPages, prev + 1))}
              disabled={medPage >= medTotalPages}
            >
              Next
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
                value={supSearch}
                onChange={(event) => setSupSearch(event.target.value)}
                placeholder="Search suppliers"
              />
            </div>
            <select value={supActive} onChange={(event) => setSupActive(event.target.value)}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
              <option value="">All</option>
            </select>
            <button type="button" className="pharmacy-primary" onClick={() => openSupplierModal(null)}>
              <Plus size={16} />
              Add Supplier
            </button>
          </div>

          <div className="pharmacy-card">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {supLoading && (
                  <tr>
                    <td colSpan="6" className="pharmacy-empty">Loading suppliers...</td>
                  </tr>
                )}
                {!supLoading && suppliers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="pharmacy-empty">No suppliers found.</td>
                  </tr>
                )}
                {!supLoading &&
                  suppliers.map((supplier) => (
                    <tr key={supplier._id}>
                      <td>{supplier.name}</td>
                      <td>{supplier.contactName || 'N/A'}</td>
                      <td>{supplier.phone || 'N/A'}</td>
                      <td>{supplier.email || 'N/A'}</td>
                      <td>
                        <span className={`status-pill ${supplier.isActive ? 'active' : 'inactive'}`}>
                          {supplier.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="pharmacy-action" onClick={() => openSupplierModal(supplier)}>
                          Edit
                        </button>
                        {supplier.isActive && (
                          <button
                            type="button"
                            className="pharmacy-action ghost"
                            onClick={() => deactivateSupplier(supplier._id)}
                          >
                            Deactivate
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
              Prev
            </button>
            <span>Page {supPage} of {supTotalPages}</span>
            <button
              type="button"
              onClick={() => setSupPage((prev) => Math.min(supTotalPages, prev + 1))}
              disabled={supPage >= supTotalPages}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {activeTab === 'stocks' && (
        <section className="pharmacy-section">
          <div className="pharmacy-toolbar wide">
            <input
              type="text"
              placeholder="Medication ID"
              value={stockFilters.medicationId}
              onChange={(event) =>
                setStockFilters((prev) => ({ ...prev, medicationId: event.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Supplier ID"
              value={stockFilters.supplierId}
              onChange={(event) =>
                setStockFilters((prev) => ({ ...prev, supplierId: event.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Lot Number"
              value={stockFilters.lotNumber}
              onChange={(event) =>
                setStockFilters((prev) => ({ ...prev, lotNumber: event.target.value }))
              }
            />
            <input
              type="date"
              value={stockFilters.expiryFrom}
              onChange={(event) =>
                setStockFilters((prev) => ({ ...prev, expiryFrom: event.target.value }))
              }
            />
            <input
              type="date"
              value={stockFilters.expiryTo}
              onChange={(event) =>
                setStockFilters((prev) => ({ ...prev, expiryTo: event.target.value }))
              }
            />
            <button type="button" className="pharmacy-primary" onClick={() => openStockModal(null)}>
              <Plus size={16} />
              Receive Stock
            </button>
          </div>

          <div className="pharmacy-card">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Lot</th>
                  <th>Expiry</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stockLoading && (
                  <tr>
                    <td colSpan="7" className="pharmacy-empty">Loading stock entries...</td>
                  </tr>
                )}
                {!stockLoading && stocks.length === 0 && (
                  <tr>
                    <td colSpan="7" className="pharmacy-empty">No stock entries found.</td>
                  </tr>
                )}
                {!stockLoading &&
                  stocks.map((stock) => (
                    <tr key={stock._id}>
                      <td>{stock.medicationId?.name || stock.medicationId}</td>
                      <td>{stock.quantity}</td>
                      <td>{stock.unit || 'N/A'}</td>
                      <td>{stock.lotNumber || 'N/A'}</td>
                      <td>{formatDate(stock.expiryDate)}</td>
                      <td>{formatDate(stock.receivedDate)}</td>
                      <td>
                        <button type="button" className="pharmacy-action" onClick={() => openStockModal(stock)}>
                          Edit
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
              Prev
            </button>
            <span>Page {stockPage} of {stockTotalPages}</span>
            <button
              type="button"
              onClick={() => setStockPage((prev) => Math.min(stockTotalPages, prev + 1))}
              disabled={stockPage >= stockTotalPages}
            >
              Next
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
                  <h3>Dispense Medication</h3>
                  <p>Record a dispensing transaction.</p>
                </div>
              </div>
              <form className="pharmacy-form" onSubmit={handleDispense}>
                <input
                  type="text"
                  placeholder="Medication ID"
                  value={dispenseForm.medicationId}
                  onChange={(event) =>
                    setDispenseForm((prev) => ({ ...prev, medicationId: event.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="Prescription ID (optional)"
                  value={dispenseForm.prescriptionId}
                  onChange={(event) =>
                    setDispenseForm((prev) => ({ ...prev, prescriptionId: event.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="Resident ID (optional)"
                  value={dispenseForm.residentId}
                  onChange={(event) =>
                    setDispenseForm((prev) => ({ ...prev, residentId: event.target.value }))
                  }
                />
                <input
                  type="number"
                  placeholder="Quantity"
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
                <textarea
                  rows="3"
                  placeholder="Notes"
                  value={dispenseForm.notes}
                  onChange={(event) =>
                    setDispenseForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />
                <button type="submit" className="pharmacy-primary" disabled={dispenseSaving}>
                  {dispenseSaving ? 'Dispensing...' : 'Dispense'}
                </button>
                {dispenseMessage && <p className="pharmacy-message">{dispenseMessage}</p>}
              </form>
            </div>

            <div className="pharmacy-card">
              <div className="pharmacy-card__header">
                <div>
                  <h3>Verify Prescription</h3>
                  <p>Verify a prescription before dispensing.</p>
                </div>
              </div>
              <div className="pharmacy-form">
                <input
                  type="text"
                  placeholder="Prescription ID"
                  value={verifyId}
                  onChange={(event) => setVerifyId(event.target.value)}
                />
                <button type="button" className="pharmacy-primary" onClick={handleVerify}>
                  Verify
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
              From
              <input
                type="date"
                value={usageRange.from}
                onChange={(event) => setUsageRange((prev) => ({ ...prev, from: event.target.value }))}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={usageRange.to}
                onChange={(event) => setUsageRange((prev) => ({ ...prev, to: event.target.value }))}
              />
            </label>
            <button type="button" className="pharmacy-primary" onClick={loadUsageStats}>
              Refresh Usage
            </button>
          </div>

          <div className="pharmacy-card">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Total Dispensed</th>
                  <th>Dispense Count</th>
                </tr>
              </thead>
              <tbody>
                {usageLoading && (
                  <tr>
                    <td colSpan="3" className="pharmacy-empty">Loading usage stats...</td>
                  </tr>
                )}
                {!usageLoading && usageStats.length === 0 && (
                  <tr>
                    <td colSpan="3" className="pharmacy-empty">No usage stats found.</td>
                  </tr>
                )}
                {!usageLoading &&
                  usageStats.map((row) => (
                    <tr key={row.medication?._id || row.medicationId}>
                      <td>{row.medication?.name || row.medication?._id || 'N/A'}</td>
                      <td>{row.totalDispensed}</td>
                      <td>{row.dispenseCount}</td>
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
                <h2>{editingMedication ? 'Edit Medication' : 'Add Medication'}</h2>
                <p>Maintain inventory metadata and minimum stock levels.</p>
              </div>
              <button type="button" onClick={() => setShowMedicationModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="pharmacy-modal__body" onSubmit={saveMedication}>
              <div className="pharmacy-form-grid">
                <label>
                  Name *
                  <input
                    type="text"
                    value={medicationForm.name}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Code
                  <input
                    type="text"
                    value={medicationForm.medicationCode}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, medicationCode: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Form
                  <input
                    type="text"
                    value={medicationForm.form}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, form: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Strength
                  <input
                    type="text"
                    value={medicationForm.strength}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, strength: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Unit
                  <input
                    type="text"
                    value={medicationForm.unit}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, unit: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Manufacturer
                  <input
                    type="text"
                    value={medicationForm.manufacturer}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, manufacturer: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Minimum Stock
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
                  Active
                  <select
                    value={medicationForm.isActive ? 'true' : 'false'}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))
                    }
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>
                <label className="full">
                  Description
                  <textarea
                    rows="3"
                    value={medicationForm.description}
                    onChange={(event) =>
                      setMedicationForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </label>
              </div>

              {medicationError && <p className="pharmacy-error">{medicationError}</p>}

              <div className="pharmacy-modal__footer">
                <button type="button" onClick={() => setShowMedicationModal(false)} className="ghost">
                  Cancel
                </button>
                <button type="submit" className="pharmacy-primary" disabled={medicationSaving}>
                  {medicationSaving ? 'Saving...' : 'Save'}
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
                <h2>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
                <p>Maintain vendor contact and supply details.</p>
              </div>
              <button type="button" onClick={() => setShowSupplierModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="pharmacy-modal__body" onSubmit={saveSupplier}>
              <div className="pharmacy-form-grid">
                <label>
                  Name *
                  <input
                    type="text"
                    value={supplierForm.name}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Contact Name
                  <input
                    type="text"
                    value={supplierForm.contactName}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, contactName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Phone
                  <input
                    type="text"
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
                    value={supplierForm.email}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                </label>
                <label className="full">
                  Address
                  <input
                    type="text"
                    value={supplierForm.address}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                  />
                </label>
                <label className="full">
                  Notes
                  <textarea
                    rows="3"
                    value={supplierForm.notes}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Active
                  <select
                    value={supplierForm.isActive ? 'true' : 'false'}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))
                    }
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>
              </div>

              {supplierError && <p className="pharmacy-error">{supplierError}</p>}

              <div className="pharmacy-modal__footer">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="ghost">
                  Cancel
                </button>
                <button type="submit" className="pharmacy-primary" disabled={supplierSaving}>
                  {supplierSaving ? 'Saving...' : 'Save'}
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
                <h2>{editingStock ? 'Edit Stock Entry' : 'Receive Stock'}</h2>
                <p>Record inbound medication stock and batch details.</p>
              </div>
              <button type="button" onClick={() => setShowStockModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="pharmacy-modal__body" onSubmit={saveStock}>
              <div className="pharmacy-form-grid">
                <label>
                  Medication ID *
                  <input
                    type="text"
                    value={stockForm.medicationId}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, medicationId: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Supplier ID
                  <input
                    type="text"
                    value={stockForm.supplierId}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, supplierId: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Quantity *
                  <input
                    type="number"
                    min="0"
                    value={stockForm.quantity}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, quantity: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Unit
                  <input
                    type="text"
                    value={stockForm.unit}
                    onChange={(event) => setStockForm((prev) => ({ ...prev, unit: event.target.value }))}
                  />
                </label>
                <label>
                  Lot Number
                  <input
                    type="text"
                    value={stockForm.lotNumber}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, lotNumber: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Expiry Date
                  <input
                    type="datetime-local"
                    value={stockForm.expiryDate}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, expiryDate: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Received Date
                  <input
                    type="datetime-local"
                    value={stockForm.receivedDate}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, receivedDate: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Cost Per Unit
                  <input
                    type="number"
                    min="0"
                    value={stockForm.costPerUnit}
                    onChange={(event) =>
                      setStockForm((prev) => ({ ...prev, costPerUnit: event.target.value }))
                    }
                  />
                </label>
                <label className="full">
                  Notes
                  <textarea
                    rows="3"
                    value={stockForm.notes}
                    onChange={(event) => setStockForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </label>
              </div>

              {stockError && <p className="pharmacy-error">{stockError}</p>}

              <div className="pharmacy-modal__footer">
                <button type="button" onClick={() => setShowStockModal(false)} className="ghost">
                  Cancel
                </button>
                <button type="submit" className="pharmacy-primary" disabled={stockSaving}>
                  {stockSaving ? 'Saving...' : 'Save'}
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
                <h2>Medication Notes</h2>
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
                  placeholder="Add a note"
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                />
                <button type="submit" className="pharmacy-primary">Add Note</button>
                {noteError && <p className="pharmacy-error">{noteError}</p>}
              </form>
              {noteLoading ? (
                <p className="pharmacy-empty">Loading notes...</p>
              ) : (
                <ul className="pharmacy-list">
                  {notes.length === 0 && <li className="pharmacy-empty">No notes yet.</li>}
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
