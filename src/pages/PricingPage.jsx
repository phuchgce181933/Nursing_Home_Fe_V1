import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import { useAuth } from '../hooks/useAuth';
import { getAuthToken } from '../utils/auth';
import servicePackageService from '../services/servicePackage.service';
import '../styles/shared/PublicPages.css';

const getDefaultPackages = (t) => [
  {
    _id: 'p1', name: t('pricing.pkg.basic.name'), tier: 'basic', monthlyPrice: 12000000,
    description: t('pricing.pkg.basic.desc'),
    services: [t('pricing.pkg.basic.s1'), t('pricing.pkg.basic.s2'), t('pricing.pkg.basic.s3'), t('pricing.pkg.basic.s4'), t('pricing.pkg.basic.s5')],
  },
  {
    _id: 'p2', name: t('pricing.pkg.standard.name'), tier: 'standard', monthlyPrice: 18000000,
    description: t('pricing.pkg.standard.desc'),
    services: [t('pricing.pkg.standard.s1'), t('pricing.pkg.standard.s2'), t('pricing.pkg.standard.s3'), t('pricing.pkg.standard.s4'), t('pricing.pkg.standard.s5'), t('pricing.pkg.standard.s6')],
  },
  {
    _id: 'p3', name: t('pricing.pkg.premium.name'), tier: 'premium', monthlyPrice: 28000000,
    description: t('pricing.pkg.premium.desc'),
    services: [t('pricing.pkg.premium.s1'), t('pricing.pkg.premium.s2'), t('pricing.pkg.premium.s3'), t('pricing.pkg.premium.s4'), t('pricing.pkg.premium.s5'), t('pricing.pkg.premium.s6')],
  },
  {
    _id: 'p4', name: t('pricing.pkg.vip.name'), tier: 'vip', monthlyPrice: 45000000,
    description: t('pricing.pkg.vip.desc'),
    services: [t('pricing.pkg.vip.s1'), t('pricing.pkg.vip.s2'), t('pricing.pkg.vip.s3'), t('pricing.pkg.vip.s4'), t('pricing.pkg.vip.s5'), t('pricing.pkg.vip.s6')],
  },
];

const getFaqs = (t) => [
  { q: t('pricing.faq.q1'), a: t('pricing.faq.a1') },
  { q: t('pricing.faq.q2'), a: t('pricing.faq.a2') },
  { q: t('pricing.faq.q3'), a: t('pricing.faq.a3') },
  { q: t('pricing.faq.q4'), a: t('pricing.faq.a4') },
  { q: t('pricing.faq.q5'), a: t('pricing.faq.a5') },
];

export default function PricingPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const DEFAULT_PACKAGES = getDefaultPackages(t);
  const FAQS = getFaqs(t);
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);

  useEffect(() => {
    const load = async () => {
      if (!getAuthToken()) return;
      try {
        const res = await servicePackageService.getServicePackageList({ isActive: true }, 'medical');
        if (res?.data?.length > 0) setPackages(res.data);
      } catch (_) {}
    };
    load();
  }, [token]);

  const bookPath = (token && user?.role === 'family') ? '/family/admission-requests/new' : '/contact';

  return (
    <div className="home-page">
      <PublicHeader />
      <main>
        {/* ── HERO ── */}
        <div className="pub-hero pub-hero--light pub-hero--centered">
          <div className="pub-hero__inner">
            <span className="home-subtitle">{t('pricing.hero.badge')}</span>
            <h1>{t('pricing.hero.title')}</h1>
            <p>
              {t('pricing.hero.desc')}
            </p>
          </div>
        </div>

        {/* ── GÓI DỊCH VỤ ── */}
        <section className="pub-section pub-section--gray">
          <div className="pricing-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {packages.map((pkg) => {
              const isStandard = pkg.tier === 'standard';
              return (
                <div key={pkg._id} className={`pricing-card ${isStandard ? 'featured' : ''}`}>
                  <span className={`pricing-card__badge ${pkg.tier}`}>
                    {t(`pricing.tierLabel.${pkg.tier}`, { defaultValue: pkg.tier })}
                  </span>
                  <h3 className="pricing-card__title">{pkg.name}</h3>
                  <div className="pricing-card__price-box">
                    <span className="pricing-card__price">{pkg.monthlyPrice?.toLocaleString() || 0}</span>
                    <span className="pricing-card__period">{t('pricing.perMonth')}</span>
                  </div>
                  <p className="pricing-card__description">{pkg.description}</p>
                  <div className="pricing-card__divider" />
                  <span className="pricing-card__list-title">{t('pricing.servicesIncluded')}</span>
                  <div className="pricing-card__list">
                    {pkg.services?.map((srv, idx) => (
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
                    {t('pricing.register')}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="pub-section pub-section--white">
          <div className="pub-section__head">
            <span className="home-subtitle">{t('pricing.faqSection.badge')}</span>
            <h2>{t('pricing.faqSection.title')}</h2>
            <p>{t('pricing.faqSection.desc')}</p>
          </div>
          <div className="pricing-faq">
            {FAQS.map((f, i) => (
              <div key={i} className="pricing-faq__item">
                <h4>{f.q}</h4>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="pricing-cta">
          <h2>{t('pricing.cta.title')}</h2>
          <p>{t('pricing.cta.desc')}</p>
          <Link to="/contact" className="button button--primary">{t('pricing.cta.button')}</Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
