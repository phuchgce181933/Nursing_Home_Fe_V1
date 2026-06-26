import React from 'react';
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

const EHR_ITEMS = [
  'Hồ sơ y tế điện tử',
  'Đơn thuốc tự động',
  'Kế hoạch chăm sóc',
  'Lịch sử điều trị',
];

const AI_CHIPS = [
  { label: 'Phân tích ECG', teal: true },
  { label: 'Dự báo té ngã', teal: false },
  { label: 'Theo dõi SpO2', teal: true },
  { label: 'Nhận diện gương mặt', teal: false },
  { label: 'Phân tích giấc ngủ', teal: false },
  { label: 'Cảnh báo dị ứng', teal: true },
];

export default function TechPage() {
  const { token, user } = useAuth();
  const tourPath = (token && user?.role === 'family') ? '/family/facility-tours/new' : '/login';

  return (
    <div className="zh-page home-page">
      <PublicHeader />

      <main className="tp2-main">

        {/* ── HERO ── */}
        <section className="tp2-hero">
          <div className="tp2-hero__text">
            <h1>Công Nghệ Chăm Sóc <span>Thông Minh</span></h1>
            <p>
              Sự kết hợp hoàn hảo giữa công nghệ tiên tiến và tình yêu thương, mang đến
              sự an tâm tuyệt đối cho gia đình và cuộc sống trọn vẹn cho người cao tuổi.
            </p>
          </div>
          <div className="tp2-hero__img">
            <img src={HERO_IMG} alt="Công nghệ chăm sóc thông minh tại An Nhiên" />
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
              <h2 className="tp2-card__title">Bảng Điều Khiển Sức Khỏe</h2>
            </div>
            <p className="tp2-card__body">
              Màn hình tổng quan theo dõi liên tục nhịp tim, huyết áp, nồng độ oxy và chất
              lượng giấc ngủ của từng cư dân — tất cả trong một giao diện trực quan.
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
              <h2 className="tp2-card__title">Cảm Biến Té Ngã</h2>
            </div>
            <p className="tp2-card__body">
              Công nghệ radar và AI phân tích chuyển động, lập tức cảnh báo nhân viên y tế
              khi có sự cố, không xâm phạm quyền riêng tư.
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
              <h2 className="tp2-card__title">Hồ Sơ Điện Tử</h2>
            </div>
            <p className="tp2-card__body">
              Toàn bộ dữ liệu y tế được số hoá, bảo mật và đồng bộ thời gian thực giữa
              bác sĩ, điều dưỡng và gia đình.
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
              <h2 className="tp2-card__title">Trí Tuệ Nhân Tạo Y Tế</h2>
            </div>
            <p className="tp2-card__body">
              Mô hình AI phân tích hàng nghìn điểm dữ liệu mỗi giờ, phát hiện sớm nguy cơ
              đột quỵ, suy tim và các bất thường sức khỏe trước 24–48 giờ.
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
                <p style={{ fontSize: 12, color: '#454652', textAlign: 'center', position: 'relative', zIndex: 1 }}>Độ chính xác</p>
              </div>
            </div>
          </div>

          {/* Card 5: Family Connect — col-span-12 */}
          <div className="tp2-card tp2-card--col12">
            <div className="tp2-card__head">
              <div className="tp2-card__icon-box tp2-card__icon-box--light">
                <Users size={24} />
              </div>
              <h2 className="tp2-card__title">Kết Nối Gia Đình</h2>
            </div>
            <div className="tp2-family-row">
              <p className="tp2-card__body">
                Ứng dụng gia đình cho phép theo dõi tình trạng sức khoẻ, lịch sinh hoạt,
                đơn thuốc và trò chuyện trực tiếp với đội ngũ chăm sóc mọi lúc, mọi nơi —
                tăng cường kết nối yêu thương không khoảng cách.
              </p>
              <div className="tp2-family-btns">
                <Link to={tourPath} className="tp2-family-btn tp2-family-btn--solid">
                  Tham Quan Ngay
                </Link>
                <Link to="/contact" className="tp2-family-btn tp2-family-btn--outline">
                  Liên Hệ
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
