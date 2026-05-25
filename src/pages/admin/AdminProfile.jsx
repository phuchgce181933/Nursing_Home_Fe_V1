import { useEffect, useState } from 'react';
import { Mail, Phone, Shield, Activity, BadgeCheck, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    return <LoadingSpinner label="Loading profile..." />;
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
      await refreshUser();
      setMessageType('success');
      setMessage('Profile updated successfully.');
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Unable to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessageType('error');
      setMessage('Password confirmation does not match.');
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
      setMessage('Password changed successfully.');
      setPasswordForm(initialPasswordForm);
    } catch (error) {
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Unable to change password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <h1 className="profile-page__title">Admin Profile</h1>
        <p className="profile-page__subtitle">Account and staff information</p>
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
              {user.isActive ? 'Account is active' : 'Account is inactive'}
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
                <span>Gender: {user.gender || '—'}</span>
              </li>
            </ul>
          </section>

          <section className="profile-card">
            <h2 className="profile-card__heading">Staff Profile</h2>

            {user.staffProfile ? (
              <dl className="profile-details">
                <div>
                  <dt>Staff Code</dt>
                  <dd>{user.staffProfile.staffCode}</dd>
                </div>

                <div>
                  <dt>Role Category</dt>
                  <dd>{user.staffProfile.roleCategory}</dd>
                </div>

                <div>
                  <dt>Specialty</dt>
                  <dd>{user.staffProfile.specialty || '—'}</dd>
                </div>

                <div>
                  <dt>Responsible Areas</dt>
                  <dd>{user.staffProfile.responsibleAreaIds?.length || 0} areas</dd>
                </div>

                <div>
                  <dt>Assigned Residents</dt>
                  <dd>{user.staffProfile.assignedResidentIds?.length || 0} residents</dd>
                </div>
              </dl>
            ) : (
              <p className="profile-card__empty">No staff profile available.</p>
            )}
          </section>
        </div>

        <div className="admin-profile__column">
          <section className="profile-card">
            <h2 className="profile-card__heading">
              <Activity size={18} />
              System Information
            </h2>

            <dl className="profile-details">
              <div>
                <dt>User ID</dt>
                <dd>{user._id}</dd>
              </div>

              <div>
                <dt>Created At</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>

              <div>
                <dt>Last Login</dt>
                <dd>{formatDate(user.lastLoginAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="profile-card">
            <h2 className="profile-card__heading">Update Profile</h2>

            <form className="profile-form" onSubmit={handleProfileSubmit}>
              <div className="profile-form__grid">
                <label className="profile-form__field">
                  <span className="profile-form__label">Full Name</span>

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
                  <span className="profile-form__label">Phone Number</span>

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
                  <span className="profile-form__label">Gender</span>

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
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </label>

                <label className="profile-form__field">
                  <span className="profile-form__label">Date of Birth</span>

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
                  <span className="profile-form__label">Address</span>

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
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </section>

          <section className="profile-card">
            <h2 className="profile-card__heading">Change Password</h2>

            <form className="profile-form" onSubmit={handlePasswordSubmit}>
              <div className="profile-form__grid">
                <label
                  className="profile-form__field"
                  style={{ gridColumn: '1 / -1' }}
                >
                  <span className="profile-form__label">Current Password</span>

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
                  <span className="profile-form__label">New Password</span>

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
                  <span className="profile-form__label">Confirm New Password</span>

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
                  {isSaving ? 'Processing...' : 'Change Password'}
                </button>

                <button
                  type="button"
                  className="button button--danger"
                  onClick={handleLogout}
                >
                  Logout
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