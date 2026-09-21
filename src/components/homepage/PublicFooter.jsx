import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function PublicFooter() {
  const { t } = useTranslation();
  return (
    <footer className="home-footer">
      <div>
        <p className="footer-brand">{t('home.brand')}</p>
        <p>{t('home.footerDescription')}</p>
      </div>
      <div className="footer-links">
        <Link to="/">{t('home.footerHome')}</Link>
        <Link to="/intro">{t('home.footerIntro')}</Link>
        <Link to="/services">{t('home.footerServices')}</Link>
        <Link to="/contact">{t('home.footerContact')}</Link>
      </div>
      <div>
        <p className="footer-caption">{t('home.footerCopyright')}</p>
      </div>
    </footer>
  );
}
