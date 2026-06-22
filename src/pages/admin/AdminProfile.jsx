import { useEffect, useState } from 'react';
import {
  Mail, Phone, Shield, BadgeCheck, UserCircle, Pencil,
  User, Contact, Lock, Clock, MapPin, Calendar, Briefcase,
  Hash, Users, MapPinned, LogOut, KeyRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import authService from '../../services/auth.service';
import { useAuth } from '../../hooks/useAuth';

const TABS = [
  { key: 'personal', icon: User },
  { key: 'contact', icon: Contact },
  { key: 'security', icon: Lock },
  { key: 'system', icon: Clock },
];

const initialProfileForm = {
  fullName: '',
  phone: '',
  gender: 'unknown',
  address: '',
  dateOfBirth: '',
};

const initialPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function AdminProfile() {
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

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || '',
        phone: user.phone || '',
        gender: user.gender || 'unknown',
        address: user.address || '',
        dateOfBirth: toDateInput(user.dateOfBirth),
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

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      await authService.updateProfile(profileForm);
      setMessageType('success');
      setMessage(t('profile.updateSuccess'));
      setEditing(false);
      setTimeout(() => { logout(); navigate('/login'); }, 1300);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('profile.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
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
      setTimeout(() => { logout(); navigate('/login'); }, 1300);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('profile.passwordChangeError'));
    } finally {
      setIsSaving(false);
    }
  };

  const roleLabel = user.role?.toUpperCase();
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
          <button
            type="button"
            className="ap-hero__edit-btn"
            onClick={() => { setEditing(!editing); setActiveTab('personal'); }}
          >
            <Pencil size={14} />
            {editing ? t('common.cancel') : t('profile.editProfile')}
          </button>
        </div>
      </div>

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
                    <FormField label={t('profile.gender')} icon={Users}>
                      <select className="ap-form__input" value={profileForm.gender}
                        onChange={(e) => setProfileForm(p => ({ ...p, gender: e.target.value }))}>
                        <option value="male">{t('profile.genderMale')}</option>
                        <option value="female">{t('profile.genderFemale')}</option>
                        <option value="other">{t('profile.genderOther')}</option>
                        <option value="unknown">{t('profile.genderUnknown')}</option>
                      </select>
                    </FormField>
                    <FormField label={t('profile.dateOfBirth')} icon={Calendar}>
                      <input className="ap-form__input" type="date" value={profileForm.dateOfBirth}
                        onChange={(e) => setProfileForm(p => ({ ...p, dateOfBirth: e.target.value }))} />
                    </FormField>
                    <FormField label={t('profile.phoneNumber')} icon={Phone}>
                      <input className="ap-form__input" value={profileForm.phone}
                        onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                    </FormField>
                    <FormField label={t('profile.address')} icon={MapPin} full>
                      <input className="ap-form__input" value={profileForm.address}
                        onChange={(e) => setProfileForm(p => ({ ...p, address: e.target.value }))} />
                    </FormField>
                  </div>
                  <div className="ap-form__actions">
                    <button type="button" className="ap-btn ap-btn--outline" onClick={() => setEditing(false)}>
                      {t('common.cancel')}
                    </button>
                    <button type="submit" className="ap-btn ap-btn--primary" disabled={isSaving}>
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
                    <InfoField label={t('profile.gender')} value={user.gender || '—'} />
                    <InfoField label={t('profile.dateOfBirth')} value={formatDate(user.dateOfBirth)} />
                    <InfoField label={t('profile.address')} value={user.address || '—'} />
                  </div>
                </section>

                {user.staffProfile && (
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
                <InfoField label={t('profile.address')} value={user.address || '—'} icon={MapPin} />
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
                  <button type="submit" className="ap-btn ap-btn--primary" disabled={isSaving}>
                    {isSaving ? t('profile.processing') : t('profile.changePasswordButton')}
                  </button>
                </div>
              </form>
              <div className="ap-section__divider" />
              <button type="button" className="ap-btn ap-btn--danger" onClick={handleLogout}>
                <LogOut size={16} />
                {t('profile.logout')}
              </button>
            </section>
          )}

          {activeTab === 'system' && (
            <section className="ap-section">
              <h2 className="ap-section__title">{t('profile.systemInformation')}</h2>
              <div className="ap-info-grid">
                <InfoField label={t('profile.userId')} value={user._id} icon={Hash} mono />
                <InfoField label={t('profile.roleCategory')} value={user.role} icon={Shield} />
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

export default AdminProfile;
