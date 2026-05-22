import { useState } from 'react';

function LoginForm({ onLogin }) {
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
        <label className="login-form__label">Email</label>
        <input
          type="email"
          className="login-form__input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Nhập email"
        />
      </div>
      <div className="login-form__group">
        <label className="login-form__label">Mật khẩu</label>
        <input
          type="password"
          className="login-form__input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Nhập mật khẩu"
        />
      </div>
      <button type="submit" className="login-form__button" disabled={loading}>
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  );
}

export default LoginForm;
