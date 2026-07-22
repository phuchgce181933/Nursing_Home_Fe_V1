import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { ALL_STAFF_ROLE_OPTIONS } from '../../../../constants/rolePolicy';
import { staffDateOfBirthValidationKey, validateStaffDateOfBirth } from '../../../../utils/staffAgeValidation';
import { isValidStaffPhone } from '../../../../utils/staffPhoneValidation';
import {
  staffCertificationValidationKey,
  validateStaffCertifications,
} from '../../../../utils/staffCertificateValidation';

// Mirror backend validators
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

const validate = (form, certificationEntries, t) => {
  const errs = {};
  const v = (key) => t(`admin.staff.profiles.validation.${key}`);

  if (!form.fullName.trim()) errs.fullName = v('fullNameRequired');
  else if (form.fullName.trim().length < 2) errs.fullName = v('fullNameMin');
  else if (form.fullName.trim().length > 100) errs.fullName = v('fullNameMax');

  if (!form.email.trim()) errs.email = v('emailRequired');
  else if (!EMAIL_REGEX.test(form.email.trim())) errs.email = v('emailInvalid');

  if (!form.password) errs.password = v('passwordRequired');
  else if (form.password.length < 8) errs.password = v('passwordMin');
  else if (!/[a-zA-Z]/.test(form.password)) errs.password = v('passwordLetter');
  else if (!/[0-9]/.test(form.password)) errs.password = v('passwordDigit');

  if (!form.role) errs.role = v('roleRequired');

  if (form.phone && !isValidStaffPhone(form.phone)) {
    errs.phone = v('phoneInvalid');
  }

  if (form.username && !USERNAME_REGEX.test(form.username.trim())) {
    errs.username = v('usernameInvalid');
  }

  const dobErrorKey = validateStaffDateOfBirth(form.dateOfBirth, { role: form.role, gender: form.gender });
  if (dobErrorKey) errs.dateOfBirth = staffDateOfBirthValidationKey(dobErrorKey, t);

  const certErrorKey = validateStaffCertifications(
    form.role,
    certificationEntries.map((entry) => ({ issueDate: entry.issueDate }))
  );
  if (certErrorKey) errs.certifications = staffCertificationValidationKey(certErrorKey, t);

  return errs;
};

const emptyForm = {
  fullName: '', email: '', password: '', role: 'nurse',
  phone: '', username: '', gender: '', dateOfBirth: '',
  address: '', specialty: '',
};

export default function StaffCreateModal({
  onSave,
  onClose,
  serverError,
  roleOptions = ALL_STAFF_ROLE_OPTIONS,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [certificationEntries, setCertificationEntries] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const fileRef = useRef();
  const certFileRef = useRef();

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCertificationChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setCertificationEntries((prev) => [
      ...prev,
      ...files.map((file) => ({ file, issueDate: '' })),
    ]);
    if (errors.certifications) {
      setErrors((prev) => { const next = { ...prev }; delete next.certifications; return next; });
    }
    if (certFileRef.current) certFileRef.current.value = '';
  };

  const handleCertIssueDateChange = (index, issueDate) => {
    setCertificationEntries((prev) => prev.map((entry, i) => (
      i === index ? { ...entry, issueDate } : entry
    )));
    if (errors.certifications) {
      setErrors((prev) => { const next = { ...prev }; delete next.certifications; return next; });
    }
  };

  const handleRemoveNewCert = (index) => {
    setCertificationEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const certFileKey = (entry) => `${entry.file.name}-${entry.file.size}-${entry.file.lastModified}`;

  const handleSubmit = () => {
    const errs = validate(form, certificationEntries, t);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    onSave({
      ...form,
      certificationFiles: certificationEntries.map((entry) => entry.file),
      certificationIssueDates: certificationEntries.map((entry) => entry.issueDate),
      avatarFile: avatarFile || undefined,
    });
  };

  const field = (label, key, props = {}) => (
    <div className={`form-group${props.full ? ' form-grid--full' : ''}`}>
      <label>{label}</label>
      <input
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        {...(({ full, ...rest }) => rest)(props)}
      />
      {errors[key] && <span className="field-error">{errors[key]}</span>}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide modal--scroll staff-profile-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{t('admin.staff.profiles.createTitle')}</h2>

        {serverError && <p className="form-error">{serverError}</p>}

        <div className="avatar-upload">
          <div
            className="avatar-upload__preview"
            onClick={() => fileRef.current?.click()}
            title={t('admin.staff.profiles.avatarChoose')}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="preview" className="avatar-upload__img" />
              : <span className="avatar-upload__placeholder">📷</span>}
          </div>
          <div>
            <button type="button" className="btn-outline-sm" onClick={() => fileRef.current?.click()}>
              {t('admin.staff.profiles.avatarChoose')}
            </button>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0' }}>
              {t('admin.staff.profiles.avatarHint')}
            </p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        <div className="form-section-title">{t('admin.staff.profiles.sectionLogin')}</div>
        <div className="form-grid">
          {field(t('admin.staff.profiles.labelEmailRequired'), 'email', { placeholder: t('admin.staff.profiles.placeholderEmail'), type: 'email' })}
          <div className="form-group">
            <label>{t('admin.staff.profiles.labelPasswordRequired')}</label>
            <div className="form-group__password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-group__password-input"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder={t('admin.staff.profiles.placeholderPassword')}
              />
              <button
                type="button"
                className="form-group__password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? t('admin.staff.profiles.hidePassword') : t('admin.staff.profiles.showPassword')}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          {field(t('admin.staff.profiles.labelUsername'), 'username', { placeholder: t('admin.staff.profiles.placeholderUsername') })}
        </div>

        <div className="form-section-title">{t('admin.staff.profiles.sectionPersonalInfo')}</div>
        <div className="form-grid">
          {field(t('admin.staff.profiles.labelFullNameRequired'), 'fullName', { placeholder: t('admin.staff.profiles.placeholderFullName'), full: true })}
          {field(t('admin.staff.profiles.labelPhone'), 'phone', { placeholder: t('admin.staff.profiles.placeholderPhone') })}
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
            <label>{t('admin.staff.profiles.labelDateOfBirth')}</label>
            <input
              type="date"
              value={form.dateOfBirth || ''}
              onChange={(e) => set('dateOfBirth', e.target.value)}
            />
            {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
          </div>
          {field(t('admin.staff.profiles.labelAddress'), 'address', { placeholder: t('admin.staff.profiles.placeholderAddress'), full: true })}
        </div>

        <div className="form-section-title">{t('admin.staff.profiles.sectionProfessionalInfo')}</div>
        <div className="form-grid">
          <div className="form-group">
            <label>{t('admin.staff.profiles.labelRoleRequired')}</label>
            <select value={form.role} onChange={(e) => set('role', e.target.value)}>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>{r.label || t(`common.roles.${r.value}`, { defaultValue: r.value })}</option>
              ))}
            </select>
            {errors.role && <span className="field-error">{errors.role}</span>}
          </div>
          {field(t('admin.staff.profiles.labelSpecialty'), 'specialty', { placeholder: t('admin.staff.profiles.placeholderSpecialty') })}
          <div className="form-group form-grid--full">
            <label>{t('admin.staff.profiles.labelCertificationsUpload')}</label>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 8px' }}>
              {t('admin.staff.profiles.certIssueDateHint')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn-outline-sm" onClick={() => certFileRef.current?.click()}>
                {t('admin.staff.profiles.chooseCertFiles')}
              </button>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                {certificationEntries.length
                  ? t('admin.staff.profiles.certFilesSelected', { count: certificationEntries.length })
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
            {errors.certifications && <span className="field-error">{errors.certifications}</span>}
            {certificationEntries.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem' }}>
                {certificationEntries.map((entry, index) => (
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
                        onChange={(e) => handleCertIssueDateChange(index, e.target.value)}
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

        <div className="modal__actions">
          <button className="btn-cancel" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-save" onClick={handleSubmit}>{t('admin.staff.profiles.createAccount')}</button>
        </div>
      </div>
    </div>
  );
}
