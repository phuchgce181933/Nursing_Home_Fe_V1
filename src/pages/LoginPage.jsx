import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../hooks/useAuth';
import { getHomePath } from '../constants/routes';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');

  const handleLogin = async (credentials) => {
    setMessage('');
    try {
      const data = await login(credentials);
      setMessage('Đăng nhập thành công.');
      navigate(getHomePath(data.user.role));
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Đăng nhập thất bại.');
    }
  };

  const isSuccess = message.includes('thành công');

  return (
    <div className="app-shell login-page">
      <div className="login-card">
        <div className="login-page__eyebrow">ElderCare Portal</div>
        <header className="login-page__header">
          <h1 className="login-page__title">Đăng nhập an toàn</h1>
          <p className="login-page__subtitle">Sign in to access patient records securely.</p>
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

        <div className="login-page__footer-note">
          <span>HIPAA Compliant System.</span> Unauthorized access is strictly prohibited and monitored.
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
