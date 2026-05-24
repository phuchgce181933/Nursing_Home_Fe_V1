import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getAuthToken } from '../utils/auth';
import servicePackageService from '../services/servicePackage.service';

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

function HomePage() {
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
          <span className="home-logo">An Nhiên Care Home</span>
        </div>

        <nav className="home-nav">
          <Link to="#home">Home</Link>
          <Link to="#intro">Intro</Link>
          <Link to="/services">Services</Link>
          <Link to="#tech">Tech</Link>
          <Link to="#living">Living Space</Link>
          <Link to="#pricing">Pricing</Link>
          <Link to="#news">News</Link>
          <Link to="#contact">Contact</Link>
        </nav>

        <Link to={bookPath} className="home-header__button">
          Book a Visit
        </Link>
      </header>

      <main>
        <section className="home-hero" id="home">
          <div className="home-hero__content">
            <span className="home-subtitle">An Nhiên Care Home</span>
            <h1>Nơi tuổi già được chăm sóc bằng yêu thương và công nghệ</h1>
            <p>
              Trải nghiệm tiêu chuẩn chăm sóc Nhật Bản kết hợp công nghệ theo dõi sức khỏe AI tiên tiến nhất,
              mang lại sự an tâm tuyệt đối cho gia đình.
            </p>
            <div className="home-hero__actions">
              <Link to={tourPath} className="button button--primary">Đăng ký tham quan</Link>
              <a href="#services" className="button button--outline">Tư vấn dịch vụ</a>
            </div>
          </div>

          <div className="home-hero__visual">
            <div className="hero-image" />
            <div className="hero-badge hero-badge--light">
              <strong>500+</strong>
              <span>Cư dân tin tưởng</span>
            </div>
          </div>
        </section>

        <section className="home-features" id="services">
          <div className="feature-card">
            <strong>500+</strong>
            <p>Cư dân tin tưởng</p>
          </div>
          <div className="feature-card">
            <strong>24/7</strong>
            <p>Chăm sóc y tế</p>
          </div>
          <div className="feature-card">
            <strong>AI</strong>
            <p>Theo dõi sức khỏe</p>
          </div>
          <div className="feature-card">
            <strong>Nhật Bản</strong>
            <p>Tiêu chuẩn dịch vụ</p>
          </div>
        </section>

        <section className="home-testimonials" id="living">
          <div className="section-head">
            <span>Niềm tin từ các gia đình</span>
            <p>Lắng nghe những chia sẻ từ cư dân và người thân về trải nghiệm sống tại An Nhiên Care Home.</p>
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
            <span>Care Plans & Pricing</span>
            <h2>Our Care Service Packages</h2>
            <p>
              An Nhiên Care Home provides a wide range of specialized care packages tailored to the unique physical conditions and medical needs of senior residents.
            </p>
          </div>

          <div className="pricing-grid">
            {packages.slice(0, 3).map((pkg) => {
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
        </section>

        <footer className="home-footer">
          <div>
            <p className="footer-brand">An Nhiên Care Home</p>
            <p>Cung cấp dịch vụ chăm sóc người cao tuổi chuyên nghiệp, tận tâm theo tiêu chuẩn quốc tế.</p>
          </div>
          <div className="footer-links">
            <a href="#home">Home</a>
            <a href="#contact">Privacy Policy</a>
            <a href="#contact">Terms of Service</a>
          </div>
          <div>
            <p className="footer-caption">© 2026 An Nhiên Care Home. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default HomePage;
