import { useEffect, useState } from 'react';
import {
  Mail,
  Phone,
  BadgeCheck,
  UserCircle,
  Pencil,
  BriefcaseBusiness,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

import LoadingSpinner from '../../components/ui/LoadingSpinner';

import '../../styles/admin/ProfilePage.css';

function formatDate(value) {
  if (!value) return '—';

  return new Date(value).toLocaleString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const genderMap = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

function AdminProfile() {
  const { user, loading, logout, updateProfile } =
    useAuth();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState('personal');

  const [editMode, setEditMode] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] =
    useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        phone: user.phone || '',
        gender: user.gender || '',
      });
    }
  }, [user]);

  if (loading) {
    return (
      <LoadingSpinner label="Loading profile..." />
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setMessage('');

    try {
      await updateProfile(formData);

      setMessage(
        'Profile updated successfully.'
      );

      setEditMode(false);
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
          'Failed to update profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <div>
          <h1 className="profile-page__title">
            My Profile
          </h1>

          <p className="profile-page__subtitle">
            Manage your account information
          </p>
        </div>
      </header>

      {message && (
        <div className="profile-page__message">
          {message}
        </div>
      )}

      <div className="profile-hero">
        <div className="profile-hero__left">
          <div className="profile-hero__avatar">
            <UserCircle size={70} />
          </div>

          <div>
            <div className="profile-hero__top">
              <h2>{user.fullName}</h2>

              <span className="profile-badge">
                {user.role}
              </span>

              <span
                className={`profile-status ${
                  user.isActive
                    ? 'is-active'
                    : 'is-inactive'
                }`}
              >
                <BadgeCheck size={14} />

                {user.isActive
                  ? 'Active'
                  : 'Inactive'}
              </span>
            </div>

            <div className="profile-hero__meta">
              <Mail size={16} />

              <span>{user.email}</span>
            </div>

            <p className="profile-hero__login">
              Last login:{' '}
              {formatDate(user.lastLoginAt)}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="button button--secondary"
          onClick={() =>
            setEditMode((prev) => !prev)
          }
        >
          <Pencil size={16} />

          {editMode
            ? 'Cancel'
            : 'Edit Profile'}
        </button>
      </div>

      <div className="profile-layout">
        <aside className="profile-sidebar">
          <button
            type="button"
            className={`profile-sidebar__item ${
              activeTab === 'personal'
                ? 'is-active'
                : ''
            }`}
            onClick={() =>
              setActiveTab('personal')
            }
          >
            <UserCircle size={18} />
            Personal Info
          </button>

          <button
            type="button"
            className={`profile-sidebar__item ${
              activeTab === 'work'
                ? 'is-active'
                : ''
            }`}
            onClick={() =>
              setActiveTab('work')
            }
          >
            <BriefcaseBusiness size={18} />
            Work Information
          </button>

          <button
            type="button"
            className={`profile-sidebar__item ${
              activeTab === 'security'
                ? 'is-active'
                : ''
            }`}
            onClick={() =>
              setActiveTab('security')
            }
          >
            <ShieldCheck size={18} />
            Security
          </button>
        </aside>

        <div className="profile-content">
          {activeTab === 'personal' && (
            <section className="profile-card">
              <div className="profile-card__header">
                <div>
                  <h3>Personal Information</h3>

                  <p>
                    Manage your personal identity
                    and contact details.
                  </p>
                </div>
              </div>

              {editMode ? (
                <form
                  className="profile-form"
                  onSubmit={handleSubmit}
                >
                  <div className="profile-grid">
                    <div className="profile-form__field">
                      <label>Full Name</label>

                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="profile-form__input"
                      />
                    </div>

                    <div className="profile-form__field">
                      <label>Phone Number</label>

                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="profile-form__input"
                      />
                    </div>

                    <div className="profile-form__field">
                      <label>Gender</label>

                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="profile-form__input"
                      >
                        <option value="">
                          Select gender
                        </option>

                        <option value="male">
                          Male
                        </option>

                        <option value="female">
                          Female
                        </option>

                        <option value="other">
                          Other
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="profile-form__actions">
                    <button
                      type="submit"
                      className="button button--primary"
                      disabled={saving}
                    >
                      {saving
                        ? 'Saving...'
                        : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-grid">
                  <div>
                    <span className="profile-label">
                      Full Name
                    </span>

                    <p className="profile-value">
                      {user.fullName || '—'}
                    </p>
                  </div>

                  <div className="profile-grid__wide">
                    <span className="profile-label">
                      Email Address
                    </span>

                    <p className="profile-value">
                      {user.email || '—'}
                    </p>
                  </div>

                  <div>
                    <span className="profile-label">
                      Phone Number
                    </span>

                    <p className="profile-value">
                      {user.phone || '—'}
                    </p>
                  </div>

                  <div>
                    <span className="profile-label">
                      Gender
                    </span>

                    <p className="profile-value">
                      {genderMap[user.gender] ||
                        '—'}
                    </p>
                  </div>

                  <div>
                    <span className="profile-label">
                      Account Created
                    </span>

                    <p className="profile-value">
                      {formatDate(
                        user.createdAt
                      )}
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'work' && (
            <section className="profile-card">
              <div className="profile-card__header">
                <div>
                  <h3>Work Information</h3>

                  <p>
                    Staff and organization related
                    information.
                  </p>
                </div>
              </div>

              {user.staffProfile ? (
                <div className="profile-grid">
                  <div>
                    <span className="profile-label">
                      Staff Code
                    </span>

                    <p className="profile-value">
                      {
                        user.staffProfile
                          .staffCode
                      }
                    </p>
                  </div>

                  <div>
                    <span className="profile-label">
                      Role Category
                    </span>

                    <p className="profile-value">
                      {
                        user.staffProfile
                          .roleCategory
                      }
                    </p>
                  </div>

                  <div>
                    <span className="profile-label">
                      Specialty
                    </span>

                    <p className="profile-value">
                      {user.staffProfile
                        .specialty || '—'}
                    </p>
                  </div>

                  <div>
                    <span className="profile-label">
                      Responsible Areas
                    </span>

                    <p className="profile-value">
                      {user.staffProfile
                        .responsibleAreaIds
                        ?.length || 0}
                    </p>
                  </div>

                  <div>
                    <span className="profile-label">
                      Assigned Residents
                    </span>

                    <p className="profile-value">
                      {user.staffProfile
                        .assignedResidentIds
                        ?.length || 0}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="profile-empty">
                  No staff profile found.
                </p>
              )}
            </section>
          )}

          {activeTab === 'security' && (
            <section className="profile-security">
              <div>
                <h3>Change Password</h3>

                <p>
                  Keep your account secure by
                  regularly updating your password.
                </p>
              </div>

              <button
                type="button"
                className="button button--light"
                onClick={() =>
                  navigate(
                    '/admin/change-password'
                  )
                }
              >
                Update Password
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminProfile;