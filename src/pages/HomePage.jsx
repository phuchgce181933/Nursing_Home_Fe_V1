import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, Users, ThumbsUp, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import '../styles/shared/ZenPages.css';

const getStats = (t) => [
  { icon: <Award size={36} color="#000666" />, number: '10+', unit: t('home.stats.yearsUnit'), label: t('home.stats.experience') },
  { icon: <Users size={36} color="#003731" />, number: '500+', unit: '', label: t('home.stats.trustedResidents') },
  { icon: <Clock size={36} color="#000666" />, number: '24/7', unit: '', label: t('home.stats.healthMonitoring') },
  { icon: <ThumbsUp size={36} color="#003731" />, number: '98%', unit: '', label: t('home.stats.familySatisfaction') },
];

const getTestimonials = (t) => [
  {
    text: t('home.testimonials.t1.text'),
    initials: 'NH',
    name: t('home.testimonials.t1.name'),
    role: t('home.testimonials.t1.role'),
    avatarBg: '#d3e2ed',
    avatarColor: '#000666',
  },
  {
    text: t('home.testimonials.t2.text'),
    initials: 'TM',
    name: t('home.testimonials.t2.name'),
    role: t('home.testimonials.t2.role'),
    avatarBg: '#1a237e',
    avatarColor: '#8690ee',
    elevated: true,
  },
  {
    text: t('home.testimonials.t3.text'),
    initials: 'LH',
    name: t('home.testimonials.t3.name'),
    role: t('home.testimonials.t3.role'),
    avatarBg: '#003731',
    avatarColor: '#ffffff',
  },
];

export default function HomePage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const STATS = getStats(t);
  const TESTIMONIALS = getTestimonials(t);
  const tourPath = (token && user?.role === 'family') ? '/family/facility-tours/new' : '/contact';
  const bookPath = '/contact';

  return (
    <div className="zh-page home-page">
      <PublicHeader />

      <main>
        {/* ── HERO ── */}
        <section className="hp2-hero">
          <div className="hp2-hero__text">
            <h1>{t('home.hero.title')}</h1>
            <p>
              {t('home.hero.desc')}
            </p>
            <div className="hp2-hero__actions">
              <Link to={tourPath} className="hp2-btn hp2-btn--primary">{t('home.hero.bookTour')}</Link>
              <Link to="/intro" className="hp2-btn hp2-btn--outline">{t('home.hero.learnMore')}</Link>
            </div>
          </div>

          <div className="hp2-hero__image">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWF-HrnchU-JNzFU5FArTuAPxYmgjova9VX1L_Lsf41zI_FzpfvaMUnIjOfBueshP0-G8k4-4pWfW77NtgSEsm--gLNb2aqmGJJpp3ZsiH8UCxLf-h1CMXTifs70kIDuCTTMG-H7jSSjNoqpmuC17MZuiG4I5VtuXficmUZK0TR7uZAJ0a0Cu4oKz432ZfZ0aXrNA46NF3s9G6vV3OFfPgZ_dTEBdncDmR6zNgACoxBs_ckzEqStovxcurrGX9yNZKMlxF15p4cLG9"
              alt={t('home.hero.imgAlt')}
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
            <h2>{t('home.testimonials.title')}</h2>
            <p>{t('home.testimonials.subtitle')}</p>
          </div>
          <div className="hp2-testimonials__grid">
            {TESTIMONIALS.map((item, i) => (
              <div key={i} className={`hp2-tcard${item.elevated ? ' hp2-tcard--elevated' : ''}`}>
                <div className="hp2-tcard__quote">"</div>
                <p className="hp2-tcard__text">{item.text}</p>
                <div className="hp2-tcard__author">
                  <div
                    className="hp2-tcard__avatar"
                    style={{ background: item.avatarBg, color: item.avatarColor }}
                  >
                    {item.initials}
                  </div>
                  <div>
                    <p className="hp2-tcard__name">{item.name}</p>
                    <p className="hp2-tcard__role">{item.role}</p>
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
