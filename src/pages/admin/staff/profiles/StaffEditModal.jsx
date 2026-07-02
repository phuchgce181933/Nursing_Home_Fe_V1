import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_STAFF_ROLE_OPTIONS } from '../../../../constants/rolePolicy';

const PASSWORD_REGEX_LETTER = /[a-zA-Z]/;
const PASSWORD_REGEX_DIGIT = /[0-9]/;

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
  const [showPassword, setShowPassword] = useState(false);
  const [pwError, setPwError] = useState('');
  const fileRef = useRef();

  const set = (field, value) => onChange({ ...form, [field]: value });

  const handlePasswordChange = (val) => {
    set('password', val);
    if (!val) { setPwError(''); return; }
    if (val.length < 8) { setPwError(t('admin.staff.profiles.validation.passwordMinEdit')); return; }
    if (!PASSWORD_REGEX_LETTER.test(val)) { setPwError(t('admin.staff.profiles.validation.passwordLetterEdit')); return; }
    if (!PASSWORD_REGEX_DIGIT.test(val)) { setPwError(t('admin.staff.profiles.validation.passwordDigitEdit')); return; }
    setPwError('');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) set('avatarFile', file);
  };

  const handleSave = () => {
    if (pwError || loading) return;
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scroll staff-profile-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{t('admin.staff.profiles.editTitle')}</h2>

        {error && <p className="form-error">{error}</p>}
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
                onChange={(e) => set('phone', e.target.value)}
                placeholder={t('admin.staff.profiles.placeholderPhone')}
              />
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
              <label>{t('admin.staff.profiles.labelDateOfBirth')}</label>
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
          </div>

          <div className="form-section-title">{t('admin.staff.profiles.sectionSecurity')}</div>
          <div className="form-grid">
            <div className="form-group form-grid--full">
              <label>
                {t('admin.staff.profiles.labelResetPassword')}
                <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.7rem', marginLeft: 4 }}>
                  {t('admin.staff.profiles.resetPasswordHint')}
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password || ''}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder={t('admin.staff.profiles.placeholderPassword')}
                  style={{ paddingRight: 64, width: '100%', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#64748b',
                  }}
                >
                  {showPassword ? t('admin.staff.profiles.hidePassword') : t('admin.staff.profiles.showPassword')}
                </button>
              </div>
              {pwError && <span className="field-error">{pwError}</span>}
            </div>
          </div>
        </fieldset>

        <div className="modal__actions">
          <button type="button" className="btn-cancel" onClick={onClose}>{t('common.cancel')}</button>
          <button
            type="button"
            className="btn-save"
            onClick={handleSave}
            disabled={!!pwError || loading}
          >
            {t('admin.staff.profiles.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
