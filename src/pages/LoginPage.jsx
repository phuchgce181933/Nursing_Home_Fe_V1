import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import useAuth from '../hooks/useAuth';
import '../styles/shared/LoginForm.css';

const getRedirectPath = (role) => {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'doctor':
      return '/doctor/dashboard';
    case 'nurse':
      return '/nurse/dashboard';
    case 'family':
      return '/family/dashboard';
    default:
      return '/profile';
  }
};

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');

  const handleLogin = async (credentials) => {
    setMessage('');
    try {
      const data = await login(credentials);
      setMessage('Đăng nhập thành công.');
      navigate(getRedirectPath(data.user.role));
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Đăng nhập thất bại.');
    }
  };

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
              message.includes('thành công') ? 'message--success' : 'message--error'
            }`}
          >
            {message}
          </div>
        )}
        <LoginForm onLogin={handleLogin} />
      </div>
    </div>
  );
}

export default LoginPage;
