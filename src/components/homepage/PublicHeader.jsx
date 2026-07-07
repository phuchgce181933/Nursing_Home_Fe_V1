import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Info, HeartPulse, Cpu, Trees, CreditCard, Newspaper, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/',        label: 'home.home',     icon: <Home size={15} />,        path: '/' },
  { to: '/intro',   label: 'home.intro',    icon: <Info size={15} />,        path: '/intro' },
  { to: '/services',label: 'home.services', icon: <HeartPulse size={15} />,  path: '/services' },
  { to: '/tech',    label: 'home.tech',     icon: <Cpu size={15} />,         path: '/tech' },
  { to: '/living',  label: 'home.living',   icon: <Trees size={15} />,       path: '/living' },
  { to: '/pricing', label: 'home.pricing',  icon: <CreditCard size={15} />,  path: '/pricing' },
  { to: '/news',    label: 'home.news',     icon: <Newspaper size={15} />,   path: '/news' },
  { to: '/contact', label: 'home.contact',  icon: <Phone size={15} />,       path: '/contact' },
];

export default function PublicHeader() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const location = useLocation();

  const bookPath = (token && user?.role === 'family')
    ? '/family/admission-requests/new'
    : '/login';

  const getActiveClass = (item) =>
    location.pathname === item.path ? 'active' : '';

  return (
    <header className="home-header">
      <div className="home-header__brand">
        <img
          src="https://res.cloudinary.com/dhcrddnss/image/upload/c_crop,x_385,y_150,w_1250,h_1250,q_auto,f_auto/v1780035528/Logo_vi%E1%BB%87n_d%C6%B0%E1%BB%A1ng_l%C3%A3o_An_Nhi%C3%AAn_lrmocn.png"
          alt={t('home.logoAlt')}
          className="home-logo__img"
        />
        <span className="home-logo">{t('home.brand')}</span>
      </div>

      <nav className="home-nav">
        {NAV_ITEMS.map((item) => (
          <motion.div
            key={item.to}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Link to={item.to} className={getActiveClass(item)}>
              {item.icon}
              {t(item.label)}
            </Link>
          </motion.div>
        ))}
      </nav>

      <Link to={bookPath} className="home-header__button">
        {t('home.registerAdmission')}
      </Link>
    </header>
  );
}
