import React, { useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import PublicHeader from '../components/homepage/PublicHeader';
import PublicFooter from '../components/homepage/PublicFooter';
import '../styles/shared/ZenPages.css';

const FILTERS = [
  'Tất cả',
  'Chăm sóc người già',
  'Dinh dưỡng',
  'Alzheimer',
  'Sức khỏe tinh thần',
  'Công nghệ chăm sóc',
];

const ARTICLES = [
  {
    id: 1,
    type: 'featured',
    badge: 'Chăm sóc người già',
    badgeType: 'primary',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6LN9y5ZS_B6dxHNiC4YXbxhKklYKOG2Rt3prZE-WYdZut4t5oQHmQqYgOEO1jPkG6dQnPGfU6m-Hk3czmHaEb4s1XJDAZINNMmxcxgQ_HUoI3dzpG5LiNCBuTUkrAaHgL_BILzFSKClVf1-qfsSY0tOQM_H5Dh9x1JM88a6-_Uyf0vuWPeOZLBaSOD1CM5vYnr7VknnoiCRaSMZRfRXIXAQ2FTpnAWa4NMOv0T04GUjVNVc3FmTdwcMPjxCUmURkDPTo_gE1c_xAA',
    title: 'Phương pháp tiếp cận mới trong chăm sóc người cao tuổi tại An Nhiên',
    excerpt: 'Tại An Nhiên Care Home, chúng tôi áp dụng triết lý "Warm Minimalism" không chỉ trong kiến trúc mà còn trong phương pháp chăm sóc. Sự kết hợp giữa công nghệ hiện đại và sự ân cần của con người tạo nên một môi trường sống lý tưởng.',
    date: '15 Tháng 10, 2024',
    showReadMore: true,
  },
  {
    id: 2,
    type: 'sec',
    badge: 'Dinh dưỡng',
    badgeType: 'teal',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoC9mw_fvIWsfkfZH70h89JKrJU4AXyghc5Oq0wYosR-GkBix4KeudKizj0wyMtl_jfeF6EGkXpF3x5iUYlgErqzXVUjKIn9S6l6RzDuCKVid0PGRhkL3vrLCiiLxMEN4EJPpnC8s8tDz42D40rhDVk_NHXQkzIIdgu6TH7ys2w-yw8brlAf9Bb7Zep_ydeIOZsbUcKOTVBUbIaz0f5nCWGfG7IvMavViMlXFIQXznjpznweGrRyyHWTdctRAFxJmeiszTO0dr0rl4',
    title: 'Thực đơn cá nhân hóa: Chìa khóa cho sức khỏe người cao tuổi',
    excerpt: 'Dinh dưỡng đóng vai trò then chốt trong việc duy trì sức khỏe. Tìm hiểu cách chúng tôi thiết kế thực đơn phù hợp với từng cá nhân.',
    date: '12 Tháng 10, 2024',
    showReadMore: false,
  },
  {
    id: 3,
    type: 'card4',
    badge: 'Sức khỏe tinh thần',
    badgeType: 'secondary',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2qRgf5CPw8TEeB_mDgzZCfuwcPTiG6tZ9Er26UlmPycJ3x4QQqaLkWeloShz_0WgxdzoVodpWH30HXDUlprdKHFHaESgg-VgVftIsSSovCZJZ-Agc4RCuKQBCfhlCtPVNpUHWn-b2IDnJFtHBJ-krDs9-ycHcSo25dZUnbwq1z_UE9DZ4PC7Uf_JJc7D85Gi2-quN6mZACmbXj02U60bkZDi2Wyo87lEbu2_nv-M0eY2Ch7xhULL4sTcS_BSRai8J2K9OrZxJTMh-',
    title: 'Liệu pháp nghệ thuật trong việc duy trì trí nhớ',
    excerpt: 'Nghệ thuật không chỉ mang lại niềm vui mà còn kích thích các vùng não bộ, giúp cải thiện trí nhớ và tâm trạng.',
    date: '08 Tháng 10, 2024',
    showReadMore: false,
  },
  {
    id: 4,
    type: 'card4',
    badge: 'Công nghệ chăm sóc',
    badgeType: 'tech',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6Vjv-OlA7YbQDUkFF9OoKRMiPBHLCPeBXUB1si7zN15cD86tw_NV37g_dxnpDO9TlBsFGNixH-s-VJ2rjYfU58rl7eI0cpydOQ09Pfkoeb0IWgQC-NTxMGMvgNl2X6aGiBGeqb2a-PkGJKOHIpSlK-KiG5G83HEp01FhduBWU9-puiQdtjbKRWmxFZk66dFB86lHgaxQBvACSyiv_DAmGZPx7QYi05teaiBIOr3eSJPih-h1wT-OpQAH0odHizfMqMEUiSdU_CTwl',
    title: 'Cảm biến thông minh: Theo dõi sức khỏe 24/7',
    excerpt: 'Hệ thống cảm biến tiên tiến giúp đội ngũ y tế theo dõi các chỉ số sinh tồn một cách liên tục mà không làm phiền giấc ngủ.',
    date: '05 Tháng 10, 2024',
    showReadMore: false,
  },
  {
    id: 5,
    type: 'card4',
    badge: 'Alzheimer',
    badgeType: 'neutral',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDenN3TFUC0z8VrKrLji135DH1FU6OespxJd_QfqcG6ClJ3GBD4dNOILkfq9aMqtmNIUstnnoyQOfaHspsZAS7pESKJ_IalT4kJIlpfsu_LdxcI32-ZjSGGvZ_o-CNPvyBqDoSCSarbSK2b-JNp6TDAFygXMkZKeZGYh0uX9sFt903_9Dxzg2mx27-BYJOMqywCVVRPpKjCKWE954r0c1GI6EgCZm8m3AoUrEML7fx8m7OxLeA5jU0rWBT1HpaLaw5cpouSX55MtvpZ',
    title: 'Thiết kế không gian "Ma" cho người bệnh Alzheimer',
    excerpt: 'Tối giản không gian để giảm thiểu sự nhầm lẫn và lo âu. Nghệ thuật sử dụng khoảng trống trong kiến trúc chữa lành.',
    date: '01 Tháng 10, 2024',
    showReadMore: false,
  },
];

export default function NewsPage() {
  const [activeFilter, setActiveFilter] = useState('Tất cả');

  return (
    <div className="zh-page home-page">
      <PublicHeader />

      <main className="np2-main">

        {/* ── PAGE HEADER ── */}
        <div className="np2-header">
          <h1>Tin tức &amp; Kiến thức</h1>
          <p>
            Cập nhật những thông tin mới nhất về chăm sóc sức khỏe, dinh dưỡng và
            các hoạt động tại An Nhiên Care Home.
          </p>
        </div>

        {/* ── FILTER PILLS ── */}
        <div className="np2-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`np2-filter-btn${activeFilter === f ? ' np2-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
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
                      Đọc tiếp <ArrowRight size={14} />
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
            Xem thêm bài viết <ChevronDown size={18} />
          </button>
        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
