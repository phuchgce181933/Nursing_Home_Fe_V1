import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Leaf, HeartPulse, Users, Activity, Stethoscope, Plus } from 'lucide-react';
import LoginForm from '../components/LoginForm';
import '../styles/shared/LoginForm.css';
import { useAuth } from '../hooks/useAuth';
import { getHomePath } from '../constants/routes';
import { resolveApiError } from '../utils/apiMessage';

const LOGO_URL =
  'https://res.cloudinary.com/dhcrddnss/image/upload/c_crop,x_385,y_150,w_1250,h_1250,q_auto,f_auto/v1780035528/Logo_vi%E1%BB%87n_d%C6%B0%E1%BB%A1ng_l%C3%A3o_An_Nhi%C3%AAn_lrmocn.png';

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
      setMessage(resolveApiError(err, t, 'login.loginFailed'));
    }
  };

  const isSuccess = message === t('login.loginSuccess');

  const TRUST_ITEMS = [
    { Icon: ShieldCheck, title: t('login.trustSafeTitle'), desc: t('login.trustSafeDesc') },
    { Icon: HeartPulse, title: t('login.trustCareTitle'), desc: t('login.trustCareDesc') },
    { Icon: Users, title: t('login.trustProTitle'), desc: t('login.trustProDesc') },
  ];

  const DECOR_ICONS = [Leaf, HeartPulse, Activity, Stethoscope, Plus, Leaf, HeartPulse, Leaf, Activity, Plus];

  return (
    <div className="login-shell">
      <div className="login-shell__blobs" aria-hidden="true">
        <span className="login-shell__blob login-shell__blob--1" />
        <span className="login-shell__blob login-shell__blob--2" />
        <span className="login-shell__blob login-shell__blob--3" />
      </div>
      <div className="login-shell__leaves" aria-hidden="true">
        {DECOR_ICONS.map((Icon, i) => (
          <Icon key={i} className="login-shell__leaf" size={20 + (i % 3) * 8} />
        ))}
      </div>

      <div className="login-brand">
        <img src={LOGO_URL} alt={t('home.logoAlt')} className="login-brand__logo" />
        <span className="login-brand__name">{t('home.brand')}</span>
        <span className="login-brand__tagline">{t('login.tagline')}</span>
      </div>

      <div className="login-card">
        <div className="login-card__badge">
          <ShieldCheck size={30} />
        </div>
        <h1 className="login-card__title">{t('app.title')}</h1>
        <p className="login-card__subtitle">{t('app.subtitle')}</p>

        <div className="login-card__divider">
          <span className="login-card__divider-line" />
          <Leaf size={14} className="login-card__divider-icon" />
          <span className="login-card__divider-line" />
        </div>

        {message && (
          <div className={`message login-page__message ${isSuccess ? 'message--success' : 'message--error'}`}>
            {message}
          </div>
        )}

        <LoginForm onLogin={handleLogin} />

        <Link to="/forgot-password" className="login-card__forgot">
          {t('login.forgotPassword')}
        </Link>
      </div>

      <div className="login-trust">
        {TRUST_ITEMS.map(({ Icon, title, desc }) => (
          <div key={title} className="login-trust__item">
            <div className="login-trust__icon">
              <Icon size={20} />
            </div>
            <h3 className="login-trust__title">{title}</h3>
            <p className="login-trust__desc">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LoginPage;
