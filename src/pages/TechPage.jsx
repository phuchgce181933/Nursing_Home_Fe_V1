import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Monitor, AlertTriangle, FileText, Brain, Users, Check,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import '../styles/shared/ZenPages.css';

const HERO_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwbrj5NXWLWsEfRij8h87Rz8VsAy1Mc-5--CAVQ9kbj2Vc6wYscaNllqwN1mIkt1MzHWWQl3Jpl4zG6TQwcp8u_C_owLDUeKqZgV2yr8HjvqRDiz4UWtuSTx92SkLfVpYnREsevIDY0u2sCS2nhb0r4tPFvHKDtte_jQPl8F9JcOQizESNYOq-xqVkWVBRpKBizrt_2AoL0BT9ua1WfypiS5jtBUi2cnvVMl3hhspRFobKZFpHEXkqMasenOqHlmD-VT6sLx7BLRRN';

const CHART_BARS = [
  { day: 'T2', height: 64, active: false },
  { day: 'T3', height: 96, active: false },
  { day: 'T4', height: 80, active: false },
  { day: 'T5', height: 128, active: true },
  { day: 'T6', height: 72, active: false },
  { day: 'T7', height: 112, active: false },
  { day: 'CN', height: 88, active: false },
];

const getEhrItems = (t) => [
  t('tech.ehr.item1'), t('tech.ehr.item2'), t('tech.ehr.item3'), t('tech.ehr.item4'),
];

const getAiChips = (t) => [
  { label: t('tech.ai.ecg'), teal: true },
  { label: t('tech.ai.fallPredict'), teal: false },
  { label: t('tech.ai.spo2'), teal: true },
  { label: t('tech.ai.faceId'), teal: false },
  { label: t('tech.ai.sleep'), teal: false },
  { label: t('tech.ai.allergy'), teal: true },
];

export default function TechPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const EHR_ITEMS = getEhrItems(t);
  const AI_CHIPS = getAiChips(t);
  const tourPath = (token && user?.role === 'family') ? '/family/facility-tours/new' : '/login';

  return (
    <div className="zh-page home-page">
      <PublicHeader />

      <main className="tp2-main">

        {/* ── HERO ── */}
        <section className="tp2-hero">
          <div className="tp2-hero__text">
            <h1>{t('tech.hero.title')} <span>{t('tech.hero.titleHighlight')}</span></h1>
            <p>
              {t('tech.hero.desc')}
            </p>
          </div>
          <div className="tp2-hero__img">
            <img src={HERO_IMG} alt={t('tech.hero.imgAlt')} />
          </div>
        </section>

        {/* ── BENTO GRID ── */}
        <div className="tp2-bento">

          {/* Card 1: Dashboard — col-span-8 */}
          <div className="tp2-card tp2-card--col8">
            <div className="tp2-blob" />
            <div className="tp2-card__head">
              <div className="tp2-card__icon-box tp2-card__icon-box--primary">
                <Monitor size={24} />
              </div>
              <h2 className="tp2-card__title">{t('tech.dashboard.title')}</h2>
            </div>
            <p className="tp2-card__body">
              {t('tech.dashboard.desc')}
            </p>
            <div className="tp2-chart">
              {CHART_BARS.map((bar, i) => (
                <div
                  key={i}
                  className={`tp2-chart__bar tp2-chart__bar--${bar.active ? 'active' : 'normal'}`}
                >
                  <div
                    className="tp2-chart__bar-fill"
                    style={{ height: bar.height }}
                  />
                  <span className="tp2-chart__label">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Fall Sensor — col-span-4 */}
          <div className="tp2-card tp2-card--col4">
            <div className="tp2-card__head">
              <div className="tp2-card__icon-box tp2-card__icon-box--error">
                <AlertTriangle size={24} />
              </div>
              <h2 className="tp2-card__title">{t('tech.fallSensor.title')}</h2>
            </div>
            <p className="tp2-card__body">
              {t('tech.fallSensor.desc')}
            </p>
            <div className="tp2-ping-wrap">
              <div className="tp2-ping-ring" />
              <div className="tp2-ping-icon">
                <AlertTriangle size={40} />
              </div>
            </div>
          </div>

          {/* Card 3: EHR — col-span-4 */}
          <div className="tp2-card tp2-card--col4">
            <div className="tp2-card__head">
              <div className="tp2-card__icon-box tp2-card__icon-box--sec">
                <FileText size={24} />
              </div>
              <h2 className="tp2-card__title">{t('tech.ehr.title')}</h2>
            </div>
            <p className="tp2-card__body">
              {t('tech.ehr.desc')}
            </p>
            <div className="tp2-checklist">
              {EHR_ITEMS.map((item, i) => (
                <div key={i} className="tp2-checklist__item">
                  <Check size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: AI Health — col-span-8 */}
          <div className="tp2-card tp2-card--col8">
            <div className="tp2-blob" />
            <div className="tp2-card__head">
              <div className="tp2-card__icon-box tp2-card__icon-box--teal">
                <Brain size={24} />
              </div>
              <h2 className="tp2-card__title">{t('tech.ai.title')}</h2>
            </div>
            <p className="tp2-card__body">
              {t('tech.ai.desc')}
            </p>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div className="tp2-chips" style={{ flex: 1 }}>
                {AI_CHIPS.map((chip, i) => (
                  <span
                    key={i}
                    className={`tp2-chip ${chip.teal ? 'tp2-chip--teal' : 'tp2-chip--gray'}`}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
              <div className="tp2-status-box">
                <div className="tp2-status-box__icon">
                  <Brain size={32} />
                </div>
                <p className="tp2-status-box__label">98.7%</p>
                <p style={{ fontSize: 12, color: '#454652', textAlign: 'center', position: 'relative', zIndex: 1 }}>{t('tech.ai.accuracy')}</p>
              </div>
            </div>
          </div>

          {/* Card 5: Family Connect — col-span-12 */}
          <div className="tp2-card tp2-card--col12">
            <div className="tp2-card__head">
              <div className="tp2-card__icon-box tp2-card__icon-box--light">
                <Users size={24} />
              </div>
              <h2 className="tp2-card__title">{t('tech.family.title')}</h2>
            </div>
            <div className="tp2-family-row">
              <p className="tp2-card__body">
                {t('tech.family.desc')}
              </p>
              <div className="tp2-family-btns">
                <Link to={tourPath} className="tp2-family-btn tp2-family-btn--solid">
                  {t('tech.family.tour')}
                </Link>
                <Link to="/contact" className="tp2-family-btn tp2-family-btn--outline">
                  {t('tech.family.contact')}
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
