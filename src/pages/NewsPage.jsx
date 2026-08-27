import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronDown } from 'lucide-react';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import '../styles/shared/ZenPages.css';

const FILTERS = [
  { value: 'all', i18nKey: 'news.filter.all' },
  { value: 'elderly', i18nKey: 'news.filter.elderly' },
  { value: 'nutrition', i18nKey: 'news.filter.nutrition' },
  { value: 'alzheimer', i18nKey: 'news.filter.alzheimer' },
  { value: 'mental', i18nKey: 'news.filter.mental' },
  { value: 'tech', i18nKey: 'news.filter.tech' },
];

const getArticles = (t) => [
  {
    id: 1, type: 'featured', badge: t('news.filter.elderly'), badgeType: 'primary',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6LN9y5ZS_B6dxHNiC4YXbxhKklYKOG2Rt3prZE-WYdZut4t5oQHmQqYgOEO1jPkG6dQnPGfU6m-Hk3czmHaEb4s1XJDAZINNMmxcxgQ_HUoI3dzpG5LiNCBuTUkrAaHgL_BILzFSKClVf1-qfsSY0tOQM_H5Dh9x1JM88a6-_Uyf0vuWPeOZLBaSOD1CM5vYnr7VknnoiCRaSMZRfRXIXAQ2FTpnAWa4NMOv0T04GUjVNVc3FmTdwcMPjxCUmURkDPTo_gE1c_xAA',
    title: t('news.art1.title'), excerpt: t('news.art1.excerpt'), date: t('news.art1.date'), showReadMore: true,
  },
  {
    id: 2, type: 'sec', badge: t('news.filter.nutrition'), badgeType: 'teal',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoC9mw_fvIWsfkfZH70h89JKrJU4AXyghc5Oq0wYosR-GkBix4KeudKizj0wyMtl_jfeF6EGkXpF3x5iUYlgErqzXVUjKIn9S6l6RzDuCKVid0PGRhkL3vrLCiiLxMEN4EJPpnC8s8tDz42D40rhDVk_NHXQkzIIdgu6TH7ys2w-yw8brlAf9Bb7Zep_ydeIOZsbUcKOTVBUbIaz0f5nCWGfG7IvMavViMlXFIQXznjpznweGrRyyHWTdctRAFxJmeiszTO0dr0rl4',
    title: t('news.art2.title'), excerpt: t('news.art2.excerpt'), date: t('news.art2.date'), showReadMore: false,
  },
  {
    id: 3, type: 'card4', badge: t('news.filter.mental'), badgeType: 'secondary',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2qRgf5CPw8TEeB_mDgzZCfuwcPTiG6tZ9Er26UlmPycJ3x4QQqaLkWeloShz_0WgxdzoVodpWH30HXDUlprdKHFHaESgg-VgVftIsSSovCZJZ-Agc4RCuKQBCfhlCtPVNpUHWn-b2IDnJFtHBJ-krDs9-ycHcSo25dZUnbwq1z_UE9DZ4PC7Uf_JJc7D85Gi2-quN6mZACmbXj02U60bkZDi2Wyo87lEbu2_nv-M0eY2Ch7xhULL4sTcS_BSRai8J2K9OrZxJTMh-',
    title: t('news.art3.title'), excerpt: t('news.art3.excerpt'), date: t('news.art3.date'), showReadMore: false,
  },
  {
    id: 4, type: 'card4', badge: t('news.filter.tech'), badgeType: 'tech',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6Vjv-OlA7YbQDUkFF9OoKRMiPBHLCPeBXUB1si7zN15cD86tw_NV37g_dxnpDO9TlBsFGNixH-s-VJ2rjYfU58rl7eI0cpydOQ09Pfkoeb0IWgQC-NTxMGMvgNl2X6aGiBGeqb2a-PkGJKOHIpSlK-KiG5G83HEp01FhduBWU9-puiQdtjbKRWmxFZk66dFB86lHgaxQBvACSyiv_DAmGZPx7QYi05teaiBIOr3eSJPih-h1wT-OpQAH0odHizfMqMEUiSdU_CTwl',
    title: t('news.art4.title'), excerpt: t('news.art4.excerpt'), date: t('news.art4.date'), showReadMore: false,
  },
  {
    id: 5, type: 'card4', badge: t('news.filter.alzheimer'), badgeType: 'neutral',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDenN3TFUC0z8VrKrLji135DH1FU6OespxJd_QfqcG6ClJ3GBD4dNOILkfq9aMqtmNIUstnnoyQOfaHspsZAS7pESKJ_IalT4kJIlpfsu_LdxcI32-ZjSGGvZ_o-CNPvyBqDoSCSarbSK2b-JNp6TDAFygXMkZKeZGYh0uX9sFt903_9Dxzg2mx27-BYJOMqywCVVRPpKjCKWE954r0c1GI6EgCZm8m3AoUrEML7fx8m7OxLeA5jU0rWBT1HpaLaw5cpouSX55MtvpZ',
    title: t('news.art5.title'), excerpt: t('news.art5.excerpt'), date: t('news.art5.date'), showReadMore: false,
  },
];

export default function NewsPage() {
  const { t } = useTranslation();
  const ARTICLES = getArticles(t);
  const [activeFilter, setActiveFilter] = useState('all');

  return (
    <div className="zh-page home-page">
      <PublicHeader />

      <main className="np2-main">

        {/* ── PAGE HEADER ── */}
        <div className="np2-header">
          <h1>{t('news.title')}</h1>
          <p>
            {t('news.subtitle')}
          </p>
        </div>

        {/* ── FILTER PILLS ── */}
        <div className="np2-filters">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`np2-filter-btn${activeFilter === f.value ? ' np2-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter(f.value)}
            >
              {t(f.i18nKey)}
            </button>
          ))}
        </div>

        {/* ── BENTO GRID ── */}
        <div className="np2-bento">
          {ARTICLES.map((art) => (
            <article
              key={art.id}
              className={`np2-article np2-article--${art.type}`}
            >
              {/* Image */}
              <div className="np2-article__img-wrap">
                <img src={art.img} alt={art.title} />
                <span className={`np2-badge np2-badge--${art.badgeType}`}>{art.badge}</span>
              </div>

              {/* Body */}
              <div className="np2-article__body">
                <h2 className={art.type === 'featured' ? 'np2-article__title--lg' : 'np2-article__title--md'}>
                  {art.title}
                </h2>
                <p className="np2-article__excerpt">{art.excerpt}</p>
                <div className="np2-article__meta">
                  <span>{art.date}</span>
                  {art.showReadMore && (
                    <span className="np2-article__readmore">
                      {t('news.readMore')} <ArrowRight size={14} />
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* ── LOAD MORE ── */}
        <div className="np2-load-more-wrap">
          <button className="np2-load-more">
            {t('news.loadMore')} <ChevronDown size={18} />
          </button>
        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
