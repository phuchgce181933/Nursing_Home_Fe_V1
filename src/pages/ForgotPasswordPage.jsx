import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authService from '../services/auth.service';

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await authService.forgotPassword(email);
      setIsSuccess(true);
      setMessage(t('forgotPassword.success'));
    } catch (error) {
      setIsSuccess(false);
      setMessage(error?.response?.data?.message || t('forgotPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="card login-card">
        <header className="login-page__header">
          <h1 className="login-page__title">{t('forgotPassword.title')}</h1>
          <p className="login-page__subtitle">{t('forgotPassword.subtitle')}</p>
        </header>

        {message && (
          <div className={`message login-page__message ${isSuccess ? 'message--success' : 'message--error'}`}>
            {message}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form__group">
            <label className="login-form__label">{t('login.email')}</label>
            <input
              type="email"
              className="login-form__input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('login.placeholderEmail')}
              required
            />
          </div>

          <button type="submit" className="login-form__button" disabled={loading}>
            {loading ? t('forgotPassword.sending') : t('forgotPassword.submit')}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/login" className="button button--secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            {t('forgotPassword.back')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
