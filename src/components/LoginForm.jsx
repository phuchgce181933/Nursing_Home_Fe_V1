import { useState } from 'react';

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await onLogin({ email, password, remember });
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="login-form__field">
        <label className="login-form__label">Email Address</label>
        <div className="login-form__input-group">
          <span className="login-form__icon">✉️</span>
          <input
            type="email"
            className="login-form__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@eldercare.org"
          />
        </div>
      </div>

      <div className="login-form__field">
        <label className="login-form__label">Password</label>
        <div className="login-form__input-group">
          <span className="login-form__icon">🔒</span>
          <input
            type="password"
            className="login-form__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Nhập mật khẩu"
          />
        </div>
      </div>

      <div className="login-form__meta">
        <label className="login-form__checkbox">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Remember my device
        </label>
        <button type="button" className="login-form__forgot">
          Forgot password?
        </button>
      </div>

      <button type="submit" className="login-form__button" disabled={loading}>
        {loading ? 'Đang đăng nhập...' : 'Sign In Securely'}
      </button>
    </form>
  );
}

export default LoginForm;
