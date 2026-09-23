import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import authService from '../services/auth.service';

function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token') || '';
  // Mã đặt lại mật khẩu: ưu tiên giá trị từ URL (?token=...), người dùng có thể chỉnh sửa.
  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Re-sync token state nếu URL query thay đổi (ví dụ: người dùng paste URL mới vào cùng tab).
  useEffect(() => {
    if (urlToken) setToken(urlToken);
  }, [urlToken]);

  const canSubmit = useMemo(
    () =>
      Boolean(token.trim()) &&
      newPassword.length >= 6 &&
      newPassword === confirmPassword,
    [confirmPassword, newPassword, token],
  );

  useEffect(() => {
    if (!token.trim() && !urlToken) {
      setMessage(t('resetPassword.invalidLink'));
      setIsSuccess(false);
    }
  }, [token, urlToken, t]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token.trim()) {
      setMessage(t('resetPassword.tokenRequired'));
      setIsSuccess(false);
      return;
    }
    if (!canSubmit) {
      setMessage(t('resetPassword.passwordMismatch'));
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await authService.resetPassword({ token: token.trim(), newPassword });
      setIsSuccess(true);
      setMessage(t('resetPassword.success'));
      setNewPassword('');
      setConfirmPassword('');
      // Giữ nguyên token trong state để tránh submit lại với submit vô tình; UI đã chuyển sang success.
    } catch (error) {
      setIsSuccess(false);
      setMessage(
        error?.response?.data?.message || t('resetPassword.error'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="card login-card">
        <header className="login-page__header">
          <h1 className="login-page__title">{t('resetPassword.title')}</h1>
          <p className="login-page__subtitle">
            {t('resetPassword.subtitle')}
          </p>
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

        {!isSuccess && (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form__group">
              <label className="login-form__label" htmlFor="reset-token">
                {t('resetPassword.tokenLabel')}
              </label>
              <input
                id="reset-token"
                type="text"
                className="login-form__input"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={t('resetPassword.tokenPlaceholder')}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="login-form__group login-form__group--password">
              <label className="login-form__label">{t('resetPassword.newPassword')}</label>
              <div className="login-form__password-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="login-form__input login-form__input--password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder={t('resetPassword.newPasswordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  className="login-form__password-toggle"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={
                    showNewPassword
                      ? t('resetPassword.hidePassword')
                      : t('resetPassword.showPassword')
                  }
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-form__group login-form__group--password">
              <label className="login-form__label">{t('resetPassword.confirmPassword')}</label>
              <div className="login-form__password-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="login-form__input login-form__input--password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  className="login-form__password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? t('resetPassword.hidePassword')
                      : t('resetPassword.showPassword')
                  }
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-form__button"
              disabled={loading || !canSubmit}
            >
              {loading
                ? t('resetPassword.processing')
                : t('resetPassword.submit')}
            </button>
          </form>
        )}

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link
            to="/login"
            className="button button--secondary"
            style={{ display: 'inline-block', textDecoration: 'none' }}
          >
            {t('resetPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
