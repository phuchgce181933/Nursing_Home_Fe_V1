import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  HeartPulse,
  Home,
} from 'lucide-react';
import residentService from '../../services/resident.service';

const GENDERS = [
  { value: '', label: 'All Genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
];

const BLOOD_TYPES = [
  { value: '', label: 'All Blood Types' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
  { value: 'unknown', label: 'Unknown' },
];

const RESIDENCY_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'admitted', label: 'Admitted' },
  { value: 'discharged', label: 'Discharged' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'inactive', label: 'Inactive' },
];

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

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const toDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
};

const splitList = (value) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseFamilyIds = (value) => splitList(value).filter(Boolean);

const buildContactsPayload = (contacts) => {
  const payload = [];

  for (const contact of contacts) {
    const fullName = String(contact.fullName || '').trim();
    const relationship = String(contact.relationship || '').trim();
    const phone = String(contact.phone || '').trim();
    const email = String(contact.email || '').trim();
    const address = String(contact.address || '').trim();

    const hasAny = fullName || relationship || phone || email || address;
    if (!hasAny) continue;

    if (!fullName || !relationship || !phone) {
      return { error: 'Each emergency contact must include full name, relationship, and phone.' };
    }

    payload.push({
      fullName,
      relationship,
      phone,
      email: email || undefined,
      address: address || undefined,
      isPrimary: Boolean(contact.isPrimary),
    });
  }

  return { contacts: payload };
};

const emptyPersonalForm = {
  residentCode: '',
  fullName: '',
  dateOfBirth: '',
  gender: 'unknown',
  citizenId: '',
  insuranceNumber: '',
  bloodType: 'unknown',
  personalAddress: '',
  allergies: '',
  chronicConditions: '',
  initialHealthCondition: '',
  residencyStatus: 'pending',
  admittedAt: '',
  dischargedAt: '',
  servicePackage: '',
};

function ResidentPage({ defaultMode }) {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [residencyStatus, setResidencyStatus] = useState('');
  const [gender, setGender] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [admittedFrom, setAdmittedFrom] = useState('');
  const [admittedTo, setAdmittedTo] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    residencyStatus: '',
    gender: '',
    bloodType: '',
    admittedFrom: '',
    admittedTo: '',
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyPersonalForm });
  const [createContacts, setCreateContacts] = useState([]);
  const [createFamilyIds, setCreateFamilyIds] = useState('');
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState(null);
  const [selectedResident, setSelectedResident] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [personalForm, setPersonalForm] = useState({ ...emptyPersonalForm });
  const [personalError, setPersonalError] = useState(null);
  const [personalSaving, setPersonalSaving] = useState(false);

  const [familyContacts, setFamilyContacts] = useState([]);
  const [familyIds, setFamilyIds] = useState('');
  const [familyError, setFamilyError] = useState(null);
  const [familySaving, setFamilySaving] = useState(false);

  const stats = useMemo(() => {
    const admittedCount = residents.filter((item) => item.residencyStatus === 'admitted').length;
    const pendingCount = residents.filter((item) => item.residencyStatus === 'pending').length;
    const inactiveCount = residents.filter((item) => item.residencyStatus === 'inactive').length;
    return { admittedCount, pendingCount, inactiveCount };
  }, [residents]);

  const fetchResidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        search: appliedFilters.search || undefined,
        residencyStatus: appliedFilters.residencyStatus || undefined,
        gender: appliedFilters.gender || undefined,
        bloodType: appliedFilters.bloodType || undefined,
        admittedFrom: appliedFilters.admittedFrom || undefined,
        admittedTo: appliedFilters.admittedTo || undefined,
      };

      const res = await residentService.getResidentList(params);
      setResidents(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load residents:', err);
      setError('Could not retrieve residents. Please check your credentials or network connection.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  useEffect(() => {
    if (defaultMode === 'create') {
      setShowCreateModal(true);
    }
  }, [defaultMode]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedResidentId || !showDetailModal) return;
      try {
        setDetailLoading(true);
        setDetailError(null);
        const res = await residentService.getResidentDetail(selectedResidentId);
        const resident = res?.resident || null;
        setSelectedResident(resident);

        setPersonalForm({
          residentCode: resident?.residentCode || '',
          fullName: resident?.fullName || '',
          dateOfBirth: toDateInput(resident?.dateOfBirth),
          gender: resident?.gender || 'unknown',
          citizenId: resident?.citizenId || '',
          insuranceNumber: resident?.insuranceNumber || '',
          bloodType: resident?.bloodType || 'unknown',
          personalAddress: resident?.personalAddress || '',
          allergies: (resident?.allergies || []).join('\n'),
          chronicConditions: (resident?.chronicConditions || []).join('\n'),
          initialHealthCondition: resident?.initialHealthCondition || '',
          residencyStatus: resident?.residencyStatus || 'pending',
          admittedAt: toDateTimeInput(resident?.admittedAt),
          dischargedAt: toDateTimeInput(resident?.dischargedAt),
          servicePackage: resident?.servicePackage || '',
        });

        setFamilyContacts(
          Array.isArray(resident?.emergencyContacts) ? resident.emergencyContacts : []
        );
        setFamilyIds(
          Array.isArray(resident?.familyPortalAccounts)
            ? resident.familyPortalAccounts.map((user) => user._id).join('\n')
            : ''
        );
      } catch (err) {
        console.error('Failed to load resident details:', err);
        setDetailError('Could not load resident details.');
      } finally {
        setDetailLoading(false);
      }
    };

    loadDetail();
  }, [selectedResidentId, showDetailModal]);

  const handleApplyFilters = (event) => {
    if (event) event.preventDefault();
    setPage(1);
    setAppliedFilters({ search, residencyStatus, gender, bloodType, admittedFrom, admittedTo });
  };

  const handleResetFilters = () => {
    setSearch('');
    setResidencyStatus('');
    setGender('');
    setBloodType('');
    setAdmittedFrom('');
    setAdmittedTo('');
    setPage(1);
    setAppliedFilters({
      search: '',
      residencyStatus: '',
      gender: '',
      bloodType: '',
      admittedFrom: '',
      admittedTo: '',
    });
  };

  const resetCreateForm = () => {
    setCreateForm({ ...emptyPersonalForm });
    setCreateContacts([]);
    setCreateFamilyIds('');
    setCreateError(null);
  };

  const handleOpenCreate = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const handleCloseCreate = () => {
    setShowCreateModal(false);
    setCreateError(null);
  };

  const handleOpenDetail = (residentId) => {
    setSelectedResidentId(residentId);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedResidentId(null);
    setSelectedResident(null);
    setPersonalError(null);
    setFamilyError(null);
  };

  const handleCreateResident = async (event) => {
    if (event) event.preventDefault();
    if (!createForm.fullName.trim()) {
      setCreateError('Full name is required.');
      return;
    }

    const { contacts, error: contactsError } = buildContactsPayload(createContacts);
    if (contactsError) {
      setCreateError(contactsError);
      return;
    }

    const payload = {
      residentCode: createForm.residentCode.trim() || undefined,
      fullName: createForm.fullName.trim(),
      dateOfBirth: createForm.dateOfBirth || undefined,
      gender: createForm.gender || undefined,
      citizenId: createForm.citizenId.trim() || undefined,
      insuranceNumber: createForm.insuranceNumber.trim() || undefined,
      bloodType: createForm.bloodType || undefined,
      personalAddress: createForm.personalAddress.trim() || undefined,
      allergies: createForm.allergies ? splitList(createForm.allergies) : [],
      chronicConditions: createForm.chronicConditions ? splitList(createForm.chronicConditions) : [],
      initialHealthCondition: createForm.initialHealthCondition.trim() || undefined,
      residencyStatus: createForm.residencyStatus || undefined,
      admittedAt: createForm.admittedAt || undefined,
      dischargedAt: createForm.dischargedAt || undefined,
      servicePackage: createForm.servicePackage.trim() || undefined,
      emergencyContacts: contacts || [],
      familyPortalAccountIds: parseFamilyIds(createFamilyIds),
    };

    try {
      setCreating(true);
      setCreateError(null);
      await residentService.createResident(payload);
      setShowCreateModal(false);
      resetCreateForm();
      fetchResidents();
    } catch (err) {
      console.error('Failed to create resident:', err);
      setCreateError(err.response?.data?.message || 'Failed to create resident.');
    } finally {
      setCreating(false);
    }
  };

  const handleSavePersonalInfo = async (event) => {
    if (event) event.preventDefault();
    if (!selectedResidentId) return;
    if (!personalForm.fullName.trim()) {
      setPersonalError('Full name is required.');
      return;
    }

    try {
      setPersonalSaving(true);
      setPersonalError(null);
      const payload = {
        fullName: personalForm.fullName.trim(),
        dateOfBirth: personalForm.dateOfBirth || undefined,
        gender: personalForm.gender || undefined,
        citizenId: personalForm.citizenId.trim(),
        insuranceNumber: personalForm.insuranceNumber.trim(),
        bloodType: personalForm.bloodType || undefined,
        personalAddress: personalForm.personalAddress.trim(),
        allergies: personalForm.allergies ? splitList(personalForm.allergies) : [],
        chronicConditions: personalForm.chronicConditions
          ? splitList(personalForm.chronicConditions)
          : [],
        initialHealthCondition: personalForm.initialHealthCondition.trim(),
      };

      const res = await residentService.updateResidentPersonalInfo(selectedResidentId, payload);
      setSelectedResident(res?.resident || selectedResident);
      fetchResidents();
    } catch (err) {
      console.error('Failed to update personal info:', err);
      setPersonalError(err.response?.data?.message || 'Failed to update personal info.');
    } finally {
      setPersonalSaving(false);
    }
  };

  const handleSaveFamilyInfo = async (event) => {
    if (event) event.preventDefault();
    if (!selectedResidentId) return;

    const { contacts, error: contactsError } = buildContactsPayload(familyContacts);
    if (contactsError) {
      setFamilyError(contactsError);
      return;
    }

    try {
      setFamilySaving(true);
      setFamilyError(null);
      const payload = {
        emergencyContacts: contacts || [],
        familyPortalAccountIds: parseFamilyIds(familyIds),
      };
      const res = await residentService.updateResidentFamilyInfo(selectedResidentId, payload);
      setSelectedResident(res?.resident || selectedResident);
      fetchResidents();
    } catch (err) {
      console.error('Failed to update family info:', err);
      setFamilyError(err.response?.data?.message || 'Failed to update family info.');
    } finally {
      setFamilySaving(false);
    }
  };

  const addContactRow = (setter, current) => {
    setter([
      ...current,
      { fullName: '', relationship: '', phone: '', email: '', address: '', isPrimary: false },
    ]);
  };

  const updateContact = (index, key, value, setter, current) => {
    const next = [...current];
    next[index] = { ...next[index], [key]: value };
    setter(next);
  };

  const removeContact = (index, setter, current) => {
    const next = [...current];
    next.splice(index, 1);
    setter(next);
  };

  return (
    <div className="resident-page">
      <div className="resident-page__header">
        <div>
          <h1 className="resident-page__title">Resident Management</h1>
          <p className="resident-page__subtitle">
            Search, review, and update resident profiles with medical and family records.
          </p>
        </div>
        <div className="resident-page__actions">
          <button
            className="resident-page__button resident-page__button--ghost"
            onClick={fetchResidents}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button
            className="resident-page__button resident-page__button--primary"
            onClick={handleOpenCreate}
          >
            <Plus size={16} />
            Add Resident
          </button>
        </div>
      </div>

      <div className="resident-page__stats">
        <div className="resident-stat">
          <div className="resident-stat__icon">
            <Users size={20} />
          </div>
          <div>
            <span>Total Residents</span>
            <strong>{String(total).padStart(2, '0')}</strong>
          </div>
        </div>
        <div className="resident-stat">
          <div className="resident-stat__icon resident-stat__icon--admitted">
            <Home size={20} />
          </div>
          <div>
            <span>Admitted</span>
            <strong>{String(stats.admittedCount).padStart(2, '0')}</strong>
          </div>
        </div>
        <div className="resident-stat">
          <div className="resident-stat__icon resident-stat__icon--pending">
            <HeartPulse size={20} />
          </div>
          <div>
            <span>Pending</span>
            <strong>{String(stats.pendingCount).padStart(2, '0')}</strong>
          </div>
        </div>
        <div className="resident-stat">
          <div className="resident-stat__icon resident-stat__icon--inactive">
            <Users size={20} />
          </div>
          <div>
            <span>Inactive</span>
            <strong>{String(stats.inactiveCount).padStart(2, '0')}</strong>
          </div>
        </div>
      </div>

      <form className="resident-page__filters" onSubmit={handleApplyFilters}>
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>Search</span>
            <div className="resident-page__filter-input">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code, name, citizen ID"
              />
            </div>
          </label>

          <label className="resident-page__filter">
            <span>Status</span>
            <select value={residencyStatus} onChange={(e) => setResidencyStatus(e.target.value)}>
              {RESIDENCY_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="resident-page__filter">
            <span>Gender</span>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              {GENDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="resident-page__filter">
            <span>Blood Type</span>
            <select value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
              {BLOOD_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>Admitted From</span>
            <input
              type="date"
              value={admittedFrom}
              onChange={(e) => setAdmittedFrom(e.target.value)}
            />
          </label>

          <label className="resident-page__filter">
            <span>Admitted To</span>
            <input
              type="date"
              value={admittedTo}
              onChange={(e) => setAdmittedTo(e.target.value)}
            />
          </label>

          <div className="resident-page__filter-actions">
            <button className="resident-page__button resident-page__button--primary" type="submit">
              Apply Filters
            </button>
            <button
              className="resident-page__button resident-page__button--ghost"
              type="button"
              onClick={handleResetFilters}
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      {error && <div className="resident-page__error">{error}</div>}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th>Room</th>
              <th>Bed</th>
              <th>Admitted At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="7" className="resident-page__empty">
                  Loading residents...
                </td>
              </tr>
            )}

            {!loading && residents.length === 0 && (
              <tr>
                <td colSpan="7" className="resident-page__empty">
                  No residents found.
                </td>
              </tr>
            )}

            {!loading &&
              residents.map((resident) => (
                <tr key={resident._id} className="resident-page__table-row">
                  <td>{resident.residentCode}</td>
                  <td>
                    <div className="resident-page__name">
                      <strong>{resident.fullName}</strong>
                      <span>{resident.citizenId || 'No ID'}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`resident-page__status resident-page__status--${
                        resident.residencyStatus || 'pending'
                      }`}
                    >
                      {resident.residencyStatus || 'pending'}
                    </span>
                  </td>
                  <td>{resident.room?.roomCode || 'Unassigned'}</td>
                  <td>{resident.bed?.bedCode || 'Unassigned'}</td>
                  <td>{formatDateTime(resident.admittedAt)}</td>
                  <td>
                    <button
                      className="resident-page__action"
                      onClick={() => handleOpenDetail(resident._id)}
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="resident-page__pagination">
        <button
          className="resident-page__page-btn"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft size={16} />
          Prev
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          className="resident-page__page-btn"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>

      {showCreateModal && (
        <div className="resident-modal" role="dialog" aria-modal="true">
          <div className="resident-modal__content">
            <div className="resident-modal__header">
              <div>
                <h2>Create Resident Profile</h2>
                <p>Enter personal and family details to open a new record.</p>
              </div>
              <button className="resident-modal__close" onClick={handleCloseCreate}>
                <X size={18} />
              </button>
            </div>

            <form className="resident-modal__body" onSubmit={handleCreateResident}>
              <div className="resident-form-grid">
                <label>
                  Full Name *
                  <input
                    type="text"
                    value={createForm.fullName}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    placeholder="Enter resident name"
                  />
                </label>
                <label>
                  Resident Code
                  <input
                    type="text"
                    value={createForm.residentCode}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, residentCode: e.target.value }))
                    }
                    placeholder="Auto-generated if blank"
                  />
                </label>
                <label>
                  Date of Birth
                  <input
                    type="date"
                    value={createForm.dateOfBirth}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Gender
                  <select
                    value={createForm.gender}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, gender: e.target.value }))
                    }
                  >
                    {GENDERS.filter((option) => option.value !== '').map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Citizen ID
                  <input
                    type="text"
                    value={createForm.citizenId}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, citizenId: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Insurance Number
                  <input
                    type="text"
                    value={createForm.insuranceNumber}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, insuranceNumber: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Blood Type
                  <select
                    value={createForm.bloodType}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, bloodType: e.target.value }))
                    }
                  >
                    {BLOOD_TYPES.filter((option) => option.value !== '').map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  Address
                  <input
                    type="text"
                    value={createForm.personalAddress}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, personalAddress: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Residency Status
                  <select
                    value={createForm.residencyStatus}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, residencyStatus: e.target.value }))
                    }
                  >
                    {RESIDENCY_STATUSES.filter((option) => option.value !== '').map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Admitted At
                  <input
                    type="datetime-local"
                    value={createForm.admittedAt}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, admittedAt: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Discharged At
                  <input
                    type="datetime-local"
                    value={createForm.dischargedAt}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, dischargedAt: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Service Package
                  <input
                    type="text"
                    value={createForm.servicePackage}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, servicePackage: e.target.value }))
                    }
                  />
                </label>
                <label className="full">
                  Allergies (one per line)
                  <textarea
                    rows="3"
                    value={createForm.allergies}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, allergies: e.target.value }))
                    }
                  />
                </label>
                <label className="full">
                  Chronic Conditions (one per line)
                  <textarea
                    rows="3"
                    value={createForm.chronicConditions}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, chronicConditions: e.target.value }))
                    }
                  />
                </label>
                <label className="full">
                  Initial Health Condition
                  <textarea
                    rows="3"
                    value={createForm.initialHealthCondition}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, initialHealthCondition: e.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="resident-form-section">
                <div className="resident-form-section__header">
                  <h3>Emergency Contacts</h3>
                  <button
                    type="button"
                    className="resident-page__button resident-page__button--ghost"
                    onClick={() => addContactRow(setCreateContacts, createContacts)}
                  >
                    Add Contact
                  </button>
                </div>
                {createContacts.length === 0 && (
                  <p className="resident-form-empty">No contacts added yet.</p>
                )}
                {createContacts.map((contact, index) => (
                  <div key={`create-contact-${index}`} className="resident-contact-row">
                    <input
                      type="text"
                      placeholder="Full name"
                      value={contact.fullName}
                      onChange={(e) =>
                        updateContact(index, 'fullName', e.target.value, setCreateContacts, createContacts)
                      }
                    />
                    <input
                      type="text"
                      placeholder="Relationship"
                      value={contact.relationship}
                      onChange={(e) =>
                        updateContact(index, 'relationship', e.target.value, setCreateContacts, createContacts)
                      }
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={contact.phone}
                      onChange={(e) =>
                        updateContact(index, 'phone', e.target.value, setCreateContacts, createContacts)
                      }
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={contact.email}
                      onChange={(e) =>
                        updateContact(index, 'email', e.target.value, setCreateContacts, createContacts)
                      }
                    />
                    <input
                      type="text"
                      placeholder="Address"
                      value={contact.address}
                      onChange={(e) =>
                        updateContact(index, 'address', e.target.value, setCreateContacts, createContacts)
                      }
                    />
                    <label className="resident-contact-row__toggle">
                      <input
                        type="checkbox"
                        checked={contact.isPrimary}
                        onChange={(e) =>
                          updateContact(index, 'isPrimary', e.target.checked, setCreateContacts, createContacts)
                        }
                      />
                      Primary
                    </label>
                    <button
                      type="button"
                      className="resident-contact-row__remove"
                      onClick={() => removeContact(index, setCreateContacts, createContacts)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="resident-form-section">
                <h3>Family Portal Account IDs (one per line)</h3>
                <textarea
                  rows="3"
                  value={createFamilyIds}
                  onChange={(e) => setCreateFamilyIds(e.target.value)}
                  placeholder="Paste user IDs of family accounts"
                />
              </div>

              {createError && <p className="resident-form-error">{createError}</p>}

              <div className="resident-modal__footer">
                <button
                  type="button"
                  className="resident-page__button resident-page__button--ghost"
                  onClick={handleCloseCreate}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="resident-page__button resident-page__button--primary"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Resident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div className="resident-modal" role="dialog" aria-modal="true">
          <div className="resident-modal__content resident-modal__content--wide">
            <div className="resident-modal__header">
              <div>
                <h2>Resident Profile</h2>
                <p>Review and update personal or family information.</p>
              </div>
              <button className="resident-modal__close" onClick={handleCloseDetail}>
                <X size={18} />
              </button>
            </div>

            {detailLoading && <p className="resident-form-empty">Loading details...</p>}
            {detailError && <p className="resident-form-error">{detailError}</p>}

            {!detailLoading && selectedResident && (
              <div className="resident-modal__body">
                <div className="resident-detail-card">
                  <div>
                    <h3>{selectedResident.fullName}</h3>
                    <p>{selectedResident.residentCode}</p>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{selectedResident.residencyStatus}</strong>
                  </div>
                  <div>
                    <span>Room / Bed</span>
                    <strong>
                      {selectedResident.room?.roomCode || 'Unassigned'} /{' '}
                      {selectedResident.bed?.bedCode || 'Unassigned'}
                    </strong>
                  </div>
                  <div>
                    <span>Admitted At</span>
                    <strong>{formatDateTime(selectedResident.admittedAt)}</strong>
                  </div>
                </div>

                <form className="resident-form-section" onSubmit={handleSavePersonalInfo}>
                  <div className="resident-form-section__header">
                    <h3>Personal Information</h3>
                    <button
                      className="resident-page__button resident-page__button--primary"
                      type="submit"
                      disabled={personalSaving}
                    >
                      {personalSaving ? 'Saving...' : 'Save Personal Info'}
                    </button>
                  </div>
                  <div className="resident-form-grid">
                    <label>
                      Full Name *
                      <input
                        type="text"
                        value={personalForm.fullName}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, fullName: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Date of Birth
                      <input
                        type="date"
                        value={personalForm.dateOfBirth}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Gender
                      <select
                        value={personalForm.gender}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, gender: e.target.value }))
                        }
                      >
                        {GENDERS.filter((option) => option.value !== '').map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Citizen ID
                      <input
                        type="text"
                        value={personalForm.citizenId}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, citizenId: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Insurance Number
                      <input
                        type="text"
                        value={personalForm.insuranceNumber}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, insuranceNumber: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Blood Type
                      <select
                        value={personalForm.bloodType}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, bloodType: e.target.value }))
                        }
                      >
                        {BLOOD_TYPES.filter((option) => option.value !== '').map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="full">
                      Address
                      <input
                        type="text"
                        value={personalForm.personalAddress}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, personalAddress: e.target.value }))
                        }
                      />
                    </label>
                    <label className="full">
                      Allergies (one per line)
                      <textarea
                        rows="3"
                        value={personalForm.allergies}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, allergies: e.target.value }))
                        }
                      />
                    </label>
                    <label className="full">
                      Chronic Conditions (one per line)
                      <textarea
                        rows="3"
                        value={personalForm.chronicConditions}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, chronicConditions: e.target.value }))
                        }
                      />
                    </label>
                    <label className="full">
                      Initial Health Condition
                      <textarea
                        rows="3"
                        value={personalForm.initialHealthCondition}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, initialHealthCondition: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                  {personalError && <p className="resident-form-error">{personalError}</p>}
                </form>

                <form className="resident-form-section" onSubmit={handleSaveFamilyInfo}>
                  <div className="resident-form-section__header">
                    <h3>Family Information</h3>
                    <button
                      className="resident-page__button resident-page__button--primary"
                      type="submit"
                      disabled={familySaving}
                    >
                      {familySaving ? 'Saving...' : 'Save Family Info'}
                    </button>
                  </div>

                  <div className="resident-form-section__header sub">
                    <h4>Emergency Contacts</h4>
                    <button
                      type="button"
                      className="resident-page__button resident-page__button--ghost"
                      onClick={() => addContactRow(setFamilyContacts, familyContacts)}
                    >
                      Add Contact
                    </button>
                  </div>

                  {familyContacts.length === 0 && (
                    <p className="resident-form-empty">No contacts added yet.</p>
                  )}
                  {familyContacts.map((contact, index) => (
                    <div key={`family-contact-${index}`} className="resident-contact-row">
                      <input
                        type="text"
                        placeholder="Full name"
                        value={contact.fullName || ''}
                        onChange={(e) =>
                          updateContact(index, 'fullName', e.target.value, setFamilyContacts, familyContacts)
                        }
                      />
                      <input
                        type="text"
                        placeholder="Relationship"
                        value={contact.relationship || ''}
                        onChange={(e) =>
                          updateContact(index, 'relationship', e.target.value, setFamilyContacts, familyContacts)
                        }
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={contact.phone || ''}
                        onChange={(e) =>
                          updateContact(index, 'phone', e.target.value, setFamilyContacts, familyContacts)
                        }
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={contact.email || ''}
                        onChange={(e) =>
                          updateContact(index, 'email', e.target.value, setFamilyContacts, familyContacts)
                        }
                      />
                      <input
                        type="text"
                        placeholder="Address"
                        value={contact.address || ''}
                        onChange={(e) =>
                          updateContact(index, 'address', e.target.value, setFamilyContacts, familyContacts)
                        }
                      />
                      <label className="resident-contact-row__toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(contact.isPrimary)}
                          onChange={(e) =>
                            updateContact(index, 'isPrimary', e.target.checked, setFamilyContacts, familyContacts)
                          }
                        />
                        Primary
                      </label>
                      <button
                        type="button"
                        className="resident-contact-row__remove"
                        onClick={() => removeContact(index, setFamilyContacts, familyContacts)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div className="resident-form-section">
                    <h4>Family Portal Account IDs (one per line)</h4>
                    <textarea
                      rows="3"
                      value={familyIds}
                      onChange={(e) => setFamilyIds(e.target.value)}
                      placeholder="Paste user IDs of family accounts"
                    />
                  </div>

                  {familyError && <p className="resident-form-error">{familyError}</p>}
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

ResidentPage.defaultProps = {
  defaultMode: '',
};

export default ResidentPage;