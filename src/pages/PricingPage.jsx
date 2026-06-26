import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import { useAuth } from '../hooks/useAuth';
import { getAuthToken } from '../utils/auth';
import servicePackageService from '../services/servicePackage.service';
import '../styles/shared/PublicPages.css';

const DEFAULT_PACKAGES = [
  {
    _id: 'p1', name: 'Gói Chăm sóc Cơ bản', tier: 'basic', monthlyPrice: 12000000,
    description: 'Hỗ trợ sinh hoạt hàng ngày, giám sát sức khỏe cơ bản và hướng dẫn dinh dưỡng chuyên nghiệp.',
    services: ['Hỗ trợ ăn uống, tắm rửa, giặt giũ hàng ngày', 'Đo sinh hiệu 2 lần/ngày', 'Khám bác sĩ định kỳ 2 tuần/lần', 'Hoạt động cộng đồng hàng ngày', 'WiFi & tiện ích chung'],
  },
  {
    _id: 'p2', name: 'Gói Chăm sóc Tiêu chuẩn', tier: 'standard', monthlyPrice: 18000000,
    description: 'Hỗ trợ lâm sàng toàn diện kết hợp phục hồi chức năng và giám sát sức khỏe liên tục.',
    services: ['Toàn bộ dịch vụ gói Cơ bản', 'Vật lý trị liệu 3 lần/tuần', 'Khám chuyên khoa hàng tuần', 'Giám sát AI 24/7', 'Thực đơn dinh dưỡng cá nhân hoá', 'App gia đình theo dõi'],
  },
  {
    _id: 'p3', name: 'Gói Chăm sóc Cao cấp', tier: 'premium', monthlyPrice: 28000000,
    description: 'Liệu pháp chuyên sâu cho cư dân hồi phục sau đột quỵ, chấn thương hoặc suy giảm nhận thức.',
    services: ['Toàn bộ dịch vụ gói Tiêu chuẩn', 'Vật lý trị liệu 1-1 hàng ngày', 'Khám bác sĩ 2 ngày/lần', 'Điều dưỡng trực 24/7', 'Hỗ trợ nhận thức chuyên biệt', 'CLB sở thích & wellness độc quyền'],
  },
  {
    _id: 'p4', name: 'Gói VIP Toàn diện', tier: 'vip', monthlyPrice: 45000000,
    description: 'Dịch vụ chăm sóc đẳng cấp hotel 5 sao kết hợp y tế chuyên sâu — dành cho cư dân cao cấp nhất.',
    services: ['Toàn bộ dịch vụ gói Cao cấp', 'Suite phòng VIP riêng biệt', 'Điều dưỡng cá nhân riêng 24/7', 'Bác sĩ thăm khám hàng ngày', 'Xe đưa đón riêng', 'Dịch vụ concierge cá nhân'],
  },
];

const FAQS = [
  {
    q: 'Chi phí hàng tháng bao gồm những gì?',
    a: 'Chi phí bao gồm: chỗ ở, dinh dưỡng 3 bữa/ngày, dịch vụ chăm sóc cá nhân, các buổi thể dục/vật lý trị liệu theo gói, và sử dụng toàn bộ tiện ích chung. Thuốc điều trị và xét nghiệm bổ sung tính riêng.',
  },
  {
    q: 'Có thể thay đổi gói chăm sóc sau khi nhập viện không?',
    a: 'Có. Gia đình có thể nâng hoặc hạ gói bất kỳ lúc nào với thông báo trước 7 ngày. Đội ngũ y tế sẽ đánh giá lại và điều chỉnh kế hoạch chăm sóc phù hợp.',
  },
  {
    q: 'Gia đình có thể thăm viếng tự do không?',
    a: 'Gia đình được thăm viếng từ 7:00 đến 20:00 tất cả các ngày kể cả lễ, Tết. Không giới hạn số lượt thăm. Các gói Premium và VIP có khu vực tiếp khách riêng tư.',
  },
  {
    q: 'Cách thanh toán và có hỗ trợ trả góp không?',
    a: 'Thanh toán hàng tháng qua chuyển khoản, thẻ ngân hàng hoặc ví điện tử. Chúng tôi hỗ trợ đóng theo quý/năm với ưu đãi 5–10%. Trả góp qua ngân hàng đối tác có thể hỗ trợ theo từng trường hợp.',
  },
  {
    q: 'Nếu cư dân cần xuất viện sớm thì sao?',
    a: 'Hoàn trả phần phí chưa sử dụng trong vòng 7 ngày làm việc sau khi xuất viện, trừ phí xử lý hành chính theo quy định. Đội ngũ sẽ hỗ trợ bàn giao hồ sơ và tư vấn chuyển tiếp chăm sóc.',
  },
];

export default function PricingPage() {
  const { token, user } = useAuth();
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

  const bookPath = (token && user?.role === 'family') ? '/family/admission-requests/new' : '/login';

  return (
    <div className="home-page">
      <PublicHeader />
      <main>
        {/* ── HERO ── */}
        <div className="pub-hero pub-hero--light pub-hero--centered">
          <div className="pub-hero__inner">
            <span className="home-subtitle">Bảng giá</span>
            <h1>Gói chăm sóc phù hợp với mọi nhu cầu</h1>
            <p>
              Bốn gói dịch vụ được thiết kế linh hoạt từ chăm sóc cơ bản đến đặc quyền VIP,
              đảm bảo mọi gia đình đều tìm được lựa chọn phù hợp nhất.
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
                    {{ basic: 'Cơ Bản', standard: 'Tiêu Chuẩn', premium: 'Cao Cấp', vip: 'VIP' }[pkg.tier] || pkg.tier}
                  </span>
                  <h3 className="pricing-card__title">{pkg.name}</h3>
                  <div className="pricing-card__price-box">
                    <span className="pricing-card__price">{pkg.monthlyPrice?.toLocaleString() || 0}</span>
                    <span className="pricing-card__period">VNĐ / tháng</span>
                  </div>
                  <p className="pricing-card__description">{pkg.description}</p>
                  <div className="pricing-card__divider" />
                  <span className="pricing-card__list-title">Dịch vụ bao gồm:</span>
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
                    Đăng ký gói này
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="pub-section pub-section--white">
          <div className="pub-section__head">
            <span className="home-subtitle">Câu hỏi thường gặp</span>
            <h2>Giải đáp thắc mắc về chi phí</h2>
            <p>Những câu hỏi phổ biến nhất từ gia đình khi tìm hiểu về gói dịch vụ tại An Nhiên.</p>
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
          <h2>Chưa chắc gói nào phù hợp?</h2>
          <p>Đội ngũ tư vấn sẽ đánh giá miễn phí và đề xuất gói chăm sóc tốt nhất cho người thân của bạn.</p>
          <Link to="/contact" className="button button--primary">Tư vấn miễn phí ngay</Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
