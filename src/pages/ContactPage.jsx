import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import consultationRequestService from '../services/consultationRequest.service';
import '../styles/shared/ZenPages.css';

const MAP_IMG = 'https://i0.wp.com/imageearthtravel.com/wp-content/uploads/2015/09/cantho.png?ssl=1';

const INFO = [
  {
    icon: <MapPin size={18} />,
    title: 'Địa Chỉ',
    content: '68 Đường Nguyễn Văn Cừ, Phường An Khánh, Quận Ninh Kiều, TP. Cần Thơ',
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
    content: 'annhiencarehome@gmail.com',
    isHotline: false,
  },
  {
    icon: <Clock size={18} />,
    title: 'Giờ Hoạt Động',
    content: '8h00 - 20h00 ( bao gồm ngày Lễ, Tết )',
    isHotline: false,
  },
];

const SERVICES = [
  'Tư vấn dịch vụ',
  'Tư vấn chi phí',
  'Chăm sóc ngắn hạn',
  'Chăm sóc dài hạn',
  'Phục hồi chức năng',
  'Tham quan cơ sở',
  'Đăng ký nhập viện',
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', service: '', message: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const nextErrors = {};
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPhone = form.phone.trim();
    const trimmedService = form.service.trim();

    const nameRegex = /^[\p{L}\s]+$/u;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRegex = /^\d{10}$/;

    if (!trimmedName) {
      nextErrors.name = 'Vui lòng nhập họ và tên.';
    } else if (!nameRegex.test(trimmedName)) {
      nextErrors.name = 'Họ và tên không được chứa số hoặc ký tự đặc biệt.';
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = 'Email không đúng định dạng.';
    }

    if (!trimmedPhone) {
      nextErrors.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!phoneRegex.test(trimmedPhone)) {
      nextErrors.phone = 'Số điện thoại phải gồm 10 chữ số và không chứa ký tự khác.';
    }

    if (!trimmedService) {
      nextErrors.service = 'Vui lòng chọn nhu cầu tư vấn mong muốn.';
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    try {
      await consultationRequestService.submitConsultationRequest({
        fullName: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        serviceInterest: form.service,
        message: form.message.trim(),
      });
      alert('Chúng tôi đã tiếp nhận yêu cầu tư vấn của bạn. Đội ngũ chuyên viên sẽ nhanh chóng xem xét và liên hệ để hỗ trợ trong thời gian sớm nhất..');
      setForm({ name: '', email: '', phone: '', service: '', message: '' });
      setErrors({});
    } catch (error) {
      console.error(error);
      alert('Không thể gửi yêu cầu. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="zh-page home-page">
      <PublicHeader />

      <main className="cp2-main">

        {/* ── HERO ── */}
        <div className="cp2-hero">
          <h1>
            <span>Liên Hệ Với Chúng Tôi</span>
          </h1>
          <p>
            Chúng tôi luôn sẵn sàng lắng nghe, tư vấn và đồng hành cùng bạn, mang đến giải pháp chăm sóc phù hợp nhất cho người thân yêu.
          </p>
        </div>

        {/* ── BENTO ── */}
        <div className="cp2-bento">

          {/* Left: info + map */}
          <div className="cp2-left">
            <div className="cp2-info-card">
              <h2>An Nhiên Care Home</h2>
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
            <h2>
              <bold>
                Đăng Ký Tư Vấn Dịch Vụ
              </bold>
            </h2>
            <form className="cp2-form" onSubmit={handleSubmit}>
              <div className="cp2-form__row">
                <div className="cp2-form__field">
                  <strong>Họ và tên *</strong>
                  <input
                    name="name"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={form.name}
                    onChange={handleChange}
                  />
                  {errors.name && <p className="cp2-form__error">{errors.name}</p>}
                </div>
                <div className="cp2-form__field">
                  <strong>Địa chỉ email *</strong>
                  <input
                    name="email"
                    type="email"
                    placeholder="nguyenvana@email.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                  {errors.email && <p className="cp2-form__error">{errors.email}</p>}
                </div>
              </div>
              <div className="cp2-form__row">
                <div className="cp2-form__field">
                  <strong>Số điện thoại *</strong>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="0901234567"
                    value={form.phone}
                    onChange={handleChange}
                  />
                  {errors.phone && <p className="cp2-form__error">{errors.phone}</p>}
                </div>
              </div>

              <div className="cp2-form__field">
                <strong>Nhu cầu tư vấn *</strong>
                <select name="service" value={form.service} onChange={handleChange}>
                  <option value="">-- Chọn nhu cầu --</option>
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errors.service && <p className="cp2-form__error">{errors.service}</p>}
              </div>

              <div className="cp2-form__field">
                <strong>Lời nhắn</strong>
                <textarea
                  name="message"
                  rows={6}
                  placeholder="Tôi muốn tìm hiểu thêm về..."
                  value={form.message}
                  onChange={handleChange}
                />
              </div>

              <button type="submit" className="cp2-form__submit" disabled={submitting}>
                {submitting ? 'Đang gửi...' : 'Gửi Thông Tin'}
              </button>
            </form>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
