import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import authService from '../../services/auth.service';
import { resolveApiError } from '../../utils/apiMessage';
import { staffDateOfBirthValidationKey, validateStaffDateOfBirth } from '../../utils/staffAgeValidation';
import {
  staffCertificationValidationKey,
  validateStaffCertifications,
} from '../../utils/staffCertificateValidation';
import '../../styles/admin/StaffProfilesPage.css';

const initialCreateForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'doctor',
  phone: '',
  gender: 'unknown',
  dateOfBirth: '',
  address: '',
  specialty: '',
  staffCode: '',
};

const initialEditForm = {
  fullName: '',
  phone: '',
  gender: 'unknown',
  address: '',
  role: 'doctor',
  isActive: true,
  isBanned: false,
  banReason: '',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

function AdminAccountsPage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [filters, setFilters] = useState({ search: '', role: '', isActive: '' });
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [certificationEntries, setCertificationEntries] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [createFieldErrors, setCreateFieldErrors] = useState({});

  const loadAccounts = async (page = 1) => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries({
          ...filters,
          page,
          limit: pagination.limit,
        }).filter(([, value]) => value !== '' && value !== undefined && value !== null)
      );

      const data = await authService.getStaffAccounts(params);

      setAccounts(data.data || []);
      setPagination({
        page: data.page,
        totalPages: data.totalPages,
        total: data.total,
        limit: data.limit,
      });
    } catch (error) {
      setMessage(resolveApiError(error, t, 'admin.staff.common.loadFailed'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleApplyFilters = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    loadAccounts(1);
  };

  const handleResetFilters = () => {
    setFilters({ search: '', role: '', isActive: '' });
    setPagination((current) => ({ ...current, page: 1 }));
    loadAccounts(1);
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setCreateFieldErrors({});

    const dobErrorKey = validateStaffDateOfBirth(createForm.dateOfBirth, {
      role: createForm.role,
      gender: createForm.gender,
    });
    if (dobErrorKey) {
      setCreateFieldErrors({
        dateOfBirth: staffDateOfBirthValidationKey(dobErrorKey, t),
      });
      setSubmitting(false);
      return;
    }

    const certErrorKey = validateStaffCertifications(
      createForm.role,
      certificationEntries.map((entry) => ({ issueDate: entry.issueDate }))
    );
    if (certErrorKey) {
      setCreateFieldErrors({
        certifications: staffCertificationValidationKey(certErrorKey, t),
      });
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...createForm,
        dateOfBirth: createForm.dateOfBirth || undefined,
        certificationFiles: certificationEntries.length
          ? certificationEntries.map((entry) => entry.file)
          : undefined,
        certificationIssueDates: certificationEntries.length
          ? certificationEntries.map((entry) => entry.issueDate)
          : undefined,
      };

      await authService.createStaffAccount(payload);
      setMessageType('success');
      setMessage(t('adminAccounts.createSuccess'));
      setCreateForm(initialCreateForm);
      setCertificationEntries([]);
      await loadAccounts(1);
    } catch (error) {
      setMessageType('error');
      setMessage(resolveApiError(error, t, 'admin.staff.profiles.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (user) => {
    setEditUser(user);
    setEditForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      gender: user.gender || 'unknown',
      address: user.address || '',
      role: user.role || 'doctor',
      isActive: Boolean(user.isActive),
      isBanned: Boolean(user.isBanned),
      banReason: user.banReason || '',
    });
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editUser) return;

    setSubmitting(true);
    setMessage('');

    try {
      await authService.updateUserByAdmin(editUser._id, {
        ...editForm,
        isBanned: Boolean(editForm.isBanned),
        banReason: editForm.isBanned ? editForm.banReason || t('adminAccounts.defaultBanReason') : '',
      });
      setMessageType('success');
      setMessage(t('adminAccounts.updateSuccess'));
      setEditUser(null);
      await loadAccounts(pagination.page);
    } catch (error) {
      setMessageType('error');
      setMessage(resolveApiError(error, t, 'admin.residents.common.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    setSubmitting(true);
    setMessage('');

    try {
      await authService.toggleStaffActive(user._id);
      setMessageType('success');
      setMessage(t('adminAccounts.toggleActiveSuccess'));
      await loadAccounts(pagination.page);
    } catch (error) {
      setMessageType('error');
      setMessage(resolveApiError(error, t, 'admin.residents.common.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBan = async (user) => {
    setSubmitting(true);
    setMessage('');

    try {
      await authService.updateUserByAdmin(user._id, {
        isBanned: !user.isBanned,
        banReason: user.isBanned ? '' : t('adminAccounts.defaultBanReason'),
      });
      setMessageType('success');
      setMessage(user.isBanned ? t('adminAccounts.unbanSuccess') : t('adminAccounts.banSuccess'));
      await loadAccounts(pagination.page);
    } catch (error) {
      setMessageType('error');
      setMessage(resolveApiError(error, t, 'admin.staff.profiles.banFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-page staff-page">
      <div className="profile-page__container">
        <header className="profile-page__header staff-page__header">
          <h1 className="profile-page__title staff-page__title">{t('adminAccounts.pageTitle')}</h1>
          <p className="profile-page__subtitle staff-page__subtitle">
            {t('adminAccounts.pageSubtitle')}
          </p>
        </header>

        {message && (
          <div className={`message ${messageType === 'success' ? 'message--success' : 'message--error'}`}>
            {message}
          </div>
        )}

        <section className="profile-card">
          <h2 className="profile-card__heading">{t('adminAccounts.createHeading')}</h2>
          <form className="profile-form" onSubmit={handleCreateSubmit}>
            <div className="profile-form__grid">
              <label className="profile-form__field">
                <span className="profile-form__label">{t('adminAccounts.labelFullName')}</span>
                <input
                  className="profile-form__input"
                  value={createForm.fullName}
                  onChange={(event) => setCreateForm((current) => ({ ...current, fullName: event.target.value }))}
                  required
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">{t('adminAccounts.labelEmail')}</span>
                <input
                  className="profile-form__input"
                  type="email"
                  value={createForm.email}
                  onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">{t('adminAccounts.labelPassword')}</span>
                <input
                  className="profile-form__input"
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">{t('adminAccounts.labelRole')}</span>
                <select
                  className="profile-form__input"
                  value={createForm.role}
                  onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="doctor">{t('adminAccounts.roleDoctor')}</option>
                  <option value="nurse">{t('adminAccounts.roleNurse')}</option>
                  <option value="pharmacist">{t('adminAccounts.rolePharmacist')}</option>
                  <option value="caregiver">{t('adminAccounts.roleCaregiver')}</option>
                </select>
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">{t('adminAccounts.labelPhone')}</span>
                <input
                  className="profile-form__input"
                  value={createForm.phone}
                  onChange={(event) => setCreateForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">{t('adminAccounts.labelGender')}</span>
                <select
                  className="profile-form__input"
                  value={createForm.gender}
                  onChange={(event) => setCreateForm((current) => ({ ...current, gender: event.target.value }))}
                >
                  <option value="male">{t('adminAccounts.genderMale')}</option>
                  <option value="female">{t('adminAccounts.genderFemale')}</option>
                  <option value="other">{t('adminAccounts.genderOther')}</option>
                  <option value="unknown">{t('adminAccounts.genderUnknown')}</option>
                </select>
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">{t('admin.staff.profiles.labelDateOfBirthRequired')}</span>
                <input
                  className="profile-form__input"
                  type="date"
                  value={createForm.dateOfBirth}
                  onChange={(event) => {
                    setCreateForm((current) => ({ ...current, dateOfBirth: event.target.value }));
                    if (createFieldErrors.dateOfBirth) {
                      setCreateFieldErrors((current) => {
                        const next = { ...current };
                        delete next.dateOfBirth;
                        return next;
                      });
                    }
                  }}
                />
                {createFieldErrors.dateOfBirth && (
                  <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>{createFieldErrors.dateOfBirth}</span>
                )}
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">{t('adminAccounts.labelStaffCode')}</span>
                <input
                  className="profile-form__input"
                  value={createForm.staffCode}
                  onChange={(event) => setCreateForm((current) => ({ ...current, staffCode: event.target.value }))}
                  placeholder={t('adminAccounts.placeholderStaffCode')}
                />
              </label>

              <label className="profile-form__field" style={{ gridColumn: '1 / -1' }}>
                <span className="profile-form__label">{t('adminAccounts.labelAddress')}</span>
                <input
                  className="profile-form__input"
                  value={createForm.address}
                  onChange={(event) => setCreateForm((current) => ({ ...current, address: event.target.value }))}
                />
              </label>

              <label className="profile-form__field">
                <span className="profile-form__label">{t('adminAccounts.labelSpecialty')}</span>
                <input
                  className="profile-form__input"
                  value={createForm.specialty}
                  onChange={(event) => setCreateForm((current) => ({ ...current, specialty: event.target.value }))}
                />
              </label>

              <label className="profile-form__field" style={{ gridColumn: '1 / -1' }}>
                <span className="profile-form__label">{t('adminAccounts.labelCertifications')}</span>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 8px' }}>
                  {t('adminAccounts.certNote')}
                </p>
                <input
                  className="profile-form__input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    if (!files.length) return;
                    setCertificationEntries((prev) => [
                      ...prev,
                      ...files.map((file) => ({ file, issueDate: '' })),
                    ]);
                    event.target.value = '';
                  }}
                />
                {createFieldErrors.certifications && (
                  <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>{createFieldErrors.certifications}</span>
                )}
                {certificationEntries.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {certificationEntries.map((entry, index) => (
                      <div
                        key={`${entry.file.name}-${entry.file.size}-${entry.file.lastModified}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          backgroundColor: '#f1f5f9',
                        }}
                      >
                        <span style={{ fontSize: '13px', flex: '1 1 120px' }}>{entry.file.name}</span>
                        <label style={{ fontSize: '12px', color: '#64748b' }}>
                          {t('adminAccounts.labelCertIssuedDate')}
                          <input
                            type="date"
                            value={entry.issueDate}
                            onChange={(e) => {
                              const issueDate = e.target.value;
                              setCertificationEntries((prev) => prev.map((item, i) => (
                                i === index ? { ...item, issueDate } : item
                              )));
                            }}
                            style={{ marginLeft: '6px' }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setCertificationEntries((prev) => prev.filter((_, i) => i !== index))}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: '#64748b',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </label>
            </div>
            <div className="profile-page__actions">
              <button type="submit" className="button button--primary" disabled={submitting}>
                {submitting ? t('adminAccounts.btnCreateSubmitting') : t('adminAccounts.btnCreate')}
              </button>
            </div>
          </form>
        </section>

        <section className="profile-card">
          <div className="account-toolbar">
            <div>
              <h2 className="profile-card__heading">{t('adminAccounts.listHeading')}</h2>
              <p className="profile-card__empty">{t('adminAccounts.totalAccounts', { total: pagination.total })}</p>
            </div>
            <div className="account-filter-row">
              <input
                className="profile-form__input"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder={t('adminAccounts.placeholderSearch')}
              />
              <select className="profile-form__input" name="role" value={filters.role} onChange={handleFilterChange}>
                <option value="">{t('adminAccounts.allRoles')}</option>
                <option value="doctor">{t('adminAccounts.roleDoctor')}</option>
                <option value="nurse">{t('adminAccounts.roleNurse')}</option>
                <option value="caregiver">{t('adminAccounts.roleCaregiverFilter')}</option>
                <option value="staff">{t('adminAccounts.roleStaff')}</option>
                <option value="admin">{t('adminAccounts.roleAdmin')}</option>
              </select>
              <select className="profile-form__input" name="isActive" value={filters.isActive} onChange={handleFilterChange}>
                <option value="">{t('adminAccounts.allStatuses')}</option>
                <option value="true">{t('adminAccounts.statusActive')}</option>
                <option value="false">{t('adminAccounts.statusInactive')}</option>
              </select>
              <button type="button" className="button button--primary" onClick={handleApplyFilters}>
                {t('adminAccounts.btnFilter')}
              </button>
              <button type="button" className="button button--secondary" onClick={handleResetFilters}>
                {t('adminAccounts.btnReset')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner" role="status" aria-live="polite">
              <span className="loading-spinner__ring" aria-hidden="true" />
              <span className="loading-spinner__label">{t('adminAccounts.loadingAccounts')}</span>
            </div>
          ) : accounts.length === 0 ? (
            <p className="profile-card__empty">{t('adminAccounts.noAccountsFound')}</p>
          ) : (
            <div className="account-table-wrap">
              <table className="account-table">
                <thead>
                  <tr>
                    <th>{t('adminAccounts.colFullName')}</th>
                    <th>{t('adminAccounts.colEmail')}</th>
                    <th>{t('adminAccounts.colRole')}</th>
                    <th>{t('adminAccounts.colStatus')}</th>
                    <th>{t('adminAccounts.colBanned')}</th>
                    <th>{t('adminAccounts.colCreatedAt')}</th>
                    <th>{t('adminAccounts.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((user) => (
                    <tr key={user._id}>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>
                        <span className={`account-chip ${user.isActive ? 'account-chip--active' : 'account-chip--inactive'}`}>
                          {user.isActive ? t('adminAccounts.chipActive') : t('adminAccounts.chipInactive')}
                        </span>
                        {user.isBanned && <span className="account-chip account-chip--banned">{t('adminAccounts.chipBanned')}</span>}
                      </td>
                      <td>{user.isBanned ? t('adminAccounts.yes') : t('adminAccounts.no')}</td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="account-actions">
                          <button type="button" className="button button--secondary" onClick={() => handleEditOpen(user)}>
                            {t('adminAccounts.btnEdit')}
                          </button>
                          {/* <button type="button" className="button button--primary" onClick={() => handleToggleActive(user)} disabled={submitting}>
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button> */}
                          <button type="button" className={`button ${user.isBanned ? 'button--secondary' : 'button--danger'}`} onClick={() => handleToggleBan(user)} disabled={submitting}>
                            {user.isBanned ? t('adminAccounts.btnUnban') : t('adminAccounts.btnBan')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="account-pagination">
            <button
              type="button"
              className="button button--secondary"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadAccounts(pagination.page - 1)}
            >
              {t('adminAccounts.btnPrev')}
            </button>
            <span>
              {t('adminAccounts.page', { page: pagination.page, totalPages: pagination.totalPages })}
            </span>
            <button
              type="button"
              className="button button--secondary"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadAccounts(pagination.page + 1)}
            >
              {t('adminAccounts.btnNext')}
            </button>
          </div>
        </section>

        {editUser && (
          <section className="profile-card">
            <h2 className="profile-card__heading">{t('adminAccounts.editHeading', { fullName: editUser.fullName })}</h2>
            <form className="profile-form" onSubmit={handleEditSubmit}>
              <div className="profile-form__grid">
                <label className="profile-form__field">
                  <span className="profile-form__label">{t('adminAccounts.labelFullName')}</span>
                  <input
                    className="profile-form__input"
                    value={editForm.fullName}
                    onChange={(event) => setEditForm((current) => ({ ...current, fullName: event.target.value }))}
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">{t('adminAccounts.labelPhone')}</span>
                  <input
                    className="profile-form__input"
                    value={editForm.phone}
                    onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">{t('adminAccounts.labelGender')}</span>
                  <select
                    className="profile-form__input"
                    value={editForm.gender}
                    onChange={(event) => setEditForm((current) => ({ ...current, gender: event.target.value }))}
                  >
                    <option value="male">{t('adminAccounts.genderMale')}</option>
                    <option value="female">{t('adminAccounts.genderFemale')}</option>
                    <option value="other">{t('adminAccounts.genderOther')}</option>
                    <option value="unknown">{t('adminAccounts.genderUnknown')}</option>
                  </select>
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">{t('adminAccounts.labelRole')}</span>
                  <select
                    className="profile-form__input"
                    value={editForm.role}
                    onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))}
                  >
                    <option value="doctor">{t('adminAccounts.roleDoctor')}</option>
                    <option value="nurse">{t('adminAccounts.roleNurse')}</option>
                    <option value="pharmacist">{t('adminAccounts.rolePharmacist')}</option>
                    <option value="caregiver">{t('adminAccounts.roleCaregiver')}</option>
                    <option value="admin">{t('adminAccounts.roleAdmin')}</option>
                  </select>
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">{t('adminAccounts.labelAddress')}</span>
                  <input
                    className="profile-form__input"
                    value={editForm.address}
                    onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))}
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">{t('adminAccounts.labelActiveStatus')}</span>
                  <select
                    className="profile-form__input"
                    value={editForm.isActive ? 'true' : 'false'}
                    onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.value === 'true' }))}
                  >
                    <option value="true">{t('adminAccounts.statusActive')}</option>
                    <option value="false">{t('adminAccounts.statusInactive')}</option>
                  </select>
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">{t('adminAccounts.labelBanStatus')}</span>
                  <select
                    className="profile-form__input"
                    value={editForm.isBanned ? 'true' : 'false'}
                    onChange={(event) => setEditForm((current) => ({ ...current, isBanned: event.target.value === 'true' }))}
                  >
                    <option value="false">{t('adminAccounts.statusNotBanned')}</option>
                    <option value="true">{t('adminAccounts.statusBanned')}</option>
                  </select>
                </label>

                <label className="profile-form__field" style={{ gridColumn: '1 / -1' }}>
                  <span className="profile-form__label">{t('adminAccounts.labelBanReason')}</span>
                  <input
                    className="profile-form__input"
                    value={editForm.banReason}
                    onChange={(event) => setEditForm((current) => ({ ...current, banReason: event.target.value }))}
                    placeholder={t('adminAccounts.placeholderBanReason')}
                  />
                </label>
              </div>
              <div className="profile-page__actions">
                <button type="submit" className="button button--primary" disabled={submitting}>
                  {submitting ? t('adminAccounts.btnSaveSubmitting') : t('adminAccounts.btnSave')}
                </button>
                <button type="button" className="button button--secondary" onClick={() => setEditUser(null)}>
                  {t('adminAccounts.btnCancel')}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

export default AdminAccountsPage;
