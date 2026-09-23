import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { getAuthToken } from '../utils/auth';
import servicePackageService from '../services/servicePackage.service';
import PublicHeader from '../components/homepage/PublicHeader';
import '../styles/shared/HomePage.css';

const getDefaultPackages = (t) => [
  {
    _id: 'default-basic',
    name: t('services.pkg.basic.name'),
    tier: 'basic',
    monthlyPrice: 12000000,
    description: t('services.pkg.basic.desc'),
    services: [t('services.pkg.basic.s1'), t('services.pkg.basic.s2'), t('services.pkg.basic.s3'), t('services.pkg.basic.s4')],
  },
  {
    _id: 'default-standard',
    name: t('services.pkg.standard.name'),
    tier: 'standard',
    monthlyPrice: 18000000,
    description: t('services.pkg.standard.desc'),
    services: [t('services.pkg.standard.s1'), t('services.pkg.standard.s2'), t('services.pkg.standard.s3'), t('services.pkg.standard.s4'), t('services.pkg.standard.s5')],
  },
  {
    _id: 'default-premium',
    name: t('services.pkg.premium.name'),
    tier: 'premium',
    monthlyPrice: 28000000,
    description: t('services.pkg.premium.desc'),
    services: [t('services.pkg.premium.s1'), t('services.pkg.premium.s2'), t('services.pkg.premium.s3'), t('services.pkg.premium.s4'), t('services.pkg.premium.s5')],
  },
];

export default function ServicesPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const DEFAULT_PACKAGES = getDefaultPackages(t);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPackages = async () => {
      const activeToken = getAuthToken();
      if (activeToken) {
        try {
          setLoading(true);
          const res = await servicePackageService.getServicePackageList({ isActive: true }, 'medical');
          if (res?.data && res.data.length > 0) {
            setPackages(res.data);
          } else {
            setPackages(DEFAULT_PACKAGES);
          }
        } catch (err) {
          console.error('Failed to load packages on services page:', err);
          setPackages(DEFAULT_PACKAGES);
        } finally {
          setLoading(false);
        }
      } else {
        setPackages(DEFAULT_PACKAGES);
      }
    };
    loadPackages();
  }, [token]);

  const bookPath = (token && user?.role === 'family')
    ? '/family/admission-requests/new'
    : '/contact';

  return (
    <div className="home-page">
      <PublicHeader />

      <main>
        {/* Hero section */}
        <section className="home-pricing" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', paddingBottom: '40px' }}>
          <div className="section-head" style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3.2rem)', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
              {t('services.title')}
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '800px', margin: '0 auto' }}>
              {t('services.subtitle')}
            </p>
          </div>
        </section>

        {/* All Service Packages Grid */}
        <section className="home-pricing" style={{ paddingTop: '0px', backgroundColor: '#ffffff' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="animate-spin text-blue-600 font-bold text-lg mb-2">{t('services.loading')}</div>
              <p>{t('services.loadingPackages')}</p>
            </div>
          ) : (
            <div className="pricing-grid">
              {packages.map((pkg) => {
                const isStandard = pkg.tier === 'standard';
                return (
                  <div key={pkg._id} className={`pricing-card ${isStandard ? 'featured' : ''}`}>
                    <span className={`pricing-card__badge ${pkg.tier}`}>
                      {t(`home.packageTier.${pkg.tier}`, pkg.tier?.toUpperCase())}
                    </span>
                    <h3 className="pricing-card__title">{pkg.name}</h3>
                    <div className="pricing-card__price-box">
                      <span className="pricing-card__price">{pkg.monthlyPrice?.toLocaleString() || 0}</span>
                      <span className="pricing-card__period">{t('home.pricePerMonth')}</span>
                    </div>
                    <p className="pricing-card__description">
                      {pkg.description || t('home.packageFallbackDescription')}
                    </p>
                    <div className="pricing-card__divider" />
                    <span className="pricing-card__list-title">{t('home.servicesIncluded')}</span>
                    <div className="pricing-card__list">
                      {pkg.services && pkg.services.map((srv, idx) => (
                        <div key={idx} className="pricing-card__item">
                          <Check size={14} />
                          <span>{srv}</span>
                        </div>
                      ))}
                    </div>
                    <Link
                      to={bookPath}
                      className={`pricing-card__button ${isStandard ? 'pricing-card__button--primary' : 'pricing-card__button--secondary'}`}
                    >
                      {t('home.registerAdmission')}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="home-footer">
          <div>
            <p className="footer-brand">{t('home.brand')}</p>
            <p>{t('home.footerDescription')}</p>
          </div>
          <div className="footer-links">
            <a href="/#home">{t('home.footerHome')}</a>
            <Link to="/services">{t('home.services')}</Link>
            <a href="/#contact">{t('home.footerPrivacy')}</a>
            <a href="/#contact">{t('home.footerTerms')}</a>
          </div>
          <div>
            <p className="footer-caption">{t('home.footerCopyright')}</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
