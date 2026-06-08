import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoginForm from '../components/LoginForm';
import '../styles/shared/LoginForm.css';
import { useAuth } from '../hooks/useAuth';
import { getHomePath } from '../constants/routes';

function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');

  const handleLogin = async (credentials) => {
    setMessage('');
    try {
      const data = await login(credentials);
      const role = data.role || data.user?.role;
      setMessage(t('login.loginSuccess'));
      navigate(getHomePath(role));
    } catch (err) {
      setMessage(err?.response?.data?.message || t('login.loginFailed'));
    }
  };

  const isSuccess = message === t('login.loginSuccess');

  return (
    <div className="app-shell">
      <div className="card login-card">
        <header className="login-page__header">
          <h1 className="login-page__title">{t('app.title')}</h1>
          <p className="login-page__subtitle">{t('app.subtitle')}</p>
        </header>
        {message && (
          <div
            className={`message login-page__message ${
              isSuccess ? 'message--success' : 'message--error'
            }`}
          >
            {message}
          </div>
        )}
        <LoginForm onLogin={handleLogin} />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/forgot-password" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
            {t('login.forgotPassword')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
