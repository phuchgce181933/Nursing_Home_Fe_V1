import { useEffect, useRef, useState } from 'react';
import {
  Mail, Phone, Shield, BadgeCheck, UserCircle, Pencil,
  User, Contact, Lock, Clock, Calendar, Briefcase,
  Hash, Users, LogOut, KeyRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import authService from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';
import { resolveApiError } from '../utils/apiMessage';

const TABS = [
  { key: 'personal', icon: User },
  { key: 'contact', icon: Contact },
  { key: 'security', icon: Lock },
  { key: 'system', icon: Clock },
];

const initialProfileForm = {
  fullName: '',
  email: '',
  phone: '',
  gender: 'unknown',
};

const initialPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const PASSWORD_POLICY_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

function getGenderDisplay(value, t) {
  if (!value) return '—';
  return t(`common.gender.${value}`, { defaultValue: value });
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function ProfilePage() {
  const { t } = useTranslation();
  const { user, loading, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [isSaving, setIsSaving] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpContext, setOtpContext] = useState('email');
  const [otpId, setOtpId] = useState(null);
  const [emailOtpId, setEmailOtpId] = useState(null);
  const [phoneOtpId, setPhoneOtpId] = useState(null);
  const [otpMaskedRecipient, setOtpMaskedRecipient] = useState('');
  const [emailMaskedRecipient, setEmailMaskedRecipient] = useState('');
  const [phoneMaskedRecipient, setPhoneMaskedRecipient] = useState('');
  const [pendingEmailChange, setPendingEmailChange] = useState(false);
  const [pendingPhoneChange, setPendingPhoneChange] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [spamBlocked, setSpamBlocked] = useState(false);
  const [otpCooldowns, setOtpCooldowns] = useState({ email: 0, phone: 0 });
  const spamGuardRef = useRef(false);
  const otpRequestStateRef = useRef({ email: { attempts: 0, nextAllowedAt: 0 }, phone: { attempts: 0, nextAllowedAt: 0 } });

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || 'unknown',
      });
    }
  }, [user]);

  if (loading || !user) {
    return <LoadingSpinner label={t('profile.loadingProfile')} />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const startProtectedAction = () => {
    if (spamGuardRef.current) {
      setMessageType('error');
      setMessage(t('profile.pleaseWait'));
      return false;
    }
    spamGuardRef.current = true;
    setSpamBlocked(true);
    window.setTimeout(() => {
      spamGuardRef.current = false;
      setSpamBlocked(false);
    }, 2500);
    return true;
  };

  const canRequestOtp = (type) => {
    const state = otpRequestStateRef.current[type];
    const now = Date.now();
    if (state.nextAllowedAt && now < state.nextAllowedAt) {
      const secondsLeft = Math.max(1, Math.ceil((state.nextAllowedAt - now) / 1000));
      setMessageType('error');
      setMessage(t('profile.otpCooldown', { seconds: secondsLeft }));
      return false;
    }
    return true;
  };

  const reserveOtpRequest = (type) => {
    const state = otpRequestStateRef.current[type];
    const now = Date.now();
    const delaySeconds = state.attempts === 0 ? 0 : Math.min(300, 30 * 2 ** Math.max(0, state.attempts - 1));
    state.attempts += 1;
    state.nextAllowedAt = delaySeconds > 0 ? now + delaySeconds * 1000 : 0;
    setOtpCooldowns(prev => ({ ...prev, [type]: delaySeconds }));
    return true;
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!startProtectedAction()) return;
    setIsSaving(true);
    setMessage('');
    try {
      const normalizedNewEmail = profileForm.email ? String(profileForm.email).trim().toLowerCase() : '';
      const normalizedOldEmail = user?.email ? String(user.email).trim().toLowerCase() : '';
      const normalizedNewPhone = profileForm.phone ? String(profileForm.phone).trim() : '';
      const normalizedOldPhone = user?.phone ? String(user.phone).trim() : '';
      const needsEmailChange = Boolean(normalizedNewEmail && normalizedNewEmail !== normalizedOldEmail);
      const needsPhoneChange = Boolean(normalizedNewPhone && normalizedNewPhone !== normalizedOldPhone);
      const bothEmailAndPhoneChanged = needsEmailChange && needsPhoneChange;

      if (needsEmailChange && !canRequestOtp('email')) {
        return;
      }
      if (needsPhoneChange && !canRequestOtp('phone')) {
        return;
      }

      if (bothEmailAndPhoneChanged) {
        reserveOtpRequest('email');
        reserveOtpRequest('phone');
        const emailResp = await authService.requestEmailChangeOtp({ email: profileForm.email });
        const phoneResp = await authService.requestPhoneChangeOtp({ phone: normalizedNewPhone });
        setPendingEmailChange(true);
        setPendingPhoneChange(true);
        setEmailOtpId(emailResp.otpId);
        setPhoneOtpId(phoneResp.otpId);
        setEmailMaskedRecipient(emailResp.maskedRecipient || profileForm.email);
        setPhoneMaskedRecipient(phoneResp.maskedRecipient || normalizedNewPhone);
        setOtpContext('email');
        setOtpId(emailResp.otpId);
        setOtpMaskedRecipient(emailResp.maskedRecipient || profileForm.email);
        setOtpCode('');
        setOtpError('');
        setOtpModalVisible(true);
      } else if (needsEmailChange) {
        reserveOtpRequest('email');
        const resp = await authService.requestEmailChangeOtp({ email: profileForm.email });
        setPendingEmailChange(true);
        setOtpContext('email');
        setOtpId(resp.otpId);
        setEmailOtpId(resp.otpId);
        setEmailMaskedRecipient(resp.maskedRecipient || profileForm.email);
        setOtpMaskedRecipient(resp.maskedRecipient || profileForm.email);
        setOtpCode('');
        setOtpError('');
        setOtpModalVisible(true);
      } else if (needsPhoneChange) {
        reserveOtpRequest('phone');
        const nextPhone = normalizedNewPhone;
        const resp = await authService.requestPhoneChangeOtp({ phone: nextPhone });
        setPendingPhoneChange(true);
        setOtpContext('phone');
        setOtpId(resp.otpId);
        setPhoneOtpId(resp.otpId);
        setPhoneMaskedRecipient(resp.maskedRecipient || nextPhone);
        setOtpMaskedRecipient(resp.maskedRecipient || nextPhone);
        setOtpCode('');
        setOtpError('');
        setOtpModalVisible(true);
      } else {
        // Ensure we don't send the email field if it wasn't actually changed
        const payload = { ...profileForm };
        delete payload.email;
        await authService.updateProfile(payload);
        setMessageType('success');
        setMessage(t('profile.updateSuccess'));
        setEditing(false);
        await refreshUser();
      }
    } catch (error) {
      setMessageType('error');
      setMessage(resolveApiError(error, t, 'profile.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpId || !startProtectedAction()) return;
    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      if (otpContext === 'email') {
        await authService.verifyEmailChangeOtp({ otpId, code: otpCode });
        setPendingEmailChange(false);
        if (pendingPhoneChange && phoneOtpId) {
          setOtpContext('phone');
          setOtpId(phoneOtpId);
          setOtpMaskedRecipient(phoneMaskedRecipient);
          setOtpCode('');
          setOtpError('');
          setMessageType('success');
          setMessage(t('profile.emailVerifiedContinuePhone'));
          return;
        }
        setMessageType('success');
        setMessage(t('profile.emailChangeSuccess') || 'Email updated');
      } else {
        await authService.verifyPhoneChangeOtp({ otpId, code: otpCode });
        setPendingPhoneChange(false);
        if (pendingEmailChange && emailOtpId) {
          setOtpContext('email');
          setOtpId(emailOtpId);
          setOtpMaskedRecipient(emailMaskedRecipient);
          setOtpCode('');
          setOtpError('');
          setMessageType('success');
          setMessage(t('profile.phoneVerifiedContinueEmail'));
          return;
        }
        setMessageType('success');
        setMessage(
          pendingEmailChange
            ? t('profile.emailAndPhoneChangeSuccess') || 'Email and phone updated'
            : t('profile.phoneChangeSuccess') || 'Phone updated'
        );
      }
      setOtpModalVisible(false);
      setEditing(false);
      if (refreshUser) await refreshUser();
    } catch (err) {
      setOtpError(resolveApiError(err, t, 'profile.invalidOtp'));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!startProtectedAction()) return;

    if (!PASSWORD_POLICY_REGEX.test(passwordForm.newPassword)) {
      setMessageType('error');
      setMessage(t('profile.passwordRequirements'));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessageType('error');
      setMessage(t('profile.passwordMismatch'));
      return;
    }
    setIsSaving(true);
    setMessage('');
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setMessageType('success');
      setMessage(t('profile.passwordChangeSuccess'));
      setPasswordForm(initialPasswordForm);
    } catch (error) {
      setMessageType('error');
      setMessage(resolveApiError(error, t, 'profile.passwordChangeError'));
    } finally {
      setIsSaving(false);
    }
  };

  const roleLabel = user.role ? (t(`common.roles.${user.role}`, { defaultValue: user.role }) || user.role) : '';
  const idShort = user._id ? user._id.slice(-8).toUpperCase() : '';

  return (
    <div className="ap">
      {/* Hero Header */}
      <div className="ap-hero">
        <div className="ap-hero__bar" />
        <div className="ap-hero__content">
          <div className="ap-hero__left">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="ap-hero__avatar" />
            ) : (
              <div className="ap-hero__avatar ap-hero__avatar--placeholder">
                <UserCircle size={48} />
              </div>
            )}
            <div className="ap-hero__info">
              <h1 className="ap-hero__name">{user.fullName}</h1>
              <div className="ap-hero__meta">
                <span className="ap-hero__badge">{roleLabel}</span>
                <span className="ap-hero__id">
                  <Briefcase size={14} />
                  ID: {idShort}
                </span>
                <span className={`ap-hero__status ${user.isActive ? 'is-active' : 'is-inactive'}`}>
                  <BadgeCheck size={14} />
                  {user.isActive ? t('profile.accountActive') : t('profile.accountInactive')}
                </span>
              </div>
            </div>
          </div>
          <div className="ap-hero__actions">
            <button
              type="button"
              className="ap-hero__edit-btn"
              onClick={() => { setEditing(!editing); setActiveTab('personal'); }}
            >
              <Pencil size={14} />
              {editing ? t('common.cancel') : t('profile.editProfile')}
            </button>
            <button type="button" className="ap-hero__logout-btn" onClick={handleLogout}>
              <LogOut size={14} />
              {t('profile.logout')}
            </button>
          </div>
        </div>
      </div>
      {otpModalVisible && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setOtpModalVisible(false)} />
          <div style={{ background: '#fff', padding: 20, borderRadius: 6, width: 420, zIndex: 1201 }}>
            <h3 style={{ marginTop: 0 }}>{t(otpContext === 'phone' ? 'profile.verifyPhoneTitle' : 'profile.verifyEmailTitle')}</h3>
            <p style={{ marginTop: 0, marginBottom: 12 }}>{t('profile.verifyEmailSentTo')}: <strong>{otpMaskedRecipient}</strong></p>
            <input className="ap-form__input" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder={t('profile.enterOtp')} />
            {otpError && <div style={{ color: 'red', marginTop: 8 }}>{otpError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button type="button" className="ap-btn ap-btn--outline" onClick={() => setOtpModalVisible(false)}>{t('common.cancel')}</button>
              <button type="button" className="ap-btn ap-btn--primary" onClick={handleVerifyOtp} disabled={isVerifyingOtp}>{isVerifyingOtp ? t('profile.verifying') : t('profile.verify')}</button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`ap-message ${messageType === 'success' ? 'ap-message--success' : 'ap-message--error'}`}>
          {message}
        </div>
      )}

      {/* Body */}
      <div className="ap-body">
        {/* Tab Nav */}
        <nav className="ap-tabs">
          {TABS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`ap-tabs__item ${activeTab === key ? 'ap-tabs__item--active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={18} />
              <span>{t(`profile.tab.${key}`)}</span>
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="ap-content">
          {activeTab === 'personal' && (
            editing ? (
              <section className="ap-section">
                <h2 className="ap-section__title">{t('profile.updateProfile')}</h2>
                <form className="ap-form" onSubmit={handleProfileSubmit}>
                  <div className="ap-form__grid">
                    <FormField label={t('profile.fullName')} icon={User}>
                      <input className="ap-form__input" value={profileForm.fullName}
                        onChange={(e) => setProfileForm(p => ({ ...p, fullName: e.target.value }))} />
                    </FormField>
                    <FormField label={t('profile.email')} icon={Mail}>
                      <input className="ap-form__input" type="email" value={profileForm.email}
                        onChange={(e) => setProfileForm(p => ({ ...p, email: e.target.value }))} />
                    </FormField>
                    <FormField label={t('profile.gender')} icon={Users}>
                      <select className="ap-form__input" value={profileForm.gender}
                        onChange={(e) => setProfileForm(p => ({ ...p, gender: e.target.value }))}>
                        <option value="male">{t('profile.genderMale')}</option>
                        <option value="female">{t('profile.genderFemale')}</option>
                        <option value="other">{t('profile.genderOther')}</option>
                        <option value="unknown">{t('profile.genderUnknown')}</option>
                      </select>
                    </FormField>
                    <FormField label={t('profile.phoneNumber')} icon={Phone} full>
                      <input className="ap-form__input" value={profileForm.phone}
                        onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                    </FormField>
                  </div>
                  <div className="ap-form__actions">
                    <button type="button" className="ap-btn ap-btn--outline" onClick={() => setEditing(false)}>
                      {t('common.cancel')}
                    </button>
                    <button type="submit" className="ap-btn ap-btn--primary" disabled={isSaving || spamBlocked}>
                      {isSaving ? t('profile.saving') : t('profile.saveProfile')}
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              <>
                <section className="ap-section">
                  <h2 className="ap-section__title">{t('profile.personalInfo')}</h2>
                  <div className="ap-info-grid">
                    <InfoField label={t('profile.fullName')} value={user.fullName} />
                    <InfoField label={t('profile.gender')} value={getGenderDisplay(user.gender, t)} />
                  </div>
                </section>

                {user.staffProfile && !['family'].includes(user.role) && (
                  <section className="ap-section">
                    <h2 className="ap-section__title">{t('profile.staffProfileTitle')}</h2>
                    <div className="ap-info-grid">
                      <InfoField label={t('profile.staffCode')} value={user.staffProfile.staffCode} />
                      <InfoField label={t('profile.specialty')} value={user.staffProfile.specialty || '—'} />
                      <InfoField label={t('profile.responsibleAreas')}
                        value={`${user.staffProfile.responsibleAreaIds?.length || 0} ${t('profile.areas')}`} />
                      <InfoField label={t('profile.assignedResidents')}
                        value={`${user.staffProfile.assignedResidentIds?.length || 0} ${t('profile.residents')}`} />
                    </div>
                  </section>
                )}
              </>
            )
          )}

          {activeTab === 'contact' && (
            <section className="ap-section">
              <h2 className="ap-section__title">{t('profile.contactInfo')}</h2>
              <div className="ap-info-grid">
                <InfoField label="Email" value={user.email} icon={Mail} />
                <InfoField label={t('profile.phoneNumber')} value={user.phone || '—'} icon={Phone} />
              </div>
            </section>
          )}

          {activeTab === 'security' && (
            <section className="ap-section">
              <h2 className="ap-section__title">{t('profile.changePassword')}</h2>
              <form className="ap-form" onSubmit={handlePasswordSubmit}>
                <div className="ap-form__grid">
                  <FormField label={t('profile.currentPassword')} icon={Lock} full>
                    <input className="ap-form__input" type="password" required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} />
                  </FormField>
                  <FormField label={t('profile.newPassword')} icon={KeyRound}>
                    <input className="ap-form__input" type="password" required
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} />
                  </FormField>
                  <FormField label={t('profile.confirmNewPassword')} icon={KeyRound}>
                    <input className="ap-form__input" type="password" required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                  </FormField>
                </div>
                <div className="ap-form__actions">
                  <button type="button" className="ap-btn ap-btn--outline" onClick={() => navigate('/forgot-password')}>
                    {t('profile.forgotPassword')}
                  </button>
                  <button type="submit" className="ap-btn ap-btn--primary" disabled={isSaving || spamBlocked}>
                    {isSaving ? t('profile.processing') : t('profile.changePasswordButton')}
                  </button>
                </div>
              </form>
              <div className="ap-section__divider" />
            </section>
          )}

          {activeTab === 'system' && (
            <section className="ap-section">
              <h2 className="ap-section__title">{t('profile.systemInformation')}</h2>
              <div className="ap-info-grid">
                <InfoField label={t('profile.userId')} value={user._id} icon={Hash} mono />
                <InfoField label={t('profile.roleCategory')} value={roleLabel} icon={Shield} />
                <InfoField label={t('profile.createdAt')} value={formatDate(user.createdAt)} icon={Calendar} />
                <InfoField label={t('profile.lastLogin')} value={formatDate(user.lastLoginAt)} icon={Clock} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, icon: Icon, mono }) {
  return (
    <div className="ap-info-field">
      <dt className="ap-info-field__label">{label}</dt>
      <dd className={`ap-info-field__value ${mono ? 'ap-info-field__value--mono' : ''}`}>
        {Icon && <Icon size={15} className="ap-info-field__icon" />}
        {value}
      </dd>
    </div>
  );
}

function FormField({ label, icon: Icon, children, full }) {
  return (
    <label className={`ap-form__field ${full ? 'ap-form__field--full' : ''}`}>
      <span className="ap-form__label">
        {Icon && <Icon size={14} />}
        {label}
      </span>
      {children}
    </label>
  );
}

export default ProfilePage;
