import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import '../styles/shared/ZenPages.css';

const GALLERY = [
  {
    id: 'room',
    cls: 'lp2-gcard--large',
    badge: 'Nghỉ Ngơi',
    badgeCls: '',
    title: 'Phòng Nghỉ Cao Cấp',
    desc: 'Không gian riêng tư tinh tế với hệ thống ánh sáng sinh học và nội thất an toàn, mang lại giấc ngủ sâu và sự an tâm tuyệt đối.',
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzCtuanLhV4l2urS1GEqJwCRt7MYrvaT27kyTo8dn0-MbtKr1SvMEJ5nBBudek85CcKwrPk1JqsGQsM-QJCeu4f5ijKs3uQLur4Wh1AOzWM3AHI81mw5be2tmqvw-gIBC62YwLb9odzEUSa13x3HUXzwbup2BA6REfFtSZVg9KIWNDudjG5wGmPFydOb1CgLPeKfKrJj_AX3xyUyqIZea54KaNvsWHlY_7-OYM6IhIgRTgCODbDUpfdeKkqmELIgVYdG5NDeML5_sQ',
  },
  {
    id: 'zen',
    cls: 'lp2-gcard--small',
    badge: null,
    title: 'Khu Vườn Thiền',
    desc: 'Giao hòa cùng thiên nhiên.',
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUP8TCjEW76VN2Cw3UDFsTXVN1QkV8o2deVz3I-2pCe0H0KMQlmjENcGhqfi57-GcSIukr-VfDi3FCr7pwCj1vEZu5DA_ourytIgWIEb-HDS9mg9zpaAQZTTUaYd_pyThE7Su8ephnXeJSKv-RTC0mem57vlX9-mXMzv2srB8AZArTaEkqqLTcGXhdsVZ5WugzBU5q6yv1DzODsf91PkNe688B8dZkg3BZEaqqpzcbUkhBqZbMbC-G7Z_ioRNi1ty2pFRJWZALTGLS',
  },
  {
    id: 'dining',
    cls: 'lp2-gcard--small',
    badge: null,
    title: 'Nhà Ăn Dinh Dưỡng',
    desc: 'Không gian ấm cúng, tinh tươm.',
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLdjjsCq9Vo5Le2pkue0k0IUL1CinHBZdmKDLKgJ8uJfC6wxHeM98LyYLA-WA1QkD_-zavfguGZWQ--KuG6CS5VBjfUEhEj2xmHqDlrD9tvzchvxE-Gm3GDxZqN0pXB_0VMULIrOmZRMZJQ5_y6Z-5n8HOvIfNqNeiB6YKjZdVvOPAzMT8UoBFrpn36CchyA_wI9UTXUENjuJeKOzUG1LBtgxx4tm4tS3WNGlbrq5UkssEB0xn1j6H-5L4KqxktkLWFVVfl1uICPtR',
  },
  {
    id: 'rehab',
    cls: 'lp2-gcard--wide',
    badge: 'Y Tế',
    badgeCls: 'lp2-gcard__badge--teal',
    title: 'Khu Phục Hồi Chức Năng',
    desc: 'Trang thiết bị hiện đại hòa quyện trong không gian nhẹ nhàng, giảm thiểu cảm giác y tế căng thẳng.',
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkE0q8-28-Fe9gd-SSn-_14gsh9ChocZcl-pz6YOyQSzYRxS_EKQ1yoOn0NO2vq1e8mZuqzHz-4oKr-qj0g5luYrHBF1QbhAqBG3Mj4h2_kSCGQqb7L3EEZU5RICEj0xR5VMYzLqdxR02F_whoIDvhRbI40xCsOkPLYFkX6l56arJJmo0XnANUCa0Qo9DMM8XxfbfVA7wZrx3XXB1yPt080tFVL8NvXK_U1SCg4ZxBKzIXhghtfHFm0-W3fvaEOIkoFIqCi4dHjTdg',
  },
  {
    id: 'community',
    cls: 'lp2-gcard--small',
    badge: null,
    title: 'Sinh Hoạt Cộng Đồng',
    desc: 'Nơi kết nối và sẻ chia.',
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2Hz3jcW_wAbRATndekkptT7gGrzd0Ff_r2CDhh7inXavnVhbc6U2PdXeoIaaj1_d0fOD1zPc2I_ns0EOqfbRkPLWl_fKAlJUujkcXJ-9FFA1VuD_LFgKNwqAmXuE7HHQv5h8Vp_CVlfyo648jnTSQRexTM7TlCGYp4e7NuJsh2i9aK6vIMmwAz-JXONWo6xOgapHjv1E-URCbjV2Lbb9itYM9nDw9vq8K-gcRfBQzQxCrEqS-p2nD6rqM-oIhminpo7nwbvJvXpBV',
  },
];

export default function LivingPage() {
  const { token, user } = useAuth();
  const tourPath = (token && user?.role === 'family') ? '/family/facility-tours/new' : '/login';

  return (
    <div className="zh-page home-page">
      <PublicHeader />

      <main className="lp2-main">

        {/* ── PAGE HEADER ── */}
        <header className="lp2-header">
          <h1>Trải Nghiệm Không Gian Sống Chuẩn Nhật</h1>
          <p>
            Tại An Nhiên Care Home, mỗi mét vuông đều được thiết kế với triết lý tối giản,
            tận dụng ánh sáng tự nhiên và khoảng không gian "Ma" để mang lại sự bình yên,
            thư thái tuyệt đối cho người cao tuổi.
          </p>
        </header>

        {/* ── BENTO GALLERY ── */}
        <section className="lp2-gallery">
          {GALLERY.map((item) => (
            <div key={item.id} className={`lp2-gcard ${item.cls}`}>
              <div
                className="lp2-gcard__bg"
                style={{ backgroundImage: `url('${item.bg}')` }}
              />
              <div className="lp2-gcard__overlay" />
              <div className="lp2-gcard__content">
                {item.badge && (
                  <span className={`lp2-gcard__badge ${item.badgeCls || ''}`}>
                    {item.badge}
                  </span>
                )}
                {item.cls === 'lp2-gcard--large' ? (
                  <>
                    <h2>{item.title}</h2>
                    <p>{item.desc}</p>
                  </>
                ) : item.cls === 'lp2-gcard--wide' ? (
                  <>
                    <h2 style={{ fontSize: 24 }}>{item.title}</h2>
                    <p>{item.desc}</p>
                  </>
                ) : (
                  <>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* ── CTA ── */}
        <div className="lp2-cta">
          <h2>Khám Phá Trực Tiếp Không Gian</h2>
          <p>
            Chúng tôi mời bạn đến tham quan và tự mình cảm nhận sự bình yên, tinh tế
            trong từng chi tiết thiết kế tại An Nhiên.
          </p>
          <Link to={tourPath} className="lp2-cta__btn">Đặt Lịch Tham Quan</Link>
        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
