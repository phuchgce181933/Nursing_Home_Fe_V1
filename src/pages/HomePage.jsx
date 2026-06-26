import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Users, ThumbsUp, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import '../styles/shared/ZenPages.css';

const STATS = [
  { icon: <Award size={36} color="#000666" />, number: '10+', unit: 'Năm', label: 'Kinh nghiệm' },
  { icon: <Users size={36} color="#003731" />, number: '500+', unit: '', label: 'Cư dân tin tưởng' },
  { icon: <Clock size={36} color="#000666" />, number: '24/7', unit: '', label: 'Theo dõi sức khỏe' },
  { icon: <ThumbsUp size={36} color="#003731" />, number: '98%', unit: '', label: 'Gia đình hài lòng' },
];

const TESTIMONIALS = [
  {
    text: 'Môi trường ở đây rất yên tĩnh và trong lành. Các điều dưỡng viên chăm sóc mẹ tôi vô cùng chu đáo, tôi hoàn toàn yên tâm khi đi công tác xa.',
    initials: 'NH',
    name: 'Nguyễn Hoàng',
    role: 'Người nhà cư dân',
    avatarBg: '#d3e2ed',
    avatarColor: '#000666',
  },
  {
    text: 'Hệ thống AI theo dõi sức khỏe rất ấn tượng. Các bác sĩ được cảnh báo ngay lập tức nếu có bất thường. Cơ sở vật chất sạch sẽ, mang đậm phong cách tối giản dễ chịu.',
    initials: 'TM',
    name: 'Trần Minh',
    role: 'Con trai cư dân',
    avatarBg: '#1a237e',
    avatarColor: '#8690ee',
    elevated: true,
  },
  {
    text: 'Tôi thấy khỏe hơn nhiều từ khi vào đây. Mọi người thân thiện, phòng ốc sáng sủa và các hoạt động tập thể giúp tôi không còn cảm thấy cô đơn.',
    initials: 'LH',
    name: 'Lê Hạnh',
    role: 'Cư dân, 78 tuổi',
    avatarBg: '#003731',
    avatarColor: '#ffffff',
  },
];

export default function HomePage() {
  const { token, user } = useAuth();
  const tourPath = (token && user?.role === 'family') ? '/family/facility-tours/new' : '/login';
  const bookPath = (token && user?.role === 'family') ? '/family/admission-requests/new' : '/login';

  return (
    <div className="zh-page home-page">
      <PublicHeader />

      <main>
        {/* ── HERO ── */}
        <section className="hp2-hero">
          <div className="hp2-hero__text">
            <h1>Cuộc Sống An Lành, Hạnh Phúc Trọn Vẹn</h1>
            <p>
              Nơi người cao tuổi được yêu thương, tôn trọng và chăm sóc toàn diện —
              kết hợp tinh hoa y tế Nhật Bản và trái tim Việt Nam.
            </p>
            <div className="hp2-hero__actions">
              <Link to={tourPath} className="hp2-btn hp2-btn--primary">Đặt Lịch Tham Quan</Link>
              <Link to="/intro" className="hp2-btn hp2-btn--outline">Tìm Hiểu Thêm</Link>
            </div>
          </div>

          <div className="hp2-hero__image">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWF-HrnchU-JNzFU5FArTuAPxYmgjova9VX1L_Lsf41zI_FzpfvaMUnIjOfBueshP0-G8k4-4pWfW77NtgSEsm--gLNb2aqmGJJpp3ZsiH8UCxLf-h1CMXTifs70kIDuCTTMG-H7jSSjNoqpmuC17MZuiG4I5VtuXficmUZK0TR7uZAJ0a0Cu4oKz432ZfZ0aXrNA46NF3s9G6vV3OFfPgZ_dTEBdncDmR6zNgACoxBs_ckzEqStovxcurrGX9yNZKMlxF15p4cLG9"
              alt="An Nhiên Care Home — không gian sống cao cấp"
            />
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="hp2-stats">
          <div className="hp2-stats__grid">
            {STATS.map((s, i) => (
              <div key={i} className="hp2-stat-card">
                <div className="hp2-stat-card__icon">{s.icon}</div>
                <p className={`hp2-stat-card__number ${i % 2 === 0 ? 'hp2-stat-card__number--primary' : 'hp2-stat-card__number--teal'}`}>
                  {s.number}<span style={{ fontSize: '18px', fontWeight: 400 }}>{s.unit}</span>
                </p>
                <p className="hp2-stat-card__label">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <div className="hp2-testimonials">
          <div className="hp2-testimonials__head">
            <h2>Gia Đình Nói Gì Về Chúng Tôi</h2>
            <p>Những chia sẻ chân thật từ gia đình và cư dân đang sinh sống tại An Nhiên Care Home.</p>
          </div>
          <div className="hp2-testimonials__grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className={`hp2-tcard${t.elevated ? ' hp2-tcard--elevated' : ''}`}>
                <div className="hp2-tcard__quote">"</div>
                <p className="hp2-tcard__text">{t.text}</p>
                <div className="hp2-tcard__author">
                  <div
                    className="hp2-tcard__avatar"
                    style={{ background: t.avatarBg, color: t.avatarColor }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="hp2-tcard__name">{t.name}</p>
                    <p className="hp2-tcard__role">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
