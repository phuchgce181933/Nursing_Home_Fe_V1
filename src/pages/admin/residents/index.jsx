import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import residentService from '../../../services/resident.service';
import { useAuth } from '../../../hooks/useAuth';
import '../../../styles/admin/ResidentPage.css';
import { resolveApiError } from '../../../utils/apiMessage';

const GENDERS = [
  { value: '', label: 'Tất cả giới tính' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
  { value: 'unknown', label: 'Không xác định' },
];

const BLOOD_TYPES = [
  { value: '', label: 'Tất cả nhóm máu' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
  { value: 'unknown', label: 'Không xác định' },
];

const RESIDENCY_STATUSES = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'admitted', label: 'Đã nhận vào ở' },
  { value: 'discharged', label: 'Đã xuất viện' },
  { value: 'transferred', label: 'Đã chuyển viện' },
  { value: 'inactive', label: 'Không hoạt động' },
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
      return { error: 'Mỗi liên hệ khẩn cấp phải có họ tên, quan hệ và số điện thoại.' };
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

function ResidentPage({ defaultMode = '' }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const canManageResidents = !isManager;

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
  const [avatarUploading, setAvatarUploading] = useState(false);

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
      // DEBUG: log first resident to verify avatarUrl is present (remove in production)
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
      alert('Ảnh quá lớn. Kích thước tối đa 5MB.');
      return;
    }

    try {
      setAvatarUploading(true);
      const data = await residentService.adminUploadAvatar(selectedResidentId, file);
      const resident = data?.resident || null;
      setSelectedResident(resident);
    } catch (err) {
      console.error('Upload avatar failed', err);
      alert(resolveApiError(err, t, 'admin.residents.common.updateFailed'));
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
      setCreateError('Họ tên là bắt buộc.');
      return;
    }
    if (createForm.dateOfBirth) {
      if (createForm.dateOfBirth === 'INVALID_DATE') {
        setCreateError('Ngày sinh không hợp lệ hoặc không đúng định dạng (ngày/tháng/năm).');
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
        setCreateError('Cư dân phải từ 50 đến 110 tuổi.');
        return;
      }
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
      setCreateError(resolveApiError(err, t, 'admin.residents.common.saveFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleSavePersonalInfo = async (event) => {
    if (event) event.preventDefault();
    if (!selectedResidentId) return;
    if (!personalForm.fullName.trim()) {
      setPersonalError('Họ tên là bắt buộc.');
      return;
    }
    if (personalForm.dateOfBirth) {
      if (personalForm.dateOfBirth === 'INVALID_DATE') {
        setPersonalError('Ngày sinh không hợp lệ hoặc không đúng định dạng (ngày/tháng/năm).');
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
        setPersonalError('Cư dân phải từ 50 đến 110 tuổi.');
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
      setPersonalError(resolveApiError(err, t, 'admin.residents.common.updateFailed'));
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
      alert(t('admin.residents.family.cannotDeletePrimary'));
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
          <h1 className="resident-page__title">Quản lý cư dân</h1>
          <p className="resident-page__subtitle">
            Tìm kiếm, xem và cập nhật hồ sơ cư dân cùng thông tin y tế và gia đình.
          </p>
        </div>
        <div className="resident-page__actions">
          <button
            className="resident-page__button resident-page__button--ghost"
            onClick={fetchResidents}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Làm mới
          </button>
          {canManageResidents && (
            <button
              className="resident-page__button resident-page__button--primary"
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              Thêm cư dân
            </button>
          )}
        </div>
      </div>

      <div className="resident-page__stats">
        <div className="resident-stat">
          <div className="resident-stat__icon">
            <Users size={20} />
          </div>
          <div>
            <span>Tổng cư dân</span>
            <strong>{String(total).padStart(2, '0')}</strong>
          </div>
        </div>
        <div className="resident-stat">
          <div className="resident-stat__icon resident-stat__icon--admitted">
            <Home size={20} />
          </div>
          <div>
            <span>Đã nhận vào ở</span>
            <strong>{String(stats.admittedCount).padStart(2, '0')}</strong>
          </div>
        </div>
        <div className="resident-stat">
          <div className="resident-stat__icon resident-stat__icon--pending">
            <HeartPulse size={20} />
          </div>
          <div>
            <span>Chờ xử lý</span>
            <strong>{String(stats.pendingCount).padStart(2, '0')}</strong>
          </div>
        </div>
        <div className="resident-stat">
          <div className="resident-stat__icon resident-stat__icon--inactive">
            <Users size={20} />
          </div>
          <div>
            <span>Không hoạt động</span>
            <strong>{String(stats.inactiveCount).padStart(2, '0')}</strong>
          </div>
        </div>
      </div>

      <form className="resident-page__filters" onSubmit={handleApplyFilters}>
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>Tìm kiếm</span>
            <div className="resident-page__filter-input">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo mã, họ tên, CCCD"
              />
            </div>
          </label>

          <label className="resident-page__filter">
            <span>Trạng thái</span>
            <select value={residencyStatus} onChange={(e) => setResidencyStatus(e.target.value)}>
              {RESIDENCY_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="resident-page__filter">
            <span>Giới tính</span>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              {GENDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="resident-page__filter">
            <span>Nhóm máu</span>
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
            <span>Nhận vào từ ngày</span>
            <input
              type="date"
              value={admittedFrom}
              onChange={(e) => setAdmittedFrom(e.target.value)}
            />
          </label>

          <label className="resident-page__filter">
            <span>Nhận vào đến ngày</span>
            <input
              type="date"
              value={admittedTo}
              onChange={(e) => setAdmittedTo(e.target.value)}
            />
          </label>

          <div className="resident-page__filter-actions">
            <button className="resident-page__button resident-page__button--primary" type="submit">
              Áp dụng bộ lọc
            </button>
            <button
              className="resident-page__button resident-page__button--ghost"
              type="button"
              onClick={handleResetFilters}
            >
              Đặt lại
            </button>
          </div>
        </div>
      </form>

      {error && <div className="resident-page__error">{error}</div>}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>Mã</th>
              <th>Ảnh</th>
              <th>Họ tên</th>
              <th>Trạng thái</th>
              <th>Phòng</th>
              <th>Giường</th>
              <th>Ngày nhận vào</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>

            {loading && (
              <tr>
                <td colSpan="8" className="resident-page__empty">
                  Đang tải danh sách cư dân...
                </td>
              </tr>
            )}

            {!loading && residents.length === 0 && (
              <tr>
                <td colSpan="8" className="resident-page__empty">
                  Không tìm thấy cư dân nào.
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
                    <div className="resident-page__name">
                      <strong>{resident.fullName}</strong>
                      <span>{resident.citizenId || 'Chưa có CCCD'}</span>
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
                  <td>{resident.room?.roomCode || 'Chưa phân công'}</td>
                  <td>{resident.bed?.bedCode || 'Chưa phân công'}</td>
                  <td>{formatDateTime(resident.admittedAt)}</td>
                  <td>
                    <button
                      className="resident-page__action"
                      onClick={() => handleOpenDetail(resident._id)}
                    >
                      <Eye size={16} />
                      Xem
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
          Trước
        </button>
        <span>
          Trang {page} / {totalPages}
        </span>
        <button
          className="resident-page__page-btn"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
        >
          Tiếp
          <ChevronRight size={16} />
        </button>
      </div>

      {showCreateModal && (
        <div className="resident-modal" role="dialog" aria-modal="true">
          <div className="resident-modal__content">
            <div className="resident-modal__header">
              <div>
                <h2>Tạo hồ sơ cư dân</h2>
                <p>Nhập thông tin cá nhân và gia đình để mở hồ sơ mới.</p>
              </div>
              <button className="resident-modal__close" onClick={handleCloseCreate}>
                <X size={18} />
              </button>
            </div>

            <form className="resident-modal__body" onSubmit={handleCreateResident}>
              <div className="resident-form-grid">
                <label>
                  Họ tên *
                  <input
                    type="text"
                    value={createForm.fullName}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    placeholder="Nhập họ tên cư dân"
                  />
                </label>
                <label>
                  Mã cư dân
                  <input
                    type="text"
                    value={createForm.residentCode}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, residentCode: e.target.value }))
                    }
                    placeholder="Tự động tạo nếu để trống"
                  />
                </label>

                <label>
                  Giới tính
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
                  CCCD
                  <input
                    type="text"
                    value={createForm.citizenId}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, citizenId: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Số bảo hiểm
                  <input
                    type="text"
                    value={createForm.insuranceNumber}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, insuranceNumber: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Nhóm máu
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
                  Địa chỉ
                  <input
                    type="text"
                    value={createForm.personalAddress}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, personalAddress: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Trạng thái cư trú
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
                  Ngày nhận vào
                  <input
                    type="datetime-local"
                    value={createForm.admittedAt}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, admittedAt: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Ngày xuất viện
                  <input
                    type="datetime-local"
                    value={createForm.dischargedAt}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, dischargedAt: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Gói dịch vụ
                  <input
                    type="text"
                    value={createForm.servicePackage}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, servicePackage: e.target.value }))
                    }
                  />
                </label>
                <label className="full">
                  Dị ứng (mỗi dòng một mục)
                  <textarea
                    rows="3"
                    value={createForm.allergies}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, allergies: e.target.value }))
                    }
                  />
                </label>
                <label className="full">
                  Bệnh mãn tính (mỗi dòng một mục)
                  <textarea
                    rows="3"
                    value={createForm.chronicConditions}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, chronicConditions: e.target.value }))
                    }
                  />
                </label>
                <label className="full">
                  Tình trạng sức khỏe ban đầu
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
                  <h3>Liên hệ khẩn cấp</h3>
                  <button
                    type="button"
                    className="resident-page__button resident-page__button--ghost"
                    onClick={() => addContactRow(setCreateContacts, createContacts)}
                  >
                    Thêm liên hệ
                  </button>
                </div>
                {createContacts.length === 0 && (
                  <p className="resident-form-empty">Chưa có liên hệ nào.</p>
                )}
                {createContacts.map((contact, index) => (
                  <div key={`create-contact-${index}`} className="resident-contact-row">
                    <input
                      type="text"
                      placeholder="Họ tên"
                      value={contact.fullName}
                      onChange={(e) =>
                        updateContact(index, 'fullName', e.target.value, setCreateContacts, createContacts)
                      }
                    />
                    <input
                      type="text"
                      placeholder="Quan hệ"
                      value={contact.relationship}
                      onChange={(e) =>
                        updateContact(index, 'relationship', e.target.value, setCreateContacts, createContacts)
                      }
                    />
                    <input
                      type="text"
                      placeholder="Điện thoại"
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
                      placeholder="Địa chỉ"
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
                      Liên hệ chính
                    </label>
                    <button
                      type="button"
                      className="resident-contact-row__remove"
                      onClick={() => removeContact(index, setCreateContacts, createContacts)}
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>

              <div className="resident-form-section">
                <h3>ID tài khoản gia đình (mỗi dòng một ID)</h3>
                <textarea
                  rows="3"
                  value={createFamilyIds}
                  onChange={(e) => setCreateFamilyIds(e.target.value)}
                  placeholder="Dán ID tài khoản thành viên gia đình vào đây"
                />
              </div>

              {createError && <p className="resident-form-error">{createError}</p>}

              <div className="resident-modal__footer">
                <button
                  type="button"
                  className="resident-page__button resident-page__button--ghost"
                  onClick={handleCloseCreate}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="resident-page__button resident-page__button--primary"
                  disabled={creating}
                >
                  {creating ? 'Đang tạo...' : 'Tạo cư dân'}
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
                <h2>Hồ sơ cư dân</h2>
                <p>
                  {canManageResidents
                    ? 'Xem và cập nhật thông tin cá nhân hoặc gia đình.'
                    : 'Xem thông tin cá nhân và gia đình (chỉ đọc).'}
                </p>
              </div>
              <button className="resident-modal__close" onClick={handleCloseDetail}>
                <X size={18} />
              </button>
            </div>

            {detailLoading && <p className="resident-form-empty">Đang tải thông tin...</p>}
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
                            {avatarUploading ? 'Đang tải...' : 'Đổi ảnh'}
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
                  <div>
                    <span>Trạng thái</span>
                    <strong>{selectedResident.residencyStatus}</strong>
                  </div>
                  <div>
                    <span>Phòng / Giường</span>
                    <strong>
                      {selectedResident.room?.roomCode || 'Chưa phân công'} /{' '}
                      {selectedResident.bed?.bedCode || 'Chưa phân công'}
                    </strong>
                  </div>
                  <div>
                    <span>Ngày nhận vào</span>
                    <strong>{formatDateTime(selectedResident.admittedAt)}</strong>
                  </div>
                </div>

                <form className="resident-form-section" onSubmit={handleSavePersonalInfo}>
                  <div className="resident-form-section__header">
                    <h3>Thông tin cá nhân</h3>
                    {canManageResidents && (
                      <button
                        className="resident-page__button resident-page__button--primary"
                        type="submit"
                        disabled={personalSaving}
                      >
                        {personalSaving ? 'Đang lưu...' : 'Lưu thông tin cá nhân'}
                      </button>
                    )}
                  </div>
                  <fieldset className="resident-form-fieldset" disabled={!canManageResidents}>
                  <div className="resident-form-grid">
                    <label>
                      Họ tên *
                      <input
                        type="text"
                        value={personalForm.fullName}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, fullName: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Ngày sinh
                      <input
                        type="date"
                        value={personalForm.dateOfBirth}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Giới tính
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
                      CCCD
                      <input
                        type="text"
                        value={personalForm.citizenId}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, citizenId: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Số bảo hiểm
                      <input
                        type="text"
                        value={personalForm.insuranceNumber}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, insuranceNumber: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Nhóm máu
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
                      Địa chỉ
                      <input
                        type="text"
                        value={personalForm.personalAddress}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, personalAddress: e.target.value }))
                        }
                      />
                    </label>
                    <label className="full">
                      Dị ứng (mỗi dòng một mục)
                      <textarea
                        rows="3"
                        value={personalForm.allergies}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, allergies: e.target.value }))
                        }
                      />
                    </label>
                    <label className="full">
                      Bệnh mãn tính (mỗi dòng một mục)
                      <textarea
                        rows="3"
                        value={personalForm.chronicConditions}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, chronicConditions: e.target.value }))
                        }
                      />
                    </label>
                    <label className="full">
                      Tình trạng sức khỏe ban đầu
                      <textarea
                        rows="3"
                        value={personalForm.initialHealthCondition}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({ ...prev, initialHealthCondition: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                  </fieldset>
                  {personalError && <p className="resident-form-error">{personalError}</p>}
                </form>

                <form className="resident-form-section" onSubmit={handleSaveFamilyInfo}>
                  <div className="resident-form-section__header">
                    <h3>Thông tin gia đình</h3>
                    {canManageResidents && (
                      <button
                        className="resident-page__button resident-page__button--primary"
                        type="submit"
                        disabled={familySaving}
                      >
                        {familySaving ? 'Đang lưu...' : 'Lưu thông tin gia đình'}
                      </button>
                    )}
                  </div>

                  <fieldset className="resident-form-fieldset" disabled={!canManageResidents}>
                  <div className="resident-form-section__header sub">
                    <h4>Liên hệ khẩn cấp</h4>
                    {canManageResidents && (
                      <button
                        type="button"
                        className="resident-page__button resident-page__button--ghost"
                        onClick={() => addContactRow(setFamilyContacts, familyContacts)}
                      >
                        Thêm liên hệ
                      </button>
                    )}
                  </div>

                  {familyContacts.length === 0 && (
                    <p className="resident-form-empty">Chưa có liên hệ nào.</p>
                  )}
                  {familyContacts.map((contact, index) => (
                    <div key={`family-contact-${index}`} className="resident-contact-row">
                      <input
                        type="text"
                        placeholder="Họ tên"
                        value={contact.fullName || ''}
                        onChange={(e) =>
                          updateContact(index, 'fullName', e.target.value, setFamilyContacts, familyContacts)
                        }
                      />
                      <input
                        type="text"
                        placeholder="Quan hệ"
                        value={contact.relationship || ''}
                        onChange={(e) =>
                          updateContact(index, 'relationship', e.target.value, setFamilyContacts, familyContacts)
                        }
                      />
                      <input
                        type="text"
                        placeholder="Điện thoại"
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
                        placeholder="Địa chỉ"
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
                        Liên hệ chính
                      </label>
                      {!(contact._id && contact.isPrimary) && (
                        <button
                          type="button"
                          className="resident-contact-row__remove"
                          onClick={() => removeContact(index, setFamilyContacts, familyContacts)}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="resident-form-section">
                    <h4>ID tài khoản gia đình (mỗi dòng một ID)</h4>
                    <textarea
                      rows="3"
                      value={familyIds}
                      onChange={(e) => setFamilyIds(e.target.value)}
                      placeholder="Dán ID tài khoản thành viên gia đình vào đây"
                    />
                  </div>
                  </fieldset>

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

// defaultMode default parameter is set in the function signature

export default ResidentPage;