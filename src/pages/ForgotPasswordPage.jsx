import { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/auth.service';

function ForgotPasswordPage() {
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
      setMessage('Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.');
    } catch (error) {
      setIsSuccess(false);
      setMessage(error?.response?.data?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="card login-card">
        <header className="login-page__header">
          <h1 className="login-page__title">Quên mật khẩu</h1>
          <p className="login-page__subtitle">
            Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.
          </p>
        </header>

        {message && (
          <div className={`message login-page__message ${isSuccess ? 'message--success' : 'message--error'}`}>
            {message}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form__group">
            <label className="login-form__label">Email</label>
            <input
              type="email"
              className="login-form__input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Nhập email"
              required
            />
          </div>

          <button type="submit" className="login-form__button" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/login" className="button button--secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
