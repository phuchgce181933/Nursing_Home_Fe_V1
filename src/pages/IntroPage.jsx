import React from 'react';
import { Eye, Heart, Users } from 'lucide-react';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import { useAuth } from '../hooks/useAuth';
import '../styles/shared/IntroPage.css';

/* ── Data ── */
const TEAM = [
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCF1JOrg8-59_lGiPvMpLmtKFApE-GXCWD5sTRmyHB7r26T9lgJYAEWEBYMvIq0yxR3c--X0ohez7c8HHBRZ58CZiUTTHTPZQih68VGVrdp6OLFXyvy69-u8HoXKHcKregs4SShqsUKP3o8Snaii6XUBCA60_kwQen_pmUCMqLSzFmKgSYf-l3VNFlk9rMJB-8rnZ9zAUt5s-0MIZDuK40SD9_FTtN3QhxJm1M4CKLko52BTRnrlXkedRbgMPOyXNu9KrIKAsoE4XrS',
    name: 'BS. CKII Nguyễn Văn A',
    role: 'Giám đốc Y khoa',
    desc: 'Hơn 20 năm kinh nghiệm trong lĩnh vực Lão khoa tại các bệnh viện tuyến đầu.',
  },
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuDvxsYgpaUD21Vy7bcbbBm5R-m-qC2gub_Vgk8CVgPAqTVOSr9TbKmq1wsdIwYK_WHDyOaB7UsWfcN3_ZNWoiUSWbKkrOvSxqTnXmsO4Ny7HYLZQTX9tTj_mt9EspH3rz4D_worH7z8680lxG9fS6MSEvQ0j5rWM6ECSrdBMazh2oXlIyIUSTOA_bKmHD_E4UG7dzXMx0abzLPFDcn7T_yOpmGTFkZS1GOa-AnaoU00pxDrBF_qJ4zsJlvpQ-w-SlGErpbwCkiN-M',
    name: 'ĐD. Trần Thị B',
    role: 'Trưởng Điều dưỡng',
    desc: 'Tu nghiệp chuyên sâu về chăm sóc người cao tuổi tại Nhật Bản.',
  },
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApvFBXSVLQW9ozhaVZoYPVBurNWdfssYfaeS2ARH6xcF6a4OW_n_PxPvOfNg-qmt1D4JWP8Xgu3B0Tu_NvY69H-tT8McffbSJD2b4urClLUlQli2NrmF_bSHLBZU56E5_qWPjs38zUS51D_4S5RbnlpQpwB3tp4Jj2g10EtIIHyFQ-Gj8RXuZ91P2jIqwTjQOfOZai6EtPtJYcbU68vh0q_vkzXk4qXBRXVk9n-r1N1vA6meO-EYg7WbiWtTAjB3aWf2NffGuCscIz',
    name: 'ThS. Lê Văn C',
    role: 'Chuyên gia Dinh dưỡng',
    desc: 'Thiết kế thực đơn cá nhân hóa, đảm bảo cân bằng dinh dưỡng tối ưu.',
  },
  {
    img: null,
    name: 'Đội Ngũ Chăm Sóc',
    role: 'Hỗ trợ 24/7',
    desc: 'Được đào tạo bài bản, tận tâm và luôn sẵn sàng hỗ trợ mọi lúc.',
  },
];

const TIMELINE = [
  {
    year: '2018',
    side: 'left',
    title: 'Khởi Nguồn Ý Tưởng',
    desc: 'Đội ngũ sáng lập bắt đầu nghiên cứu mô hình viện dưỡng lão cao cấp tại Nhật Bản và các nước tiên tiến.',
    active: false,
  },
  {
    year: '2020',
    side: 'right',
    title: 'Chính Thức Khởi Công',
    desc: 'Đặt viên gạch đầu tiên xây dựng cơ sở An Nhiên với tiêu chuẩn thiết kế y tế quốc tế.',
    active: false,
  },
  {
    year: '2022',
    side: 'left',
    title: 'Đón Những Vị Khách Đầu Tiên',
    desc: 'Khai trương cơ sở 1, chính thức đi vào hoạt động với công suất 100 giường bệnh cao cấp.',
    active: false,
  },
  {
    year: 'Nay',
    side: 'right',
    title: 'Phát Triển Bền Vững',
    desc: 'Tiếp tục ứng dụng công nghệ IoT vào theo dõi sức khỏe và mở rộng quy mô phục vụ.',
    active: true,
  },
];

/* ── Component ── */
export default function IntroPage() {
  const { token, user } = useAuth();

  return (
    <div className="intro-page home-page">
      <PublicHeader />

      <main className="intro-main">

        {/* ── HERO ── */}
        <section className="intro-hero">
          <h1>Triết Lý Chăm Sóc Từ Trái Tim</h1>
          <p className="intro-hero__desc">
            Tại An Nhiên Care Home, chúng tôi kết hợp tinh hoa của sự tận tâm Nhật Bản
            (Omotenashi) với công nghệ y tế hiện đại, mang đến một không gian sống an lành
            và đầy tôn trọng cho người cao tuổi.
          </p>
          <div className="intro-hero__img">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLWp8JZae45C9lXeMDbt4QZFZ7kZ_44AQcCboruX7hPRlZNp7_gOLdb7uB-TKVQkzHc-i9Thovg1ZdTTicIC-ROx0SJ8uYfsou4g1sP5QtCTXG73KbMwLjd6cWhq43PHZHkLFYMelDZ8eWaHXLdVbFmA-EVPBI17SXPRHm7O4lAnm5ZsVPylqyjLyi1Yy2Gy6GtugqxlgQXsPchCHCjC-be-7l6P9xqrK9SZ7-n2c7G-9I4Ii6hC692NmYK--m5MGFnPTfJFo2absM"
              alt="An Nhiên Care Home — không gian sống cao cấp phong cách Nhật Bản"
            />
          </div>
        </section>

        {/* ── VISION & MISSION BENTO ── */}
        <section className="intro-vm">
          <h2>Tầm Nhìn &amp; Sứ Mệnh</h2>
          <div className="intro-bento">

            {/* Vision — chiếm 2 cột */}
            <div className="intro-bento__vision">
              <div className="ip-icon"><Eye size={36} /></div>
              <h3>Tầm Nhìn</h3>
              <p>
                Trở thành biểu tượng của dịch vụ chăm sóc sức khỏe người cao tuổi cao cấp tại
                Việt Nam, nơi mỗi cá nhân được tận hưởng những năm tháng rực rỡ nhất của cuộc đời
                trong sự bình an và trân trọng tuyệt đối.
              </p>
            </div>

            {/* Mission — 1 cột, nền navy */}
            <div className="intro-bento__mission">
              <div className="ip-icon"><Heart size={36} /></div>
              <h3>Sứ Mệnh</h3>
              <p>
                Nâng tầm chất lượng sống bằng sự chăm sóc tinh tế, kết nối yêu thương gia đình
                và kiến tạo một cộng đồng hạnh phúc, khỏe mạnh.
              </p>
            </div>

            {/* Omotenashi — full 3 cột */}
            <div className="intro-bento__omote">
              <div>
                <h3>Triết Lý Omotenashi</h3>
                <p>
                  Chúng tôi áp dụng tinh thần Omotenashi — lòng hiếu khách tận tâm của Nhật Bản
                  — vào từng chi tiết nhỏ nhất. Sự chăm sóc không chỉ dừng lại ở thể chất mà còn
                  là sự thấu hiểu và xoa dịu tinh thần, dự đoán nhu cầu trước khi được nói ra.
                </p>
              </div>
              <div className="intro-bento__omote-img">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPq-83Z2CxcwWdHyKy361X9U_DeXhaO8S__VWClNQ3UKeJgMthBr55PLO-RkNDdgLVjLsnp7cUnCeSe_X_PtlMtIRALSP4CQeI34Gl2rDzQdEfBcH7fQf9_XzzDZ-2nhp97ulK3Rh1v-2dti_elbaZiquz__uEAehtcnhysQAXEHQUMzmNl_HJ7bhv4A28RmnWVfyvCAxAdZEYvpD5E7Dot-np98ZF53g0BNOINNmVJ9byU9BEnDdnj7hs7N8db8B32ZxRxjxIOgUL"
                  alt="Omotenashi — điều dưỡng chăm sóc bệnh nhân cao tuổi"
                />
              </div>
            </div>

          </div>
        </section>

        {/* ── TEAM ── */}
        <section className="intro-team-section">
          <h2>Đội Ngũ Chuyên Gia</h2>
          <div className="intro-team-grid">
            {TEAM.map((m, i) => (
              <div key={i} className="intro-team-card">
                {m.img ? (
                  <div className="intro-team-card__img">
                    <img src={m.img} alt={m.name} />
                  </div>
                ) : (
                  <div className="intro-team-card__placeholder">
                    <Users size={64} />
                  </div>
                )}
                <div className="intro-team-card__body">
                  <p className="intro-team-card__name">{m.name}</p>
                  <span className="intro-team-card__role">{m.role}</span>
                  <p className="intro-team-card__desc">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── TIMELINE ── */}
        <section className="intro-timeline-section">
          <h2>Hành Trình Phát Triển</h2>
          <div className="intro-timeline-wrap">
            <div className="intro-timeline-line" />
            <div className="intro-timeline-items">
              {TIMELINE.map((item, i) => (
                <div key={i} className="intro-tl-item">
                  <div className={`intro-tl-dot${item.active ? ' intro-tl-dot--active' : ''}`}>
                    {item.year}
                  </div>

                  {item.side === 'left' ? (
                    <>
                      <div className={`intro-tl-content intro-tl-content--left${item.active ? ' intro-tl-content--active' : ''}`}>
                        <h4>{item.title}</h4>
                        <p>{item.desc}</p>
                      </div>
                      <div className="intro-tl-spacer" />
                    </>
                  ) : (
                    <>
                      <div className="intro-tl-spacer" />
                      <div className={`intro-tl-content intro-tl-content--right${item.active ? ' intro-tl-content--active' : ''}`}>
                        <h4>{item.title}</h4>
                        <p>{item.desc}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
