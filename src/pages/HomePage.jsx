import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function HomePage() {
  const { token, user } = useAuth();

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
          <Link to="#services">Services</Link>
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
