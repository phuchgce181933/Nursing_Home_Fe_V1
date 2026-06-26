import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import '../styles/shared/ZenPages.css';

const MAP_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjd2FKCnuwxptJVMb8j0qNrWXbo-Y0xP-0UibhDcRdw4ZY4X9w7VfE9ncb99YUAZjXLWyek1FOgAYkHgeX3KUep_xtahcaSpeMWDelXwUoPfGk5WxMXm84lq3KB_OYNkllRQuIdyk9Qo76YykSy2rTRF0kIv4uq-EBJwLw1YrILn4XJPx_pZblcyOQPFUzXKZwxPOkNg_l6dm96SXpwmEnuB8TrsBwsNEcgUo4ef9MytWOIag0e1PhjK7YJF62-joJgyuJr1bpaQKc';

const INFO = [
  {
    icon: <MapPin size={18} />,
    title: 'Địa Chỉ',
    content: '123 Đường Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh',
    isHotline: false,
  },
  {
    icon: <Phone size={18} />,
    title: 'Hotline',
    content: '1800 1234 (miễn phí)',
    isHotline: true,
  },
  {
    icon: <Mail size={18} />,
    title: 'Email',
    content: 'info@annhiencarehome.vn',
    isHotline: false,
  },
  {
    icon: <Clock size={18} />,
    title: 'Giờ Hoạt Động',
    content: 'Thứ Hai – Chủ Nhật: 7:00 – 20:00 (kể cả lễ, Tết)',
    isHotline: false,
  },
];

const SERVICES = [
  'Chăm sóc ngắn hạn',
  'Chăm sóc dài hạn',
  'Phục hồi chức năng',
  'Tham quan cơ sở',
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', phone: '', service: '', message: '' });

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi trong vòng 24 giờ.');
    setForm({ name: '', phone: '', service: '', message: '' });
  };

  return (
    <div className="zh-page home-page">
      <PublicHeader />

      <main className="cp2-main">

        {/* ── HERO ── */}
        <div className="cp2-hero">
          <h1>Liên Hệ Với Chúng Tôi</h1>
          <p>
            Dù bạn đang tìm kiếm thông tin, cần tư vấn hay muốn đặt lịch tham quan —
            đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ bạn tìm giải pháp tốt nhất.
          </p>
        </div>

        {/* ── BENTO ── */}
        <div className="cp2-bento">

          {/* Left: info + map */}
          <div className="cp2-left">
            <div className="cp2-info-card">
              <h2>Thông Tin Liên Hệ</h2>
              <div className="cp2-info-rows">
                {INFO.map((item, i) => (
                  <div key={i} className="cp2-info-row">
                    <div className="cp2-info-row__icon">{item.icon}</div>
                    <div>
                      <h3>{item.title}</h3>
                      {item.isHotline
                        ? <p className="cp2-info-row__hotline">{item.content}</p>
                        : <p>{item.content}</p>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cp2-map-card">
              <div
                className="cp2-map-card__bg"
                style={{ backgroundImage: `url('${MAP_IMG}')` }}
              />
            </div>
          </div>

          {/* Right: form */}
          <div className="cp2-form-card">
            <h2>Gửi Tin Nhắn Cho Chúng Tôi</h2>
            <form className="cp2-form" onSubmit={handleSubmit}>
              <div className="cp2-form__row">
                <div className="cp2-form__field">
                  <label>Họ và tên *</label>
                  <input
                    name="name"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="cp2-form__field">
                  <label>Số điện thoại *</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="0901 234 567"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="cp2-form__field">
                <label>Dịch vụ quan tâm *</label>
                <select name="service" value={form.service} onChange={handleChange} required>
                  <option value="">-- Chọn dịch vụ --</option>
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="cp2-form__field">
                <label>Lời nhắn</label>
                <textarea
                  name="message"
                  rows={6}
                  placeholder="Tôi muốn tìm hiểu thêm về..."
                  value={form.message}
                  onChange={handleChange}
                />
              </div>

              <button type="submit" className="cp2-form__submit">
                Gửi Tin Nhắn
              </button>
            </form>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
