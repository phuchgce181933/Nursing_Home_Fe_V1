import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, Mail, Leaf, HeartPulse, Activity, Stethoscope, Plus, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import authService from '../services/auth.service';
import '../styles/shared/ForgotPasswordPage.css';

const LOGO_URL =
  'https://res.cloudinary.com/dhcrddnss/image/upload/c_crop,x_385,y_150,w_1250,h_1250,q_auto,f_auto/v1780035528/Logo_vi%E1%BB%87n_d%C6%B0%E1%BB%A1ng_l%C3%A3o_An_Nhi%C3%AAn_lrmocn.png';

const DECOR_ICONS = [Leaf, HeartPulse, Activity, Stethoscope, Plus, Leaf, HeartPulse, Leaf, Activity, Plus];

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [sentEmail, setSentEmail] = useState('');

  const validateEmail = useCallback((value) => {
    if (!value) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? '' : t('forgotPassword.invalidEmail');
  }, [t]);

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError) {
      setEmailError(validateEmail(value));
    }
  };

  const handleEmailBlur = () => {
    if (email) {
      setEmailError(validateEmail(email));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      return;
    }

    setLoading(true);
    setMessage('');
    setEmailError('');

    try {
      await authService.forgotPassword(email);
      setIsSuccess(true);
      setSentEmail(email);
      setMessage(t('forgotPassword.success'));
    } catch (error) {
      setIsSuccess(false);
      setMessage(error?.response?.data?.message || t('forgotPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setMessage('');

    try {
      await authService.forgotPassword(sentEmail);
      setMessage(t('forgotPassword.success'));
    } catch (error) {
      setMessage(error?.response?.data?.message || t('forgotPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell forgot-shell">
      <div className="login-shell__blobs" aria-hidden="true">
        <span className="login-shell__blob login-shell__blob--1" />
        <span className="login-shell__blob login-shell__blob--2" />
        <span className="login-shell__blob login-shell__blob--3" />
      </div>
      <div className="login-shell__leaves" aria-hidden="true">
        {DECOR_ICONS.map((Icon, i) => (
          <Icon key={i} className="login-shell__leaf" size={20 + (i % 3) * 8} />
        ))}
      </div>

      <div className="login-brand">
        <img src={LOGO_URL} alt="An Nhien Logo" className="login-brand__logo" />
        <span className="login-brand__name">{t('home.brand')}</span>
        <span className="login-brand__tagline">{t('login.tagline')}</span>
      </div>

      <div className="login-card forgot-card">
        {isSuccess ? (
          <div className="forgot-success" role="status">
            <div className="forgot-success__icon-wrap">
              <CheckCircle2 size={36} />
            </div>
            <h1 className="forgot-success__title">{t('forgotPassword.successTitle')}</h1>
            <p className="forgot-success__message">
              {t('forgotPassword.successMessage')}
            </p>
            <p className="forgot-success__email">{sentEmail}</p>
            <p className="forgot-success__hint">{t('forgotPassword.successHint')}</p>

            <div className="forgot-success__actions">
              <button
                type="button"
                className="login-form__button forgot-resend-btn"
                onClick={handleResend}
                disabled={loading}
              >
                {loading ? t('forgotPassword.sending') : t('forgotPassword.resend')}
              </button>
              <Link to="/login" className="forgot-back-link">
                <ArrowLeft size={16} />
                {t('forgotPassword.back')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="forgot-header">
              <div className="login-card__badge">
                <KeyRound size={30} />
              </div>
              <h1 className="login-card__title">{t('forgotPassword.title')}</h1>
              <p className="login-card__subtitle">{t('forgotPassword.subtitle')}</p>
            </div>

            <div className="login-card__divider">
              <span className="login-card__divider-line" />
              <Leaf size={14} className="login-card__divider-icon" />
              <span className="login-card__divider-line" />
            </div>

            <p className="forgot-description">{t('forgotPassword.description')}</p>

            {message && !isSuccess && (
              <div className="message login-page__message message--error" role="alert">
                <AlertCircle size={16} className="forgot-error-icon" />
                {message}
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="login-form__group">
                <label className="login-form__label" htmlFor="forgot-email">
                  {t('forgotPassword.emailLabel')}
                </label>
                <div className={`login-form__field ${emailError ? 'login-form__field--error' : ''}`}>
                  <Mail size={18} className="login-form__field-icon" />
                  <input
                    id="forgot-email"
                    type="email"
                    className="login-form__input"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    required
                    autoComplete="email"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'forgot-email-error' : undefined}
                  />
                </div>
                {emailError && (
                  <span id="forgot-email-error" className="forgot-field-error" role="alert">
                    {emailError}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="login-form__button"
                disabled={loading || !email}
              >
                {loading ? (
                  <span className="forgot-btn-loading">
                    <span className="forgot-spinner" aria-hidden="true" />
                    {t('forgotPassword.sending')}
                  </span>
                ) : (
                  t('forgotPassword.submit')
                )}
              </button>
            </form>

            <Link to="/login" className="forgot-back-link">
              <ArrowLeft size={16} />
              {t('forgotPassword.back')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
