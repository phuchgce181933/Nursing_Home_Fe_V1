import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  HeartPulse,
  Home,
} from 'lucide-react';
import residentService from '../../../services/resident.service';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import FamilyAccountPicker from '../../../components/ui/FamilyAccountPicker';
import '../../../styles/admin/ResidentPage.css';
import { resolveApiError } from '../../../utils/apiMessage';
import { isValidStaffPhone } from '../../../utils/staffPhoneValidation';

const GENDERS = [
  { value: '', i18nKey: 'adminResidents.genders.allGenders' },
  { value: 'male', i18nKey: 'adminResidents.genders.male' },
  { value: 'female', i18nKey: 'adminResidents.genders.female' },
  { value: 'other', i18nKey: 'adminResidents.genders.other' },
  { value: 'unknown', i18nKey: 'adminResidents.genders.unknown' },
];

const BLOOD_TYPES = [
  { value: '', i18nKey: 'adminResidents.bloodTypes.allBloodTypes' },
  { value: 'A+', i18nKey: 'adminResidents.bloodTypes.aPlus' },
  { value: 'A-', i18nKey: 'adminResidents.bloodTypes.aMinus' },
  { value: 'B+', i18nKey: 'adminResidents.bloodTypes.bPlus' },
  { value: 'B-', i18nKey: 'adminResidents.bloodTypes.bMinus' },
  { value: 'AB+', i18nKey: 'adminResidents.bloodTypes.abPlus' },
  { value: 'AB-', i18nKey: 'adminResidents.bloodTypes.abMinus' },
  { value: 'O+', i18nKey: 'adminResidents.bloodTypes.oPlus' },
  { value: 'O-', i18nKey: 'adminResidents.bloodTypes.oMinus' },
  { value: 'unknown', i18nKey: 'adminResidents.bloodTypes.unknown' },
];

const RESIDENCY_STATUSES = [
  { value: '', i18nKey: 'adminResidents.residencyStatuses.allStatuses' },
  { value: 'pending', i18nKey: 'adminResidents.residencyStatuses.pending' },
  { value: 'unsub', i18nKey: 'adminResidents.residencyStatuses.unsub' },
  { value: 'admitted', i18nKey: 'adminResidents.residencyStatuses.admitted' },
  { value: 'discharged', i18nKey: 'adminResidents.residencyStatuses.discharged' },
  { value: 'transferred', i18nKey: 'adminResidents.residencyStatuses.transferred' },
  { value: 'inactive', i18nKey: 'adminResidents.residencyStatuses.inactive' },
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

const buildContactsPayload = (contacts, t) => {
  const payload = [];
  const seenPhones = new Map();
  const seenEmails = new Map();

  for (const contact of contacts) {
    const fullName = String(contact.fullName || '').trim();
    const relationship = String(contact.relationship || '').trim();
    const phone = String(contact.phone || '').trim();
    const email = String(contact.email || '').trim();
    const address = String(contact.address || '').trim();

    const hasAny = fullName || relationship || phone || email || address;
    if (!hasAny) continue;

    if (!fullName || !relationship || !phone) {
      return { error: t('admin.residents.family.validation.contactRequiredFields') };
    }

    if (!isValidStaffPhone(phone)) {
      return { error: t('admin.residents.family.validation.phoneInvalid') };
    }

    const phoneKey = phone.replace(/\D/g, '');
    if (seenPhones.has(phoneKey)) {
      return { error: t('admin.residents.family.validation.duplicatePhone', { phone }) };
    }
    seenPhones.set(phoneKey, fullName);

    const emailKey = email.toLowerCase();
    if (emailKey) {
      if (seenEmails.has(emailKey)) {
        return { error: t('admin.residents.family.validation.duplicateEmail', { email }) };
      }
      seenEmails.set(emailKey, fullName);
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

const AVATAR_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect fill="#DEE2E6" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6C757D" font-family="Arial, sans-serif" font-size="14">Avatar</text></svg>'
)}`;

const emptyPersonalForm = {
  residentCode: '',
  fullName: '',
  dateOfBirth: '',
  gender: 'unknown',
  citizenId: '',
  insuranceNumber: '',
  personalAddress: '',
  allergies: '',
  chronicConditions: '',
  initialHealthCondition: '',
  residencyStatus: 'pending',
  admittedAt: '',
  dischargedAt: '',
  servicePackage: '',
};

function ResidentPage({ defaultMode = '' }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const canManageResidents = true;

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
  const [createFamilyAccounts, setCreateFamilyAccounts] = useState([]);
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState(null);
  const [selectedResident, setSelectedResident] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [personalForm, setPersonalForm] = useState({ ...emptyPersonalForm });
  const [personalError, setPersonalError] = useState(null);
  const [personalSaving, setPersonalSaving] = useState(false);

  const [familyContacts, setFamilyContacts] = useState([]);
  const [familyAccounts, setFamilyAccounts] = useState([]);
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
      // eslint-disable-next-line no-console
      console.debug('admin resident list sample:', res?.data?.[0]);
      setResidents(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load residents:', err);
      setError(resolveApiError(err, t, 'admin.residents.common.loadListFailed'));
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
        setFamilyAccounts(
          Array.isArray(resident?.familyPortalAccounts) ? resident.familyPortalAccounts : []
        );
      } catch (err) {
        console.error('Failed to load resident details:', err);
        setDetailError(resolveApiError(err, t, 'admin.residents.common.loadDetailFailed'));
      } finally {
        setDetailLoading(false);
      }
    };

    loadDetail();
  }, [selectedResidentId, showDetailModal]);

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedResidentId) return;
    // basic validations
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('adminResidents.validation.avatarTooLarge'), 'error');
      return;
    }

    try {
      setAvatarUploading(true);
      const data = await residentService.adminUploadAvatar(selectedResidentId, file);
      const resident = data?.resident || null;
      setSelectedResident(resident);
    } catch (err) {
      console.error('Upload avatar failed', err);
      showToast(resolveApiError(err, t, 'admin.residents.common.updateFailed'), 'error');
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  };

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
    setCreateFamilyAccounts([]);
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
      setCreateError(t('adminResidents.validation.fullNameRequired'));
      return;
    }
    if (createForm.dateOfBirth) {
      if (createForm.dateOfBirth === 'INVALID_DATE') {
        setCreateError(t('adminResidents.validation.dobInvalid'));
        return;
      }
      const dobDate = new Date(createForm.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      if (age < 50 || age > 110) {
        setCreateError(t('adminResidents.validation.ageRange'));
        return;
      }
    }

    const { contacts, error: contactsError } = buildContactsPayload(createContacts, t);
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
      // Hidden fields: allergies, chronicConditions, initialHealthCondition
      residencyStatus: createForm.residencyStatus || undefined,
      admittedAt: createForm.admittedAt || undefined,
      dischargedAt: createForm.dischargedAt || undefined,
      servicePackage: createForm.servicePackage.trim() || undefined,
      emergencyContacts: contacts || [],
      familyPortalAccountIds: createFamilyAccounts.map((a) => a._id),
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
      setCreateError(resolveApiError(err, t, 'admin.residents.common.saveFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleSavePersonalInfo = async (event) => {
    if (event) event.preventDefault();
    if (!selectedResidentId) return;
    if (!personalForm.fullName.trim()) {
      setPersonalError(t('adminResidents.validation.fullNameRequired'));
      return;
    }
    if (personalForm.dateOfBirth) {
      if (personalForm.dateOfBirth === 'INVALID_DATE') {
        setPersonalError(t('adminResidents.validation.dobInvalid'));
        return;
      }
      const dobDate = new Date(personalForm.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      if (age < 50 || age > 110) {
        setPersonalError(t('adminResidents.validation.ageRange'));
        return;
      }
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
        personalAddress: personalForm.personalAddress.trim(),
        // Hidden fields: allergies, chronicConditions, initialHealthCondition
      };

      const res = await residentService.updateResidentPersonalInfo(selectedResidentId, payload);
      setSelectedResident(res?.resident || selectedResident);
      fetchResidents();
    } catch (err) {
      console.error('Failed to update personal info:', err);
      setPersonalError(resolveApiError(err, t, 'admin.residents.common.updateFailed'));
    } finally {
      setPersonalSaving(false);
    }
  };

  const handleSaveFamilyInfo = async (event) => {
    if (event) event.preventDefault();
    if (!selectedResidentId) return;

    const { contacts, error: contactsError } = buildContactsPayload(familyContacts, t);
    if (contactsError) {
      setFamilyError(contactsError);
      return;
    }

    try {
      setFamilySaving(true);
      setFamilyError(null);
      const payload = {
        emergencyContacts: contacts || [],
        familyPortalAccountIds: familyAccounts.map((a) => a._id),
      };
      const res = await residentService.updateResidentFamilyInfo(selectedResidentId, payload);
      setSelectedResident(res?.resident || selectedResident);
      fetchResidents();
    } catch (err) {
      console.error('Failed to update family info:', err);
      setFamilyError(resolveApiError(err, t, 'admin.residents.common.updateFailed'));
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
    const contact = current[index];
    if (contact?.isPrimary && contact?._id) {
      showToast(t('admin.residents.family.cannotDeletePrimary'), 'error');
      return;
    }
    const next = [...current];
    next.splice(index, 1);
    setter(next);
  };

  return (
    <div className="resident-page">
      <div className="resident-page__header">
        <div>
          <h1 className="resident-page__title">{t('adminResidents.pageTitle')}</h1>
          <p className="resident-page__subtitle">
            {t('adminResidents.pageSubtitle')}
          </p>
        </div>
        <div className="resident-page__actions">
          <button
            className="resident-page__button resident-page__button--ghost"
            onClick={fetchResidents}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {t('adminResidents.refreshButton')}
          </button>
        </div>
      </div>

      <div className="resident-page__stats">
        <div className="resident-stat">
          <div className="resident-stat__icon">
            <Users size={20} />
          </div>
          <div>
            <span>{t('adminResidents.stats.totalResidents')}</span>
            <strong>{String(total).padStart(2, '0')}</strong>
          </div>
        </div>
        <div className="resident-stat">
          <div className="resident-stat__icon resident-stat__icon--admitted">
            <Home size={20} />
          </div>
          <div>
            <span>{t('adminResidents.stats.admitted')}</span>
            <strong>{String(stats.admittedCount).padStart(2, '0')}</strong>
          </div>
        </div>
        <div className="resident-stat">
          <div className="resident-stat__icon resident-stat__icon--pending">
            <HeartPulse size={20} />
          </div>
          <div>
            <span>{t('adminResidents.stats.pending')}</span>
            <strong>{String(stats.pendingCount).padStart(2, '0')}</strong>
          </div>
        </div>
        <div className="resident-stat">
          <div className="resident-stat__icon resident-stat__icon--inactive">
            <Users size={20} />
          </div>
          <div>
            <span>{t('adminResidents.stats.inactive')}</span>
            <strong>{String(stats.inactiveCount).padStart(2, '0')}</strong>
          </div>
        </div>
      </div>

      <form className="resident-page__filters" onSubmit={handleApplyFilters}>
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t('adminResidents.filters.search')}</span>
            <div className="resident-page__filter-input">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('adminResidents.filters.searchPlaceholder')}
              />
            </div>
          </label>

          <label className="resident-page__filter">
            <span>{t('adminResidents.filters.status')}</span>
            <select value={residencyStatus} onChange={(e) => setResidencyStatus(e.target.value)}>
              {RESIDENCY_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.i18nKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="resident-page__filter">
            <span>{t('adminResidents.filters.gender')}</span>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              {GENDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.i18nKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="resident-page__filter">
            <span>{t('adminResidents.filters.bloodType')}</span>
            <select value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
              {BLOOD_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.i18nKey)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t('adminResidents.filters.admittedFrom')}</span>
            <input
              type="date"
              value={admittedFrom}
              onChange={(e) => setAdmittedFrom(e.target.value)}
            />
          </label>

          <label className="resident-page__filter">
            <span>{t('adminResidents.filters.admittedTo')}</span>
            <input
              type="date"
              value={admittedTo}
              onChange={(e) => setAdmittedTo(e.target.value)}
            />
          </label>

          <div className="resident-page__filter-actions">
            <button className="resident-page__button resident-page__button--primary" type="submit">
              {t('adminResidents.filters.applyFilters')}
            </button>
            <button
              className="resident-page__button resident-page__button--ghost"
              type="button"
              onClick={handleResetFilters}
            >
              {t('adminResidents.filters.resetFilters')}
            </button>
          </div>
        </div>
      </form>

      {error && <div className="resident-page__error">{error}</div>}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>{t('adminResidents.table.code')}</th>
              <th>{t('adminResidents.table.avatar')}</th>
              <th>{t('adminResidents.table.fullName')}</th>
              <th>{t('adminResidents.table.citizenId')}</th>
              <th>{t('adminResidents.table.status')}</th>
              <th>{t('adminResidents.table.room')}</th>
              <th>{t('adminResidents.table.bed')}</th>
              <th>{t('adminResidents.table.admittedAt')}</th>
              <th>{t('adminResidents.table.actions')}</th>
            </tr>
          </thead>
          <tbody>

            {loading && (
              <tr>
                <td colSpan="9" className="resident-page__empty">
                  {t('adminResidents.table.loading')}
                </td>
              </tr>
            )}

            {!loading && residents.length === 0 && (
              <tr>
                <td colSpan="9" className="resident-page__empty">
                  {t('adminResidents.table.empty')}
                </td>
              </tr>
            )}

            {!loading &&
              residents.map((resident) => (
                <tr key={resident._id} className="resident-page__table-row">
                  <td>{resident.residentCode}</td>
                  <td>
                    <img
                      src={resident.avatarUrl || AVATAR_PLACEHOLDER}
                      alt={resident.fullName || 'avatar'}
                      className="resident-page__avatar"
                    />
                  </td>
                  <td>
                    <strong>{resident.fullName}</strong>
                  </td>
                  <td>{resident.citizenId || '—'}</td>
                  <td>
                    <span
                      className={`resident-page__status resident-page__status--${
                        resident.residencyStatus || 'pending'
                      }`}
                    >
                      {t(`adminResidents.residencyStatuses.${resident.residencyStatus || 'pending'}`)}
                    </span>
                  </td>
                  <td>{resident.room?.roomNumber || t('adminResidents.table.unassigned')}</td>
                  <td>{resident.bed?.bedCode || t('adminResidents.table.unassigned')}</td>
                  <td>{formatDateTime(resident.admittedAt)}</td>
                  <td>
                    <button
                      className="resident-page__action"
                      onClick={() => handleOpenDetail(resident._id)}
                    >
                      <Eye size={16} />
                      {t('adminResidents.table.viewButton')}
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
          {t('adminResidents.pagination.previous')}
        </button>
        <span>
          {t('adminResidents.pagination.pageOf', { page, totalPages })}
        </span>
        <button
          className="resident-page__page-btn"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
        >
          {t('adminResidents.pagination.next')}
          <ChevronRight size={16} />
        </button>
      </div>

      {showCreateModal && (
        <div className="resident-modal" role="dialog" aria-modal="true">
          <div className="resident-modal__content">
            <div className="resident-modal__header">
              <div>
                <h2>{t('adminResidents.createModal.title')}</h2>
                <p>{t('adminResidents.createModal.subtitle')}</p>
              </div>
              <button className="resident-modal__close" onClick={handleCloseCreate}>
                <X size={18} />
              </button>
            </div>

            <form className="resident-modal__body" onSubmit={handleCreateResident}>
              <div className="resident-form-grid">
                <label>
                  {t('adminResidents.createModal.fullNameLabel')}
                  <input
                    type="text"
                    value={createForm.fullName}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    placeholder={t('adminResidents.createModal.fullNamePlaceholder')}
                  />
                </label>
                <label>
                  {t('adminResidents.createModal.residentCodeLabel')}
                  <input
                    type="text"
                    value={createForm.residentCode}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, residentCode: e.target.value }))
                    }
                    placeholder={t('adminResidents.createModal.residentCodePlaceholder')}
                  />
                </label>

                <label>
                  {t('adminResidents.createModal.genderLabel')}
                  <select
                    value={createForm.gender}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, gender: e.target.value }))
                    }
                  >
                    {GENDERS.filter((option) => option.value !== '').map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.i18nKey)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('adminResidents.createModal.citizenIdLabel')}
                  <input
                    type="text"
                    value={createForm.citizenId}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, citizenId: e.target.value }))
                    }
                  />
                </label>
                <label>
                  {t('adminResidents.createModal.insuranceLabel')}
                  <input
                    type="text"
                    value={createForm.insuranceNumber}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, insuranceNumber: e.target.value }))
                    }
                  />
                </label>
                <label>
                  {t('adminResidents.createModal.bloodTypeLabel')}
                  <select
                    value={createForm.bloodType}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, bloodType: e.target.value }))
                    }
                  >
                    {BLOOD_TYPES.filter((option) => option.value !== '').map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.i18nKey)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  {t('adminResidents.createModal.addressLabel')}
                  <input
                    type="text"
                    value={createForm.personalAddress}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, personalAddress: e.target.value }))
                    }
                  />
                </label>
                <label>
                  {t('adminResidents.createModal.residencyStatusLabel')}
                  <select
                    value={createForm.residencyStatus}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, residencyStatus: e.target.value }))
                    }
                  >
                    {RESIDENCY_STATUSES.filter((option) => option.value !== '').map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.i18nKey)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('adminResidents.createModal.admittedAtLabel')}
                  <input
                    type="datetime-local"
                    value={createForm.admittedAt}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, admittedAt: e.target.value }))
                    }
                  />
                </label>
                <label>
                  {t('adminResidents.createModal.dischargedAtLabel')}
                  <input
                    type="datetime-local"
                    value={createForm.dischargedAt}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, dischargedAt: e.target.value }))
                    }
                  />
                </label>
                <label>
                  {t('adminResidents.createModal.servicePackageLabel')}
                  <input
                    type="text"
                    value={createForm.servicePackage}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, servicePackage: e.target.value }))
                    }
                  />
                </label>
                {/* Hidden: allergies, chronicConditions, initialHealthCondition */}
                {/*
                <label className="full">
                  {t('adminResidents.createModal.allergiesLabel')}
                  <textarea
                    rows="3"
                    value={createForm.allergies}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, allergies: e.target.value }))
                    }
                  />
                </label>
                <label className="full">
                  {t('adminResidents.createModal.chronicConditionsLabel')}
                  <textarea
                    rows="3"
                    value={createForm.chronicConditions}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, chronicConditions: e.target.value }))
                    }
                  />
                </label>
                <label className="full">
                  {t('adminResidents.createModal.initialHealthLabel')}
                  <textarea
                    rows="3"
                    value={createForm.initialHealthCondition}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, initialHealthCondition: e.target.value }))
                    }
                  />
                </label>
                */}
              </div>

              <div className="resident-form-section">
                <div className="resident-form-section__header">
                  <h3>{t('adminResidents.contacts.sectionTitle')}</h3>
                  <button
                    type="button"
                    className="resident-page__button resident-page__button--ghost"
                    onClick={() => addContactRow(setCreateContacts, createContacts)}
                  >
                    {t('adminResidents.contacts.addContact')}
                  </button>
                </div>
                {createContacts.length === 0 && (
                  <p className="resident-form-empty">{t('adminResidents.contacts.noContacts')}</p>
                )}
                {createContacts.map((contact, index) => (
                  <div key={`create-contact-${index}`} className="resident-contact-row">
                    <input
                      type="text"
                      placeholder={t('adminResidents.contacts.fullNamePlaceholder')}
                      value={contact.fullName}
                      onChange={(e) =>
                        updateContact(index, 'fullName', e.target.value, setCreateContacts, createContacts)
                      }
                    />
                    <input
                      type="text"
                      placeholder={t('adminResidents.contacts.relationshipPlaceholder')}
                      value={contact.relationship}
                      onChange={(e) =>
                        updateContact(index, 'relationship', e.target.value, setCreateContacts, createContacts)
                      }
                    />
                    <input
                      type="text"
                      placeholder={t('adminResidents.contacts.phonePlaceholder')}
                      value={contact.phone}
                      onChange={(e) =>
                        updateContact(index, 'phone', e.target.value, setCreateContacts, createContacts)
                      }
                    />
                    <input
                      type="email"
                      placeholder={t('adminResidents.contacts.emailPlaceholder')}
                      value={contact.email}
                      onChange={(e) =>
                        updateContact(index, 'email', e.target.value, setCreateContacts, createContacts)
                      }
                    />
                    <input
                      type="text"
                      placeholder={t('adminResidents.contacts.addressPlaceholder')}
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
                      {t('adminResidents.contacts.isPrimaryLabel')}
                    </label>
                    <button
                      type="button"
                      className="resident-contact-row__remove"
                      onClick={() => removeContact(index, setCreateContacts, createContacts)}
                    >
                      {t('adminResidents.contacts.removeButton')}
                    </button>
                  </div>
                ))}
              </div>

              <div className="resident-form-section">
                <h3>{t('admin.residents.common.familyAccountsLabel')}</h3>
                <FamilyAccountPicker value={createFamilyAccounts} onChange={setCreateFamilyAccounts} />
              </div>

              {createError && <p className="resident-form-error">{createError}</p>}

              <div className="resident-modal__footer">
                <button
                  type="button"
                  className="resident-page__button resident-page__button--ghost"
                  onClick={handleCloseCreate}
                >
                  {t('adminResidents.buttons.cancel')}
                </button>
                <button
                  type="submit"
                  className="resident-page__button resident-page__button--primary"
                  disabled={creating}
                >
                  {creating ? t('adminResidents.buttons.creating') : t('adminResidents.buttons.createResident')}
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
                <h2>{t('adminResidents.detailModal.title')}</h2>
                <p>
                  {canManageResidents
                    ? t('adminResidents.detailModal.subtitleEdit')
                    : t('adminResidents.detailModal.subtitleReadOnly')}
                </p>
              </div>
              <button className="resident-modal__close" onClick={handleCloseDetail}>
                <X size={18} />
              </button>
            </div>

            {detailLoading && <p className="resident-form-empty">{t('adminResidents.detailModal.loadingInfo')}</p>}
            {detailError && <p className="resident-form-error">{detailError}</p>}

            {!detailLoading && selectedResident && (
              <div className="resident-modal__body">
                <div className="resident-detail-card">
                  <div className="resident-detail-card__identity">
                                    <div className="resident-avatar">
                                      <img
                                        src={selectedResident.avatarUrl || AVATAR_PLACEHOLDER}
                                        alt="avatar"
                                        width="96"
                                        height="96"
                                      />
                      {canManageResidents && (
                        <div className="resident-avatar__upload">
                          <label className="button button--ghost">
                            {avatarUploading ? t('adminResidents.detailModal.uploadingAvatar') : t('adminResidents.detailModal.changeAvatar')}
                            <input type="file" accept="image/*" onChange={handleAvatarFileChange} style={{ display: 'none' }} />
                          </label>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3>{selectedResident.fullName}</h3>
                      <p>{selectedResident.residentCode}</p>
                    </div>
                  </div>
                  <div className="resident-detail-card__status">
                    <span>{t('adminResidents.detailModal.statusLabel')}</span>
                    <span
                      className={`resident-page__status resident-page__status--${
                        selectedResident.residencyStatus || 'pending'
                      }`}
                    >
                      {t(`adminResidents.residencyStatuses.${selectedResident.residencyStatus || 'pending'}`)}
                    </span>
                  </div>
                  <div>
                    <span>{t('adminResidents.detailModal.roomBedLabel')}</span>
                    <strong>
                      {selectedResident.room?.roomNumber || t('adminResidents.table.unassigned')} /{' '}
                      {selectedResident.bed?.bedCode || t('adminResidents.table.unassigned')}
                    </strong>
                  </div>
                  <div>
                    <span>{t('adminResidents.detailModal.admittedAtLabel')}</span>
                    <strong>{formatDateTime(selectedResident.admittedAt)}</strong>
                  </div>
                </div>

                <form className="resident-form-section" onSubmit={handleSavePersonalInfo}>
                  <div className="resident-form-section__header">
                    <h3>{t('adminResidents.personalInfo.sectionTitle')}</h3>
                    {canManageResidents && (
                      <button
                        className="resident-page__button resident-page__button--primary"
                        type="submit"
                        disabled={personalSaving}
                      >
                        {personalSaving ? t('adminResidents.personalInfo.saving') : t('adminResidents.personalInfo.saveButton')}
                      </button>
                    )}
                  </div>
                  <fieldset className="resident-form-fieldset" disabled={!canManageResidents}>
                  <div className="resident-form-grid">
                    <label>
                      {t('adminResidents.personalInfo.fullNameLabel')}
                      <input
                        type="text"
                        value={personalForm.fullName}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, fullName: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      {t('adminResidents.personalInfo.dobLabel')}
                      <input
                        type="date"
                        value={personalForm.dateOfBirth}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      {t('adminResidents.personalInfo.genderLabel')}
                      <select
                        value={personalForm.gender}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, gender: e.target.value }))
                        }
                      >
                        {GENDERS.filter((option) => option.value !== '').map((option) => (
                          <option key={option.value} value={option.value}>
                            {t(option.i18nKey)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t('adminResidents.personalInfo.citizenIdLabel')}
                      <input
                        type="text"
                        value={personalForm.citizenId}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, citizenId: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      {t('adminResidents.personalInfo.insuranceLabel')}
                      <input
                        type="text"
                        value={personalForm.insuranceNumber}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, insuranceNumber: e.target.value }))
                        }
                      />
                    </label>
                    <label className="full">
                      {t('adminResidents.personalInfo.addressLabel')}
                      <input
                        type="text"
                        value={personalForm.personalAddress}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, personalAddress: e.target.value }))
                        }
                      />
                    </label>
                    {/* Hidden: allergies, chronicConditions, initialHealthCondition */}
                    {/*
                    <label className="full">
                      {t('adminResidents.personalInfo.allergiesLabel')}
                      <textarea
                        rows="3"
                        value={personalForm.allergies}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, allergies: e.target.value }))
                        }
                      />
                    </label>
                    <label className="full">
                      {t('adminResidents.personalInfo.chronicConditionsLabel')}
                      <textarea
                        rows="3"
                        value={personalForm.chronicConditions}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, chronicConditions: e.target.value }))
                        }
                      />
                    </label>
                    <label className="full">
                      {t('adminResidents.personalInfo.initialHealthLabel')}
                      <textarea
                        rows="3"
                        value={personalForm.initialHealthCondition}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, initialHealthCondition: e.target.value }))
                        }
                      />
                    </label>
                    */}
                  </div>
                  </fieldset>
                  {personalError && <p className="resident-form-error">{personalError}</p>}
                </form>

                {/* Family Info Section - Hidden */}
                {/*
                <form className="resident-form-section" onSubmit={handleSaveFamilyInfo}>
                  <div className="resident-form-section__header">
                    <h3>{t('adminResidents.familyInfo.sectionTitle')}</h3>
                    {canManageResidents && (
                      <button
                        className="resident-page__button resident-page__button--primary"
                        type="submit"
                        disabled={familySaving}
                      >
                        {familySaving ? t('adminResidents.familyInfo.saving') : t('adminResidents.familyInfo.saveButton')}
                      </button>
                    )}
                  </div>

                  <fieldset className="resident-form-fieldset" disabled={!canManageResidents}>
                  <div className="resident-form-section__header sub">
                    <h4>{t('adminResidents.familyInfo.emergencyContactsTitle')}</h4>
                    {canManageResidents && (
                      <button
                        type="button"
                        className="resident-page__button resident-page__button--ghost"
                        onClick={() => addContactRow(setFamilyContacts, familyContacts)}
                      >
                        {t('adminResidents.contacts.addContact')}
                      </button>
                    )}
                  </div>

                  {familyContacts.length === 0 && (
                    <p className="resident-form-empty">{t('adminResidents.contacts.noContacts')}</p>
                  )}
                  {familyContacts.map((contact, index) => (
                    <div key={`family-contact-${index}`} className="resident-contact-row">
                      <input
                        type="text"
                        placeholder={t('adminResidents.contacts.fullNamePlaceholder')}
                        value={contact.fullName || ''}
                        onChange={(e) =>
                          updateContact(index, 'fullName', e.target.value, setFamilyContacts, familyContacts)
                        }
                      />
                      <input
                        type="text"
                        placeholder={t('adminResidents.contacts.relationshipPlaceholder')}
                        value={contact.relationship || ''}
                        onChange={(e) =>
                          updateContact(index, 'relationship', e.target.value, setFamilyContacts, familyContacts)
                        }
                      />
                      <input
                        type="text"
                        placeholder={t('adminResidents.contacts.phonePlaceholder')}
                        value={contact.phone || ''}
                        onChange={(e) =>
                          updateContact(index, 'phone', e.target.value, setFamilyContacts, familyContacts)
                        }
                      />
                      <input
                        type="email"
                        placeholder={t('adminResidents.contacts.emailPlaceholder')}
                        value={contact.email || ''}
                        onChange={(e) =>
                          updateContact(index, 'email', e.target.value, setFamilyContacts, familyContacts)
                        }
                      />
                      <input
                        type="text"
                        placeholder={t('adminResidents.contacts.addressPlaceholder')}
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
                        {t('adminResidents.contacts.isPrimaryLabel')}
                      </label>
                      {!(contact._id && contact.isPrimary) && (
                        <button
                          type="button"
                          className="resident-contact-row__remove"
                          onClick={() => removeContact(index, setFamilyContacts, familyContacts)}
                        >
                          {t('adminResidents.contacts.removeButton')}
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="resident-form-section">
                    <h4>{t('admin.residents.common.familyAccountsLabel')}</h4>
                    <FamilyAccountPicker value={familyAccounts} onChange={setFamilyAccounts} />
                  </div>
                  </fieldset>

                  {familyError && <p className="resident-form-error">{familyError}</p>}
                </form>
                */}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// defaultMode default parameter is set in the function signature

export default ResidentPage;
