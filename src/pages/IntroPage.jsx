import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Heart, Users } from 'lucide-react';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import { useAuth } from '../hooks/useAuth';
import '../styles/shared/IntroPage.css';

/* ── Data ── */
const getTeam = (t) => [
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCF1JOrg8-59_lGiPvMpLmtKFApE-GXCWD5sTRmyHB7r26T9lgJYAEWEBYMvIq0yxR3c--X0ohez7c8HHBRZ58CZiUTTHTPZQih68VGVrdp6OLFXyvy69-u8HoXKHcKregs4SShqsUKP3o8Snaii6XUBCA60_kwQen_pmUCMqLSzFmKgSYf-l3VNFlk9rMJB-8rnZ9zAUt5s-0MIZDuK40SD9_FTtN3QhxJm1M4CKLko52BTRnrlXkedRbgMPOyXNu9KrIKAsoE4XrS',
    name: t('intro.team.doctor.name'),
    role: t('intro.team.doctor.role'),
    desc: t('intro.team.doctor.desc'),
  },
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuDvxsYgpaUD21Vy7bcbbBm5R-m-qC2gub_Vgk8CVgPAqTVOSr9TbKmq1wsdIwYK_WHDyOaB7UsWfcN3_ZNWoiUSWbKkrOvSxqTnXmsO4Ny7HYLZQTX9tTj_mt9EspH3rz4D_worH7z8680lxG9fS6MSEvQ0j5rWM6ECSrdBMazh2oXlIyIUSTOA_bKmHD_E4UG7dzXMx0abzLPFDcn7T_yOpmGTFkZS1GOa-AnaoU00pxDrBF_qJ4zsJlvpQ-w-SlGErpbwCkiN-M',
    name: t('intro.team.nurse.name'),
    role: t('intro.team.nurse.role'),
    desc: t('intro.team.nurse.desc'),
  },
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApvFBXSVLQW9ozhaVZoYPVBurNWdfssYfaeS2ARH6xcF6a4OW_n_PxPvOfNg-qmt1D4JWP8Xgu3B0Tu_NvY69H-tT8McffbSJD2b4urClLUlQli2NrmF_bSHLBZU56E5_qWPjs38zUS51D_4S5RbnlpQpwB3tp4Jj2g10EtIIHyFQ-Gj8RXuZ91P2jIqwTjQOfOZai6EtPtJYcbU68vh0q_vkzXk4qXBRXVk9n-r1N1vA6meO-EYg7WbiWtTAjB3aWf2NffGuCscIz',
    name: t('intro.team.nutritionist.name'),
    role: t('intro.team.nutritionist.role'),
    desc: t('intro.team.nutritionist.desc'),
  },
  {
    img: null,
    name: t('intro.team.careTeam.name'),
    role: t('intro.team.careTeam.role'),
    desc: t('intro.team.careTeam.desc'),
  },
];

const getTimeline = (t) => [
  {
    year: '2018',
    side: 'left',
    title: t('intro.timeline.y2018.title'),
    desc: t('intro.timeline.y2018.desc'),
    active: false,
  },
  {
    year: '2020',
    side: 'right',
    title: t('intro.timeline.y2020.title'),
    desc: t('intro.timeline.y2020.desc'),
    active: false,
  },
  {
    year: '2022',
    side: 'left',
    title: t('intro.timeline.y2022.title'),
    desc: t('intro.timeline.y2022.desc'),
    active: false,
  },
  {
    year: t('intro.timeline.now.year'),
    side: 'right',
    title: t('intro.timeline.now.title'),
    desc: t('intro.timeline.now.desc'),
    active: true,
  },
];

/* ── Component ── */
export default function IntroPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const TEAM = getTeam(t);
  const TIMELINE = getTimeline(t);

  return (
    <div className="intro-page home-page">
      <PublicHeader />

      <main className="intro-main">

        {/* ── HERO ── */}
        <section className="intro-hero">
          <h1>{t('intro.hero.title')}</h1>
          <p className="intro-hero__desc">
            {t('intro.hero.desc')}
          </p>
          <div className="intro-hero__img">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLWp8JZae45C9lXeMDbt4QZFZ7kZ_44AQcCboruX7hPRlZNp7_gOLdb7uB-TKVQkzHc-i9Thovg1ZdTTicIC-ROx0SJ8uYfsou4g1sP5QtCTXG73KbMwLjd6cWhq43PHZHkLFYMelDZ8eWaHXLdVbFmA-EVPBI17SXPRHm7O4lAnm5ZsVPylqyjLyi1Yy2Gy6GtugqxlgQXsPchCHCjC-be-7l6P9xqrK9SZ7-n2c7G-9I4Ii6hC692NmYK--m5MGFnPTfJFo2absM"
              alt={t('intro.hero.imgAlt')}
            />
          </div>
        </section>

        {/* ── VISION & MISSION BENTO ── */}
        <section className="intro-vm">
          <h2>{t('intro.vm.title')}</h2>
          <div className="intro-bento">

            {/* Vision — chiếm 2 cột */}
            <div className="intro-bento__vision">
              <div className="ip-icon"><Eye size={36} /></div>
              <h3>{t('intro.vm.vision')}</h3>
              <p>
                {t('intro.vm.visionDesc')}
              </p>
            </div>

            {/* Mission — 1 cột, nền navy */}
            <div className="intro-bento__mission">
              <div className="ip-icon"><Heart size={36} /></div>
              <h3>{t('intro.vm.mission')}</h3>
              <p>
                {t('intro.vm.missionDesc')}
              </p>
            </div>

            {/* Omotenashi — full 3 cột */}
            <div className="intro-bento__omote">
              <div>
                <h3>{t('intro.vm.omotenashi')}</h3>
                <p>
                  {t('intro.vm.omotenashiDesc')}
                </p>
              </div>
              <div className="intro-bento__omote-img">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPq-83Z2CxcwWdHyKy361X9U_DeXhaO8S__VWClNQ3UKeJgMthBr55PLO-RkNDdgLVjLsnp7cUnCeSe_X_PtlMtIRALSP4CQeI34Gl2rDzQdEfBcH7fQf9_XzzDZ-2nhp97ulK3Rh1v-2dti_elbaZiquz__uEAehtcnhysQAXEHQUMzmNl_HJ7bhv4A28RmnWVfyvCAxAdZEYvpD5E7Dot-np98ZF53g0BNOINNmVJ9byU9BEnDdnj7hs7N8db8B32ZxRxjxIOgUL"
                  alt={t('intro.vm.omotenashiAlt')}
                />
              </div>
            </div>

          </div>
        </section>

        {/* ── TEAM ── */}
        <section className="intro-team-section">
          <h2>{t('intro.teamSection')}</h2>
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
          <h2>{t('intro.timelineSection')}</h2>
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
