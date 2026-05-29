import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function LoginForm({ onLogin }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await onLogin({ email, password });
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="login-form__group">
        <label className="login-form__label">{t('login.email')}</label>
        <input
          type="email"
          className="login-form__input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder={t('login.placeholderEmail')}
        />
      </div>
      <div className="login-form__group">
        <label className="login-form__label">{t('login.password')}</label>
        <input
          type="password"
          className="login-form__input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder={t('login.placeholderPassword')}
        />
      </div>
      <button type="submit" className="login-form__button" disabled={loading}>
        {loading ? t('login.loggingIn') : t('login.login')}
      </button>
    </form>
  );
}

export default LoginForm;
