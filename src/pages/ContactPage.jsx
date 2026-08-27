import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import consultationRequestService from '../services/consultationRequest.service';
import { useToast } from '../hooks/useToast';
import '../styles/shared/ZenPages.css';

const MAP_IMG = 'https://i0.wp.com/imageearthtravel.com/wp-content/uploads/2015/09/cantho.png?ssl=1';

const getInfo = (t) => [
  {
    icon: <MapPin size={18} />,
    title: t('contact.info.address'),
    content: t('contact.info.addressContent'),
    isHotline: false,
  },
  {
    icon: <Phone size={18} />,
    title: t('contact.info.hotline'),
    content: t('contact.info.hotlineContent'),
    isHotline: true,
  },
  {
    icon: <Mail size={18} />,
    title: t('contact.info.email'),
    content: 'annhiencarehome@gmail.com',
    isHotline: false,
  },
  {
    icon: <Clock size={18} />,
    title: t('contact.info.hours'),
    content: t('contact.info.hoursContent'),
    isHotline: false,
  },
];

const SERVICES = [
  { value: 'Tư vấn dịch vụ', i18nKey: 'contact.services.serviceConsult' },
  { value: 'Tư vấn chi phí', i18nKey: 'contact.services.costConsult' },
  { value: 'Chăm sóc ngắn hạn', i18nKey: 'contact.services.shortTerm' },
  { value: 'Chăm sóc dài hạn', i18nKey: 'contact.services.longTerm' },
  { value: 'Phục hồi chức năng', i18nKey: 'contact.services.rehabilitation' },
  { value: 'Tham quan cơ sở', i18nKey: 'contact.services.facilityTour' },
  { value: 'Đăng ký nhập viện', i18nKey: 'contact.services.admission' },
  { value: 'Khác', i18nKey: 'contact.services.other' },
];

export default function ContactPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const INFO = getInfo(t);
  const [form, setForm] = useState({ name: '', email: '', phone: '', service: '', otherService: '', message: '' });
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
    const phoneRegex = /^0\d{9}$/;

    if (!trimmedName) {
      nextErrors.name = t('contact.errors.nameRequired');
    } else if (!nameRegex.test(trimmedName)) {
      nextErrors.name = t('contact.errors.nameInvalid');
    }

    if (!trimmedEmail) {
      nextErrors.email = t('contact.errors.emailRequired');
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = t('contact.errors.emailInvalid');
    }

    if (!trimmedPhone) {
      nextErrors.phone = t('contact.errors.phoneRequired');
    } else if (!phoneRegex.test(trimmedPhone)) {
      nextErrors.phone = t('contact.errors.phoneInvalid');
    }

    if (!trimmedService) {
      nextErrors.service = t('contact.errors.serviceRequired');
    }

    if (trimmedService === 'Khác') {
      const trimmedOtherService = form.otherService.trim();
      if (!trimmedOtherService) {
        nextErrors.otherService = t('contact.errors.otherServiceRequired');
      } else if (trimmedOtherService.length > 50) {
        nextErrors.otherService = t('contact.errors.maxChars50');
      }
    }

    if (form.message && form.message.trim().length > 200) {
      nextErrors.message = t('contact.errors.maxChars200');
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
        serviceInterest: form.service === 'Khác' ? form.otherService.trim() : SERVICES.find(s => s.value === form.service)?.value || form.service,
        message: form.message.trim(),
      });
      showToast(t('contact.toast.success'), 'success');
      setForm({ name: '', email: '', phone: '', service: '', otherService: '', message: '' });
      setErrors({});
    } catch (error) {
      console.error(error);
      showToast(t('contact.toast.error'), 'error');
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
            <span>{t('contact.hero.title')}</span>
          </h1>
          <p>
            {t('contact.hero.subtitle')}
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
                {t('contact.form.title')}
              </bold>
            </h2>
            <form className="cp2-form" onSubmit={handleSubmit}>
              <div className="cp2-form__row">
                <div className="cp2-form__field">
                  <strong>{t('contact.form.name')} *</strong>
                  <input
                    name="name"
                    type="text"
                    placeholder={t('contact.form.namePlaceholder')}
                    value={form.name}
                    onChange={handleChange}
                  />
                  {errors.name && <p className="cp2-form__error">{errors.name}</p>}
                </div>
                <div className="cp2-form__field">
                  <strong>{t('contact.form.email')} *</strong>
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
                  <strong>{t('contact.form.phone')} *</strong>
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
                <strong>{t('contact.form.service')} *</strong>
                <select name="service" value={form.service} onChange={handleChange}>
                  <option value="">{t('contact.form.servicePlaceholder')}</option>
                  {SERVICES.map((s) => (
                    <option key={s.value} value={s.value}>{t(s.i18nKey)}</option>
                  ))}
                </select>
                {errors.service && <p className="cp2-form__error">{errors.service}</p>}
              </div>

              {form.service === 'Khác' && (
                <div className="cp2-form__field">
                  <strong>{t('contact.form.otherService')} *</strong>
                  <input
                    name="otherService"
                    type="text"
                    placeholder={t('contact.form.otherServicePlaceholder')}
                    value={form.otherService}
                    maxLength={51}
                    onChange={handleChange}
                  />
                  {errors.otherService && <p className="cp2-form__error">{errors.otherService}</p>}
                </div>
              )}

              <div className="cp2-form__field">
                <strong>{t('contact.form.message')}</strong>
                <textarea
                  name="message"
                  rows={6}
                  placeholder={t('contact.form.messagePlaceholder')}
                  value={form.message}
                  maxLength={200}
                  onChange={handleChange}
                />
                <p className="cp2-form__hint">{t('contact.form.messageHint', { count: form.message.length })}</p>
                {errors.message && <p className="cp2-form__error">{errors.message}</p>}
              </div>

              <button type="submit" className="cp2-form__submit" disabled={submitting}>
                {submitting ? t('contact.form.submitting') : t('contact.form.submit')}
              </button>
            </form>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
