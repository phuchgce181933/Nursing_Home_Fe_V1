import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import '../styles/shared/LoginForm.css';
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
      const role = data.role || data.user?.role;
      setMessage('Đăng nhập thành công.');
      navigate(getHomePath(role));
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Đăng nhập thất bại.');
    }
  };

  const isSuccess = message.includes('thành công');

  return (
    <div className="app-shell">
      <div className="card login-card">
        <header className="login-page__header">
          <h1 className="login-page__title">Nursing Home</h1>
          <p className="login-page__subtitle">Hệ thống quản lý viện dưỡng lão</p>
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
            Quên mật khẩu?
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
