import { useEffect, useState } from 'react';
import { Mail, Phone, Shield, Activity, BadgeCheck, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import authService from '../../services/auth.service';
import { useAuth } from '../../hooks/useAuth';

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
  return new Date(value).toLocaleString('en-US');
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
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1300);
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
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1300);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || t('profile.passwordChangeError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <h1 className="profile-page__title">{t('profile.title')}</h1>
        <p className="profile-page__subtitle">{t('profile.subtitle')}</p>
      </header>

      {message && (
        <div className={`message ${messageType === 'success' ? 'message--success' : 'message--error'}`}>
          {message}
        </div>
      )}

      <div className="admin-profile__layout">
        <div className="admin-profile__column">
          <section className="profile-card profile-card--accent">
            <UserCircle size={72} className="profile-card__avatar" />
            <h2 className="profile-card__name">{user.fullName}</h2>
            <span className="profile-card__role">{user.role?.toUpperCase()}</span>

            <p className={`profile-card__status ${user.isActive ? 'is-active' : 'is-inactive'}`}>
              <BadgeCheck size={16} />
              {user.isActive ? t('profile.accountActive') : t('profile.accountInactive')}
            </p>

            <ul className="profile-card__list">
              <li>
                <Mail size={16} />
                <span>{user.email}</span>
              </li>

              <li>
                <Phone size={16} />
                <span>{user.phone || '—'}</span>
              </li>

              <li>
                <Shield size={16} />
                <span>{t('profile.genderLabel')} {user.gender || '—'}</span>
              </li>
            </ul>
          </section>

          <section className="profile-card">
            <h2 className="profile-card__heading">{t('profile.staffProfileTitle')}</h2>

            {user.staffProfile ? (
              <dl className="profile-details">
                <div>
                  <dt>{t('profile.staffCode')}</dt>
                  <dd>{user.staffProfile.staffCode}</dd>
                </div>

                <div>

                  <dt>Vai trò hệ thống</dt>
                  <dd>{user.role}</dd>

                </div>

                <div>
                  <dt>{t('profile.specialty')}</dt>
                  <dd>{user.staffProfile.specialty || '—'}</dd>
                </div>

                <div>
                  <dt>{t('profile.responsibleAreas')}</dt>
                  <dd>{user.staffProfile.responsibleAreaIds?.length || 0} {t('profile.areas')}</dd>
                </div>

                <div>
                  <dt>{t('profile.assignedResidents')}</dt>
                  <dd>{user.staffProfile.assignedResidentIds?.length || 0} {t('profile.residents')}</dd>
                </div>
              </dl>
            ) : (
              <p className="profile-card__empty">{t('profile.staffProfileEmpty')}</p>
            )}
          </section>
        </div>

        <div className="admin-profile__column">
          <section className="profile-card">
            <h2 className="profile-card__heading">
              <Activity size={18} />
              {t('profile.systemInformation')}
            </h2>

            <dl className="profile-details">
              <div>
                <dt>{t('profile.userId')}</dt>
                <dd>{user._id}</dd>
              </div>

              <div>
                <dt>{t('profile.createdAt')}</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>

              <div>
                <dt>{t('profile.lastLogin')}</dt>
                <dd>{formatDate(user.lastLoginAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="profile-card">
            <h2 className="profile-card__heading">{t('profile.updateProfile')}</h2>

            <form className="profile-form" onSubmit={handleProfileSubmit}>
              <div className="profile-form__grid">
                <label className="profile-form__field">
                  <span className="profile-form__label">{t('profile.fullName')}</span>

                  <input
                    className="profile-form__input"
                    value={profileForm.fullName}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">{t('profile.phoneNumber')}</span>

                  <input
                    className="profile-form__input"
                    value={profileForm.phone}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">{t('profile.gender')}</span>

                  <select
                    className="profile-form__input"
                    value={profileForm.gender}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        gender: event.target.value,
                      }))
                    }
                  >
                    <option value="male">{t('profile.genderMale')}</option>
                    <option value="female">{t('profile.genderFemale')}</option>
                    <option value="other">{t('profile.genderOther')}</option>
                    <option value="unknown">{t('profile.genderUnknown')}</option>
                  </select>
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">{t('profile.dateOfBirth')}</span>

                  <input
                    className="profile-form__input"
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        dateOfBirth: event.target.value,
                      }))
                    }
                  />
                </label>

                <label
                  className="profile-form__field"
                  style={{ gridColumn: '1 / -1' }}
                >
                  <span className="profile-form__label">{t('profile.address')}</span>

                  <input
                    className="profile-form__input"
                    value={profileForm.address}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="profile-page__actions">
                <button
                  type="submit"
                  className="button button--primary"
                  disabled={isSaving}
                >
                  {isSaving ? t('profile.saving') : t('profile.saveProfile')}
                </button>
              </div>
            </form>
          </section>

          <section className="profile-card">
            <h2 className="profile-card__heading">{t('profile.changePassword')}</h2>

            <form className="profile-form" onSubmit={handlePasswordSubmit}>
              <div className="profile-form__grid">
                <label
                  className="profile-form__field"
                  style={{ gridColumn: '1 / -1' }}
                >
                  <span className="profile-form__label">{t('profile.currentPassword')}</span>

                  <input
                    className="profile-form__input"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        currentPassword: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">{t('profile.newPassword')}</span>

                  <input
                    className="profile-form__input"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">{t('profile.confirmNewPassword')}</span>

                  <input
                    className="profile-form__input"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>

              <div className="profile-page__actions">
                <button
                  type="submit"
                  className="button button--primary"
                  disabled={isSaving}
                >
                  {isSaving ? t('profile.processing') : t('profile.changePasswordButton')}
                </button>

                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => navigate('/forgot-password')}
                >
                  {t('profile.forgotPassword')}
                </button>

                <button
                  type="button"
                  className="button button--danger"
                  onClick={handleLogout}
                >
                  {t('profile.logout')}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AdminProfile;