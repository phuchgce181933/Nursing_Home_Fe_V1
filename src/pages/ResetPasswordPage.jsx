import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import authService from '../services/auth.service';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => Boolean(token) && newPassword.length >= 6 && newPassword === confirmPassword, [confirmPassword, newPassword, token]);

  useEffect(() => {
    if (!token) {
      setMessage('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      setIsSuccess(false);
    }
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      setMessage('Vui lòng nhập mật khẩu hợp lệ và khớp nhau.');
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await authService.resetPassword({ token, newPassword });
      setIsSuccess(true);
      setMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại ngay bây giờ.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setIsSuccess(false);
      setMessage(error?.response?.data?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="card login-card">
        <header className="login-page__header">
          <h1 className="login-page__title">Đặt lại mật khẩu</h1>
          <p className="login-page__subtitle">
            Tạo mật khẩu mới cho tài khoản của bạn.
          </p>
        </header>

        {message && (
          <div className={`message login-page__message ${isSuccess ? 'message--success' : 'message--error'}`}>
            {message}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form__group">
            <label className="login-form__label">Mật khẩu mới</label>
            <input
              type="password"
              className="login-form__input"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Nhập mật khẩu mới"
              required
            />
          </div>

          <div className="login-form__group">
            <label className="login-form__label">Xác nhận mật khẩu</label>
            <input
              type="password"
              className="login-form__input"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
            />
          </div>

          <button type="submit" className="login-form__button" disabled={loading || !canSubmit}>
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/login" className="button button--secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Về trang đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
