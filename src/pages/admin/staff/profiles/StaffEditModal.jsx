import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_STAFF_ROLE_OPTIONS } from '../../../../constants/rolePolicy';
import { isValidStaffPhone } from '../../../../utils/staffPhoneValidation';
import {
  staffCertificationValidationKey,
  validateStaffCertifications,
} from '../../../../utils/staffCertificateValidation';

export default function StaffEditModal({
  loading = false,
  form,
  onChange,
  onSave,
  onClose,
  error,
  roleOptions = ALL_STAFF_ROLE_OPTIONS,
}) {
  const { t } = useTranslation();
  const [phoneError, setPhoneError] = useState('');
  const fileRef = useRef();
  const certFileRef = useRef();

  const set = (field, value) => onChange({ ...form, [field]: value });

  const handlePhoneChange = (val) => {
    set('phone', val);
    if (!val.trim()) { setPhoneError(''); return; }
    if (!isValidStaffPhone(val)) {
      setPhoneError(t('admin.staff.profiles.validation.phoneInvalid'));
      return;
    }
    setPhoneError('');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) set('avatarFile', file);
  };

  const handleCertificationChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    onChange({
      ...form,
      certificationEntries: [
        ...(form.certificationEntries || []),
        ...files.map((file) => ({ file, issueDate: '' })),
      ],
    });
    if (certFileRef.current) certFileRef.current.value = '';
  };

  const handleNewCertIssueDateChange = (index, issueDate) => {
    onChange({
      ...form,
      certificationEntries: (form.certificationEntries || []).map((entry, i) => (
        i === index ? { ...entry, issueDate } : entry
      )),
    });
  };

  const handleRemoveNewCert = (index) => {
    onChange({
      ...form,
      certificationEntries: (form.certificationEntries || []).filter((_, i) => i !== index),
    });
  };

  const handleExistingCertIssueDateChange = (publicId, issueDate) => {
    onChange({
      ...form,
      existingCertDocs: (form.existingCertDocs || []).map((doc) => (
        doc.publicId === publicId ? { ...doc, issueDate } : doc
      )),
    });
  };

  const handleRemoveExistingCert = (doc) => {
    if (!doc.publicId) return;
    onChange({
      ...form,
      existingCertDocs: (form.existingCertDocs || []).filter((d) => d.publicId !== doc.publicId),
      removedCertPublicIds: [...(form.removedCertPublicIds || []), doc.publicId],
    });
  };

  const certFileKey = (entry) => `${entry.file.name}-${entry.file.size}-${entry.file.lastModified}`;

  const handleSave = () => {
    if (phoneError || loading) return;
    if (form.phone?.trim() && !isValidStaffPhone(form.phone)) {
      setPhoneError(t('admin.staff.profiles.validation.phoneInvalid'));
      return;
    }

    const effectiveRole = form.role;
    const allCertDocs = [
      ...(form.existingCertDocs || []).map((doc) => ({ issueDate: doc.issueDate })),
      ...(form.certificationEntries || []).map((entry) => ({ issueDate: entry.issueDate })),
    ];
    const certErrorKey = validateStaffCertifications(effectiveRole, allCertDocs);
    if (certErrorKey) {
      setPhoneError('');
      onChange({ ...form, certValidationError: staffCertificationValidationKey(certErrorKey, t) });
      return;
    }

    onChange({ ...form, certValidationError: '' });
    onSave();
  };

  const existingCerts = form.existingCertDocs || [];
  const newCerts = form.certificationEntries || [];
  const certValidationError = form.certValidationError || '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scroll staff-profile-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{t('admin.staff.profiles.editTitle')}</h2>

        {error && <p className="form-error">{error}</p>}
        {certValidationError && <p className="form-error">{certValidationError}</p>}
        {loading && (
          <p className="edit-modal__loading">{t('admin.staff.profiles.loadingProfile')}</p>
        )}

        <fieldset className="edit-form-fields" disabled={loading}>
          <div className="form-section-title">{t('admin.staff.profiles.sectionPersonalInfo')}</div>
          <div className="form-grid">
            <div className="form-group form-grid--full">
              <label>{t('admin.staff.profiles.labelFullNameRequired')}</label>
              <input
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                placeholder={t('admin.staff.profiles.placeholderFullName')}
              />
            </div>

            <div className="form-group">
              <label>{t('admin.staff.profiles.labelPhone')}</label>
              <input
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder={t('admin.staff.profiles.placeholderPhone')}
              />
              {phoneError && <span className="field-error">{phoneError}</span>}
            </div>

            <div className="form-group">
              <label>{t('admin.staff.profiles.labelGender')}</label>
              <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">—</option>
                <option value="male">{t('common.gender.male')}</option>
                <option value="female">{t('common.gender.female')}</option>
                <option value="other">{t('common.gender.other')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('admin.staff.profiles.labelDateOfBirthRequired')}</label>
              <input
                type="date"
                value={form.dateOfBirth || ''}
                onChange={(e) => set('dateOfBirth', e.target.value)}
              />
            </div>

            <div className="form-group form-grid--full">
              <label>{t('admin.staff.profiles.labelAddress')}</label>
              <input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder={t('admin.staff.profiles.placeholderAddress')}
              />
            </div>

            <div className="form-group form-grid--full">
              <label>{t('admin.staff.profiles.labelAvatar')}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {(form.avatarFile || form.avatarUrl) && (
                  <img
                    src={form.avatarFile ? URL.createObjectURL(form.avatarFile) : form.avatarUrl}
                    alt=""
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                  />
                )}
                <button type="button" className="btn-outline-sm" onClick={() => fileRef.current?.click()}>
                  {form.avatarFile ? t('admin.staff.profiles.changeAvatar') : t('admin.staff.profiles.chooseAvatar')}
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </div>
            </div>
          </div>

          <div className="form-section-title">{t('admin.staff.profiles.sectionProfessionalInfo')}</div>
          <div className="form-grid">
            <div className="form-group">
              <label>
                {t('admin.staff.profiles.labelSystemRoleRequired')}
                <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.7rem', marginLeft: 4 }}>
                  {t('admin.staff.profiles.systemRoleHint')}
                </span>
              </label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)}>
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>{r.label || t(`common.roles.${r.value}`, { defaultValue: r.value })}</option>
                ))}
              </select>
            </div>

            <div className="form-group form-grid--full">
              <label>{t('admin.staff.profiles.labelSpecialty')}</label>
              <input
                value={form.specialty}
                onChange={(e) => set('specialty', e.target.value)}
                placeholder={t('admin.staff.profiles.placeholderSpecialtyEdit')}
              />
            </div>

            <div className="form-group form-grid--full">
              <label>{t('admin.staff.profiles.labelCertificationsUpload')}</label>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 8px' }}>
                {t('admin.staff.profiles.certIssueDateHint')}
              </p>
              {existingCerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '0.75rem' }}>
                  {existingCerts.map((doc) => (
                    <div
                      key={doc.publicId || doc.url}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={doc.fileName || t('admin.staff.profiles.labelCertifications')}
                      >
                        <img
                          src={doc.url}
                          alt={doc.fileName || ''}
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                        />
                      </a>
                      <span style={{ fontSize: '13px', flex: '1 1 120px' }}>{doc.fileName || t('admin.staff.profiles.labelCertifications')}</span>
                      <label style={{ fontSize: '12px', color: '#64748b' }}>
                        {t('admin.staff.profiles.labelCertIssueDate')}
                        <input
                          type="date"
                          value={doc.issueDate || ''}
                          onChange={(e) => handleExistingCertIssueDateChange(doc.publicId, e.target.value)}
                          style={{ marginLeft: '6px' }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingCert(doc)}
                        aria-label={t('admin.staff.profiles.removeCertFileAria', { name: doc.fileName || '' })}
                        title={t('admin.staff.profiles.removeCertFile')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: '16px',
                          lineHeight: 1,
                          color: '#64748b',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn-outline-sm" onClick={() => certFileRef.current?.click()}>
                  {t('admin.staff.profiles.chooseCertFiles')}
                </button>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {newCerts.length
                    ? t('admin.staff.profiles.certFilesSelected', { count: newCerts.length })
                    : t('admin.staff.profiles.certFilesHint')}
                </span>
              </div>
              <input
                ref={certFileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleCertificationChange}
              />
              {newCerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem' }}>
                  {newCerts.map((entry, index) => (
                    <div
                      key={certFileKey(entry)}
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
                        {t('admin.staff.profiles.labelCertIssueDate')}
                        <input
                          type="date"
                          value={entry.issueDate}
                          onChange={(e) => handleNewCertIssueDateChange(index, e.target.value)}
                          style={{ marginLeft: '6px' }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewCert(index)}
                        aria-label={t('admin.staff.profiles.removeCertFileAria', { name: entry.file.name })}
                        title={t('admin.staff.profiles.removeCertFile')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: '16px',
                          lineHeight: 1,
                          color: '#64748b',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </fieldset>

        <div className="modal__actions">
          <button type="button" className="btn-cancel" onClick={onClose}>{t('common.cancel')}</button>
          <button
            type="button"
            className="btn-save"
            onClick={handleSave}
            disabled={!!phoneError || loading}
          >
            {t('admin.staff.profiles.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
