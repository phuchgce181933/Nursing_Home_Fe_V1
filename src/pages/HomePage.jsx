import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { getAuthToken } from '../utils/auth';
import servicePackageService from '../services/servicePackage.service';

const DEFAULT_PACKAGES = [
  {
    _id: 'default-basic',
    name: 'Gói Chăm sóc Cơ bản',
    tier: 'basic',
    monthlyPrice: 12000000,
    description: 'Hỗ trợ sinh hoạt hàng ngày, giám sát sức khỏe cơ bản và hướng dẫn dinh dưỡng chuyên nghiệp.',
    services: [
      'Hỗ trợ ăn uống, tắm rửa và giặt giũ hàng ngày',
      'Kiểm tra dấu hiệu sinh tồn (huyết áp, nhịp tim) hai lần mỗi ngày',
      'Khám định kỳ bởi bác sĩ gia đình mỗi hai tuần',
      'Hoạt động giải trí và sự kiện cộng đồng cơ bản'
    ]
  },
  {
    _id: 'default-standard',
    name: 'Gói Chăm sóc Tiêu chuẩn',
    tier: 'standard',
    monthlyPrice: 18000000,
    description: 'Hỗ trợ lâm sàng toàn diện kết hợp phục hồi chức năng và giám sát sức khỏe liên tục.',
    services: [
      'Bao gồm tất cả dịch vụ gói Cơ bản',
      'Vật lý trị liệu cá nhân 3 lần/tuần',
      'Khám chuyên khoa hàng tuần',
      'Giám sát sức khỏe 24/7 bằng thiết bị thông minh',
      'Kế hoạch dinh dưỡng chuyên biệt theo chuyên gia'
    ]
  },
  {
    _id: 'default-premium',
    name: 'Gói Chăm sóc Cao cấp',
    tier: 'premium',
    monthlyPrice: 28000000,
    description: 'Liệu pháp chuyên sâu cho cư dân hồi phục sau đột quỵ, chấn thương hoặc suy giảm nhận thức.',
    services: [
      'Bao gồm tất cả dịch vụ gói Tiêu chuẩn',
      'Vật lý trị liệu 1-1 hàng ngày và huấn luyện nhận thức',
      'Khám bác sĩ mỗi hai ngày và điều dưỡng trực 24/7',
      'Kế hoạch hỗ trợ nhận thức cho người bị sa sút trí tuệ',
      'Tham gia câu lạc bộ sở thích và hoạt động wellness'
    ]
  }
];

function HomePage() {
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
          console.error('Failed to load packages on home page:', err);
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

  // Redirect to the request form if logged in as a family member, otherwise redirect to login
  const bookPath = (token && user?.role === 'family')
    ? '/family/admission-requests/new'
    : '/login';

  const tourPath = (token && user?.role === 'family')
    ? '/family/facility-tours/new'
    : '/login';

  return (
    <div className="home-page">
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
          <Link to="#home">{t('home.home')}</Link>
          <Link to="#intro">{t('home.intro')}</Link>
          <Link to="/services">{t('home.services')}</Link>
          <Link to="#tech">{t('home.tech')}</Link>
          <Link to="#living">{t('home.living')}</Link>
          <Link to="#pricing">{t('home.pricing')}</Link>
          <Link to="#news">{t('home.news')}</Link>
          <Link to="#contact">{t('home.contact')}</Link>
        </nav>

        <Link to={bookPath} className="home-header__button">
          {t('home.registerAdmission')}
        </Link>
      </header>

      <main>
        <section className="home-hero" id="home">
          <div className="home-hero__content">
            <span className="home-subtitle">{t('home.tagline')}</span>
            <h1>{t('home.heroTitle')}</h1>
            <p>{t('home.heroDesc')}</p>
            <div className="home-hero__actions">
              <Link to={tourPath} className="button button--primary">{t('home.bookVisit')}</Link>
              <a href="#services" className="button button--outline">{t('home.consultServices')}</a>
            </div>
          </div>

          <div className="home-hero__visual">
            <div className="hero-image" />
            <div className="hero-badge hero-badge--light">
              <strong>{t('home.heroBadgeCount')}</strong>
              <span>{t('home.heroBadgeLabel')}</span>
            </div>
          </div>
        </section>

        <section className="home-features" id="services">
          <div className="feature-card">
            <strong>{t('home.featureTrustedStat')}</strong>
            <p>{t('home.featureTrusted')}</p>
          </div>
          <div className="feature-card">
            <strong>{t('home.featureCareStat')}</strong>
            <p>{t('home.featureCare')}</p>
          </div>
          <div className="feature-card">
            <strong>{t('home.featureAiStat')}</strong>
            <p>{t('home.featureAi')}</p>
          </div>
          <div className="feature-card">
            <strong>{t('home.featureJapanStat')}</strong>
            <p>{t('home.featureJapan')}</p>
          </div>
        </section>

        <section className="home-testimonials" id="living">
          <div className="section-head">
            <span>{t('home.testimonialTitle')}</span>
            <p>{t('home.testimonialDesc')}</p>
          </div>

          <div className="testimonial-grid">
            <article className="testimonial-card">
              <p>
                “Môi trường ở đây rất yên tĩnh và trong lành. Các điều dưỡng viên chăm sóc mẹ tôi vô cùng chu đáo,
                tôi hoàn toàn yên tâm khi đi công tác xa.”
              </p>
              <div className="testimonial-author">
                <span>NH</span>
                <div>
                  <strong>Nguyễn Hoàng</strong>
                  <small>Người nhà cư dân</small>
                </div>
              </div>
            </article>

            <article className="testimonial-card">
              <p>
                “Hệ thống AI theo dõi sức khỏe rất ấn tượng. Các bác sĩ được cảnh báo ngay lập tức nếu có bất thường.
                Cơ sở vật chất sạch sẽ, mang đậm phong cách tối giản dễ chịu.”
              </p>
              <div className="testimonial-author">
                <span>TM</span>
                <div>
                  <strong>Trần Minh</strong>
                  <small>Con trai cư dân</small>
                </div>
              </div>
            </article>

            <article className="testimonial-card">
              <p>
                “Tôi thấy khỏe hơn nhiều từ khi vào đây. Mọi người thân thiện, phòng ốc sáng sủa và các hoạt động tập thể giúp tôi không còn cảm thấy cô đơn.”
              </p>
              <div className="testimonial-author">
                <span>LH</span>
                <div>
                  <strong>Lê Hạnh</strong>
                  <small>Cư dân, 78 tuổi</small>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="home-pricing" id="pricing">
          <div className="section-head">
            <span>{t('home.pricingTitle')}</span>
            <h2>{t('home.pricingSectionTitle')}</h2>
            <p>{t('home.pricingDesc')}</p>
          </div>

          <div className="pricing-grid">
            {packages.slice(0, 3).map((pkg) => {
              const isStandard = pkg.tier === 'standard';
              const badgeClass = `pricing-card__badge ${pkg.tier}`;
              return (
                <div key={pkg._id} className={`pricing-card ${isStandard ? 'featured' : ''}`}>
                  <span className={badgeClass}>{t(`home.packageTier.${pkg.tier}`)}</span>
                  <h3 className="pricing-card__title">{pkg.name}</h3>
                  <div className="pricing-card__price-box">
                    <span className="pricing-card__price">{pkg.monthlyPrice?.toLocaleString() || 0}</span>
                    <span className="pricing-card__period">{t('home.pricePerMonth')}</span>
                  </div>
                  <p className="pricing-card__description">{pkg.description || t('home.packageFallbackDescription')}</p>
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
        </section>

        <footer className="home-footer">
          <div>
            <p className="footer-brand">{t('home.brand')}</p>
            <p>{t('home.footerDescription')}</p>
          </div>
          <div className="footer-links">
            <a href="#home">{t('home.footerHome')}</a>
            <a href="#contact">{t('home.footerPrivacy')}</a>
            <a href="#contact">{t('home.footerTerms')}</a>
          </div>
          <div>
            <p className="footer-caption">{t('home.footerCopyright')}</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default HomePage;
