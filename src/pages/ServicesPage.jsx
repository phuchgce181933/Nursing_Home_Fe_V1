import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getAuthToken } from '../utils/auth';
import servicePackageService from '../services/servicePackage.service';
import '../styles/shared/HomePage.css'; // Uses same premium shared homepage styling

const DEFAULT_PACKAGES = [
  {
    _id: 'default-basic',
    name: 'Basic Care Package',
    tier: 'basic',
    monthlyPrice: 12000000,
    description: 'Daily living assistance, standard health monitoring, and professional nutrition guidelines.',
    services: [
      'Daily assistance with dining, bathing, and laundry',
      'Vital signs check (blood pressure, heart rate) twice daily',
      'Regular check-ups by family doctor once every two weeks',
      'Basic daily recreational activities and community events'
    ]
  },
  {
    _id: 'default-standard',
    name: 'Standard Care Package',
    tier: 'standard',
    monthlyPrice: 18000000,
    description: 'Comprehensive clinical support combined with active rehabilitation and continuous health telemetry.',
    services: [
      'All features included in the Basic Care package',
      'Personalized physiotherapy and rehab 3 times a week',
      'Weekly clinical check-ups by specialist doctors',
      '24/7 continuous health tracking via smart medical devices',
      'Specialized dietary plans customized by clinical nutritionists'
    ]
  },
  {
    _id: 'default-premium',
    name: 'Premium Care Package',
    tier: 'premium',
    monthlyPrice: 28000000,
    description: 'Specialized therapies for residents recovering from stroke, injuries, or living with cognitive decline.',
    services: [
      'All features included in the Standard Care package',
      'Daily 1-on-1 intensive physical therapy and cognitive training',
      'Doctor check-ups every two days and 24/7 on-duty nurses',
      'Tailored cognitive support plans for dementia and Alzheimer care',
      'Exclusive access to creative hobby clubs and wellness activities'
    ]
  }
];

export default function ServicesPage() {
  const { token, user } = useAuth();
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
    : '/login';

  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <div className="home-header__brand">
          <Link to="/" className="home-logo" style={{ textDecoration: 'none' }}>An Nhiên Care Home</Link>
        </div>

        <nav className="home-nav">
          <Link to="/">Home</Link>
          <Link to="/services" className="text-blue-600 font-bold">Services</Link>
          <Link to="/#tech">Tech</Link>
          <Link to="/#living">Living Space</Link>
          <Link to="/#pricing">Pricing</Link>
          <Link to="/#contact">Contact</Link>
        </nav>

        <Link to={bookPath} className="home-header__button">
          Book a Visit
        </Link>
      </header>

      <main>
        {/* Services Hero */}
        <section className="home-pricing" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', paddingBottom: '40px' }}>
          <div className="section-head" style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3.2rem)', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
              Our Care Service Packages
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '800px', margin: '0 auto' }}>
              Explore our complete portfolio of advanced residential medical care, physical rehabilitation, and professional nursing services tailored for seniors.
            </p>
          </div>
        </section>

        {/* All Service Packages Grid */}
        <section className="home-pricing" style={{ paddingTop: '0px', backgroundColor: '#ffffff' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="animate-spin text-blue-600 font-bold text-lg mb-2">Loading...</div>
              <p>Loading care service packages...</p>
            </div>
          ) : (
            <div className="pricing-grid">
              {packages.map((pkg) => {
                const isStandard = pkg.tier === 'standard';
                const badgeClass = `pricing-card__badge ${pkg.tier}`;
                return (
                  <div key={pkg._id} className={`pricing-card ${isStandard ? 'featured' : ''}`}>
                    <span className={badgeClass}>{pkg.tier}</span>
                    <h3 className="pricing-card__title">{pkg.name}</h3>
                    <div className="pricing-card__price-box">
                      <span className="pricing-card__price">{pkg.monthlyPrice?.toLocaleString() || 0}</span>
                      <span className="pricing-card__period">VND / month</span>
                    </div>
                    <p className="pricing-card__description">{pkg.description || 'Comprehensive clinical care, health monitoring, and daily residential support.'}</p>
                    <div className="pricing-card__divider" />
                    <span className="pricing-card__list-title">Services Included:</span>
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
                      Register for Admission
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
            <p className="footer-brand">An Nhiên Care Home</p>
            <p>Providing professional, dedicated senior care services in accordance with international standards.</p>
          </div>
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/services">Services</Link>
            <a href="/#contact">Privacy Policy</a>
            <a href="/#contact">Terms of Service</a>
          </div>
          <div>
            <p className="footer-caption">© 2026 An Nhiên Care Home. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
