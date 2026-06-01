import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { getAuthToken } from '../utils/auth';
import servicePackageService from '../services/servicePackage.service';
import '../styles/shared/HomePage.css';

const DEFAULT_PACKAGES = [
  {
    _id: 'default-basic',
    name: 'Gói Chăm Sóc Cơ Bản',
    tier: 'basic',
    monthlyPrice: 12000000,
    description: 'Hỗ trợ sinh hoạt hàng ngày, theo dõi sức khỏe tiêu chuẩn và hướng dẫn dinh dưỡng chuyên nghiệp.',
    services: [
      'Hỗ trợ ăn uống, tắm rửa và giặt ủi hàng ngày',
      'Kiểm tra dấu hiệu sinh tồn (huyết áp, nhịp tim) hai lần mỗi ngày',
      'Kiểm tra sức khỏe định kỳ bởi bác sĩ gia đình mỗi hai tuần',
      'Hoạt động giải trí và gắn kết cộng đồng hàng ngày',
    ],
  },
  {
    _id: 'default-standard',
    name: 'Gói Chăm Sóc Tiêu Chuẩn',
    tier: 'standard',
    monthlyPrice: 18000000,
    description: 'Hỗ trợ lâm sàng toàn diện kết hợp với vật lý trị liệu chủ động và theo dõi sức khỏe liên tục.',
    services: [
      'Bao gồm tất cả tính năng của gói Cơ bản',
      'Vật lý trị liệu và phục hồi chức năng cá nhân hóa 3 lần/tuần',
      'Kiểm tra lâm sàng hàng tuần bởi bác sĩ chuyên khoa',
      'Theo dõi sức khỏe 24/7 qua thiết bị y tế thông minh',
      'Thực đơn dinh dưỡng được thiết kế bởi chuyên gia lâm sàng',
    ],
  },
  {
    _id: 'default-premium',
    name: 'Gói Chăm Sóc Cao Cấp',
    tier: 'premium',
    monthlyPrice: 28000000,
    description: 'Trị liệu chuyên sâu cho người cao tuổi phục hồi sau đột quỵ, chấn thương hoặc suy giảm nhận thức.',
    services: [
      'Bao gồm tất cả tính năng của gói Tiêu chuẩn',
      'Vật lý trị liệu 1 kèm 1 hàng ngày và tập luyện nhận thức chuyên sâu',
      'Bác sĩ thăm khám 2 ngày/lần và điều dưỡng trực 24/7',
      'Kế hoạch hỗ trợ nhận thức cho chứng sa sút trí tuệ và Alzheimer',
      'Tham gia các CLB sáng tạo và hoạt động wellness độc quyền',
    ],
  },
];

export default function ServicesPage() {
  const { t } = useTranslation();
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
      {/* Header — dùng chung với HomePage */}
      <header className="home-header">
        <div className="home-header__brand">
          <img
            src="https://res.cloudinary.com/dhcrddnss/image/upload/v1780035528/Logo_vi%E1%BB%87n_d%C6%B0%E1%BB%A1ng_l%C3%A3o_An_Nhi%C3%AAn_lrmocn.png"
            alt={t('home.logoAlt')}
            className="home-logo__img"
          />
          <span className="home-logo">{t('home.brand')}</span>
        </div>

        <nav className="home-nav">
          <Link to="/#home">{t('home.home')}</Link>
          <Link to="/#intro">{t('home.intro')}</Link>
          <Link to="/services" className="text-blue-600 font-bold">{t('home.services')}</Link>
          <Link to="/#tech">{t('home.tech')}</Link>
          <Link to="/#living">{t('home.living')}</Link>
          <Link to="/#pricing">{t('home.pricing')}</Link>
          <Link to="/#news">{t('home.news')}</Link>
          <Link to="/#contact">{t('home.contact')}</Link>
        </nav>

        <Link to={bookPath} className="home-header__button">
          {t('home.registerAdmission')}
        </Link>
      </header>

      <main>
        {/* Hero section */}
        <section className="home-pricing" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', paddingBottom: '40px' }}>
          <div className="section-head" style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3.2rem)', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
              Các Gói Dịch Vụ Chăm Sóc
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '800px', margin: '0 auto' }}>
              Khám phá toàn bộ danh mục dịch vụ chăm sóc y tế nội trú cao cấp, phục hồi chức năng và điều dưỡng chuyên nghiệp dành cho người cao tuổi.
            </p>
          </div>
        </section>

        {/* All Service Packages Grid */}
        <section className="home-pricing" style={{ paddingTop: '0px', backgroundColor: '#ffffff' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="animate-spin text-blue-600 font-bold text-lg mb-2">Đang tải...</div>
              <p>Đang tải danh sách gói dịch vụ chăm sóc...</p>
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
                      <span className="pricing-card__period">{t('home.pricePerMonth', 'VNĐ / tháng')}</span>
                    </div>
                    <p className="pricing-card__description">
                      {pkg.description || t('home.packageFallbackDescription', 'Chăm sóc lâm sàng toàn diện, giám sát sức khỏe và hỗ trợ sinh hoạt hàng ngày.')}
                    </p>
                    <div className="pricing-card__divider" />
                    <span className="pricing-card__list-title">{t('home.servicesIncluded', 'Dịch vụ bao gồm:')}</span>
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
                      {t('home.registerAdmission', 'Đăng ký nhập viện')}
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
